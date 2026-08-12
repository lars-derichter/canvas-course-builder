# Changelog

## Unreleased

- **Deleting an assignment no longer deletes a quiz.** A graded Classic Quiz is
  two objects in Canvas — the quiz that holds the questions, and an assignment
  that holds its gradebook column — and the second one is returned by the
  assignments API like any other assignment. `DELETE` on it deletes the quiz,
  its questions and every submission with it, verified against a live course. So
  `reset-canvas` was destroying every graded quiz it found while printing
  "Quizzes, discussions and announcements are left alone", and `push --prune`
  would do the same to any item whose local file said `canvas_type: assignment`
  for an id Canvas holds as a quiz. `reset-canvas` now skips those assignments,
  names them, and keeps them out of the count of what it is about to delete;
  `push --prune` refuses to delete one and reports the mismatch instead of
  resolving it with a delete. A check that cannot be made is a refusal too. The
  new `isQuizBackedAssignment` reads `is_quiz_assignment` and `quiz_id`;
  practice quizzes never appear among the assignments, and a New Quiz is
  genuinely an assignment, so neither is covered.
- **`reset-canvas` no longer claims that grades survive it.** Both the command's
  own warning and [`docs/advanced-commands.md`](docs/advanced-commands.md) said
  grades were left alone, while the command deletes every assignment in the
  course — which takes its gradebook column and the student submissions on it.
  Quizzes, discussions, announcements and rubrics do survive, and still say so.
- **`pull` no longer overwrites files it cannot judge.** With no
  `.canvas-sync.json` to compare timestamps against — right after
  `reset-sync-state`, or on a clone that has never synced — every local file
  counted as unmodified, so the guard meant to protect your writing never fired
  and the first pull behaved exactly like `--force`, with no prompt and no
  warning. "Cannot tell" is now its own answer: such a file is skipped, with the
  reason printed, and only `--force` overrides it. Pull also prints the backup
  hint before it writes, and asks first when `--force` meets a `course/` tree
  that already holds markdown with no sync state to judge it by.
- **Deleting an assignment now says that it deletes the grades too.**
  `push --prune` and `reset-canvas` both call `DELETE` on the assignment object,
  which takes its gradebook column and every submission on it, and the prune
  listing showed a semester of graded work as an ordinary filename. Both now
  read `has_submitted_submissions`, flag the assignments that hold student work,
  and name those grades in the confirmation question itself. A check that fails
  reports "could not determine" and never passes for "no submissions".
- **`push` now warns when it changes a field that moves grades already given.**
  `points_possible` leaves the raw scores untouched, so a new denominator shifts
  every percentage in the column; `due_at` re-runs the late policy over graded
  submissions; and `submission_types` is ignored outright once anyone has
  submitted, while the push still reports success. Canvas's web editor warns
  about all three, its API does not. Each warning names the assignment and both
  values, and `--dry-run` gets it too — the only moment the warning arrives
  before the change instead of with it. Nothing is blocked: only the author
  knows whether a re-weighting is deliberate.
- **A second push no longer cancels a Pages deployment that is halfway through
  publishing.** The deploy workflow shared GitHub's `pages` concurrency group
  but set `cancel-in-progress: true`, so two pushes in quick succession could
  kill a publish mid-flight and leave the site unpublished — after which every
  later run went green while the address served GitHub's "Site not found" page.
  [`docs/hosting.md`](docs/hosting.md) now covers that symptom too: how to read
  the deployment's own status, and the off-and-on-again that clears it when a
  publish hangs on GitHub's side.
- **The documentation now says what the tool does not do, and how to back up a
  Canvas course before finding out.** The only statement of unsupported Canvas
  types anywhere in the project used to be one line inside a pull FAQ, and a
  search of the whole repository for "backup" returned a single hit, about
  GitHub. [`docs/limitations.md`](docs/limitations.md) is the honest list — the
  four types that sync, quizzes being import-only through a QTI package, the
  one-level nesting limit that drops a sub-subfolder without a warning, the
  reasons push and pull are not a merge — and
  [`docs/backups.md`](docs/backups.md) has the three ways to protect a course
  first. Three statements that were simply wrong are corrected: pull does not
  preserve extra frontmatter (now it does, see below), `reset-sync-state` does
  prompt, and `lock_at`/`unlock_at` never reached Canvas (now they do).
