const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_CONFIG,
  defaultConfigFor,
  renderLemma,
  renderBody,
  serializePage,
  resolveLesson,
} = require('../../cli/build-glossary');
const { getLabels } = require('../../lib/config/labels');

const TERMS = [
  {
    term: 'variable',
    lesson: 1,
    kind: 'concept',
    synonyms: [],
    definition: 'A named box.',
  },
  {
    term: 'Scanner',
    lesson: 1,
    kind: 'code',
    synonyms: [],
    definition: 'Reads input.',
  },
  {
    term: 'instance variable',
    lesson: 2,
    kind: 'concept',
    synonyms: ['attribute', 'field'],
    definition: 'Data on an object.',
    note: 'A local variable never is.',
  },
  {
    term: 'boolean',
    lesson: 2,
    kind: 'code',
    synonyms: [],
    definition: 'true or false.',
  },
  {
    term: '&&',
    lesson: 2,
    kind: 'operator',
    synonyms: [],
    definition: 'Logical and.',
  },
];

describe('renderLemma', () => {
  it('renders a concept without backticks', () => {
    assert.equal(renderLemma(TERMS[0]), '- **variable**: A named box.');
  });

  it('wraps code and operator terms in backticks', () => {
    assert.equal(renderLemma(TERMS[1]), '- **`Scanner`**: Reads input.');
    assert.equal(renderLemma(TERMS[4]), '- **`&&`**: Logical and.');
  });

  it('lists synonyms in parentheses and appends the note as a final sentence', () => {
    assert.equal(
      renderLemma(TERMS[2]),
      '- **instance variable** (attribute, field): Data on an object. A local variable never is.',
    );
  });

  it('respects config.code_kinds', () => {
    const config = { ...DEFAULT_CONFIG, code_kinds: [] };
    assert.equal(renderLemma(TERMS[1], config), '- **Scanner**: Reads input.');
  });
});

describe('renderBody', () => {
  it('is cumulative: only includes terms up to the given lesson', () => {
    const body = renderBody(TERMS, 1);
    assert.match(body, /Scanner/);
    assert.match(body, /variable/);
    assert.doesNotMatch(body, /instance variable/);
    assert.doesNotMatch(body, /Operators/); // no operators yet at lesson 1
    assert.match(body, /after lesson 1/);
  });

  it('emits the operators section first, then the terms section', () => {
    const body = renderBody(TERMS, 2);
    const opIdx = body.indexOf('## Operators');
    const termIdx = body.indexOf('## Terms');
    assert.ok(opIdx !== -1 && termIdx !== -1);
    assert.ok(opIdx < termIdx, 'Operators should come before Terms');
  });

  it('sorts terms case-insensitively', () => {
    const body = renderBody(TERMS, 2);
    // Use the unique bolded lemma tokens to avoid substring collisions
    // (e.g. "variable" is a substring of "instance variable").
    const order = [
      '**`boolean`**',
      '**instance variable**',
      '**`Scanner`**',
      '**variable**',
    ].map((t) => body.indexOf(t));
    assert.ok(
      order.every((i) => i !== -1),
      'all lemmas present',
    );
    const sorted = [...order].sort((a, b) => a - b);
    assert.deepEqual(order, sorted);
  });

  it('uses configured intro and headings', () => {
    const config = {
      ...DEFAULT_CONFIG,
      intro: 'Dit is de woordenlijst na les {lesson}.',
      headings: { operators: 'Operatoren', terms: 'Termen' },
    };
    const body = renderBody(TERMS, 2, config);
    assert.match(body, /^Dit is de woordenlijst na les 2\./);
    assert.match(body, /## Operatoren/);
    assert.match(body, /## Termen/);
  });
});

describe('serializePage', () => {
  it('forces the quoted emoji title and defaults canvas_type', () => {
    const page = serializePage({}, 'BODY');
    assert.match(
      page,
      /^---\ntitle: "📘 Glossary"\ncanvas_type: "page"\n---\n\nBODY\n$/,
    );
  });

  it('preserves existing frontmatter such as canvas_id', () => {
    const page = serializePage(
      { title: 'old', canvas_type: 'page', canvas_id: 98765 },
      'BODY',
    );
    assert.match(page, /title: "📘 Glossary"/);
    assert.match(page, /canvas_id: 98765/);
  });

  it('uses the configured title', () => {
    const config = { ...DEFAULT_CONFIG, title: '📘 Woordenlijst' };
    const page = serializePage({}, 'BODY', config);
    assert.match(page, /title: "📘 Woordenlijst"/);
  });
});

describe('resolveLesson', () => {
  it('prefers a lesson frontmatter key on the page', () => {
    assert.equal(
      resolveLesson('05-anything', { lesson: 3 }, DEFAULT_CONFIG),
      3,
    );
  });

  it('falls back to the module numeric prefix by default', () => {
    assert.equal(resolveLesson('07-loops', {}, DEFAULT_CONFIG), 7);
  });

  it('applies a custom module_pattern', () => {
    const config = { ...DEFAULT_CONFIG, module_pattern: 'les(\\d+)' };
    assert.equal(resolveLesson('03-les1-de-slaapkamer', {}, config), 1);
  });

  it('returns null when no lesson number can be resolved', () => {
    const config = { ...DEFAULT_CONFIG, module_pattern: 'les(\\d+)' };
    assert.equal(resolveLesson('99-reference', {}, config), null);
  });
});

describe('defaultConfigFor', () => {
  it('keeps the English baseline in DEFAULT_CONFIG', () => {
    assert.equal(DEFAULT_CONFIG.title, '📘 Glossary');
    assert.equal(DEFAULT_CONFIG.headings.operators, 'Operators');
    assert.equal(DEFAULT_CONFIG.headings.terms, 'Terms');
    assert.match(DEFAULT_CONFIG.intro, /\{lesson\}/);
  });

  it('localizes the language strings for nl labels', () => {
    const config = defaultConfigFor(getLabels('nl'));
    assert.equal(config.title, '📘 Woordenlijst');
    assert.equal(config.headings.operators, 'Operatoren');
    assert.equal(config.headings.terms, 'Termen');
    assert.match(config.intro, /\{lesson\}/);
    // structural settings stay identical to the baseline
    assert.equal(config.page_pattern, DEFAULT_CONFIG.page_pattern);
    assert.deepEqual(config.kinds, DEFAULT_CONFIG.kinds);
  });
});
