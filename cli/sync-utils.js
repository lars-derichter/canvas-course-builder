const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT } = require('./project-root');

const SYNC_FILE = path.join(PROJECT_ROOT, '.canvas-sync.json');
const SCHEMA_VERSION = 3;

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
 * External URLs and external tools key on the URL itself because they exist
 * only as a module item, whose Canvas id changes on every push; everything else
 * keys on canvas_type + canvas_id.
 */
function itemKey(canvasType, { canvasId, externalUrl } = {}) {
  if (
    (canvasType === 'external_url' || canvasType === 'external_tool') &&
    externalUrl
  ) {
    return `${canvasType}:${externalUrl}`;
  }
  return `${canvasType}:${canvasId}`;
}

/**
 * Load the sync state file. Returns the parsed object, or a default empty
 * structure when the file is missing or corrupt.  Pass `{ allowNull: true }`
 * to return null instead of the default (used by status to detect first run).
 * A file written by an older schema is refused rather than guessed at:
 * misreading it would push duplicates to Canvas.
 */
function loadSyncFile(options) {
  if (fs.existsSync(SYNC_FILE)) {
    let data = null;
    try {
      data = JSON.parse(fs.readFileSync(SYNC_FILE, 'utf8'));
    } catch {
      // Corrupt file: fall through to the default structure.
    }
    if (data) {
      if (data.schema_version !== SCHEMA_VERSION) {
        throw new Error(
          `${SYNC_FILE} has schema_version ${JSON.stringify(data.schema_version)}, ` +
            `but this version only reads ${SCHEMA_VERSION}. ` +
            'Run `npx course reset-sync-state` and push again to rebuild it.',
        );
      }
      return data;
    }
  }

  if (options && options.allowNull) return null;

  return {
    schema_version: SCHEMA_VERSION,
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
 * Returns [moduleIdKey, entry] or null. Used to re-associate folders whose
 * _category_.json has no canvas_module_id (deleted or never written).
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
  SCHEMA_VERSION,
  loadSyncFile,
  saveSyncFile,
  itemKey,
  ensureModuleEntry,
  findModuleEntryByFolder,
  removeItemFromOtherModules,
};