- **A plain `push` rebuilds the item list of every module it manages, and that
  is now written down.** The pages and assignments survive, but a quiz, a
  discussion or an external tool that you placed in one of those modules by hand
  in Canvas drops out of it on the next push, and nothing said so anywhere. Also
  new: `push` warns and asks before its first push to a Canvas course that
  already holds content, `reset-canvas` lists what the course contains before
  asking rather than prompting blind and gained a `--dry-run`, and the `--prune`
  prompt points at the backup guide.
- **Assignment `lock_at` and `unlock_at` are pushed.** Both were documented in
  three places and written back by `pull`, but neither string appeared in the
  push path, so the dates round-tripped locally and never reached Canvas.
- **`pull` no longer drops frontmatter keys it does not recognise.** It rebuilt
  each file's frontmatter from the Canvas response, so `export: true`, a
  `lesson:` number, or anything else you had added disappeared the moment pull
  rewrote the file. Canvas stays authoritative for the fields it owns —
  including clearing a due date you cleared in Canvas — and every other key is
  carried over.
- **`docs/first-course.md` starts from a computer with nothing installed.** The
  stated audience is colleagues who have never opened VS Code or a terminal, but
  nothing linked to code.visualstudio.com, `docs/vscode.md` opened on a command
  that needs the `code` CLI on `PATH` without saying how to get it, and Node.js
  got one sentence. The new walkthrough runs from installing the three programs
  to a published module, entirely inside VS Code's built-in terminal.
  `git-and-github.md` is now the concept explainer it was always trying to be,
  and the triplicated "Use this template" steps are gone.
- **The getting-started module is rebuilt around what you are doing rather than
  what the tool can do.** Understand, write, organise, work in VS Code, publish,
  export, save, automate, practise — with a new page on backing Canvas up before
  the page that shows you how to push. It also exercises more of the pipeline
  than before, since it doubles as the end-to-end sync test: three text headers
  instead of one, an assignment carrying all three date fields, a page carrying
  a live `export: true`, and pages that link to pages.
- **`course/index.md` is the project's landing page upstream, and a course home
  everywhere else.** This repository publishes its own `course/` to GitHub
  Pages, so that file is what a stranger sees first; it now says what Canvas
  Course Builder is and why it is worth a semester. Because the same file ships
  to every course built from the template, `npx course setup` now offers the
  language-matched `templates/course-index-*.md` alongside the README and
  course-context templates (`--course-home copy|keep`), so no course
  accidentally publishes a pitch for the tooling to its own students.
- **The lesson workflow points at the design chain it was always built on.**
  `course-context.md` has run goals, assessment, pedagogy from the start, and
  `/evaluation-design` already refused to test what no lesson practised — but
  `docs/lesson-workflow.md` diagrammed idea → plan → module → push and put
  assessment structurally last, below the retro. Assessment moves up, the page
  opens on the chain, and both sources are cited. `/lesson-module-build` and
  `/quiz-build` contained the word "goal" zero times; both now close Phase A by
  reporting the work against the goals it serves. Nothing is enforced: a course
  with no goals still runs the whole pipeline, and is offered
  `/course-context-init` once.
- **`docs/`, `README.md` and `AGENTS.md` finally have a register.**
  `writing-style.md` assigned registers by path and covered `course/`,
  `evaluations/` and `sources/`, which left the project's own documentation
  governed by nothing — which is why drift went unnoticed and why `/proofread`
  could not pick a register for a file under `docs/` without asking. All four
  style baselines now say those files belong to the tooling project and are not
  the course author's to restyle. Separately, the skill-authoring reference
  moved out of `ai-assistants.md` into
  [`docs/writing-skills.md`](docs/writing-skills.md): the page switched from
  addressing a course author to addressing a skill author halfway down, without
  signposting it.

