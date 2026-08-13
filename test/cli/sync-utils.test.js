const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  assertSyncMatchesEnv,
  buildPageUrlToPageId,
  itemKey,
  ensureModuleEntry,
  findModuleEntryByFolder,
  normaliseBaseUrl,
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

describe('normaliseBaseUrl', () => {
  it('strips trailing slashes and an /api/v1 suffix', () => {
    assert.equal(
      normaliseBaseUrl('https://school.instructure.com/'),
      'https://school.instructure.com',
    );
    assert.equal(
      normaliseBaseUrl('https://school.instructure.com/api/v1'),
      'https://school.instructure.com',
    );
    assert.equal(
      normaliseBaseUrl('https://school.instructure.com/api/v1/'),
      'https://school.instructure.com',
    );
  });

  it('handles a missing value', () => {
    assert.equal(normaliseBaseUrl(undefined), '');
    assert.equal(normaliseBaseUrl(''), '');
    assert.equal(normaliseBaseUrl(null), '');
  });
});

describe('assertSyncMatchesEnv', () => {
  const URL = 'https://school.instructure.com';

  /** Sync state as a course that has been pushed to leaves it. */
  function synced(overrides = {}) {
    return {
      schema_version: 3,
      canvas_base_url: URL,
      course_id: 45083,
      modules: { 100: { folder: '01-intro', items: {} } },
      ...overrides,
    };
  }

  it('accepts a file that describes the course in the environment', () => {
    const data = synced();
    assert.equal(
      assertSyncMatchesEnv(data, {
        CANVAS_COURSE_ID: '45083',
        CANVAS_API_URL: URL,
      }),
      data,
    );
  });

  it('accepts a course id given as a number against a string env var', () => {
    assert.doesNotThrow(() =>
      assertSyncMatchesEnv(synced({ course_id: 45083 }), {
        CANVAS_COURSE_ID: '45083',
        CANVAS_API_URL: URL,
      }),
    );
  });

  it('refuses a file describing a different course', () => {
    assert.throws(
      () =>
        assertSyncMatchesEnv(synced(), {
          CANVAS_COURSE_ID: '58155',
          CANVAS_API_URL: URL,
        }),
      (err) => {
        assert.match(err.message, /describes course 45083/);
        assert.match(err.message, /`\.env` names course 58155/);
        return true;
      },
    );
  });

  it('names the global file id in the refusal', () => {
    assert.throws(
      () =>
        assertSyncMatchesEnv(synced(), {
          CANVAS_COURSE_ID: '58155',
          CANVAS_API_URL: URL,
        }),
      // The one id that is not scoped to a course is the reason this is a
      // refusal rather than a warning; the message has to say so.
      /a file id is global/,
    );
  });

  it('offers both remedies', () => {
    assert.throws(
      () =>
        assertSyncMatchesEnv(synced(), {
          CANVAS_COURSE_ID: '58155',
          CANVAS_API_URL: URL,
        }),
      (err) => {
        assert.match(err.message, /point `\.env` back at the course/);
        assert.match(err.message, /npx course reset-sync-state/);
        assert.match(
          err.message,
          /creates everything fresh/,
          'the remedy has a consequence worth stating before it is followed',
        );
        return true;
      },
    );
  });

  it('refuses the same course id on a different Canvas instance', () => {
    assert.throws(
      () =>
        assertSyncMatchesEnv(synced(), {
          CANVAS_COURSE_ID: '45083',
          CANVAS_API_URL: 'https://other.instructure.com',
        }),
      /describes https:\/\/school\.instructure\.com/,
    );
  });

  it('reports both differences at once', () => {
    assert.throws(
      () =>
        assertSyncMatchesEnv(synced(), {
          CANVAS_COURSE_ID: '58155',
          CANVAS_API_URL: 'https://other.instructure.com',
        }),
      (err) => {
        assert.match(err.message, /describes course 45083/);
        assert.match(err.message, /and https:\/\/school\.instructure\.com/);
        return true;
      },
    );
  });

  it('ignores a base URL that differs only by punctuation', () => {
    assert.doesNotThrow(() =>
      assertSyncMatchesEnv(synced({ canvas_base_url: `${URL}/api/v1` }), {
        CANVAS_COURSE_ID: '45083',
        CANVAS_API_URL: `${URL}/`,
      }),
    );
  });

  it('adopts the environment when the file claims no course', () => {
    const data = synced({ course_id: 0, canvas_base_url: '' });

    assertSyncMatchesEnv(data, {
      CANVAS_COURSE_ID: '45083',
      CANVAS_API_URL: `${URL}/`,
    });

    assert.equal(
      data.course_id,
      45083,
      'a file written before the env var was set gains a claim, so the next ' +
        'save protects it like any other',
    );
    assert.equal(data.canvas_base_url, URL);
  });

  it('treats a missing course_id as no claim rather than a mismatch', () => {
    const data = synced();
    delete data.course_id;

    assert.doesNotThrow(() =>
      assertSyncMatchesEnv(data, {
        CANVAS_COURSE_ID: '45083',
        CANVAS_API_URL: URL,
      }),
    );
    assert.equal(data.course_id, 45083);
  });

  it('cannot be contradicted by an environment that names nothing', () => {
    const data = synced();

    assert.doesNotThrow(() => assertSyncMatchesEnv(data, {}));
    assert.equal(data.course_id, 45083, 'and the claim is left as it was');
    assert.equal(data.canvas_base_url, URL);
  });

  it('handles a null sync state', () => {
    assert.equal(assertSyncMatchesEnv(null, { CANVAS_COURSE_ID: '1' }), null);
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

describe('buildPageUrlToPageId', () => {
  it('maps every slug to its numeric page id', async () => {
    const map = await buildPageUrlToPageId(45083, async () => [
      { url: 'welcome', page_id: 4242 },
      { url: 'setup', page_id: 4243 },
    ]);

    assert.equal(map.get('welcome'), 4242);
    assert.equal(map.get('setup'), 4243);
    assert.equal(map.size, 2);
  });

  it('skips a page missing either half of the pair', async () => {
    const map = await buildPageUrlToPageId(45083, async () => [
      { url: 'welcome' },
      { page_id: 4243 },
      { url: 'setup', page_id: 4244 },
    ]);

    assert.deepEqual([...map.keys()], ['setup']);
  });

  it('returns an empty map when the course has no pages', async () => {
    assert.equal((await buildPageUrlToPageId(45083, async () => null)).size, 0);
  });

  it('lets the caller decide what a failed lookup costs', async () => {
    await assert.rejects(
      buildPageUrlToPageId(45083, async () => {
        throw new Error('403 Forbidden');
      }),
      /403 Forbidden/,
    );
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
