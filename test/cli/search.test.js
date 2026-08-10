const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  findMatches,
  buildWindows,
  renderFileResult,
  walkDir,
} = require('../../cli/search');

describe('findMatches', () => {
  it('matches case-insensitively by default', () => {
    const { matchedLines } = findMatches('a\nCSS Grid layout\nb', 'GRID');
    assert.deepEqual(matchedLines, [2]);
  });

  it('respects caseSensitive', () => {
    const text = 'Grid\ngrid';
    assert.deepEqual(
      findMatches(text, 'Grid', { caseSensitive: true }).matchedLines,
      [1],
    );
    assert.deepEqual(findMatches(text, 'Grid').matchedLines, [1, 2]);
  });

  it('lists a line once even with multiple occurrences on it', () => {
    const { matchedLines } = findMatches('grid grid grid', 'grid');
    assert.deepEqual(matchedLines, [1]);
  });

  it('returns no matches for absent keywords', () => {
    assert.deepEqual(findMatches('a\nb\nc', 'zzz').matchedLines, []);
  });

  it('counts frontmatter lines toward line numbers', () => {
    const text = '---\ntitle: Grid\n---\n\nbody';
    assert.deepEqual(findMatches(text, 'grid').matchedLines, [2]);
  });

  it('numbers lines correctly with CRLF endings', () => {
    const { lines, matchedLines } = findMatches('a\r\nb grid\r\nc', 'grid');
    assert.deepEqual(matchedLines, [2]);
    assert.equal(lines[1], 'b grid');
  });
});

describe('buildWindows', () => {
  it('clamps a window at the start and end of the file', () => {
    assert.deepEqual(buildWindows([1], 2, 10), [{ start: 1, end: 3 }]);
    assert.deepEqual(buildWindows([10], 2, 10), [{ start: 8, end: 10 }]);
  });

  it('merges overlapping windows', () => {
    assert.deepEqual(buildWindows([5, 7], 2, 20), [{ start: 3, end: 9 }]);
  });

  it('merges touching windows', () => {
    // 5+2=7 and 10-2=8 touch (gap of zero lines between the windows).
    assert.deepEqual(buildWindows([5, 10], 2, 20), [{ start: 3, end: 12 }]);
  });

  it('keeps distant windows separate', () => {
    assert.deepEqual(buildWindows([5, 15], 2, 20), [
      { start: 3, end: 7 },
      { start: 13, end: 17 },
    ]);
  });

  it('handles context 0, still merging consecutive match lines', () => {
    assert.deepEqual(buildWindows([4, 5, 9], 0, 20), [
      { start: 4, end: 5 },
      { start: 9, end: 9 },
    ]);
  });
});

describe('renderFileResult', () => {
  const lines = Array.from({ length: 12 }, (_, i) => `line ${i + 1}`);

  it('marks match lines with a colon and pads line numbers', () => {
    const out = renderFileResult(
      'file.md',
      lines,
      [{ start: 9, end: 11 }],
      new Set([10]),
    );
    assert.deepEqual(out, [
      'file.md',
      '   9    line 9',
      '  10:   line 10',
      '  11    line 11',
    ]);
  });

  it('separates non-adjacent windows with -- and none after the last', () => {
    const out = renderFileResult(
      'file.md',
      lines,
      [
        { start: 1, end: 2 },
        { start: 6, end: 7 },
      ],
      new Set([1, 6]),
    );
    assert.deepEqual(out, [
      'file.md',
      '  1:   line 1',
      '  2    line 2',
      '  --',
      '  6:   line 6',
      '  7    line 7',
    ]);
  });
});

describe('walkDir', () => {
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'search-test-'));
    fs.mkdirSync(path.join(tmpDir, '2526', 'exam-1'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '_drafts'));
    fs.writeFileSync(path.join(tmpDir, 'notes.md'), 'notes');
    fs.writeFileSync(path.join(tmpDir, '_internal.md'), 'internal');
    fs.writeFileSync(path.join(tmpDir, 'image.png'), 'png');
    fs.writeFileSync(path.join(tmpDir, '2526', 'planning.md'), 'planning');
    fs.writeFileSync(
      path.join(tmpDir, '2526', 'exam-1', 'instructions.md'),
      'instructions',
    );
    fs.writeFileSync(path.join(tmpDir, '_drafts', 'draft.md'), 'draft');
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('finds nested markdown, skipping _-prefixed entries and non-markdown', () => {
    const found = walkDir(tmpDir).map((p) => path.relative(tmpDir, p));
    assert.deepEqual(found, [
      path.join('2526', 'exam-1', 'instructions.md'),
      path.join('2526', 'planning.md'),
      'notes.md',
    ]);
  });

  it('returns an empty list for a missing directory', () => {
    assert.deepEqual(walkDir(path.join(tmpDir, 'does-not-exist')), []);
  });
});
