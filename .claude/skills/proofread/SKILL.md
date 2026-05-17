---
name: proofread
description: Check a Dutch markdown document for spelling, grammar, natural-Dutch flow, and compliance with docs/style.md. Distinguishes the student-facing register (course/, evaluations/) from the collega-facing register (sources/lesson-plans/, sources/), and applies the right rules. Reports findings; does not auto-fix.
---

# Proofread

Review one markdown document for spelling, grammar, naturalness of Dutch
(no translated-English feel), and `docs/style.md` compliance. Report
findings grouped by severity. Never auto-fix — propose, the author
decides.

## Steps

1. **Determine the target file.**
   - If `$ARGUMENTS` is a path, use it.
   - Else, use the file currently open in the IDE (see `ide_opened_file`
     in the conversation context).
   - Else, ask the author for a path.
   - Only proceed for `.md` files. For other extensions, stop and explain.

2. **Determine the register** from the path:
   - `course/**` or `evaluations/**` → **student-facing**.
   - `sources/lesson-plans/**` or anywhere else under `sources/` →
     **collega-facing**.
   - Otherwise, ask the author which register applies.

   `sources/lesson-plans/lesson-01.md` is the worked example for the
   collega register; `docs/style.md` is the authoritative ruleset.

3. **Read `docs/style.md` in full.** Apply the **shared rules** plus the
   section matching the chosen register. Do not invent rules that are
   not in `style.md`.

4. **Strip the document for linguistic checks.** Build a working copy
   with the following removed:
   - Fenced code blocks (` ``` … ``` `).
   - Inline code spans (`` `…` ``).
   - URLs and markdown link targets.
   - HTML comments (`<!-- … -->`).
   - YAML frontmatter at the top.

   Keep the original line numbers stable when reporting (do not renumber).

