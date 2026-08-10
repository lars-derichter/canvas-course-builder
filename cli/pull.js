const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { listModules, listModuleItems } = require('../lib/canvas/modules');
const { listPages, getPage } = require('../lib/canvas/pages');
const { getAssignment } = require('../lib/canvas/assignments');
const { get } = require('../lib/canvas/client');
const { canvasItemToMarkdown } = require('../lib/convert/html-to-markdown');
const { buildLinkMap, resolveCanvasLink, buildFileMap } = require('../lib/convert/link-resolver');
const { downloadFile } = require('../lib/canvas/files');
const { SYNC_FILE, loadSyncFile, saveSyncFile, itemKey, ensureModuleEntry, removeItemFromOtherModules } = require('./sync-utils');
const { COURSE_DIR, safeReadJSON } = require('./module-utils');
const { toFolderName, toFileName, toFileSlug, computeRelativePath } = require('./naming');
const log = require('./logger');
const { loadCourseConfig } = require('../lib/config/course-config');

async function pull(options) {
  const courseId = process.env.CANVAS_COURSE_ID;
  if (!courseId) {
    log.error('[pull] Error: CANVAS_COURSE_ID is not set. Run "npx course init" first.');
    process.exit(1);
  }

  const force = options && options.force;
  const syncData = loadSyncFile();

  log.info(`[pull] Fetching modules for course ${courseId}...`);
  const modules = await listModules(courseId);

  if (!modules || modules.length === 0) {
    log.info('[pull] No modules found in Canvas course.');
    return;
  }

  log.info(`[pull] Found ${modules.length} module(s).\n`);

  // Initialize file tracking
  if (!syncData.files) syncData.files = {};

  // Build reverse link map for resolving Canvas internal links back to relative paths
  const { canvasToRelative } = buildLinkMap(syncData);

  // Build reverse file map for resolving Canvas file URLs back to local paths
  const { canvasToLocal } = buildFileMap(syncData);

  // Fetch all pages to resolve page_url -> page_id for rename detection.
  // Canvas module items for Pages only include page_url (slug), not the numeric
  // page_id. When a page is renamed, the slug changes but the page_id (stored
  // as canvas_id in sync state) stays stable. This map lets us match renamed pages.
  const pageUrlToPageId = new Map();
  try {
    const allPages = await listPages(courseId);
    for (const p of allPages) {
      if (p.url && p.page_id) pageUrlToPageId.set(p.url, p.page_id);
    }
  } catch (err) {
    log.warn(`[pull] Could not fetch pages for rename detection: ${err.message}`);
  }

  // Ensure course directory exists
  if (!fs.existsSync(COURSE_DIR)) {
    fs.mkdirSync(COURSE_DIR, { recursive: true });
  }

  const errors = [];
  const totalModules = modules.length;

  for (let mi = 0; mi < modules.length; mi++) {
    const mod = modules[mi];
    log.info(`[pull] Module ${mi + 1}/${totalModules}: ${mod.name}`);
    try {
      await pullModule(courseId, mod, syncData, force, canvasToRelative, canvasToLocal, pageUrlToPageId);
    } catch (err) {
      log.error(`[pull] Error pulling module "${mod.name}": ${err.message}`);
      errors.push({ module: mod.name, error: err.message });
    }
    // Save sync state after each module so progress is preserved on failure
    saveSyncFile(syncData);
  }

  // Update last_sync
  syncData.last_sync = new Date().toISOString();
  saveSyncFile(syncData);

  log.info(`\n[pull] Sync file updated: ${SYNC_FILE}`);

  if (errors.length > 0) {
    log.info(`\n[pull] Completed with ${errors.length} error(s):`);
    for (const e of errors) {
      log.info(`  - ${e.module}: ${e.error}`);
    }
  } else {
    log.info('[pull] Done.');
  }
}

/**
 * Write a folder's _category_.json with the Canvas-derived label/position and
 * module id, preserving any other fields (collapsed, className, custom
 * customProps, ...) the user added locally.
 */
