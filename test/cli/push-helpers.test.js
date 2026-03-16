const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const push = require('../../cli/push');

const {
  _buildFileResolver: buildFileResolver,
  _pageStrategy: pageStrategy,
  _assignmentStrategy: assignmentStrategy,
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
    assert.equal(result, 'https://canvas.example.com/courses/1/files/100/preview');
  });

  it('resolves cross-directory file references', () => {
    const resolver = buildFileResolver('01-mod/01-page.md', syncData);
    const result = resolver('../02-other/_files/shared.pdf');
    assert.equal(result, 'https://canvas.example.com/courses/1/files/200/preview');
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
    const opts = pageStrategy.buildOpts('Title', '<p>Body</p>', { points_possible: 10 });
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
    assert.equal(pageStrategy.extractSlug({ url: 'my-page-slug' }), 'my-page-slug');
  });
});

describe('assignmentStrategy', () => {
  it('builds options with name and description', () => {
    const opts = assignmentStrategy.buildOpts('My Assignment', '<p>Instructions</p>', {});
    assert.deepEqual(opts, { name: 'My Assignment', description: '<p>Instructions</p>' });
  });

  it('maps frontmatter fields to assignment options', () => {
    const frontmatter = {
      points_possible: 100,
      submission_types: ['online_upload'],
      due_at: '2025-06-01T23:59:00Z',
      published: true,
    };
    const opts = assignmentStrategy.buildOpts('Title', '<p>Body</p>', frontmatter);
    assert.equal(opts.pointsPossible, 100);
    assert.deepEqual(opts.submissionTypes, ['online_upload']);
    assert.equal(opts.dueAt, '2025-06-01T23:59:00Z');
    assert.equal(opts.published, true);
  });

  it('omits optional fields when not in frontmatter', () => {
    const opts = assignmentStrategy.buildOpts('Title', '<p>Body</p>', {});
    assert.equal(opts.pointsPossible, undefined);
    assert.equal(opts.submissionTypes, undefined);
    assert.equal(opts.dueAt, undefined);
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
