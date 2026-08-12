const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_LANGUAGE,
  LABEL_SETS,
  getLabels,
  validateOverrides,
  slugify,
} = require('../../lib/config/labels');

describe('LABEL_SETS', () => {
  it('defaults to en', () => {
    assert.equal(DEFAULT_LANGUAGE, 'en');
    assert.ok(LABEL_SETS.en);
    assert.ok(LABEL_SETS.nl);
  });

  it('every language covers the same keys as en', () => {
    const shape = LABEL_SETS.en;
    for (const [lang, set] of Object.entries(LABEL_SETS)) {
      assert.deepEqual(
        Object.keys(set).sort(),
        Object.keys(shape).sort(),
        `groups differ for "${lang}"`,
      );
      for (const group of Object.keys(shape)) {
        assert.deepEqual(
          Object.keys(set[group]).sort(),
          Object.keys(shape[group]).sort(),
          `keys differ for "${lang}.${group}"`,
        );
        for (const [key, value] of Object.entries(set[group])) {
          assert.equal(typeof value, 'string', `${lang}.${group}.${key}`);
          assert.ok(value.length > 0, `${lang}.${group}.${key} is empty`);
        }
      }
    }
  });

  it('is frozen', () => {
    LABEL_SETS.en.alerts.note = 'Changed'; // silently ignored in sloppy mode
    assert.equal(LABEL_SETS.en.alerts.note, 'Note');
  });
});

describe('getLabels', () => {
  it('returns the nl set', () => {
    const labels = getLabels('nl');
    assert.equal(labels.alerts.important, 'Belangrijk');
    assert.equal(labels.alerts.caution, 'Opgelet');
    assert.equal(labels.cards.external_url, 'Externe link');
    assert.equal(labels.cards.file, 'Bestand');
    assert.equal(labels.cards.external_tool, 'Externe tool');
    assert.equal(labels.reference.open, 'Openen in Canvas');
    assert.match(
      labels.reference.notice,
      /^Dit item wordt beheerd in Canvas\./,
    );
    assert.equal(labels.export.attachment, 'Bijlage:');
    assert.equal(labels.export.course_title, 'Cursus');
    assert.equal(labels.pull.untitled, 'Zonder titel');
    assert.equal(labels.glossary.title, '📘 Woordenlijst');
  });

  it('falls back to en for unknown languages', () => {
    const labels = getLabels('fr');
    assert.equal(labels.alerts.important, 'Important');
    assert.equal(labels.cards.file, 'File');
  });

  it('falls back to en when language is undefined', () => {
    assert.equal(getLabels().alerts.note, 'Note');
  });

  it('merges overrides over the selected set', () => {
    const labels = getLabels('nl', {
      alerts: { caution: 'Let op' },
      cards: { file: 'Document' },
    });
    assert.equal(labels.alerts.caution, 'Let op');
    assert.equal(labels.cards.file, 'Document');
    // untouched keys keep the set value
    assert.equal(labels.alerts.important, 'Belangrijk');
  });

  it('ignores unknown groups, unknown keys, and non-string values', () => {
    const labels = getLabels('en', {
      nonsense: { foo: 'bar' },
      alerts: { foo: 'bar', note: 42 },
    });
    assert.equal(labels.alerts.note, 'Note');
    assert.equal(labels.nonsense, undefined);
  });

  it('returns a fresh copy without mutating the built-in sets', () => {
    const labels = getLabels('nl', { alerts: { note: 'Aangepast' } });
    labels.alerts.tip = 'Mutated';
    assert.equal(LABEL_SETS.nl.alerts.note, 'Info');
    assert.equal(LABEL_SETS.nl.alerts.tip, 'Tip');
    assert.notEqual(labels.alerts, LABEL_SETS.nl.alerts);
  });
});

describe('validateOverrides', () => {
  it('accepts valid overrides and empty input', () => {
    assert.deepEqual(validateOverrides(), []);
    assert.deepEqual(validateOverrides({ alerts: { note: 'X' } }), []);
  });

  it('reports unknown groups and keys', () => {
    const problems = validateOverrides({
      nonsense: { foo: 'bar' },
      alerts: { foo: 'bar' },
    });
    assert.equal(problems.length, 2);
    assert.match(problems[0], /unknown label group "nonsense"/);
    assert.match(problems[1], /unknown label "alerts\.foo"/);
  });

  it('reports non-string values and non-mapping groups', () => {
    const problems = validateOverrides({
      alerts: { note: 42 },
      cards: 'nope',
    });
    assert.equal(problems.length, 2);
    assert.match(problems[0], /"alerts\.note" must be a string/);
    assert.match(problems[1], /group "cards" must be a mapping/);
  });
});

describe('slugify', () => {
  it('lowercases and keeps simple words', () => {
    assert.equal(slugify('Cursus'), 'cursus');
    assert.equal(slugify('Course'), 'course');
    assert.equal(slugify('Selection'), 'selection');
  });

  it('strips diacritics and collapses separators', () => {
    assert.equal(slugify('Résumé du cours'), 'resume-du-cours');
    assert.equal(slugify('  Vak: overzicht!  '), 'vak-overzicht');
  });
});