function writeCategoryFile(folderDir, label, position, canvasModuleId) {
  const catFile = path.join(folderDir, '_category_.json');
  const existing = safeReadJSON(catFile, {});
  const merged = { ...existing, label, position };
  if (canvasModuleId != null) {
    merged.customProps = { ...(merged.customProps || {}), canvas_module_id: canvasModuleId };
  }
  fs.writeFileSync(catFile, JSON.stringify(merged, null, 2) + '\n', 'utf8');
}

async function pullModule(courseId, mod, syncData, force, canvasToRelative, canvasToLocal, pageUrlToPageId) {
  const position = mod.position || 0;
  const folderName = toFolderName(mod.name, position);
  const moduleDir = path.join(COURSE_DIR, folderName);

  log.info(`[pull] Module: ${mod.name} -> ${folderName}/`);

  // The module is keyed by its Canvas id, so a rename/move on Canvas just
  // means the stored folder name no longer matches the derived one.
  const moduleIdKey = String(mod.id);
  const existingEntry = syncData.modules && syncData.modules[moduleIdKey];
  if (existingEntry && existingEntry.folder && existingEntry.folder !== folderName) {
    const oldFolder = existingEntry.folder;
    const oldDir = path.join(COURSE_DIR, oldFolder);
    if (fs.existsSync(oldDir) && !fs.existsSync(moduleDir)) {
      log.verbose(`Module folder renamed: ${oldFolder}/ -> ${folderName}/`);
      fs.renameSync(oldDir, moduleDir);
    }

    // Update item paths within the entry
    const oldPrefix = oldFolder + '/';
    for (const entry of Object.values(existingEntry.items || {})) {
      if (entry.path && entry.path.startsWith(oldPrefix)) {
        entry.path = folderName + '/' + entry.path.slice(oldPrefix.length);
      }
    }

    // Update file tracking keys
    if (syncData.files) {
      for (const [filePath, fileData] of Object.entries(syncData.files)) {
        if (filePath.startsWith(oldPrefix)) {
          const newFilePath = folderName + filePath.slice(oldFolder.length);
          syncData.files[newFilePath] = fileData;
          delete syncData.files[filePath];
        }
      }
    }
  }

  if (!fs.existsSync(moduleDir)) {
    fs.mkdirSync(moduleDir, { recursive: true });
  }

  // Track module in sync data
  const moduleEntry = ensureModuleEntry(syncData, mod.id, folderName);

  // Write _category_.json for the module folder (preserving custom fields)
  writeCategoryFile(moduleDir, mod.name, position, mod.id);

  // Fetch module items
  const items = await listModuleItems(courseId, mod.id);
  if (!items || items.length === 0) {
    log.info('  [pull] No items in this module.');
    return;
  }

  const totalItems = items.length;

  // ---- Phase 1: Compute target state ----
  // Walk items to determine what filenames/folders each item should have,
  // without writing anything yet.
  const planned = [];
  let modulePosition = 0;
  let subfolderPosition = 0;
  let currentSubfolderName = null;

  for (let ii = 0; ii < items.length; ii++) {
    const item = items[ii];

    if (item.type === 'SubHeader') {
      modulePosition++;
      subfolderPosition = 0;
      currentSubfolderName = toFolderName(item.title, modulePosition);
      planned.push({
        kind: 'subfolder',
        item,
        targetFolderName: currentSubfolderName,
        position: modulePosition,
        index: ii,
      });
      continue;
    }

    let pos, targetDir, subfolderName;
    if (item.indent > 0 && currentSubfolderName) {
      subfolderPosition++;
      pos = subfolderPosition;
      targetDir = path.join(moduleDir, currentSubfolderName);
      subfolderName = currentSubfolderName;
    } else {
      currentSubfolderName = null;
      modulePosition++;
      pos = modulePosition;
      targetDir = moduleDir;
      subfolderName = null;
    }

    const targetFileName = toFileName(item.title || loadCourseConfig().labels.pull.untitled, pos);

    planned.push({
      kind: 'content',
      item,
      canvasItemType: item.type,
      targetFileName,
      targetDir,
      position: pos,
      subfolderName,
      index: ii,
    });
  }

  // Augment Page items with resolved page_id so reconciliation can match
  // renamed pages by canvas_id (page_url changes on rename, page_id doesn't)
  for (const p of planned) {
    if (p.item && p.item.type === 'Page' && p.item.page_url) {
      const pageId = pageUrlToPageId.get(p.item.page_url);
      if (pageId != null) {
        p.item._resolvedPageId = pageId;
      }
    }
  }

  // ---- Phase 2: Rename existing files to match new Canvas positions ----
  const renamed = reconcileExistingFiles(planned, moduleEntry.items, moduleDir, folderName);

  // Rebuild link maps if files were renamed so link resolution uses updated paths
  if (renamed) {
    const { canvasToRelative: newLinkMap } = buildLinkMap(syncData);
    canvasToRelative.clear();
    for (const [k, v] of newLinkMap) canvasToRelative.set(k, v);
  }

  // ---- Phase 3: Write content ----
  for (const p of planned) {
    log.verbose(`Item ${p.index + 1}/${totalItems}: ${p.item.title || p.item.type}`);

    if (p.kind === 'subfolder') {
      const subfolderDir = path.join(moduleDir, p.targetFolderName);
      if (!fs.existsSync(subfolderDir)) {
        fs.mkdirSync(subfolderDir, { recursive: true });
      }
      log.verbose(`SubHeader: ${p.item.title} -> ${p.targetFolderName}/`);
      writeCategoryFile(subfolderDir, p.item.title, p.position, null);
      continue;
    }

    if (p.canvasItemType === 'File') {
      try {
        await pullFileItem(p.item, p.targetDir, p.targetFileName, syncData, force, folderName, moduleEntry, moduleIdKey);
      } catch (err) {
        log.error(`  [pull] Error pulling file "${p.item.title || 'unknown'}": ${err.message}`);
      }
      continue;
    }

    try {
      await pullItem(courseId, p.item, p.targetDir, p.targetFileName, syncData, force, folderName, canvasToRelative, canvasToLocal, moduleEntry, moduleIdKey);
    } catch (err) {
      log.error(`  [pull] Error pulling item "${p.item.title || 'unknown'}": ${err.message}`);
    }
  }
}

