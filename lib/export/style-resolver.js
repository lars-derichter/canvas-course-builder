const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT } = require('../../cli/project-root');
const {
  loadCourseConfig,
  DEFAULT_EXPORT_STYLE,
} = require('../config/course-config');

/** Root of the shipped export styles: shared pipeline files at the top, one
 *  subfolder per style. */
const STYLES_DIR = path.join(PROJECT_ROOT, 'export-styles');

/** Per-file overrides live here and win over the selected style. Protected
 *  during upstream updates. */
const USER_DIR = path.join(PROJECT_ROOT, 'sources', 'export-style');

/** Files that drive the pandoc pipeline itself rather than the look, so every
 *  style shares one copy. */
const SHARED_ASSETS = ['filter.lua', 'defaults.yml', 'sample.md'];

/**
 * Turn an `export.style` value into a directory.
 *
 * A bare name (`generic`) selects a built-in under export-styles/. Anything
 * containing a separator is a path relative to the project root, which is how
 * you point at a style you keep in sources/.
 */
function resolveStyleDir(name, root = PROJECT_ROOT) {
  if (name.includes('/') || name.includes(path.sep)) {
    return path.resolve(root, name);
  }
  return path.join(STYLES_DIR, name);
}

/**
 * Resolve one style asset by precedence: explicit override > user override in
 * sources/export-style/ > the selected style (or, for shared pipeline files,
 * the root of export-styles/).
 *
 * @param {string} filename - e.g. 'template.typ'.
 * @param {string} [override] - Explicit path from a CLI flag.
 * @param {string} [styleDir] - The selected style's directory.
 * @returns {string} Absolute path to the asset to use.
 */
function resolveAsset(
  filename,
  override,
  styleDir = resolveStyleDir(DEFAULT_EXPORT_STYLE),
) {
  if (override) return path.resolve(process.cwd(), override);
  const userPath = path.join(USER_DIR, filename);
  if (fs.existsSync(userPath)) return userPath;
  const base = SHARED_ASSETS.includes(filename) ? STYLES_DIR : styleDir;
  return path.join(base, filename);
}

/**
 * Resolve an optional style asset by the same precedence, returning null when
 * neither the user nor the style's copy exists.
 *
 * @param {string} filename - e.g. 'logo.png' or 'fonts'.
 * @param {string} styleDir - The selected style's directory.
 * @returns {string|null} Absolute path, or null when absent.
 */
function resolveOptionalAsset(filename, styleDir) {
  const userPath = path.join(USER_DIR, filename);
  if (fs.existsSync(userPath)) return userPath;
  const stylePath = path.join(styleDir, filename);
  if (fs.existsSync(stylePath)) return stylePath;
  return null;
}

/** Fail with a path the user can act on rather than handing pandoc a file that
 *  is not there and letting it complain about a temp directory. */
function requireAsset(filePath, filename, styleName) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Export style "${styleName}" has no ${filename} (looked in ` +
        `${path.relative(PROJECT_ROOT, filePath)}). Add the file, pick another ` +
        `style with --style, or override it in sources/export-style/.`,
    );
  }
  return filePath;
}

/**
 * Resolve the full set of style assets for an export.
 *
 * @param {object} [flags]
 * @param {string} [flags.style] - Style name or path, overriding course.config.yml.
 * @param {string} [flags.template] - Override for template.typ.
 * @param {string} [flags.referenceDoc] - Override for reference.docx.
 * @returns {{ name: string, dir: string, template: string, referenceDoc: string,
 *   filter: string, defaultsFile: string, sample: string, logo: string|null,
 *   fontsDir: string|null }}
 */
function resolveStyle(flags = {}) {
  const name = flags.style || loadCourseConfig().export.style;
  const dir = resolveStyleDir(name);
  if (!fs.existsSync(dir)) {
    throw new Error(
      `Unknown export style "${name}": ${path.relative(PROJECT_ROOT, dir)} does not exist. ` +
        `Built-in styles live in export-styles/.`,
    );
  }

  const template = resolveAsset('template.typ', flags.template, dir);
  const referenceDoc = resolveAsset('reference.docx', flags.referenceDoc, dir);

  return {
    name,
    dir,
    template: requireAsset(template, 'template.typ', name),
    referenceDoc: requireAsset(referenceDoc, 'reference.docx', name),
    filter: resolveAsset('filter.lua', flags.filter, dir),
    defaultsFile: resolveAsset('defaults.yml', flags.defaults, dir),
    sample: resolveAsset('sample.md', flags.sample, dir),
    // Cover logo and Typst font directory are optional: exports degrade
    // gracefully (no logo on the cover, fallback fonts) when they are absent.
    logo: resolveOptionalAsset('logo.png', dir),
    fontsDir: resolveOptionalAsset('fonts', dir),
  };
}

module.exports = {
  resolveStyle,
  resolveAsset,
  resolveOptionalAsset,
  resolveStyleDir,
  SHARED_ASSETS,
  STYLES_DIR,
  USER_DIR,
};
