const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const { scanCourse } = require('../lib/convert/course-scanner');
const { updateFrontmatter } = require('../lib/convert/frontmatter');
const { markdownToHtml } = require('../lib/convert/markdown-to-html');
const { loadCourseConfig } = require('../lib/config/course-config');
const {
  createModule,
  updateModule,
  createModuleItem,
  deleteModule: deleteCanvasModule,
  listModules,
  listModuleItems,
  deleteModuleItem,
} = require('../lib/canvas/modules');
const {
  createPage,
  updatePage,
  deletePage,
  listPages,
} = require('../lib/canvas/pages');
const {
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignment,
  listAssignments,
  getSubmissionStates,
  hasStudentSubmissions,
  isQuizBackedAssignment,
} = require('../lib/canvas/assignments');
const {
  createDiscussion,
  updateDiscussion,
  deleteDiscussion,
  getDiscussion,
  isGradedDiscussion,
  discussionAssignmentId,
  gradedDiscussionWarning,
} = require('../lib/canvas/discussions');
const {
  listExternalTools,
  findToolForUrl,
  describeInstalledTools,
} = require('../lib/canvas/external-tools');
const { listQuizzes } = require('../lib/canvas/quizzes');
const { uploadFile, deleteFile } = require('../lib/canvas/files');
const { get } = require('../lib/canvas/client');
const { ensureIcons, getIconUrls } = require('../lib/canvas/icons');
const {
  buildLinkMap,
  resolveRelativeLink,
  extractFileReferences,
} = require('../lib/convert/link-resolver');
const {
  SYNC_FILE,
  buildPageUrlToPageId,
  loadSyncFile,
  saveSyncFile,
  itemKey,
  ensureModuleEntry,
  findModuleEntryByFolder,
  removeItemFromOtherModules,
} = require('./sync-utils');
const {
  COURSE_DIR,
  readModuleCanvasId,
  writeModuleCanvasId,
} = require('./module-utils');
const {
  BACKUP_HINT,
  confirmFirstPush,
  countSubmissionRisk,
  submissionRiskSuffix,
  submissionWarningLines,
} = require('./backup-warning');
const log = require('./logger');

async function push(options) {
  const courseId = process.env.CANVAS_COURSE_ID;
  if (!courseId) {
    log.error(
      '[push] Error: CANVAS_COURSE_ID is not set. Run "npx course init" first.',
    );
    process.exit(1);
  }

  const dryRun = options.dryRun || false;
  const moduleFilter = options.module || null;
  const prune = options.prune || false;
  const dropCanvasOnly = options.dropCanvasOnly || false;

  const syncData = loadSyncFile();
  const modules = scanCourse(COURSE_DIR);

  if (modules.length === 0) {
    log.info('[push] No modules found in course/ directory.');
    return;
  }

  const filteredModules = moduleFilter
    ? modules.filter((m) => m.folderName === moduleFilter)
    : modules;

  if (moduleFilter && filteredModules.length === 0) {
    log.error(
      `[push] Error: Module "${moduleFilter}" not found in course/ directory.`,
    );
    process.exit(1);
  }

  log.info(`[push] Found ${filteredModules.length} module(s) to push.`);
  if (dryRun) log.info('[push] DRY RUN - no changes will be made.\n');

  // First push to a course that already has content: say what push is about to
  // take over before it does.
  const proceed = await confirmFirstPush({
    courseId,
    syncData,
    dryRun,
    fetchCounts: async () => {
      const [remoteModules, pages, assignments] = await Promise.all([
        listModules(courseId),
        listPages(courseId),
        listAssignments(courseId),
      ]);
      return {
        modules: remoteModules.length,
        pages: pages.length,
        assignments: assignments.length,
        files: 0,
      };
    },
  });
  if (!proceed) return;

  // Three of the fields an assignment update sends move grades that are
  // already in the gradebook. Say so before the update goes out.
  await warnGradeImpact(courseId, filteredModules);

  // Ensure alert icons are uploaded to Canvas
  if (!dryRun) {
    await ensureIcons(courseId, syncData);
    saveSyncFile(syncData);
  }
  const iconUrls = getIconUrls(syncData);

  // Initialize file tracking
  if (!syncData.files) syncData.files = {};

  // Refresh sync items from frontmatter so identity keys point at the
  // current local paths (renames/renumbering are reconciled here) and the
  // link map is available even after a reset or on first use.
  for (const mod of modules) {
    const resolved = resolveModuleEntry(syncData, mod.folderName);
    if (!resolved) continue;
    const [moduleIdKey, moduleEntry] = resolved;

    for (const item of flattenItems(mod.items)) {
      if (
        !item.relativePath ||
        !item.frontmatter ||
        item.frontmatter.canvas_id == null
      )
        continue;
      registerItem(syncData, moduleIdKey, moduleEntry, item, {
        canvasId: item.frontmatter.canvas_id,
      });
    }
  }

  // Build link map from sync state for resolving internal links
  let { relativeToCanvas } = buildLinkMap(syncData);

  // What every module about to be rebuilt is measured against: a module whose
  // Canvas items are not all accounted for here is left alone rather than
  // cleared. Claims come from the whole tree, so an item moved into another
  // module is never mistaken for one added by hand in Canvas.
  const guard = {
    dropCanvasOnly,
    claims: collectPushGuardClaims(syncData, modules),
    resolvePageIds: makePageIdResolver(courseId),
  };

  // Track items that had unresolved internal links for a second pass
  const unresolvedItems = [];

  const errors = [];
  const totalModules = filteredModules.length;

  for (let mi = 0; mi < filteredModules.length; mi++) {
    const mod = filteredModules[mi];
    log.info(`\n[push] Module ${mi + 1}/${totalModules}: ${mod.moduleName}`);
    try {
      await pushModule(
        courseId,
        mod,
        syncData,
        dryRun,
        iconUrls,
        relativeToCanvas,
        unresolvedItems,
        errors,
        guard,
      );
    } catch (err) {
      log.error(
        `[push] Error pushing module "${mod.moduleName}": ${err.message}`,
      );
      errors.push({ module: mod.moduleName, error: err.message });
    }
    // Save sync state after each module so progress is preserved on failure
    if (!dryRun) {
      saveSyncFile(syncData);
    }
  }

  // Report unresolved links in dry-run mode
  if (unresolvedItems.length > 0 && dryRun) {
    log.info(
      `\n[push] ${unresolvedItems.length} item(s) have unresolved internal links (will be resolved in a second pass during actual push):`,
    );
    for (const { relativePath } of unresolvedItems) {
      log.info(`  - ${relativePath}`);
    }
  }

  // Second pass: re-push items that had unresolved internal links
  if (unresolvedItems.length > 0 && !dryRun) {
    log.info(
      `\n[push] Resolving internal links for ${unresolvedItems.length} item(s) that referenced newly-created pages...`,
    );
    ({ relativeToCanvas } = buildLinkMap(syncData));

    for (const {
      courseId: cId,
      relativePath,
      filePath,
      canvasId,
      canvasType,
      iconUrls: iu,
    } of unresolvedItems) {
      try {
        const linkResolver = (href) => {
          const { resolved } = resolveRelativeLink(
            href,
            relativePath,
            relativeToCanvas,
            cId,
          );
          return resolved;
        };
        const fileResolver = buildFileResolver(relativePath, syncData);
        const raw = fs.readFileSync(filePath, 'utf8');
        const html = markdownToHtml(raw, {
          iconUrls: iu,
          alertTitles: loadCourseConfig().labels.alerts,
          linkResolver,
          fileResolver,
        });

        if (canvasType === 'page') {
          await updatePage(cId, canvasId, { body: html });
        } else if (canvasType === 'assignment') {
          await updateAssignment(cId, canvasId, { description: html });
        } else if (canvasType === 'discussion') {
          await updateDiscussion(cId, canvasId, { message: html });
        }
        log.info(`  [push] Updated links in: ${relativePath}`);
      } catch (err) {
        log.error(
          `  [push] Error updating links in "${relativePath}": ${err.message}`,
        );
        errors.push({ module: relativePath, error: err.message });
      }
    }
  }

  // Prune: remove Canvas modules and items that no longer exist locally
  if (prune) {
    await pruneDeleted(
      courseId,
      syncData,
      modules,
      filteredModules,
      moduleFilter,
      dryRun,
      errors,
    );
  }

  // Update last_sync timestamp
  syncData.last_sync = new Date().toISOString();

  if (!dryRun) {
    saveSyncFile(syncData);
    log.info(`\n[push] Sync file updated: ${SYNC_FILE}`);
  }

  if (errors.length > 0) {
    log.info(`\n[push] Completed with ${errors.length} error(s):`);
    for (const e of errors) {
      log.info(`  - ${e.module}: ${e.error}`);
    }
    process.exitCode = 1;
  } else {
    log.info('[push] Done.');
  }
}

/**
 * Resolve the sync-state module entry for a local folder.
 * Prefers the canvas_module_id stored in the folder's _category_.json
 * (rename-proof), falling back to the stored folder name.
 * Returns [moduleIdKey, entry] or null when the folder is not yet on Canvas.
 */
function resolveModuleEntry(syncData, folderName) {
  const catId = readModuleCanvasId(path.join(COURSE_DIR, folderName));
  if (catId != null && syncData.modules && syncData.modules[String(catId)]) {
    const entry = ensureModuleEntry(syncData, catId, folderName);
    return [String(catId), entry];
  }
  const found = findModuleEntryByFolder(syncData, folderName);
  if (found) return found;
  return null;
}

