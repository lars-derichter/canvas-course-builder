const { describe, it, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const push = require('../../cli/push');

const {
  _collectDeletedModules: collectDeletedModules,
  _collectDeletedItems: collectDeletedItems,
  _collectLocalClaims: collectLocalClaims,
  _isItemClaimed: isItemClaimed,
  _annotateSubmissions: annotateSubmissions,
  _describeDoomedItem: describeDoomedItem,
} = push;

describe('collectDeletedModules', () => {
  it('returns modules in sync state that no local folder claims', () => {
    const syncData = {
      modules: {
        100: { folder: '01-intro', items: {} },
        200: { folder: '02-setup', items: {} },
        300: { folder: '03-deleted', items: {} },
      },
    };
    const localModules = [
      { folderName: '01-intro' },
      { folderName: '02-setup' },
    ];

    const result = collectDeletedModules(syncData, localModules);

    assert.equal(result.length, 1);
    assert.equal(result[0].folder, '03-deleted');
    assert.equal(result[0].canvasModuleId, 300);
  });

  it('returns empty array when all sync modules exist locally', () => {
    const syncData = {
      modules: {
        100: { folder: '01-intro', items: {} },
      },
    };
    const localModules = [{ folderName: '01-intro' }];

    const result = collectDeletedModules(syncData, localModules);

    assert.equal(result.length, 0);
  });

  it('keeps a module claimed by folder name when it has no _category_ id', () => {
    const syncData = {
      modules: {
        200: { folder: '02-renamed-locally', items: {} },
      },
    };
    // Local folder matches the stored folder; no _category_.json id needed
    const localModules = [{ folderName: '02-renamed-locally' }];

    const result = collectDeletedModules(syncData, localModules);

    assert.equal(result.length, 0);
  });
});

describe('collectLocalClaims', () => {
  it('claims items by canvas_type and canvas_id from frontmatter', () => {
    const localModules = [
      {
        folderName: '01-intro',
        items: [
          {
            relativePath: '01-intro/01-a.md',
            canvasType: 'page',
            frontmatter: { canvas_id: 'welcome' },
          },
          {
            relativePath: '01-intro/02-b.md',
            canvasType: 'assignment',
            frontmatter: { canvas_id: 500 },
          },
        ],
      },
    ];

    const claims = collectLocalClaims(localModules);

    assert.ok(claims.has('page:welcome'));
    assert.ok(claims.has('assignment:500'));
  });

  it('claims external_url items by URL', () => {
    const localModules = [
      {
        folderName: '01-intro',
        items: [
          {
            relativePath: '01-intro/01-link.md',
            canvasType: 'external_url',
            frontmatter: { canvas_id: 42, external_url: 'http://example.com' },
          },
        ],
      },
    ];

    const claims = collectLocalClaims(localModules);

    assert.ok(claims.has('external_url:http://example.com'));
    assert.ok(claims.has('external_url:42'));
  });

  it('claims items nested in subheaders', () => {
    const localModules = [
      {
        folderName: '01-intro',
        items: [
          {
            type: 'subheader',
            title: 'Sub',
            items: [
              {
                relativePath: '01-intro/01-sub/01-n.md',
                canvasType: 'page',
                frontmatter: { canvas_id: 'nested' },
              },
            ],
          },
        ],
      },
    ];

    const claims = collectLocalClaims(localModules);

    assert.ok(claims.has('page:nested'));
  });
});

describe('isItemClaimed', () => {
  it('matches a page entry by canvas_id', () => {
    const entry = {
      canvas_id: 123,
      canvas_type: 'page',
      page_url: 'welcome',
      path: 'x.md',
    };
    assert.equal(isItemClaimed(entry, new Set(['page:123'])), true);
  });

  it('matches a page entry by page_url when frontmatter holds the slug', () => {
    const entry = {
      canvas_id: 123,
      canvas_type: 'page',
      page_url: 'welcome',
      path: 'x.md',
    };
    assert.equal(isItemClaimed(entry, new Set(['page:welcome'])), true);
  });

  it('matches an external_url entry by URL', () => {
    const entry = {
      canvas_id: 42,
      canvas_type: 'external_url',
      external_url: 'http://example.com',
      path: 'x.md',
    };
    assert.equal(
      isItemClaimed(entry, new Set(['external_url:http://example.com'])),
      true,
    );
  });

  it('does not match when nothing claims the identity', () => {
    const entry = {
      canvas_id: 123,
      canvas_type: 'page',
      page_url: 'welcome',
      path: 'x.md',
    };
    assert.equal(isItemClaimed(entry, new Set(['page:999'])), false);
  });
});

describe('collectDeletedItems', () => {
  it('returns items whose identity no local file claims', () => {
    const syncData = {
      modules: {
        100: {
          folder: '01-intro',
          items: {
            'page:welcome-page': {
              path: '01-intro/01-welcome.md',
              canvas_id: 'welcome-page',
              canvas_type: 'page',
              page_url: 'welcome-page',
            },
            'page:deleted-page': {
              path: '01-intro/02-deleted.md',
              canvas_id: 'deleted-page',
              canvas_type: 'page',
              page_url: 'deleted-page',
            },
            'assignment:500': {
              path: '01-intro/03-assignment.md',
              canvas_id: 500,
              canvas_type: 'assignment',
            },
          },
        },
      },
    };
    const localModules = [
      {
        folderName: '01-intro',
        items: [
          {
            relativePath: '01-intro/01-welcome.md',
            title: 'Welcome',
            canvasType: 'page',
            frontmatter: { canvas_id: 'welcome-page' },
          },
        ],
      },
    ];

    const result = collectDeletedItems(syncData, localModules);

    assert.equal(result.length, 2);
    const paths = result.map((r) => r.relativePath).sort();
    assert.deepStrictEqual(paths, [
      '01-intro/02-deleted.md',
      '01-intro/03-assignment.md',
    ]);
  });

  it('does NOT flag an item that was renamed locally (identity still claimed)', () => {
    const syncData = {
      modules: {
        100: {
          folder: '01-intro',
          items: {
            'page:welcome-page': {
              path: '01-intro/01-welcome.md',
              canvas_id: 'welcome-page',
              canvas_type: 'page',
              page_url: 'welcome-page',
            },
          },
        },
      },
    };
    // Same canvas_id, new path after a local rename/renumber
    const localModules = [
      {
        folderName: '01-intro',
        items: [
          {
            relativePath: '01-intro/05-hello.md',
            title: 'Hello',
            canvasType: 'page',
            frontmatter: { canvas_id: 'welcome-page' },
          },
        ],
      },
    ];

    const result = collectDeletedItems(syncData, localModules);

    assert.equal(result.length, 0);
  });

  it('skips modules without items in sync state', () => {
    const syncData = {
      modules: {
        100: { folder: '01-intro' },
      },
    };
    const localModules = [{ folderName: '01-intro', items: [] }];

    const result = collectDeletedItems(syncData, localModules);

    assert.equal(result.length, 0);
  });

  it('handles subfolder items correctly', () => {
    const syncData = {
      modules: {
        100: {
          folder: '01-intro',
          items: {
            'page:nested': {
              path: '01-intro/01-sub/01-nested.md',
              canvas_id: 'nested',
              canvas_type: 'page',
              page_url: 'nested',
            },
            'page:gone': {
              path: '01-intro/01-sub/02-gone.md',
              canvas_id: 'gone',
              canvas_type: 'page',
              page_url: 'gone',
            },
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
            items: [
              {
                relativePath: '01-intro/01-sub/01-nested.md',
                title: 'Nested',
                canvasType: 'page',
                frontmatter: { canvas_id: 'nested' },
              },
            ],
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
        100: {
          folder: '01-mod',
          items: {
            'page:slug': {
              path: '01-mod/01-page.md',
              canvas_id: 'slug',
              canvas_type: 'page',
              page_url: 'slug',
            },
            'assignment:200': {
              path: '01-mod/02-assign.md',
              canvas_id: 200,
              canvas_type: 'assignment',
            },
            'external_url:http://example.com': {
              path: '01-mod/03-link.md',
              canvas_id: 42,
              canvas_type: 'external_url',
              external_url: 'http://example.com',
            },
            'file:400': {
              path: '01-mod/04-doc.pdf',
              canvas_id: 400,
              canvas_type: 'file',
            },
          },
        },
      },
    };
    const localModules = [{ folderName: '01-mod', items: [] }];

    const result = collectDeletedItems(syncData, localModules);

    assert.equal(result.length, 4);
    const types = result.map((r) => r.canvasType).sort();
    assert.deepStrictEqual(types, [
      'assignment',
      'external_url',
      'file',
      'page',
    ]);
  });
});

describe('collectDeletedItems per type', () => {
  it('collects page items with pageUrl for deletion', () => {
    const syncData = {
      modules: {
        100: {
          folder: '01-mod',
          items: {
            'page:my-page': {
              path: '01-mod/01-page.md',
              canvas_id: 'my-page',
              canvas_type: 'page',
              page_url: 'my-page',
            },
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
        100: {
          folder: '01-mod',
          items: {
            'assignment:999': {
              path: '01-mod/01-hw.md',
              canvas_id: 999,
              canvas_type: 'assignment',
            },
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
        100: {
          folder: '01-mod',
          items: {
            'file:777': {
              path: '01-mod/doc.pdf',
              canvas_id: 777,
              canvas_type: 'file',
            },
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

  it('collects external_url items with moduleId and externalUrl for deletion', () => {
    const syncData = {
      modules: {
        100: {
          folder: '01-mod',
          items: {
            'external_url:http://example.com': {
              path: '01-mod/01-link.md',
              canvas_id: 42,
              canvas_type: 'external_url',
              external_url: 'http://example.com',
            },
          },
        },
      },
    };
    const localModules = [{ folderName: '01-mod', items: [] }];

    const items = collectDeletedItems(syncData, localModules);

    assert.equal(items.length, 1);
    assert.equal(items[0].canvasType, 'external_url');
    assert.equal(items[0].moduleId, 100);
    assert.equal(items[0].externalUrl, 'http://example.com');
  });
});

describe('annotateSubmissions', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  const states = new Map([
    ['500', true],
    ['501', false],
  ]);

  it('flags a doomed assignment that has student submissions', async () => {
    const items = [
      {
        relativePath: '01-mod/01-hw.md',
        canvasType: 'assignment',
        canvasId: 500,
      },
    ];

    await annotateSubmissions(42, items, async () => states);

    assert.equal(items[0].hasSubmissions, true);
  });

  it('does not flag a doomed assignment without submissions', async () => {
    const items = [
      {
        relativePath: '01-mod/02-hw.md',
        canvasType: 'assignment',
        canvasId: 501,
      },
    ];

    await annotateSubmissions(42, items, async () => states);

    assert.equal(items[0].hasSubmissions, false);
  });

  it('treats an assignment Canvas no longer lists as nothing left to lose', async () => {
    const items = [
      {
        relativePath: '01-mod/03-hw.md',
        canvasType: 'assignment',
        canvasId: 777,
      },
    ];

    await annotateSubmissions(42, items, async () => states);

    assert.equal(items[0].hasSubmissions, false);
  });

  it('marks the state unknown when the lookup fails', async () => {
    mock.method(console, 'warn', () => {});
    const items = [
      {
        relativePath: '01-mod/01-hw.md',
        canvasType: 'assignment',
        canvasId: 500,
      },
    ];

    await annotateSubmissions(42, items, async () => {
      throw new Error('403 Forbidden');
    });

    assert.equal(
      items[0].hasSubmissions,
      null,
      'a failed check must never read as "no submissions"',
    );
  });

  it('makes no request when no assignment is being deleted', async () => {
    const items = [
      {
        relativePath: '01-mod/01-page.md',
        canvasType: 'page',
        canvasId: 'slug',
      },
      { relativePath: '01-mod/doc.pdf', canvasType: 'file', canvasId: 400 },
    ];

    await annotateSubmissions(42, items, async () => {
      throw new Error('the submission lookup should not have run');
    });

    assert.equal(items[0].hasSubmissions, undefined);
    assert.equal(items[1].hasSubmissions, undefined);
  });

  it('looks the whole course up once for many doomed assignments', async () => {
    let calls = 0;
    const items = [
      {
        relativePath: '01-mod/01-hw.md',
        canvasType: 'assignment',
        canvasId: 500,
      },
      {
        relativePath: '01-mod/02-hw.md',
        canvasType: 'assignment',
        canvasId: 501,
      },
      {
        relativePath: '01-mod/01-page.md',
        canvasType: 'page',
        canvasId: 'slug',
      },
    ];

    await annotateSubmissions(42, items, async () => {
      calls++;
      return states;
    });

    assert.equal(calls, 1);
  });
});

describe('describeDoomedItem', () => {
  it('names the grades on an assignment that has submissions', () => {
    const line = describeDoomedItem({
      relativePath: '01-mod/01-hw.md',
      canvasType: 'assignment',
      hasSubmissions: true,
    });

    assert.match(line, /HAS STUDENT SUBMISSIONS/);
    assert.match(line, /gradebook column/);
    assert.match(line, /01-mod\/01-hw\.md/);
  });

  it('leaves an assignment without submissions unmarked', () => {
    const line = describeDoomedItem({
      relativePath: '01-mod/02-hw.md',
      canvasType: 'assignment',
      hasSubmissions: false,
    });

    assert.equal(line, '  - 01-mod/02-hw.md (assignment)');
  });

  it('says so when the submission status could not be determined', () => {
    const line = describeDoomedItem({
      relativePath: '01-mod/03-hw.md',
      canvasType: 'assignment',
      hasSubmissions: null,
    });

    assert.match(line, /SUBMISSION STATUS UNKNOWN/);
    assert.match(line, /assume grades will be lost/);
  });

  it('leaves other item types as they were', () => {
    assert.equal(
      describeDoomedItem({
        relativePath: '01-mod/01-page.md',
        canvasType: 'page',
      }),
      '  - 01-mod/01-page.md (page)',
    );
  });
});

describe('collectDeletedItems with multiple modules', () => {
  it('collects items across multiple modules', () => {
    const syncData = {
      modules: {
        100: {
          folder: '01-intro',
          items: {
            'page:page-1': {
              path: '01-intro/01-page.md',
              canvas_id: 'page-1',
              canvas_type: 'page',
            },
            'page:page-2': {
              path: '01-intro/02-deleted.md',
              canvas_id: 'page-2',
              canvas_type: 'page',
            },
          },
        },
        200: {
          folder: '02-setup',
          items: {
            'page:install': {
              path: '02-setup/01-install.md',
              canvas_id: 'install',
              canvas_type: 'page',
            },
            'assignment:300': {
              path: '02-setup/02-gone.md',
              canvas_id: 300,
              canvas_type: 'assignment',
            },
          },
        },
      },
    };
    const localModules = [
      {
        folderName: '01-intro',
        items: [
          {
            relativePath: '01-intro/01-page.md',
            title: 'Page',
            canvasType: 'page',
            frontmatter: { canvas_id: 'page-1' },
          },
        ],
      },
      {
        folderName: '02-setup',
        items: [
          {
            relativePath: '02-setup/01-install.md',
            title: 'Install',
            canvasType: 'page',
            frontmatter: { canvas_id: 'install' },
          },
        ],
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
        100: {
          folder: '01-intro',
          items: {
            'page:page-1': {
              path: '01-intro/01-deleted.md',
              canvas_id: 'page-1',
              canvas_type: 'page',
            },
          },
        },
        200: {
          folder: '02-setup',
          items: {
            'page:page-2': {
              path: '02-setup/01-deleted.md',
              canvas_id: 'page-2',
              canvas_type: 'page',
            },
          },
        },
      },
    };
    // Only filtering to 01-intro
    const filteredModules = [{ folderName: '01-intro', items: [] }];

    const result = collectDeletedItems(syncData, filteredModules);

    // Should only find the deleted item in 01-intro, not 02-setup
    assert.equal(result.length, 1);
    assert.equal(result[0].moduleIdKey, '100');
  });
});
