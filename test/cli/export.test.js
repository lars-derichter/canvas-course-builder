const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { exportSlug } = require('../../cli/export');
const { getLabels } = require('../../lib/config/labels');

describe('exportSlug', () => {
  const labels = getLabels('en');

  it('slugs a course title', () => {
    assert.equal(
      exportSlug('Programming Fundamentals', labels),
      'programming-fundamentals',
    );
  });

  it('strips accents and punctuation', () => {
    assert.equal(
      exportSlug('Résumé du cours (2526)', labels),
      'resume-du-cours-2526',
    );
  });

  it('falls back to the course label when the title slugs to nothing', () => {
    // slugify keeps only [a-z0-9], so a non-Latin title has nothing to keep.
    assert.equal(exportSlug('数据结构', labels), 'course');
    assert.equal(exportSlug('🎓', getLabels('nl')), 'cursus');
  });

  it('falls back to a literal when the label is overridden to nothing', () => {
    const odd = getLabels('en', { export: { course_title: '📘' } });
    assert.equal(exportSlug('🎓', odd), 'course');
  });

  it('caps a long title without leaving a trailing hyphen', () => {
    const slug = exportSlug('word '.repeat(100), labels);
    assert.ok(slug.length <= 100, `too long: ${slug.length}`);
    assert.doesNotMatch(slug, /-$/);
  });
});
