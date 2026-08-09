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

/** Cache per resolved root dir: the file is read once per process. */
const cache = new Map();

/**
 * Load course.config.yml and resolve the course language and labels.
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
 * @returns {{ language: string, labels: object }} Frozen resolved config.
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
          `${CONFIG_FILENAME} must be a YAML mapping (language, labels)`,
        );
      }
    }
  }
  data = data || {};

  for (const key of Object.keys(data)) {
    if (key !== 'language' && key !== 'labels') {
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

  const labels = getLabels(language, data.labels);
  const config = Object.freeze({
    language,
    labels: deepFreeze(labels),
  });
  cache.set(root, config);
  return config;
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
  loadCourseConfig,
  _clearCache,
};
