const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { _moveEntry } = require('../../cli/movetomodule-item');

/**
 * Create a subsection folder with a _category_.json holding the given position.
 */
function createSubsection(parent, name, position, label = 'Sub') {
  const dir = path.join(parent, name);
  fs.mkdirSync(dir);
  fs.writeFileSync(
    path.join(dir, '_category_.json'),
    JSON.stringify({ label, position }, null, 2) + '\n',
    'utf8',
  );
  return dir;
}

function readPosition(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, '_category_.json'), 'utf8'))
    .position;
}

function listEntries(dir) {
  return fs
    .readdirSync(dir)
    .filter((n) => !n.startsWith('.'))
    .sort();
}

describe('moveEntry (movetomodule-item)', () => {
  let tmpDir;
  let sourceDir;
  let destDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'movetomodule-'));
    sourceDir = path.join(tmpDir, 'source');
    destDir = path.join(tmpDir, 'dest');
    fs.mkdirSync(sourceDir);
    fs.mkdirSync(destDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('moves a subsection into an empty destination and aligns its _category_.json position', () => {
    createSubsection(sourceDir, '02-week-two', 2);

    _moveEntry(sourceDir, '02-week-two', destDir, 1);

    assert.deepStrictEqual(listEntries(destDir), ['01-week-two']);
    assert.ok(!fs.existsSync(path.join(sourceDir, '02-week-two')));
    // The moved subsection keeps its category file, with position == new prefix.
    assert.equal(readPosition(path.join(destDir, '01-week-two')), 1);
  });

  it('shifts existing destination subsections up and fixes their positions', () => {
    createSubsection(destDir, '01-existing', 1, 'Existing');
    createSubsection(sourceDir, '01-incoming', 1, 'Incoming');

    _moveEntry(sourceDir, '01-incoming', destDir, 1);

    assert.deepStrictEqual(listEntries(destDir), [
      '01-incoming',
      '02-existing',
    ]);
    assert.equal(readPosition(path.join(destDir, '01-incoming')), 1);
    assert.equal(readPosition(path.join(destDir, '02-existing')), 2);
  });

  it('renumbers the source to close the gap after a move', () => {
    createSubsection(sourceDir, '01-keep', 1, 'Keep');
    createSubsection(sourceDir, '02-move', 2, 'Move');
    createSubsection(sourceDir, '03-tail', 3, 'Tail');

    _moveEntry(sourceDir, '02-move', destDir, 1);

    assert.deepStrictEqual(listEntries(sourceDir), ['01-keep', '02-tail']);
    assert.equal(readPosition(path.join(sourceDir, '01-keep')), 1);
    assert.equal(readPosition(path.join(sourceDir, '02-tail')), 2);
  });

  it('moves a plain file without a _category_.json', () => {
    fs.writeFileSync(path.join(sourceDir, '01-page.md'), '# Page\n', 'utf8');

    _moveEntry(sourceDir, '01-page.md', destDir, 1);

    assert.deepStrictEqual(listEntries(destDir), ['01-page.md']);
    assert.ok(!fs.existsSync(path.join(sourceDir, '01-page.md')));
  });
});
