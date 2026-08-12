const log = require('./logger');
const { listModules, deleteModule } = require('../lib/canvas/modules');
const { listPages, deletePage } = require('../lib/canvas/pages');
const {
  listAssignments,
  deleteAssignment,
  hasStudentSubmissions,
  isQuizBackedAssignment,
} = require('../lib/canvas/assignments');
const { listFiles, deleteFile } = require('../lib/canvas/files');
const {
  BACKUP_HINT,
  confirm,
  countSubmissionRisk,
  describeContents,
  submissionRiskSuffix,
  submissionWarningLines,
} = require('./backup-warning');

/**
 * Split the assignments Canvas lists into the ones this command deletes and the
 * ones it must leave alone.
 *
 * Canvas lists the gradebook half of a graded quiz among the assignments, and a
 * `DELETE` on it takes the quiz, its questions and its submissions with it. The
 * command promises that quizzes survive a reset, so those are skipped rather
 * than deleted — a promise that used to be false for every graded quiz in the
 * course.
 *
 * @param {object[]} assignments - Canvas Assignment objects.
 * @returns {{deletable: object[], quizBacked: object[]}}
 */
function partitionAssignments(assignments) {
  const deletable = [];
  const quizBacked = [];
  for (const assignment of assignments || []) {
    if (isQuizBackedAssignment(assignment)) quizBacked.push(assignment);
    else deletable.push(assignment);
  }
  return { deletable, quizBacked };
}

/**
 * The one sentence that explains the assignments this command is not deleting,
 * or null when the course has none. The names are listed by the caller.
 *
 * @param {object[]} quizBacked
 * @returns {string|null}
 */
function quizSkipNotice(quizBacked) {
  const count = quizBacked.length;
  if (count === 0) return null;
  const one = count === 1;
  return (
    `${count} of the assignments on this course ${one ? 'is' : 'are'} the ` +
    `gradebook half of a graded quiz. ${one ? 'It is' : 'They are'} skipped: ` +
    `deleting ${one ? 'it' : 'one'} deletes the quiz, its questions and every ` +
    'submission on it, and nothing here could rebuild the quiz afterwards.'
  );
}

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

  // The quiz half of the list is not this command's to delete, so it is not
  // counted among what will be deleted either.
  const { deletable, quizBacked } = partitionAssignments(assignments);
  const quizNotice = quizSkipNotice(quizBacked);

  const summary = describeContents({
    modules: modules.length,
    pages: pages.length,
    assignments: deletable.length,
    files: files.length,
  });

  if (!summary) {
    log.info(
      quizNotice
        ? `[reset-canvas] Canvas course ${courseId} holds nothing this ` +
            `command deletes. ${quizNotice}`
        : `[reset-canvas] Canvas course ${courseId} is already empty.`,
    );
    return;
  }

  log.info(
    `[reset-canvas] Canvas course ${courseId} contains ${summary}.\n` +
      '[reset-canvas] All of it will be deleted, including content this ' +
      'project never created.',
  );
  log.info(
    '[reset-canvas] Every assignment counted above is deleted, and its ' +
      'gradebook column and its student submissions go with it.\n' +
      '[reset-canvas] Classic quizzes, discussions, announcements and rubrics ' +
      'are left alone, but the modules that linked them are not.',
  );
  if (quizNotice) {
    log.info(`[reset-canvas] ${quizNotice}`);
    for (const assignment of quizBacked) {
      log.info(`  - ${assignment.name} (kept, with its quiz)`);
    }
  }

  // The assignments were listed above, and a Canvas Assignment object carries
  // has_submitted_submissions, so counting the graded ones costs no extra call.
  // Only the ones about to be deleted are counted: a skipped quiz assignment
  // puts no grades at stake here.
  const submissionStates = deletable.map((assignment) => ({
    assignment,
    state: hasStudentSubmissions(assignment),
  }));
  const risk = countSubmissionRisk(submissionStates.map((s) => s.state));

  for (const line of submissionWarningLines(risk)) {
    log.warn(`[reset-canvas] ${line}`);
  }
  for (const { assignment, state } of submissionStates) {
    if (state === true) {
      log.warn(`  - ${assignment.name} (has student submissions)`);
    } else if (state === null) {
      log.warn(`  - ${assignment.name} (submission status unknown)`);
    }
  }
  if (deletable.length > 0 && risk.graded === 0 && risk.unknown === 0) {
    log.info(
      deletable.length === 1
        ? '[reset-canvas] The assignment has no student submissions.'
        : `[reset-canvas] None of the ${deletable.length} assignments has ` +
            'student submissions.',
    );
  }

  if (dryRun) {
    log.info('[reset-canvas] DRY RUN - nothing was deleted.');
    return;
  }

  log.info(`[reset-canvas] ${BACKUP_HINT}`);

  const ok = await confirm(
    `[reset-canvas] Delete all content on course ${courseId}` +
      `${submissionRiskSuffix(risk)}? (y/N)`,
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

  // Delete the assignments, minus the ones that would take a quiz with them
  log.info(
    `[reset-canvas] Deleting ${deletable.length} assignment(s)` +
      (quizBacked.length > 0
        ? `, skipping ${quizBacked.length} that back a quiz`
        : '') +
      '...',
  );
  for (const assignment of quizBacked) {
    log.verbose(
      `  Skipped assignment: ${assignment.name} — deleting it would delete ` +
        `quiz ${assignment.quiz_id ?? '(id unknown)'} with it`,
    );
  }
  for (const assignment of deletable) {
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
// Exported for testing
resetCanvas._partitionAssignments = partitionAssignments;
resetCanvas._quizSkipNotice = quizSkipNotice;
