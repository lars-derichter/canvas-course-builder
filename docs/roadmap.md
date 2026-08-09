# Roadmap

Ideas for future development — skills, CLI features, and fixes — followed by a
list of what has already shipped. Nothing here is a commitment; treat it as a
backlog roughly ordered by expected value. If you want to work on one of these,
see [Contributing](contributing.md).

## Planned skills

All would follow the established pattern: read
[`course-context.md`](course-context.md) and [`style.md`](style.md) first,
design-then-write phases, no auto-commits.

### Course quality

- **/accessibility-pass** — alt-texts present and meaningful, heading
  hierarchy, contrast in embedded images, link texts that work for
  screenreaders. Canvas's own checker is weak; doing it at the markdown source
  is more durable.

### Teaching cycle

- **/plan-semester** — map lessons onto the academic calendar (holidays, exam
  weeks), propose which lesson lands on which date, generate a schedule page.
  Re-run when a lesson is cancelled.
- **/weekly-update** — draft the "what changed / what's coming" student
  announcement from the git log and the calendar; push as a Canvas
  announcement (needs a small `lib/canvas/announcements.js`, the API is
  simple).

### Content intake

- **/import-slides** — convert an existing slide deck or PDF (colleagues
  adopting the system all have these) into a draft module: one page per topic,
  images extracted, speaker notes as prose. Big adoption lever for colleagues;
  hard to do well.
- **/import-module** — restructure a scraped/legacy course page dump (e.g.
  brightspace-scraper output) into canvas-course-builder conventions:
  numbering, frontmatter, link rewriting.

### Meta

- **/update-course-context** — the `/style-update` analogue: after a working
  session, fold corrections about course _design_ (not writing style) into
  `course-context.md`. Currently the lesson skills offer this ad hoc; a
  dedicated end-of-session sweep would catch more.
- **/new-year** — interactive wrapper around the
  [new academic year](new-academic-year.md) docs: archive `evaluations/2526/`,
  reset sync state, update dates in homework frontmatter, re-run
  `/initialize-course-context`.

### Quick take

**/import-slides** matters most for colleague adoption but is the hardest to
make reliable. **/plan-semester** and **/weekly-update** are the natural next
steps in the teaching cycle now that `/lesson-retro` closes the after-teaching
loop; both are modest in scope. **/new-year** ties the yearly reset together
but leans on the others existing first.

## Planned features

### Content templates

Extend `npx course new-item` with template options: lab assignment, reading
assignment, lecture notes, quiz instructions, etc. Templates would provide
pre-filled frontmatter and boilerplate markdown tailored to common course item
patterns.

## Already implemented

### AI helper skills

`.agents/skills/` holds a suite of skills covering the authoring cycle: writing
style (`/style-init`, `/style-update`, `/proofread`), lessons
(`/design-lesson`, `/summarize-lesson`, `/build-lesson-module`), assessment
(`/design-evaluation`, `/build-quiz`, `/rubric`), course-wide sweeps
(`/consistency-check`, `/coverage-map`, `/image-todos`), the issue queue
(`/report-issue`, `/fix-issues`), export styling, course context, and
`/lesson-retro` and `/commit`. All are documented in
[AI Assistants](ai-assistants.md).

### Search across course content

`npx course search "keyword"` searches all course markdown files and shows
matches grouped per file, labelled with the module and item, with line numbers
and context lines (`-C` sets how many). Case-insensitive by default
(`--case-sensitive` to opt out); `--evaluations` and `--sources` widen the
scope beyond `course/`. Also available as "Course: Search..." in the VS Code
command palette and as a search icon on the course sidebar title bar.

### Multilingual support

`course.config.yml` at the project root sets the course language (`en` or `nl`)
plus optional per-label overrides. It drives every generated student-facing
label — alert titles in Canvas HTML, the Docusaurus preview, and PDF/DOCX
exports (via pandoc metadata), the link/file cards, export defaults, the pull
fallback title, the glossary page — and the Docusaurus site locale. Built-in
sets live in `lib/config/labels.js`; the loader is
`lib/config/course-config.js` (English fallback when the file is missing). The
file is protected during upstream updates, and the update script
self-registers it in `protected_files` for existing instances. Doubles as the
machine-readable course language for AI assistants.

### PDF/DOCX export support

`npx course export` renders course materials to PDF (pandoc + Typst) or DOCX
(pandoc + `reference.docx`): a single item, a whole module, the full course, an
ad-hoc selection of paths, `--flagged` items, or a curated list via the
two-step `export-toc` → `export --toc` flow. Multiple items combine into one
document with a title page, generated TOC, and page breaks. Styles are
customisable in `sources/export-style/` and via the `/export-style-create` and
`/export-style-edit` skills. Exposed in the VS Code sidebar with multi-select.
See [Export Styling](export-styling.md).

### VS Code sidebar for course structure

The `courseTree` view shows modules, subsections, and items. Push and open in
Canvas sit inline on every node; the context menu adds new, rename, move,
move-to-module, merge, split, delete, and export. The view title bar carries
push, pull, status, diff, validate, preview, and the course-wide exports. See
[VS Code](vscode.md).

### Development mode for the /commit skill

`/commit` runs `git remote get-url origin` before staging. An origin containing
`canvas-course-builder` means development mode: changes inside `course/` are
skipped unless explicitly asked for, since they are sync-test artifacts. Any
other origin means production mode and everything is staged normally.

### Push with --prune deletes individual items as well as modules

`push --prune` now detects and deletes individual Canvas items (pages,
assignments, external URLs, files) that no longer exist locally, in addition to
entire modules.

### Merge items and split item commands

`npx course merge-items` merges two markdown files into one (target keeps
frontmatter, source body is appended). `npx course split-item` splits a file at
a given line into two files. Both commands handle renumbering automatically. In
VS Code, merge uses a two-step context menu ("Set as Source" then "Merge with
Source") and split uses the command palette with cursor position.

### Course items of type URL show up as documents in Docusaurus preview

Fixed with a remark plugin (`src/plugins/remark-external-url.js`) that replaces
the document body with a styled link card showing the `external_url` from
frontmatter.
