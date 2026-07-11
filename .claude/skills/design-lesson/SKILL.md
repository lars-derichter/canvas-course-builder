---
name: design-lesson
description: Help draft a new lesson plan in sources/lessons/, following docs/course-context.md and the collega-facing register of docs/style.md. Accepts rough notes, a request for the next logical lesson, or pure Q&A — any combination. Always presents a design with pros/cons of the author's suggestions and of its own before writing a draft. Use for "design lesson", "nieuwe les ontwerpen", "lesplan opzetten", "les X uitwerken", "vervolg op les X".
---

# Design lesson

Design a new lesson plan together with the author, written to
`sources/lessons/lesson-NN.md` in the collega-facing register of
[`docs/style.md`](../../../docs/style.md), following the course conventions in
[`docs/course-context.md`](../../../docs/course-context.md).

The skill runs in two phases. Phase A is a design conversation; no file is
written. Phase B writes the full lesson plan, but only after the author has
approved the design from Phase A.

## Inputs

`$ARGUMENTS` may contain:

- A lesson number (`les 4`, `lesson-04`, or `4`).
- A path to a notes file with rough ideas.
- Free text with intent (e.g. _"follow-up to lesson 3, focus on control
  flow"_).
- A combination of the above.

The author may also simply ask for _"the next logical lesson"_ with no further
input. The skill supports three input modes that can be combined:

- **Notes mode.** The author gives rough bullets or a notes file. Treat them as
  hard constraints, not as suggestions to _"round out"_.
- **Progression mode.** The author asks for a follow-up to an earlier lesson.
  Derive the scope from the course context and from what earlier lessons have
  actively practised versus only seeded.
- **Q&A mode.** The author has only a vague intent. Ask at most three sharp
  questions before proposing a design.

## Steps

### Phase A — Design (always first, never skip)

1. **Read the fixed inputs**, in this order:
   - [`docs/course-context.md`](../../../docs/course-context.md) — pedagogy,
     learning-goal scheme, lesson-plan conventions, scope boundaries. Follow
     any framework or convention documents it points to. For each section that
     is still `TODO` and that this design needs, gather the answer yourself:
     infer it from the repo where possible, otherwise ask the author — and at
     the end of the session offer to save what you learned back into
     `course-context.md`.
   - [`docs/style.md`](../../../docs/style.md) — shared rules and the
     collega-facing section. The lesson plan is written in the course's
     language and register as defined there.
   - All existing files in `sources/lessons/`. Read them in full. Track which
     course-wide learning goals are actively touched and which are only
     seeded, and any running context (project, storyline, case) at each point.
   - The structural template: the lesson plan named in `course-context.md`,
     or, failing that, the lowest-numbered existing file in `sources/lessons/`.
     If the folder is empty, propose a lesson-plan structure (goals,
     preparation, timed blocks, deliberate exclusions, notes-to-self), confirm
     it with the author, and note it as a candidate for `course-context.md`.

2. **Determine the target lesson number.**
   - From `$ARGUMENTS` if given.
   - Otherwise the next free slot in `sources/lessons/lesson-NN.md`.
   - Confirm the number with the author before continuing. One sentence is
     enough.

3. **Classify the input mode** (notes, progression, Q&A, or a combination).
   - **Q&A**: ask at most three questions, bundled through one AskUserQuestion
     call where useful. Questions cover: the concrete moment in the course's
     running context (project, case, storyline — see `course-context.md`),
     which course-wide learning goals are active versus seeded, ambition
     (calm / standard / bold), and any material constraints.
   - **Progression**: present **two or three candidate directions neutrally
     side by side**, with pros and cons per direction. Do not pick a favourite
     up front. Let the author choose before you design further.
   - **Notes**: treat the bullets as hard constraints. Do not stay silent
     about a suggestion that falls outside the course's scope boundaries, but
     flag it explicitly under _Pros and cons — my suggestions_.

4. **Write the design as a chat message**, not a file. Fixed sections:
   - **One-sentence proposal.** What the lesson is, in the voice of the
     template lesson's opening line.
   - **Lesson-specific learning goals (proposal).** Three to five bullets,
     each tied to the course's learning-goal scheme using the reference
     notation defined in `course-context.md` (if the course has none, plain
     goals without references).
   - **Place in the course.** Two sentences: a concrete moment in the running
     context and what students bring from earlier lessons.
   - **Block structure in broad strokes.** The lesson's blocks with activity
     and time budget. No full timing at this stage.
   - **What the lesson deliberately does not do.** Two or three exclusions,
     motivated from the course context.
   - **Pros and cons.** Two sub-headings:
     - _Your suggestions._ One bullet per author input element. What it gains,
       what it costs. Honest. No reflexive nodding.
     - _My suggestions._ The same for what the skill adds or proposes to
       deviate from the input. Explicitly mention alternatives that are _not_
       in the proposal and why not.
   - **Open questions.** Everything the author must decide before you write a
     full lesson plan.

5. **Stop. Wait for a reply.** Adjust the design on request, and stay in
   Phase A until the author explicitly approves. Write no file in Phase A.

### Phase B — Draft (only after approval)

6. **Write the full lesson plan** to `sources/lessons/lesson-NN.md`, with the
   same structure, section order, heading levels, and separator conventions as
   the template lesson. Typical elements (follow the template where it
   differs):
   - Title and an opening paragraph of two to four sentences: which lesson
     this is, what the previous lesson delivered, where this lesson is
     heading.
   - The lesson-specific learning goals as proposed in Phase A, in the
     template's notation.
   - The lesson's place in the running context, and what it must deliver.
   - **Preparation** — what the teacher sets up, what students already have.
   - **Timed blocks** with sub-sections per time slot, adding up to the
     course's lesson length (see `course-context.md`), breaks included. Code
     or material samples where they carry the explanation, not as decoration.
   - **Deliberate exclusions** — what the lesson consciously does not do,
     each motivated in one sentence.
   - **Notes to self** — only tips not already elsewhere in the plan: timing
     pitfalls, reserve activities, anticipated questions.

   Where the lesson introduces something that later becomes a student-facing
   reference page (a card, cheat sheet, or similar — see the module
   conventions in `course-context.md`), name it in the block prose the way the
   existing lessons do, so `/build-lesson-module` can pick it up later.

7. **Style pass before you write.** Apply the collega-facing checklist from
   `docs/style.md` to the whole draft: language and register, headings,
   punctuation, AI-tell patterns, callout rules. The lesson plan targets a
   fellow teacher, not students — do not use student-facing conventions
   (page-title emoji, student callouts) unless `style.md` says otherwise.

8. **Write the file.** One `Write` to `sources/lessons/lesson-NN.md`. No
   commit, no push, no change to earlier lessons or to other skills.

9. **Update the glossary — only if the course has one** (see the Glossary
   section of `course-context.md`). Add the new technical terms a student
   meets in this lesson for the first time to the canonical glossary file,
   following that file's own header/field conventions:
   - **Collect** every term a student would look up: concepts, keywords,
     types, operators, pattern names.
   - **Filter** out what is already a lemma or a synonym under another lemma.
     Do not standardise on a synonym and do not invent new ones.
   - **Add the rest** with this lesson's number and a definition of one or two
     sentences in the student-facing voice of the existing entries.
   - **If in doubt** whether a term deserves an entry, put it to the author
     through one `AskUserQuestion` call with your proposal.
   - Do not touch existing entries unless asked. Page regeneration happens in
     `/build-lesson-module` (`npx course build-glossary`); do not run it here.

10. **Offer follow-up steps, do not run them.** Report the path. Propose as
    separate steps:
    - `/proofread` on the new lesson plan.
    - `/summarize-lesson` for the one-page class version under
      `sources/lesson-plans/`.
    - `/build-lesson-module` when the lesson is ready to become a student
      module.
    - If you gathered course facts that `course-context.md` was missing, offer
      to save them there now.

## Rules

- The skill targets the collega-facing register. Mirror the conventions of the
  template lesson plan, not of `course/`.
- Do not invent learning goals or activities that do not follow from the
  author's input or from the course context. What comes from your own
  initiative belongs in _Pros and cons — my suggestions_.
- One lesson plan per call. Do not work on multiple lessons at once.
- Never change existing lessons under `sources/lessons/`. The only written
  artefacts are `sources/lessons/lesson-NN.md` for the new N and, when
  applicable, new glossary entries.
- No commits, no pushes, no staging.
- If the author raises a topic listed under the scope boundaries in
  `course-context.md`, flag it in Phase A and propose an alternative. Do not
  stay silent about it.

$ARGUMENTS
