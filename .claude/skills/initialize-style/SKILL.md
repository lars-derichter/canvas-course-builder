---
name: initialize-style
description: Interview the user and analyse samples of their writing to rewrite docs/style.md to match their voice, audience, and formatting preferences.
---

# Initialize style

Adapt `docs/style.md` — the writing-style guide Claude Code follows when
drafting course content — to the course author's own voice and audience.

## Steps

1. **Ask for writing samples.** Request 1–3 file paths or pasted text of the
   author's existing course material, blog posts, handouts, or anything
   representative of the voice they want Claude Code to imitate. Samples are
   strongly preferred because they reveal habits the author may not
   articulate in an interview.

   If the author has no samples, proceed with the interview only, and
   **warn them explicitly**: the resulting `style.md` is a best guess. They
   can edit it directly at any time, or invoke `/update-style` after Claude
   Code drafts material and they correct it, so those corrections become
   durable style rules.

2. **Read and analyse the samples.** Note:
   - Language and regional variety.
   - Register (je/u, tu/vous, formal/informal).
   - Sentence length and rhythm.
   - Tone — warm, neutral, formal, playful.
   - Use of personal voice (ik/we/I/we).
   - Punctuation habits — em-dashes, quote style, ellipsis.
   - Emoji usage.
   - Tech-term handling — translated vs kept in source language.
   - Structural patterns — bold lead-ins, callouts, headings case.

3. **Interview the author — only ask what the samples did not answer.**
   Use AskUserQuestion. Candidate topics:
   - Course language and regional variety (Dutch — Flemish/Netherlands;
     English — UK/US; French — FR/BE; German — DE/AT/CH; etc.).
   - Student age band, year/grade, and CEFR level if the course language is
     not the students' first language.
   - Formality: `je`/`u`, `tu`/`vous`, first-name vs last-name basis.
   - Subject area — affects whether technical terms stay in source language
     or get translated.
   - Personal voice: is "ik"/"we" welcome, sparing, or off-limits?
   - Tone latitude: jokes, parenthetical asides, playful foreign phrases —
     welcome, occasional, or never?
   - Instruction style for exercises and exams: same voice as explanations,
     or strictly neutral?
   - Emoji: use the page-title signalling system, a custom set, or none?
   - Callouts: GitHub-alert syntax, Docusaurus admonitions, plain
     blockquotes; preferred titles/labels per type.
   - Punctuation preferences: em-dashes allowed, smart quotes, ellipsis.
   - Headings: sentence case or title case.
   - AI tells the author particularly dislikes — show a few examples from
     the current `style.md` to prime the question.

4. **Summarise and confirm.** Before writing anything, show a short summary
   of the intended changes. Let the author adjust.

5. **Rewrite `docs/style.md`.** Preserve the existing section structure
   (Language, Voice and tone, Exercises/assignments/exams, Structure,
   Headings, Page-title emoji, Callouts, Punctuation, AI tells, Links,
   Code examples). Only the *content* adapts. Keep the English meta-note
   at the top of the file — `style.md` is consumed by AI tools.

6. **Check `CLAUDE.md` at the project root for conflicts.** If anything
   there now contradicts the new `style.md` (for example, a course
   language reference that changed), update it. Otherwise, leave it alone.

7. **Report changes.** Show what changed in `style.md` and `CLAUDE.md`,
   and remind the author they can refine further with `/update-style` or
   by editing the file directly.

## Rules

- Never guess beyond what samples + interview support. When in doubt, ask.
- Do not commit the changes automatically — leave that to the author.

$ARGUMENTS
