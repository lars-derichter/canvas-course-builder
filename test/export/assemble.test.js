const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  buildCombinedMarkdown,
  buildMetaBlock,
  injectAnchorOrGenerate,
  anchorFor,
} = require('../../lib/export/assemble');

/** Build a minimal page item carrying inline markdown. */
function page(relativePath, title, rawMd) {
  return {
    type: 'item',
    canvasType: 'page',
    relativePath,
    file: relativePath.split('/').pop(),
    title,
    rawMd,
    frontmatter: {},
    indent: 0,
  };
}

const ctx = { courseDir: '/course', includedPaths: new Set() };

describe('anchorFor', () => {
  it('is deterministic and strips the .md extension', () => {
    assert.equal(anchorFor('01-mod/02-page.md'), 'sec-01-mod-02-page');
  });
});

describe('buildMetaBlock', () => {
  it('emits only the fields that are set, plus lang', () => {
    const block = buildMetaBlock({ title: 'T', lang: 'nl', toc: true });
    assert.match(block, /^---\n/);
    assert.match(block, /title: "T"/);
    assert.match(block, /lang: nl/);
    assert.match(block, /toc: true/);
    assert.doesNotMatch(block, /subtitle/);
  });

  it('defaults lang to en', () => {
    assert.match(buildMetaBlock({ title: 'T' }), /lang: en/);
  });

  it('escapes double quotes in values', () => {
    assert.match(buildMetaBlock({ title: 'a "b"' }), /title: "a \\"b\\""/);
  });

  it('emits a labels block when meta.labels is set', () => {
    const block = buildMetaBlock({
      labels: { note: 'Info', attachment: 'Bijlage:' },
    });
    assert.match(block, /labels:\n {2}note: "Info"\n {2}attachment: "Bijlage:"/);
  });

  it('escapes quotes in label values', () => {
    const block = buildMetaBlock({ labels: { note: 'zeg "hallo"' } });
    assert.match(block, /note: "zeg \\"hallo\\""/);
  });

  it('omits the labels block when meta.labels is absent or empty', () => {
    assert.doesNotMatch(buildMetaBlock({ title: 'T' }), /labels:/);
    assert.doesNotMatch(buildMetaBlock({ labels: {} }), /labels:/);
  });
});

describe('injectAnchorOrGenerate', () => {
  it('injects the anchor into an existing leading heading', () => {
    const out = injectAnchorOrGenerate('# Title\n\nBody', page('m/p.md', 'Title'), 1, 'sec-x');
    assert.equal(out, '# Title {#sec-x}\n\nBody');
  });

  it('generates a heading when the body has none', () => {
    const out = injectAnchorOrGenerate('Just body', page('m/p.md', 'Title'), 2, 'sec-x');
    assert.equal(out, '## Title {#sec-x}\n\nJust body');
  });

  it('does not double-inject when an id is already present', () => {
    const out = injectAnchorOrGenerate('# Title {#keep}\n', page('m/p.md', 'Title'), 1, 'sec-x');
    assert.equal(out.split('\n')[0], '# Title {#keep}');
  });
});

describe('buildCombinedMarkdown', () => {
  const groupA = {
    moduleTitle: 'Module A',
    moduleFolder: '01-a',
    items: [page('01-a/01-one.md', 'One', '# One\n\nBody one.')],
  };

  it('flat regime: items are H1, no module heading', () => {
    const md = buildCombinedMarkdown([groupA], { regime: 'flat', toc: true, title: 'X' }, ctx);
    assert.match(md, /# One \{#sec-01-a-01-one\}/);
    assert.doesNotMatch(md, /# Module A/);
    assert.match(md, /toc: true/);
  });

  it('course regime: module is H1, item is H2 (body shifted +1)', () => {
    const md = buildCombinedMarkdown(
      [
        {
          moduleTitle: 'Module A',
          moduleFolder: '01-a',
          items: [page('01-a/01-one.md', 'One', '# One\n\n## Sub\n\nBody.')],
        },
      ],
      { regime: 'course', toc: true },
      ctx,
    );
    assert.match(md, /# Module A \{#sec-01-a\}/);
    assert.match(md, /## One \{#sec-01-a-01-one\}/);
    assert.match(md, /### Sub/); // body H2 shifted to H3
  });

  it('bare regime: no title page, no anchors forced, body kept', () => {
    const md = buildCombinedMarkdown([groupA], { regime: 'bare' }, ctx);
    assert.doesNotMatch(md, /title:/);
    assert.doesNotMatch(md, /toc: true/);
    assert.match(md, /Body one\./);
  });

  it('renders external_url items as link cards', () => {
    const ext = {
      type: 'item',
      canvasType: 'external_url',
      relativePath: '01-a/02-link.md',
      title: 'A Link',
      frontmatter: { external_url: 'https://example.com' },
      indent: 0,
    };
    const md = buildCombinedMarkdown(
      [{ moduleTitle: 'A', moduleFolder: '01-a', items: [ext] }],
      { regime: 'flat' },
      ctx,
    );
    assert.match(md, /# A Link \{#sec-01-a-02-link\}/);
    assert.match(md, /::: \{\.link-card title="A Link" url="https:\/\/example\.com"\}/);
  });

  it('renders file items as attachments using the referenced basename', () => {
    const file = {
      type: 'item',
      canvasType: 'file',
      relativePath: '01-a/03-diagram.md',
      title: 'Diagram',
      file: '03-diagram.md',
      frontmatter: { file_ref: '_files/workflow.svg' },
      indent: 0,
    };
    const md = buildCombinedMarkdown(
      [{ moduleTitle: 'A', moduleFolder: '01-a', items: [file] }],
      { regime: 'flat' },
      ctx,
    );
    assert.match(md, /::: \{\.attachment name="workflow\.svg"\}/);
  });

  it('nests subheader children one level deeper', () => {
    const groups = [
      {
        moduleTitle: 'A',
        moduleFolder: '01-a',
        items: [
          {
            type: 'subheader',
            folderName: '02-sub',
            title: 'Sub Section',
            items: [
              { ...page('01-a/02-sub/01-c.md', 'Child', '# Child\n\nc.'), indent: 1 },
            ],
          },
        ],
      },
    ];
    const md = buildCombinedMarkdown(groups, { regime: 'course' }, ctx);
    assert.match(md, /## Sub Section \{#sec-01-a-02-sub\}/); // subheader at item level (H2)
    assert.match(md, /### Child \{#sec-01-a-02-sub-01-c\}/); // child one deeper (H3)
  });
});
