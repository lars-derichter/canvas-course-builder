---
name: consistency-check
description: Whole-course consistency sweep of course/ — dead cross-links, terms used before their introducing lesson, glossary drift, duplicate or gapped numeric prefixes, frontmatter problems, stale prerequisite references. Complements /proofread, which checks a single file. Reports findings grouped by severity; does not auto-fix. Use for "consistency check", "consistentiecheck", "dode links zoeken", "hele cursus nakijken", "cursusbrede controle", "check alle modules".
---

# Consistency check

Sweep every module under `course/` for cross-file problems that a single-file
`/proofread` cannot see: dead links, glossary and terminology drift,
structural numbering issues, and stale prerequisite references. Report
findings grouped by severity. Never auto-fix — propose, the author decides.

## Input

`$ARGUMENTS` may name one or more module folders (e.g. `03-methoden`) to
limit the sweep. Empty means all of `course/`. Link targets outside the
scoped modules are still verified.

## Steps

1. **Read the course facts.**
   [`docs/course-context.md`](../../../docs/course-context.md) — whether the
   course keeps a glossary and where (default
   `sources/reference-materials/glossary.yml`), and the module conventions.
   [`docs/frontmatter.md`](../../../docs/frontmatter.md) — valid frontmatter
   per content type. If the Glossary section is `TODO`, check whether the
   default glossary file exists; if the repo gives no answer, ask the author
   once and offer to save the answer into `course-context.md`.

2. **Inventory the course.** List every module folder, its pages, and its
   `_files/` contents (`find course -type f`). Record each page's numeric
   prefix, frontmatter, and `_category_.json` per module.

3. **Dead cross-links.** Extract every relative link target from the pages
   with `Bash` + `grep -nE '\]\([^)]+\)'` (and `src=`/`href=` in raw HTML),
   keeping file and line. For each target that is a relative path — `.md`
   pages, `_files/` downloads and images — resolve it against the linking
   file's directory and verify it exists on the filesystem. Strip anchors
   and query strings before checking; skip absolute URLs.

4. **Glossary checks** — only if the course keeps one; otherwise skip this
   step and say so in the report.
   - **Terms before their lesson**: for each glossary term with a lesson
     number, grep the modules numbered *before* that lesson for the term
     (and its synonyms) in prose. Filter hits inside code blocks and inline
     code. A term casually used before the lesson that introduces it is a
     finding.
   - **Missing lemmas**: technical terms that recur across pages, look
     glossary-worthy, and have no entry in the canonical glossary file.
     Judgement-based; keep it to clear cases.
   - **Synonym drift**: pages using a synonym where the glossary defines a
     base term. First use with the synonyms named once is fine (see the
     terminology rule in `/build-lesson-module`); consistent use of the
     synonym instead of the base term is a finding.
   - **Generated pages up to date**: run
     `npx course build-glossary --check`. A failure is a must-fix finding.

5. **Structure.**
   - Duplicate numeric prefixes within one module or within `course/`
     itself; gaps in the sequence (report gaps as "consider" — they may be
     deliberate).
   - Frontmatter problems per `docs/frontmatter.md`: unknown `canvas_type`
     values, `external_url` items without `external_url`, assignment pages
     missing the fields the worked examples carry.
   - `_category_.json` whose `position` does not match the folder's numeric
     prefix, or module folders missing `_category_.json` where the other
     modules have one.

6. **Stale prerequisites.** Grep for phrases like "de vorige les",
   "vorige module", "in les [0-9]", "module [0-9]" and for cross-module
   links, and check each against the actual current numbering and folder
   names. A page that says "in les 3" about material that now lives in
   lesson 4, or links to a renamed module, is a finding.

7. **Group and report findings.** Three severity buckets:

   - **Must fix** — dead links, `build-glossary --check` failures,
     duplicate prefixes, invalid frontmatter.
   - **Strongly suggest** — terms used before their introducing lesson,
     synonym drift, stale prerequisite references,
     `_category_.json`/prefix mismatches.
   - **Consider** — prefix gaps, candidate glossary lemmas.

   For each finding: `file:line | quoted text | diagnosis | proposed fix`.
   Keep diagnoses to one short sentence. If a bucket is empty, say so
   explicitly. If all three are empty, say the course is consistent and
   stop — do not invent findings.

8. **Offer to apply mechanical fixes.** Only the mechanical categories
   qualify: dead links with an obvious correct target, prefix and
   `_category_.json` corrections. Ask whether the author wants all, a
   selection by number, or none — default is none. When applying, use
   `Edit` calls with minimal diffs, then re-run the relevant check to
   confirm. Judgement findings (glossary, terminology, prerequisites) are
   never auto-fixed; the author handles those.

## Rules

- Every mechanical finding is verified against the filesystem or a command
  result; a grep hit alone is not a finding.
- Skip code blocks, inline code, URLs, frontmatter, and HTML comments for
  terminology checks. Link extraction uses the raw file.
- Course specifics (glossary path, module conventions) come from
  `course-context.md` at runtime; hardcode nothing.
- No commits, no pushes, no staging.

$ARGUMENTS