5. **Mechanical checks via `Bash` + `grep`.** Run these on the original
   file, then filter out hits that fall inside code blocks or inline
   code. Record line numbers.

   - **Em-dashes** (`—`): `grep -n '—'`. Always a violation, except when
     the em-dash itself is the subject of a sentence quoting the rule
     (e.g. style.md's own definition line).
   - **AI-tell phrases** (case-insensitive): `laten we erin duiken`,
     `in dit hoofdstuk zullen we`, `in deze sectie`, `het is belangrijk
     om op te merken`, `by the end of this lesson`, `geweldig!`,
     `fantastisch!`.
   - **Hollandisms**: `\beven\b` as filler, `\btof\b`, `\bleuk\b` (flag
     and ask whether it earns its keep), `hoor\.?$` at sentence end,
     `gewoon` for emphasis, `best wel`, `\blekker\b` as adverb.
   - **Wrong address form**: `\bu\b` or `\bjij\b` in running prose
     (Dutch course rule is `je`/`jullie`).
   - **Title case in headings**: lines matching `^#{1,6} `. Heuristic:
     more than one capitalised word past the first word, ignoring proper
     nouns and known acronyms (HTML, CSS, URL, HTTP, SEO, Java, IntelliJ,
     etc.).
   - **Headings ending with a period** (style.md: no trailing
     punctuation except `?`).
   - **Audience-mismatch (collega-facing only)**:
     - Page-title emoji on the H1: check whether the first H1 starts with
       one of the student-facing emojis listed in `style.md` (❗️ 🏠 📅
       📝 🛠 🧪 🔎 💪 🚸 🧩 📘 🎬 🅿️ 📕 ⚠️ 💣 ℹ️ 🔁).
     - GitHub-style callouts: `grep -nE '\[!(NOTE|TIP|IMPORTANT|WARNING|ATTENTION|CHECK)\]'`.
   - **Audience-mismatch (student-facing only)**:
     - Opening with a meta-introduction (`In dit hoofdstuk`, `In deze
       sectie`, `Laten we`, `We gaan`) in the first paragraph.

6. **Spelling check.**
   - Detect `hunspell` with `command -v hunspell`. Detect dictionaries
     with `hunspell -D 2>&1 | grep -E 'nl_NL|en_GB'`.
   - If both dictionaries are available, run
     `hunspell -d nl_NL,en_GB -l <stripped-file>` and collect the
     misspelled words.
   - Cross-reference the result with:
     - `cSpell.words` in `.vscode/settings.json` (project whitelist).
     - A built-in skip list of common Java/web/Java-IDE tokens: `Java`,
       `IntelliJ`, `Maven`, `IDE`, `JVM`, `String`, `int`, `boolean`,
       `println`, `Scanner`, `Docusaurus`, `Canvas`, `commit`, `markdown`,
       `frontmatter`, `whitespace`, `framework`, `screenreader`,
       `selector`, `deploy`.
     - Words that appear as variable/identifier in code blocks of the
       same file (treat as deliberate).
   - The remaining set is the candidate-typo list. For each, get up to
     three suggestions: pipe each word through `hunspell -d nl_NL,en_GB
     -a` and parse the `&`/`?` lines.
   - If `hunspell` is unavailable, fall back to a careful visual scan
     for typos. In the report, note that no system spell-checker was
     used and recommend installing `hunspell` with `nl_NL` and `en_GB`
     dictionaries (see the project plan or README).

7. **Content checks (read the stripped document).** These are
   judgement-based; do them carefully, do not flood the report.

   - **Natural Dutch, not translated English** (shared rule). Flag:
     - Literal idiom translations (e.g. _in hun gezicht_ for *in their
       face*, _iets draagbaar maken_ for *make bearable*, _een vlag
       planten_ for *plant a flag*, _sociaal bewijs_ for *social
       proof*).
     - English sentence rhythm in Dutch: long stacked subordinate
       clauses, multiple parenthetical insertions in one sentence.
     - Calques of English collocations and metaphors that do not
       translate literally.
   - **Decorative tricolons**: comma-comma-`en` with three adjectives
     that add nothing (e.g. *snel, eenvoudig en efficiënt*).
   - **Bold scattered through prose**: `**…**` outside list lead-ins or
     a critical first-use of a term.
   - **Trailing summaries**: a section's last paragraph that only
     restates what was said above.
   - **Repeating the heading** as the first line of its section.
   - **Student-facing only**:
     - Sentences clearly above CEFR B2: roughly >25 words or >3 nested
       clauses. Flag as "consider", not as "must fix".
     - Latinate phrasing where plain alternatives exist (*hanteren*
       over *gebruiken*, *dien erop toe te zien* over *zorg ervoor*).
   - **Collega-facing only**:
     - Cushioning before the point (long warm-up paragraph).
     - Defensive hedging (*het zou kunnen zijn dat*, *misschien is het
       interessant om*).

8. **Group and report findings.** Three severity buckets:

   - **Must fix** — hard rule violations from style.md:
     em-dashes, title-case headings, `u`/`jij`, audience-mismatch (emoji
     or callouts in a collega doc; meta-intro in a student doc).
   - **Strongly suggest** — spelling, grammar, anglicisms, AI tells,
     decorative tricolons, scattered bold.
   - **Consider** — sentence length, rhythm, trailing summaries,
     fragment choices.

   For each finding, give: `line | quoted text | diagnosis | proposed
   replacement`. Keep diagnoses to one short sentence.

   If a bucket is empty, say so explicitly. If all three are empty,
   say the document is clean and stop — do not invent findings.

9. **Offer to apply fixes.** Ask whether the author wants:
   - All "must fix" applied automatically.
   - A selection (let them name numbers).
   - None — they will apply manually.

   Default to "none". When applying, use `Edit` calls with minimal
   diffs, one concern per edit. After applying, re-run the mechanical
   checks once to confirm the fixes landed.

10. **Final report.** List what was changed and what was reported but
    left untouched. Do not commit.

## Rules

- Code blocks, inline code, URLs, frontmatter, and HTML comments are
  skipped for all linguistic checks. They are not the document's
  prose.
- Do not invent rules that are not in `docs/style.md`. If something
  reads oddly but breaks no rule: leave it, or surface it under
  "consider" with a one-sentence note.
- Do not auto-fix without explicit confirmation.
- Do not commit, push, or stage changes.
- If the document is clean, say so and stop. No filler findings.
- Treat the collega-facing register as a peer dialect, not as a
  watered-down student register: short fragments, dry humour, and
  parenthetical asides are *welcome* there.

$ARGUMENTS
