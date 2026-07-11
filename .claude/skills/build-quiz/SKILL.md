---
name: build-quiz
description: Turn a question list into a QTI 1.2 package that Canvas can import as a quiz, plus step-by-step import instructions. Phase A maps every question to a supported QTI type and stops for approval; Phase B generates and verifies the .zip. Use for "build quiz", "quiz maken", "QTI genereren", "Canvas quiz van deze vragen", "vragenlijst omzetten naar quiz".
---

# Build quiz

Convert a list of questions into a QTI 1.2 `.zip` that imports into Canvas as
a quiz, written under `evaluations/<year>/<slug>/`. The skill runs in two
phases: **Phase A** inventories the questions, maps each to a supported QTI
question type, and stops for approval; **Phase B** generates the package,
verifies it, and reports how to import it. There is no Canvas API involved —
import happens through the Canvas UI, and the instructions are part of the
skill's report.

## Input

`$ARGUMENTS` may hold a path to a question list (markdown), a quiz title,
and/or free text. Question sources, in order of preference:

- A markdown file given as a path (e.g. notes, or a `blueprint.md` from
  `/design-evaluation`).
- Questions drafted earlier in the current conversation.
- Nothing yet — the author wants questions generated from one or more
  lessons. Then first read the lesson plans involved plus
  [`docs/course-context.md`](../../../docs/course-context.md) and draft the
  questions as part of Phase A.

## Supported question types

Canvas's QTI 1.2 import understands these `question_type` values; map every
question to one of them:

| Type | `question_type` |
| --- | --- |
| Multiple choice (one correct) | `multiple_choice_question` |
| Multiple answers | `multiple_answers_question` |
| True/false | `true_false_question` |
| Short answer (exact text) | `short_answer_question` |
| Numerical answer | `numerical_question` |
| Essay (manually graded) | `essay_question` |

A question that fits none of these (matching, ordering, hotspot, code
execution) is flagged in Phase A: propose a rephrasing into a supported type
or a downgrade to `essay_question`, and let the author choose.

## Steps

### Phase A — Inventory

1. **Read** [`docs/style.md`](../../../docs/style.md) (student-facing
   register — question text is student-facing) and the question source. If
   questions must be drafted from lessons, also read
   [`docs/course-context.md`](../../../docs/course-context.md) and the lesson
   plans in scope, and draft them now, in chat.

2. **Determine the destination**: `evaluations/<year>/<slug>/`, with the
   year folder the highest-numbered under `evaluations/` and the slug from
   the quiz title. Confirm in one sentence.

3. **Propose in chat, no files:** quiz title; per question a numbered row
   with the text (shortened), the mapped `question_type`, the correct
   answer(s), and points; the total; and the flag list from the type mapping
   above. For multiple-choice questions, show all options with the correct
   one marked.

4. **Stop. Wait for approval.** Adjust on request; write nothing in Phase A.

### Phase B — Generate (only after approval)

5. **Generate the package with a throwaway Node script** in the scratchpad —
   never hand-write the XML, the script must escape question text properly
   (`&`, `<`, `>`, quotes). The zip layout Canvas expects:

   ```
   <ident>.zip
   ├── imsmanifest.xml
   └── <ident>/
       └── <ident>.xml
   ```

   - `<ident>` is a unique id, e.g. the slug plus a timestamp.
   - `imsmanifest.xml`: an IMS CP 1.1 manifest with one `<resource>` of
     `type="imsqti_xmlv1p2"` whose `href` and `<file>` point at
     `<ident>/<ident>.xml`.
   - `<ident>.xml`: `<questestinterop>` → `<assessment title="…">` → one
     `<section>` → one `<item>` per question. Per item:
     - `<qtimetadata>` with fields `question_type` (from the table above)
       and `points_possible`.
     - The question text in `<presentation>` → `<material>` →
       `<mattext texttype="text/html">` (HTML-escaped inside).
     - Choices as `<response_lid>`/`<render_choice>` (single cardinality
       for multiple choice and true/false, multiple for multiple answers);
       `<response_str>` with `<render_fib>` for short answer and essay;
       numerical answers via a `<response_str>` plus `<varequal>`/range
       conditions.
     - `<resprocessing>` with an `<outcomes>` `SCORE` decvar (maxvalue 100)
       and `<respcondition>`s that `<setvar>` SCORE to 100 for the correct
       response; for multiple answers, one `<and>` condition requiring all
       correct choices and `<not>` on the others. Essay items get no
       scoring condition.

6. **Build and verify.** Build the zip in the scratchpad, then `cp` it to
   `evaluations/<year>/<slug>/<slug>-qti.zip` (never let `zip` write
   directly into a cloud-synced folder). Verify before reporting:
   - `unzip -l` shows exactly the manifest and the assessment XML.
   - Both XML files parse (`xmllint --noout` if available, else a Node
     `DOMParser`/regex sanity check for balanced tags and escaped `&`).
   - Question count and per-item `question_type`/points match Phase A.

7. **Write the companion file** `evaluations/<year>/<slug>/questions.md`:
   the approved question list with correct answers and points (collega-facing
   — this is the readable source of truth for the zip), plus an "Importeren
   in Canvas" section with the import steps from step 8.

8. **Report in chat**: both paths, question count, total points, and these
   import instructions:
   1. In Canvas, open the course → **Settings** → **Import Course Content**.
   2. Content Type: **QTI .zip file**; choose the generated zip.
   3. Leave the default question bank; check **Import existing quizzes as
      New Quizzes** only if the course uses New Quizzes.
   4. **Import**, wait for *Completed* under Current Jobs.
   5. The quiz appears under **Quizzes**, unpublished. Open it, check every
      question and the point values, set availability dates and time limit
      (QTI does not carry those), then publish.

   Remind the author that a re-import creates a second quiz — delete the old
   one in Canvas after replacing it.

## Rules

- QTI only. Do not attempt Canvas API calls; `lib/canvas/` has no quizzes
  module and the sync state does not track quizzes.
- Every question needs a correct answer on record before Phase B, except
  essays. Never guess a correct answer; ask.
- Question text is student-facing per `docs/style.md`; the companion
  `questions.md` is collega-facing.
- Generated code, ids, and filenames: lowercase, hyphenated, ASCII.
- No commits, no pushes, no staging.

$ARGUMENTS