/**
 * Find the old sync-state relative path for a Canvas item by matching identifiers.
 */
function findOldSyncPath(item, identifierMap) {
  if (item.page_url) {
    const found = identifierMap.get('page:' + item.page_url);
    if (found) return found;
  }
  if (item.external_url) {
    const found = identifierMap.get('url:' + item.external_url);
    if (found) return found;
  }
  // Match by resolved page_id (stable across renames, unlike page_url)
  if (item._resolvedPageId) {
    const found = identifierMap.get('id:' + item._resolvedPageId);
    if (found) return found;
  }
  if (item.content_id) {
    const found = identifierMap.get('id:' + item.content_id);
    if (found) return found;
  }
  if (item.id) {
    const found = identifierMap.get('id:' + item.id);
    if (found) return found;
  }
  return null;
}

/**
 * Build a reverse lookup map: identifier -> current local relative path.
 */
function buildIdentifierMap(moduleItems) {
  const map = new Map();
  for (const entry of Object.values(moduleItems || {})) {
    if (!entry.path) continue;
    if (entry.page_url) map.set('page:' + entry.page_url, entry.path);
    if (entry.external_url) map.set('url:' + entry.external_url, entry.path);
    if (entry.canvas_id != null) map.set('id:' + entry.canvas_id, entry.path);
  }
  return map;
}

/**
 * Update every item entry whose path starts with a renamed prefix.
 */
function updateEntryPathPrefix(moduleItems, oldPrefix, newPrefix) {
  for (const entry of Object.values(moduleItems || {})) {
    if (entry.path && entry.path.startsWith(oldPrefix)) {
      entry.path = newPrefix + entry.path.slice(oldPrefix.length);
    }
  }
}

/**
 * Recover leftover temp files/folders from a previously failed rename operation.
 */
