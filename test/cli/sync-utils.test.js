const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  itemKey,
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

  it('keys quizzes on the quiz id, like a page', () => {
    // A quiz outlives the module item that links it, so the item id is not its
    // identity: prune and diff have to recognise it by the quiz it points at.
    assert.equal(itemKey('quiz', { canvasId: 12 }), 'quiz:12');
  });

  it('keys external URLs on the URL (module-item ids change every push)', () => {
    assert.equal(
      itemKey('external_url', {
        canvasId: 42,
        externalUrl: 'https://example.com',
      }),
      'external_url:https://example.com',
    );
  });

  it('falls back to canvas_id for external_url without a URL', () => {
    assert.equal(itemKey('external_url', { canvasId: 42 }), 'external_url:42');
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
