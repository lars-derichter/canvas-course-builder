const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

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

describe('export label wiring', () => {
  // buildCombinedMarkdown falls back to getLabels(meta.lang) when the caller
  // passes no label set, which resolves the language but silently drops any
  // per-label override from course.config.yml. Overrides then show in the
  // preview and not in the PDF. Running the real export needs pandoc, so pin
  // the wiring at the source, as the VS Code extension tests do.
  const source = fs.readFileSync(
    path.join(__dirname, '..', '..', 'cli', 'export.js'),
    'utf8',
  );

  it('hands the resolved labels to buildCombinedMarkdown', () => {
    const call = source.slice(
      source.indexOf('buildCombinedMarkdown(mode.groups'),
    );
    const ctx = call.slice(0, call.indexOf('});'));
    assert.match(ctx, /^\s*labels,$/m);
  });
});
