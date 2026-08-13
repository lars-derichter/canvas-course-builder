const { get, post, put, del } = require('./client');

/**
 * List all discussion topics in a course.
 *
 * Canvas stores announcements as discussion topics too, so this list holds
 * both: an announcement is a topic with `is_announcement: true`. Nothing in the
 * sync loop reaches a topic through this list — module items name a single
 * topic by id — so no announcement can ever be mistaken for a discussion.
 * A caller that does list topics must filter them out itself.
 */
function listDiscussions(courseId) {
  return get(`/api/v1/courses/${courseId}/discussion_topics`);
}

/**
 * Get a single discussion topic.
 *
 * @param {string|number} courseId
 * @param {string|number} id
 */
function getDiscussion(courseId, id) {
  return get(`/api/v1/courses/${courseId}/discussion_topics/${id}`);
}

/**
 * Create a new discussion topic.
 *
 * The discussion endpoints take their fields at the top level of the request
 * body, unlike pages (`wiki_page`) and assignments (`assignment`), which nest
 * theirs under a wrapper key.
 *
 * @param {string|number} courseId
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} [opts.message]              - HTML body
 * @param {string} [opts.discussionType]       - "side_comment", "threaded" or "not_threaded"
 * @param {boolean} [opts.published]
 * @param {string} [opts.delayedPostAt]        - ISO 8601 date string
 * @param {string} [opts.lockAt]               - ISO 8601 date string
 * @param {boolean} [opts.requireInitialPost]
 */
function createDiscussion(
  courseId,
  {
    title,
    message,
    discussionType,
    published,
    delayedPostAt,
    lockAt,
    requireInitialPost,
  } = {},
) {
  const topic = { title };
  if (message !== undefined) topic.message = message;
  if (discussionType !== undefined) topic.discussion_type = discussionType;
  if (published !== undefined) topic.published = published;
  if (delayedPostAt !== undefined) topic.delayed_post_at = delayedPostAt;
  if (lockAt !== undefined) topic.lock_at = lockAt;
  if (requireInitialPost !== undefined)
    topic.require_initial_post = requireInitialPost;
  return post(`/api/v1/courses/${courseId}/discussion_topics`, topic);
}

/**
 * Update an existing discussion topic.
 *
 * @param {string|number} courseId
 * @param {string|number} id
 * @param {object} updates - camelCase fields: title, message, discussionType,
 *                           published, delayedPostAt, lockAt,
 *                           requireInitialPost.
 */
function updateDiscussion(courseId, id, updates = {}) {
  const topic = {};
  if (updates.title !== undefined) topic.title = updates.title;
  if (updates.message !== undefined) topic.message = updates.message;
  if (updates.discussionType !== undefined)
    topic.discussion_type = updates.discussionType;
  if (updates.published !== undefined) topic.published = updates.published;
  if (updates.delayedPostAt !== undefined)
    topic.delayed_post_at = updates.delayedPostAt;
  if (updates.lockAt !== undefined) topic.lock_at = updates.lockAt;
  if (updates.requireInitialPost !== undefined)
    topic.require_initial_post = updates.requireInitialPost;
  return put(`/api/v1/courses/${courseId}/discussion_topics/${id}`, topic);
}

/**
 * Delete a discussion topic.
 *
 * @param {string|number} courseId
 * @param {string|number} id
 */
function deleteDiscussion(courseId, id) {
  return del(`/api/v1/courses/${courseId}/discussion_topics/${id}`);
}

/**
 * Whether Canvas grades this discussion topic.
 *
 * A graded discussion has an Assignment behind it: Canvas puts `assignment_id`
 * on the topic (null when it is ungraded) and, on some responses, the whole
 * `assignment` object.
 *
 * @param {object} topic - A Canvas DiscussionTopic object.
 * @returns {boolean}
 */
function isGradedDiscussion(topic) {
  if (!topic) return false;
  if (topic.assignment_id != null) return true;
  return Boolean(topic.assignment && typeof topic.assignment === 'object');
}

/**
 * The id of the Assignment behind a graded discussion, or null when the topic
 * is ungraded or Canvas named no id.
 *
 * A discussion's own id is a DiscussionTopic id, and nothing in the assignments
 * API is keyed by it: anything that wants the grades, the gradebook column or
 * the submission state of a graded discussion has to go through this id first.
 * Canvas puts it on the topic as `assignment_id`, and on the responses that
 * embed the whole `assignment` object it is that object's `id`.
 *
 * @param {object} topic - A Canvas DiscussionTopic object.
 * @returns {string|number|null}
 */
function discussionAssignmentId(topic) {
  if (!isGradedDiscussion(topic)) return null;
  if (topic.assignment_id != null) return topic.assignment_id;
  if (topic.assignment && topic.assignment.id != null)
    return topic.assignment.id;
  return null;
}

/**
 * The one line push and pull both say about a graded discussion, or null when
 * the topic is not graded.
 *
 * This project syncs the topic, never the assignment behind it: points, due
 * date, grading type and group set stay in Canvas and appear nowhere in the
 * markdown. Saying so is what stops the file from reading as the whole truth —
 * and stops an author from "fixing" a grading setting locally and expecting a
 * push to carry it over. The caller prefixes the line with its own command tag.
 *
 * @param {object} topic - A Canvas DiscussionTopic object.
 * @returns {string|null}
 */
function gradedDiscussionWarning(topic) {
  if (!isGradedDiscussion(topic)) return null;
  const name = topic.title ? `"${topic.title}"` : `${topic.id}`;
  return (
    `WARNING: discussion ${name} is graded. Its grading settings — points, ` +
    'due date, grading type, group set — live only in Canvas: they are not ' +
    'represented in the markdown file and no push or pull touches them. ' +
    'Change them in Canvas.'
  );
}

module.exports = {
  listDiscussions,
  getDiscussion,
  createDiscussion,
  updateDiscussion,
  deleteDiscussion,
  isGradedDiscussion,
  discussionAssignmentId,
  gradedDiscussionWarning,
};
