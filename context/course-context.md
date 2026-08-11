# Course context

This document describes _your course_ — its subject, pedagogy, and conventions —
so the lesson skills (`/design-lesson`, `/summarize-lesson`,
`/build-lesson-module`) can work with your material instead of guessing. It is
the course-design companion to [style.md](style.md), which covers writing style
only. Both files are consumed by AI tools, so write them in whichever language
you and your assistant work in, and keep the two consistent.

This file ships as a template. Run `/initialize-course-context` to fill it in
(the skill reads your repo and interviews you for the rest), or edit it by hand.
Sections still marked `TODO` are treated as unanswered: a skill that needs one
will gather the information itself and offer to save it here.

Keep this file in `protected_files` in `update-from-upstream.conf` so upstream
updates never overwrite your version.

## Course overview

<!-- Subject, course name, institution, programme, language of instruction,
students' level (year, prior knowledge, CEFR level if relevant), course length
(number of lessons/weeks, minutes per lesson). The machine-readable language
setting lives in course.config.yml (it drives generated labels and the site
locale); keep the two consistent. -->

TODO

## Pedagogy

<!-- The course's pedagogical approach. If a framework document exists in this
repo, point to it here and summarize only what the skills need: the
learning-goal scheme (numbered course-wide goals? plain per-lesson goals?) and
the exact notation lesson plans use to reference goals. Also name recurring
teaching methods (e.g. live coding, PRIMM, worked examples) if lesson plans
refer to them. -->

TODO

## Lesson plans

<!-- Where full lesson designs live and how they are structured. Defaults the
skills assume when this section is TODO:
- Location and naming: `sources/lessons/lesson-NN.md` (two-digit number).
- Template: the lowest-numbered existing lesson plan is the structural worked
  example.
List here any required sections, timing conventions, or rules that a new
lesson plan must follow. -->

TODO

## Class versions

<!-- Whether you distill lesson plans into one-page class versions (a teaching
reminder for in the classroom). Defaults: written to
`sources/lesson-plans/lesson-plan-NN.md`, mirroring the lesson-plan number;
content inventory as a plain concept list. If you group the inventory (e.g.
passive decor vs. actively practised vs. flagged-for-later), define the groups
and their labels here. -->

TODO

## Module conventions

<!-- How a generated student-facing module under `course/` is built beyond
what docs/frontmatter.md and style.md already define: the page roles and their
order (overview, content pages, reference cards, summary, glossary, homework),
which page types your course uses, per-page-type emoji or title conventions,
and any recurring page structure (e.g. a three-part reference-card layout).
Point to one or two existing modules as worked examples. -->

TODO

## Code and downloads

<!-- Only for courses with code. The programming language(s), how downloadable
code projects in `_files/` are laid out (e.g. zip containing
`<project>/src/**` for IntelliJ), what must never end up in an archive
(IDE metadata, build files, compiled artifacts), and comment-language rules
for code samples. -->

TODO

## Glossary

<!-- Whether the course maintains a canonical glossary that generates
per-module glossary pages. Default when used:
`sources/reference-materials/glossary.yml`, rendered with
`npx course build-glossary` (see the command's --help for flags). State the
path, or state that the course has no glossary. -->

TODO

## Scope boundaries

<!-- Topics deliberately outside this course, so design conversations flag
them instead of silently including them. List each with a one-line reason
(comes later in the programme, out of scope for the level, ...). -->

TODO
