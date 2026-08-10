const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT } = require('../../cli/project-root');

const SHIPPED_DIR = path.join(PROJECT_ROOT, 'templates', 'export');
const USER_DIR = path.join(PROJECT_ROOT, 'sources', 'export-style');

/**
 * Resolve one style asset by precedence: explicit override > user override in
 * sources/export-style/ > shipped default in templates/export/.
 *
 * @param {string} filename - e.g. 'template.typ'.
 * @param {string} [override] - Explicit path from a CLI flag.
 * @returns {string} Absolute path to the asset to use.
 */
function resolveAsset(filename, override) {
  if (override) return path.resolve(process.cwd(), override);
  const userPath = path.join(USER_DIR, filename);
  if (fs.existsSync(userPath)) return userPath;
  return path.join(SHIPPED_DIR, filename);
}

/**
 * Resolve an optional style asset by the same precedence, returning null when
 * neither the user nor the shipped copy exists.
 *
 * @param {string} filename - e.g. 'logo.png' or 'fonts'.
 * @returns {string|null} Absolute path, or null when absent.
 */
function resolveOptionalAsset(filename) {
  const userPath = path.join(USER_DIR, filename);
  if (fs.existsSync(userPath)) return userPath;
  const shippedPath = path.join(SHIPPED_DIR, filename);
  if (fs.existsSync(shippedPath)) return shippedPath;
  return null;
}

/**
 * Resolve the full set of style assets for an export.
 *
 * @param {object} [flags]
 * @param {string} [flags.template] - Override for template.typ.
 * @param {string} [flags.referenceDoc] - Override for reference.docx.
 * @returns {{ template: string, referenceDoc: string, filter: string, defaultsFile: string, sample: string, logo: string|null, fontsDir: string|null }}
 */
function resolveStyle(flags = {}) {
  return {
    template: resolveAsset('template.typ', flags.template),
    referenceDoc: resolveAsset('reference.docx', flags.referenceDoc),
    filter: resolveAsset('filter.lua', flags.filter),
    defaultsFile: resolveAsset('defaults.yml', flags.defaults),
    sample: resolveAsset('sample.md', flags.sample),
    // Cover logo and Typst font directory are optional: exports degrade
    // gracefully (no logo on the cover, fallback fonts) when they are absent.
    logo: resolveOptionalAsset('logo.png'),
    fontsDir: resolveOptionalAsset('fonts'),
  };
}

module.exports = { resolveStyle, resolveAsset, resolveOptionalAsset, SHIPPED_DIR, USER_DIR };
