const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const pull = require('../../cli/pull');

const {
  _buildIdentifierMap: buildIdentifierMap,
  _findOldSyncPath: findOldSyncPath,
  _isLocallyModified: isLocallyModified,
  _createPullFileResolver: createPullFileResolver,
  _pullStrategies: pullStrategies,
} = pull;

describe('buildIdentifierMap', () => {
  it('maps page_url to relative path', () => {
    const items = { 'page:42': { path: '01-mod/01-page.md', page_url: 'my-page', canvas_id: 42 } };
    const map = buildIdentifierMap(items);
    assert.equal(map.get('page:my-page'), '01-mod/01-page.md');
  });

  it('maps external_url to relative path', () => {
    const items = { 'external_url:https://example.com': { path: '01-mod/02-link.md', external_url: 'https://example.com', canvas_id: 5 } };
    const map = buildIdentifierMap(items);
    assert.equal(map.get('url:https://example.com'), '01-mod/02-link.md');
  });

  it('maps canvas_id to relative path', () => {
    const items = { 'assignment:99': { path: '01-mod/03-assign.md', canvas_id: 99 } };
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
    assert.equal(findOldSyncPath({ page_url: 'my-page' }, map), '01-mod/01-page.md');
  });

  it('finds by external_url', () => {
    const map = new Map([['url:https://example.com', '01-mod/02-link.md']]);
    assert.equal(findOldSyncPath({ external_url: 'https://example.com' }, map), '01-mod/02-link.md');
  });

  it('finds by _resolvedPageId', () => {
    const map = new Map([['id:42', '01-mod/01-page.md']]);
    assert.equal(findOldSyncPath({ _resolvedPageId: 42 }, map), '01-mod/01-page.md');
  });

  it('finds by content_id', () => {
    const map = new Map([['id:99', '01-mod/03-assign.md']]);
    assert.equal(findOldSyncPath({ content_id: 99 }, map), '01-mod/03-assign.md');
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
    assert.equal(findOldSyncPath({ page_url: 'slug', id: 42 }, map), '01-mod/by-slug.md');
  });
});

describe('isLocallyModified', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pull-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns false if file does not exist', () => {
    assert.equal(isLocallyModified(path.join(tmpDir, 'nope.md'), { last_sync: '2020-01-01T00:00:00Z' }), false);
  });

  it('returns false if no last_sync', () => {
    const file = path.join(tmpDir, 'test.md');
    fs.writeFileSync(file, 'hello');
    assert.equal(isLocallyModified(file, {}), false);
  });

  it('returns true if file is newer than last_sync', () => {
    const file = path.join(tmpDir, 'test.md');
    fs.writeFileSync(file, 'hello');
    // last_sync is in the past
    assert.equal(isLocallyModified(file, { last_sync: '2000-01-01T00:00:00Z' }), true);
  });

  it('returns false if file is older than last_sync', () => {
    const file = path.join(tmpDir, 'test.md');
    fs.writeFileSync(file, 'hello');
    // last_sync is in the future
    assert.equal(isLocallyModified(file, { last_sync: '2099-01-01T00:00:00Z' }), false);
  });
});

describe('createPullFileResolver', () => {
  it('resolves a Canvas file URL to a relative path', () => {
    const canvasToLocal = new Map([
      ['/courses/1/files/100/preview', '01-mod/_files/image.png'],
    ]);
    const resolver = createPullFileResolver(1, '01-mod/01-page.md', canvasToLocal);
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
    const resolver = createPullFileResolver(1, '01-mod/01-page.md', canvasToLocal);
    const result = resolver('https://canvas.example.com/courses/1/files/50/download?wrap=1');
    assert.equal(result, './_files/doc.pdf');
  });

  it('resolves cross-directory file references', () => {
    const canvasToLocal = new Map([
      ['/courses/1/files/10/preview', '02-other/_files/shared.png'],
    ]);
    const resolver = createPullFileResolver(1, '01-mod/01-page.md', canvasToLocal);
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
      { page_id: 42, url: 'my-page' }
    );
    assert.deepEqual(entry, { canvas_id: 42, canvas_type: 'page', page_url: 'my-page' });
  });

  it('Page strategy falls back to url when page_id is missing', () => {
    const entry = pullStrategies.Page.buildSyncEntry(
      { page_url: 'slug' },
      { url: 'slug' }
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
    const entry = pullStrategies.ExternalUrl.buildSyncEntry(
      { id: 7, external_url: 'https://example.com' }
    );
    assert.deepEqual(entry, {
      canvas_id: 7,
      canvas_type: 'external_url',
      external_url: 'https://example.com',
    });
  });
});
