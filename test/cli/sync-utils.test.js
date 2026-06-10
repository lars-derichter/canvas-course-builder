const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  itemKey,
  migrateV2toV3,
  ensureModuleEntry,
  findModuleEntryByFolder,
  removeItemFromOtherModules,
} = require('../../cli/sync-utils');

describe('itemKey', () => {
  it('keys pages and assignments on canvas_type + canvas_id', () => {
    assert.equal(itemKey('page', { canvasId: 'welcome' }), 'page:welcome');
    assert.equal(itemKey('assignment', { canvasId: 99 }), 'assignment:99');
    assert.equal(itemKey('file', { canvasId: 7 }), 'file:7');
  });

  it('keys external URLs on the URL (module-item ids change every push)', () => {
    assert.equal(
      itemKey('external_url', { canvasId: 42, externalUrl: 'https://example.com' }),
      'external_url:https://example.com'
    );
  });

  it('falls back to canvas_id for external_url without a URL', () => {
    assert.equal(itemKey('external_url', { canvasId: 42 }), 'external_url:42');
  });
});

describe('migrateV2toV3', () => {
  const V2 = {
    schema_version: 2,
    canvas_base_url: 'https://canvas.example.com',
    course_id: 42,
    modules: {
      '01-intro': {
        canvas_module_id: 100,
        items: {
          '01-intro/01-welcome.md': { canvas_id: 'welcome', canvas_type: 'page', page_url: 'welcome' },
          '01-intro/02-hw.md': { canvas_id: 500, canvas_type: 'assignment' },
          '01-intro/03-link.md': { canvas_id: 7, canvas_type: 'external_url', external_url: 'https://example.com' },
        },
      },
      '02-empty-shell': {
        items: {
          '02-empty-shell/01-x.md': { canvas_id: 'x', canvas_type: 'page' },
        },
      },
    },
    icons: { note: { canvas_file_id: 1 } },
    files: { '01-intro/_files/a.png': { canvas_file_id: 9, canvas_url: '/courses/42/files/9/preview' } },
    last_sync: '2026-01-01T00:00:00Z',
  };

  it('re-keys modules by canvas_module_id with folder as value', () => {
    const v3 = migrateV2toV3(V2);
    assert.equal(v3.schema_version, 3);
    assert.ok(v3.modules['100']);
    assert.equal(v3.modules['100'].folder, '01-intro');
  });

  it('re-keys items by identity with path as value', () => {
    const v3 = migrateV2toV3(V2);
    const items = v3.modules['100'].items;
    assert.equal(items['page:welcome'].path, '01-intro/01-welcome.md');
    assert.equal(items['page:welcome'].page_url, 'welcome');
    assert.equal(items['assignment:500'].path, '01-intro/02-hw.md');
    assert.equal(items['external_url:https://example.com'].path, '01-intro/03-link.md');
  });

  it('drops module entries without canvas_module_id', () => {
    const v3 = migrateV2toV3(V2);
    assert.equal(Object.keys(v3.modules).length, 1);
  });

  it('preserves icons, files, and base fields', () => {
    const v3 = migrateV2toV3(V2);
    assert.deepEqual(v3.icons, V2.icons);
    assert.deepEqual(v3.files, V2.files);
    assert.equal(v3.course_id, 42);
    assert.equal(v3.last_sync, '2026-01-01T00:00:00Z');
  });
});

describe('ensureModuleEntry', () => {
  it('creates a module entry and updates the folder on later calls', () => {
    const syncData = { modules: {} };
    const entry = ensureModuleEntry(syncData, 100, '01-intro');
    assert.deepEqual(entry, { folder: '01-intro', items: {} });

    ensureModuleEntry(syncData, 100, '02-intro-renamed');
    assert.equal(syncData.modules['100'].folder, '02-intro-renamed');
  });
});

describe('findModuleEntryByFolder', () => {
  it('finds an entry by stored folder name', () => {
    const syncData = { modules: { 100: { folder: '01-intro', items: {} } } };
    const [id, entry] = findModuleEntryByFolder(syncData, '01-intro');
    assert.equal(id, '100');
    assert.equal(entry.folder, '01-intro');
  });

  it('returns null when no entry matches', () => {
    const syncData = { modules: { 100: { folder: '01-intro', items: {} } } };
    assert.equal(findModuleEntryByFolder(syncData, '99-nope'), null);
  });
});

describe('removeItemFromOtherModules', () => {
  it('removes the key everywhere except the current module', () => {
    const syncData = {
      modules: {
        100: { folder: 'a', items: { 'page:x': { path: 'a/01-x.md' } } },
        200: { folder: 'b', items: { 'page:x': { path: 'b/01-x.md' } } },
      },
    };
    removeItemFromOtherModules(syncData, 'page:x', 200);
    assert.equal(syncData.modules['100'].items['page:x'], undefined);
    assert.ok(syncData.modules['200'].items['page:x']);
  });
});
