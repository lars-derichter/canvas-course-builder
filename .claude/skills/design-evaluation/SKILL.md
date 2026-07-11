---
name: design-evaluation
description: Design an exam or test in evaluations/ from the lessons taught so far, following docs/course-context.md and the student-facing register of docs/style.md. Phase A proposes a blueprint matrix (learning goals × questions × difficulty) and flags over- and under-tested goals; Phase B writes the evaluation only after approval. Use for "design evaluation", "toets ontwerpen", "examen opstellen", "test maken over les 1 tot 4", "evaluatie voor de eerste periode".
---

# Design evaluation

Design an exam or test together with the author, written under
`evaluations/<year>/<slug>/`, following the course conventions in
[`docs/course-context.md`](../../../docs/course-context.md). The evaluation
itself is student-facing material per [`docs/style.md`](../../../docs/style.md);
the accompanying blueprint is collega-facing.

The skill runs in two phases. Phase A is a design conversation built around a
blueprint matrix; no file is written. Phase B writes the evaluation, but only
after the author has approved the blueprint from Phase A.

## Inputs

`$ARGUMENTS` may contain:

- An evaluation name or type (`test 1`, `examen`, `herexamen`).
- A lesson range (`les 1 tot 4`, `lessons 1-4`) or _"everything taught so
  far"_.
- A path to a notes file with question ideas or constraints.
- Free text with intent (e.g. _"praktische toets, focus op zelf code
  schrijven"_).

If the scope is not given, default to every lesson that has a plan in
`sources/lessons/` and confirm the range in one sentence.

## Steps

### Phase A — Blueprint (always first, never skip)

1. **Read the fixed inputs**, in this order:
   - [`docs/course-context.md`](../../../docs/course-context.md) — pedagogy,
     learning-goal scheme and its reference notation, scope boundaries. For
     each section that is still `TODO` and that this design needs, infer the
     answer from the repo where possible, otherwise ask the author — and at
     the end of the session offer to save it back into `course-context.md`.
   - [`docs/style.md`](../../../docs/style.md) — shared rules and the
     student-facing section. Evaluations are student-facing.
   - Every lesson plan in `sources/lessons/` within the scope, in full. Track
     per lesson which learning goals were actively practised versus only
     seeded, and how much lesson time each goal received.
   - Existing evaluations under `evaluations/` as worked examples for
     structure, tone, and practicalities. The most recent one is the
     structural template. If none exist, Phase A's proposal doubles as a
     proposal for the evaluation format; confirm it explicitly.

2. **Determine the destination.**
   - Academic-year folder: the highest-numbered existing folder under
     `evaluations/` (e.g. `2526/`), unless the author says otherwise.
   - Evaluation slug: from the name in `$ARGUMENTS`, mirroring existing
     sibling folders (e.g. `test1`, `exam`).
   - Confirm both in one sentence.

3. **Settle the practicalities** before designing questions. From the worked
   example, `course-context.md`, or the author (bundle open ones in a single
   `AskUserQuestion` call): duration, total points, question formats the
   course uses (open questions, code writing, code reading, multiple choice),
   allowed aids (open/closed book, IDE, cheat sheet), and weight of this
   evaluation in the course grade if the instructions must state it.

4. **Build the blueprint matrix and present it in chat**, not a file. Fixed
   sections:
   - **One-sentence proposal.** What the evaluation covers and in what form.
   - **Blueprint matrix.** One row per question: question number, short
     description, learning goal(s) it tests (in the course's reference
     notation), difficulty (reproduction / application / transfer, or the
     course's own scheme), and points. One row per learning goal in scope at
     the bottom is fine as an alternative axis if the matrix gets wide.
   - **Coverage check.** Goals in scope that the matrix does not test, goals
     whose point weight is disproportionate to their lesson time, and goals
     tested only at reproduction level while the lessons practised
     application. Flag each explicitly; propose a correction or a motivated
     acceptance.
   - **Pros and cons.** Two sub-headings, as in `/design-lesson`:
     - _Your suggestions._ One bullet per author input element, honest.
     - _My suggestions._ The same for what the skill adds, including
       alternatives that are _not_ in the proposal and why not.
   - **Open questions.** Everything the author must decide before Phase B.

5. **Stop. Wait for a reply.** Adjust the blueprint on request and stay in
   Phase A until the author explicitly approves. Write no file in Phase A.

### Phase B — Write (only after approval)

6. **Write the evaluation** to `evaluations/<year>/<slug>/instructions.md`,
   mirroring the structure of the worked example (or the format agreed in
   Phase A). Full question text, point values per question, and the agreed
   practicalities. Student-facing register of `docs/style.md`: address form,
   language level, punctuation, no AI-tells. Code in questions follows the
   course's code conventions from `course-context.md`.

7. **Write the blueprint** to `evaluations/<year>/<slug>/blueprint.md`: the
   approved matrix, the coverage notes, and a model answer or scoring hint
   per question where the question needs one. This file is collega-facing —
   register per `docs/style.md`, never handed to students.

8. **Style pass.** Check `instructions.md` against the student-facing
   checklist of `docs/style.md` before reporting.

9. **Offer follow-up steps, do not run them.** Report both paths. Propose as
   separate steps:
   - `/proofread` on `instructions.md`.
   - `/rubric` for open questions that need a grading rubric.
   - `/build-quiz` if part of the evaluation should become a Canvas quiz.
   - `/coverage-map` to see this evaluation in the whole-course picture.
   - If you gathered course facts that `course-context.md` was missing,
     offer to save them there now.

## Rules

- Test only what was taught: every question maps to a learning goal that a
  lesson in scope actively practised. A question on merely-seeded or
  out-of-scope material must be flagged in Phase A, never slipped in.
- Do not invent learning goals. If the course has no explicit goal scheme,
  derive per-lesson goals from the lesson plans and say you did so.
- `evaluations/` is never served by Docusaurus or synced to Canvas; still,
  keep filenames lowercase and hyphenated like the rest of the repo.
- Never change lesson plans, course modules, or other evaluations.
- No commits, no pushes, no staging.

$ARGUMENTS
