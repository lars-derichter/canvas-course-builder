# Ideas list

Possible future skills and features. These are ideas, not plans: nothing here is
scheduled, and none of it is a commitment from the maintainer. If one of them
would help you, there are two good routes:

- Build it and open a pull request; see [Contributing](contributing.md).
- Ask your AI assistant to build the skill for your own course. See
  [Creating your own skills](ai-assistants.md#creating-your-own-skills) — most
  of the skill ideas below are within reach of a single AI-assisted session.

## Skill ideas

All would follow the established pattern: read
[`course-context.md`](../context/course-context.md) and
[`writing-style.md`](../context/writing-style.md) first, design-then-write
phases, no auto-commits.

### Course quality

- **/accessibility-pass**: alt-texts present and meaningful, heading hierarchy,
  contrast in embedded images, link texts that work for screenreaders. Canvas's
  own checker is weak; doing it at the markdown source is more durable.

### Teaching cycle

- **/plan-semester**: map lessons onto the academic calendar (holidays, exam
  weeks), propose which lesson lands on which date, generate a schedule page.
  Re-run when a lesson is cancelled.
- **/weekly-update**: draft the "what changed / what's coming" student
  announcement from the git log and the calendar; push as a Canvas announcement
  (needs a small `lib/canvas/announcements.js`, the API is simple).

### Content intake

- **/import-slides**: convert an existing slide deck or PDF (most courses start
  from a pile of these) into a draft module: one page per topic, images
  extracted, speaker notes as prose. Big adoption lever; hard to do well.
- **/import-module**: restructure a legacy course-page dump, for example content
  scraped from another LMS, into Canvas Course Builder conventions: numbering,
  frontmatter, link rewriting.

### Meta

- **/update-course-context**: the `/style-update` analogue. After a working
  session, fold corrections about course _design_ (not writing style) into
  `course-context.md`. Currently the lesson skills offer this ad hoc; a
  dedicated end-of-session sweep would catch more.
- **/new-year**: interactive wrapper around the
  [new academic year](new-academic-year.md) guide: archive the previous year's
  `evaluations/` folder, reset sync state, update dates in homework frontmatter,
  re-run `/initialize-course-context`.

## Feature ideas

### Content templates

Extend `npx course new-item` with template options: lab assignment, reading
assignment, lecture notes, quiz instructions, and so on. Templates would provide
pre-filled frontmatter and boilerplate markdown tailored to common course item
patterns.

### Language-aware quality skills

`/proofread` now derives its checks from whatever `writing-style.md` says, but
`/consistency-check` still carries assumptions from the shipped defaults. Make
both read the course language from `course.config.yml` and adapt their checks
accordingly.
