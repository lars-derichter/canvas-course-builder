const { describe, it, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');

// Set required env vars before requiring anything that loads the client.
process.env.CANVAS_API_URL = 'https://canvas.example.com';
process.env.CANVAS_API_TOKEN = 'test-token-123';
process.env.CANVAS_COURSE_ID = '42';

const resetCanvas = require('../../cli/reset-canvas');

const {
  _partitionAssignments: partitionAssignments,
  _quizSkipNotice: quizSkipNotice,
} = resetCanvas;

/** A Canvas Assignment object as the course's assignment list returns it. */
function assignment(overrides = {}) {
  return {
    id: 500,
    name: 'Homework',
    has_submitted_submissions: false,
    is_quiz_assignment: false,
    ...overrides,
  };
}

/** The assignment Canvas keeps for a graded Classic Quiz. */
function quizAssignment(overrides = {}) {
  return assignment({
    id: 833216,
    name: 'Test 1',
    is_quiz_assignment: true,
    quiz_id: 245808,
    submission_types: ['online_quiz'],
    ...overrides,
  });
}

describe('partitionAssignments', () => {
  it('keeps the assignment that fronts a quiz out of the deletions', () => {
    const { deletable, quizBacked } = partitionAssignments([
      assignment({ id: 500 }),
      quizAssignment(),
      assignment({ id: 501, name: 'Essay' }),
    ]);

    assert.deepEqual(
      deletable.map((a) => a.id),
      [500, 501],
    );
    assert.deepEqual(
      quizBacked.map((a) => a.id),
      [833216],
      'deleting this one would delete the quiz, its questions and its submissions',
    );
  });

  it('splits nothing out of a course without quizzes', () => {
    const { deletable, quizBacked } = partitionAssignments([assignment()]);

    assert.equal(deletable.length, 1);
    assert.deepEqual(quizBacked, []);
  });

  it('handles an empty or missing list', () => {
    assert.deepEqual(partitionAssignments([]), {
      deletable: [],
      quizBacked: [],
    });
    assert.deepEqual(partitionAssignments(undefined), {
      deletable: [],
      quizBacked: [],
    });
  });
});

describe('quizSkipNotice', () => {
  it('says nothing when the course has no quiz assignments', () => {
    assert.equal(quizSkipNotice([]), null);
  });

  it('names the consequence, not just the count', () => {
    const notice = quizSkipNotice([quizAssignment()]);

    assert.match(notice, /^1 of the assignments/);
    assert.match(notice, /It is skipped/);
    assert.match(
      notice,
      /deletes the quiz, its questions and every submission/,
    );
  });

  it('agrees with more than one', () => {
    const notice = quizSkipNotice([quizAssignment(), quizAssignment()]);

    assert.match(notice, /^2 of the assignments/);
    assert.match(notice, /They are skipped/);
  });
});

describe('resetCanvas --dry-run', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  /** Run the command against a mocked course and return everything it printed. */
  async function run(assignments) {
    const logged = mock.method(console, 'log', () => {});
    const warned = mock.method(console, 'warn', () => {});
    mock.method(console, 'error', () => {});
    mockCanvas([
      { method: 'GET', path: '/pages', body: [] },
      { method: 'GET', path: '/files', body: [] },
      { method: 'GET', path: '/modules', body: [{ id: 9, name: 'Module' }] },
      { method: 'GET', path: '/assignments', body: assignments },
    ]);

    await resetCanvas({ dryRun: true });

    const said = (fn) => fn.mock.calls.map((c) => c.arguments[0]).join('\n');
    return { out: said(logged), warnings: said(warned) };
  }

  it('leaves the quiz assignment out of the count and says why', async () => {
    const { out } = await run([assignment(), quizAssignment()]);

    assert.match(
      out,
      /contains 1 module, 1 assignment\./,
      'the assignment that is really a quiz is not one of the deletions',
    );
    assert.match(out, /1 of the assignments on this course is the gradebook/);
    assert.match(out, /- Test 1 \(kept, with its quiz\)/);
  });

  it('promises only what it does', async () => {
    const { out } = await run([assignment()]);

    assert.match(
      out,
      /Classic quizzes, discussions, announcements and rubrics are left alone/,
    );
    assert.doesNotMatch(
      out,
      /gradebook half of a graded quiz/,
      'a course without quiz assignments hears nothing about them',
    );
  });

  it('counts no grades at stake on a quiz it is not deleting', async () => {
    const { out, warnings } = await run([
      assignment({ has_submitted_submissions: false }),
      quizAssignment({ has_submitted_submissions: true }),
    ]);

    assert.equal(
      warnings,
      '',
      'the skipped quiz puts no submissions at risk, so nothing warns about it',
    );
    assert.match(out, /The assignment has no student submissions\./);
  });

  it('says the course holds nothing to delete when only a quiz is left', async () => {
    const logged = mock.method(console, 'log', () => {});
    mock.method(console, 'warn', () => {});
    mockCanvas([
      { method: 'GET', path: '/pages', body: [] },
      { method: 'GET', path: '/files', body: [] },
      { method: 'GET', path: '/modules', body: [] },
      { method: 'GET', path: '/assignments', body: [quizAssignment()] },
    ]);

    await resetCanvas({ dryRun: true });

    const out = logged.mock.calls.map((c) => c.arguments[0]).join('\n');
    assert.match(out, /holds nothing this command deletes/);
    assert.doesNotMatch(
      out,
      /already empty/,
      'a course with a quiz in it is not empty',
    );
  });
});

/** A fake Response object compatible with the fetch API. */
function fakeResponse(body, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

/**
 * Answer Canvas requests from a route table of { method, path, body, status }.
 * An unrouted request gets a 400, so a missing route fails the test instead of
 * hanging on the client's retries.
 */
function mockCanvas(routes) {
  const calls = [];
  const remaining = routes.map((route) => ({ ...route }));
  mock.method(global, 'fetch', async (url, opts) => {
    calls.push({ url, method: opts.method });
    const index = remaining.findIndex(
      (route) => route.method === opts.method && url.includes(route.path),
    );
    if (index === -1) {
      return fakeResponse(
        { message: `unrouted ${opts.method} ${url}` },
        { status: 400 },
      );
    }
    const [route] = remaining.splice(index, 1);
    return fakeResponse(route.body, { status: route.status || 200 });
  });
  return calls;
}
