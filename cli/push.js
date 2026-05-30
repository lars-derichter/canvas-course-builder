const fs = require('fs');
const path = require('path');
const readline = require('readline');

const { scanCourse } = require('../lib/convert/course-scanner');
const { updateFrontmatter } = require('../lib/convert/frontmatter');
const { markdownToHtml } = require('../lib/convert/markdown-to-html');
const { createModule, updateModule, createModuleItem, deleteModule: deleteCanvasModule, listModuleItems, deleteModuleItem } = require('../lib/canvas/modules');
const { createPage, updatePage, deletePage } = require('../lib/canvas/pages');
const { createAssignment, updateAssignment, deleteAssignment } = require('../lib/canvas/assignments');
const { uploadFile, deleteFile } = require('../lib/canvas/files');
const { get } = require('../lib/canvas/client');
const { ensureIcons, getIconUrls } = require('../lib/canvas/icons');
const { buildLinkMap, resolveRelativeLink, extractFileReferences } = require('../lib/convert/link-resolver');
const { SYNC_FILE, loadSyncFile, saveSyncFile } = require('./sync-utils');
const { COURSE_DIR } = require('./module-utils');
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

  // Pre-populate sync items from frontmatter so the link map is available
  // even if .canvas-sync.json items were empty (e.g. after reset or first use)
  for (const mod of modules) {
    if (!syncData.modules[mod.folderName]) {
      syncData.modules[mod.folderName] = { items: {} };
    }
    if (!syncData.modules[mod.folderName].items) {
      syncData.modules[mod.folderName].items = {};
    }
    const allItems = flattenItems(mod.items);
    for (const item of allItems) {
      if (item.relativePath && item.frontmatter && item.frontmatter.canvas_id) {
        const existing = syncData.modules[mod.folderName].items[item.relativePath];
        if (!existing) {
          syncData.modules[mod.folderName].items[item.relativePath] = {
            canvas_id: item.frontmatter.canvas_id,
            canvas_type: item.canvasType || 'page',
          };
        }
      }
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
      await pushModule(courseId, mod, syncData, dryRun, iconUrls, relativeToCanvas, unresolvedItems);
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
        const html = markdownToHtml(raw, { iconUrls: iu, linkResolver, fileResolver });

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
  } else {
    log.info('[push] Done.');
  }
}

