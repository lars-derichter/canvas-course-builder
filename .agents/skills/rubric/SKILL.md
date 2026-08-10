---
name: rubric
description: Generate a grading rubric for an assignment or evaluation, with criteria drawn from the assignment text and aligned to the course's learning goals. Phase A proposes the criteria-by-levels matrix and stops for approval; Phase B writes a colleague-facing markdown rubric. Use for "rubric", "rubric maken", "beoordelingsrubriek", "verbetersleutel voor de opdracht", "grading criteria".
---

# Rubric

Build a grading rubric for one assignment — a homework page under `course/`
or an evaluation under `evaluations/` — aligned with the learning goals it
serves, written as a colleague-facing markdown file. Markdown only: pushing
rubrics to Canvas would need a `lib/canvas/rubrics.js` that does not exist.

## Input

`$ARGUMENTS` may hold a path to the assignment, free text naming it
(_"huiswerk les 3"_), and/or constraints (point total, number of levels). If
empty, propose the file open in the IDE when it is an assignment or
evaluation; otherwise ask for a path. Stop with one sentence if the target
is not a markdown file under `course/` or `evaluations/`.

## Steps

### Phase A — Design (writes nothing)

1. **Read the fixed inputs**, in this order:
   - The assignment itself, in full. Its stated requirements are the primary
     source of criteria.
   - [`docs/course-context.md`](../../../docs/course-context.md) — the
     learning-goal scheme and its notation. If it is `TODO`, infer goals from
     the lesson plan the assignment belongs to, or ask the author once, and
     offer at the end to save what you learned.
   - The lesson plan(s) in `sources/lessons/` that the assignment belongs to,
     for the goals it practises and the level at which they were taught.
   - [`docs/style.md`](../../../docs/style.md) — the rubric is colleague-facing.
   - Existing rubrics under `evaluations/**/rubric*.md` or
     `sources/rubrics/`, if any, as the structural worked example.

2. **Settle the grading model.** From `$ARGUMENTS`, the worked example, or
   one bundled question round: analytic (criteria × levels, the default) or
   holistic; number of levels and their labels (default four, in the course's
   language — e.g. insufficient / sufficient / good / excellent, or the
   worked example's); point total and whether points sit per criterion or
   per cell.

3. **Derive the criteria.** Each criterion must trace to a requirement in
   the assignment text or to a learning goal it practises. Typical count:
   three to six. For each, note the source (quoted requirement or goal
   reference).

4. **Propose in chat, no files:**
   - **The matrix.** Criteria as rows; per criterion: weight in points, the
     goal(s) it serves, and a one-line descriptor per level. Descriptors
     name observable differences (what the work shows), not adjectives.
   - **Alignment check.** Requirements in the assignment with no criterion,
     criteria with no basis in the text or goals, and goals the assignment
     claims to practise but the rubric cannot see. Flag each.
   - **Open questions.** Anything the author must decide before Phase B.

5. Adjust on request. Stop. Wait for explicit approval before starting
   Phase B.

### Phase B — Write (only after approval)

6. **Write the rubric file.** Destination:
   - Assignment under `evaluations/<year>/<slug>/` → `rubric.md` in that
     same folder.
   - Homework page under `course/` → `sources/rubrics/<module-slug>.md`.
     Never inside `course/`: a rubric page there would be served and synced.

   Content: title naming the assignment, a link to it, the point model, the
   criteria × levels table, and per criterion a short grading note (common
   mistakes to look for, partial-credit guidance) where Phase A surfaced one.
   Colleague-facing register of `docs/style.md`.

7. **Offer, do not run:**
   - A student-facing summary of the criteria (no level descriptors, just
     what is graded — in the course's language, e.g. "waarop word je
     beoordeeld") appended to the assignment page — only on explicit
     request, since it edits student-facing material.
   - `/proofread` on the rubric.

## Rules

- No criteria from your own initiative without flagging them in Phase A.
- One assignment per call.
- Never change the assignment page or lesson plans without the explicit
  request in step 7.
- No commits, no pushes, no staging.

$ARGUMENTS
