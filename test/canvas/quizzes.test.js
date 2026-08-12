const { describe, it, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

// Set required env vars before requiring anything that loads the client.
process.env.CANVAS_API_URL = 'https://canvas.example.com';
process.env.CANVAS_API_TOKEN = 'test-token-123';

const quizzes = require('../../lib/canvas/quizzes');
const { listQuizzes } = quizzes;

/**
 * Helper: create a fake Response object compatible with the fetch API.
 */
function fakeResponse(body, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

/** Record every request and answer them all with the same body. */
function mockFetch(body = []) {
  const calls = [];
  mock.method(global, 'fetch', async (url, opts) => {
    calls.push({ url, method: opts.method });
    return fakeResponse(body);
  });
  return calls;
}

describe('listQuizzes', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('lists the quizzes of a course', async () => {
    const calls = mockFetch([{ id: 12, title: 'Test 1' }]);
    const result = await listQuizzes(42);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'GET');
    assert.equal(
      calls[0].url,
      'https://canvas.example.com/api/v1/courses/42/quizzes',
    );
    assert.deepEqual(result, [{ id: 12, title: 'Test 1' }]);
  });
});

describe('the quizzes module surface', () => {
  it('offers no way to create, update or delete a quiz', () => {
    // The questions and the submissions behind a quiz cannot be rebuilt from
    // anything in this repo, so the write side is absent by design, not
    // merely unused.
    assert.deepEqual(Object.keys(quizzes), ['listQuizzes']);
  });
});
