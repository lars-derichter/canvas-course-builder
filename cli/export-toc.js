const fs = require('fs');
const path = require('path');

const log = require('./logger');
const { PROJECT_ROOT } = require('./project-root');
const { COURSE_DIR } = require('./module-utils');
const { scanCourse } = require('../lib/convert/course-scanner');
const { generateToc } = require('../lib/export/toc');
const { loadCourseConfig } = require('../lib/config/course-config');

const EXPORTS_DIR = path.join(PROJECT_ROOT, 'exports');

/**
 * Write a TOC file listing course items, for the two-step TOC export flow:
 * generate the file, delete the lines you do not want, then run
 * `npx course export --toc <file>`.
 */
async function exportTocCmd(options = {}) {
  let modules = scanCourse(COURSE_DIR);
  if (options.module) {
    modules = modules.filter((m) => m.folderName === options.module);
    if (modules.length === 0) {
      log.error(`[export-toc] Module not found: ${options.module}`);
      process.exit(1);
    }
  }

  const body = generateToc(modules, {
    flagged: options.flagged,
    title: options.title || loadCourseConfig().labels.export.course_title,
    subtitle: options.subtitle,
  });

  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  const output = options.output || path.join(EXPORTS_DIR, 'toc.md');
  fs.writeFileSync(output, body, 'utf8');

  const rel = path.relative(process.cwd(), output);
  log.info(`[export-toc] Wrote ${rel}`);
  log.info('[export-toc] Delete the lines you do not want, then run:');
  log.info(`[export-toc]   npx course export --toc ${rel}`);
}

module.exports = exportTocCmd;
