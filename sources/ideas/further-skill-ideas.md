# Further skill ideas for canvas-course-builder

Backlog of skills that could help a course creator/instructor, started
2026-07-11 and roughly ordered by expected value. All would follow the
established pattern: read `course-context.md` + `style.md` first, design-then-
write phases, no auto-commits.

The assessment and quality skills first sketched here — `/design-evaluation`,
`/build-quiz`, `/rubric`, `/coverage-map`, `/consistency-check`,
`/image-todos`, and `/lesson-retro` — have since been built and documented in
[`docs/claude-code.md`](../../docs/claude-code.md). What remains below is the
backlog.

## Course quality

- **/accessibility-pass** — alt-texts present and meaningful, heading
  hierarchy, contrast in embedded images, link texts that work for
  screenreaders. Canvas's own checker is weak; doing it at the markdown
  source is more durable.

## Teaching cycle

- **/plan-semester** — map lessons onto the academic calendar (holidays,
  exam weeks), propose which lesson lands on which date, generate a
  schedule page. Re-run when a lesson is cancelled.
- **/weekly-update** — draft the "what changed / what's coming" student
  announcement from the git log and the calendar; push as a Canvas
  announcement (needs a small `lib/canvas/announcements.js`, the API is
  simple).

## Content intake

- **/import-slides** — convert an existing slide deck or PDF (colleagues
  adopting the system all have these) into a draft module: one page per
  topic, images extracted, speaker notes as prose. Big adoption lever for
  colleagues; hard to do well.
- **/import-module** — restructure a scraped/legacy course page dump (e.g.
  brightspace-scraper output) into canvas-course-builder conventions: numbering,
  frontmatter, link rewriting.

## Meta

- **/update-course-context** — the `/style-update` analogue: after a working
  session, fold corrections about course *design* (not writing style) into
  `course-context.md`. Currently the lesson skills offer this ad hoc; a
  dedicated end-of-session sweep would catch more.
- **/new-year** — interactive wrapper around the new-academic-year docs:
  archive `evaluations/2526/`, reset sync state, update dates in homework
  frontmatter, re-run `/initialize-course-context`.

## Quick take

Of what remains, **/import-slides** matters most for colleague adoption but
is the hardest to make reliable. **/plan-semester** and **/weekly-update**
are the natural next steps in the teaching cycle now that `/lesson-retro`
closes the after-teaching loop; both are modest in scope. **/new-year** ties
the yearly reset together but leans on the others existing first.
