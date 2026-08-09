const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const remarkExternalUrl = require('../../src/plugins/remark-external-url');

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
  const plugin = remarkExternalUrl(options);
  plugin(tree, makeVfile(frontMatter));
  return tree;
}

describe('remarkExternalUrl', () => {
  it('replaces document body with a link card for external_url pages', () => {
    const tree = makeTree([
      { type: 'paragraph', children: [{ type: 'text', value: 'Some body text.' }] },
    ]);
    transform(tree, {
      canvas_type: 'external_url',
      external_url: 'https://example.com',
    });

    assert.equal(tree.children.length, 1);
    const card = tree.children[0];
    assert.equal(card.type, 'mdxJsxFlowElement');
    assert.equal(card.name, 'div');
    const classAttr = card.attributes.find((a) => a.name === 'className');
    assert.equal(classAttr.value, 'external-url-card');
  });

  it('renders the label as "External link" by default', () => {
    const tree = makeTree([]);
    transform(tree, {
      canvas_type: 'external_url',
      external_url: 'https://example.com',
    });

    const label = tree.children[0].children[0];
    assert.equal(label.type, 'mdxJsxFlowElement');
    assert.equal(label.name, 'p');
    const labelClass = label.attributes.find((a) => a.name === 'className');
    assert.equal(labelClass.value, 'external-url-label');
    assert.equal(label.children[0].value, 'External link');
  });

  it('renders options.label when provided', () => {
    const tree = makeTree([]);
    transform(
      tree,
      { canvas_type: 'external_url', external_url: 'https://example.com' },
      { label: 'Externe link' },
    );

    const label = tree.children[0].children[0];
    assert.equal(label.children[0].value, 'Externe link');
  });

  it('renders a link with the external_url as href and text', () => {
    const url = 'https://developer.mozilla.org/en-US/docs/Web';
    const tree = makeTree([]);
    transform(tree, {
      canvas_type: 'external_url',
      external_url: url,
    });

    const linkP = tree.children[0].children[1];
    assert.equal(linkP.type, 'mdxJsxFlowElement');
    assert.equal(linkP.name, 'p');
    const linkPClass = linkP.attributes.find((a) => a.name === 'className');
    assert.equal(linkPClass.value, 'external-url-link');

    const link = linkP.children[0];
    assert.equal(link.type, 'mdxJsxTextElement');
    assert.equal(link.name, 'a');

    const href = link.attributes.find((a) => a.name === 'href');
    assert.equal(href.value, url);

    const target = link.attributes.find((a) => a.name === 'target');
    assert.equal(target.value, '_blank');

    const rel = link.attributes.find((a) => a.name === 'rel');
    assert.equal(rel.value, 'noopener noreferrer');

    assert.equal(link.children[0].value, url);
  });

  it('leaves non-external_url pages unchanged', () => {
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

    const plugin = remarkExternalUrl();
    plugin(tree, { data: {} });

    assert.equal(tree.children.length, 1);
    assert.equal(tree.children[0].type, 'paragraph');
  });

  it('skips external_url pages missing the external_url field', () => {
    const body = { type: 'paragraph', children: [{ type: 'text', value: 'Hello.' }] };
    const tree = makeTree([body]);
    transform(tree, { canvas_type: 'external_url' });

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
      canvas_type: 'external_url',
      external_url: 'https://example.com',
    });

    assert.equal(tree.children.length, 1);
    assert.equal(tree.children[0].name, 'div');
  });
});