/**
 * Record an item in the module entry under its identity key, updating the
 * stored path. Reuses an existing page entry when the frontmatter holds the
 * page slug while the entry is keyed on the numeric page id (or vice versa).
 */
function registerItem(
  syncData,
  moduleIdKey,
  moduleEntry,
  item,
  { canvasId, pageUrl } = {},
) {
  const canvasType = item.canvasType || 'page';
  const externalUrl = item.frontmatter && item.frontmatter.external_url;

  let key = itemKey(canvasType, { canvasId, externalUrl });
  if (!moduleEntry.items[key] && canvasType === 'page') {
    for (const [k, e] of Object.entries(moduleEntry.items)) {
      if (
        e.canvas_type === 'page' &&
        e.page_url != null &&
        String(e.page_url) === String(canvasId)
      ) {
        key = k;
        break;
      }
    }
  }

  const existing = moduleEntry.items[key] || {};
  const entry = {
    ...existing,
    path: item.relativePath,
    canvas_id: canvasId,
    canvas_type: canvasType,
  };
  if (pageUrl) entry.page_url = pageUrl;
  // Both link types live only as a module item, whose Canvas id is reissued on
  // every push, so the URL is the identity prune has to match them on.
  if (
    (canvasType === 'external_url' || canvasType === 'external_tool') &&
    externalUrl
  )
    entry.external_url = externalUrl;

  moduleEntry.items[key] = entry;
  removeItemFromOtherModules(syncData, key, moduleIdKey);
  return key;
}

/**
 * How a live module item's `type` reads in the local `canvas_type` vocabulary.
 * `SubHeader` is deliberately absent: it is handled before this map is reached.
 */
const LIVE_ITEM_TYPES = {
  Page: 'page',
  Assignment: 'assignment',
  Discussion: 'discussion',
  Quiz: 'quiz',
  ExternalUrl: 'external_url',
  ExternalTool: 'external_tool',
  File: 'file',
};

/**
 * Whether a module item Canvas holds is one push itself put there.
 *
 * The claim set comes from `collectLocalClaims`, so it speaks in
 * `canvas_type:identity` pairs and is type-scoped: an `assignment:12` claim
 * never answers for a `Quiz` item on id 12. Three types need more than a
 * straight id comparison:
 *
 * - A **page** item names its page by slug, while the local file claims the
 *   numeric page id, so the slug is resolved through the course's page list
 *   first. The slug is still tried directly, because a page created before
 *   Canvas returned a `page_id` has the slug in its frontmatter.
 * - **External URLs and LTI links** exist only as a module item, whose id
 *   Canvas reissues on every push. Push writes that id to frontmatter once and
 *   never refreshes it, so from the second push on the stored id is stale by
 *   design and the launch URL is the identity. The id is still worth trying:
 *   Canvas never reuses one, so a match can only be the first push's own item.
 * - A **file** item can come from a raw binary that carries no frontmatter at
 *   all; the claim for those is added from sync state (see
 *   `collectPushGuardClaims`).
 *
 * @param {object} item              - A Canvas module item.
 * @param {Set<string>} claims       - Identities claimed by local files.
 * @param {Map<string, number>|null} pageIds - Page slug -> page id.
 */
function isLiveItemLocal(item, claims, pageIds) {
  // Text headers carry no content id of any kind: push regenerates them from
  // the folder structure on every run, so there is nothing to recognise and
  // nothing a hand-added one could destroy.
  if (item.type === 'SubHeader') return true;

  const type = LIVE_ITEM_TYPES[item.type];
  // A type push cannot produce is by definition not push's own.
  if (!type) return false;

  if (type === 'page') {
    if (!item.page_url) return false;
    if (claims.has(`page:${item.page_url}`)) return true;
    const pageId = pageIds && pageIds.get(item.page_url);
    return pageId != null && claims.has(`page:${pageId}`);
  }

  if (type === 'external_url' || type === 'external_tool') {
    if (item.external_url && claims.has(`${type}:${item.external_url}`))
      return true;
    return item.id != null && claims.has(`${type}:${item.id}`);
  }

  return item.content_id != null && claims.has(`${type}:${item.content_id}`);
}

/**
 * Split a module's live Canvas items into the ones a local file accounts for
 * and the ones nothing local claims.
 *
 * The page lookup is asked for only when the module actually holds a page, and
 * `resolvePageIds` answers it once for the whole run. When that lookup fails,
 * no page item can be told apart from a hand-added one, so the whole module
 * counts as unchecked rather than as clean: the caller refuses it instead of
 * guessing.
 *
 * @param {object[]} liveItems         - What `listModuleItems` returned.
 * @param {Set<string>} claims         - Identities claimed by local files.
 * @param {Function} resolvePageIds    - Async, returns the slug -> id map.
 * @returns {Promise<{canvasOnly: object[], error: string|null}>}
 */
async function inspectCanvasOnlyItems(liveItems, claims, resolvePageIds) {
  const canvasOnly = [];
  let pageIds = null;

  for (const item of liveItems || []) {
    if (item.type === 'SubHeader') continue;
    if (item.type === 'Page' && pageIds === null) {
      try {
        pageIds = await resolvePageIds();
      } catch (err) {
        return {
          canvasOnly: [],
          error:
            `could not list the pages of this Canvas course (${err.message}), ` +
            'and a module item names a page by a slug that only that list ' +
            'resolves to the id its local file holds',
        };
      }
    }
    if (isLiveItemLocal(item, claims, pageIds)) continue;
    canvasOnly.push(item);
  }

  return { canvasOnly, error: null };
}

/** One live Canvas item, named as someone has to find it back in Canvas. */
function describeCanvasOnlyItem(item) {
  const title = item.title || '(untitled)';
  const where = item.position != null ? `, position ${item.position}` : '';
  const link = item.html_url ? ` — ${item.html_url}` : '';
  return `  - "${title}" (${item.type}${where})${link}`;
}

/**
 * Report a module left untouched because Canvas holds items in it that no
 * local file accounts for, and return the line the run's error summary gets.
 *
 * Everything goes to stderr: this is the one outcome a `--quiet` run must
 * still see, because the alternative to reading it is losing the items.
 *
 * @param {object} mod              - The local module descriptor.
 * @param {object[]} canvasOnly     - The unclaimed live items.
 * @param {boolean} dryRun
 * @returns {string} The error message, for the caller to record.
 */
function reportCanvasOnlyRefusal(mod, canvasOnly, dryRun) {
  const count = canvasOnly.length;
  const them = count === 1 ? 'it' : 'them';
  const items = count === 1 ? 'item' : 'items';

  log.error(
    `\n[push] ${dryRun ? 'DRY RUN: would refuse to push' : 'Refusing to push'} ` +
      `module "${mod.moduleName}": ${count} ${items} in this Canvas module ` +
      `${count === 1 ? 'has' : 'have'} no source file in course/${mod.folderName}/.`,
  );
  for (const item of canvasOnly) log.error(describeCanvasOnlyItem(item));
  log.error(
    `[push] Push rebuilds a module's item list from course/, so pushing this ` +
      `module would have removed ${count === 1 ? 'that item' : 'those items'} from it. ` +
      'Nothing was written: the module keeps its items, its name and its ' +
      'position, and the rest of this run carries on.',
  );
  log.error('[push] Three ways forward:');
  log.error(
    `[push]   1. Keep ${them}: add a file under course/${mod.folderName}/ for ` +
      'each one, carrying the matching canvas_type and canvas_id in its ' +
      'frontmatter (see docs/frontmatter.md), then push again.',
  );
  log.error(
    `[push]   2. Move ${them} in Canvas into a module this project does not manage.`,
  );
  log.error(
    `[push]   3. Let ${them} go: push again with --drop-canvas-only, which ` +
      'clears this module and rebuilds it from course/. A page, assignment, ' +
      'discussion, quiz or file behind an item stays in the course — a module ' +
      'item is only a link to it — but an external URL or an LTI link is ' +
      'nothing but a module item, so that one is gone.',
  );

  const named = canvasOnly
    .map((item) => `"${item.title || '(untitled)'}"`)
    .join(', ');
  return (
    `${count} ${items} in this Canvas module ${count === 1 ? 'has' : 'have'} ` +
    `no local source file (${named}); the module was left untouched`
  );
}

/**
 * Every Canvas identity the local tree claims, for the guard that decides
 * whether a module is safe to rebuild.
 *
 * `collectLocalClaims` reads frontmatter, which covers every type but one: a
 * raw binary dropped into a module folder is pushed as a file item and has
 * nowhere to carry a `canvas_id`. It also only ever sees files that are still
 * on disk, and the guard asks a wider question than "is this file here now".
 *
 * The sync file answers it. An entry in it means push put that item in that
 * module, so it is this project's to rebuild however the local tree has moved
 * on — including when the source file has been deleted, which is a deletion
 * the author meant and which `--prune` exists to finish. Without this the
 * guard reads its own tracked items back as hand-made ones and refuses the
 * module, so deleting a single page would block every other edit to it.
 *
 * What the guard is actually looking for survives untouched: an item added by
 * hand in Canvas was never pushed, so it is in no sync entry and claims
 * nothing here.
 *
 * Claims are gathered from the whole tree, never from the `--module` subset,
 * so an item moved to another module still counts as local.
 */
function collectPushGuardClaims(syncData, localModules) {
  const claims = collectLocalClaims(localModules);

  for (const moduleEntry of Object.values(
    (syncData && syncData.modules) || {},
  )) {
    for (const entry of Object.values(moduleEntry.items || {})) {
      const type = entry.canvas_type;
      if (!type) continue;
      if (entry.canvas_id != null) claims.add(`${type}:${entry.canvas_id}`);
      if (entry.page_url) claims.add(`page:${entry.page_url}`);
      if (entry.external_url) claims.add(`${type}:${entry.external_url}`);
    }
  }

  return claims;
}

