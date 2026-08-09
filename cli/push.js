const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const { scanCourse } = require('../lib/convert/course-scanner');
const { updateFrontmatter } = require('../lib/convert/frontmatter');
const { markdownToHtml } = require('../lib/convert/markdown-to-html');
const { loadCourseConfig } = require('../lib/config/course-config');
const { createModule, updateModule, createModuleItem, deleteModule: deleteCanvasModule, listModuleItems, deleteModuleItem } = require('../lib/canvas/modules');
const { createPage, updatePage, deletePage } = require('../lib/canvas/pages');
const { createAssignment, updateAssignment, deleteAssignment } = require('../lib/canvas/assignments');
const { uploadFile, deleteFile } = require('../lib/canvas/files');
const { get } = require('../lib/canvas/client');
const { ensureIcons, getIconUrls } = require('../lib/canvas/icons');
const { buildLinkMap, resolveRelativeLink, extractFileReferences } = require('../lib/convert/link-resolver');
const { SYNC_FILE, loadSyncFile, saveSyncFile, itemKey, ensureModuleEntry, findModuleEntryByFolder, removeItemFromOtherModules } = require('./sync-utils');
const { COURSE_DIR, readModuleCanvasId, writeModuleCanvasId } = require('./module-utils');
const log = require('./logger');

