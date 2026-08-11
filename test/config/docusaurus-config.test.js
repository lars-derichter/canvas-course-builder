const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const CONFIG_PATH = require.resolve('../../docusaurus.config.js');
const WORKFLOW_PATH = path.resolve(
  __dirname,
  '../../.github/workflows/deploy.yml',
);

function setOrDelete(key, value) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

/** Load docusaurus.config.js under a given environment, then restore it. */
function loadConfig({ siteUrl, baseUrl } = {}) {
  const previous = {
    CCB_SITE_URL: process.env.CCB_SITE_URL,
    CCB_BASE_URL: process.env.CCB_BASE_URL,
  };
  setOrDelete('CCB_SITE_URL', siteUrl);
  setOrDelete('CCB_BASE_URL', baseUrl);
  delete require.cache[CONFIG_PATH];
  try {
    return require(CONFIG_PATH);
  } finally {
    setOrDelete('CCB_SITE_URL', previous.CCB_SITE_URL);
    setOrDelete('CCB_BASE_URL', previous.CCB_BASE_URL);
    delete require.cache[CONFIG_PATH];
  }
}

describe('docusaurus.config.js hosting values', () => {
  it('takes the site address from the environment', () => {
    const config = loadConfig({
      siteUrl: 'https://acme.github.io',
      baseUrl: '/my-course/',
    });
    assert.equal(config.url, 'https://acme.github.io');
    assert.equal(config.baseUrl, '/my-course/');
  });

  it('falls back to placeholders for a local build', () => {
    const config = loadConfig();
    assert.equal(config.url, 'https://example.com');
    assert.equal(config.baseUrl, '/');
  });
});

describe('the deploy workflow', () => {
  const workflow = fs.readFileSync(WORKFLOW_PATH, 'utf-8');

  // The other half of the contract above: without these the site builds at
  // baseUrl '/' and every internal link 404s under the project path.
  it('passes the Pages address to the build', () => {
    assert.match(
      workflow,
      /CCB_SITE_URL:\s*\$\{\{\s*steps\.pages\.outputs\.origin\s*\}\}/,
    );
    assert.match(
      workflow,
      /CCB_BASE_URL:\s*\$\{\{\s*steps\.pages\.outputs\.base_path\s*\}\}\//,
    );
  });

  // configure-pages fails when Pages is not enabled. Tolerating that is what
  // keeps a course that never publishes from failing on every push.
  it('skips rather than fails when Pages is not enabled', () => {
    assert.match(workflow, /continue-on-error:\s*true/);
    assert.match(
      workflow,
      /if:\s*needs\.check\.outputs\.enabled\s*==\s*'true'/,
    );
  });
});