/**
 * The items Canvas holds in a module, or null when there is nothing to protect.
 *
 * A 404 means the module is gone from Canvas and push is about to create it
 * again, so there is nothing in it to lose. Any other failure leaves push
 * unable to tell its own items from hand-added ones: a real push refuses the
 * module rather than clear a list it could not read, while a dry run — which
 * writes nothing either way — says the check could not be made and carries on.
 */
async function readLiveItems(courseId, existingModuleId, dryRun) {
  if (!existingModuleId) return null;
  try {
    return await listModuleItems(courseId, existingModuleId);
  } catch (err) {
    if (err.message.includes('404')) return null;
    if (dryRun) {
      log.warn(
        `[push] Could not list the items Canvas holds in this module ` +
          `(${err.message}); this dry run cannot say whether it holds items ` +
          'with no local source.',
      );
      return null;
    }
    throw new Error(
      `could not list the items Canvas holds in this module (${err.message}). ` +
        "Push clears a module's item list before rebuilding it, so it refuses " +
        'to touch a module it could not read.',
    );
  }
}

/**
 * A slug -> page id lookup that costs at most one request per run, and none at
 * all when no module holds a page that needs resolving.
 */
function makePageIdResolver(courseId, fetchPages) {
  let pending = null;
  return () => {
    if (!pending) pending = buildPageUrlToPageId(courseId, fetchPages);
    return pending;
  };
}

async function pushModule(
  courseId,
  mod,
  syncData,
  dryRun,
  iconUrls,
  relativeToCanvas,
  unresolvedItems,
  errors,
  guard,
) {
  const moduleDir = path.join(COURSE_DIR, mod.folderName);
  // The id in _category_.json is authoritative even when the sync file was
  // lost; the sync entry (matched by folder) covers a missing _category_ id.
  const catId = readModuleCanvasId(moduleDir);
  const resolved = resolveModuleEntry(syncData, mod.folderName);
  const existingModuleId =
    catId != null ? Number(catId) : resolved ? Number(resolved[0]) : null;

  // What Canvas holds in this module right now, read before the first write:
  // a module holding items no local file accounts for is left exactly as it
  // is, and that decision cannot be made after the module has been touched.
  const liveItems = await readLiveItems(courseId, existingModuleId, dryRun);
  if (liveItems) {
    const { canvasOnly, error } = await inspectCanvasOnlyItems(
      liveItems,
      guard.claims,
      guard.resolvePageIds,
    );

    if (guard.dropCanvasOnly) {
      // The user asked for the old behaviour, so the wipe goes ahead — but it
      // still says what it is about to take out of the module.
      if (error) {
        log.warn(
          `[push] WARNING: ${error}. --drop-canvas-only clears the module ` +
            'anyway, so this run cannot say what it removed.',
        );
      } else if (canvasOnly.length > 0) {
        log.warn(
          `\n[push] WARNING: --drop-canvas-only: removing ${canvasOnly.length} ` +
            `item(s) from "${mod.moduleName}" that have no source file in course/:`,
        );
        for (const item of canvasOnly) log.warn(describeCanvasOnlyItem(item));
      }
    } else if (error) {
      log.error(
        `\n[push] Refusing to push module "${mod.moduleName}": ${error}. ` +
          "Push clears a module's item list before rebuilding it, so a module " +
          'it cannot check is left untouched.',
      );
      errors.push({ module: mod.folderName, error });
      return;
    } else if (canvasOnly.length > 0) {
      errors.push({
        module: mod.folderName,
        error: reportCanvasOnlyRefusal(mod, canvasOnly, dryRun),
      });
      return;
    }
  }

  let moduleId;

  if (existingModuleId) {
    log.info(
      `[push] Updating module: ${mod.moduleName} (id: ${existingModuleId})`,
    );
    if (!dryRun) {
      try {
        const result = await updateModule(courseId, existingModuleId, {
          name: mod.moduleName,
          position: mod.position,
        });
        moduleId = result.id;
      } catch (err) {
        if (err.message.includes('404')) {
          log.warn(
            `[push] Module ${existingModuleId} not found on Canvas, creating new`,
          );
        } else {
          throw err;
        }
      }
    } else {
      moduleId = existingModuleId;
    }
  }

  if (!moduleId && !dryRun) {
    log.info(`[push] Creating module: ${mod.moduleName}`);
    const result = await createModule(courseId, {
      name: mod.moduleName,
      position: mod.position,
    });
    moduleId = result.id;
  } else if (!moduleId) {
    moduleId = '<new>';
  }

  let moduleEntry = null;
  if (!dryRun) {
    // The id in _category_.json is what makes folder renames survivable.
    writeModuleCanvasId(moduleDir, moduleId, {
      label: mod.moduleName,
      position: mod.position,
    });
    moduleEntry = ensureModuleEntry(syncData, moduleId, mod.folderName);

    // The module was recreated: drop the entry that pointed at the old id.
    if (existingModuleId && existingModuleId !== moduleId) {
      delete syncData.modules[String(existingModuleId)];
    }
  }

  // Clear existing module items to prevent duplicates on re-push.
  // Module items are links within a module — deleting them does not delete
  // the underlying pages, assignments, or files. Everything still here was
  // either put there by a previous push or explicitly released with
  // --drop-canvas-only: the guard above returned otherwise.
  if (!dryRun && existingModuleId && existingModuleId === moduleId) {
    log.verbose('Clearing existing module items before re-push');
    for (const mi of liveItems || []) {
      await deleteModuleItem(courseId, moduleId, mi.id);
    }
  }

  // Upload embedded files (images, etc.) referenced from markdown content
  const flatItems = flattenItems(mod.items);

  if (!dryRun) {
    const referencedFiles = new Set();
    for (const item of flatItems) {
      if (!item.relativePath || !item.relativePath.endsWith('.md')) continue;
      const filePath = path.resolve(COURSE_DIR, item.relativePath);
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const refs = extractFileReferences(raw, item.relativePath);
        for (const ref of refs) referencedFiles.add(ref);
      } catch {
        // File may not exist yet during dry run
      }
    }

    for (const ref of referencedFiles) {
      const localPath = path.resolve(COURSE_DIR, ref);
      if (!fs.existsSync(localPath)) {
        log.warn(`  [push] WARNING: Referenced file not found: ${ref}`);
        continue;
      }

      // Re-upload when the content changed since the last sync (hash mismatch)
      // or when the file has never been uploaded.
      const hash = sha256File(localPath);
      const tracked = syncData.files[ref];
      if (tracked && tracked.sha256 === hash) continue;
      if (tracked && tracked.sha256 === undefined) {
        // Entry predates hash tracking: upload once more to be safe and record the hash.
        log.verbose(
          `No stored hash for ${ref}, re-uploading to establish baseline`,
        );
      }

      log.verbose(`Uploading embedded file: ${ref}`);
      try {
        const result = await uploadFile(courseId, localPath, {
          parentFolderPath: mod.folderName,
        });
        syncData.files[ref] = {
          canvas_file_id: result.id,
          canvas_url: `/courses/${courseId}/files/${result.id}/preview`,
          sha256: hash,
        };
      } catch (err) {
        log.error(`  [push] Error uploading file "${ref}": ${err.message}`);
        errors.push({ module: ref, error: err.message });
      }
    }
  }

  // Process items (including subheader items)
  const totalItems = flatItems.length;

  for (let ii = 0; ii < flatItems.length; ii++) {
    const item = flatItems[ii];
    const itemTitle = item.title || item.file || 'unknown';
    log.verbose(`Item ${ii + 1}/${totalItems}: ${itemTitle}`);
    try {
      await pushItem(
        courseId,
        moduleId,
        item,
        dryRun,
        iconUrls,
        mod.folderName,
        relativeToCanvas,
        unresolvedItems,
        syncData,
        moduleEntry,
      );
      // Track item in sync file (file items track themselves in pushFile)
      if (
        !dryRun &&
        moduleEntry &&
        item.relativePath &&
        item.frontmatter &&
        item.frontmatter.canvas_id != null &&
        item.canvasType !== 'file'
      ) {
        registerItem(syncData, String(moduleId), moduleEntry, item, {
          canvasId: item.frontmatter.canvas_id,
          pageUrl: item._pageUrl,
        });
      }
    } catch (err) {
      log.error(`  [push] Error pushing item "${itemTitle}": ${err.message}`);
      errors.push({
        module: `${mod.folderName}/${itemTitle}`,
        error: err.message,
      });
    }
  }
}

function sha256File(filePath) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(filePath))
    .digest('hex');
}

/**
 * Flatten items list, inserting SubHeader entries and their nested items.
 */
function flattenItems(items) {
  const result = [];
  for (const item of items) {
    if (item.type === 'subheader') {
      // Add the subheader itself as a module item
      result.push({
        type: 'subheader',
        title: item.title,
        position: item.position,
        indent: item.indent,
      });
      // Then add its child items
      if (item.items) {
        for (const child of item.items) {
          result.push(child);
        }
      }
    } else {
      result.push(item);
    }
  }
  // Reassign sequential positions so subfolder children get correct
  // absolute positions instead of their within-folder positions.
  for (let i = 0; i < result.length; i++) {
    result[i].position = i + 1;
  }
  return result;
}

