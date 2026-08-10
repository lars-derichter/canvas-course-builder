const fs = require('fs');
const path = require('path');
const {
  COURSE_DIR,
  prompt,
  getExistingModules,
  createRL,
  printModules,
  readModuleCanvasId,
} = require('./module-utils');
const { renumberSequential } = require('./renumber');
const {
  loadSyncFile,
  saveSyncFile,
  findModuleEntryByFolder,
} = require('./sync-utils');

/**
 * Get module entries in the format expected by renumberSequential.
 */
function getModuleEntries(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const modules = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const match = entry.name.match(/^(\d+)/);
    if (match) {
      modules.push({
        prefix: parseInt(match[1], 10),
        name: entry.name,
        isDirectory: true,
      });
    }
  }

  modules.sort((a, b) => a.prefix - b.prefix);
  return modules;
}

async function deleteModule(options = {}) {
  let sourceModule;

  if (options.module) {
    // Non-interactive mode (VS Code): requires --yes since there is no prompt
    if (!options.yes) {
      console.error(
        '[delete-module] Error: --module requires --yes to confirm deletion.',
      );
      process.exit(1);
    }
    const modules = getExistingModules();
    sourceModule = modules.find((m) => m.folderName === options.module);
    if (!sourceModule) {
      console.error(
        `[delete-module] Error: Module not found: ${options.module}`,
      );
      process.exit(1);
    }
  } else {
    const rl = createRL();

    console.log('[delete-module] Delete a course module\n');

    const modules = getExistingModules();

    if (modules.length === 0) {
      rl.close();
      console.log('[delete-module] No modules found.');
      return;
    }

    printModules(modules);

    const sourceStr = await prompt(rl, 'Module to delete (number)');
    const sourcePrefix = parseInt(sourceStr, 10);
    sourceModule = modules.find((m) => m.prefix === sourcePrefix);

    if (!sourceModule) {
      rl.close();
      console.error(
        `[delete-module] Error: No module found with number ${sourceStr}.`,
      );
      process.exit(1);
    }

    const confirm = await prompt(
      rl,
      `Delete ${sourceModule.folderName} and all its contents? (y/N)`,
      'N',
    );
    rl.close();

    if (confirm.toLowerCase() !== 'y') {
      console.log('[delete-module] Cancelled.');
      return;
    }
  }

  // Capture the module's Canvas identity before deleting the folder
  const folderPath = path.join(COURSE_DIR, sourceModule.folderName);
  const canvasModuleId = readModuleCanvasId(folderPath);

  // Delete the folder
  fs.rmSync(folderPath, { recursive: true });
  console.log(`[delete-module] Deleted ${sourceModule.folderName}/`);

  // Remove from sync state (modules are keyed by canvas_module_id; the
  // remaining modules keep their identity through renumbering because the
  // id lives in their _category_.json)
  const syncData = loadSyncFile({ allowNull: true });
  if (syncData && syncData.modules) {
    const idKey =
      canvasModuleId != null
        ? String(canvasModuleId)
        : (findModuleEntryByFolder(syncData, sourceModule.folderName) || [])[0];
    if (idKey && syncData.modules[idKey]) {
      delete syncData.modules[idKey];
    }
    // Drop tracking for embedded files that lived inside the module
    if (syncData.files) {
      for (const filePath of Object.keys(syncData.files)) {
        if (filePath.startsWith(sourceModule.folderName + '/')) {
          delete syncData.files[filePath];
        }
      }
    }
  }

  // Renumber remaining modules sequentially to close the gap
  const renames = renumberSequential(COURSE_DIR, getModuleEntries);

  if (renames.length > 0) {
    console.log('[delete-module] Renumbered remaining modules:');
    for (const r of renames) {
      console.log(`  ${r.from} -> ${r.to}`);
    }
    // Update stored folder names and file-tracking keys for renamed folders
    if (syncData) {
      for (const { from, to } of renames) {
        if (syncData.modules) {
          for (const entry of Object.values(syncData.modules)) {
            if (entry.folder === from) entry.folder = to;
          }
          for (const entry of Object.values(syncData.modules)) {
            for (const item of Object.values(entry.items || {})) {
              if (item.path && item.path.startsWith(from + '/')) {
                item.path = to + item.path.slice(from.length);
              }
            }
          }
        }
        if (syncData.files) {
          for (const filePath of Object.keys(syncData.files)) {
            if (filePath.startsWith(from + '/')) {
              syncData.files[to + filePath.slice(from.length)] =
                syncData.files[filePath];
              delete syncData.files[filePath];
            }
          }
        }
      }
    }
  }

  if (syncData) {
    saveSyncFile(syncData);
    console.log('[delete-module] Sync state updated.');
  }
}

module.exports = deleteModule;
