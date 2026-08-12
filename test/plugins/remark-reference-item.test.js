const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const remarkReferenceItem = require('../../src/plugins/remark-reference-item');

/** Helper: build a root tree with optional children. */
function makeTree(children = []) {
  return { type: 'root', children };
}

/** Helper: build a minimal vfile with frontMatter data. */
function makeVfile(frontMatter) {
  return { data: { frontMatter } };
}

/** Helper: run the plugin transform on a tree with given frontmatter. */
function transform(tree, frontMatter, options) {
  const plugin = remarkReferenceItem(options);
  plugin(tree, makeVfile(frontMatter));
  return tree;
}

/** Helper: the value of a JSX attribute on a node. */
function attr(node, name) {
  const found = node.attributes.find((a) => a.name === name);
  return found && found.value;
}

/** The Canvas address the plugin should never invent for itself. */
const CANVAS = { canvasBaseUrl: 'https://canvas.example.com', courseId: 42 };

describe('remarkReferenceItem', () => {
  let tmpDir;
  const savedEnv = {};

  beforeEach(() => {
    // The plugin falls back to the environment and to .canvas-sync.json, so
    // every test starts from a project with neither.
    for (const key of ['CANVAS_API_URL', 'CANVAS_COURSE_ID']) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reference-item-test-'));
    remarkReferenceItem._clearCache();
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
    remarkReferenceItem._clearCache();
  });

  it('replaces the body of a quiz page with a card and a notice', () => {
    const tree = makeTree([
      {
        type: 'paragraph',
        children: [{ type: 'text', value: 'Some body text.' }],
      },
    ]);
    transform(
      tree,
      { canvas_type: 'quiz', quiz_ref: 'quizzes/01-week.zip' },
      {
        projectDir: tmpDir,
      },
    );

    assert.equal(tree.children.length, 2);
    const [card, notice] = tree.children;
    assert.equal(card.type, 'mdxJsxFlowElement');
    assert.equal(card.name, 'div');
    assert.equal(attr(card, 'className'), 'reference-item-card');
    assert.equal(attr(notice, 'className'), 'reference-item-notice');
    assert.match(notice.children[0].value, /managed in Canvas/);
  });

  it('names the type on the card', () => {
    const quiz = makeTree([]);
    transform(quiz, { canvas_type: 'quiz' }, { projectDir: tmpDir });
    const quizLabel = quiz.children[0].children[0];
    assert.equal(attr(quizLabel, 'className'), 'reference-item-label');
    assert.equal(quizLabel.children[0].value, 'Quiz');

    const tool = makeTree([]);
    transform(tool, { canvas_type: 'external_tool' }, { projectDir: tmpDir });
    assert.equal(
      tool.children[0].children[0].children[0].value,
      'External tool',
    );
  });

  it('links an external tool to its launch URL', () => {
    const url = 'https://tool.example.com/lti/launch?resource=7';
    const tree = makeTree([]);
    transform(
      tree,
      { canvas_type: 'external_tool', external_url: url, new_tab: true },
      { projectDir: tmpDir },
    );

    const linkParagraph = tree.children[0].children[1];
    assert.equal(attr(linkParagraph, 'className'), 'reference-item-link');

    const link = linkParagraph.children[0];
    assert.equal(link.type, 'mdxJsxTextElement');
    assert.equal(link.name, 'a');
    assert.equal(attr(link, 'href'), url);
    assert.equal(attr(link, 'target'), '_blank');
    assert.equal(attr(link, 'rel'), 'noopener noreferrer');
    assert.equal(link.children[0].value, url);
  });

  it('links a quiz to its Canvas page', () => {
    const tree = makeTree([]);
    transform(
      tree,
      { canvas_type: 'quiz', quiz_ref: 'quizzes/01-week.zip', canvas_id: 987 },
      { ...CANVAS, projectDir: tmpDir },
    );

    const link = tree.children[0].children[1].children[0];
    assert.equal(
      attr(link, 'href'),
      'https://canvas.example.com/courses/42/quizzes/987',
    );
    assert.equal(link.children[0].value, 'Open in Canvas');
  });

  it('trims an /api/v1 suffix off the Canvas address', () => {
    const tree = makeTree([]);
    transform(
      tree,
      { canvas_type: 'quiz', canvas_id: 5 },
      {
        canvasBaseUrl: 'https://canvas.example.com/api/v1/',
        courseId: '42',
        projectDir: tmpDir,
      },
    );

    const link = tree.children[0].children[1].children[0];
    assert.equal(
      attr(link, 'href'),
      'https://canvas.example.com/courses/42/quizzes/5',
    );
  });

  it('takes the Canvas address from the environment', () => {
    process.env.CANVAS_API_URL = 'https://canvas.example.com';
    process.env.CANVAS_COURSE_ID = '42';

    const tree = makeTree([]);
    transform(
      tree,
      { canvas_type: 'quiz', canvas_id: 12 },
      { projectDir: tmpDir },
    );

    const link = tree.children[0].children[1].children[0];
    assert.equal(
      attr(link, 'href'),
      'https://canvas.example.com/courses/42/quizzes/12',
    );
  });

  it('takes the Canvas address from the sync state', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.canvas-sync.json'),
      JSON.stringify({
        schema_version: 3,
        canvas_base_url: 'https://canvas.example.com/api/v1',
        course_id: 42,
      }),
    );

    const tree = makeTree([]);
    transform(
      tree,
      { canvas_type: 'quiz', canvas_id: 12 },
      { projectDir: tmpDir },
    );

    const link = tree.children[0].children[1].children[0];
    assert.equal(
      attr(link, 'href'),
      'https://canvas.example.com/courses/42/quizzes/12',
    );
  });

  // Without Canvas credentials the preview still has to build, so an
  // unresolvable address leaves the card unlinked rather than guessing one.
  it('renders the card unlinked when no Canvas address is known', () => {
    const tree = makeTree([]);
    transform(
      tree,
      { canvas_type: 'quiz', canvas_id: 12 },
      { projectDir: tmpDir },
    );

    assert.equal(tree.children.length, 2);
    assert.equal(tree.children[0].children.length, 1);
    assert.equal(
      attr(tree.children[0].children[0], 'className'),
      'reference-item-label',
    );
  });

  it('renders the card unlinked when the sync state addresses no course', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.canvas-sync.json'),
      JSON.stringify({ schema_version: 3, canvas_base_url: '', course_id: 0 }),
    );

    const tree = makeTree([]);
    transform(
      tree,
      { canvas_type: 'quiz', canvas_id: 12 },
      { projectDir: tmpDir },
    );

    assert.equal(tree.children[0].children.length, 1);
  });

  it('renders the card unlinked when the sync state is corrupt', () => {
    fs.writeFileSync(path.join(tmpDir, '.canvas-sync.json'), '{ not json');

    const tree = makeTree([]);
    transform(
      tree,
      { canvas_type: 'quiz', canvas_id: 12 },
      { projectDir: tmpDir },
    );

    assert.equal(tree.children[0].children.length, 1);
  });

  it('renders the card unlinked for a quiz that was never pushed', () => {
    const tree = makeTree([]);
    transform(
      tree,
      { canvas_type: 'quiz', quiz_ref: 'quizzes/01-week.zip' },
      { ...CANVAS, projectDir: tmpDir },
    );

    assert.equal(tree.children[0].children.length, 1);
    assert.equal(tree.children[1].children[0].value.length > 0, true);
  });

  it('renders the card unlinked for a tool without a launch URL', () => {
    const tree = makeTree([]);
    transform(
      tree,
      { canvas_type: 'external_tool' },
      { ...CANVAS, projectDir: tmpDir },
    );

    assert.equal(tree.children[0].children.length, 1);
    assert.equal(
      tree.children[0].children[0].children[0].value,
      'External tool',
    );
  });

  it('renders the label groups it is given', () => {
    const tree = makeTree([]);
    transform(
      tree,
      { canvas_type: 'quiz', canvas_id: 3 },
      {
        ...CANVAS,
        projectDir: tmpDir,
        cards: { quiz: 'Quiz (NL)' },
        reference: { notice: 'Beheerd in Canvas.', open: 'Openen in Canvas' },
      },
    );

    const [card, notice] = tree.children;
    assert.equal(card.children[0].children[0].value, 'Quiz (NL)');
    assert.equal(
      card.children[1].children[0].children[0].value,
      'Openen in Canvas',
    );
    assert.equal(notice.children[0].value, 'Beheerd in Canvas.');
  });

  it('leaves other canvas types unchanged', () => {
    for (const canvasType of ['page', 'assignment', 'external_url', 'file']) {
      const tree = makeTree([
        { type: 'paragraph', children: [{ type: 'text', value: 'Hello.' }] },
      ]);
      transform(tree, { canvas_type: canvasType }, { projectDir: tmpDir });

      assert.equal(tree.children.length, 1, canvasType);
      assert.equal(tree.children[0].type, 'paragraph', canvasType);
    }
  });

  it('leaves pages without canvas_type unchanged', () => {
    const tree = makeTree([
      { type: 'paragraph', children: [{ type: 'text', value: 'Hello.' }] },
    ]);
    transform(tree, { title: 'Some page' }, { projectDir: tmpDir });

    assert.equal(tree.children.length, 1);
    assert.equal(tree.children[0].type, 'paragraph');
  });

  it('leaves pages without frontmatter unchanged', () => {
    const tree = makeTree([
      { type: 'paragraph', children: [{ type: 'text', value: 'Hello.' }] },
    ]);

    const plugin = remarkReferenceItem({ projectDir: tmpDir });
    plugin(tree, { data: {} });

    assert.equal(tree.children.length, 1);
    assert.equal(tree.children[0].type, 'paragraph');
  });

  it('removes all existing body content', () => {
    const tree = makeTree([
      { type: 'paragraph', children: [{ type: 'text', value: 'First.' }] },
      {
        type: 'heading',
        depth: 2,
        children: [{ type: 'text', value: 'Heading' }],
      },
    ]);
    transform(tree, { canvas_type: 'quiz' }, { projectDir: tmpDir });

    assert.equal(tree.children.length, 2);
    assert.equal(tree.children[0].name, 'div');
    assert.equal(tree.children[1].name, 'p');
  });
});