function cleanupTempFiles(moduleDir, tempPrefix) {
  try {
    for (const entry of fs.readdirSync(moduleDir)) {
      if (!entry.startsWith(tempPrefix)) continue;
      const finalName = entry.slice(tempPrefix.length);
      const tempPath = path.join(moduleDir, entry);
      const finalPath = path.join(moduleDir, finalName);
      if (!fs.existsSync(finalPath)) {
        fs.renameSync(tempPath, finalPath);
        log.verbose(`Recovered temp file: ${entry} -> ${finalName}`);
      } else {
        const stat = fs.statSync(tempPath);
        if (stat.isDirectory()) {
          fs.rmSync(tempPath, { recursive: true });
        } else {
          fs.unlinkSync(tempPath);
        }
        log.verbose(`Removed leftover temp: ${entry}`);
      }
    }
  } catch (err) {
    log.warn(`[pull] Warning: could not clean up temp files in ${moduleDir}: ${err.message}`);
  }
}

/**
 * Detect and execute subfolder renames using a two-pass temp-name approach.
 * Returns true if any renames were performed.
 */
function reconcileSubfolders(planned, identifierMap, moduleDir, folderName, moduleItems, tempPrefix) {
  const renames = [];
  for (const p of planned) {
    if (p.kind !== 'subfolder') continue;

    const children = planned.filter(
      c => c.kind !== 'subfolder' && c.subfolderName === p.targetFolderName
    );
    for (const child of children) {
      const oldRelPath = findOldSyncPath(child.item, identifierMap);
      if (!oldRelPath) continue;

      const relToModule = oldRelPath.slice(folderName.length + 1);
      const slashIdx = relToModule.indexOf('/');
      if (slashIdx > 0) {
        const oldSubName = relToModule.slice(0, slashIdx);
        if (oldSubName !== p.targetFolderName &&
            fs.existsSync(path.join(moduleDir, oldSubName))) {
          renames.push({ oldName: oldSubName, newName: p.targetFolderName });
        }
      }
      break;
    }
  }

  if (renames.length === 0) return false;

  try {
    // Pass 1: rename to temp names
    for (const sr of renames) {
      sr._tempName = tempPrefix + sr.newName;
      fs.renameSync(path.join(moduleDir, sr.oldName), path.join(moduleDir, sr._tempName));
    }
    // Pass 2: rename to final names and update sync state
    for (const sr of renames) {
      fs.renameSync(path.join(moduleDir, sr._tempName), path.join(moduleDir, sr.newName));
      log.verbose(`Renamed subfolder: ${sr.oldName}/ -> ${sr.newName}/`);

      const oldPrefix = folderName + '/' + sr.oldName + '/';
      const newPrefix = folderName + '/' + sr.newName + '/';
      updateEntryPathPrefix(moduleItems, oldPrefix, newPrefix);
      for (const [id, relPath] of identifierMap) {
        if (relPath.startsWith(oldPrefix)) {
          identifierMap.set(id, newPrefix + relPath.slice(oldPrefix.length));
        }
      }
    }
  } catch (err) {
    for (const sr of renames) {
      if (sr._tempName && fs.existsSync(path.join(moduleDir, sr._tempName))) {
        try {
          fs.renameSync(path.join(moduleDir, sr._tempName), path.join(moduleDir, sr.newName));
        } catch { /* Leave temp folder for next run's cleanup */ }
      }
    }
    throw err;
  }

  return true;
}

/**
 * Detect and execute file renames using a two-pass temp-name approach.
 * Returns true if any renames were performed.
 */
