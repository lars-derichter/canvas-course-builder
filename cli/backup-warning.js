const { createRL, prompt } = require('./module-utils');
const log = require('./logger');

/** Where the three backup routes are written out. Referenced by every warning. */
const BACKUP_DOC = 'docs/backups.md';

/**
 * The one sentence every destructive path ends on. Canvas has no undo, and a
 * course export takes a minute, so the pointer is worth repeating verbatim.
 */
const BACKUP_HINT = `Canvas has no undo. Back the course up first — see ${BACKUP_DOC}.`;

/**
 * Ask a yes/no question, defaulting to no. Anything other than "y" cancels,
 * so a non-interactive stdin (a CI run, a piped command) cancels rather than
 * proceeding into a deletion.
 */
async function confirm(question) {
  const rl = createRL();
  const answer = await prompt(rl, question);
  rl.close();
  return answer.trim().toLowerCase() === 'y';
}

/**
 * Summarise what a Canvas course already holds, as "3 modules, 12 pages".
 * Zero counts are dropped so the line stays readable.
 */
function describeContents({ modules, pages, assignments, files }) {
  const parts = [];
  const add = (n, singular) => {
    if (n > 0) parts.push(`${n} ${singular}${n === 1 ? '' : 's'}`);
  };
  add(modules, 'module');
  add(pages, 'page');
  add(assignments, 'assignment');
  add(files, 'file');
  return parts.join(', ');
}

/**
 * Warn before the first push to a Canvas course that already holds content.
 *
 * A first push is the moment the tool starts managing a course it did not
 * create: it clears the item list of every module it takes over, and from then
 * on `--prune` can delete real content. Someone pointing the tool at a live
 * course for the first time deserves to hear that before it happens, not after.
 *
 * Returns true when the push should continue.
 *
 * @param {object} opts
 * @param {string|number} opts.courseId
 * @param {object} opts.syncData      - Loaded sync state.
 * @param {boolean} opts.dryRun       - A dry run changes nothing; never warn.
 * @param {Function} opts.fetchCounts - Async, returns the content counts.
 */
async function confirmFirstPush({ courseId, syncData, dryRun, fetchCounts }) {
  if (dryRun) return true;

  // Anything already tracked means this course is ours and has been pushed to
  // before. Only the very first push to an unknown course asks.
  const tracked = Object.keys((syncData && syncData.modules) || {}).length;
  if (tracked > 0) return true;

  let counts;
  try {
    counts = await fetchCounts();
  } catch (err) {
    // A failed pre-flight check must not block a legitimate push; the push
    // itself will surface the same connection problem with a better message.
    log.verbose(`Could not check existing Canvas content: ${err.message}`);
    return true;
  }

  const summary = describeContents(counts);
  if (!summary) return true;

  log.info(
    `\n[push] Canvas course ${courseId} already contains ${summary}, and this ` +
      'project has never pushed to it.',
  );
  log.info(
    '[push] Push takes over the modules it manages: it clears their item ' +
      'lists, so anything added by hand in Canvas — a quiz, a discussion, an ' +
      'external tool — drops out of those modules.',
  );
  log.info(`[push] ${BACKUP_HINT}`);

  const ok = await confirm('[push] Continue? (y/N)');
  if (!ok) log.info('[push] Cancelled.');
  return ok;
}

module.exports = {
  BACKUP_DOC,
  BACKUP_HINT,
  confirm,
  confirmFirstPush,
  describeContents,
};
