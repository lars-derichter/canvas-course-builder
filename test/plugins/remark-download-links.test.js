const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const remarkDownloadLinks = require('../../src/plugins/remark-download-links');

// The plugin only rewrites links whose target exists on disk, so tests run
// against a real temporary fixture: a page.md next to a _files/ folder.
let fixtureDir;
let pagePath;

before(() => {
  fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'download-links-'));
  fs.mkdirSync(path.join(fixtureDir, '_files'));
  fs.writeFileSync(path.join(fixtureDir, '_files', 'example.html'), '<h1>hi</h1>');
  fs.writeFileSync(path.join(fixtureDir, '_files', 'report.docx'), 'binary');
  fs.writeFileSync(path.join(fixtureDir, 'other.md'), '# other');
  pagePath = path.join(fixtureDir, 'page.md');
});

after(() => {
  fs.rmSync(fixtureDir, { recursive: true, force: true });
});

/**
 * Build a root tree whose single paragraph holds one link node.
 */
function treeWithLink({ url, title, text = 'label' }) {
  const link = { type: 'link', url, children: [{ type: 'text', value: text }] };
  if (title) link.title = title;
  return {
    tree: { type: 'root', children: [{ type: 'paragraph', children: [link] }] },
    getLink: (t) => t.children[0].children[0],
  };
}

/**
 * Run the plugin against a tree, using the fixture page as the source file.
 */
function transform(tree, vfileOverrides = {}) {
  const plugin = remarkDownloadLinks();
  plugin(tree, { path: pagePath, data: {}, ...vfileOverrides });
  return tree;
}

/** Find an attribute by name on a JSX element node. */
function attr(node, name) {
  return node.attributes.find((a) => a.name === name);
}

describe('remarkDownloadLinks', () => {
  it('rewrites a relative .html link into a download anchor', () => {
    const { tree, getLink } = treeWithLink({ url: './_files/example.html' });
    transform(tree);

    const node = getLink(tree);
    assert.equal(node.type, 'mdxJsxTextElement');
    assert.equal(node.name, 'a');
    // Original link text is preserved as the anchor's children.
    assert.equal(node.children[0].value, 'label');
  });

  it('forces download under the original filename', () => {
    const { tree, getLink } = treeWithLink({ url: './_files/example.html', text: 'click here' });
    transform(tree);

    const download = attr(getLink(tree), 'download');
    assert.ok(download);
    assert.equal(download.value, 'example.html');
  });

  it('builds a webpack require() href through file-loader', () => {
    const { tree, getLink } = treeWithLink({ url: './_files/example.html' });
    transform(tree);

    const href = attr(getLink(tree), 'href');
    assert.equal(href.value.type, 'mdxJsxAttributeValueExpression');
    assert.match(href.value.value, /^require\(".*file-loader.*example\.html"\)\.default$/);
    // The estree must carry the same require string for MDX to compile it.
    assert.equal(href.value.data.estree.type, 'Program');
  });

  it('marks the anchor so the broken-link checker skips it', () => {
    const { tree, getLink } = treeWithLink({ url: './_files/example.html' });
    transform(tree);

    assert.equal(attr(getLink(tree), 'data-noBrokenLinkCheck').value, 'true');
  });

  it('preserves the link title', () => {
    const { tree, getLink } = treeWithLink({ url: './_files/example.html', title: 'My file' });
    transform(tree);

    assert.equal(attr(getLink(tree), 'title').value, 'My file');
  });

  it('leaves internal .md links untouched', () => {
    const { tree, getLink } = treeWithLink({ url: './other.md' });
    transform(tree);

    assert.equal(getLink(tree).type, 'link');
  });

  it('leaves non-.html asset links untouched (transformLinks handles them)', () => {
    const { tree, getLink } = treeWithLink({ url: './_files/report.docx' });
    transform(tree);

    assert.equal(getLink(tree).type, 'link');
  });

  it('leaves external links untouched', () => {
    const { tree, getLink } = treeWithLink({ url: 'https://example.com/page.html' });
    transform(tree);

    assert.equal(getLink(tree).type, 'link');
  });

  it('leaves @site/ and absolute links untouched', () => {
    for (const url of ['@site/course/_files/example.html', '/files/example.html']) {
      const { tree, getLink } = treeWithLink({ url });
      transform(tree);
      assert.equal(getLink(tree).type, 'link', `should skip ${url}`);
    }
  });

  it('leaves .html links with an anchor hash as navigation', () => {
    const { tree, getLink } = treeWithLink({ url: './_files/example.html#top' });
    transform(tree);

    assert.equal(getLink(tree).type, 'link');
  });

  it('leaves links to non-existent files untouched', () => {
    const { tree, getLink } = treeWithLink({ url: './_files/missing.html' });
    transform(tree);

    assert.equal(getLink(tree).type, 'link');
  });

  it('is a no-op when the vfile has no path', () => {
    const { tree, getLink } = treeWithLink({ url: './_files/example.html' });
    const plugin = remarkDownloadLinks();
    plugin(tree, { data: {} });

    assert.equal(getLink(tree).type, 'link');
  });
});
