---
name: summarize-lesson
description: Generate a concise class version (one-page teaching reminder) of a full lesson plan from sources/lessons/ and write it to sources/lesson-plans/. Use for "class version", "klasversie maken", "bondig lesplan", "summarize lesson", "A5-versie van lesplan", "reminder voor in de klas".
---

# Summarize lesson

Turn a full lesson design under `sources/lessons/` into a class version under
`sources/lesson-plans/`: one page (think A5), learning goals + content +
timeline in telegram style. A teaching reminder for in the classroom, nothing
more.

Conventions come from the Class versions section of
[`docs/course-context.md`](../../../docs/course-context.md); the lowest-numbered
existing file under `sources/lesson-plans/` (if any) is the worked example to
mirror. Where both are silent, use the defaults below.

## Steps

1. **Determine the source file.**
   - If `$ARGUMENTS` contains a path, use it.
   - Else, if `ide_opened_file` is under `sources/lessons/`, use that.
   - Else, ask the author for a path.
   - Stop if the file is not `.md` or not under `sources/lessons/`. Explain
     why in one sentence.

2. **Determine the destination.**
   - Map `sources/lessons/lesson-NN.md` to
     `sources/lesson-plans/lesson-plan-NN.md`. Keep the two-digit number,
     prepend `lesson-plan-` instead of `lesson-`.
   - If the destination already exists, show its current contents and ask
     whether to overwrite, merge, or stop.

3. **Read the inputs.**
   - The source lesson in full.
   - [`docs/course-context.md`](../../../docs/course-context.md) — the Class
     versions section (grouping labels for the content inventory) and the
     Pedagogy section (the learning-goal reference notation). If the Class
     versions section is still `TODO`, use the defaults below and offer at the
     end to record the choices made.
   - [`docs/style.md`](../../../docs/style.md), shared rules + collega-facing
     section.
   - The worked example under `sources/lesson-plans/`, if one exists.

4. **Check the source's learning goals.** The source is expected to state
   lesson-specific learning goals in the course's notation (see the template
   lesson and `course-context.md`). The skill does not verify or repair this.
   If they are missing, stop and tell the author to first bring the source in
   line with the course's lesson-plan format.

5. **Draft the class version.** Fixed structure (mirror the worked example
   where it deviates):

   - **H1**: identical to the source title.
   - **Pointer line**, single line after the title: a link to the source
     lesson plan plus a note that this is a teaching reminder, not a design
     document (in the course's language, e.g.
     `Klasversie van [lesson-NN.md](../lessons/lesson-NN.md). Geheugensteun,
     geen ontwerpdocument.`).
   - **Learning goals section**: one short line per goal, telegram style,
     keeping the course's goal-reference notation in compact form. Strip each
     goal to its kernel verb + object. Keep 3–6 items.
   - **Content section**: the lesson's concepts as a compact list. If
     `course-context.md` defines inventory groups (e.g. passive decor vs.
     actively practised vs. flagged-for-later), use those labels and omit
     empty groups; otherwise a plain concept list.
   - **Timeline section**: chronological bullet list. Each bullet:
     - Starts with `**HH:MM–HH:MM (N min) — Activity name.**` in bold.
     - Then telegram style: short sentences or sentence fragments. No
       rationale, no "why".
     - Breaks and short transitions get one sentence.
     - Concrete decisions stay: key examples, commands, links to homework
       scaffolds, the exit-ticket question.
   - **Optional sections, only if the source has them**: reserve activities
     (one line), materials (one line).

   Section headings are in the course's language (`Leerdoelen`/`Inhouden`/
   `Tijdslijn`, `Learning goals`/`Content`/`Timeline`, ...), matching the
   worked example or `style.md`.

6. **Leave out.**
   - Pedagogical rationale and method explanations.
   - "What this lesson deliberately does not do"-style considerations.
   - Notes-to-self sections.
   - Stuck-protocols or class management, unless the author explicitly asks
     for them on the page.
   - Long example code blocks. Replace with a short inline reference to the
     example's key tokens.

7. **Length check.**
   - Aim for ~30–40 visible lines after rendering. One A5 page should remain
     plausible.
   - If too long, tighten the timeline first. Goals and content are already
     terse; do not touch them unless the timeline alone is not enough.

8. **Style check.** Apply the collega-facing checklist from `docs/style.md`:
   language and register, sentence-case headings, punctuation, AI-tell
   patterns. No page-title emoji, no student-facing callouts — those belong to
   the student register, unless `style.md` says otherwise.

9. **Write the destination file.** No commit, no push. Tell the author the
   path.

10. **Offer follow-up steps, do not run them.**
    - Open a markdown preview or print-preview to confirm the page fits.
    - Run `/proofread` on the result; it covers this register.
    - If you made grouping or heading choices `course-context.md` did not
      cover, offer to record them there.

## Rules

- The skill targets the collega-facing register. Mirror the conventions of the
  worked example under `sources/lesson-plans/`, not those of `course/`
  materials.
- Never invent activities or learning goals that are not in the source. If
  something belongs on the page but is missing from the source, surface the
  gap to the author and stop.
- Do not commit, push, or stage changes.
- Do not modify the source lesson. The only output is the new file under
  `sources/lesson-plans/`.

$ARGUMENTS
