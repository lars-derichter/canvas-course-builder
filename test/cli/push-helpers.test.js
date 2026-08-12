const { describe, it, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const push = require('../../cli/push');

const {
  _buildFileResolver: buildFileResolver,
  _pageStrategy: pageStrategy,
  _assignmentStrategy: assignmentStrategy,
  _warnGradeImpact: warnGradeImpact,
  _collectUpdatedAssignments: collectUpdatedAssignments,
} = push;

describe('buildFileResolver', () => {
  const syncData = {
    canvas_base_url: 'https://canvas.example.com',
    files: {
      '01-mod/_files/image.png': {
        canvas_file_id: 100,
        canvas_url: '/courses/1/files/100/preview',
      },
      '02-other/_files/shared.pdf': {
        canvas_file_id: 200,
        canvas_url: '/courses/1/files/200/preview',
      },
    },
  };

  it('resolves a relative file path to a Canvas URL', () => {
    const resolver = buildFileResolver('01-mod/01-page.md', syncData);
    const result = resolver('./_files/image.png');
    assert.equal(
      result,
      'https://canvas.example.com/courses/1/files/100/preview',
    );
  });

  it('resolves cross-directory file references', () => {
    const resolver = buildFileResolver('01-mod/01-page.md', syncData);
    const result = resolver('../02-other/_files/shared.pdf');
    assert.equal(
      result,
      'https://canvas.example.com/courses/1/files/200/preview',
    );
  });

  it('returns null for external URLs', () => {
    const resolver = buildFileResolver('01-mod/01-page.md', syncData);
    assert.equal(resolver('https://example.com/image.png'), null);
  });

  it('returns null for .md links', () => {
    const resolver = buildFileResolver('01-mod/01-page.md', syncData);
    assert.equal(resolver('./02-setup.md'), null);
  });

  it('returns null for unknown files', () => {
    const resolver = buildFileResolver('01-mod/01-page.md', syncData);
    assert.equal(resolver('./_files/unknown.png'), null);
  });

  it('returns null for fragment-only links', () => {
    const resolver = buildFileResolver('01-mod/01-page.md', syncData);
    assert.equal(resolver('#section'), null);
  });

  it('returns null for empty or null href', () => {
    const resolver = buildFileResolver('01-mod/01-page.md', syncData);
    assert.equal(resolver(''), null);
    assert.equal(resolver(null), null);
  });
});

describe('pageStrategy', () => {
  it('builds options with title and body', () => {
    const opts = pageStrategy.buildOpts('My Page', '<p>Hello</p>', {});
    assert.deepEqual(opts, { title: 'My Page', body: '<p>Hello</p>' });
  });

  it('ignores frontmatter fields', () => {
    const opts = pageStrategy.buildOpts('Title', '<p>Body</p>', {
      points_possible: 10,
    });
    assert.deepEqual(opts, { title: 'Title', body: '<p>Body</p>' });
  });

  it('builds a Page module item', () => {
    const item = pageStrategy.buildModuleItem('My Page', 'my-page', 3, 0);
    assert.deepEqual(item, {
      title: 'My Page',
      type: 'Page',
      pageUrl: 'my-page',
      position: 3,
      indent: 0,
    });
  });

  it('extracts id preferring page_id', () => {
    assert.equal(pageStrategy.extractId({ page_id: 42, url: 'slug' }), 42);
  });

  it('falls back to url when page_id is missing', () => {
    assert.equal(pageStrategy.extractId({ url: 'slug' }), 'slug');
  });

  it('extracts slug from result', () => {
    assert.equal(
      pageStrategy.extractSlug({ url: 'my-page-slug' }),
      'my-page-slug',
    );
  });
});

describe('assignmentStrategy', () => {
  it('builds options with name and description', () => {
    const opts = assignmentStrategy.buildOpts(
      'My Assignment',
      '<p>Instructions</p>',
      {},
    );
    assert.deepEqual(opts, {
      name: 'My Assignment',
      description: '<p>Instructions</p>',
    });
  });

  it('maps frontmatter fields to assignment options', () => {
    const frontmatter = {
      points_possible: 100,
      submission_types: ['online_upload'],
      due_at: '2025-06-01T23:59:00Z',
      unlock_at: '2025-05-01T08:00:00Z',
      lock_at: '2025-06-08T23:59:00Z',
      published: true,
    };
    const opts = assignmentStrategy.buildOpts(
      'Title',
      '<p>Body</p>',
      frontmatter,
    );
    assert.equal(opts.pointsPossible, 100);
    assert.deepEqual(opts.submissionTypes, ['online_upload']);
    assert.equal(opts.dueAt, '2025-06-01T23:59:00Z');
    assert.equal(opts.unlockAt, '2025-05-01T08:00:00Z');
    assert.equal(opts.lockAt, '2025-06-08T23:59:00Z');
    assert.equal(opts.published, true);
  });

  it('omits optional fields when not in frontmatter', () => {
    const opts = assignmentStrategy.buildOpts('Title', '<p>Body</p>', {});
    assert.equal(opts.pointsPossible, undefined);
    assert.equal(opts.submissionTypes, undefined);
    assert.equal(opts.dueAt, undefined);
    assert.equal(opts.unlockAt, undefined);
    assert.equal(opts.lockAt, undefined);
    assert.equal(opts.published, undefined);
  });

  it('builds an Assignment module item', () => {
    const item = assignmentStrategy.buildModuleItem('My Assignment', 99, 2, 1);
    assert.deepEqual(item, {
      title: 'My Assignment',
      type: 'Assignment',
      contentId: 99,
      position: 2,
      indent: 1,
    });
  });

  it('extracts id from result', () => {
    assert.equal(assignmentStrategy.extractId({ id: 42 }), 42);
  });

  it('has no slug extraction', () => {
    assert.equal(assignmentStrategy.extractSlug, null);
  });
});

describe('collectUpdatedAssignments', () => {
  it('collects only the assignments Canvas already holds', () => {
    const updated = collectUpdatedAssignments([
      courseModule([
        assignmentItem({ canvas_id: 500, points_possible: 10 }),
        assignmentItem(
          { points_possible: 20 },
          { title: 'New', relativePath: '01-mod/04-new.md' },
        ),
        {
          canvasType: 'page',
          title: 'Intro',
          relativePath: '01-mod/01-intro.md',
          frontmatter: { canvas_id: 700 },
          position: 3,
        },
      ]),
    ]);

    assert.equal(updated.length, 1);
    assert.equal(updated[0].canvasId, 500);
    assert.equal(updated[0].relativePath, '01-mod/03-homework.md');
  });

  it('carries the options push itself would send', () => {
    const [entry] = collectUpdatedAssignments([
      courseModule([
        assignmentItem({
          canvas_id: 500,
          points_possible: 12,
          due_at: '2026-03-08T23:59:00Z',
          submission_types: ['online_url'],
        }),
      ]),
    ]);

    assert.equal(entry.opts.pointsPossible, 12);
    assert.equal(entry.opts.dueAt, '2026-03-08T23:59:00Z');
    assert.deepEqual(entry.opts.submissionTypes, ['online_url']);
  });

  it('looks inside subfolders', () => {
    const updated = collectUpdatedAssignments([
      courseModule([
        {
          type: 'subheader',
          title: 'Week 1',
          position: 1,
          indent: 0,
          items: [assignmentItem({ canvas_id: 501 })],
        },
      ]),
    ]);

    assert.equal(updated.length, 1);
    assert.equal(updated[0].canvasId, 501);
  });
});

describe('warnGradeImpact', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  /** Silence the warnings the helper logs on its way out. */
  function quiet() {
    mock.method(console, 'warn', () => {});
  }

  it('warns that a new denominator leaves the grades already given unscaled', async () => {
    quiet();
    const lines = await warnGradeImpact(
      42,
      [courseModule([assignmentItem({ canvas_id: 500, points_possible: 12 })])],
      async () => [canvasAssignment()],
    );

    assert.equal(lines.length, 1);
    assert.match(lines[0], /"Homework" \(01-mod\/03-homework\.md\)/);
    assert.match(lines[0], /has student submissions/);
    assert.match(lines[0], /changes points_possible from 10 to 12/);
    assert.match(lines[0], /does not rescale the grades already given/);
  });

  it('stays silent when the points possible are unchanged', async () => {
    quiet();
    const lines = await warnGradeImpact(
      42,
      [courseModule([assignmentItem({ canvas_id: 500, points_possible: 10 })])],
      async () => [canvasAssignment()],
    );

    assert.deepEqual(lines, []);
  });

  it('warns that a new due date re-runs the late policy', async () => {
    quiet();
    const lines = await warnGradeImpact(
      42,
      [
        courseModule([
          assignmentItem({ canvas_id: 500, due_at: '2026-03-08T23:59:00Z' }),
        ]),
      ],
      async () => [canvasAssignment()],
    );

    assert.equal(lines.length, 1);
    assert.match(
      lines[0],
      /changes due_at from 2026-03-01T23:59:00Z to 2026-03-08T23:59:00Z/,
    );
    assert.match(lines[0], /recomputes late status/);
  });

  it('reads a due date as an instant, not as a string', async () => {
    quiet();
    const lines = await warnGradeImpact(
      42,
      [
        courseModule([
          assignmentItem({
            canvas_id: 500,
            due_at: new Date('2026-03-02T00:59:00+01:00'),
          }),
        ]),
      ],
      async () => [canvasAssignment()],
    );

    assert.deepEqual(lines, [], 'the same moment, written differently');
  });

  it('warns that Canvas ignores a submission type change once work is in', async () => {
    quiet();
    const lines = await warnGradeImpact(
      42,
      [
        courseModule([
          assignmentItem({
            canvas_id: 500,
            submission_types: ['online_text_entry'],
          }),
        ]),
      ],
      async () => [canvasAssignment()],
    );

    assert.equal(lines.length, 1);
    assert.match(
      lines[0],
      /changes submission_types from online_upload to online_text_entry/,
    );
    assert.match(lines[0], /it ignores this one/);
    assert.match(lines[0], /reports the push as a success/);
  });

  it('says nothing about an assignment without student submissions', async () => {
    quiet();
    const lines = await warnGradeImpact(
      42,
      [
        courseModule([
          assignmentItem({
            canvas_id: 500,
            points_possible: 12,
            due_at: '2026-03-08T23:59:00Z',
            submission_types: ['online_text_entry'],
          }),
        ]),
      ],
      async () => [canvasAssignment({ has_submitted_submissions: false })],
    );

    assert.deepEqual(lines, []);
  });

  it('hedges when the submission state could not be read', async () => {
    quiet();
    const lines = await warnGradeImpact(
      42,
      [courseModule([assignmentItem({ canvas_id: 500, points_possible: 12 })])],
      async () => [canvasAssignment({ has_submitted_submissions: undefined })],
    );

    assert.equal(lines.length, 1);
    assert.match(lines[0], /could not determine whether/);
    assert.match(lines[0], /Treat it as if it does/);
  });

  it('warns once per changed field', async () => {
    quiet();
    const lines = await warnGradeImpact(
      42,
      [
        courseModule([
          assignmentItem({
            canvas_id: 500,
            points_possible: 12,
            due_at: '2026-03-08T23:59:00Z',
            submission_types: ['online_text_entry'],
          }),
        ]),
      ],
      async () => [canvasAssignment()],
    );

    assert.equal(lines.length, 3);
  });

  it('looks the whole course up once however many assignments are pushed', async () => {
    quiet();
    let calls = 0;
    const lines = await warnGradeImpact(
      42,
      [
        courseModule([
          assignmentItem({ canvas_id: 500, points_possible: 12 }),
          assignmentItem(
            { canvas_id: 501, points_possible: 12 },
            { title: 'Second', relativePath: '01-mod/04-second.md' },
          ),
        ]),
        courseModule(
          [
            assignmentItem(
              { canvas_id: 502, points_possible: 12 },
              { title: 'Third', relativePath: '02-mod/03-third.md' },
            ),
          ],
          '02-mod',
        ),
      ],
      async () => {
        calls++;
        return [
          canvasAssignment(),
          canvasAssignment({ id: 501 }),
          canvasAssignment({ id: 502 }),
        ];
      },
    );

    assert.equal(calls, 1);
    assert.equal(lines.length, 3);
  });

  it('makes no request when no assignment exists on Canvas yet', async () => {
    quiet();
    const lines = await warnGradeImpact(
      42,
      [
        courseModule([
          assignmentItem({ points_possible: 12 }),
          {
            canvasType: 'page',
            title: 'Intro',
            relativePath: '01-mod/01-intro.md',
            frontmatter: { canvas_id: 700 },
            position: 2,
          },
        ]),
      ],
      async () => {
        throw new Error('the assignment lookup should not have run');
      },
    );

    assert.deepEqual(lines, []);
  });

  it('leaves an assignment Canvas no longer lists alone', async () => {
    quiet();
    const lines = await warnGradeImpact(
      42,
      [courseModule([assignmentItem({ canvas_id: 999, points_possible: 12 })])],
      async () => [canvasAssignment()],
    );

    assert.deepEqual(lines, []);
  });

  it('degrades to a warning when the lookup fails, and lets the push run', async () => {
    const warned = mock.method(console, 'warn', () => {});
    const lines = await warnGradeImpact(
      42,
      [courseModule([assignmentItem({ canvas_id: 500, points_possible: 12 })])],
      async () => {
        throw new Error('403 Forbidden');
      },
    );

    assert.deepEqual(lines, [], 'a failed lookup warns instead of throwing');
    assert.equal(warned.mock.callCount(), 1);
    assert.match(warned.mock.calls[0].arguments[0], /could not check/);
    assert.match(warned.mock.calls[0].arguments[0], /403 Forbidden/);
  });
});

/** A scanned module, shaped as scanCourse returns it. */
function courseModule(items, folderName = '01-mod') {
  return {
    folderName,
    moduleName: 'Module',
    position: 1,
    items,
  };
}

/** A scanned assignment item carrying the given frontmatter. */
function assignmentItem(frontmatter, overrides = {}) {
  return {
    canvasType: 'assignment',
    title: 'Homework',
    relativePath: '01-mod/03-homework.md',
    frontmatter,
    position: 1,
    indent: 0,
    ...overrides,
  };
}

/** A Canvas Assignment object as a list response returns it. */
function canvasAssignment(overrides = {}) {
  return {
    id: 500,
    has_submitted_submissions: true,
    points_possible: 10,
    due_at: '2026-03-01T23:59:00Z',
    submission_types: ['online_upload'],
    ...overrides,
  };
}
