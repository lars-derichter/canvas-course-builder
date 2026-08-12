const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const pull = require('../../cli/pull');

const {
  _buildIdentifierMap: buildIdentifierMap,
  _findOldSyncPath: findOldSyncPath,
  _overwriteSkipReason: overwriteSkipReason,
  _courseHasMarkdown: courseHasMarkdown,
  _createPullFileResolver: createPullFileResolver,
  _pullStrategies: pullStrategies,
} = pull;

describe('buildIdentifierMap', () => {
  it('maps page_url to relative path', () => {
    const items = {
      'page:42': {
        path: '01-mod/01-page.md',
        page_url: 'my-page',
        canvas_id: 42,
      },
    };
    const map = buildIdentifierMap(items);
    assert.equal(map.get('page:my-page'), '01-mod/01-page.md');
  });

  it('maps external_url to relative path', () => {
    const items = {
      'external_url:https://example.com': {
        path: '01-mod/02-link.md',
        external_url: 'https://example.com',
        canvas_id: 5,
      },
    };
    const map = buildIdentifierMap(items);
    assert.equal(map.get('url:https://example.com'), '01-mod/02-link.md');
  });

  it('maps canvas_id to relative path', () => {
    const items = {
      'assignment:99': { path: '01-mod/03-assign.md', canvas_id: 99 },
    };
    const map = buildIdentifierMap(items);
    assert.equal(map.get('id:99'), '01-mod/03-assign.md');
  });

  it('handles items with multiple identifiers', () => {
    const items = {
      'page:10': { path: '01-mod/01-page.md', page_url: 'slug', canvas_id: 10 },
    };
    const map = buildIdentifierMap(items);
    assert.equal(map.get('page:slug'), '01-mod/01-page.md');
    assert.equal(map.get('id:10'), '01-mod/01-page.md');
  });

  it('handles empty moduleItems', () => {
    const map = buildIdentifierMap({});
    assert.equal(map.size, 0);
  });
});

describe('findOldSyncPath', () => {
  it('finds by page_url first', () => {
    const map = new Map([['page:my-page', '01-mod/01-page.md']]);
    assert.equal(
      findOldSyncPath({ page_url: 'my-page' }, map),
      '01-mod/01-page.md',
    );
  });

  it('finds by external_url', () => {
    const map = new Map([['url:https://example.com', '01-mod/02-link.md']]);
    assert.equal(
      findOldSyncPath({ external_url: 'https://example.com' }, map),
      '01-mod/02-link.md',
    );
  });

  it('finds by _resolvedPageId', () => {
    const map = new Map([['id:42', '01-mod/01-page.md']]);
    assert.equal(
      findOldSyncPath({ _resolvedPageId: 42 }, map),
      '01-mod/01-page.md',
    );
  });

  it('finds by content_id', () => {
    const map = new Map([['id:99', '01-mod/03-assign.md']]);
    assert.equal(
      findOldSyncPath({ content_id: 99 }, map),
      '01-mod/03-assign.md',
    );
  });

  it('finds by id as fallback', () => {
    const map = new Map([['id:7', '01-mod/04-item.md']]);
    assert.equal(findOldSyncPath({ id: 7 }, map), '01-mod/04-item.md');
  });

  it('returns null when no match', () => {
    const map = new Map();
    assert.equal(findOldSyncPath({ id: 999 }, map), null);
  });

  it('prefers page_url over id', () => {
    const map = new Map([
      ['page:slug', '01-mod/by-slug.md'],
      ['id:42', '01-mod/by-id.md'],
    ]);
    assert.equal(
      findOldSyncPath({ page_url: 'slug', id: 42 }, map),
      '01-mod/by-slug.md',
    );
  });
});

describe('overwriteSkipReason', () => {
  let tmpDir;

  const existingFile = (name = 'test.md') => {
    const file = path.join(tmpDir, name);
    fs.writeFileSync(file, 'hand-written markdown');
    return file;
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pull-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes a file that does not exist yet', () => {
    assert.equal(
      overwriteSkipReason(
        path.join(tmpDir, 'nope.md'),
        { last_sync: '2020-01-01T00:00:00Z' },
        false,
      ),
      null,
    );
  });

  it('writes a file that has not been touched since the last sync', () => {
    // last_sync is in the future, so the file predates it
    assert.equal(
      overwriteSkipReason(
        existingFile(),
        { last_sync: '2099-01-01T00:00:00Z' },
        false,
      ),
      null,
    );
  });

  it('skips a file modified since the last sync', () => {
    // last_sync is in the past, so the file was touched after it
    const reason = overwriteSkipReason(
      existingFile(),
      { last_sync: '2000-01-01T00:00:00Z' },
      false,
    );
    assert.match(reason, /locally modified since last sync/);
    assert.match(reason, /--force/);
  });

  it('skips an existing file when there is no sync state', () => {
    const reason = overwriteSkipReason(existingFile(), {}, false);
    assert.ok(reason, 'a file that cannot be judged must not be overwritten');
    assert.match(reason, /no sync state/);
    assert.match(reason, /--force/);
  });

  it('explains the missing sync state rather than claiming a local edit', () => {
    const reason = overwriteSkipReason(existingFile(), {}, false);
    assert.doesNotMatch(reason, /locally modified/);
  });

  it('treats a missing sync file the same as an empty one', () => {
    assert.ok(overwriteSkipReason(existingFile(), undefined, false));
    assert.ok(overwriteSkipReason(existingFile('other.md'), null, false));
  });

  it('still writes a missing file when there is no sync state', () => {
    // A first import onto an empty tree must work exactly as before.
    assert.equal(
      overwriteSkipReason(path.join(tmpDir, 'new.md'), {}, false),
      null,
    );
  });

  it('overwrites everything under --force', () => {
    const file = existingFile();
    assert.equal(overwriteSkipReason(file, {}, true), null);
    assert.equal(
      overwriteSkipReason(file, { last_sync: '2000-01-01T00:00:00Z' }, true),
      null,
    );
  });
});

