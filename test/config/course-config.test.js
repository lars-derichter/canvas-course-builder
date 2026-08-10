const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  CONFIG_FILENAME,
  loadCourseConfig,
  _clearCache,
} = require('../../lib/config/course-config');

describe('loadCourseConfig', () => {
  let tmpDir;
  let warnMock;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'course-config-test-'));
    warnMock = mock.method(console, 'warn', () => {});
    _clearCache();
  });

  afterEach(() => {
    warnMock.mock.restore();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    _clearCache();
  });

  function writeConfig(content) {
    fs.writeFileSync(path.join(tmpDir, CONFIG_FILENAME), content);
  }

  it('returns en defaults when the file is missing, without warning', () => {
    const config = loadCourseConfig(tmpDir);
    assert.equal(config.language, 'en');
    assert.equal(config.labels.alerts.important, 'Important');
    assert.equal(warnMock.mock.callCount(), 0);
  });

  it('returns en defaults for an empty file', () => {
    writeConfig('\n');
    const config = loadCourseConfig(tmpDir);
    assert.equal(config.language, 'en');
  });

  it('loads the nl set for language: nl', () => {
    writeConfig('language: nl\n');
    const config = loadCourseConfig(tmpDir);
    assert.equal(config.language, 'nl');
    assert.equal(config.labels.alerts.caution, 'Opgelet');
    assert.equal(config.labels.cards.file, 'Bestand');
  });

  it('merges label overrides over the language set', () => {
    writeConfig(
      ['language: nl', 'labels:', '  alerts:', '    caution: Let op', ''].join(
        '\n',
      ),
    );
    const config = loadCourseConfig(tmpDir);
    assert.equal(config.labels.alerts.caution, 'Let op');
    assert.equal(config.labels.alerts.important, 'Belangrijk');
  });

  it('warns and falls back to en for an unknown language, keeping overrides', () => {
    writeConfig(
      ['language: xx', 'labels:', '  cards:', '    file: Dossier', ''].join(
        '\n',
      ),
    );
    const config = loadCourseConfig(tmpDir);
    assert.equal(config.language, 'en');
    assert.equal(config.labels.cards.file, 'Dossier');
    assert.equal(warnMock.mock.callCount(), 1);
    assert.match(warnMock.mock.calls[0].arguments[0], /Unknown language "xx"/);
  });

  it('warns about unknown label keys and ignores them', () => {
    writeConfig(['labels:', '  alerts:', '    typo: Oops', ''].join('\n'));
    const config = loadCourseConfig(tmpDir);
    assert.equal(config.labels.alerts.typo, undefined);
    assert.equal(warnMock.mock.callCount(), 1);
    assert.match(
      warnMock.mock.calls[0].arguments[0],
      /unknown label "alerts\.typo"/,
    );
  });

  it('warns about unknown top-level keys', () => {
    writeConfig('langauge: nl\n');
    const config = loadCourseConfig(tmpDir);
    assert.equal(config.language, 'en');
    assert.match(warnMock.mock.calls[0].arguments[0], /unknown key "langauge"/);
  });

  it('throws on malformed YAML', () => {
    writeConfig('language: [unclosed\n');
    assert.throws(
      () => loadCourseConfig(tmpDir),
      /Cannot parse course\.config\.yml/,
    );
  });

  it('throws on a non-mapping root', () => {
    writeConfig('- just\n- a\n- list\n');
    assert.throws(() => loadCourseConfig(tmpDir), /must be a YAML mapping/);
  });

  it('caches per root until _clearCache', () => {
    writeConfig('language: nl\n');
    const first = loadCourseConfig(tmpDir);
    writeConfig('language: en\n');
    assert.equal(loadCourseConfig(tmpDir), first);
    _clearCache();
    assert.equal(loadCourseConfig(tmpDir).language, 'en');
  });

  it('returns a frozen config', () => {
    const config = loadCourseConfig(tmpDir);
    config.labels.alerts.note = 'Mutated'; // silently ignored in sloppy mode
    assert.equal(config.labels.alerts.note, 'Note');
  });
});
