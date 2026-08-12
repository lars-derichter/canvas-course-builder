const log = require('./logger');
const { listModules, deleteModule } = require('../lib/canvas/modules');
const { listPages, deletePage } = require('../lib/canvas/pages');
const {
  listAssignments,
  deleteAssignment,
} = require('../lib/canvas/assignments');
const { listFiles, deleteFile } = require('../lib/canvas/files');
const { BACKUP_HINT, confirm, describeContents } = require('./backup-warning');

async function resetCanvas(options = {}) {
  const courseId = process.env.CANVAS_COURSE_ID;
  if (!courseId) {
    log.error('CANVAS_COURSE_ID is not set. Run "npx course init" first.');
    return;
  }

  const dryRun = options.dryRun || false;

  // Fetch everything up front. The command used to prompt blind, so nobody
  // could tell a scratch course from a live one before answering.
  const [modules, pages, assignments, files] = await Promise.all([
    listModules(courseId),
    listPages(courseId),
    listAssignments(courseId),
    listFiles(courseId),
  ]);

  const summary = describeContents({
    modules: modules.length,
    pages: pages.length,
    assignments: assignments.length,
    files: files.length,
  });

  if (!summary) {
    log.info(`[reset-canvas] Canvas course ${courseId} is already empty.`);
    return;
  }

  log.info(
    `[reset-canvas] Canvas course ${courseId} contains ${summary}.\n` +
      '[reset-canvas] All of it will be deleted, including content this ' +
      'project never created.',
  );
  log.info(
    '[reset-canvas] Quizzes, discussions, announcements and grades are left ' +
      'alone, but the modules that linked them are not.',
  );

  if (dryRun) {
    log.info('[reset-canvas] DRY RUN - nothing was deleted.');
    return;
  }

  log.info(`[reset-canvas] ${BACKUP_HINT}`);

  const ok = await confirm(
    `[reset-canvas] Delete all content on course ${courseId}? (y/N)`,
  );
  if (!ok) {
    log.info('[reset-canvas] Aborted.');
    return;
  }

  const errors = [];

  // Delete all modules
  log.info(`[reset-canvas] Deleting ${modules.length} module(s)...`);
  for (const mod of modules) {
    try {
      await deleteModule(courseId, mod.id);
      log.verbose(`  Deleted module: ${mod.name} (id=${mod.id})`);
    } catch (err) {
      log.error(`  Failed to delete module ${mod.id}: ${err.message}`);
      errors.push(`module ${mod.id}`);
    }
  }

  // Delete all pages
  log.info(`[reset-canvas] Deleting ${pages.length} page(s)...`);
  for (const page of pages) {
    try {
      await deletePage(courseId, page.url);
      log.verbose(`  Deleted page: ${page.title}`);
    } catch (err) {
      log.error(`  Failed to delete page "${page.title}": ${err.message}`);
      errors.push(`page "${page.title}"`);
    }
  }

  // Delete all assignments
  log.info(`[reset-canvas] Deleting ${assignments.length} assignment(s)...`);
  for (const assignment of assignments) {
    try {
      await deleteAssignment(courseId, assignment.id);
      log.verbose(`  Deleted assignment: ${assignment.name}`);
    } catch (err) {
      log.error(
        `  Failed to delete assignment "${assignment.name}": ${err.message}`,
      );
      errors.push(`assignment "${assignment.name}"`);
    }
  }

  // Delete all files
  log.info(`[reset-canvas] Deleting ${files.length} file(s)...`);
  for (const file of files) {
    try {
      await deleteFile(file.id);
      log.verbose(`  Deleted file: ${file.display_name}`);
    } catch (err) {
      log.error(
        `  Failed to delete file "${file.display_name}": ${err.message}`,
      );
      errors.push(`file "${file.display_name}"`);
    }
  }

  if (errors.length > 0) {
    log.error(`[reset-canvas] Completed with ${errors.length} error(s).`);
  } else {
    log.info('[reset-canvas] All content deleted successfully.');
  }
}

module.exports = resetCanvas;
