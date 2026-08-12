const { get, post, put, del } = require('./client');

/**
 * List all assignments in a course.
 */
function listAssignments(courseId) {
  return get(`/api/v1/courses/${courseId}/assignments`);
}

/**
 * Get a single assignment.
 *
 * @param {string|number} courseId
 * @param {string|number} id
 */
function getAssignment(courseId, id) {
  return get(`/api/v1/courses/${courseId}/assignments/${id}`);
}

/**
 * Create a new assignment.
 *
 * @param {string|number} courseId
 * @param {object} opts
 * @param {string} opts.name
 * @param {string} [opts.description]         - HTML description
 * @param {number} [opts.pointsPossible]
 * @param {string[]} [opts.submissionTypes]   - e.g. ["online_upload", "online_text_entry"]
 * @param {string} [opts.dueAt]              - ISO 8601 date string
 * @param {string} [opts.unlockAt]            - ISO 8601 date string
 * @param {string} [opts.lockAt]              - ISO 8601 date string
 * @param {boolean} [opts.published]
 */
function createAssignment(
  courseId,
  {
    name,
    description,
    pointsPossible,
    submissionTypes,
    dueAt,
    unlockAt,
    lockAt,
    published,
  } = {},
) {
  const assignment = { name };
  if (description !== undefined) assignment.description = description;
  if (pointsPossible !== undefined) assignment.points_possible = pointsPossible;
  if (submissionTypes !== undefined)
    assignment.submission_types = submissionTypes;
  if (dueAt !== undefined) assignment.due_at = dueAt;
  if (unlockAt !== undefined) assignment.unlock_at = unlockAt;
  if (lockAt !== undefined) assignment.lock_at = lockAt;
  if (published !== undefined) assignment.published = published;
  return post(`/api/v1/courses/${courseId}/assignments`, { assignment });
}

/**
 * Update an existing assignment.
 *
 * @param {string|number} courseId
 * @param {string|number} id
 * @param {object} updates - camelCase fields: name, description, pointsPossible,
 *                           submissionTypes, dueAt, unlockAt, lockAt,
 *                           published, etc.
 */
function updateAssignment(courseId, id, updates = {}) {
  const assignment = {};
  if (updates.name !== undefined) assignment.name = updates.name;
  if (updates.description !== undefined)
    assignment.description = updates.description;
  if (updates.pointsPossible !== undefined)
    assignment.points_possible = updates.pointsPossible;
  if (updates.submissionTypes !== undefined)
    assignment.submission_types = updates.submissionTypes;
  if (updates.dueAt !== undefined) assignment.due_at = updates.dueAt;
  if (updates.unlockAt !== undefined) assignment.unlock_at = updates.unlockAt;
  if (updates.lockAt !== undefined) assignment.lock_at = updates.lockAt;
  if (updates.published !== undefined) assignment.published = updates.published;
  return put(`/api/v1/courses/${courseId}/assignments/${id}`, { assignment });
}

/**
 * Delete an assignment.
 *
 * @param {string|number} courseId
 * @param {string|number} id
 */
function deleteAssignment(courseId, id) {
  return del(`/api/v1/courses/${courseId}/assignments/${id}`);
}

/**
 * Whether a Canvas Assignment already holds student submissions.
 *
 * Canvas puts `has_submitted_submissions` on every Assignment object it
 * returns, in list responses as well as single fetches, so a caller that
 * already holds the object needs no extra request.
 *
 * Returns null when the field is missing — a trimmed response, an older
 * Canvas — because "could not tell" must never be reported as "no grades at
 * stake".
 *
 * @param {object} assignment - A Canvas Assignment object.
 * @returns {boolean|null} true, false, or null when it cannot be determined.
 */
function hasStudentSubmissions(assignment) {
  if (!assignment || typeof assignment.has_submitted_submissions !== 'boolean')
    return null;
  return assignment.has_submitted_submissions;
}

/**
 * Submission state of every assignment in a course, keyed by String(id).
 *
 * One list request answers the question for the whole course, because the
 * Assignment objects a list returns already carry the flag. Looking up N ids
 * therefore costs one call, not N.
 *
 * An id absent from the map is not in the course at all — already deleted on
 * Canvas — which is a different answer from an id mapped to null (present,
 * but its submission state could not be read).
 *
 * @param {string|number} courseId
 * @returns {Promise<Map<string, boolean|null>>}
 */
async function getSubmissionStates(courseId) {
  const assignments = await listAssignments(courseId);
  const states = new Map();
  for (const assignment of assignments || []) {
    states.set(String(assignment.id), hasStudentSubmissions(assignment));
  }
  return states;
}

module.exports = {
  listAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  hasStudentSubmissions,
  getSubmissionStates,
};
