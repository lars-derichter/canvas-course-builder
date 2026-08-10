# AI assistants

This project is set up for AI coding assistants that run in your terminal
or inside VS Code, such as Claude Code and OpenAI Codex. They can read your
project files, run commands, and make changes, all guided by natural
language.

An [AGENTS.md](../AGENTS.md) file at the project root gives any assistant
full context about the project structure, available commands, and
conventions, so it can help effectively out of the box.
[CLAUDE.md](../CLAUDE.md) is a one-line import of the same file, because
Claude Code reads that name.

## Supported tools

- **[Claude Code](https://claude.ai/code)** reads `AGENTS.md` through
  `CLAUDE.md`, discovers the skills through the `.claude/skills` alias, and
  invokes them as `/name`.
- **[OpenAI Codex](https://developers.openai.com/codex)** reads `AGENTS.md`
  and discovers the skills in `.agents/skills/` natively.
- **Other tools**: point them at `AGENTS.md`. The skills are plain
  markdown, so you can paste a skill's instructions into any assistant that
  lacks skill support.

On Windows, skills need one git setting before they are found; see
[Troubleshooting](troubleshooting.md#skills-not-found-on-windows).

## Use cases for course authors

- **Writing course content**: describe what a page or assignment should
  cover and let the assistant draft the markdown.
- **Creating modules and items**: ask the assistant to run the CLI commands
  for you, filling in names and positions interactively.
- **Restructuring courses**: move, rename, merge, or split items across
  modules in bulk.
- **Generating markdown from notes**: paste rough notes and have them
  turned into polished course pages.
- **Debugging sync issues**: describe the problem and let the assistant
  inspect sync state, logs, and Canvas responses.
- **Reviewing content**: check for broken links, missing frontmatter, or
  inconsistencies across modules.
- **Exporting to PDF or Word**: turn pages, modules, or the whole course
  into printable documents, with a style derived from your own reference.

## Writing style

Your AI assistant follows the conventions in [style.md](style.md) when
drafting course content: language, register, tone, structure, formatting,
and patterns to avoid. The shipped `style.md` is the English baseline,
usable as it stands; run `/style-init` early to adapt it to your own voice
and audience (see [Customization](customization.md)). If you would rather
skip the interview, `templates/` also ships baselines for Flemish Dutch and
Netherlands Dutch: copy the one matching your course over `docs/style.md`
and edit from there.

Three skills wrap around `style.md`:

- `/style-init` adapts it to your own voice and audience; run it once when
  you set up a new course.
- `/proofread <path>` checks an existing document against it.
- `/style-update` folds corrections you made during a session into it as
  durable rules, so you don't repeat the same feedback.

You can also edit `style.md` by hand at any time. Treat it as a living
document: the more it reflects your real preferences, the less you'll need
to correct the assistant's output.

## Course context

Where `style.md` captures *how you write*,
[course-context.md](course-context.md) captures *what your course is*:
subject, pedagogy, lesson-plan conventions, module structure, code and
download rules, glossary, and scope boundaries. The lesson skills read it
before generating anything. Run `/initialize-course-context` once when you
set up a course, and again after your README, docs, or course structure
change substantially. Like `style.md`, you can also edit it by hand.

How the lesson skills chain together, from idea to lesson plan to class
version to published module, is described in the
[lesson workflow](lesson-workflow.md).

## Skills

Skills are predefined workflows your AI assistant can run. In Claude Code,
type the skill name (e.g. `/commit`) to invoke it; in Codex and other
tools, mention the skill or let the assistant activate it from your
request.

They share the same safety behaviour, so it is stated here once: skills
that write anything substantial propose a design first and stop for your
approval; checking skills report findings and never auto-fix without
confirmation; and no skill commits to git (except `/commit`, whose whole
job that is).

### Writing style

- **/proofread** checks one markdown document against `style.md` and your
  spelling. It picks the register from the file path (`course/` and
  `evaluations/` are student-facing; `sources/` is colleague-facing) and
  reports findings in three buckets: must fix, strongly suggest, consider,
  each with line number, quote, diagnosis, and proposed replacement. Every
  check comes from `style.md` itself, so it follows your rules and your
  language rather than a fixed list.
- **/style-init** rewrites `style.md` to match your voice and audience. It
  asks for samples of your writing (strongly preferred) and interviews you
  only about what the samples did not answer. Without samples it warns that
  the result is a best guess.
- **/style-update** reviews the current conversation for style corrections
  and preferences you expressed and folds them into `style.md` as durable
  rules.

For the best `/proofread` spell-checking, install `hunspell` with
dictionaries matching your course languages. For English plus Dutch:

```bash
brew install hunspell
mkdir -p ~/Library/Spelling && cd ~/Library/Spelling
curl -fLO https://raw.githubusercontent.com/LibreOffice/dictionaries/master/nl_NL/nl_NL.aff
curl -fLO https://raw.githubusercontent.com/LibreOffice/dictionaries/master/nl_NL/nl_NL.dic
curl -fLO https://raw.githubusercontent.com/LibreOffice/dictionaries/master/en/en_GB.aff
curl -fLO https://raw.githubusercontent.com/LibreOffice/dictionaries/master/en/en_GB.dic
```

Without `hunspell`, the skill falls back to a visual spelling scan and says
so in the report. It treats `cSpell.words` in
[.vscode/settings.json](../.vscode/settings.json) and code-block tokens as
the project whitelist.

### Lessons

- **/design-lesson** designs a new lesson plan under `sources/lessons/`,
  from rough notes, a request for a follow-up lesson, or a vague intent (it
  asks up to three sharp questions). The design comes first, in chat:
  learning goals, place in the course, block structure, deliberate
  exclusions, with honest pros and cons of your suggestions and of its own.
  After approval it writes `sources/lessons/lesson-NN.md` and adds new
  terms to the glossary if your course keeps one. It never changes existing
  lessons.
- **/summarize-lesson** distils a full lesson plan into a one-page class
  version under `sources/lesson-plans/`: learning goals, content inventory,
  and a telegram-style timeline that fit on one A5 page. It never invents
  content; if something is missing from the source plan, it surfaces the
  gap and stops.
- **/build-lesson-module** turns a finished lesson plan into a complete
  student-facing module under `course/`: it proposes the module design
  (page split, code archives, image placeholders), and after approval
  writes every file, with frontmatter, downloadable archives, transparent
  placeholder PNGs with TODO notes, and the generated glossary page. It
  invents nothing beyond the plan and never touches the source lesson or
  other modules.
- **/lesson-retro** debriefs a lesson right after you taught it, in a
  conversational interview: one question at a time, following up on your
  answers. Afterwards it sorts every observation into a destination and
  shows the list before touching anything: timing notes into the lesson
  plan, course-wide insights into `course-context.md`, content errors into
  a fix list, style corrections to `/style-update`. The retro is the one
  sanctioned way to modify an existing lesson plan.

### Evaluation

- **/design-evaluation** designs an exam or test from the lessons taught so
  far. It proposes a blueprint matrix in chat (per question: the learning
  goals it tests, difficulty, points) plus a coverage check that flags
  goals not tested, weighted out of proportion, or tested below the level
  they were taught at. After approval it writes the student-facing
  `instructions.md` and a colleague-facing `blueprint.md` under
  `evaluations/<year>/<slug>/`. It only tests what was taught.
- **/build-quiz** turns a question list (a notes file, a `blueprint.md`,
  questions drafted in conversation) into a QTI 1.2 `.zip` that Canvas
  imports as a quiz. It first maps every question to a supported Canvas
  question type and flags anything that fits none; after approval it
  generates and verifies the package and writes a colleague-facing
  `questions.md` with the answers. Importing is manual: in Canvas, go to
  **Settings → Import Course Content**, content type **QTI .zip file**,
  import, then check the questions, set dates and time limit (QTI does not
  carry those), and publish.
- **/rubric** builds a grading rubric for one assignment or evaluation. It
  proposes the criteria-by-levels matrix, with every criterion traced to a
  requirement in the assignment text or a learning goal, then writes a
  colleague-facing markdown rubric next to the evaluation, or under
  `sources/rubrics/` for homework. Markdown only; Canvas has no rubric sync
  in this project.

### Quality

- **/consistency-check** sweeps every module under `course/` for cross-file
  problems a single-file `/proofread` cannot see: dead cross-links and
  missing files, glossary drift, duplicate or gapped numeric prefixes,
  invalid frontmatter, and stale prerequisite references. Findings come
  back in the same three buckets as `/proofread`; only the mechanical
  categories are ever auto-applied, and only after confirmation.
- **/coverage-map** cross-references the course's learning goals against
  lesson plans, student modules, and evaluations, and reports alignment
  gaps: goals never practised, practised but never assessed, assessed but
  never taught. Every claim cites the files behind it. Most useful right
  before an exam period.
- **/image-todos** lists all outstanding image work across the course: the
  placeholder PNGs and image-TODO comments that `/build-lesson-module`
  leaves behind, as one table plus an orphan list. Pure report.

### Issue queue

- **/report-issue** logs an error or a wanted change while you are checking
  course material, without pulling you out of your reviewing flow. Describe
  the problem and where you saw it (a rendered page title is fine); the
  skill pins the exact passage, quotes it back, and appends one bullet to
  `sources/issues.md`. It asks at most one clarifying question and never
  fixes or diagnoses anything.
- **/fix-issues** works through the open entries in `sources/issues.md`. It
  first verifies every entry, groups related ones, checks wider
  implications (the same defect elsewhere, style-rule drift, glossary,
  lesson plans), bundles all questions into one round, and presents one fix
  plan. After approval it applies the fixes and moves handled entries to
  the queue's Resolved section. Canvas keeps serving the old text until you
  run `npx course push` yourself.

### Export styling

- **/export-style-create** derives a reusable PDF/DOCX export style from a
  reference you give it: a Word document, a PDF, a website, or a CSS file.
  It proposes a style spec, and after approval forks the selected style
  into `sources/export-style/` and regenerates the sample so you can see
  the result. See [export-styling.md](export-styling.md).
- **/export-style-edit** makes a plain-language change to an existing
  export style ("headings dark blue", "bigger margins"), keeping the PDF
  and Word styles in sync, then regenerates the sample. It forks the
  selected style on first use, so your style survives upstream updates.

  Colour is the one thing these skills do not own outright: it comes from
  the theme in `src/css/themes/`, shared with the preview site and Canvas.
  A colour change edits the theme, and `reference.docx` alongside it —
  Word styles cannot read the theme. See
  [Customization](customization.md#branding).

### Project

- **/initialize-course-context** fills in or refreshes
  [course-context.md](course-context.md): it reads the repo, infers
  everything it can, interviews you only about what the repo did not
  answer, and writes the doc after per-section confirmation. Re-running is
  expected; existing content is treated as confirmed.
- **/commit** makes committing safer and more consistent: it reviews the
  changes, stages the appropriate files, and creates a commit following the
  project conventions — imperative, present tense, verb-first summaries
  (`Add`, `Fix`, `Update`), no `feat:`/`fix:` prefixes.

## Creating your own skills

The bundled skills don't cover everything, and they don't have to: a skill
is a plain markdown file, and your AI assistant can write one for you. Say
what you want automated and point the assistant at the conventions below.
For example:

> Create a new skill in `.agents/skills/weekly-update/SKILL.md` that drafts
> a short "what changed this week" student announcement from the git log.
> Follow the conventions in the "Creating your own skills" section of
> `docs/ai-assistants.md`, and look at
> `.agents/skills/summarize-lesson/SKILL.md` for a model.

The [ideas list](roadmap.md) has more candidates; most are within reach of
a single AI-assisted session.

Skills live in `.agents/skills/<name>/SKILL.md` (`.claude/skills` is a
committed symlink to the same directory). The frontmatter, just `name` and
`description`, is the portable [Agent Skills](https://agentskills.io)
format, so the same files work in every tool that reads skills.
`$ARGUMENTS` is substituted by Claude Code and Codex, and reads as an
obvious placeholder anywhere else.

The shipped skills follow a shared template; new ones should too, so they
stay predictable for both the reader and the model:

- **Frontmatter**: `name` (matching the folder) and a `description` that
  says what the skill does, where it writes, and the approval gate if any,
  ending in four or five quoted trigger phrases in English and in your
  course language (the shipped skills use Dutch).
- **Section order**: H1, a 2–4-line intro, `## Input` (only when the skill
  takes arguments), `## Steps`, `## Rules`, and a bare `$ARGUMENTS` line at
  the end.
- **Approval gates** only when a skill writes something worth reviewing
  first. Split `## Steps` into `### Phase A — <Verb> (writes nothing)` and
  `### Phase B — <Verb> (only after approval)`, and end Phase A with the
  canonical sentence: "Stop. Wait for explicit approval before starting
  Phase B."
- **State each rule once.** A rule already carried by a step does not
  reappear under `## Rules`; drop the Rules section if nothing is left.
- **Defer, don't copy.** Content owned by [style.md](style.md),
  [frontmatter.md](frontmatter.md), or
  [course-context.md](course-context.md) is referenced, never inlined;
  copies drift. Dense reference payloads (format specs, protocol details)
  go in a `references/` file inside the skill folder, read on demand.
- **Course-agnostic.** No hardcoded course vocabulary, module names, or
  paths that exist in only one course; course facts come from
  `course-context.md` at runtime.
- **Temp files** go to the session scratchpad, never `/tmp`. Build zips and
  binaries there and copy them into the repo (cloud-synced folders can
  reject direct writes).
- **Naming**: verb-first for actions on course material (`design-*` for
  gated interactive authoring, `build-*` for generation from an approved
  source, `initialize-*` for one-time setup interviews) and noun-first for
  configuration clusters (`style-*`, `export-style-*`) so related skills
  sort together.

Contributing a skill back to the template itself? See
[Contributing](contributing.md).
