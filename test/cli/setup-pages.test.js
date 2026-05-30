const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { parseGitHubRemote, rewriteDocusaurusConfig } = require('../../cli/setup-pages');

describe('parseGitHubRemote', () => {
  it('parses an SSH remote with .git suffix', () => {
    assert.deepEqual(
      parseGitHubRemote('git@github.com:lars-derichter/canvas-local.git'),
      { owner: 'lars-derichter', repo: 'canvas-local' }
    );
  });

  it('parses an SSH remote without .git suffix', () => {
    assert.deepEqual(
      parseGitHubRemote('git@github.com:acme/my-course'),
      { owner: 'acme', repo: 'my-course' }
    );
  });

  it('parses an HTTPS remote with .git suffix', () => {
    assert.deepEqual(
      parseGitHubRemote('https://github.com/acme/my-course.git'),
      { owner: 'acme', repo: 'my-course' }
    );
  });

  it('parses an HTTPS remote without .git suffix or trailing slash', () => {
    assert.deepEqual(
      parseGitHubRemote('https://github.com/acme/my-course/'),
      { owner: 'acme', repo: 'my-course' }
    );
  });

  it('parses an ssh:// scheme remote', () => {
    assert.deepEqual(
      parseGitHubRemote('ssh://git@github.com/acme/my-course.git'),
      { owner: 'acme', repo: 'my-course' }
    );
  });

  it('throws on a non-github remote', () => {
    assert.throws(() => parseGitHubRemote('git@gitlab.com:acme/my-course.git'), /github\.com/);
  });
});

const PLACEHOLDER_CONFIG = `const config = {
  title: 'Canvas Local',

  url: 'https://example.com',
  baseUrl: '/',

  onBrokenLinks: 'throw',
};

module.exports = config;
`;

describe('rewriteDocusaurusConfig', () => {
  const values = {
    url: 'https://acme.github.io',
    baseUrl: '/my-course/',
    organizationName: 'acme',
    projectName: 'my-course',
  };

  it('rewrites url and baseUrl from placeholders', () => {
    const out = rewriteDocusaurusConfig(PLACEHOLDER_CONFIG, values);
    assert.match(out, /url: 'https:\/\/acme\.github\.io',/);
    assert.match(out, /baseUrl: '\/my-course\/',/);
  });

  it('inserts organizationName, projectName, and trailingSlash', () => {
    const out = rewriteDocusaurusConfig(PLACEHOLDER_CONFIG, values);
    assert.match(out, /organizationName: 'acme',/);
    assert.match(out, /projectName: 'my-course',/);
    assert.match(out, /trailingSlash: false,/);
  });

  it('is idempotent: re-running produces no further changes', () => {
    const once = rewriteDocusaurusConfig(PLACEHOLDER_CONFIG, values);
    const twice = rewriteDocusaurusConfig(once, values);
    assert.equal(twice, once);
  });

  it('does not duplicate keys that already exist', () => {
    const once = rewriteDocusaurusConfig(PLACEHOLDER_CONFIG, values);
    const twice = rewriteDocusaurusConfig(once, values);
    assert.equal((twice.match(/organizationName:/g) || []).length, 1);
    assert.equal((twice.match(/trailingSlash:/g) || []).length, 1);
  });

  it('updates an already-customised url to the new value', () => {
    const once = rewriteDocusaurusConfig(PLACEHOLDER_CONFIG, values);
    const out = rewriteDocusaurusConfig(once, {
      ...values,
      url: 'https://other.github.io',
      baseUrl: '/other/',
    });
    assert.match(out, /url: 'https:\/\/other\.github\.io',/);
    assert.match(out, /baseUrl: '\/other\/',/);
  });
});
