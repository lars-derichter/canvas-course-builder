const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const push = require('../../cli/push');

const { _collectDeletedModules: collectDeletedModules, _collectDeletedItems: collectDeletedItems, _deleteCanvasItemByType: deleteCanvasItemByType } = push;

describe('collectDeletedModules', () => {
  it('returns modules in sync state that do not exist locally', () => {
    const syncData = {
      modules: {
        '01-intro': { canvas_module_id: 100, items: {} },
        '02-setup': { canvas_module_id: 200, items: {} },
        '03-deleted': { canvas_module_id: 300, items: {} },
      },
    };
    const localModules = [{ folderName: '01-intro' }, { folderName: '02-setup' }];

    const result = collectDeletedModules(syncData, localModules);

    assert.equal(result.length, 1);
    assert.equal(result[0].folder, '03-deleted');
    assert.equal(result[0].canvasModuleId, 300);
  });

  it('returns empty array when all sync modules exist locally', () => {
    const syncData = {
      modules: {
        '01-intro': { canvas_module_id: 100, items: {} },
      },
    };
    const localModules = [{ folderName: '01-intro' }];

    const result = collectDeletedModules(syncData, localModules);

    assert.equal(result.length, 0);
  });

  it('skips modules without canvas_module_id', () => {
    const syncData = {
      modules: {
        '01-intro': { items: {} },
        '02-deleted': { canvas_module_id: 200, items: {} },
      },
    };
    const localModules = [];

    const result = collectDeletedModules(syncData, localModules);

    assert.equal(result.length, 1);
    assert.equal(result[0].folder, '02-deleted');
  });
});

describe('collectDeletedItems', () => {
  it('returns items in sync state that do not exist locally', () => {
    const syncData = {
      modules: {
        '01-intro': {
          canvas_module_id: 100,
          items: {
            '01-intro/01-welcome.md': { canvas_id: 'welcome-page', canvas_type: 'page', page_url: 'welcome-page' },
            '01-intro/02-deleted.md': { canvas_id: 'deleted-page', canvas_type: 'page', page_url: 'deleted-page' },
            '01-intro/03-assignment.md': { canvas_id: 500, canvas_type: 'assignment' },
          },
        },
      },
    };
    const localModules = [
      {
        folderName: '01-intro',
        items: [
          { relativePath: '01-intro/01-welcome.md', title: 'Welcome', canvasType: 'page' },
        ],
      },
    ];

    const result = collectDeletedItems(syncData, localModules);

    assert.equal(result.length, 2);
    const paths = result.map((r) => r.relativePath).sort();
    assert.deepStrictEqual(paths, ['01-intro/02-deleted.md', '01-intro/03-assignment.md']);
  });

  it('returns empty array when all sync items exist locally', () => {
    const syncData = {
      modules: {
        '01-intro': {
          canvas_module_id: 100,
          items: {
            '01-intro/01-welcome.md': { canvas_id: 'welcome-page', canvas_type: 'page' },
          },
        },
      },
    };
    const localModules = [
      {
        folderName: '01-intro',
        items: [
          { relativePath: '01-intro/01-welcome.md', title: 'Welcome', canvasType: 'page' },
        ],
      },
    ];

    const result = collectDeletedItems(syncData, localModules);

    assert.equal(result.length, 0);
  });

  it('skips modules without items in sync state', () => {
    const syncData = {
      modules: {
        '01-intro': { canvas_module_id: 100 },
      },
    };
    const localModules = [{ folderName: '01-intro', items: [] }];

    const result = collectDeletedItems(syncData, localModules);

    assert.equal(result.length, 0);
  });

  it('handles subfolder items correctly', () => {
    const syncData = {
      modules: {
        '01-intro': {
          canvas_module_id: 100,
          items: {
            '01-intro/01-sub/01-nested.md': { canvas_id: 'nested', canvas_type: 'page', page_url: 'nested' },
            '01-intro/01-sub/02-gone.md': { canvas_id: 'gone', canvas_type: 'page', page_url: 'gone' },
          },
        },
      },
    };
    const localModules = [
      {
        folderName: '01-intro',
        items: [
          {
            type: 'subheader',
            title: 'Sub',
            items: [{ relativePath: '01-intro/01-sub/01-nested.md', title: 'Nested', canvasType: 'page' }],
          },
        ],
      },
    ];

    const result = collectDeletedItems(syncData, localModules);

    assert.equal(result.length, 1);
    assert.equal(result[0].relativePath, '01-intro/01-sub/02-gone.md');
  });

  it('includes all item types', () => {
    const syncData = {
      modules: {
        '01-mod': {
          canvas_module_id: 100,
          items: {
            '01-mod/01-page.md': { canvas_id: 'slug', canvas_type: 'page', page_url: 'slug' },
            '01-mod/02-assign.md': { canvas_id: 200, canvas_type: 'assignment' },
            '01-mod/03-link.md': { canvas_id: 'http://example.com', canvas_type: 'external_url' },
            '01-mod/04-doc.pdf': { canvas_id: 400, canvas_type: 'file' },
          },
        },
      },
    };
    const localModules = [{ folderName: '01-mod', items: [] }];

    const result = collectDeletedItems(syncData, localModules);

    assert.equal(result.length, 4);
    const types = result.map((r) => r.canvasType).sort();
    assert.deepStrictEqual(types, ['assignment', 'external_url', 'file', 'page']);
  });
});