- **Publishing to GitHub Pages is now a repository setting, and
  `npx course setup-pages` is gone.** That command wrote your site's public
  address into `docusaurus.config.js`, a file no upstream update protects, so a
  published course could lose its `url` and `baseUrl` at a conflict prompt and
  redeploy every page under the wrong path, with nothing failing to say so.
  GitHub Pages already knows the address of the repository a build runs in, so
  the deploy workflow reads it from there and hands it to the build, and
  `.github/workflows/deploy.yml` ships with the project rather than being
  generated per course. Nothing in your repository names your site any more. Set
  **Settings > Pages** to "GitHub Actions" and push; a custom domain works the
  same way, entered on that page and read back at build time. Until you switch
  Pages on, the workflow starts on each push and skips, so a course that never
  publishes collects skipped runs rather than failed ones. If you already
  publish, follow
  [Publishing moved out of `docusaurus.config.js`](docs/updating-your-project.md#publishing-moved-out-of-docusaurusconfigjs-one-off)
  and take upstream's version of both files.
- **`/translate` puts a document or a passage into another language.** A source
  note in one language, a page a colleague needs in another, a fragment pasted
  mid-conversation: the request came up often enough, and every time the answer
  was improvised, which is how a translation ends up sounding like one. The
  skill infers the source language, proposes the course language as the target
  when the source is not already in it, and takes its register from the source
  rather than from a fixed rule — `writing-style.md` governs when the target is
  the course language, ordinary usage of the target language when it is not.
  Code, identifiers, links, and alert markers come through the pass untouched,
  while headings, link text, alt text, and captions are translated. Before it
  reports anything it checks the result against the original claim by claim, so
  no fact, number, or hedge is added or lost, then reads the translation on its
  own for the calques and the borrowed sentence rhythm that give a translation
  away. Fragments come back in chat; for a file it asks where to write, and it
  says so when a translated copy under `course/` would reach Canvas as a second
  page.
- **The export-style skills are now `/export-style-init` and
  `/export-style-update`.** Every skill that configures a single artefact now
  answers to the same two verbs: `init` builds the thing from scratch, `update`
  changes what is already there. `writing-style-*` and `course-context-*`
  already worked that way; `/export-style-create` and `/export-style-edit` were
  the last pair with a vocabulary of their own, so reaching for them meant
  remembering which verb their author had picked. Nothing else changed — same
  phases, same files, same plain-language triggers — and an upstream update
  removes the old folders, so you are not left with two skills answering the
  same request.
- **`/course-context-update` folds a session's decisions into the course
  context.** The style guide had `/writing-style-update` to catch corrections
  you made while working; the course context had only `/course-context-init`, so
  a learning-goal notation or a scope boundary you settled mid-session had
  nowhere durable to land and the next skill run asked about it again. The new
  skill sweeps the conversation, clusters what it finds against the document's
  own headings — whatever language they are in — and either fills a section
  still on `TODO` or replaces a fact the conversation overtook. It proposes
  every edit before applying it, never reorders the backward-design sections,
  and hands writing-style corrections to `/writing-style-update` rather than
  writing them itself. `/issue-fix` and `/lesson-retro` now route to it too.
- **The course context explains itself in a tip.** The three paragraphs of
  meta-explanation that opened `context/course-context.md` — what the file is,
  how to fill it in, why it belongs in `protected_files` — now sit in a `[!TIP]`
  at the top, like the README template and the style guide. The document itself
  starts at its first real section.
- **Course-context templates, in English and Dutch.**
  `templates/course-context-en.md` and `templates/course-context-nl.md` give the
  course-context document the same shape as the README and the style guides:
  language variants in `templates/`, the English one pre-installed as
  `context/course-context.md`. A Dutch-language course no longer starts by
  translating the scaffold before it can fill it in.
- **The course context follows backward design.** `context/course-context.md`
  gained a Learning goals section and an Assessment section, and its sections
  now run in the order a course is actually designed: what students should be
  able to do, how you will know they can, then how they get there. Learning
  goals used to be one clause inside the Pedagogy comment, and assessment was
  nowhere, which is why `/evaluation-design` asked you for exam format,
  weighting and allowed aids on every single run. Both new sections ship as
  `TODO` like the rest, so nothing breaks if you leave them empty, and
  `/course-context-init` now interviews you about them.
- **Courses name themselves.** `course.config.yml` gains `title` and `tagline`.
  The title heads the preview site and its navbar, and titles any PDF or DOCX
  export covering the whole course, filename included
  (`exports/programming-fundamentals.pdf` rather than `exports/course.pdf`); a
  module export now prints the course name under the module's title on the
  cover. The tagline subtitles those same covers. The point is where the setting
  lives: `docusaurus.config.js` belongs to the tooling project and is
  overwritten on update, `course.config.yml` is protected. Existing projects
  need two small steps — see
  [The course title moved](docs/updating-your-project.md#the-course-title-moved-into-courseconfigyml-one-off).
- **The style guide and course context moved to `context/`.** `docs/style.md`
  and `docs/course-context.md` are not documentation: they are per-course files
  you own and AI assistants read, and everything else in `docs/` belongs to the
  tooling project and gets overwritten on update. They now live in `context/`,
  which makes that split visible in the file tree, and the style guide is called
  `context/writing-style.md` so that nothing mistakes it for an export style.
  Existing projects need a one-off manual move, because a protected file that
  changes location is the one case the update script cannot prune safely — see
  [Moving to `context/`](docs/updating-your-project.md#moving-to-context-one-off).
- **A Dutch course README template.** `templates/README-course-nl.md` joins the
  English one, so a Dutch-language course no longer starts by translating its
  own README. The English template moved to `templates/README-course-en.md` to
  match the language suffix every other per-language template carries; the old
  path is pruned automatically on your next update.
- **A US-English style baseline.** `templates/writing-style-en-us.md` joins the
  three existing baselines. The English one prescribes UK spelling, which meant
  a US instructor had to edit the guide before it was usable and any AI
  assistant reading it kept writing "colour". The new file is the same guide
  with US spelling, the serial comma mandated rather than left to the author,
  and a US grade level in place of CEFR B2. Nothing changes for existing
  projects: the shipped `context/writing-style.md` is still the UK-spelling
  baseline, and the two files point at each other.
- **Issue forms, a pull-request template, a security policy and a code of
  conduct.** Reporting a bug on the upstream project now walks you through the
  fields that make a report useful, and security problems have a private channel
  instead of a public issue. Because GitHub copies the whole template, these
  files also land in your course repository; each says which project it applies
  to, and
  [Files that belong to the tooling project](docs/customization.md#files-that-belong-to-the-tooling-project)
  explains how to drop them if you would rather not carry them.
- **Prettier and ESLint.** `npm run format` formats the repo and `npm run lint`
  reports defects; both are checked in CI. Formatting now includes markdown, so
  `npm run format` will also rewrap your own course prose at 80 characters — see
  [Keeping your course files tidy](docs/user-guide.md#keeping-your-course-files-tidy)
  for why that is usually what you want, and how to opt out if it is not.
- **The tooling moved from the Unlicense to the MIT licence.** Course content
  keeps its own licence in `course/LICENSE.md`. MIT asks that the copyright
  notice stays with the code, so leave `LICENSE` in place if you publish your
  course repository.
- **No more bundled Century Gothic.** The `thomas-more` style still asks for it
  first, but the font files are gone: on Windows, Office already installs the
  typeface where Typst finds it, and on macOS the exporter now looks inside the
  Office application bundles, which is where Office hides its fonts. Where
  Office is absent, headings fall back to Nunito, which ships with the style
  under the SIL Open Font License and matches the `thomas-more` theme on the
  web.
- **Attribution for the alert icons.** They are GitHub Octicons (MIT) and one
  Google Material Symbol (Apache 2.0); both licences now ship in
  `src/svg-icons/` and are recorded in `THIRD-PARTY.md`.
- **Neutral defaults for the look.** A new `generic` export style
  (Helvetica/Arial, GitHub's alert palette, a "Built with Canvas Course Builder"
  watermark) and a `github` theme are now the shipped defaults. The Thomas More
  style and colours remain as `thomas-more`, selectable but no longer default.
- **`theme` and `export.style` in `course.config.yml`.** Colour and PDF/DOCX
  layout became two independently selectable axes; `--style` on
  `npx course export` overrides the layout for one run.
- **One source of truth for colour.** A theme file in `src/css/themes/` now
  feeds the preview site, Canvas HTML, the alert icons, and PDF exports. DOCX
  still carries its colours in `reference.docx`.
- **`templates/export/` moved to `export-styles/`**, split into one folder per
  style plus the shared pandoc pipeline files. Overrides in
  `sources/export-style/` keep working unchanged.

## 1.0.0 — 2026-08-10

Initial public release: markdown course authoring with Docusaurus preview,
Canvas LMS push/pull/status sync, PDF and DOCX export with customizable styling,
a VS Code extension, bundled AI skills for lesson design and quality checks, and
a template-update mechanism that protects your course content.
