const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { toFolderName, toFileName, toFileItemName, computeRelativePath } = require('../../cli/naming');

describe('toFolderName', () => {
  it('creates a numbered folder name from name and position', () => {
    assert.equal(toFolderName('Introduction', 1), '01-introduction');
  });

  it('pads position to two digits', () => {
    assert.equal(toFolderName('Module', 12), '12-module');
  });

  it('replaces special characters with hyphens', () => {
    assert.equal(toFolderName('Hello & World!', 3), '03-hello-world');
  });

  it('handles multi-word names', () => {
    assert.equal(toFolderName('My New Module', 2), '02-my-new-module');
  });

  it('strips leading and trailing hyphens', () => {
    assert.equal(toFolderName('--test--', 1), '01-test');
  });
});

describe('toFileName', () => {
  it('creates a numbered markdown filename', () => {
    assert.equal(toFileName('Welcome', 1), '01-welcome.md');
  });

  it('handles multi-word titles', () => {
    assert.equal(toFileName('Getting Started Guide', 5), '05-getting-started-guide.md');
  });

  it('replaces special characters', () => {
    assert.equal(toFileName('What is C++?', 3), '03-what-is-c.md');
  });
});

describe('toFileItemName', () => {
  it('preserves file extension', () => {
    assert.equal(toFileItemName('diagram.svg', 3), '03-diagram.svg');
  });

  it('lowercases the entire name', () => {
    assert.equal(toFileItemName('Photo.JPEG', 1), '01-photo.jpeg');
  });

  it('preserves multiple dots in name', () => {
    assert.equal(toFileItemName('archive.tar.gz', 2), '02-archive.tar.gz');
  });

  it('handles spaces in filenames', () => {
    assert.equal(toFileItemName('my file.pdf', 4), '04-my-file.pdf');
  });
});

describe('computeRelativePath', () => {
  it('computes posix-style relative path within a module folder', () => {
    const courseDir = '/abs/course';
    const filePath = '/abs/course/01-intro/01-page.md';
    assert.equal(computeRelativePath('01-intro', filePath, courseDir), '01-intro/01-page.md');
  });

  it('handles subfolder paths', () => {
    const courseDir = '/abs/course';
    const filePath = '/abs/course/01-intro/02-sub/01-file.md';
    assert.equal(computeRelativePath('01-intro', filePath, courseDir), '01-intro/02-sub/01-file.md');
  });
});
