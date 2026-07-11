const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { generateToc, parseToc, validateTocPaths } = require('../../lib/export/toc');

/** A minimal scanned module for TOC generation. */
function mod(folderName, moduleName, items) {
  return { folderName, moduleName, items };
}
function item(relativePath, title, frontmatter = {}) {
  return { type: 'item', relativePath, title, frontmatter };
}

describe('generateToc', () => {
  const modules = [
    mod('01-a', 'Module A', [
      item('01-a/01-one.md', 'One'),
      item('01-a/02-two.md', 'Two', { export: true }),
    ]),
    mod('02-b', 'Module B', [item('02-b/01-three.md', 'Three')]),
  ];

  it('lists every item as a dash line with a title comment', () => {
    const toc = generateToc(modules, { title: 'My Course' });
    assert.match(toc, /title: "My Course"/);
    assert.match(toc, /## Module A/);
    assert.match(toc, /- 01-a\/01-one\.md {2}# One/);
    assert.match(toc, /- 02-b\/01-three\.md {2}# Three/);
  });

  it('honours the flagged filter', () => {
    const toc = generateToc(modules, { flagged: true });
    assert.match(toc, /02-two\.md/);
    assert.doesNotMatch(toc, /01-one\.md/);
    assert.doesNotMatch(toc, /Module B/); // no flagged items, module omitted
  });
});

describe('parseToc', () => {
  it('round-trips generated output back to the same paths', () => {
    const modules = [
      mod('01-a', 'A', [item('01-a/01-one.md', 'One'), item('01-a/02-two.md', 'Two')]),
    ];
    const { paths, meta } = parseToc(generateToc(modules, { title: 'T', subtitle: 'S' }));
    assert.deepEqual(paths, ['01-a/01-one.md', '01-a/02-two.md']);
    assert.equal(meta.title, 'T');
    assert.equal(meta.subtitle, 'S');
  });

  it('survives user edits: ignores headings, blanks, and deleted lines', () => {
    const edited = [
      '---',
      'title: "Kept"',
      '---',
      '',
      '## Some heading the user kept',
      '',
      '- 01-a/01-one.md  # One',
      '# a stray comment line',
      '',
      '- 01-a/03-three.md  # Three',
    ].join('\n');
    const { paths, meta } = parseToc(edited);
    assert.deepEqual(paths, ['01-a/01-one.md', '01-a/03-three.md']);
    assert.equal(meta.title, 'Kept');
  });

  it('takes only the first token as the path, ignoring the title comment', () => {
    const { paths } = parseToc('- 01-a/01-one.md  # A title with spaces');
    assert.deepEqual(paths, ['01-a/01-one.md']);
  });
});

describe('validateTocPaths', () => {
  it('separates known from unknown paths', () => {
    const byPath = new Map([['01-a/01-one.md', {}]]);
    const { valid, missing } = validateTocPaths(
      ['01-a/01-one.md', '01-a/99-gone.md'],
      byPath,
    );
    assert.deepEqual(valid, ['01-a/01-one.md']);
    assert.deepEqual(missing, ['01-a/99-gone.md']);
  });
});
