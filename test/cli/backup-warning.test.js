const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  BACKUP_DOC,
  confirmFirstPush,
  confirmForcedPull,
  describeContents,
} = require('../../cli/backup-warning');

describe('describeContents', () => {
  it('summarises the counts that are non-zero', () => {
    const summary = describeContents({
      modules: 3,
      pages: 12,
      assignments: 0,
      files: 1,
    });
    assert.equal(summary, '3 modules, 12 pages, 1 file');
  });

  it('returns an empty string for an empty course', () => {
    assert.equal(
      describeContents({ modules: 0, pages: 0, assignments: 0, files: 0 }),
      '',
    );
  });
});

describe('confirmFirstPush', () => {
  const counts = { modules: 2, pages: 5, assignments: 1, files: 0 };
  const never = () => {
    throw new Error('fetchCounts should not have been called');
  };

  it('never asks on a dry run', async () => {
    const ok = await confirmFirstPush({
      courseId: 1,
      syncData: { modules: {} },
      dryRun: true,
      fetchCounts: never,
    });
    assert.equal(ok, true);
  });

  it('never asks once the course is already tracked', async () => {
    const ok = await confirmFirstPush({
      courseId: 1,
      syncData: { modules: { 42: { folder: '01-intro', items: {} } } },
      dryRun: false,
      fetchCounts: never,
    });
    assert.equal(ok, true);
  });

  it('proceeds when the Canvas course is empty', async () => {
    const ok = await confirmFirstPush({
      courseId: 1,
      syncData: { modules: {} },
      dryRun: false,
      fetchCounts: async () => ({
        modules: 0,
        pages: 0,
        assignments: 0,
        files: 0,
      }),
    });
    assert.equal(ok, true);
  });

  it('proceeds when the pre-flight check fails', async () => {
    const ok = await confirmFirstPush({
      courseId: 1,
      syncData: { modules: {} },
      dryRun: false,
      fetchCounts: async () => {
        throw new Error('network down');
      },
    });
    assert.equal(ok, true, 'a failed check must not block a legitimate push');
  });

  it('cancels when the answer is not "y"', async () => {
    const ok = await withStdin('n\n', () =>
      confirmFirstPush({
        courseId: 1,
        syncData: { modules: {} },
        dryRun: false,
        fetchCounts: async () => counts,
      }),
    );
    assert.equal(ok, false);
  });

  it('continues when the answer is "y"', async () => {
    const ok = await withStdin('y\n', () =>
      confirmFirstPush({
        courseId: 1,
        syncData: { modules: {} },
        dryRun: false,
        fetchCounts: async () => counts,
      }),
    );
    assert.equal(ok, true);
  });
});

describe('confirmForcedPull', () => {
  // A prompt with no stdin behind it would hang, so any test that reaches one
  // without withStdin() would time out rather than pass by accident.
  it('does not ask on an ordinary pull', async () => {
    const ok = await confirmForcedPull({
      syncData: {},
      force: false,
      hasLocalContent: true,
    });
    assert.equal(ok, true);
  });

  it('does not ask when --force has sync state to compare against', async () => {
    const ok = await confirmForcedPull({
      syncData: { last_sync: '2026-01-01T00:00:00Z' },
      force: true,
      hasLocalContent: true,
    });
    assert.equal(ok, true);
  });

  it('does not ask when --force lands on an empty tree', async () => {
    const ok = await confirmForcedPull({
      syncData: {},
      force: true,
      hasLocalContent: false,
    });
    assert.equal(ok, true, 'a first import must stay scriptable');
  });

  it('asks when --force meets an authored course with no sync state', async () => {
    const ok = await withStdin('y\n', () =>
      confirmForcedPull({
        syncData: {},
        force: true,
        hasLocalContent: true,
      }),
    );
    assert.equal(ok, true);
  });

  it('cancels when the answer is not "y"', async () => {
    const ok = await withStdin('n\n', () =>
      confirmForcedPull({
        syncData: {},
        force: true,
        hasLocalContent: true,
      }),
    );
    assert.equal(ok, false);
  });
});

describe('BACKUP_DOC', () => {
  it('points at a guide that exists', () => {
    const fs = require('fs');
    const path = require('path');
    const doc = path.join(__dirname, '..', '..', BACKUP_DOC);
    assert.ok(fs.existsSync(doc), `Expected ${BACKUP_DOC} to exist`);
  });
});

/**
 * Run a function with stdin replaced by a readable stream of `input`, so the
 * readline prompt resolves without a terminal.
 */
async function withStdin(input, fn) {
  const { Readable } = require('stream');
  const original = Object.getOwnPropertyDescriptor(process, 'stdin');
  const fake = Readable.from([input]);
  fake.isTTY = false;
  Object.defineProperty(process, 'stdin', {
    value: fake,
    configurable: true,
  });
  try {
    return await fn();
  } finally {
    Object.defineProperty(process, 'stdin', original);
  }
}
