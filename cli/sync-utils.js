const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT } = require('./project-root');
const { listPages } = require('../lib/canvas/pages');

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
 * Map every page slug in a Canvas course to its numeric page id.
 *
 * A module item names a page by its slug (`page_url`) and never by its id,
 * while everything local — frontmatter `canvas_id`, sync state — holds the
 * numeric id, because that is the half of the pair a rename does not change.
 * The course's page list is the only place the two meet, so both commands that
 * have to recognise a page across that gap build this map first: pull to spot a
 * renamed page, push to tell an item it made from one it did not.
 *
 * One request answers it for a whole run. Failure is the caller's to handle —
 * a pull without the map only loses its rename detection, while a push without
 * it cannot tell which items are its own.
 *
 * @param {string|number} courseId
 * @param {Function} [fetchPages] - Injection point for tests.
 * @returns {Promise<Map<string, number>>}
 */
async function buildPageUrlToPageId(courseId, fetchPages = listPages) {
  const map = new Map();
  for (const page of (await fetchPages(courseId)) || []) {
    if (page.url && page.page_id) map.set(page.url, page.page_id);
  }
  return map;
}

/**
 * A Canvas base URL as both `.env` and the sync file should hold it: no trailing
 * slash, no `/api/v1` suffix. `init` writes it in this shape and the HTTP client
 * strips trailing slashes, so the two can differ by punctuation alone.
 */
function normaliseBaseUrl(url) {
  if (!url) return '';
  return String(url)
    .replace(/\/+$/, '')
    .replace(/\/api\/v1$/, '')
    .replace(/\/+$/, '');
}

/**
 * Refuse a sync state that describes a different Canvas course than `.env`
 * names, stamping the environment's identity on one that claims none.
 *
 * The ids in this file are only meaningful against the course they came from,
 * and one of them is not even scoped to a course: Canvas file ids are global, so
 * `DELETE /api/v1/files/:id` reaches a file in whichever course owns it. A sync
 * state left over from another course therefore lets `push --prune` — or a
 * renamed binary in `_files/`, which deletes the Canvas file it replaces — reach
 * into a course this run was never pointed at. Every other delete is scoped to
 * `/courses/:id/`, so it would 404 and push would recreate the content instead,
 * duplicating the whole course rather than damaging another one. Neither is
 * something to do quietly.
 *
 * A file that claims nothing is not a mismatch. Sync state written while
 * `CANVAS_COURSE_ID` was unset holds `course_id: 0`, and nothing later filled it
 * in, so the claim is taken from the environment here instead: the value is
 * written back the next time the caller saves, and from then on the file is
 * protected like any other. An environment that names nothing cannot contradict
 * anything either — the commands that need a course id have their own error for
 * that, and `export` needs neither.
 *
 * @param {object} syncData - Loaded sync state; annotated in place.
 * @param {object} [env]    - Injection point for tests.
 * @throws {Error} When the file and the environment name different courses.
 */
function assertSyncMatchesEnv(syncData, env = process.env) {
  if (!syncData) return syncData;

  const envCourse = env.CANVAS_COURSE_ID ? String(env.CANVAS_COURSE_ID) : '';
  const envUrl = normaliseBaseUrl(env.CANVAS_API_URL);
  const fileCourse =
    syncData.course_id != null && Number(syncData.course_id) !== 0
      ? String(syncData.course_id)
      : '';
  const fileUrl = normaliseBaseUrl(syncData.canvas_base_url);

  const differences = [];
  if (envCourse && fileCourse && envCourse !== fileCourse) {
    differences.push(
      `course ${fileCourse} (\`.env\` names course ${envCourse})`,
    );
  }
  if (envUrl && fileUrl && envUrl !== fileUrl) {
    differences.push(`${fileUrl} (\`.env\` names ${envUrl})`);
  }

  if (differences.length > 0) {
    throw new Error(
      `${SYNC_FILE} describes ${differences.join(', and ')}.\n` +
        'The Canvas ids in that file mean nothing in another course, and one ' +
        'kind of id is not scoped to a course at all: a file id is global, so ' +
        'a prune or a renamed binary in `_files/` would delete a file ' +
        'belonging to the course the sync state came from.\n' +
        'Either point `.env` back at the course this project has been pushing ' +
        'to, or, if you meant to switch, run `npx course reset-sync-state` ' +
        'first — after which push creates everything fresh on the new course, ' +
        'so make sure that course does not already hold a copy.',
    );
  }

  // Adopt what the file does not claim, so the next save records it.
  if (!fileCourse && envCourse) syncData.course_id = Number(envCourse);
  if (!fileUrl && envUrl) syncData.canvas_base_url = envUrl;

  return syncData;
}

/**
 * Load the sync state file. Returns the parsed object, or a default empty
 * structure when the file is missing or corrupt.  Pass `{ allowNull: true }`
 * to return null instead of the default (used by status to detect first run).
 * A file written by an older schema is refused rather than guessed at:
 * misreading it would push duplicates to Canvas. So is one that describes a
 * different Canvas course than `.env` names — see `assertSyncMatchesEnv` —
 * except for `{ skipEnvCheck: true }`, which `init` passes because it is the
 * command that repairs exactly that.
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
      if (options && options.skipEnvCheck) return data;
      return assertSyncMatchesEnv(data);
    }
  }

  if (options && options.allowNull) return null;

  // A fresh structure takes its identity from the environment, so it agrees
  // with it by construction.
  return {
    schema_version: SCHEMA_VERSION,
    canvas_base_url: normaliseBaseUrl(process.env.CANVAS_API_URL),
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
  assertSyncMatchesEnv,
  buildPageUrlToPageId,
  loadSyncFile,
  normaliseBaseUrl,
  saveSyncFile,
  itemKey,
  ensureModuleEntry,
  findModuleEntryByFolder,
  removeItemFromOtherModules,
};
