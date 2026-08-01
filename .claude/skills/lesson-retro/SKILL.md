---
name: lesson-retro
description: Debrief a lesson right after teaching it, in a conversational interview — one question at a time, following up on the answers. Folds timing corrections and tips into the lesson plan's notes-to-self, durable course-wide insights into docs/course-context.md, and lists content fixes for the student material. Use for "lesson retro", "les nabespreken", "retro les 3", "hoe de les gegaan is", "debrief after teaching".
---

# Lesson retro

Capture how a lesson actually went while the author still remembers, and turn
that into durable improvements: timing corrections and notes-to-self in the
lesson plan, insights that hold for every lesson in
[`docs/course-context.md`](../../../docs/course-context.md), and a fix list
for the student material. This is the teaching counterpart of
`/update-style`: the self-improvement loop closed at the level of the lesson,
not the writing.

The interview is a conversation, not a form. Ask **one question at a time**,
in the language the author is chatting in, and follow up on what they say
before moving on. Never bundle the whole interview into one `AskUserQuestion`
call.

## Input

`$ARGUMENTS` may hold a lesson number (`les 3`, `lesson-03`, `3`) and/or
free-text first impressions — treat those as the first interview answers. If
no lesson is given, ask which lesson was taught; if only one lesson plan is
plausibly recent, propose it in the same breath.

## Steps

### Prepare (silently)

1. **Read before asking:**
   - `sources/lessons/lesson-NN.md`, in full — especially the timed blocks
     and the existing notes-to-self.
   - The class version `sources/lesson-plans/lesson-plan-NN.md`, if it
     exists.
   - [`docs/course-context.md`](../../../docs/course-context.md) — to
     recognise when an observation is course-wide rather than
     lesson-specific.

   Do not summarise these back to the author. They taught the lesson; go
   straight to the first question.

### Interview (one question at a time)

2. **Open wide.** First question: how the lesson went, in their own words.
   Everything they volunteer here is material you do not have to ask about.

3. **Then cover the ground below, adaptively.** Skip what the author already
   answered, dig into what they flag, and drop lines that yield nothing after
   one follow-up. Reference the plan's actual block names and time budgets
   in your questions — in the author's language, e.g. "Blok 2 stond op 25
   minuten; klopte dat?" beats "how was the timing?".
   - **Timing** — which blocks ran long or short, where the break actually
     fell, what got cut or rushed at the end.
   - **Comprehension** — what confused students, which questions they asked,
     where the plan's explanation or example did not land.
   - **What worked** — moments to keep and reinforce, not only problems.
   - **Material** — errors or friction in the student pages, exercises, or
     downloads that surfaced during class.
   - **Next time** — anything to add, drop, or reorder.

4. **Know when to stop.** When answers get thin or the author signals done,
   confirm you have what you need and move on. A useful retro can be four
   questions long.

### Propose (in chat, no files yet)

5. **Sort every observation into a destination** and show the sorted list:
   - **Lesson plan `lesson-NN.md`** — timing corrections in the affected
     blocks (adjust the budget, note the reason) and new notes-to-self:
     pitfalls, reserve activities, questions to anticipate. Quote the
     proposed wording.
   - **Class version** — only if it exists and a timing or emphasis change
     affects it.
   - **`docs/course-context.md`** — insights that hold beyond this lesson
     (e.g. "prediction exercises take twice the planned time with this
     group"). Name the section it belongs in.
   - **Student material under `course/`** — content errors and friction: a
     fix list with file paths. Fixing them is a separate job; offer to do it
     after the retro edits land, or leave the list for later.
   - **Writing-style corrections** — do not fold these in here; point the
     author at `/update-style`.

   Mark anything you are unsure about as a question, not a proposal.

6. **Apply after confirmation.** Surgical `Edit`s, one concern per edit.
   Keep the lesson plan's structure and voice: notes-to-self stay in that
   section's existing style, timing changes touch only the numbers and a
   short reason. Never rewrite blocks wholesale.

7. **Report.** What changed where, what was deliberately left as a fix list,
   and — if the author corrected the same kind of thing twice across retros
   — suggest the pattern belongs in `course-context.md`.

## Rules

- Record what happened, in the author's words where possible. No
  editorialising, no invented observations, no padding a thin retro.
- The retro is the one sanctioned way to modify an existing lesson plan;
  touch only the blocks and notes the interview justifies.
- Timing corrections change the plan for *next* year's delivery; if a change
  would alter what the lesson teaches (scope, goals), flag it as a
  `/design-lesson` job instead of editing it in.
- One lesson per retro.
- No commits, no pushes, no staging.

$ARGUMENTS