describe('courseHasMarkdown', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pull-course-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('is false for a missing directory', () => {
    assert.equal(courseHasMarkdown(path.join(tmpDir, 'absent')), false);
  });

  it('is false for an empty course directory', () => {
    assert.equal(courseHasMarkdown(tmpDir), false);
  });

  it('finds markdown nested in a module folder', () => {
    fs.mkdirSync(path.join(tmpDir, '01-intro'));
    fs.writeFileSync(path.join(tmpDir, '01-intro', '01-page.md'), '# hi');
    assert.equal(courseHasMarkdown(tmpDir), true);
  });

  it('ignores non-markdown files', () => {
    fs.writeFileSync(path.join(tmpDir, '_category_.json'), '{}');
    assert.equal(courseHasMarkdown(tmpDir), false);
  });
});

describe('createPullFileResolver', () => {
  it('resolves a Canvas file URL to a relative path', () => {
    const canvasToLocal = new Map([
      ['/courses/1/files/100/preview', '01-mod/_files/image.png'],
    ]);
    const resolver = createPullFileResolver(
      1,
      '01-mod/01-page.md',
      canvasToLocal,
    );
    const result = resolver('/courses/1/files/100/preview');
    assert.equal(result, './_files/image.png');
  });

  it('returns null for non-Canvas URLs', () => {
    const resolver = createPullFileResolver(1, '01-mod/01-page.md', new Map());
    assert.equal(resolver('https://example.com/image.png'), null);
  });

  it('returns null for unknown file IDs', () => {
    const resolver = createPullFileResolver(1, '01-mod/01-page.md', new Map());
    assert.equal(resolver('/courses/1/files/999/preview'), null);
  });

  it('returns null for empty href', () => {
    const resolver = createPullFileResolver(1, '01-mod/01-page.md', new Map());
    assert.equal(resolver(''), null);
    assert.equal(resolver(null), null);
  });

  it('handles absolute Canvas URLs with domain', () => {
    const canvasToLocal = new Map([
      ['/courses/1/files/50/preview', '01-mod/_files/doc.pdf'],
    ]);
    const resolver = createPullFileResolver(
      1,
      '01-mod/01-page.md',
      canvasToLocal,
    );
    const result = resolver(
      'https://canvas.example.com/courses/1/files/50/download?wrap=1',
    );
    assert.equal(result, './_files/doc.pdf');
  });

  it('resolves cross-directory file references', () => {
    const canvasToLocal = new Map([
      ['/courses/1/files/10/preview', '02-other/_files/shared.png'],
    ]);
    const resolver = createPullFileResolver(
      1,
      '01-mod/01-page.md',
      canvasToLocal,
    );
    const result = resolver('/courses/1/files/10/preview');
    assert.equal(result, '../02-other/_files/shared.png');
  });
});

describe('pullStrategies', () => {
  it('Page strategy extracts page_url as id', () => {
    assert.equal(pullStrategies.Page.getId({ page_url: 'my-page' }), 'my-page');
  });

  it('Page strategy builds sync entry with page_url', () => {
    const entry = pullStrategies.Page.buildSyncEntry(
      { page_url: 'my-page' },
      { page_id: 42, url: 'my-page' },
    );
    assert.deepEqual(entry, {
      canvas_id: 42,
      canvas_type: 'page',
      page_url: 'my-page',
    });
  });

  it('Page strategy falls back to url when page_id is missing', () => {
    const entry = pullStrategies.Page.buildSyncEntry(
      { page_url: 'slug' },
      { url: 'slug' },
    );
    assert.equal(entry.canvas_id, 'slug');
  });

  it('Assignment strategy extracts content_id as id', () => {
    assert.equal(pullStrategies.Assignment.getId({ content_id: 99 }), 99);
  });

  it('Assignment strategy builds sync entry', () => {
    const entry = pullStrategies.Assignment.buildSyncEntry({ content_id: 99 });
    assert.deepEqual(entry, { canvas_id: 99, canvas_type: 'assignment' });
  });

  it('ExternalUrl strategy has no fetch function', () => {
    assert.equal(pullStrategies.ExternalUrl.fetch, null);
  });

  it('ExternalUrl strategy builds sync entry with external_url', () => {
    const entry = pullStrategies.ExternalUrl.buildSyncEntry({
      id: 7,
      external_url: 'https://example.com',
    });
    assert.deepEqual(entry, {
      canvas_id: 7,
      canvas_type: 'external_url',
      external_url: 'https://example.com',
    });
  });
});