async function pushItem(
  courseId,
  moduleId,
  item,
  dryRun,
  iconUrls,
  folderName,
  relativeToCanvas,
  unresolvedItems,
  syncData,
  moduleEntry,
) {
  if (item.type === 'subheader') {
    log.verbose(`Adding SubHeader: ${item.title}`);
    if (!dryRun) {
      await createModuleItem(courseId, moduleId, {
        title: item.title,
        type: 'SubHeader',
        position: item.position,
        indent: item.indent,
      });
    }
    return;
  }

  const { canvasType, title, frontmatter, relativePath, position, indent } =
    item;
  const filePath = path.resolve(COURSE_DIR, relativePath);
  const canvasId = frontmatter.canvas_id || null;

  if (canvasType === 'page') {
    const pageUrl = await pushContentItem(
      courseId,
      moduleId,
      {
        title,
        filePath,
        relativePath,
        canvasId,
        position,
        indent,
        frontmatter,
      },
      dryRun,
      iconUrls,
      relativeToCanvas,
      unresolvedItems,
      syncData,
      pageStrategy,
    );
    if (pageUrl) item._pageUrl = pageUrl;
  } else if (canvasType === 'assignment') {
    await pushContentItem(
      courseId,
      moduleId,
      {
        title,
        filePath,
        relativePath,
        canvasId,
        position,
        indent,
        frontmatter,
      },
      dryRun,
      iconUrls,
      relativeToCanvas,
      unresolvedItems,
      syncData,
      assignmentStrategy,
    );
  } else if (canvasType === 'discussion') {
    await pushContentItem(
      courseId,
      moduleId,
      {
        title,
        filePath,
        relativePath,
        canvasId,
        position,
        indent,
        frontmatter,
      },
      dryRun,
      iconUrls,
      relativeToCanvas,
      unresolvedItems,
      syncData,
      discussionStrategy,
    );
  } else if (canvasType === 'external_url') {
    await pushExternalUrl(
      courseId,
      moduleId,
      { title, filePath, position, indent, frontmatter },
      dryRun,
    );
  } else if (canvasType === 'external_tool') {
    await pushExternalTool(
      courseId,
      moduleId,
      { title, filePath, position, indent, frontmatter },
      dryRun,
    );
  } else if (canvasType === 'quiz') {
    await pushQuiz(
      courseId,
      moduleId,
      { title, filePath, position, indent, frontmatter },
      dryRun,
    );
  } else if (canvasType === 'file') {
    // Resolve file_ref from markdown wrapper to actual binary path
    let binaryPath = filePath;
    if (filePath.endsWith('.md') && frontmatter.file_ref) {
      binaryPath = path.resolve(path.dirname(filePath), frontmatter.file_ref);
    }
    await pushFile(
      courseId,
      moduleId,
      {
        title,
        filePath: binaryPath,
        wrapperPath: filePath,
        relativePath,
        position,
        indent,
        folderName,
        frontmatter,
      },
      dryRun,
      syncData,
      moduleEntry,
    );
  } else {
    log.warn(`  [push] Skipping unknown type "${canvasType}": ${title}`);
  }
}

/**
 * Push a content item (page or assignment) to Canvas.
 * Handles create-or-update, module item creation, and unresolved link tracking.
 * Returns the page slug (for pages) or null.
 */
async function pushContentItem(
  courseId,
  moduleId,
  { title, filePath, relativePath, canvasId, position, indent, frontmatter },
  dryRun,
  iconUrls,
  relativeToCanvas,
  unresolvedItems,
  syncData,
  strategy,
) {
  const raw = fs.readFileSync(filePath, 'utf8');

  let hasUnresolved = false;
  const linkResolver = (href) => {
    const { resolved, wasInternal } = resolveRelativeLink(
      href,
      relativePath,
      relativeToCanvas,
      courseId,
    );
    if (wasInternal) hasUnresolved = true;
    return resolved;
  };
  const fileResolver = buildFileResolver(relativePath, syncData);
  const html = markdownToHtml(raw, {
    iconUrls,
    alertTitles: loadCourseConfig().labels.alerts,
    linkResolver,
    fileResolver,
  });

  const opts = strategy.buildOpts(title, html, frontmatter);
  let itemId = canvasId;
  let slug = null;

  if (canvasId) {
    log.verbose(`Updating ${strategy.canvasType}: ${title} (id: ${canvasId})`);
    if (!dryRun) {
      try {
        const result = await strategy.update(courseId, canvasId, opts);
        itemId = strategy.extractId(result);
        slug = strategy.extractSlug ? strategy.extractSlug(result) : null;
      } catch (err) {
        if (err.message.includes('404')) {
          log.warn(
            `    [push] ${strategy.label} ${canvasId} not found on Canvas, creating new`,
          );
          canvasId = null;
        } else {
          throw err;
        }
      }
    }
  }

  if (!canvasId) {
    log.verbose(`Creating ${strategy.canvasType}: ${title}`);
    if (!dryRun) {
      const result = await strategy.create(courseId, opts);
      itemId = strategy.extractId(result);
      slug = strategy.extractSlug ? strategy.extractSlug(result) : null;
      updateFrontmatter(filePath, { canvas_id: itemId });
      frontmatter.canvas_id = itemId;
      log.verbose(`Wrote canvas_id=${itemId} to ${relativePath}`);
    }
  }

  if (!dryRun && (slug || itemId)) {
    await createModuleItem(
      courseId,
      moduleId,
      strategy.buildModuleItem(title, slug || itemId, position, indent),
    );
  }

  if (hasUnresolved && !dryRun && itemId) {
    unresolvedItems.push({
      courseId,
      relativePath,
      filePath,
      canvasId: itemId,
      canvasType: strategy.canvasType,
      iconUrls,
    });
  }

  return slug || null;
}

/** Strategy for pushing pages. */
const pageStrategy = {
  canvasType: 'page',
  label: 'Page',
  buildOpts: (title, html) => ({ title, body: html }),
  create: createPage,
  update: updatePage,
  extractId: (result) => result.page_id || result.url,
  extractSlug: (result) => result.url,
  buildModuleItem: (title, slug, position, indent) => ({
    title,
    type: 'Page',
    pageUrl: slug,
    position,
    indent,
  }),
};

/** Strategy for pushing assignments. */
const assignmentStrategy = {
  canvasType: 'assignment',
  label: 'Assignment',
  buildOpts: (title, html, frontmatter) => {
    const opts = { name: title, description: html };
    if (frontmatter.points_possible != null)
      opts.pointsPossible = frontmatter.points_possible;
    if (frontmatter.submission_types)
      opts.submissionTypes = frontmatter.submission_types;
    if (frontmatter.due_at) opts.dueAt = frontmatter.due_at;
    if (frontmatter.unlock_at) opts.unlockAt = frontmatter.unlock_at;
    if (frontmatter.lock_at) opts.lockAt = frontmatter.lock_at;
    if (frontmatter.published != null) opts.published = frontmatter.published;
    return opts;
  },
  create: createAssignment,
  update: updateAssignment,
  extractId: (result) => result.id,
  extractSlug: null,
  buildModuleItem: (title, contentId, position, indent) => ({
    title,
    type: 'Assignment',
    contentId,
    position,
    indent,
  }),
};

/**
 * Say so when Canvas reports the topic it just took as graded, and hand the
 * result straight back so this can wrap create and update.
 */
function warnIfGradedDiscussion(result) {
  const line = gradedDiscussionWarning(result);
  if (line) log.warn(`    [push] ${line}`);
  return result;
}

/** Strategy for pushing discussions. */
const discussionStrategy = {
  canvasType: 'discussion',
  label: 'Discussion',
  buildOpts: (title, html, frontmatter) => {
    const opts = { title, message: html };
    if (frontmatter.discussion_type)
      opts.discussionType = frontmatter.discussion_type;
    if (frontmatter.require_initial_post != null)
      opts.requireInitialPost = frontmatter.require_initial_post;
    if (frontmatter.delayed_post_at)
      opts.delayedPostAt = frontmatter.delayed_post_at;
    if (frontmatter.lock_at) opts.lockAt = frontmatter.lock_at;
    if (frontmatter.published != null) opts.published = frontmatter.published;
    return opts;
  },
  create: async (courseId, opts) =>
    warnIfGradedDiscussion(await createDiscussion(courseId, opts)),
  update: async (courseId, id, opts) =>
    warnIfGradedDiscussion(await updateDiscussion(courseId, id, opts)),
  extractId: (result) => result.id,
  extractSlug: null,
  buildModuleItem: (title, contentId, position, indent) => ({
    title,
    type: 'Discussion',
    contentId,
    position,
    indent,
  }),
};

