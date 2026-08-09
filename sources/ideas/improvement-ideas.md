# Improvement Ideas

Feature ideas and bug fixes for future development.

## Content Templates

Extend `npx course new-item` with template options: lab assignment, reading
assignment, lecture notes, quiz instructions, etc. Templates would provide
pre-filled frontmatter and boilerplate markdown tailored to common course item
patterns.

## Implemented

### Search Across Course Content

`npx course search "keyword"` searches all course markdown files and shows
matches grouped per file, labelled with the module and item, with line numbers
and context lines (`-C` sets how many). Case-insensitive by default
(`--case-sensitive` to opt out); `--evaluations` and `--sources` widen the
scope beyond `course/`. Also available as "Course: Search..." in the VS Code
command palette and as a search icon on the course sidebar title bar.

### Multilingual support

`course.config.yml` at the project root sets the course language (`en` or
`nl`) plus optional per-label overrides. It drives every generated
student-facing label — alert titles in Canvas HTML, the Docusaurus preview,
and PDF/DOCX exports (via pandoc metadata), the link/file cards, export
defaults, the pull fallback title, the glossary page — and the Docusaurus site
locale. Built-in sets live in `lib/config/labels.js`; the loader is
`lib/config/course-config.js` (English fallback when the file is missing).
The file is protected during upstream updates, and the update script
self-registers it in `protected_files` for existing instances. Doubles as the
machine-readable course language for AI assistants.

### AI Helper Skills

`.agents/skills/` holds a suite of skills covering the authoring cycle: writing
style (`/style-init`, `/style-update`, `/proofread`), lessons
(`/design-lesson`, `/summarize-lesson`, `/build-lesson-module`), assessment
(`/design-evaluation`, `/build-quiz`, `/rubric`), course-wide sweeps
(`/consistency-check`, `/coverage-map`, `/image-todos`), the issue queue
(`/report-issue`, `/fix-issues`), export styling, course context, and
`/lesson-retro` and `/commit`. All are documented in
[AI Assistants](../../docs/ai-assistants.md). Skills still on the wish list live in
[further-skill-ideas.md](further-skill-ideas.md).

### PDF/DOCX Export Support

`npx course export` renders course materials to PDF (pandoc + Typst) or DOCX
(pandoc + `reference.docx`): a single item, a whole module, the full course, an
ad-hoc selection of paths, `--flagged` items, or a curated list via the two-step
`export-toc` → `export --toc` flow. Multiple items combine into one document
with a title page, generated TOC, and page breaks. Styles are customisable in
`sources/export-style/` and via the `/export-style-create` and
`/export-style-edit` skills. Exposed in the VS Code sidebar with multi-select.
See [Export Styling](../../docs/export-styling.md).

### VS Code Sidebar for Course Structure

The `courseTree` view shows modules, subsections, and items. Push and open in
Canvas sit inline on every node; the context menu adds new, rename, move,
move-to-module, merge, split, delete, and export. The view title bar carries
push, pull, status, diff, validate, preview, and the course-wide exports. See
[VS Code](../../docs/vscode.md).

### Update `/commit` Skill

`/commit` runs `git remote get-url origin` before staging. An origin containing
`canvas-course-builder` means development mode: changes inside `course/` are skipped
unless explicitly asked for, since they are sync-test artifacts. Any other
origin means production mode and everything is staged normally.

### Push with --prune deletes individual items as well as modules

`push --prune` now detects and deletes individual Canvas items (pages,
assignments, external URLs, files) that no longer exist locally, in addition to
entire modules.

### Merge Items and Split Item commands

`npx course merge-items` merges two markdown files into one (target keeps
frontmatter, source body is appended). `npx course split-item` splits a file at
a given line into two files. Both commands handle renumbering automatically. In
VS Code, merge uses a two-step context menu ("Set as Source" then "Merge with
Source") and split uses the command palette with cursor position.

### Course items of type URL show up as documents in Docusaurus preview

Fixed with a remark plugin (`src/plugins/remark-external-url.js`) that replaces
the document body with a styled link card showing the `external_url` from
frontmatter.
