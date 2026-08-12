const { describe, it, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

// Set required env vars before requiring anything that loads the client.
process.env.CANVAS_API_URL = 'https://canvas.example.com';
process.env.CANVAS_API_TOKEN = 'test-token-123';

const {
  hasStudentSubmissions,
  getSubmissionStates,
} = require('../../lib/canvas/assignments');

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

describe('hasStudentSubmissions', () => {
  it('reports an assignment with submissions', () => {
    assert.equal(
      hasStudentSubmissions({ id: 1, has_submitted_submissions: true }),
      true,
    );
  });

  it('reports an assignment without submissions', () => {
    assert.equal(
      hasStudentSubmissions({ id: 1, has_submitted_submissions: false }),
      false,
    );
  });

  it('returns null when Canvas did not send the flag', () => {
    assert.equal(
      hasStudentSubmissions({ id: 1 }),
      null,
      'a missing flag is unknown, never "no submissions"',
    );
  });

  it('returns null for a missing assignment object', () => {
    assert.equal(hasStudentSubmissions(undefined), null);
    assert.equal(hasStudentSubmissions(null), null);
  });
});

describe('getSubmissionStates', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('maps every assignment id to its submission state in one request', async () => {
    const fetchMock = mock.method(global, 'fetch', async () =>
      fakeResponse([
        { id: 500, name: 'Graded', has_submitted_submissions: true },
        { id: 501, name: 'Untouched', has_submitted_submissions: false },
        { id: 502, name: 'No flag' },
      ]),
    );

    const states = await getSubmissionStates(42);

    assert.equal(
      fetchMock.mock.calls.length,
      1,
      'one list call answers it for the whole course',
    );
    assert.equal(states.get('500'), true);
    assert.equal(states.get('501'), false);
    assert.equal(states.get('502'), null);
  });

  it('keys the map by string so numeric sync-state ids match', async () => {
    mock.method(global, 'fetch', async () =>
      fakeResponse([{ id: 999, has_submitted_submissions: true }]),
    );

    const states = await getSubmissionStates(42);

    assert.equal(states.get(String(999)), true);
    assert.equal(states.has('123'), false, 'unlisted ids are simply absent');
  });

  it('propagates a failed lookup instead of reporting no submissions', async () => {
    mock.method(console, 'log', () => {});
    // 403 is not retryable, so this is the permissions case, not a slow retry.
    mock.method(global, 'fetch', async () =>
      fakeResponse({ message: 'forbidden' }, { status: 403 }),
    );

    await assert.rejects(() => getSubmissionStates(42), /403/);
  });
});
