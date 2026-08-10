const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT } = require('./project-root');

const SYNC_FILE = path.join(PROJECT_ROOT, '.canvas-sync.json');

/**
 * Schema v3: items are keyed by their stable Canvas identity instead of
 * their local relative path, so local renames and renumbering can never
 * orphan a sync entry (the identity travels with the file's frontmatter).
 *
 * {
 *   "schema_version": 3,
 *   "modules": {
 *     "<canvas_module_id>": {
 *       "folder": "01-introduction",
 *       "items": {
 *         "page:123":           { "path": "01-introduction/01-welcome.md",
 *                                 "canvas_id": 123, "canvas_type": "page",
 *                                 "page_url": "welcome" },
 *         "external_url:<url>": { "path": "...", "canvas_id": 456,
 *                                 "canvas_type": "external_url",
 *                                 "external_url": "<url>" }
 *       }
 *     }
 *   },
 *   "files": { "<relative path>": { "canvas_file_id": 1, "canvas_url": "...", "sha256": "..." } }
 * }
 */

/**
 * Compute the sync-state key for an item from its Canvas identity.
 * External URLs key on the URL itself because their Canvas module-item id
 * changes on every push; everything else keys on canvas_type + canvas_id.
 */
function itemKey(canvasType, { canvasId, externalUrl } = {}) {
  if (canvasType === 'external_url' && externalUrl) {
    return `external_url:${externalUrl}`;
  }
  return `${canvasType}:${canvasId}`;
}

/**
 * Migrate a v2 sync structure (modules keyed by folder, items keyed by
 * relative path) to v3. Module entries without a canvas_module_id are
 * dropped — they carry no Canvas state and push re-derives them from
 * frontmatter.
 */
function migrateV2toV3(data) {
  const migrated = {
    ...data,
    schema_version: 3,
    modules: {},
  };

  for (const [folder, modData] of Object.entries(data.modules || {})) {
    const moduleId = modData.canvas_module_id;
    if (!moduleId) continue;

    const items = {};
    for (const [relPath, itemData] of Object.entries(modData.items || {})) {
      if (itemData.canvas_id == null) continue;
      const key = itemKey(itemData.canvas_type, {
        canvasId: itemData.canvas_id,
        externalUrl: itemData.external_url,
      });
      items[key] = { path: relPath, ...itemData };
    }

    migrated.modules[String(moduleId)] = { folder, items };
  }

  return migrated;
}

/**
 * Load the sync state file. Returns the parsed object, or a default empty
 * structure when the file is missing or corrupt.  Pass `{ allowNull: true }`
 * to return null instead of the default (used by status to detect first run).
 * Older v2 files are migrated to v3 in memory; the migrated form is written
 * out the next time the caller saves.
 */
function loadSyncFile(options) {
  if (fs.existsSync(SYNC_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(SYNC_FILE, 'utf8'));
      if ((data.schema_version || 0) < 3) {
        return migrateV2toV3(data);
      }
      return data;
    } catch {
      // Fall through
    }
  }

  if (options && options.allowNull) return null;

  return {
    schema_version: 3,
    canvas_base_url: process.env.CANVAS_API_URL || '',
    course_id: Number(process.env.CANVAS_COURSE_ID) || 0,
    modules: {},
    last_sync: null,
  };
}

/**
 * Write the sync state file atomically (write to .tmp, then rename).
 */
function saveSyncFile(syncData) {
  const tmpFile = SYNC_FILE + '.tmp';
  fs.writeFileSync(tmpFile, JSON.stringify(syncData, null, 2) + '\n', 'utf8');
  fs.renameSync(tmpFile, SYNC_FILE);
}

/**
 * Get (or create) the module entry for a Canvas module id, updating the
 * stored folder name to the current local folder.
 */
function ensureModuleEntry(syncData, canvasModuleId, folder) {
  if (!syncData.modules) syncData.modules = {};
  const key = String(canvasModuleId);
  if (!syncData.modules[key]) {
    syncData.modules[key] = { folder, items: {} };
  } else {
    syncData.modules[key].folder = folder;
    if (!syncData.modules[key].items) syncData.modules[key].items = {};
  }
  return syncData.modules[key];
}

/**
 * Find a module entry by its locally stored folder name.
 * Returns [moduleIdKey, entry] or null. Used to re-associate folders that
 * have no canvas_module_id in their _category_.json yet (migrated states).
 */
function findModuleEntryByFolder(syncData, folder) {
  for (const [id, entry] of Object.entries(syncData.modules || {})) {
    if (entry.folder === folder) return [id, entry];
  }
  return null;
}

/**
 * Remove an item key from every module entry except the given one.
 * Keeps the state consistent when an item moves between modules.
 */
function removeItemFromOtherModules(syncData, key, currentModuleId) {
  const current = String(currentModuleId);
  for (const [id, entry] of Object.entries(syncData.modules || {})) {
    if (id === current) continue;
    if (entry.items && entry.items[key]) {
      delete entry.items[key];
    }
  }
}

module.exports = {
  SYNC_FILE,
  loadSyncFile,
  saveSyncFile,
  itemKey,
  migrateV2toV3,
  ensureModuleEntry,
  findModuleEntryByFolder,
  removeItemFromOtherModules,
};