async function pushModule(courseId, mod, syncData, dryRun, iconUrls, relativeToCanvas, unresolvedItems) {
  const syncModule = syncData.modules[mod.folderName] || {};
  const canvasModuleId = syncModule.canvas_module_id;

  let moduleId;

  if (canvasModuleId) {
    log.info(`[push] Updating module: ${mod.moduleName} (id: ${canvasModuleId})`);
    if (!dryRun) {
      try {
        const result = await updateModule(courseId, canvasModuleId, {
          name: mod.moduleName,
          position: mod.position,
        });
        moduleId = result.id;
      } catch (err) {
        if (err.message.includes('404')) {
          log.warn(`[push] Module ${canvasModuleId} not found on Canvas, creating new`);
        } else {
          throw err;
        }
      }
    } else {
      moduleId = canvasModuleId;
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

  // Save module ID and initialize items tracking
  if (!dryRun) {
    syncData.modules[mod.folderName] = syncData.modules[mod.folderName] || {};
    syncData.modules[mod.folderName].canvas_module_id = moduleId;
    syncData.modules[mod.folderName].items = syncData.modules[mod.folderName].items || {};
  }

  // Clear existing module items to prevent duplicates on re-push.
  // Module items are links within a module — deleting them does not delete
  // the underlying pages, assignments, or files.
  if (!dryRun && canvasModuleId) {
    log.verbose('Clearing existing module items before re-push');
    const existingItems = await listModuleItems(courseId, moduleId);
    for (const mi of existingItems) {
      await deleteModuleItem(courseId, moduleId, mi.id);
    }
  }

  // Upload embedded files (images, etc.) referenced from markdown content
  const flatItems = flattenItems(mod.items);
  const referencedFiles = new Set();

  if (!dryRun) {
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
      if (syncData.files[ref]) continue; // Already uploaded

      log.verbose(`Uploading embedded file: ${ref}`);
      try {
        const result = await uploadFile(courseId, localPath, { parentFolderPath: mod.folderName });
        syncData.files[ref] = {
          canvas_file_id: result.id,
          canvas_url: `/courses/${courseId}/files/${result.id}/preview`,
        };
      } catch (err) {
        log.error(`  [push] Error uploading file "${ref}": ${err.message}`);
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
      await pushItem(courseId, moduleId, item, dryRun, iconUrls, mod.folderName, relativeToCanvas, unresolvedItems, syncData);
      // Track item in sync file
      if (!dryRun && item.relativePath && item.frontmatter && item.frontmatter.canvas_id) {
        const itemSync = {
          canvas_id: item.frontmatter.canvas_id,
          canvas_type: item.canvasType || 'page',
        };
        // Store page slug for link resolution (pages use slugs in URLs, not numeric IDs)
        if (item._pageUrl) {
          itemSync.page_url = item._pageUrl;
        }
        // Store external_url as stable identifier for ExternalUrl items
        if (item.canvasType === 'external_url' && item.frontmatter.external_url) {
          itemSync.external_url = item.frontmatter.external_url;
        }
        syncData.modules[mod.folderName].items[item.relativePath] = itemSync;
      }
    } catch (err) {
      log.error(`  [push] Error pushing item "${itemTitle}": ${err.message}`);
    }
  }
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

async function pushItem(courseId, moduleId, item, dryRun, iconUrls, folderName, relativeToCanvas, unresolvedItems, syncData) {
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
    await pushFile(courseId, moduleId, { title, filePath: binaryPath, relativePath, position, indent, folderName }, dryRun, syncData);
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
  const html = markdownToHtml(raw, { iconUrls, linkResolver, fileResolver });

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

    // Write canvas_id back to frontmatter so sync tracking picks up this item
    if (result && result.id) {
      updateFrontmatter(filePath, { canvas_id: result.id });
      frontmatter.canvas_id = result.id;
      log.verbose(`Wrote canvas_id=${result.id} to external URL item`);
    }
  }
}

async function pushFile(courseId, moduleId, { title, filePath, relativePath, position, indent, folderName }, dryRun, syncData) {
  log.info(`  [push] Uploading file: ${title}`);
  if (!dryRun) {
    // Look up the Canvas file from the previous sync so we can detect a rename.
    // Canvas uploads with on_duplicate=overwrite key on the filename, so a
    // renamed binary lands as a NEW Canvas file, orphaning the old one. We
    // compare the old file's display_name (not its id) against the name we're
    // about to upload so we never delete a file that overwrite replaced in place.
    const prevId = syncData.modules[folderName] &&
      syncData.modules[folderName].items[relativePath] &&
      syncData.modules[folderName].items[relativePath].canvas_id;
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

    // Track file item in sync state for pruning support
    if (relativePath && syncData.modules[folderName]) {
      syncData.modules[folderName].items[relativePath] = {
        canvas_id: fileId,
        canvas_type: 'file',
      };
    }
  }
}

/**
 * Collect modules in sync state that no longer exist locally.
 */
function collectDeletedModules(syncData, localModules) {
  const localFolders = new Set(localModules.map((m) => m.folderName));
  const syncModules = syncData.modules || {};
  const toDelete = [];

  for (const [folder, data] of Object.entries(syncModules)) {
    if (!localFolders.has(folder) && data.canvas_module_id) {
      toDelete.push({ folder, canvasModuleId: data.canvas_module_id });
    }
  }

  return toDelete;
}

/**
 * Collect items in sync state that no longer exist locally within each module.
 */
function collectDeletedItems(syncData, localModules) {
  const toDelete = [];

  for (const mod of localModules) {
    const syncMod = syncData.modules[mod.folderName];
    if (!syncMod || !syncMod.items) continue;

    const localPaths = new Set(
      flattenItems(mod.items)
        .filter((i) => i.relativePath)
        .map((i) => i.relativePath)
    );

    for (const [relPath, itemData] of Object.entries(syncMod.items)) {
      if (!localPaths.has(relPath)) {
        toDelete.push({
          folderName: mod.folderName,
          moduleId: syncMod.canvas_module_id,
          relativePath: relPath,
          canvasId: itemData.canvas_id,
          canvasType: itemData.canvas_type,
          pageUrl: itemData.page_url,
        });
      }
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
        (mi) => mi.type === 'ExternalUrl' && mi.external_url === item.canvasId
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

  // Collect items to delete (within filtered modules)
  const itemsToDelete = collectDeletedItems(syncData, filteredModules);

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
        delete syncData.modules[folder];
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
        delete syncData.modules[item.folderName].items[item.relativePath];
        log.info(`    [push] Deleted from Canvas.`);
      }
    }
  }
}

module.exports = push;
// Exported for testing
push._collectDeletedModules = collectDeletedModules;
push._collectDeletedItems = collectDeletedItems;
push._deleteCanvasItemByType = deleteCanvasItemByType;
push._buildFileResolver = buildFileResolver;
push._pageStrategy = pageStrategy;
push._assignmentStrategy = assignmentStrategy;
