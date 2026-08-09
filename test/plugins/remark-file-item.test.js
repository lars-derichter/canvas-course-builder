const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const remarkFileItem = require('../../src/plugins/remark-file-item');

/**
 * Helper: build a root tree with optional children.
 */
function makeTree(children = []) {
  return { type: 'root', children };
}

/**
 * Helper: build a minimal vfile with frontMatter data.
 */
function makeVfile(frontMatter) {
  return { data: { frontMatter } };
}

/**
 * Helper: run the plugin transform on a tree with given frontmatter.
 */
function transform(tree, frontMatter, options) {
  const plugin = remarkFileItem(options);
  plugin(tree, makeVfile(frontMatter));
  return tree;
}

describe('remarkFileItem', () => {
  it('replaces document body with a file card for file items', () => {
    const tree = makeTree([
      { type: 'paragraph', children: [{ type: 'text', value: 'Some body text.' }] },
    ]);
    transform(tree, {
      canvas_type: 'file',
      file_ref: '_files/diagram.svg',
    });

    assert.equal(tree.children.length, 1);
    const card = tree.children[0];
    assert.equal(card.type, 'mdxJsxFlowElement');
    assert.equal(card.name, 'div');
    const classAttr = card.attributes.find((a) => a.name === 'className');
    assert.equal(classAttr.value, 'file-item-card');
  });

  it('renders the label as "File" by default', () => {
    const tree = makeTree([]);
    transform(tree, {
      canvas_type: 'file',
      file_ref: '_files/diagram.svg',
    });

    const label = tree.children[0].children[0];
    assert.equal(label.type, 'mdxJsxFlowElement');
    assert.equal(label.name, 'p');
    const labelClass = label.attributes.find((a) => a.name === 'className');
    assert.equal(labelClass.value, 'file-item-label');
    assert.equal(label.children[0].value, 'File');
  });

  it('renders options.label when provided', () => {
    const tree = makeTree([]);
    transform(
      tree,
      { canvas_type: 'file', file_ref: '_files/diagram.svg' },
      { label: 'Bestand' },
    );

    assert.equal(tree.children[0].children[0].children[0].value, 'Bestand');
  });

  it('renders an mdast link node with file_ref as url and filename as text', () => {
    const fileRef = '_files/workflow-diagram.svg';
    const tree = makeTree([]);
    transform(tree, {
      canvas_type: 'file',
      file_ref: fileRef,
    });

    const linkP = tree.children[0].children[1];
    assert.equal(linkP.type, 'mdxJsxFlowElement');
    assert.equal(linkP.name, 'p');
    const linkPClass = linkP.attributes.find((a) => a.name === 'className');
    assert.equal(linkPClass.value, 'file-item-link');

    // A plain mdast link node (not a JSX <a>) so Docusaurus's transformLinks
    // plugin rewrites it into a webpack asset require() at build time and adds
    // target="_blank" itself.
    const link = linkP.children[0];
    assert.equal(link.type, 'link');
    assert.equal(link.url, fileRef);

    // Link text shows just the filename, not the full path
    assert.equal(link.children[0].value, 'workflow-diagram.svg');
  });

  it('emits a @site/-aliased url when siteDir and vfile.path are available', () => {
    const tree = makeTree([]);
    const plugin = remarkFileItem({ siteDir: '/site' });
    plugin(tree, {
      path: '/site/course/01-getting-started/05-workflow-diagram.md',
      data: { frontMatter: { canvas_type: 'file', file_ref: '_files/example.html' } },
    });

    const link = tree.children[0].children[1].children[0];
    assert.equal(link.type, 'link');
    // @site/ aliasing makes transformLinks bundle the asset regardless of
    // extension (.html, .md, extension-less), bypassing its extension heuristic.
    assert.equal(link.url, '@site/course/01-getting-started/_files/example.html');
    assert.equal(link.children[0].value, 'example.html');
  });

  it('leaves non-file pages unchanged', () => {
    const body = { type: 'paragraph', children: [{ type: 'text', value: 'Hello.' }] };
    const tree = makeTree([body]);
    transform(tree, { canvas_type: 'page' });

    assert.equal(tree.children.length, 1);
    assert.equal(tree.children[0].type, 'paragraph');
    assert.equal(tree.children[0].children[0].value, 'Hello.');
  });

  it('leaves pages without canvas_type unchanged', () => {
    const body = { type: 'paragraph', children: [{ type: 'text', value: 'Hello.' }] };
    const tree = makeTree([body]);
    transform(tree, { title: 'Some page' });

    assert.equal(tree.children.length, 1);
    assert.equal(tree.children[0].type, 'paragraph');
  });

  it('leaves pages without frontmatter unchanged', () => {
    const body = { type: 'paragraph', children: [{ type: 'text', value: 'Hello.' }] };
    const tree = makeTree([body]);

    const plugin = remarkFileItem();
    plugin(tree, { data: {} });

    assert.equal(tree.children.length, 1);
    assert.equal(tree.children[0].type, 'paragraph');
  });

  it('skips file pages missing the file_ref field', () => {
    const body = { type: 'paragraph', children: [{ type: 'text', value: 'Hello.' }] };
    const tree = makeTree([body]);
    transform(tree, { canvas_type: 'file' });

    assert.equal(tree.children.length, 1);
    assert.equal(tree.children[0].type, 'paragraph');
  });

  it('removes all existing body content', () => {
    const tree = makeTree([
      { type: 'paragraph', children: [{ type: 'text', value: 'First.' }] },
      { type: 'paragraph', children: [{ type: 'text', value: 'Second.' }] },
      { type: 'heading', depth: 2, children: [{ type: 'text', value: 'Heading' }] },
    ]);
    transform(tree, {
      canvas_type: 'file',
      file_ref: '_files/report.pdf',
    });

    assert.equal(tree.children.length, 1);
    assert.equal(tree.children[0].name, 'div');
  });
});
