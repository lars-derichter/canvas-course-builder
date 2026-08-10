const fs = require('fs');
const path = require('path');

const { scanCourse } = require('../lib/convert/course-scanner');
const { loadSyncFile, findModuleEntryByFolder } = require('./sync-utils');
const { COURSE_DIR, readModuleCanvasId } = require('./module-utils');

/**
 * Resolve the sync entry for a local module folder: by the canvas id stored
 * in _category_.json first, by folder name as fallback.
 */
function findSyncEntry(syncData, folderName) {
  const catId = readModuleCanvasId(path.join(COURSE_DIR, folderName));
  if (catId != null && syncData.modules && syncData.modules[String(catId)]) {
    return [String(catId), syncData.modules[String(catId)]];
  }
  return findModuleEntryByFolder(syncData, folderName);
}

/**
 * Flatten items list, expanding subheader children.
 */
function flattenItems(items) {
  const result = [];
  for (const item of items) {
    if (item.type === 'subheader') {
      result.push(item);
      if (item.items) {
        for (const child of item.items) {
          result.push(child);
        }
      }
    } else {
      result.push(item);
    }
  }
  return result;
}

async function diff() {
  const syncData = loadSyncFile({ allowNull: true });

  if (!syncData) {
    console.log(
      '[diff] No .canvas-sync.json found. Nothing has been synced yet.',
    );
    return;
  }

  if (!fs.existsSync(COURSE_DIR)) {
    console.log('[diff] No course/ directory found.');
    return;
  }

  const modules = scanCourse(COURSE_DIR);
  const syncModules = syncData.modules || {};

  const localFolders = new Set(modules.map((m) => m.folderName));
  const claimedModuleIds = new Set();

  let newModules = 0;
  let deletedModules = 0;
  let newItems = 0;
  let modifiedItems = 0;
  let unchangedItems = 0;

  console.log('[diff] Comparing local files against last sync state\n');

  // Check local modules
  for (const mod of modules) {
    const found = findSyncEntry(syncData, mod.folderName);
    const syncMod = found && found[1];
    if (found) claimedModuleIds.add(found[0]);

    if (!syncMod) {
      console.log(`  + NEW module: ${mod.folderName}`);
      newModules++;
      const flatItems = flattenItems(mod.items);
      for (const item of flatItems) {
        if (item.type === 'subheader') continue;
        console.log(`    + NEW   ${item.relativePath}`);
        newItems++;
      }
      continue;
    }

    const flatItems = flattenItems(mod.items);
    const syncItems = (syncMod && syncMod.items) || {};
    let moduleHasChanges = false;

    for (const item of flatItems) {
      if (item.type === 'subheader') continue;

      const canvasId = item.frontmatter && item.frontmatter.canvas_id;
      if (!canvasId) {
        if (!moduleHasChanges) {
          console.log(`  ~ module: ${mod.folderName}`);
          moduleHasChanges = true;
        }
        console.log(`    + NEW   ${item.relativePath}`);
        newItems++;
        continue;
      }

      // Check if file was modified since last sync
      if (syncData.last_sync) {
        const filePath = path.join(COURSE_DIR, item.relativePath);
        if (fs.existsSync(filePath)) {
          const mtime = fs.statSync(filePath).mtime;
          if (mtime > new Date(syncData.last_sync)) {
            if (!moduleHasChanges) {
              console.log(`  ~ module: ${mod.folderName}`);
              moduleHasChanges = true;
            }
            console.log(`    ~ MOD   ${item.relativePath}`);
            modifiedItems++;
            continue;
          }
        }
      }

      unchangedItems++;
    }

    // Check for items in sync state but not on disk (deleted locally).
    // Entries are keyed by Canvas identity; an item still counts as present
    // when a local file claims its canvas_id, even after a rename.
    const claimedIds = new Set();
    for (const item of flatItems) {
      if (item.type === 'subheader' || !item.frontmatter) continue;
      if (item.frontmatter.canvas_id != null) {
        claimedIds.add(`${item.canvasType}:${item.frontmatter.canvas_id}`);
        if (item.canvasType === 'page')
          claimedIds.add(`page_url:${item.frontmatter.canvas_id}`);
      }
      if (item.canvasType === 'external_url' && item.frontmatter.external_url) {
        claimedIds.add(`external_url:${item.frontmatter.external_url}`);
      }
    }
    for (const entry of Object.values(syncItems)) {
      const claimed =
        (entry.canvas_id != null &&
          claimedIds.has(`${entry.canvas_type}:${entry.canvas_id}`)) ||
        (entry.canvas_type === 'page' &&
          entry.page_url != null &&
          claimedIds.has(`page_url:${entry.page_url}`)) ||
        (entry.canvas_type === 'external_url' &&
          entry.external_url &&
          claimedIds.has(`external_url:${entry.external_url}`)) ||
        (entry.canvas_type === 'file' &&
          entry.path &&
          fs.existsSync(path.join(COURSE_DIR, entry.path)));
      if (!claimed) {
        if (!moduleHasChanges) {
          console.log(`  ~ module: ${mod.folderName}`);
          moduleHasChanges = true;
        }
        console.log(`    - DEL   ${entry.path}`);
      }
    }
  }

  // Modules in sync but not local (deleted)
  for (const [idKey, entry] of Object.entries(syncModules)) {
    if (claimedModuleIds.has(idKey)) continue;
    if (entry.folder && localFolders.has(entry.folder)) continue;
    console.log(`  - DEL module: ${entry.folder || idKey}`);
    deletedModules++;
  }

  // Summary
  console.log('\n[diff] Summary:');
  console.log(`  New modules:      ${newModules}`);
  console.log(`  Deleted modules:  ${deletedModules}`);
  console.log(`  New items:        ${newItems}`);
  console.log(`  Modified items:   ${modifiedItems}`);
  console.log(`  Unchanged items:  ${unchangedItems}`);

  if (
    newModules === 0 &&
    deletedModules === 0 &&
    newItems === 0 &&
    modifiedItems === 0
  ) {
    console.log('\n  No changes detected since last sync.');
  }
}

module.exports = diff;