describe('collectDeletedItems per type', () => {
  it('collects page items with pageUrl for deletion', () => {
    const syncData = {
      modules: {
        '01-mod': {
          canvas_module_id: 100,
          items: {
            '01-mod/01-page.md': { canvas_id: 'my-page', canvas_type: 'page', page_url: 'my-page' },
          },
        },
      },
    };
    const localModules = [{ folderName: '01-mod', items: [] }];

    const items = collectDeletedItems(syncData, localModules);

    assert.equal(items.length, 1);
    assert.equal(items[0].canvasType, 'page');
    assert.equal(items[0].canvasId, 'my-page');
    assert.equal(items[0].pageUrl, 'my-page');
  });

  it('collects assignment items for deletion', () => {
    const syncData = {
      modules: {
        '01-mod': {
          canvas_module_id: 100,
          items: {
            '01-mod/01-hw.md': { canvas_id: 999, canvas_type: 'assignment' },
          },
        },
      },
    };
    const localModules = [{ folderName: '01-mod', items: [] }];

    const items = collectDeletedItems(syncData, localModules);

    assert.equal(items.length, 1);
    assert.equal(items[0].canvasType, 'assignment');
    assert.equal(items[0].canvasId, 999);
  });

  it('collects file items for deletion', () => {
    const syncData = {
      modules: {
        '01-mod': {
          canvas_module_id: 100,
          items: {
            '01-mod/doc.pdf': { canvas_id: 777, canvas_type: 'file' },
          },
        },
      },
    };
    const localModules = [{ folderName: '01-mod', items: [] }];

    const items = collectDeletedItems(syncData, localModules);

    assert.equal(items.length, 1);
    assert.equal(items[0].canvasType, 'file');
    assert.equal(items[0].canvasId, 777);
  });

  it('collects external_url items with moduleId for deletion', () => {
    const syncData = {
      modules: {
        '01-mod': {
          canvas_module_id: 100,
          items: {
            '01-mod/01-link.md': { canvas_id: 'http://example.com', canvas_type: 'external_url' },
          },
        },
      },
    };
    const localModules = [{ folderName: '01-mod', items: [] }];

    const items = collectDeletedItems(syncData, localModules);

    assert.equal(items.length, 1);
    assert.equal(items[0].canvasType, 'external_url');
    assert.equal(items[0].moduleId, 100);
  });
});

describe('collectDeletedItems with multiple modules', () => {
  it('collects items across multiple modules', () => {
    const syncData = {
      modules: {
        '01-intro': {
          canvas_module_id: 100,
          items: {
            '01-intro/01-page.md': { canvas_id: 'page-1', canvas_type: 'page' },
            '01-intro/02-deleted.md': { canvas_id: 'page-2', canvas_type: 'page' },
          },
        },
        '02-setup': {
          canvas_module_id: 200,
          items: {
            '02-setup/01-install.md': { canvas_id: 'install', canvas_type: 'page' },
            '02-setup/02-gone.md': { canvas_id: 300, canvas_type: 'assignment' },
          },
        },
      },
    };
    const localModules = [
      {
        folderName: '01-intro',
        items: [{ relativePath: '01-intro/01-page.md', title: 'Page', canvasType: 'page' }],
      },
      {
        folderName: '02-setup',
        items: [{ relativePath: '02-setup/01-install.md', title: 'Install', canvasType: 'page' }],
      },
    ];

    const result = collectDeletedItems(syncData, localModules);

    assert.equal(result.length, 2);
    assert.ok(result.some((r) => r.relativePath === '01-intro/02-deleted.md'));
    assert.ok(result.some((r) => r.relativePath === '02-setup/02-gone.md'));
  });

  it('only checks filtered modules', () => {
    const syncData = {
      modules: {
        '01-intro': {
          canvas_module_id: 100,
          items: {
            '01-intro/01-deleted.md': { canvas_id: 'page-1', canvas_type: 'page' },
          },
        },
        '02-setup': {
          canvas_module_id: 200,
          items: {
            '02-setup/01-deleted.md': { canvas_id: 'page-2', canvas_type: 'page' },
          },
        },
      },
    };
    // Only filtering to 01-intro
    const filteredModules = [{ folderName: '01-intro', items: [] }];

    const result = collectDeletedItems(syncData, filteredModules);

    // Should only find the deleted item in 01-intro, not 02-setup
    assert.equal(result.length, 1);
    assert.equal(result[0].folderName, '01-intro');
  });
});
