const { describe, it, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

// Set required env vars before requiring anything that loads the client.
process.env.CANVAS_API_URL = 'https://canvas.example.com';
process.env.CANVAS_API_TOKEN = 'test-token-123';

const {
  listDiscussions,
  getDiscussion,
  createDiscussion,
  updateDiscussion,
  deleteDiscussion,
  isGradedDiscussion,
  gradedDiscussionWarning,
} = require('../../lib/canvas/discussions');

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
function mockFetch(body = {}) {
  const calls = [];
  mock.method(global, 'fetch', async (url, opts) => {
    calls.push({
      url,
      method: opts.method,
      body: opts.body ? JSON.parse(opts.body) : null,
    });
    return fakeResponse(body);
  });
  return calls;
}

describe('discussion requests', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('lists the discussion topics of a course', async () => {
    const calls = mockFetch([]);
    await listDiscussions(42);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'GET');
    assert.equal(
      calls[0].url,
      'https://canvas.example.com/api/v1/courses/42/discussion_topics',
    );
  });

  it('gets a single topic by id', async () => {
    const calls = mockFetch({ id: 77 });
    await getDiscussion(42, 77);

    assert.equal(calls[0].method, 'GET');
    assert.equal(
      calls[0].url,
      'https://canvas.example.com/api/v1/courses/42/discussion_topics/77',
    );
  });

  it('creates a topic with its fields at the top level of the body', async () => {
    const calls = mockFetch({ id: 77 });
    await createDiscussion(42, {
      title: 'Week 1 debate',
      message: '<p>Hi</p>',
    });

    assert.equal(calls[0].method, 'POST');
    assert.equal(
      calls[0].url,
      'https://canvas.example.com/api/v1/courses/42/discussion_topics',
    );
    assert.deepEqual(calls[0].body, {
      title: 'Week 1 debate',
      message: '<p>Hi</p>',
    });
  });

  it('maps camelCase create options onto Canvas field names', async () => {
    const calls = mockFetch({ id: 77 });
    await createDiscussion(42, {
      title: 'Week 1 debate',
      message: '<p>Hi</p>',
      discussionType: 'threaded',
      published: true,
      delayedPostAt: '2026-03-01T08:00:00Z',
      lockAt: '2026-03-08T23:59:00Z',
      requireInitialPost: true,
    });

    assert.deepEqual(calls[0].body, {
      title: 'Week 1 debate',
      message: '<p>Hi</p>',
      discussion_type: 'threaded',
      published: true,
      delayed_post_at: '2026-03-01T08:00:00Z',
      lock_at: '2026-03-08T23:59:00Z',
      require_initial_post: true,
    });
  });

  it('leaves out the create fields the caller did not set', async () => {
    const calls = mockFetch({ id: 77 });
    await createDiscussion(42, { title: 'Bare' });

    assert.deepEqual(calls[0].body, { title: 'Bare' });
  });

  it('updates a topic with only the fields it was given', async () => {
    const calls = mockFetch({ id: 77 });
    await updateDiscussion(42, 77, {
      message: '<p>Rewritten</p>',
      requireInitialPost: false,
    });

    assert.equal(calls[0].method, 'PUT');
    assert.equal(
      calls[0].url,
      'https://canvas.example.com/api/v1/courses/42/discussion_topics/77',
    );
    assert.deepEqual(calls[0].body, {
      message: '<p>Rewritten</p>',
      require_initial_post: false,
    });
  });

  it('sends an empty update rather than inventing a title', async () => {
    const calls = mockFetch({ id: 77 });
    await updateDiscussion(42, 77, {});

    assert.deepEqual(calls[0].body, {});
  });

  it('deletes a topic', async () => {
    const calls = mockFetch({ id: 77 });
    await deleteDiscussion(42, 77);

    assert.equal(calls[0].method, 'DELETE');
    assert.equal(
      calls[0].url,
      'https://canvas.example.com/api/v1/courses/42/discussion_topics/77',
    );
  });
});

describe('isGradedDiscussion', () => {
  it('reads a topic with an assignment id as graded', () => {
    assert.equal(isGradedDiscussion({ id: 77, assignment_id: 900 }), true);
  });

  it('reads a topic carrying the whole assignment as graded', () => {
    assert.equal(
      isGradedDiscussion({
        id: 77,
        assignment: { id: 900, points_possible: 10 },
      }),
      true,
    );
  });

  it('reads an ungraded topic as ungraded', () => {
    assert.equal(isGradedDiscussion({ id: 77, assignment_id: null }), false);
    assert.equal(isGradedDiscussion({ id: 77 }), false);
  });

  it('handles a missing topic object', () => {
    assert.equal(isGradedDiscussion(undefined), false);
    assert.equal(isGradedDiscussion(null), false);
  });
});

describe('gradedDiscussionWarning', () => {
  it('says the grading settings live only in Canvas', () => {
    const line = gradedDiscussionWarning({
      id: 77,
      title: 'Week 1 debate',
      assignment_id: 900,
    });

    assert.match(line, /WARNING/);
    assert.match(line, /"Week 1 debate" is graded/);
    assert.match(line, /live only in Canvas/);
    assert.match(line, /not represented in the markdown file/);
  });

  it('names the topic by id when it has no title', () => {
    const line = gradedDiscussionWarning({ id: 77, assignment_id: 900 });
    assert.match(line, /discussion 77 is graded/);
  });

  it('stays silent about an ungraded topic', () => {
    assert.equal(
      gradedDiscussionWarning({ id: 77, title: 'Open thread' }),
      null,
    );
  });
});
