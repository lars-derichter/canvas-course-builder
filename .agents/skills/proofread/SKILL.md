---
name: proofread
description: Check a markdown document for spelling, grammar, natural flow, and compliance with docs/style.md (tuned to the shipped Dutch example style guide). Distinguishes the student-facing register (course/, evaluations/) from the colleague-facing register (anything under sources/), and applies the right rules. Reports findings; does not auto-fix. Use for "proofread", "nalezen", "spelling checken", "check dit lesplan op stijl".
---

# Proofread

Review one markdown document for spelling, grammar, naturalness of Dutch (no
translated-English feel), and [`docs/style.md`](../../../docs/style.md)
compliance. Report findings grouped by severity; never auto-fix without
confirmation.

## Input

`$ARGUMENTS` may hold a path. If empty, use the file open in the IDE when it
is visible in the context; otherwise ask. Only proceed for `.md` files — for
other extensions, stop and explain.

## Steps

1. **Determine the register** from the path: `course/**` or `evaluations/**`
   → student-facing; anywhere under `sources/` → colleague-facing; otherwise
   ask. The lowest-numbered lesson under `sources/lessons/` (if any) is the
   worked example for the colleague-facing register.

2. **Read `docs/style.md` in full.** Apply the shared rules plus the section
   matching the register. style.md is the authoritative ruleset — do not
   invent rules it does not contain.

3. **Mechanical checks** with `grep -n` on the file; discard hits inside
   code blocks, inline code, URLs, frontmatter, and HTML comments (they are
   not the document's prose). Check at least:
   - Em-dashes (`—`) — always a violation unless the dash itself is the
     quoted subject.
   - The AI-tell phrases and Hollandisms listed in `style.md` (e.g. "laten
     we erin duiken", "het is belangrijk om op te merken", filler "even",
     "gewoon" for emphasis, "hoor", "tof", "leuk", "lekker" as adverb).
   - Wrong address form: `u` or `jij` in running prose.
   - Title case in headings; headings ending in punctuation other than `?`.
   - Register mismatch: in a colleague-facing doc, a page-title emoji on the H1 or
     GitHub-style callouts (both defined in style.md's student-facing
     section); in a student doc, a meta-introduction opening ("In dit
     hoofdstuk", "We gaan") in the first paragraph.

4. **Spelling.** If `hunspell` with `nl_NL` and `en_GB` dictionaries is
   available (`command -v hunspell`, `hunspell -D`), run it over the prose
   and collect suggestions per candidate typo. Discard words whitelisted in
   `cSpell.words` (`.vscode/settings.json`) or used as identifiers in the
   file's own code blocks. Without hunspell, scan visually, note in the
   report that no system spell-checker ran, and point to the install
   instructions in [`docs/ai-assistants.md`](../../../docs/ai-assistants.md).

5. **Content checks** (judgement-based; do not flood the report):
   - Translated English: literal idiom translations, calqued collocations,
     English sentence rhythm (stacked subordinate clauses, multiple
     parentheticals in one sentence).
   - Decorative tricolons, bold scattered through prose, trailing
     summaries, repeating the heading as the section's first line.
   - Student-facing only: sentences clearly above CEFR B2 (flag as
     "consider", not "must fix"); Latinate phrasing where plain
     alternatives exist (_hanteren_ over _gebruiken_).
   - Colleague-facing only: cushioning before the point; defensive hedging
     (_het zou kunnen zijn dat_).

6. **Report in three severity buckets**, each finding as
   `line | quoted text | diagnosis | proposed replacement`, diagnoses of one
   short sentence:
   - **Must fix** — hard style.md violations: em-dashes, title-case
     headings, `u`/`jij`, register mismatch.
   - **Strongly suggest** — spelling, grammar, anglicisms, AI tells,
     tricolons, scattered bold.
   - **Consider** — sentence length, rhythm, trailing summaries.

   Name empty buckets explicitly; if all three are empty, say the document
   is clean and stop — do not invent findings.

7. **Offer to apply fixes**: all "must fix", a named selection, or none
   (the default). When applying, use minimal edits, one concern per edit,
   then re-run the mechanical checks once to confirm. Close with what
   changed and what was reported but left untouched. Do not commit, push,
   or stage.

## Rules

- Treat the colleague-facing register as a peer dialect, not a watered-down
  student register: short fragments, dry humour, and parenthetical asides
  are welcome there.
- Something that reads oddly but breaks no style.md rule goes under
  "consider" with a one-sentence note, or is left alone.

$ARGUMENTS