/** A value as it should read inside a warning; an absent one says so. */
function describeValue(value) {
  if (value == null || value === '') return 'not set';
  if (Array.isArray(value)) return value.join(', ');
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/** Two dates are the same date when they name the same instant, however written. */
function asInstant(value) {
  if (value == null || value === '') return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? String(value) : time;
}

/** Submission types compare as a set: order and spacing are Canvas's business. */
function asTypeSet(value) {
  if (value == null) return '';
  const list = Array.isArray(value) ? value : String(value).split(',');
  return list
    .map((type) => String(type).trim())
    .filter(Boolean)
    .sort()
    .join(',');
}

/**
 * The three fields push sends that move grades on an assignment students have
 * already submitted to. Canvas applies each one silently: its web editor warns
 * about them, its API does not, so this is the only place the warning can come
 * from. `sent` reads what push is about to send, `live` what Canvas holds now.
 */
const GRADE_IMPACT_FIELDS = [
  {
    name: 'points_possible',
    sent: (opts) => opts.pointsPossible,
    live: (assignment) => assignment.points_possible,
    normalize: (value) =>
      value == null || value === '' ? null : Number(value),
    consequence:
      'Canvas does not rescale the grades already given: the raw scores stay ' +
      'as they are, so every percentage in that gradebook column moves.',
  },
  {
    name: 'due_at',
    sent: (opts) => opts.dueAt,
    live: (assignment) => assignment.due_at,
    normalize: asInstant,
    consequence:
      'Canvas recomputes late status against the new date, so an automatic ' +
      'late policy re-applies or drops its deductions on submissions that ' +
      'are already graded.',
  },
  {
    name: 'submission_types',
    sent: (opts) => opts.submissionTypes,
    live: (assignment) => assignment.submission_types,
    normalize: asTypeSet,
    consequence:
      'Canvas only accepts that change while an assignment has no ' +
      'submissions: it ignores this one, reports the push as a success, and ' +
      'keeps the value it already has, which the frontmatter no longer matches.',
  },
];

/**
 * The warning lines for one assignment about to be updated: one per field that
 * changes value and moves grades with it.
 *
 * An assignment with no submissions has no grades to move, so it stays silent.
 * A submission state that could not be read is never treated as that, though —
 * it gets the same warning, hedged.
 *
 * @param {string} label     - The assignment, named as it is in the warning.
 * @param {object} opts      - What push is about to send (from buildOpts).
 * @param {object} current   - The Canvas Assignment object as it stands.
 * @returns {string[]}
 */
function gradeImpactWarnings(label, opts, current) {
  const state = hasStudentSubmissions(current);
  if (state === false) return [];

  const lead =
    state === true
      ? `WARNING: ${label} has student submissions, and this push changes`
      : `WARNING: could not determine whether ${label} has student ` +
        'submissions, and this push changes';
  const hedge = state === true ? '' : 'Treat it as if it does. ';

  const lines = [];
  for (const field of GRADE_IMPACT_FIELDS) {
    const sent = field.sent(opts);
    // Not sent, not changed: buildOpts leaves a field out entirely when the
    // frontmatter has none, and Canvas keeps whatever it holds.
    if (sent === undefined) continue;
    const live = field.live(current);
    if (field.normalize(sent) === field.normalize(live)) continue;

    lines.push(
      `${lead} ${field.name} from ${describeValue(live)} to ` +
        `${describeValue(sent)}. ${hedge}${field.consequence}`,
    );
  }
  return lines;
}

/**
 * The assignments a run will update: the ones that already exist on Canvas.
 *
 * An assignment without a canvas_id is about to be created, so it cannot hold
 * student work yet and needs no check. Each entry carries the options push
 * itself will send, built by the same buildOpts, so the comparison can never
 * drift from what actually goes over the wire. The description is irrelevant
 * to all three fields, so an empty body is enough to build them.
 */
function collectUpdatedAssignments(localModules) {
  const updated = [];
  for (const mod of localModules) {
    for (const item of flattenItems(mod.items)) {
      if (item.type === 'subheader' || !item.frontmatter) continue;
      if (item.canvasType !== 'assignment') continue;
      if (item.frontmatter.canvas_id == null) continue;
      updated.push({
        title: item.title,
        relativePath: item.relativePath,
        canvasId: item.frontmatter.canvas_id,
        opts: assignmentStrategy.buildOpts(item.title, '', item.frontmatter),
      });
    }
  }
  return updated;
}

/**
 * Warn about every field this push is about to change on an assignment that
 * students have already submitted to.
 *
 * Push sends the whole assignment on every update, and three of those fields
 * move grades that are already in the gradebook. What gets sent is unchanged
 * and nothing is blocked: a re-weighting can be deliberate, and only the author
 * knows. Naming the old and the new value is what separates the deliberate
 * change from the typo.
 *
 * One list request answers it for the entire run: the Assignment objects a list
 * returns carry has_submitted_submissions along with the current value of all
 * three fields, so nothing needs fetching per assignment. A run that updates no
 * existing assignment makes no request at all.
 *
 * A lookup that fails costs the warning, never the push.
 *
 * @param {string|number} courseId
 * @param {object[]} localModules       - The modules this run pushes.
 * @param {Function} [fetchAssignments] - Injection point for tests.
 * @returns {Promise<string[]>} The warning lines, already logged.
 */
async function warnGradeImpact(
  courseId,
  localModules,
  fetchAssignments = listAssignments,
) {
  const updated = collectUpdatedAssignments(localModules);
  if (updated.length === 0) return [];

  let current;
  try {
    current = await fetchAssignments(courseId);
  } catch (err) {
    log.warn(
      '\n[push] WARNING: could not check the assignments for student ' +
        `submissions, so this push may change grades without saying so: ${err.message}`,
    );
    return [];
  }

  const byId = new Map();
  for (const assignment of current || []) {
    byId.set(String(assignment.id), assignment);
  }

  const lines = [];
  for (const { title, relativePath, canvasId, opts } of updated) {
    const assignment = byId.get(String(canvasId));
    // An id Canvas does not list is gone: push recreates the assignment, and a
    // new one holds no student work.
    if (!assignment) continue;
    lines.push(
      ...gradeImpactWarnings(`"${title}" (${relativePath})`, opts, assignment),
    );
  }

  for (const line of lines) log.warn(`\n[push] ${line}`);
  return lines;
}

/**
 * Build a file resolver callback for a given markdown file.
 * Resolves relative file paths to Canvas file URLs using syncData.files.
 */
function buildFileResolver(currentFilePath, syncData) {
  return (href) => {
    if (!href || /^(https?:\/\/|\/\/|#|mailto:)/.test(href)) return null;
    if (href.endsWith('.md')) return null;

    const currentDir = path.posix.dirname(currentFilePath);
    const resolved = path.posix.normalize(path.posix.join(currentDir, href));
    const entry = syncData.files[resolved];
    if (!entry) return null;

    const baseUrl = syncData.canvas_base_url || '';
    return `${baseUrl}${entry.canvas_url}`;
  };
}

async function pushExternalUrl(
  courseId,
  moduleId,
  { title, filePath, position, indent, frontmatter },
  dryRun,
) {
  const url = frontmatter.external_url;
  if (!url) {
    log.warn(
      `  [push] WARNING: Skipping "${title}" — canvas_type is external_url but external_url field is missing in frontmatter`,
    );
    return;
  }

  log.info(`  [push] Creating external URL module item: ${title} -> ${url}`);
  if (!dryRun) {
    const result = await createModuleItem(courseId, moduleId, {
      title,
      type: 'ExternalUrl',
      externalUrl: url,
      position,
      indent,
      newTab: frontmatter.new_tab !== false,
    });

    // Module items are recreated on every push, so the id changes each time.
    // Only write it to frontmatter once (first push) to mark the item as
    // synced; the sync state tracks the current id by external_url.
    if (result && result.id) {
      if (frontmatter.canvas_id == null) {
        updateFrontmatter(filePath, { canvas_id: result.id });
        log.verbose(`Wrote canvas_id=${result.id} to external URL item`);
      }
      frontmatter.canvas_id = result.id;
    }
  }
}

/**
 * Say that no installed tool claims this launch URL, and what to do about it.
 *
 * The remedies are the two that outlive a single push. An account-level install
 * is inherited by every course in the account — a course resolves a tool by
 * searching itself and then its account chain — so it keeps working after a
 * rollover to next year's course, which a stored tool id never would. Course
 * Copy is the other one: Canvas carries the tool installation over itself.
 *
 * The tool list is fetched only here, on the failure path, and only to name
 * what is installed: it cannot decide the question, because for LTI 1.3 it
 * over-reports tools that Canvas then filters by context controls.
 */
async function warnNoMatchingTool(courseId, title, url) {
  log.warn(
    `  [push] WARNING: no external tool in this course matches the launch URL of "${title}" (${url}). ` +
      'Canvas creates the module item anyway and reports no error; the failure only shows when a ' +
      'student clicks it and gets "Couldn\'t find valid settings for this link".',
  );

  let installed;
  try {
    installed = describeInstalledTools(await listExternalTools(courseId));
  } catch (err) {
    installed = `the tools installed here could not be listed (${err.message})`;
  }
  log.warn(`    [push] Right now ${installed}.`);

  log.warn(
    '    [push] Two ways to fix it for good: ask your Canvas admin to install the tool at ACCOUNT ' +
      'level, because a course resolves a tool by searching itself and then its account chain — an ' +
      'account-level tool is therefore present in every future course and survives a rollover; or ' +
      "seed the new course with Canvas's own Course Copy, which carries the tool installation over " +
      'with it.',
  );
}

/**
 * Push an LTI link as a module item.
 *
 * Like an external URL, an external tool has no Canvas object of its own to
 * create or update — the module item is the whole of it, and Canvas resolves
 * which tool answers it from the launch URL every time. That is also what makes
 * the type survive a rollover: a launch URL still means something in next
 * year's course, a tool id from this year's does not.
 */
async function pushExternalTool(
  courseId,
  moduleId,
  { title, filePath, position, indent, frontmatter },
  dryRun,
) {
  const url = frontmatter.external_url;
  if (!url) {
    log.warn(
      `  [push] WARNING: Skipping "${title}" — canvas_type is external_tool but external_url field is missing in frontmatter`,
    );
    return;
  }

  log.info(`  [push] Creating external tool module item: ${title} -> ${url}`);
  if (dryRun) return;

  // Canvas fails silently on an unmatched launch URL, so ask first. Whatever
  // the answer, the item is still created: a visible broken item the author can
  // see and fix beats dropping their content on the floor.
  const probe = await findToolForUrl(courseId, url);
  if (probe.status === 'no-match') {
    await warnNoMatchingTool(courseId, title, url);
  } else if (probe.status === 'unknown') {
    log.warn(
      `  [push] WARNING: could not check whether an external tool matches the launch URL of ` +
        `"${title}" (${url}): ${probe.reason}. The item is created without the check — this says ` +
        'nothing about whether it works, so open it in Canvas to be sure.',
    );
  }

  const result = await createModuleItem(courseId, moduleId, {
    title,
    type: 'ExternalTool',
    externalUrl: url,
    position,
    indent,
    ...(frontmatter.new_tab != null ? { newTab: frontmatter.new_tab } : {}),
  });

  // Module items are recreated on every push, so the id changes each time.
  // Only write it to frontmatter once (first push) to mark the item as
  // synced; the sync state tracks the current id by external_url.
  if (result && result.id) {
    if (frontmatter.canvas_id == null) {
      updateFrontmatter(filePath, { canvas_id: result.id });
      log.verbose(`Wrote canvas_id=${result.id} to external tool item`);
    }
    frontmatter.canvas_id = result.id;
  }
}

/**
 * Say that the quiz this item points at is not in the course, and how to put it
 * there.
 *
 * The steps are the ones `/quiz-build` prints beside the package it generated
 * (`.agents/skills/quiz-build/SKILL.md`), because a QTI package has no API
 * import: Canvas takes it only through the web interface. Naming the zip is the
 * point — it is the one thing that says which package this item is waiting for.
 */
function warnQuizNotImported(title, quizRef) {
  if (!quizRef) {
    log.warn(
      `  [push] WARNING: Skipping "${title}" — this course holds no quiz by that name, and this ` +
        'file names no quiz_ref, so there is no package to import either. Create the quiz in ' +
        `Canvas under the title "${title}", or point quiz_ref at its QTI .zip (path from the ` +
        'repository root), then push again.',
    );
    return;
  }
  log.warn(
    `  [push] WARNING: Skipping "${title}" — this course holds no quiz by that name yet. ` +
      `Import ${quizRef} by hand first; Canvas has no API for a QTI import:`,
  );
  log.warn(
    '    [push] 1. Canvas -> the course -> Settings -> Import Course Content.',
  );
  log.warn(`    [push] 2. Content Type "QTI .zip file"; choose ${quizRef}.`);
  log.warn(
    '    [push] 3. Leave the default question bank; tick "Import existing quizzes as New ' +
      'Quizzes" only if the course uses New Quizzes.',
  );
  log.warn(
    '    [push] 4. Import, and wait for "Completed" under Current Jobs.',
  );
  log.warn(
    '    [push] 5. The quiz arrives unpublished: check every question and point value, set ' +
      'the availability dates and the time limit (QTI carries none of those), then publish.',
  );
  log.warn(
    `    [push] Then push again. The quiz is found by its title, so leave it named "${title}" ` +
      'in Canvas, and its id is written back to this file.',
  );
}

/**
 * Add a quiz to a module as an item, and never touch the quiz itself.
 *
 * A Classic Quiz has no markdown source: the QTI package named by `quiz_ref` is
 * what produced it, and it entered Canvas through a manual import. So this
 * creates the module item and stops there — no create, no update, no delete on
 * the quiz object, which holds questions and submissions that nothing here
 * could reconstruct.
 *
 * Which quiz an item names is resolved from `canvas_id` while the course still
 * lists it, and by title otherwise, writing the id it found back to the
 * frontmatter. That is the stale-id recovery `pushContentItem` already does for
 * pages and assignments, with the one difference that a quiz can only ever be
 * found: when the title matches nothing there is no falling back to creating
 * it, and the item is skipped with the import procedure printed.
 *
 * Two quizzes under one title are ambiguous and also skipped. A guess would
 * link students to the wrong quiz, and this is exactly the state a second
 * import of the same package leaves behind, so it is a case that happens.
 *
 * `quiz_ref` does not gate any of that. It names the package to import when the
 * quiz is missing, and it is what lets a rollover into a fresh course rebuild
 * one, so `validate` warns when it is absent. But a quiz pulled from Canvas
 * never has one, and refusing to place an item whose id resolves would drop
 * that quiz out of its module on the next push — the loss this type exists to
 * prevent.
 */
async function pushQuiz(
  courseId,
  moduleId,
  { title, filePath, position, indent, frontmatter },
  dryRun,
) {
  const quizRef = frontmatter.quiz_ref;

  log.info(`  [push] Adding quiz module item: ${title}`);
  if (dryRun) return;

  const quizzes = (await listQuizzes(courseId)) || [];
  const canvasId = frontmatter.canvas_id;
  let quizId = null;

  if (
    canvasId != null &&
    quizzes.some((quiz) => String(quiz.id) === String(canvasId))
  ) {
    quizId = canvasId;
  } else {
    if (canvasId != null) {
      log.warn(
        `    [push] Quiz ${canvasId} is no longer in this course, matching "${title}" by title instead`,
      );
    }

    const wanted = String(title).trim();
    const matches = quizzes.filter(
      (quiz) => String(quiz.title || '').trim() === wanted,
    );

    if (matches.length > 1) {
      log.warn(
        `  [push] WARNING: Skipping "${title}" — ${matches.length} quizzes in this course carry ` +
          `that title (ids ${matches.map((quiz) => quiz.id).join(', ')}), and picking one would be ` +
          'a guess. Importing a QTI package a second time adds a quiz rather than replacing the ' +
          "first: delete the stale one in Canvas, or put the id you mean in this file's canvas_id.",
      );
      return;
    }

    if (matches.length === 0) {
      warnQuizNotImported(title, quizRef);
      return;
    }

    quizId = matches[0].id;
    updateFrontmatter(filePath, { canvas_id: quizId });
    frontmatter.canvas_id = quizId;
    log.verbose(`Matched quiz "${title}" by title, wrote canvas_id=${quizId}`);
  }

  await createModuleItem(courseId, moduleId, {
    title,
    type: 'Quiz',
    contentId: quizId,
    position,
    indent,
  });
}

async function pushFile(
  courseId,
  moduleId,
  {
    title,
    filePath,
    wrapperPath,
    relativePath,
    position,
    indent,
    folderName,
    frontmatter,
  },
  dryRun,
  syncData,
  moduleEntry,
) {
  log.info(`  [push] Uploading file: ${title}`);
  if (!dryRun) {
    // Look up the Canvas file from the previous sync so we can detect a rename.
    // Canvas uploads with on_duplicate=overwrite key on the filename, so a
    // renamed binary lands as a NEW Canvas file, orphaning the old one. We
    // compare the old file's display_name (not its id) against the name we're
    // about to upload so we never delete a file that overwrite replaced in place.
    const prevId =
      frontmatter && frontmatter.canvas_id != null
        ? frontmatter.canvas_id
        : findFileIdByPath(moduleEntry, relativePath);
    const newName = path.basename(filePath);
    let prevName = null;
    if (prevId) {
      try {
        const prevMeta = await get(`/api/v1/files/${prevId}`);
        prevName = prevMeta && prevMeta.display_name;
      } catch (err) {
        // Old file already gone (e.g. deleted manually) — nothing to clean up.
        log.verbose(`Could not fetch previous file ${prevId}: ${err.message}`);
      }
    }

    const result = await uploadFile(courseId, filePath, {
      parentFolderPath: folderName,
    });
    const fileId = result.id;

    await createModuleItem(courseId, moduleId, {
      title,
      type: 'File',
      contentId: fileId,
      position,
      indent,
    });
    log.info(`    [push] Uploaded file id=${fileId}`);

    // The binary was renamed since the last sync: the upload above created a
    // fresh Canvas file, so delete the now-orphaned previous one.
    if (prevId && prevName && prevName !== newName) {
      try {
        await deleteFile(prevId);
        log.verbose(`Deleted orphaned file ${prevId} ("${prevName}")`);
      } catch (err) {
        log.warn(
          `    [push] Could not delete orphaned file ${prevId} ("${prevName}"): ${err.message}`,
        );
      }
    }

    // Keep the wrapper's canvas_id current so the identity in frontmatter
    // matches the live Canvas file.
    if (
      wrapperPath &&
      wrapperPath.endsWith('.md') &&
      frontmatter &&
      frontmatter.canvas_id !== fileId
    ) {
      updateFrontmatter(wrapperPath, { canvas_id: fileId });
      frontmatter.canvas_id = fileId;
    }

    // Track file item in sync state for pruning support
    if (relativePath && moduleEntry) {
      if (prevId && prevId !== fileId) {
        delete moduleEntry.items[itemKey('file', { canvasId: prevId })];
      }
      const key = itemKey('file', { canvasId: fileId });
      moduleEntry.items[key] = {
        path: relativePath,
        canvas_id: fileId,
        canvas_type: 'file',
      };
      removeItemFromOtherModules(syncData, key, moduleId);
    }
  }
}

/**
 * Find the canvas file id of an item entry whose stored path matches.
 * Fallback for raw (non-wrapper) file items, which carry no frontmatter.
 */
function findFileIdByPath(moduleEntry, relativePath) {
  if (!moduleEntry || !moduleEntry.items) return null;
  for (const entry of Object.values(moduleEntry.items)) {
    if (entry.canvas_type === 'file' && entry.path === relativePath) {
      return entry.canvas_id;
    }
  }
  return null;
}

/**
 * Collect the Canvas identities claimed by local course files.
 * Pages claim both their canvas_id and (when distinct) nothing else here —
 * entries are matched against this set by id or page_url.
 */
function collectLocalClaims(localModules) {
  const claims = new Set();
  for (const mod of localModules) {
    for (const item of flattenItems(mod.items)) {
      if (item.type === 'subheader' || !item.frontmatter) continue;
      const fm = item.frontmatter;
      const canvasType = item.canvasType || 'page';
      if (fm.canvas_id != null) {
        claims.add(`${canvasType}:${fm.canvas_id}`);
      }
      if (
        (canvasType === 'external_url' || canvasType === 'external_tool') &&
        fm.external_url
      ) {
        claims.add(`${canvasType}:${fm.external_url}`);
      }
    }
  }
  return claims;
}

/**
 * Check whether a sync item entry is claimed by any local file.
 * Pages match on canvas_id or page_url (frontmatter may hold either).
 * Raw file items can't carry frontmatter, so their path existing locally
 * counts as a claim.
 */
function isItemClaimed(entry, claims) {
  const type = entry.canvas_type;
  if (entry.canvas_id != null && claims.has(`${type}:${entry.canvas_id}`))
    return true;
  if (
    type === 'page' &&
    entry.page_url != null &&
    claims.has(`page:${entry.page_url}`)
  )
    return true;
  if (
    (type === 'external_url' || type === 'external_tool') &&
    entry.external_url &&
    claims.has(`${type}:${entry.external_url}`)
  )
    return true;
  if (
    type === 'file' &&
    entry.path &&
    fs.existsSync(path.resolve(COURSE_DIR, entry.path))
  )
    return true;
  return false;
}

/**
 * Collect sync-state modules that no local folder claims (by the
 * canvas_module_id in _category_.json, or by folder name as fallback).
 */
function collectDeletedModules(syncData, localModules) {
  const localFolders = new Set(localModules.map((m) => m.folderName));
  const claimedIds = new Set();
  for (const mod of localModules) {
    const id = readModuleCanvasId(path.join(COURSE_DIR, mod.folderName));
    if (id != null) claimedIds.add(String(id));
  }

  const toDelete = [];
  for (const [idKey, entry] of Object.entries(syncData.modules || {})) {
    if (claimedIds.has(idKey)) continue;
    if (entry.folder && localFolders.has(entry.folder)) continue;
    toDelete.push({ folder: entry.folder, canvasModuleId: Number(idKey) });
  }
  return toDelete;
}

/**
 * Collect item entries (within the given local modules) whose Canvas
 * identity is no longer claimed by any local file. Claims are gathered
 * from allModules (default: the scoped ones) so an item moved to a module
 * outside the scope is never mistaken for a deletion.
 */
function collectDeletedItems(syncData, localModules, allModules) {
  const claims = collectLocalClaims(allModules || localModules);
  const toDelete = [];

  for (const mod of localModules) {
    const resolved = resolveModuleEntry(syncData, mod.folderName);
    if (!resolved) continue;
    const [moduleIdKey, moduleEntry] = resolved;

    for (const [key, entry] of Object.entries(moduleEntry.items || {})) {
      if (isItemClaimed(entry, claims)) continue;
      toDelete.push({
        moduleIdKey,
        itemKey: key,
        moduleId: Number(moduleIdKey),
        relativePath: entry.path,
        canvasId: entry.canvas_id,
        canvasType: entry.canvas_type,
        pageUrl: entry.page_url,
        externalUrl: entry.external_url,
      });
    }
  }

  return toDelete;
}

/**
 * Why prune must not delete this assignment, or null when it may.
 *
 * Canvas lists the gradebook half of a graded Classic Quiz among the course's
 * assignments, and a `DELETE` on it deletes the quiz, its questions and every
 * submission. A local file that claimed `canvas_type: assignment` for such an
 * id is a mismatch between what the file says and what Canvas holds, and only
 * the author can settle it — so prune stops, and stops equally when the check
 * itself could not be made. Nothing is destroyed on a guess.
 *
 * A 404 is not a refusal: the assignment is already gone, and the delete that
 * follows reports it as such.
 *
 * The check costs one request per doomed assignment, on a path that runs only
 * after the user has confirmed a deletion.
 *
 * @param {string|number} courseId
 * @param {object} item              - A doomed item of type `assignment`.
 * @param {Function} [fetchOne]      - Injection point for tests.
 * @returns {Promise<{lines: string[], error: string}|null>}
 */
async function refuseQuizBackedDelete(
  courseId,
  item,
  fetchOne = getAssignment,
) {
  let assignment;
  try {
    assignment = await fetchOne(courseId, item.canvasId);
  } catch (err) {
    if (err.message.includes('404')) return null;
    return {
      lines: [
        `could not check whether assignment ${item.canvasId} is really a quiz ` +
          `(${err.message}). Canvas lists the gradebook half of a graded quiz ` +
          'among the assignments, and deleting that deletes the quiz with it, ' +
          'so this one is left where it is.',
      ],
      error:
        `assignment ${item.canvasId} not deleted: could not check whether it ` +
        `belongs to a quiz (${err.message})`,
    };
  }

  if (!isQuizBackedAssignment(assignment)) return null;

  const quiz =
    assignment.quiz_id != null ? `quiz ${assignment.quiz_id}` : 'a quiz';
  return {
    lines: [
      `assignment ${item.canvasId} is the gradebook half of ${quiz}, and ` +
        'deleting it deletes the quiz, its questions and every submission on it.',
      'The local file claimed canvas_type: assignment for a Canvas object that ' +
        'is really a quiz. Settle that in Canvas: delete the quiz there if that ' +
        'is what you meant, or put the file back as canvas_type: quiz if it ' +
        'should stay. Nothing was deleted, so the next prune asks again.',
    ],
    error: `assignment ${item.canvasId} not deleted: it is the gradebook half of ${quiz}`,
  };
}

/**
 * Delete a single Canvas item by type.
 * Returns true on success (including 404 = already gone), false on error.
 */
async function deleteCanvasItemByType(courseId, item, errors) {
  try {
    if (item.canvasType === 'page') {
      await deletePage(courseId, item.pageUrl || item.canvasId);
    } else if (item.canvasType === 'assignment') {
      // An assignment id can name a quiz. Ask before deleting, and refuse
      // rather than take a quiz down with the assignment that fronts it.
      const refusal = await refuseQuizBackedDelete(courseId, item);
      if (refusal) {
        log.error(
          `    [push] Refusing to delete "${item.relativePath}": ${refusal.lines[0]}`,
        );
        for (const line of refusal.lines.slice(1)) {
          log.error(`    [push] ${line}`);
        }
        errors.push({ module: item.relativePath, error: refusal.error });
        return false;
      }
      await deleteAssignment(courseId, item.canvasId);
    } else if (item.canvasType === 'discussion') {
      // A discussion is authored content like a page, so prune deletes the
      // topic itself, not just its place in the module.
      await deleteDiscussion(courseId, item.canvasId);
    } else if (item.canvasType === 'file') {
      await deleteFile(item.canvasId);
    } else if (item.canvasType === 'external_url') {
      // External URLs are module items only — find and delete via module item list
      const moduleItems = await listModuleItems(courseId, item.moduleId);
      const match = moduleItems.find(
        (mi) =>
          mi.type === 'ExternalUrl' && mi.external_url === item.externalUrl,
      );
      if (match) {
        await deleteModuleItem(courseId, item.moduleId, match.id);
      } else {
        log.warn(
          `    [push] External URL item not found on Canvas, may already be deleted: ${item.relativePath}`,
        );
      }
    } else if (item.canvasType === 'external_tool') {
      // An LTI link is a module item pointing at a tool this project did not
      // install and does not own: other courses launch the same installation,
      // so prune removes the link and never the tool behind it.
      const moduleItems = await listModuleItems(courseId, item.moduleId);
      const match = moduleItems.find(
        (mi) =>
          mi.type === 'ExternalTool' && mi.external_url === item.externalUrl,
      );
      if (match) {
        await deleteModuleItem(courseId, item.moduleId, match.id);
        log.info(
          `    [push] Removed the LTI link only; the tool installation stays in Canvas for every other course using it.`,
        );
      } else {
        log.warn(
          `    [push] External tool item not found on Canvas, may already be deleted: ${item.relativePath}`,
        );
      }
    } else if (item.canvasType === 'quiz') {
      // The quiz is not this project's to delete: a QTI import created it,
      // push never writes to it, and deleting it would take every student
      // submission with it. Prune removes the module item that links it.
      const moduleItems = await listModuleItems(courseId, item.moduleId);
      const match = moduleItems.find(
        (mi) =>
          mi.type === 'Quiz' && String(mi.content_id) === String(item.canvasId),
      );
      if (match) {
        await deleteModuleItem(courseId, item.moduleId, match.id);
        log.info(
          `    [push] Removed the module item only; the quiz and its submissions stay in Canvas.`,
        );
      } else {
        log.warn(
          `    [push] Quiz item not found on Canvas, may already be deleted: ${item.relativePath}`,
        );
      }
    } else {
      log.warn(
        `    [push] Unknown canvas_type "${item.canvasType}" for ${item.relativePath}, skipping`,
      );
      return false;
    }
    return true;
  } catch (err) {
    if (err.message.includes('404')) {
      log.warn(
        `    [push] Item already deleted from Canvas: ${item.relativePath}`,
      );
      return true;
    }
    log.error(
      `    [push] Error deleting item "${item.relativePath}": ${err.message}`,
    );
    errors.push({ module: item.relativePath, error: err.message });
    return false;
  }
}

/**
 * Annotate the doomed assignments and discussions with whether Canvas already
 * holds student submissions for them, as `hasSubmissions`: true, false, or null
 * when the lookup failed.
 *
 * Prune works from sync state, so all it has is Canvas ids. One list call for
 * the whole course is cheaper than one fetch per doomed assignment, and the
 * Assignment objects a list returns carry the flag already. Items of other
 * types cost nothing: with no assignment and no discussion in the list, no call
 * is made.
 *
 * A discussion needs one more step. A graded discussion has an Assignment
 * behind it, and that is where its submissions and grades live, but the item's
 * own id is the DiscussionTopic id, which is keyed by nothing in the
 * assignments list. So each doomed topic — and only the doomed ones — is
 * fetched to find out whether it is graded and, if it is, which assignment id
 * to look up in the states already fetched. An ungraded topic has no gradebook
 * column and no submissions, which is a real "no".
 *
 * A failed lookup leaves null behind, which the listing and the prompt report
 * as "could not determine" — never as "safe". That holds for a topic fetch that
 * fails too: an unreadable topic may well be a graded one.
 *
 * @param {string|number} courseId
 * @param {object[]} items          - Doomed items; annotated in place.
 * @param {Function} [fetchStates]  - Injection point for tests.
 * @param {Function} [fetchTopic]   - Injection point for tests.
 */
async function annotateSubmissions(
  courseId,
  items,
  fetchStates = getSubmissionStates,
  fetchTopic = getDiscussion,
) {
  const assignments = items.filter((item) => item.canvasType === 'assignment');
  const discussions = items.filter((item) => item.canvasType === 'discussion');
  if (assignments.length === 0 && discussions.length === 0) return items;

  // Resolve the doomed topics first, so a prune that only drops ungraded
  // discussions settles the question without listing the course's assignments.
  const gradedDiscussions = new Map();
  for (const item of discussions) {
    let topic;
    try {
      topic = await fetchTopic(courseId, item.canvasId);
    } catch (err) {
      log.warn(
        `[push] Could not check discussion ${item.canvasId} ` +
          `(${item.relativePath}) for grades: ${err.message}`,
      );
      item.hasSubmissions = null;
      continue;
    }
    if (!isGradedDiscussion(topic)) {
      // No gradebook column, so no submissions and no grades: a real "no".
      item.hasSubmissions = false;
      continue;
    }
    const assignmentId = discussionAssignmentId(topic);
    if (assignmentId == null) {
      // Graded, but Canvas named no assignment to look the grades up under.
      item.hasSubmissions = null;
      continue;
    }
    gradedDiscussions.set(item, String(assignmentId));
  }

  if (assignments.length === 0 && gradedDiscussions.size === 0) return items;

  let states;
  try {
    states = await fetchStates(courseId);
  } catch (err) {
    log.warn(
      `[push] Could not check the assignments for student submissions: ${err.message}`,
    );
    for (const item of assignments) item.hasSubmissions = null;
    for (const item of gradedDiscussions.keys()) item.hasSubmissions = null;
    return items;
  }

  // An id Canvas no longer lists is already gone, so there is no student work
  // left to lose: that is a real "no", not an unknown.
  for (const item of assignments) {
    const key = String(item.canvasId);
    item.hasSubmissions = states.has(key) ? states.get(key) : false;
  }
  // That reasoning does not carry over to a discussion. The item being deleted
  // is the topic, and the topic was just fetched, so it plainly exists and
  // plainly says it is graded; an assignment id that resolves to nothing is an
  // inconsistency in Canvas's own answer, not evidence that the topic is safe.
  // Unknown, therefore — the same as a graded topic that named no id at all.
  for (const [item, key] of gradedDiscussions) {
    item.hasSubmissions = states.has(key) ? states.get(key) : null;
  }
  return items;
}

/**
 * The listing line for one doomed item. An assignment or discussion with grades
 * behind it must not scan like a stray page, so it carries the reason on the
 * same line.
 *
 * A graded discussion loses more than a gradebook column: the topic goes with
 * it, and every reply students wrote in it, so its line says so.
 */
function describeDoomedItem(item) {
  const line = `  - ${item.relativePath} (${item.canvasType})`;
  if (item.canvasType === 'discussion') {
    if (item.hasSubmissions === true)
      return `${line}  <-- GRADED DISCUSSION WITH STUDENT WORK: deletes the topic and every student reply in it, plus the gradebook column and every grade`;
    if (item.hasSubmissions === null)
      return `${line}  <-- SUBMISSION STATUS UNKNOWN: could not be checked, assume it is graded and that replies and grades will be lost`;
    return line;
  }
  if (item.canvasType !== 'assignment') return line;
  if (item.hasSubmissions === true)
    return `${line}  <-- HAS STUDENT SUBMISSIONS: deletes the gradebook column and every grade in it`;
  if (item.hasSubmissions === null)
    return `${line}  <-- SUBMISSION STATUS UNKNOWN: could not be checked, assume grades will be lost`;
  return line;
}

/**
 * Unified prune: detect and delete Canvas modules and items that no longer exist locally.
 */
async function pruneDeleted(
  courseId,
  syncData,
  allModules,
  filteredModules,
  moduleFilter,
  dryRun,
  errors,
) {
  // Collect modules to delete (skip when filtering by specific module)
  const modulesToDelete = !moduleFilter
    ? collectDeletedModules(syncData, allModules)
    : [];

  // Collect items to delete (within filtered modules, claims from all)
  const itemsToDelete = collectDeletedItems(
    syncData,
    filteredModules,
    allModules,
  );

  if (modulesToDelete.length === 0 && itemsToDelete.length === 0) {
    log.info('\n[push] Prune: nothing to remove from Canvas.');
    return;
  }

  // Display what will be deleted
  if (modulesToDelete.length > 0) {
    log.info(
      `\n[push] Prune: ${modulesToDelete.length} locally-deleted module(s) to remove from Canvas:`,
    );
    for (const { folder } of modulesToDelete) {
      log.info(`  - ${folder} (entire module)`);
    }
  }

  // Ask Canvas which of the doomed items carry student work before listing
  // them, so the listing can say so item by item. Both types that can hold
  // grades are counted: an assignment, and the discussion a graded topic hangs
  // its assignment off.
  await annotateSubmissions(courseId, itemsToDelete);
  const risk = countSubmissionRisk(
    itemsToDelete
      .filter(
        (item) =>
          item.canvasType === 'assignment' || item.canvasType === 'discussion',
      )
      .map((item) => item.hasSubmissions),
  );

  if (itemsToDelete.length > 0) {
    log.info(
      `\n[push] Prune: ${itemsToDelete.length} locally-deleted item(s) to remove from Canvas:`,
    );
    for (const item of itemsToDelete) {
      log.info(describeDoomedItem(item));
    }
  }

  for (const line of submissionWarningLines(risk)) {
    log.warn(`\n[push] ${line}`);
  }

  // Confirm with user (unless dry-run)
  if (!dryRun) {
    log.info(`\n[push] ${BACKUP_HINT}`);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer = await new Promise((resolve) => {
      rl.question(
        `[push] Delete these from Canvas${submissionRiskSuffix(risk)}? (y/N) `,
        resolve,
      );
    });
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      log.info('[push] Prune cancelled.');
      return;
    }
  }

  // Delete modules
  for (const { folder, canvasModuleId } of modulesToDelete) {
    log.info(
      `  [push] Pruning module: ${folder} (canvas_module_id: ${canvasModuleId})`,
    );
    if (!dryRun) {
      try {
        await deleteCanvasModule(courseId, canvasModuleId);
        delete syncData.modules[String(canvasModuleId)];
        log.info(`    [push] Deleted from Canvas.`);
      } catch (err) {
        log.error(
          `    [push] Error deleting module "${folder}": ${err.message}`,
        );
        errors.push({ module: folder, error: err.message });
      }
    }
  }

  // Delete individual items
  for (const item of itemsToDelete) {
    log.info(
      `  [push] Pruning item: ${item.relativePath} (${item.canvasType})`,
    );
    if (!dryRun) {
      const success = await deleteCanvasItemByType(courseId, item, errors);
      if (success) {
        const moduleEntry = syncData.modules[item.moduleIdKey];
        if (moduleEntry && moduleEntry.items) {
          delete moduleEntry.items[item.itemKey];
        }
        log.info(`    [push] Deleted from Canvas.`);
      }
    }
  }
}

module.exports = push;
// Exported for testing
push._isLiveItemLocal = isLiveItemLocal;
push._inspectCanvasOnlyItems = inspectCanvasOnlyItems;
push._describeCanvasOnlyItem = describeCanvasOnlyItem;
push._reportCanvasOnlyRefusal = reportCanvasOnlyRefusal;
push._collectPushGuardClaims = collectPushGuardClaims;
push._makePageIdResolver = makePageIdResolver;
push._readLiveItems = readLiveItems;
push._pushModule = pushModule;
push._collectDeletedModules = collectDeletedModules;
push._collectDeletedItems = collectDeletedItems;
push._collectLocalClaims = collectLocalClaims;
push._isItemClaimed = isItemClaimed;
push._deleteCanvasItemByType = deleteCanvasItemByType;
push._refuseQuizBackedDelete = refuseQuizBackedDelete;
push._annotateSubmissions = annotateSubmissions;
push._describeDoomedItem = describeDoomedItem;
push._warnGradeImpact = warnGradeImpact;
push._gradeImpactWarnings = gradeImpactWarnings;
push._collectUpdatedAssignments = collectUpdatedAssignments;
push._buildFileResolver = buildFileResolver;
push._registerItem = registerItem;
push._pageStrategy = pageStrategy;
push._assignmentStrategy = assignmentStrategy;
push._discussionStrategy = discussionStrategy;
push._pushContentItem = pushContentItem;
push._pushExternalTool = pushExternalTool;
push._pushQuiz = pushQuiz;
