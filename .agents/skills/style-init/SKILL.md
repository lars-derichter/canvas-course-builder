---
name: style-init
description: Interview the user and analyse samples of their writing to rewrite docs/style.md to match their voice, audience, and formatting preferences. Use for "initialize style", "stijlgids opzetten", "schrijfstijl instellen", "set up the style guide".
---

# Style init

Adapt [`docs/style.md`](../../../docs/style.md) — the writing-style guide
your AI assistant follows when drafting course content — to the course
author's own voice and audience.

## Steps

1. **Ask for writing samples**: 1–3 file paths or pasted texts
   representative of the voice the author wants imitated (course material,
   blog posts, handouts). Samples reveal habits the author may not
   articulate. Without samples, proceed interview-only and warn explicitly
   that the resulting `style.md` is a best guess, refinable later via
   `/style-update` or direct edits.

2. **Analyse the samples, then interview only what they did not answer**
   (ask the user, bundling related questions into one round). Dimensions
   for both:
   - Language and regional variety (Dutch — Flemish/Netherlands; English —
     UK/US; …); student age band and CEFR level if the course language is
     not the students' first language.
   - Register and formality (je/u, tu/vous, first-name basis) — for both
     the student-facing and the colleague-facing register.
   - Sentence length, rhythm, and tone latitude (jokes, parenthetical
     asides, personal voice ik/we).
   - Tech-term handling: translated or kept in the source language.
   - Punctuation habits (em-dashes, quote style, ellipsis); headings case.
   - Emoji: the page-title signalling system, a custom set, or none.
   - Callouts: GitHub-alert syntax, Docusaurus admonitions, or plain
     blockquotes; preferred labels per type.
   - Instruction style for exercises and exams: same voice as
     explanations, or strictly neutral.
   - AI tells the author particularly dislikes — prime with examples from
     the current `style.md`.

3. **Summarise and confirm** the intended changes before writing anything.

4. **Rewrite `docs/style.md`.** Read its current headings first and
   preserve the document's structure — in particular the `## Audiences`
   split into student-facing and colleague-facing registers, which
   `/proofread`, `/consistency-check`, and `/fix-issues` depend on. Only
   the content adapts. Keep the English meta-note at the top of the file
   (`style.md` is consumed by AI tools).

5. **Check `AGENTS.md` at the project root** and update it only where it
   now directly contradicts the new `style.md`.

6. **Report** what changed and remind the author they can refine further
   with `/style-update` or by editing the file directly.

## Rules

- Never guess beyond what samples plus interview support; when in doubt,
  ask.
- Do not commit the changes automatically.

$ARGUMENTS
