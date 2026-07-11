# Further skill ideas for canvas-local

Temporary scratchpad, 2026-07-11. Not committed. Ideas for skills that could
help a course creator/instructor, roughly ordered by expected value. All would
follow the established pattern: read `course-context.md` + `style.md` first,
design-then-write phases, no auto-commits.

## Assessment

- **/design-evaluation** — the `evaluations/` counterpart of
  `/design-lesson`: draft an exam or test from the lessons taught so far,
  with a blueprint matrix (learning goals × questions × difficulty) proposed
  in Phase A. Flags goals that are over- or under-tested. Natural fit: your
  master's work on constructive alignment.
- **/build-quiz** — turn a question list into a Canvas quiz via the API
  (would need a new `lib/canvas/quizzes.js` — the New Quizzes API is fiddly
  but doable). Until then: generate QTI or a formatted question bank page.
- **/rubric** — generate a grading rubric for an assignment page, aligned
  with its learning goals; optionally push as a Canvas rubric.
- **/coverage-map** — cross-reference learning goals ↔ lessons ↔ evaluations
  and report gaps: goals never practised, practised but never assessed,
  assessed but never taught. Mostly mechanical, high payoff before an exam
  period.

## Course quality

- **/consistency-check** — sweep all modules for: terms used before their
  introducing lesson, dead cross-links, glossary terms missing from
  `glossary.yml`, pages whose prerequisites moved. Complements `/proofread`
  (single file) with a whole-course pass.
- **/accessibility-pass** — alt-texts present and meaningful, heading
  hierarchy, contrast in embedded images, link texts that work for
  screenreaders. Canvas's own checker is weak; doing it at the markdown
  source is more durable.
- **/image-todos** — list every placeholder PNG and TODO block that
  `/build-lesson-module` left behind, across the course. Cheap to build,
  keeps the debt visible.

## Teaching cycle

- **/lesson-retro** — after teaching: capture what ran long, what confused
  students, what worked; fold timing corrections into the lesson plan's
  notes-to-self and durable insights into `course-context.md`. The
  self-improvement loop closed at the level of teaching, not just writing.
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
  brightspace-scraper output) into canvas-local conventions: numbering,
  frontmatter, link rewriting.

## Meta

- **/update-course-context** — the `/update-style` analogue: after a working
  session, fold corrections about course *design* (not writing style) into
  `course-context.md`. Currently the lesson skills offer this ad hoc; a
  dedicated end-of-session sweep would catch more.
- **/new-year** — interactive wrapper around the new-academic-year docs:
  archive `evaluations/2526/`, reset sync state, update dates in homework
  frontmatter, re-run `/initialize-course-context`.

## Quick take

Best value-to-effort right now: **/design-evaluation**, **/coverage-map**,
and **/lesson-retro** — they extend the same design-first pattern into
assessment and the teaching feedback loop, need no new Canvas API work, and
align with what you already do by hand. **/import-slides** matters most for
colleague adoption but is the hardest to make reliable.
