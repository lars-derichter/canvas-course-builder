# Claude Code

[Claude Code](https://claude.ai/code) is an AI coding assistant by Anthropic
that runs in your terminal or inside VS Code. It can read your project files,
run commands, and make changes — all guided by natural language instructions.

This project includes a [CLAUDE.md](../CLAUDE.md) file that gives Claude Code
full context about the project structure, available commands, and coding
conventions, so it can assist you effectively out of the box.

## Use cases for course authors

- **Writing course content** — describe what a page or assignment should cover
  and let Claude Code draft the markdown
- **Creating modules and items** — ask Claude Code to run the CLI commands for
  you, filling in names and positions interactively
- **Restructuring courses** — move, rename, merge, or split items across modules
  in bulk
- **Generating markdown from notes** — paste rough notes or bullet points and
  have them turned into polished course pages
- **Debugging sync issues** — describe the problem and let Claude Code inspect
  sync state, logs, and Canvas responses
- **Reviewing content** — ask Claude Code to check for broken links, missing
  frontmatter, or inconsistencies across modules
- **Exporting to PDF or Word** — turn pages, modules, or the whole course into
  printable documents, and derive a custom export style from a reference

## Writing style

Claude Code follows the conventions in [style.md](style.md) when drafting course
content: language register, tone, structure, formatting, and patterns to avoid.

Three skills wrap around `style.md`:

- Run `/proofread <path>` to check an existing document against `style.md`
  (spelling, grammar, naturalness, audience-appropriate register).
- Run `/style-init` once when you set up a new course, to adapt `style.md`
  to your own voice and audience.
- Run `/style-update` now and then after a working session in which you
  corrected Claude Code's drafts, to fold those corrections into `style.md` as
  durable rules so you don't have to repeat them.

You can also edit `style.md` by hand at any time. Treat it as a living document
— the more it reflects your real preferences, the less you'll need to correct
Claude Code's output.

## Course context

Where `style.md` captures *how you write*, [course-context.md](course-context.md)
captures *what your course is*: subject, pedagogy, lesson-plan conventions,
module structure, code/download rules, glossary, and scope boundaries. The
lesson skills (`/design-lesson`, `/summarize-lesson`, `/build-lesson-module`)
read it before generating anything. Run `/initialize-course-context` once when
you set up a course, and again after your README, docs, or course structure
change substantially. Like `style.md`, you can also edit it by hand.

How the lesson skills chain together — from idea to lesson plan to class
version to published module — is described in the
[Lesson Workflow](lesson-workflow.md).

## Skills

Skills are predefined workflows that Claude Code can run. Type the skill name
(e.g. `/commit`) in Claude Code to invoke it.

### /proofread

The `/proofread` skill checks a Dutch markdown document against
[style.md](style.md) and your spelling. It determines the register from the
file path (`course/` and `evaluations/` are student-facing; anything under
`sources/` is collega-facing), applies the shared rules plus the
audience-specific section, runs mechanical and naturalness checks, and
spell-checks with `hunspell` if installed — treating `cSpell.words` in
[.vscode/settings.json](../.vscode/settings.json) and code-block tokens as
the project whitelist.

Findings come back in three buckets — **must fix**, **strongly suggest**,
**consider** — each with the line number, the quoted text, a one-sentence
diagnosis, and a proposed replacement. The skill reports but does not
auto-fix: after the report it offers to apply selected fixes, and the
default is to leave the file alone. Nothing is committed.

For best spell-checking, install `hunspell` with `nl_NL` and `en_GB`
dictionaries:

```bash
brew install hunspell
mkdir -p ~/Library/Spelling && cd ~/Library/Spelling
curl -fLO https://raw.githubusercontent.com/LibreOffice/dictionaries/master/nl_NL/nl_NL.aff
curl -fLO https://raw.githubusercontent.com/LibreOffice/dictionaries/master/nl_NL/nl_NL.dic
curl -fLO https://raw.githubusercontent.com/LibreOffice/dictionaries/master/en/en_GB.aff
curl -fLO https://raw.githubusercontent.com/LibreOffice/dictionaries/master/en/en_GB.dic
```

Without `hunspell`, the skill falls back to a visual spelling scan and says so
in the report.

### /style-init

The `/style-init` skill adapts [style.md](style.md) to your own voice and
audience: it asks for samples of your writing (strongly preferred),
interviews you only about what the samples did not answer — course language,
student level, tone, formality, punctuation, emoji, callouts — and rewrites
`style.md` to match, preserving its structure. Without samples it runs
interview-only and warns you that the result is a best guess.

Run this once when you set up a new course, and again whenever your voice or
audience changes substantially; refine later with `/style-update` or by
editing the file directly.

### /style-update

The `/style-update` skill reviews the current Claude Code conversation for style
corrections, rewrites, and preferences you expressed, and folds them into
[style.md](style.md) as durable rules. Use it after a session in which you
corrected Claude Code's drafts, so you don't have to repeat the same feedback
next time.

### /design-lesson

The `/design-lesson` skill helps you design a new lesson plan under
`sources/lessons/`, following [course-context.md](course-context.md) and the
collega-facing register of [style.md](style.md). It accepts rough notes, a
request for a follow-up to an earlier lesson, or just a vague intent (it
asks up to three sharp questions).

The design comes first, in chat: learning goals, place in the course, block
structure, deliberate exclusions — with honest pros and cons of **your**
suggestions and of **its own**, plus open questions. Nothing is written
until you approve; then it writes `sources/lessons/lesson-NN.md` mirroring
the template lesson, adds new terms to the canonical glossary if your
course keeps one, and suggests follow-ups (`/proofread`,
`/summarize-lesson`, `/build-lesson-module`) without running them. It never
changes existing lessons and never commits.

### /summarize-lesson

The `/summarize-lesson` skill distills a full lesson plan from
`sources/lessons/` into a one-page class version under `sources/lesson-plans/`
— learning goals, content inventory, and a telegram-style timeline that fit on
one A5 page. A teaching reminder for in the classroom, nothing more. It never
invents content: if something belongs on the page but is missing from the
source plan, it surfaces the gap and stops. Grouping labels and headings follow
the Class versions section of [course-context.md](course-context.md).

### /build-lesson-module

The `/build-lesson-module` skill turns a finished lesson plan into a
complete student-facing module under `course/`. It first proposes a design
in chat — module name and position, page split (overview, content pages,
reference cards if your course uses them, summary, glossary, homework),
downloadable code archives, and image placeholders — and stops for your
approval. Only then does it write every file: markdown pages with the right
frontmatter, code archives built to your course's conventions, transparent
placeholder PNGs with TODO notes for images, and `_category_.json`, with
the glossary page generated by `npx course build-glossary` if your course
keeps one. It closes by suggesting verification steps (Docusaurus preview,
`/proofread`) without running them.

It invents nothing beyond the plan, never touches the source lesson or
other modules, and never commits.

### /design-evaluation

The `/design-evaluation` skill is the `evaluations/` counterpart of
`/design-lesson`: it designs an exam or test from the lessons taught so
far. It proposes a blueprint matrix in chat — per question the learning
goal(s) it tests, difficulty, and points — plus a coverage check that flags
goals not tested, goals weighted out of proportion to their lesson time,
and goals tested below the level they were taught at. After your approval
it writes the student-facing `instructions.md` and the collega-facing
`blueprint.md` (matrix, coverage notes, scoring hints) under
`evaluations/<year>/<slug>/`.

It only tests what was taught: every question maps to a goal a lesson in
scope actively practised. Nothing is committed.

### /rubric

The `/rubric` skill builds a grading rubric for one assignment — a homework
page under `course/` or an evaluation under `evaluations/`. Phase A proposes
the criteria × levels matrix in chat, with every criterion traced to a
requirement in the assignment text or a learning goal, plus an alignment
check for requirements without a criterion (and vice versa). After your
approval, Phase B writes a collega-facing markdown rubric — next to the
evaluation, or under `sources/rubrics/` for homework (never inside `course/`,
where it would be served and synced). Output is markdown only; Canvas has no
rubric sync in this project.

### /coverage-map

The `/coverage-map` skill cross-references the course's learning goals
against the lesson plans, the student modules, and the evaluations, and
reports the alignment gaps: goals never practised, practised but never
assessed, assessed but never taught, and goals whose assessment weight is out
of proportion to their teaching time. Every claim cites the files behind it;
inferred mappings are marked as such. Read-only — it only writes a dated
report under `sources/reports/` if you ask for one. Most useful right before
an exam period, or after `/design-evaluation`.

### /consistency-check

The `/consistency-check` skill sweeps every module under `course/` for
cross-file problems a single-file `/proofread` cannot see:

- dead cross-links and missing download/image files;
- glossary drift — terms used before their introducing lesson, synonym use
  where the glossary defines a base term, missing lemmas, and stale generated
  pages (`npx course build-glossary --check`);
- structural issues — duplicate or gapped numeric prefixes, invalid
  frontmatter, `_category_.json`/prefix mismatches;
- stale prerequisite references ("in les 3" about material that moved).

Findings come back in the same three buckets as `/proofread` (**must fix**,
**strongly suggest**, **consider**), each with file, line, and a proposed
fix. Nothing is fixed without confirmation, and only the mechanical
categories are ever auto-applied.

### /build-quiz

The `/build-quiz` skill turns a question list — a notes file, a
`blueprint.md` from `/design-evaluation`, questions drafted in the
conversation, or questions generated from your lessons — into a QTI 1.2
`.zip` that Canvas imports as a quiz. Phase A maps every question to a
supported Canvas question type (multiple choice, multiple answers,
true/false, short answer, numerical, essay), flags anything that fits none,
and stops for approval. Phase B generates the package under
`evaluations/<year>/<slug>/`, verifies its structure and question count, and
writes a collega-facing `questions.md` with the answers.

Importing is manual (there is no quiz sync): in Canvas go to **Settings →
Import Course Content**, choose content type **QTI .zip file**, select the
generated zip, and import. The quiz appears unpublished under **Quizzes**;
check the questions and points, set availability dates and time limit (QTI
does not carry those), then publish. The skill's report repeats these steps.

### /image-todos

The `/image-todos` skill lists all outstanding image work across the course:
the transparent placeholder PNGs and image-TODO comment blocks that
`/build-lesson-module` leaves behind. Placeholders are confirmed by checksum
against the known 1x1 PNG; the report is one table (module, page, image file,
TODO text) plus an orphan list — placeholders without a TODO, TODOs naming
missing files, placeholders no page embeds. Pure report, writes nothing.

### /lesson-retro

The `/lesson-retro` skill debriefs a lesson right after you taught it, in a
conversational interview — one question at a time, following up on your
answers rather than working through a form. It opens wide ("how did it go?"),
then adaptively covers timing per block (using the plan's actual block names
and budgets), student comprehension, what worked, material friction, and
what to change next time.

Afterwards it sorts every observation into a destination and shows the list
before touching anything: timing corrections and notes-to-self go into the
lesson plan, insights that hold course-wide go into
[course-context.md](course-context.md), content errors in student pages
become a fix list, and writing-style corrections are pointed at
`/style-update`. The retro is the one sanctioned way to modify an existing
lesson plan; scope changes are flagged as a `/design-lesson` job instead.

### /export-style-create

The `/export-style-create` skill derives a reusable PDF/DOCX export style from a
reference — a Word document, a PDF, a website, or a CSS file. Phase A inspects
the source, works out the fonts, colours, spacing, and margins, and proposes a
style spec that maps each decision to where it applies (the Typst template for
PDF, the `reference.docx` styles for Word), then stops for approval. Phase B
forks the shipped defaults into `sources/export-style/`, edits the template and
the Word XML (keeping the custom alert and link-card styles intact), and
regenerates the sample so you can see the result. See
[export-styling.md](export-styling.md) for how the pipeline fits together.

### /export-style-edit

The `/export-style-edit` skill makes a plain-language change to an existing
export style — "headings dark blue", "bigger margins", "font Georgia" — editing
`sources/export-style/template.typ` (PDF) and/or `reference.docx` (Word),
keeping the two formats in sync, then regenerating the sample. It forks the
shipped defaults on first use, so your style survives upstream updates.

### /initialize-course-context

The `/initialize-course-context` skill fills in or refreshes
[course-context.md](course-context.md): it reads the repo — README,
CLAUDE.md, `style.md`, course-specific docs, existing modules and lesson
plans — infers everything it can, interviews you only about what the repo
did not answer, and writes the doc after a per-section confirmation. It
also warns if `docs/course-context.md` is missing from `protected_files` in
`update-from-upstream.conf`, so upstream updates don't overwrite it.

Re-running is expected: existing content is treated as confirmed and only
updated where the repo now contradicts it. Nothing is committed automatically.

### /report-issue

The `/report-issue` skill logs an error or a wanted change while you are
checking course material — on the site, in Canvas, or in the raw markdown —
without pulling you out of your reviewing flow. Describe the problem and
where you saw it (a page title as rendered is fine; it maps that back to the
file); the skill pins the exact passage, quotes it back, and appends one
bullet to the issue queue in `sources/issues.md`. It asks at most one
clarifying question, and if the location stays ambiguous it logs the report
anyway with a marker rather than interrogating you.

It never fixes or diagnoses anything — that is `/fix-issues` — and it never
commits. The queue file is created on first use, is safe to hand-edit, and
documents its own entry format.

### /fix-issues

The `/fix-issues` skill works through the open entries in
`sources/issues.md`, in two phases. Phase A is triage: it verifies every
entry against the current files, groups related ones, and checks the wider
implications of each fix — the same defect on other pages, a style
preference that belongs in `style.md` (routed to `/style-update`, never
folded in silently), glossary drift, contradictions with
`course-context.md`, lesson plans, or evaluations. It bundles all its
clarifying questions into a single round, presents one fix plan, and stops.

Phase B runs only after you approve the plan: it applies the fixes, runs a
style pass on the touched passages, and moves each handled entry to the
queue's Resolved section with the date and what fixed it. Nothing is
committed, and Canvas keeps serving the old text until you run
`npx course push` yourself.

### /commit

The `/commit` skill makes committing safer and more consistent: it reviews
the changes, stages the appropriate files, and creates a commit following
the project conventions.

#### Commit message conventions

- Imperative, present tense, verb-first (e.g. _Add_, _Fix_, _Update_, _Remove_,
  _Rename_).
- Single-line summary — no conventional-commit prefixes like `feat:` or `fix:`.
- Focus on _what_ changed and _why_, not implementation details.

Examples:

```
Add reset-canvas command to wipe all content from a Canvas course
Upload files to module-named Canvas folder instead of unfiled
Fix push failing to add pages/assignments to Canvas modules
```

## Writing your own skills

Skills live in `.claude/skills/<name>/SKILL.md`. The shipped skills follow a
shared template; new ones should too, so they stay predictable for both the
reader and the model:

- **Frontmatter**: `name` (matching the folder) and a `description` that
  says what the skill does, where it writes, and the approval gate if any,
  ending in four or five quoted trigger phrases in English and Dutch.
- **Section order**: H1, a 2–4-line intro, `## Input` (only when the skill
  takes arguments — describe the `$ARGUMENTS` forms and the fallback),
  `## Steps`, `## Rules`, and a bare `$ARGUMENTS` line at the end.
- **Approval gates** only when a skill writes something worth reviewing
  first. Split `## Steps` into `### Phase A — <Verb> (writes nothing)` and
  `### Phase B — <Verb> (only after approval)`, and end Phase A with the
  canonical sentence: "Stop. Wait for explicit approval before starting
  Phase B."
- **State each rule once.** A rule already carried by a step does not
  reappear under `## Rules`; drop the Rules section if nothing is left.
- **Defer, don't copy.** Content owned by [style.md](style.md),
  [frontmatter.md](frontmatter.md), or
  [course-context.md](course-context.md) is referenced, never inlined —
  copies drift. Dense reference payloads (format specs, protocol details)
  go in a `references/` file inside the skill folder, read on demand.
- **Course-agnostic.** No hardcoded course vocabulary, module names, or
  paths that exist in only one course; course facts come from
  `course-context.md` at runtime.
- **Temp files** go to the session scratchpad, never `/tmp`. Build zips and
  binaries there and copy them into the repo (cloud-synced folders can
  reject direct writes).
- **Naming**: verb-first for actions on course material — `design-*` for
  gated interactive authoring, `build-*` for generation from an approved
  source, `initialize-*` for one-time setup interviews — and noun-first for
  configuration clusters (`style-*`, `export-style-*`) so related skills
  sort together.

If you rename or remove a skill folder in this template repo, add the old
path to `STALE_PATHS` in
[update-from-upstream.sh](../update-from-upstream.sh) so downstream
projects prune it on their next update.
