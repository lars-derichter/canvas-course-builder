const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { scanCourse } = require('../../lib/convert/course-scanner');
const { _validateModules: validateModules } = require('../../cli/validate');

let tmpDir;
let moduleDir;

/**
 * Run validate over the temp course tree.
 */
function run() {
  return validateModules(scanCourse(tmpDir), tmpDir);
}

/**
 * Write a file inside the module folder, creating parent folders as needed.
 */
function writeItem(relativePath, content) {
  const target = path.join(moduleDir, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

describe('validateModules — file items', () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-test-'));
    moduleDir = path.join(tmpDir, '01-module');
    fs.mkdirSync(moduleDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('accepts a file wrapper whose file_ref exists', () => {
    writeItem('_files/syllabus.pdf', 'binary');
    writeItem(
      '01-syllabus.md',
      '---\ntitle: Syllabus\ncanvas_type: file\nfile_ref: _files/syllabus.pdf\n---\n',
    );

    const { errors, warnings } = run();
    assert.deepEqual(errors, []);
    assert.deepEqual(warnings, []);
  });

  it('reports a file wrapper without a file_ref', () => {
    writeItem(
      '01-syllabus.md',
      '---\ntitle: Syllabus\ncanvas_type: file\n---\n',
    );

    const { errors } = run();
    assert.deepEqual(errors, [
      '01-module/01-syllabus.md: file type requires a file_ref field',
    ]);
  });

  it('reports a file wrapper whose file_ref target is missing', () => {
    writeItem(
      '01-syllabus.md',
      '---\ntitle: Syllabus\ncanvas_type: file\nfile_ref: _files/missing.pdf\n---\n',
    );

    const { errors } = run();
    assert.deepEqual(errors, [
      '01-module/01-syllabus.md: file_ref not found: _files/missing.pdf',
    ]);
  });

  it('resolves file_ref relative to the wrapper, not the course root', () => {
    fs.mkdirSync(path.join(moduleDir, '02-section'), { recursive: true });
    writeItem('02-section/_files/handout.pdf', 'binary');
    writeItem(
      '02-section/01-handout.md',
      '---\ntitle: Handout\ncanvas_type: file\nfile_ref: _files/handout.pdf\n---\n',
    );

    const { errors } = run();
    assert.deepEqual(errors, []);
  });

  it('skips raw binaries dropped in a module folder', () => {
    writeItem('slides.pptx', 'binary');

    const { errors, warnings } = run();
    assert.deepEqual(errors, []);
    assert.deepEqual(warnings, []);
  });

  it('accepts canvas_type: file as a known type', () => {
    writeItem('_files/syllabus.pdf', 'binary');
    writeItem(
      '01-syllabus.md',
      '---\ntitle: Syllabus\ncanvas_type: file\nfile_ref: _files/syllabus.pdf\n---\n',
    );

    const { errors } = run();
    assert.equal(
      errors.some((e) => e.includes('unknown canvas_type')),
      false,
    );
  });

  it('still reports an unknown canvas_type', () => {
    writeItem('01-mystery.md', '---\ntitle: Mystery\ncanvas_type: quiz\n---\n');

    const { errors } = run();
    assert.equal(errors.length, 1);
    assert.match(
      errors[0],
      /^01-module\/01-mystery\.md: unknown canvas_type "quiz" \(expected: /,
    );
  });

  it('validates a file wrapper like any other item', () => {
    writeItem('_files/syllabus.pdf', 'binary');
    writeItem(
      'syllabus.md',
      '---\ntitle: Syllabus\ncanvas_type: file\nfile_ref: _files/syllabus.pdf\n---\n\nSee [the intro](./99-nope.md).\n',
    );

    const { errors, warnings } = run();
    assert.deepEqual(warnings, [
      '01-module/syllabus.md: filename should start with a two-digit prefix',
    ]);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /broken link to "\.\/99-nope\.md"/);
  });
});
