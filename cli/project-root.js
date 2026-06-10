const fs = require('fs');
const path = require('path');

/**
 * Find the project root by walking up from a starting directory until a
 * package.json is found. Falls back to the starting directory when no
 * package.json exists anywhere up the tree.
 *
 * All CLI paths (course/, .canvas-sync.json, .env) are resolved from this
 * root so commands work no matter which subdirectory they are run from.
 *
 * @param {string} [startDir] - Directory to start from (default: process.cwd()).
 * @returns {string} Absolute path of the project root.
 */
function findProjectRoot(startDir) {
  let dir = path.resolve(startDir || process.cwd());

  while (true) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return path.resolve(startDir || process.cwd());
    }
    dir = parent;
  }
}

const PROJECT_ROOT = findProjectRoot();

module.exports = { findProjectRoot, PROJECT_ROOT };
