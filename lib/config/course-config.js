const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const {
  DEFAULT_LANGUAGE,
  LABEL_SETS,
  getLabels,
  validateOverrides,
} = require('./labels');

const CONFIG_FILENAME = 'course.config.yml';

/** Keys the file may contain. Anything else warns and is ignored. */
const KNOWN_KEYS = ['language', 'labels', 'theme', 'export'];

/** Built-in defaults for the two "pick a look" keys. The names they resolve to
 *  are validated where they are used — lib/config/theme.js for the theme,
 *  lib/export/style-resolver.js for the export style — so this module stays
 *  free of both. */
const DEFAULT_THEME_NAME = 'github';
const DEFAULT_EXPORT_STYLE = 'generic';

/** Cache per resolved root dir: the file is read once per process. */
const cache = new Map();

/**
 * Load course.config.yml and resolve the course language, labels, theme and
 * export style.
 *
 * A missing (or empty) config file is fine — everything falls back to the
 * built-in `en` set, so neither `npx course` nor the Docusaurus build depends
 * on the file existing. A file that exists but cannot be parsed throws:
 * an authored-but-broken config should fail loudly, not silently anglicise
 * a course. Unknown languages and unknown label keys only warn (via
 * console.warn so it behaves the same under the CLI and Docusaurus).
 *
 * @param {string} [rootDir] - Project root containing course.config.yml.
 *   Defaults to the CLI's PROJECT_ROOT; docusaurus.config.js passes __dirname.
 * @returns {{ language: string, labels: object, theme: string,
 *   export: { style: string } }} Frozen resolved config. `theme` and
 *   `export.style` are names or paths, resolved to files by their consumers.
 */
function loadCourseConfig(rootDir) {
  const root = path.resolve(
    rootDir || require('../../cli/project-root').PROJECT_ROOT,
  );
  if (cache.has(root)) return cache.get(root);

  const filePath = path.join(root, CONFIG_FILENAME);
  let data = null;
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (raw.trim()) {
      try {
        data = yaml.load(raw);
      } catch (err) {
        throw new Error(`Cannot parse ${CONFIG_FILENAME}: ${err.message}`);
      }
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new Error(
          `${CONFIG_FILENAME} must be a YAML mapping (${KNOWN_KEYS.join(', ')})`,
        );
      }
    }
  }
  data = data || {};

  for (const key of Object.keys(data)) {
    if (!KNOWN_KEYS.includes(key)) {
      console.warn(`[course-config] Ignoring unknown key "${key}" in ${CONFIG_FILENAME}`);
    }
  }

  let language = DEFAULT_LANGUAGE;
  if (data.language != null) {
    const requested = String(data.language).trim().toLowerCase();
    if (LABEL_SETS[requested]) {
      language = requested;
    } else {
      console.warn(
        `[course-config] Unknown language "${data.language}" in ${CONFIG_FILENAME}, ` +
          `falling back to "${DEFAULT_LANGUAGE}"`,
      );
    }
  }

  for (const problem of validateOverrides(data.labels)) {
    console.warn(`[course-config] Ignoring ${problem} in ${CONFIG_FILENAME}`);
  }

  const theme = readName(data.theme, DEFAULT_THEME_NAME, 'theme');

  if (data.export != null && (typeof data.export !== 'object' || Array.isArray(data.export))) {
    console.warn(`[course-config] Ignoring "export" in ${CONFIG_FILENAME}: expected a mapping`);
  }
  const exportSettings = (data.export && !Array.isArray(data.export)) ? data.export : {};
  for (const key of Object.keys(exportSettings)) {
    if (key !== 'style') {
      console.warn(`[course-config] Ignoring unknown key "export.${key}" in ${CONFIG_FILENAME}`);
    }
  }

  const labels = getLabels(language, data.labels);
  const config = Object.freeze({
    language,
    labels: deepFreeze(labels),
    theme,
    export: Object.freeze({
      style: readName(exportSettings.style, DEFAULT_EXPORT_STYLE, 'export.style'),
    }),
  });
  cache.set(root, config);
  return config;
}

/**
 * Read a theme or export-style name: a non-empty string, trimmed. The value may
 * be a built-in name or a path, so it is passed through as authored — only the
 * shape is checked here.
 */
function readName(value, fallback, keyName) {
  if (value == null) return fallback;
  const name = String(value).trim();
  if (!name) {
    console.warn(`[course-config] Ignoring empty "${keyName}" in ${CONFIG_FILENAME}`);
    return fallback;
  }
  return name;
}

function deepFreeze(obj) {
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') deepFreeze(value);
  }
  return Object.freeze(obj);
}

/** Test hook: forget cached configs so a test can vary the file contents. */
function _clearCache() {
  cache.clear();
}

module.exports = {
  CONFIG_FILENAME,
  DEFAULT_EXPORT_STYLE,
  DEFAULT_THEME_NAME,
  loadCourseConfig,
  _clearCache,
};
