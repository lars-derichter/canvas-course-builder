const fs = require('fs');
const path = require('path');

const { scanCourse, flattenItems } = require('../lib/convert/course-scanner');
const { parseFrontmatter } = require('../lib/convert/frontmatter');
const {
  extractFileReferences,
  maskCodeRegions,
} = require('../lib/convert/link-resolver');
const { COURSE_DIR } = require('./module-utils');

const VALID_CANVAS_TYPES = new Set([
  'page',
  'assignment',
  'discussion',
  'external_url',
  'external_tool',
  'file',
]);

/**
 * Validate scanned modules against the files on disk.
 * Collects messages instead of printing them, so it can be unit tested.
 *
 * @param {Array<object>} modules - Modules from scanCourse().
 * @param {string} courseDir - Absolute path to the scanned course directory.
 * @returns {{ errors: string[], warnings: string[] }}
 */
function validateModules(modules, courseDir) {
  const errors = [];
  const warnings = [];

  // Build a set of all known relative paths for link validation
  const allPaths = new Set();
  for (const mod of modules) {
    const flatItems = flattenItems(mod.items);
    for (const item of flatItems) {
      if (item.relativePath) {
        allPaths.add(item.relativePath);
      }
    }
  }

  for (const mod of modules) {
    // Check module naming convention
    if (!mod.folderName.match(/^\d{2}-/)) {
      warnings.push(
        `${mod.folderName}: folder name should start with a two-digit prefix (e.g. 01-)`,
      );
    }

    const flatItems = flattenItems(mod.items);

    for (const item of flatItems) {
      if (item.type === 'subheader') continue;
      // Raw binaries dropped in a module folder: no frontmatter, no body,
      // nothing to validate. Markdown wrappers (canvas_type: file) are
      // validated like any other item.
      if (item.canvasType === 'file' && !item.file.endsWith('.md')) continue;

      const filePath = path.resolve(courseDir, item.relativePath);

      // Check naming convention
      if (!item.file.match(/^\d{2}-/)) {
        warnings.push(
          `${item.relativePath}: filename should start with a two-digit prefix`,
        );
      }

      // Validate frontmatter
      let raw;
      try {
        raw = fs.readFileSync(filePath, 'utf8');
      } catch (err) {
        errors.push(`${item.relativePath}: cannot read file: ${err.message}`);
        continue;
      }

      let data;
      try {
        ({ data } = parseFrontmatter(raw));
      } catch (err) {
        errors.push(
          `${item.relativePath}: invalid frontmatter YAML: ${err.message}`,
        );
        continue;
      }

      // Check canvas_type
      if (data.canvas_type && !VALID_CANVAS_TYPES.has(data.canvas_type)) {
        errors.push(
          `${item.relativePath}: unknown canvas_type "${data.canvas_type}" (expected: ${[...VALID_CANVAS_TYPES].join(', ')})`,
        );
      }

      // Check external_url has a URL
      if (data.canvas_type === 'external_url' && !data.external_url) {
        errors.push(
          `${item.relativePath}: external_url type requires an external_url field`,
        );
      }

      // An LTI link is nothing without its launch URL: that URL, not a tool id,
      // is what Canvas resolves the tool from.
      if (data.canvas_type === 'external_tool' && !data.external_url) {
        errors.push(
          `${item.relativePath}: external_tool type requires an external_url field (the tool's launch URL)`,
        );
      }

      // Check file wrapper has a file_ref pointing at a file on disk
      if (data.canvas_type === 'file') {
        if (!data.file_ref || typeof data.file_ref !== 'string') {
          errors.push(
            `${item.relativePath}: file type requires a file_ref field`,
          );
        } else {
          const refPath = path.resolve(path.dirname(filePath), data.file_ref);
          if (!fs.existsSync(refPath)) {
            errors.push(
              `${item.relativePath}: file_ref not found: ${data.file_ref}`,
            );
          }
        }
      }

      // Validate external_url format
      if (data.external_url) {
        try {
          new URL(data.external_url);
        } catch {
          errors.push(
            `${item.relativePath}: invalid external_url "${data.external_url}"`,
          );
        }
      }

      // Check internal links. Mask code blocks and inline code first so
      // example links in documentation snippets don't count as broken.
      const scannable = maskCodeRegions(raw);
      const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
      let match;
      while ((match = linkRegex.exec(scannable)) !== null) {
        const href = match[2].split(/\s+/)[0]; // Strip title
        if (
          href.startsWith('http://') ||
          href.startsWith('https://') ||
          href.startsWith('#') ||
          href.startsWith('//')
        ) {
          continue;
        }
        if (!href.endsWith('.md')) continue;

        // Resolve relative to the item's directory
        const itemDir = path.dirname(item.relativePath);
        const resolved = path.posix.normalize(
          path.posix.join(itemDir, href.split('#')[0]),
        );

        if (!allPaths.has(resolved)) {
          errors.push(
            `${item.relativePath}: broken link to "${href}" (resolved: ${resolved})`,
          );
        }
      }

      // Check file references exist on disk
      try {
        const refs = extractFileReferences(raw, item.relativePath);
        for (const ref of refs) {
          const refPath = path.resolve(courseDir, ref);
          if (!fs.existsSync(refPath)) {
            errors.push(
              `${item.relativePath}: referenced file not found: ${ref}`,
            );
          }
        }
      } catch {
        // extractFileReferences may fail on unusual content
      }
    }
  }

  return { errors, warnings };
}

async function validate() {
  if (!fs.existsSync(COURSE_DIR)) {
    console.error('[validate] No course/ directory found.');
    process.exit(1);
  }

  const modules = scanCourse(COURSE_DIR);

  console.log(`[validate] Checking ${modules.length} module(s)...\n`);

  const { errors, warnings } = validateModules(modules, COURSE_DIR);

  // Report results
  if (warnings.length > 0) {
    console.log(`Warnings (${warnings.length}):`);
    for (const w of warnings) {
      console.log(`  ⚠ ${w}`);
    }
    console.log();
  }

  if (errors.length > 0) {
    console.log(`Errors (${errors.length}):`);
    for (const e of errors) {
      console.log(`  ✗ ${e}`);
    }
    console.log();
    console.log(
      `[validate] Found ${errors.length} error(s) and ${warnings.length} warning(s).`,
    );
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log(`[validate] No errors. ${warnings.length} warning(s).`);
  } else {
    console.log('[validate] All checks passed.');
  }
}

module.exports = validate;
module.exports._validateModules = validateModules;