async function push(options) {
  const courseId = process.env.CANVAS_COURSE_ID;
  if (!courseId) {
    log.error('[push] Error: CANVAS_COURSE_ID is not set. Run "npx course init" first.');
    process.exit(1);
  }

  const dryRun = options.dryRun || false;
  const moduleFilter = options.module || null;
  const prune = options.prune || false;

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
    log.error(`[push] Error: Module "${moduleFilter}" not found in course/ directory.`);
    process.exit(1);
  }

  log.info(`[push] Found ${filteredModules.length} module(s) to push.`);
  if (dryRun) log.info('[push] DRY RUN - no changes will be made.\n');

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
      if (!item.relativePath || !item.frontmatter || item.frontmatter.canvas_id == null) continue;
      registerItem(syncData, moduleIdKey, moduleEntry, item, {
        canvasId: item.frontmatter.canvas_id,
      });
    }
  }

  // Build link map from sync state for resolving internal links
  let { relativeToCanvas } = buildLinkMap(syncData);

  // Track items that had unresolved internal links for a second pass
  const unresolvedItems = [];

  const errors = [];
  const totalModules = filteredModules.length;

  for (let mi = 0; mi < filteredModules.length; mi++) {
    const mod = filteredModules[mi];
    log.info(`\n[push] Module ${mi + 1}/${totalModules}: ${mod.moduleName}`);
    try {
      await pushModule(courseId, mod, syncData, dryRun, iconUrls, relativeToCanvas, unresolvedItems, errors);
    } catch (err) {
      log.error(`[push] Error pushing module "${mod.moduleName}": ${err.message}`);
      errors.push({ module: mod.moduleName, error: err.message });
    }
    // Save sync state after each module so progress is preserved on failure
    if (!dryRun) {
      saveSyncFile(syncData);
    }
  }

  // Report unresolved links in dry-run mode
  if (unresolvedItems.length > 0 && dryRun) {
    log.info(`\n[push] ${unresolvedItems.length} item(s) have unresolved internal links (will be resolved in a second pass during actual push):`);
    for (const { relativePath } of unresolvedItems) {
      log.info(`  - ${relativePath}`);
    }
  }

  // Second pass: re-push items that had unresolved internal links
  if (unresolvedItems.length > 0 && !dryRun) {
    log.info(`\n[push] Resolving internal links for ${unresolvedItems.length} item(s) that referenced newly-created pages...`);
    ({ relativeToCanvas } = buildLinkMap(syncData));

    for (const { courseId: cId, relativePath, filePath, canvasId, canvasType, iconUrls: iu } of unresolvedItems) {
      try {
        const linkResolver = (href) => {
          const { resolved } = resolveRelativeLink(href, relativePath, relativeToCanvas, cId);
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
        }
        log.info(`  [push] Updated links in: ${relativePath}`);
      } catch (err) {
        log.error(`  [push] Error updating links in "${relativePath}": ${err.message}`);
        errors.push({ module: relativePath, error: err.message });
      }
    }
  }

  // Prune: remove Canvas modules and items that no longer exist locally
  if (prune) {
    await pruneDeleted(courseId, syncData, modules, filteredModules, moduleFilter, dryRun, errors);
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
 * (rename-proof), falling back to the stored folder name (migrated states).
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
function registerItem(syncData, moduleIdKey, moduleEntry, item, { canvasId, pageUrl } = {}) {
  const canvasType = item.canvasType || 'page';
  const externalUrl = item.frontmatter && item.frontmatter.external_url;

  let key = itemKey(canvasType, { canvasId, externalUrl });
  if (!moduleEntry.items[key] && canvasType === 'page') {
    for (const [k, e] of Object.entries(moduleEntry.items)) {
      if (e.canvas_type === 'page' && e.page_url != null && String(e.page_url) === String(canvasId)) {
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
  if (canvasType === 'external_url' && externalUrl) entry.external_url = externalUrl;

  moduleEntry.items[key] = entry;
  removeItemFromOtherModules(syncData, key, moduleIdKey);
  return key;
}

async function pushModule(courseId, mod, syncData, dryRun, iconUrls, relativeToCanvas, unresolvedItems, errors) {
  const moduleDir = path.join(COURSE_DIR, mod.folderName);
  // The id in _category_.json is authoritative even when the sync file was
  // lost; the sync entry (matched by folder) covers migrated v2 states.
  const catId = readModuleCanvasId(moduleDir);
  const resolved = resolveModuleEntry(syncData, mod.folderName);
  const existingModuleId = catId != null
    ? Number(catId)
    : (resolved ? Number(resolved[0]) : null);

  let moduleId;

  if (existingModuleId) {
    log.info(`[push] Updating module: ${mod.moduleName} (id: ${existingModuleId})`);
    if (!dryRun) {
      try {
        const result = await updateModule(courseId, existingModuleId, {
          name: mod.moduleName,
          position: mod.position,
        });
        moduleId = result.id;
      } catch (err) {
        if (err.message.includes('404')) {
          log.warn(`[push] Module ${existingModuleId} not found on Canvas, creating new`);
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
    writeModuleCanvasId(moduleDir, moduleId, { label: mod.moduleName, position: mod.position });
    moduleEntry = ensureModuleEntry(syncData, moduleId, mod.folderName);

    // The module was recreated: drop the entry that pointed at the old id.
    if (existingModuleId && existingModuleId !== moduleId) {
      delete syncData.modules[String(existingModuleId)];
    }
  }

  // Clear existing module items to prevent duplicates on re-push.
  // Module items are links within a module — deleting them does not delete
  // the underlying pages, assignments, or files.
  if (!dryRun && existingModuleId && existingModuleId === moduleId) {
    log.verbose('Clearing existing module items before re-push');
    const existingItems = await listModuleItems(courseId, moduleId);
    for (const mi of existingItems) {
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
      } catch (_) {
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
        log.verbose(`No stored hash for ${ref}, re-uploading to establish baseline`);
      }

      log.verbose(`Uploading embedded file: ${ref}`);
      try {
        const result = await uploadFile(courseId, localPath, { parentFolderPath: mod.folderName });
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
      await pushItem(courseId, moduleId, item, dryRun, iconUrls, mod.folderName, relativeToCanvas, unresolvedItems, syncData, moduleEntry);
      // Track item in sync file (file items track themselves in pushFile)
      if (!dryRun && moduleEntry && item.relativePath && item.frontmatter
          && item.frontmatter.canvas_id != null && item.canvasType !== 'file') {
        registerItem(syncData, String(moduleId), moduleEntry, item, {
          canvasId: item.frontmatter.canvas_id,
          pageUrl: item._pageUrl,
        });
      }
    } catch (err) {
      log.error(`  [push] Error pushing item "${itemTitle}": ${err.message}`);
      errors.push({ module: `${mod.folderName}/${itemTitle}`, error: err.message });
    }
  }
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
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

async function pushItem(courseId, moduleId, item, dryRun, iconUrls, folderName, relativeToCanvas, unresolvedItems, syncData, moduleEntry) {
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

  const { canvasType, title, frontmatter, relativePath, position, indent } = item;
  const filePath = path.resolve(COURSE_DIR, relativePath);
  const canvasId = frontmatter.canvas_id || null;

  if (canvasType === 'page') {
    const pageUrl = await pushContentItem(courseId, moduleId, { title, filePath, relativePath, canvasId, position, indent, frontmatter }, dryRun, iconUrls, relativeToCanvas, unresolvedItems, syncData, pageStrategy);
    if (pageUrl) item._pageUrl = pageUrl;
  } else if (canvasType === 'assignment') {
    await pushContentItem(courseId, moduleId, { title, filePath, relativePath, canvasId, position, indent, frontmatter }, dryRun, iconUrls, relativeToCanvas, unresolvedItems, syncData, assignmentStrategy);
  } else if (canvasType === 'external_url') {
    await pushExternalUrl(courseId, moduleId, { title, filePath, position, indent, frontmatter }, dryRun);
  } else if (canvasType === 'file') {
    // Resolve file_ref from markdown wrapper to actual binary path
    let binaryPath = filePath;
    if (filePath.endsWith('.md') && frontmatter.file_ref) {
      binaryPath = path.resolve(path.dirname(filePath), frontmatter.file_ref);
    }
    await pushFile(courseId, moduleId, { title, filePath: binaryPath, wrapperPath: filePath, relativePath, position, indent, folderName, frontmatter }, dryRun, syncData, moduleEntry);
  } else {
    log.warn(`  [push] Skipping unknown type "${canvasType}": ${title}`);
  }
}

/**
 * Push a content item (page or assignment) to Canvas.
 * Handles create-or-update, module item creation, and unresolved link tracking.
 * Returns the page slug (for pages) or null.
 */
async function pushContentItem(courseId, moduleId, { title, filePath, relativePath, canvasId, position, indent, frontmatter }, dryRun, iconUrls, relativeToCanvas, unresolvedItems, syncData, strategy) {
  const raw = fs.readFileSync(filePath, 'utf8');

  let hasUnresolved = false;
  const linkResolver = (href) => {
    const { resolved, wasInternal } = resolveRelativeLink(href, relativePath, relativeToCanvas, courseId);
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
          log.warn(`    [push] ${strategy.label} ${canvasId} not found on Canvas, creating new`);
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
    await createModuleItem(courseId, moduleId, strategy.buildModuleItem(title, slug || itemId, position, indent));
  }

  if (hasUnresolved && !dryRun && itemId) {
    unresolvedItems.push({ courseId, relativePath, filePath, canvasId: itemId, canvasType: strategy.canvasType, iconUrls });
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
    title, type: 'Page', pageUrl: slug, position, indent,
  }),
};

/** Strategy for pushing assignments. */
const assignmentStrategy = {
  canvasType: 'assignment',
  label: 'Assignment',
  buildOpts: (title, html, frontmatter) => {
    const opts = { name: title, description: html };
    if (frontmatter.points_possible != null) opts.pointsPossible = frontmatter.points_possible;
    if (frontmatter.submission_types) opts.submissionTypes = frontmatter.submission_types;
    if (frontmatter.due_at) opts.dueAt = frontmatter.due_at;
    if (frontmatter.published != null) opts.published = frontmatter.published;
    return opts;
  },
  create: createAssignment,
  update: updateAssignment,
  extractId: (result) => result.id,
  extractSlug: null,
  buildModuleItem: (title, contentId, position, indent) => ({
    title, type: 'Assignment', contentId, position, indent,
  }),
};

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

async function pushExternalUrl(courseId, moduleId, { title, filePath, position, indent, frontmatter }, dryRun) {
  const url = frontmatter.external_url;
  if (!url) {
    log.warn(`  [push] WARNING: Skipping "${title}" — canvas_type is external_url but external_url field is missing in frontmatter`);
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

async function pushFile(courseId, moduleId, { title, filePath, wrapperPath, relativePath, position, indent, folderName, frontmatter }, dryRun, syncData, moduleEntry) {
  log.info(`  [push] Uploading file: ${title}`);
  if (!dryRun) {
    // Look up the Canvas file from the previous sync so we can detect a rename.
    // Canvas uploads with on_duplicate=overwrite key on the filename, so a
    // renamed binary lands as a NEW Canvas file, orphaning the old one. We
    // compare the old file's display_name (not its id) against the name we're
    // about to upload so we never delete a file that overwrite replaced in place.
    const prevId = (frontmatter && frontmatter.canvas_id != null)
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

    const result = await uploadFile(courseId, filePath, { parentFolderPath: folderName });
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
        log.warn(`    [push] Could not delete orphaned file ${prevId} ("${prevName}"): ${err.message}`);
      }
    }

    // Keep the wrapper's canvas_id current so the identity in frontmatter
    // matches the live Canvas file.
    if (wrapperPath && wrapperPath.endsWith('.md') && frontmatter && frontmatter.canvas_id !== fileId) {
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
      if (canvasType === 'external_url' && fm.external_url) {
        claims.add(`external_url:${fm.external_url}`);
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
  if (entry.canvas_id != null && claims.has(`${type}:${entry.canvas_id}`)) return true;
  if (type === 'page' && entry.page_url != null && claims.has(`page:${entry.page_url}`)) return true;
  if (type === 'external_url' && entry.external_url && claims.has(`external_url:${entry.external_url}`)) return true;
  if (type === 'file' && entry.path && fs.existsSync(path.resolve(COURSE_DIR, entry.path))) return true;
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
 * Delete a single Canvas item by type.
 * Returns true on success (including 404 = already gone), false on error.
 */
async function deleteCanvasItemByType(courseId, item, errors) {
  try {
    if (item.canvasType === 'page') {
      await deletePage(courseId, item.pageUrl || item.canvasId);
    } else if (item.canvasType === 'assignment') {
      await deleteAssignment(courseId, item.canvasId);
    } else if (item.canvasType === 'file') {
      await deleteFile(item.canvasId);
    } else if (item.canvasType === 'external_url') {
      // External URLs are module items only — find and delete via module item list
      const moduleItems = await listModuleItems(courseId, item.moduleId);
      const match = moduleItems.find(
        (mi) => mi.type === 'ExternalUrl' && mi.external_url === item.externalUrl
      );
      if (match) {
        await deleteModuleItem(courseId, item.moduleId, match.id);
      } else {
        log.warn(`    [push] External URL item not found on Canvas, may already be deleted: ${item.relativePath}`);
      }
    } else {
      log.warn(`    [push] Unknown canvas_type "${item.canvasType}" for ${item.relativePath}, skipping`);
      return false;
    }
    return true;
  } catch (err) {
    if (err.message.includes('404')) {
      log.warn(`    [push] Item already deleted from Canvas: ${item.relativePath}`);
      return true;
    }
    log.error(`    [push] Error deleting item "${item.relativePath}": ${err.message}`);
    errors.push({ module: item.relativePath, error: err.message });
    return false;
  }
}

/**
 * Unified prune: detect and delete Canvas modules and items that no longer exist locally.
 */
async function pruneDeleted(courseId, syncData, allModules, filteredModules, moduleFilter, dryRun, errors) {
  // Collect modules to delete (skip when filtering by specific module)
  const modulesToDelete = !moduleFilter ? collectDeletedModules(syncData, allModules) : [];

  // Collect items to delete (within filtered modules, claims from all)
  const itemsToDelete = collectDeletedItems(syncData, filteredModules, allModules);

  if (modulesToDelete.length === 0 && itemsToDelete.length === 0) {
    log.info('\n[push] Prune: nothing to remove from Canvas.');
    return;
  }

  // Display what will be deleted
  if (modulesToDelete.length > 0) {
    log.info(`\n[push] Prune: ${modulesToDelete.length} locally-deleted module(s) to remove from Canvas:`);
    for (const { folder } of modulesToDelete) {
      log.info(`  - ${folder} (entire module)`);
    }
  }

  if (itemsToDelete.length > 0) {
    log.info(`\n[push] Prune: ${itemsToDelete.length} locally-deleted item(s) to remove from Canvas:`);
    for (const { relativePath, canvasType } of itemsToDelete) {
      log.info(`  - ${relativePath} (${canvasType})`);
    }
  }

  // Confirm with user (unless dry-run)
  if (!dryRun) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise((resolve) => {
      rl.question('[push] Delete these from Canvas? (y/N) ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      log.info('[push] Prune cancelled.');
      return;
    }
  }

  // Delete modules
  for (const { folder, canvasModuleId } of modulesToDelete) {
    log.info(`  [push] Pruning module: ${folder} (canvas_module_id: ${canvasModuleId})`);
    if (!dryRun) {
      try {
        await deleteCanvasModule(courseId, canvasModuleId);
        delete syncData.modules[String(canvasModuleId)];
        log.info(`    [push] Deleted from Canvas.`);
      } catch (err) {
        log.error(`    [push] Error deleting module "${folder}": ${err.message}`);
        errors.push({ module: folder, error: err.message });
      }
    }
  }

  // Delete individual items
  for (const item of itemsToDelete) {
    log.info(`  [push] Pruning item: ${item.relativePath} (${item.canvasType})`);
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
push._collectDeletedModules = collectDeletedModules;
push._collectDeletedItems = collectDeletedItems;
push._collectLocalClaims = collectLocalClaims;
push._isItemClaimed = isItemClaimed;
push._deleteCanvasItemByType = deleteCanvasItemByType;
push._buildFileResolver = buildFileResolver;
push._registerItem = registerItem;
push._pageStrategy = pageStrategy;
push._assignmentStrategy = assignmentStrategy;
