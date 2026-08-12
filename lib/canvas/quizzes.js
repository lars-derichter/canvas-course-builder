const { get } = require('./client');

/**
 * Reading the quizzes of a course, and nothing else.
 *
 * This module lists quizzes; it deliberately cannot create, update or delete
 * one, and push must never do any of those things either. A Classic Quiz has no
 * markdown source: its questions come from a QTI package under `evaluations/`,
 * which Canvas accepts only through Settings > Import Course Content in the web
 * interface — there is no API import to mirror it with. Anything this project
 * wrote to a quiz would therefore be written from a copy it does not have, over
 * questions and submissions it cannot reconstruct.
 *
 * What push owns is the quiz's place in a module: it resolves which existing
 * quiz an item points at and creates the module item, leaving the quiz itself
 * exactly as the import left it.
 */

/**
 * List the quizzes of a course.
 *
 * The response is what push resolves a quiz item against: by the id in its
 * frontmatter when the course still holds that quiz, by title otherwise.
 *
 * @param {string|number} courseId
 * @returns {Promise<object[]>} Canvas Quiz objects (`id`, `title`, ...).
 */
function listQuizzes(courseId) {
  return get(`/api/v1/courses/${courseId}/quizzes`);
}

module.exports = { listQuizzes };
