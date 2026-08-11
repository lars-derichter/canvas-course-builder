const { parseFrontmatter } = require('../convert/frontmatter');
const { flattenItems } = require('../convert/course-scanner');
const { LABEL_SETS, DEFAULT_LANGUAGE } = require('../config/labels');

/**
 * Generate a TOC file body from scanned modules. Each module contributes a
 * `## Module` heading (which survives round-tripping) followed by one
 * `- <relativePath>  # Title` line per item. The user then deletes the lines
 * they do not want before running `export --toc`.
 *
 * @param {Array<object>} modules - Modules from scanCourse.
 * @param {object} [opts]
 * @param {boolean} [opts.flagged] - Only include items flagged export: true.
 * @param {string} [opts.title] - Title for the YAML frontmatter. Defaults to the
 *   English course label; cli/export-toc.js passes the configured course title.
 * @param {string} [opts.subtitle] - Subtitle for the YAML frontmatter.
 * @returns {string}
 */
function generateToc(modules, opts = {}) {
  const fallbackTitle = LABEL_SETS[DEFAULT_LANGUAGE].export.course_title;
  const lines = [
    '---',
    `title: "${(opts.title || fallbackTitle).replace(/"/g, '\\"')}"`,
  ];
  if (opts.subtitle)
    lines.push(`subtitle: "${opts.subtitle.replace(/"/g, '\\"')}"`);
  lines.push('---', '');
  lines.push('# Delete the item lines you do not want, then run:');
  lines.push('#   npx course export --toc <this file>', '');

  for (const mod of modules) {
    const items = flattenItems(mod.items).filter(
      (n) =>
        n.type === 'item' &&
        (!opts.flagged || (n.frontmatter && n.frontmatter.export === true)),
    );
    if (items.length === 0) continue;
    lines.push(`## ${mod.moduleName}`, '');
    for (const item of items) {
      const rel = item.relativePath.replace(/\\/g, '/');
      lines.push(`- ${rel}  # ${item.title}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Parse a TOC file into its metadata and ordered list of item paths. Only lines
 * beginning with `- ` are treated as item references; the first whitespace-
 * delimited token after the dash is the path, and any trailing `# comment` is
 * ignored. Headings and blank lines are skipped, so a user can freely annotate.
 *
 * @param {string} text
 * @returns {{ meta: object, paths: string[] }}
 */
function parseToc(text) {
  const { data, content } = parseFrontmatter(text);
  const paths = [];
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*-\s+(\S+)/);
    if (m) paths.push(m[1].replace(/\\/g, '/'));
  }
  return { meta: data || {}, paths };
}

/**
 * Split TOC paths into those known to the course index and those missing.
 *
 * @param {string[]} paths
 * @param {Map<string, object>} byPath - posix relativePath -> entry.
 * @returns {{ valid: string[], missing: string[] }}
 */
function validateTocPaths(paths, byPath) {
  const valid = [];
  const missing = [];
  for (const p of paths) {
    if (byPath.has(p)) valid.push(p);
    else missing.push(p);
  }
  return { valid, missing };
}

module.exports = { generateToc, parseToc, validateTocPaths };
