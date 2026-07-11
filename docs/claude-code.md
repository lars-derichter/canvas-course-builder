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

## Writing style

Claude Code follows the conventions in [style.md](style.md) when drafting course
content: language register, tone, structure, formatting, and patterns to avoid.

Three skills wrap around `style.md`:

- Run `/proofread <path>` to check an existing document against `style.md`
  (spelling, grammar, naturalness, audience-appropriate register).
- Run `/initialize-style` once when you set up a new course, to adapt `style.md`
  to your own voice and audience.
- Run `/update-style` now and then after a working session in which you
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
[style.md](style.md) and your spelling. When you type `/proofread <path>` in
Claude Code it will:

1. Determine the register from the file path (`course/`, `evaluations/` are
   student-facing; `sources/lessons/`, `sources/lesson-plans/`, and anything
   else under `sources/` are collega-facing). For other paths, it asks.
2. Read `style.md` and apply the shared rules plus the audience-specific
   section.
3. Run mechanical checks: em-dashes, AI-tell phrases, Hollandisms, title-case
   headings, address form (`u`/`jij`), audience-mismatch (page-title emoji or
   callouts in a collega doc; meta-intros in a student doc).
4. Spell-check with `hunspell` if installed, treating `cSpell.words` in
   [.vscode/settings.json](../.vscode/settings.json) and code-block tokens as
   the project whitelist.
5. Read the prose for naturalness: anglicisms and translated-English patterns,
   decorative tricolons, scattered bold, trailing summaries.
6. Report findings in three buckets: **must fix**, **strongly suggest**,
   **consider**. Each finding includes the line number, the quoted text, a
   one-sentence diagnosis, and a proposed replacement.

The skill reports but does not auto-fix. After the report it offers to apply
selected fixes; the default is to leave the file alone. Nothing is committed.

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

### /initialize-style

The `/initialize-style` skill adapts [style.md](style.md) to your own voice and
audience. When you type `/initialize-style` in Claude Code it will:

1. Ask for samples of your own writing and read them (strongly preferred).
2. Interview you about course language, student level, tone, formality,
   punctuation, emoji, and callout preferences — only the parts the samples did
   not already answer.
3. Rewrite `style.md` to match, preserving its section structure.
4. Update [CLAUDE.md](../CLAUDE.md) if anything in it now contradicts the new
   style.

If you have no samples, the skill will run interview-only and warn you that the
result is a best guess. You can still edit the file directly afterwards or
refine it later with `/update-style`.

Run this once when you set up a new course, and again whenever your voice or
audience changes substantially.

### /update-style

The `/update-style` skill reviews the current Claude Code conversation for style
corrections, rewrites, and preferences you expressed, and folds them into
[style.md](style.md) as durable rules. Use it after a session in which you
corrected Claude Code's drafts, so you don't have to repeat the same feedback
next time.

### /design-lesson

The `/design-lesson` skill helps you design a new lesson plan under
`sources/lessons/`, following [course-context.md](course-context.md) and the
collega-facing register of [style.md](style.md). It accepts rough notes, a
request for a follow-up to an earlier lesson, or just a vague intent (it will
ask up to three sharp questions). When you type `/design-lesson` in Claude Code
it will:

1. Read `course-context.md`, `style.md`, all existing lesson plans, and the
   structural template lesson.
2. Propose a design in chat — learning goals, place in the course, block
   structure, deliberate exclusions — with honest pros and cons of **your**
   suggestions and of **its own**, plus open questions.
3. Stop and wait. Nothing is written until you approve the design.
4. After approval, write `sources/lessons/lesson-NN.md` mirroring the template
   lesson, and add new terms to the canonical glossary if your course keeps
   one.
5. Suggest follow-ups without running them: `/proofread`, `/summarize-lesson`,
   `/build-lesson-module`.

It never changes existing lessons and never commits.

### /summarize-lesson

The `/summarize-lesson` skill distills a full lesson plan from
`sources/lessons/` into a one-page class version under `sources/lesson-plans/`
— learning goals, content inventory, and a telegram-style timeline that fit on
one A5 page. A teaching reminder for in the classroom, nothing more. It never
invents content: if something belongs on the page but is missing from the
source plan, it surfaces the gap and stops. Grouping labels and headings follow
the Class versions section of [course-context.md](course-context.md).

### /build-lesson-module

The `/build-lesson-module` skill turns a finished lesson plan into a complete
student-facing module under `course/`. When you type
`/build-lesson-module <lesson>` in Claude Code it will:

1. Read the lesson plan, [course-context.md](course-context.md),
   [style.md](style.md), [frontmatter.md](frontmatter.md), and one or two
   existing modules as worked examples.
2. Propose a design in chat: module name and position, page split (overview,
   content pages, reference cards if your course uses them, summary, glossary,
   homework), downloadable code archives, and image placeholders.
3. Stop and wait for your approval. Nothing is written in this phase.
4. After approval, write every file: markdown pages with the right
   frontmatter, code archives built to your course's conventions, transparent
   placeholder PNGs with TODO notes for images, and `_category_.json`. If your
   course keeps a canonical glossary, the module's glossary page is generated
   with `npx course build-glossary`.
5. Report what was created and suggest verification steps (Docusaurus preview,
   `/proofread`) without running them.

It invents nothing beyond the plan, never touches the source lesson or other
modules, and never commits.

### /design-evaluation

The `/design-evaluation` skill is the `evaluations/` counterpart of
`/design-lesson`: it designs an exam or test from the lessons taught so far.
When you type `/design-evaluation <scope>` in Claude Code it will:

1. Read [course-context.md](course-context.md), [style.md](style.md), every
   lesson plan in scope, and existing evaluations as worked examples.
2. Propose a blueprint matrix in chat — per question: the learning goal(s) it
   tests, difficulty level, and points — plus a coverage check that flags
   goals not tested, goals weighted out of proportion to their lesson time,
   and goals tested below the level they were taught at.
3. Stop and wait for your approval.
4. After approval, write two files under `evaluations/<year>/<slug>/`: the
   student-facing `instructions.md` and the collega-facing `blueprint.md`
   (matrix, coverage notes, scoring hints).

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

### /initialize-course-context

The `/initialize-course-context` skill fills in or refreshes
[course-context.md](course-context.md). When you type
`/initialize-course-context` in Claude Code it will:

1. Read what is already in `course-context.md` and note which sections are
   still the shipped `TODO` template.
2. Read the repo — README, CLAUDE.md, `style.md`, course-specific docs,
   existing modules and lesson plans — and infer everything it can.
3. Interview you (only) about what the repo did not answer: learning-goal
   scheme, page roles, code-download layout, scope boundaries, and so on.
4. Show a per-section summary for confirmation, then write the doc.
5. Warn you if `docs/course-context.md` is missing from `protected_files` in
   `update-from-upstream.conf`, so upstream updates don't overwrite it.

Re-running is expected: existing content is treated as confirmed and only
updated where the repo now contradicts it. Nothing is committed automatically.

### /commit

The `/commit` skill makes committing safer and more consistent. When you type
`/commit` in Claude Code it will:

1. Review all staged and unstaged changes.
2. Stage the appropriate files.
3. Create a commit with a clear message following the project conventions.

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