function reconcileFileRenames(planned, identifierMap, folderName, moduleItems, tempPrefix) {
  const renames = [];
  for (const p of planned) {
    if (p.kind === 'subfolder') continue;

    const targetRelPath = p.subfolderName
      ? path.posix.join(folderName, p.subfolderName, p.targetFileName)
      : path.posix.join(folderName, p.targetFileName);

    const oldRelPath = findOldSyncPath(p.item, identifierMap);
    if (!oldRelPath || oldRelPath === targetRelPath) continue;

    const oldAbsPath = path.resolve(COURSE_DIR, oldRelPath);
    const newAbsPath = path.resolve(COURSE_DIR, targetRelPath);
    if (!fs.existsSync(oldAbsPath)) continue;

    renames.push({ oldAbsPath, newAbsPath, oldRelPath, newRelPath: targetRelPath });
  }

  if (renames.length === 0) return false;

  try {
    // Pass 1: rename to temp names
    for (const r of renames) {
      const dir = path.dirname(r.newAbsPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      r._tempPath = path.join(dir, tempPrefix + path.basename(r.newAbsPath));
      fs.renameSync(r.oldAbsPath, r._tempPath);
    }
    // Pass 2: rename to final names and update sync state
    for (const r of renames) {
      fs.renameSync(r._tempPath, r.newAbsPath);
      log.verbose(`Renamed: ${path.basename(r.oldRelPath)} -> ${path.basename(r.newRelPath)}`);

      for (const entry of Object.values(moduleItems || {})) {
        if (entry.path === r.oldRelPath) {
          entry.path = r.newRelPath;
        }
      }
    }
  } catch (err) {
    for (const r of renames) {
      if (r._tempPath && fs.existsSync(r._tempPath)) {
        try {
          fs.renameSync(r._tempPath, r.newAbsPath);
        } catch { /* Leave temp file for next run's cleanup */ }
      }
    }
    throw err;
  }

  return true;
}

/**
 * Rename existing local files/folders to match new Canvas positions.
 * Returns true if any renames were performed.
 */
function reconcileExistingFiles(planned, moduleItems, moduleDir, folderName) {
  const identifierMap = buildIdentifierMap(moduleItems);
  const tempPrefix = '__pull_temp_';

  cleanupTempFiles(moduleDir, tempPrefix);
  const subfoldersRenamed = reconcileSubfolders(planned, identifierMap, moduleDir, folderName, moduleItems, tempPrefix);
  const filesRenamed = reconcileFileRenames(planned, identifierMap, folderName, moduleItems, tempPrefix);

  return subfoldersRenamed || filesRenamed;
}

/**
 * Check if a local file has been modified since the last sync.
 * Returns true if the file exists and was modified after last_sync.
 */
function isLocallyModified(filePath, syncData) {
  if (!fs.existsSync(filePath)) return false;
  if (!syncData.last_sync) return false;

  const stat = fs.statSync(filePath);
  const lastSync = new Date(syncData.last_sync);
  return stat.mtime > lastSync;
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

/**
 * Pull a File item from Canvas — download the binary to _files/ and create
 * a markdown wrapper so the item appears in the Docusaurus sidebar.
 */
async function pullFileItem(item, targetDir, targetFileName, syncData, force, folderName, moduleEntry, moduleIdKey) {
  const title = item.title || loadCourseConfig().labels.pull.untitled;
  const contentId = item.content_id;
  if (!contentId) {
    log.info(`  [pull] Skipping file "${title}": no content_id`);
    return;
  }

  const wrapperPath = path.join(targetDir, targetFileName);

  if (!force && isLocallyModified(wrapperPath, syncData)) {
    log.info(`    [pull] SKIPPED ${targetFileName} (locally modified since last sync, use --force to overwrite)`);
    return;
  }

  // Derive the binary filename from the Canvas File's display_name, which
  // carries the real extension. The module item title is only a display label
  // (e.g. "Workflow Diagram") and loses the extension, so fall back to it only
  // when the metadata fetch fails. Slugify so pulled files follow the repo's
  // lowercase-hyphenated naming convention.
  let fileMeta = null;
  try {
    fileMeta = await get(`/api/v1/files/${contentId}`);
  } catch (err) {
    log.warn(`    [pull] Could not fetch file metadata for "${title}": ${err.message}`);
  }
  const displayName = fileMeta && fileMeta.display_name;
  const originalName = toFileSlug(displayName || title);

  const filesDir = path.join(targetDir, '_files');
  const binaryPath = path.join(filesDir, originalName);

  // Never clobber a binary the user edited locally; and skip the download
  // entirely when nothing changed on Canvas since the last sync.
  const binaryExists = fs.existsSync(binaryPath);
  if (binaryExists && !force && isLocallyModified(binaryPath, syncData)) {
    log.info(`    [pull] SKIPPED download of _files/${originalName} (locally modified since last sync, use --force to overwrite)`);
  } else {
    const remoteChanged = !syncData.last_sync
      || !fileMeta || !fileMeta.updated_at
      || new Date(fileMeta.updated_at) > new Date(syncData.last_sync);
    if (!binaryExists || force || remoteChanged) {
      if (!fs.existsSync(filesDir)) {
        fs.mkdirSync(filesDir, { recursive: true });
      }
      log.verbose(`Downloading file: ${title}`);
      await downloadFile(contentId, binaryPath);
      log.verbose(`Wrote _files/${originalName}`);
    } else {
      log.verbose(`Unchanged on Canvas, skipping download: _files/${originalName}`);
    }
  }

  // Create markdown wrapper
  const fileRef = `_files/${originalName}`;
  const frontmatter = [
    '---',
    `title: "${title.replace(/"/g, '\\"')}"`,
    'canvas_type: file',
    `canvas_id: ${contentId}`,
    `file_ref: ${fileRef}`,
    '---',
    '',
  ].join('\n');
  fs.writeFileSync(wrapperPath, frontmatter, 'utf8');
  log.verbose(`Wrote ${targetFileName}`);

  // Update sync state
  const relativePath = computeRelativePath(folderName, wrapperPath, COURSE_DIR);
  const key = itemKey('file', { canvasId: contentId });
  moduleEntry.items[key] = {
    path: relativePath,
    canvas_id: contentId,
    canvas_type: 'file',
  };
  removeItemFromOtherModules(syncData, key, moduleIdKey);
}

/**
 * Strategy definitions for each pullable Canvas item type.
 * Each strategy defines how to extract the identifier, fetch content,
 * get the HTML body, and build the sync state entry.
 */
const pullStrategies = {
  Page: {
    getId: (item) => item.page_url,
    idLabel: 'page_url',
    fetch: (courseId, id) => getPage(courseId, id),
    getBody: (result) => result.body || '',
    canvasType: 'page',
    buildSyncEntry: (item, result) => ({
      canvas_id: result.page_id || result.url,
      canvas_type: 'page',
      page_url: item.page_url,
    }),
  },
  Assignment: {
    getId: (item) => item.content_id,
    idLabel: 'content_id',
    fetch: (courseId, id) => getAssignment(courseId, id),
    getBody: (result) => result.description || '',
    canvasType: 'assignment',
    buildSyncEntry: (item) => ({
      canvas_id: item.content_id,
      canvas_type: 'assignment',
    }),
  },
  ExternalUrl: {
    getId: (item) => item.id,
    idLabel: null, // always present, no precondition check
    fetch: null,   // no API fetch needed
    getBody: null,
    canvasType: 'external_url',
    buildSyncEntry: (item) => ({
      canvas_id: item.id,
      canvas_type: 'external_url',
      external_url: item.external_url,
    }),
  },
};

async function pullItem(courseId, item, moduleDir, targetFileName, syncData, force, folderName, canvasToRelative, canvasToLocal, moduleEntry, moduleIdKey) {
  const title = item.title || loadCourseConfig().labels.pull.untitled;
  const strategy = pullStrategies[item.type];

  if (!strategy) {
    log.warn(`  [pull] Skipping unsupported item type "${item.type}": ${title}`);
    return;
  }

  // Check precondition (e.g. page_url or content_id must be present)
  const itemId = strategy.getId(item);
  if (strategy.idLabel && !itemId) {
    log.info(`  [pull] Skipping ${item.type.toLowerCase()} "${title}": no ${strategy.idLabel}`);
    return;
  }

  const filePath = path.join(moduleDir, targetFileName);

  if (!force && isLocallyModified(filePath, syncData)) {
    log.info(`    [pull] SKIPPED ${targetFileName} (locally modified since last sync, use --force to overwrite)`);
    return;
  }

  const relativePath = computeRelativePath(folderName, filePath, COURSE_DIR);
  let markdown;
  let fetchResult = null;

  if (strategy.fetch) {
    log.verbose(`Fetching ${strategy.canvasType}: ${title}`);
    fetchResult = await strategy.fetch(courseId, itemId);
    const body = strategy.getBody(fetchResult);
    const linkResolver = (href) => resolveCanvasLink(href, relativePath, canvasToRelative);
    await downloadReferencedFiles(courseId, body, folderName, syncData, canvasToLocal);
    const fileResolver = createPullFileResolver(courseId, relativePath, canvasToLocal);
    markdown = canvasItemToMarkdown(fetchResult, strategy.canvasType, { linkResolver, fileResolver });
  } else {
    log.verbose(`Fetching ${strategy.canvasType}: ${title}`);
    markdown = canvasItemToMarkdown(
      { title, external_url: item.external_url, id: item.id },
      strategy.canvasType
    );
  }

  fs.writeFileSync(filePath, markdown, 'utf8');
  log.verbose(`Wrote ${targetFileName}`);

  const entry = strategy.buildSyncEntry(item, fetchResult);
  entry.path = relativePath;
  const key = itemKey(entry.canvas_type, { canvasId: entry.canvas_id, externalUrl: entry.external_url });
  moduleEntry.items[key] = entry;
  removeItemFromOtherModules(syncData, key, moduleIdKey);
}

/**
 * Scan HTML for Canvas file URLs and download any files not already tracked locally.
 * Updates syncData.files and canvasToLocal map as files are downloaded.
 */
async function downloadReferencedFiles(courseId, html, folderName, syncData, canvasToLocal) {
  const filePattern = /\/courses\/\d+\/files\/(\d+)/g;
  const fileIds = new Set();
  let match;
  while ((match = filePattern.exec(html)) !== null) {
    fileIds.add(match[1]);
  }

  // Exclude alert icon file IDs — these are handled by html-to-markdown conversion
  if (syncData.icons) {
    for (const icon of Object.values(syncData.icons)) {
      fileIds.delete(String(icon.canvas_file_id));
    }
  }

  for (const fileId of fileIds) {
    const canvasUrlPattern = `/courses/${courseId}/files/${fileId}/preview`;
    if (canvasToLocal.has(canvasUrlPattern)) {
      const localPath = canvasToLocal.get(canvasUrlPattern);
      if (fs.existsSync(path.resolve(COURSE_DIR, localPath))) continue;
    }

    try {
      const fileMeta = await get(`/api/v1/files/${fileId}`);
      const fileName = fileMeta.display_name || `file-${fileId}`;
      const localRelPath = path.posix.join(folderName, '_files', fileName);
      const destPath = path.resolve(COURSE_DIR, localRelPath);

      log.info(`    [pull] Downloading file: ${fileName}`);
      await downloadFile(fileId, destPath);

      syncData.files[localRelPath] = {
        canvas_file_id: Number(fileId),
        canvas_url: canvasUrlPattern,
        // Record the hash so the next push recognises the file as unchanged.
        sha256: sha256File(destPath),
      };
      canvasToLocal.set(canvasUrlPattern, localRelPath);
    } catch (err) {
      log.error(`    [pull] Error downloading file ${fileId}: ${err.message}`);
    }
  }
}

/**
 * Create a resolver that converts Canvas file URLs to relative paths
 * from the perspective of the given markdown file.
 */
function createPullFileResolver(courseId, currentFilePath, canvasToLocal) {
  return (href) => {
    if (!href) return null;

    let urlPath = href;
    try {
      const url = new URL(href, 'https://placeholder.com');
      urlPath = url.pathname;
    } catch {
      // Already a path
    }

    const fileMatch = urlPath.match(/\/courses\/\d+\/files\/(\d+)/);
    if (!fileMatch) return null;

    const fId = fileMatch[1];
    const pattern = `/courses/${courseId}/files/${fId}/preview`;
    const localPath = canvasToLocal.get(pattern);
    if (!localPath) return null;

    const currentDir = path.posix.dirname(currentFilePath);
    let relative = path.posix.relative(currentDir, localPath);
    if (!relative.startsWith('.') && !relative.startsWith('/')) {
      relative = './' + relative;
    }
    return relative;
  };
}

module.exports = pull;
// Exported for testing
pull._buildIdentifierMap = buildIdentifierMap;
pull._findOldSyncPath = findOldSyncPath;
pull._isLocallyModified = isLocallyModified;
pull._createPullFileResolver = createPullFileResolver;
pull._pullStrategies = pullStrategies;
