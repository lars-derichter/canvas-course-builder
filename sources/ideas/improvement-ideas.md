# Improvement Ideas

Feature ideas and bug fixes for future development.

## Content Templates

Extend `npx course new-item` with template options: lab assignment, reading
assignment, lecture notes, quiz instructions, etc. Templates would provide
pre-filled frontmatter and boilerplate markdown tailored to common course item
patterns.

## Multilingual support

Alert labels are always in Dutch. There should be a possibility to set the
course language and get the labels in that language. Should also check where
else in the user interface labels etc. are used.

This could also come in handy for Claude to know what language the course is in.

## Search Across Course Content

A local search command (`npx course search "keyword"`) that searches all course
markdown files and shows results with context lines. Faster than grep for
educators who aren't terminal-savvy.

## Implemented

### Claude Helper Skills

`.claude/skills/` holds a suite of skills covering the authoring cycle: writing
style (`/style-init`, `/style-update`, `/proofread`), lessons
(`/design-lesson`, `/summarize-lesson`, `/build-lesson-module`), assessment
(`/design-evaluation`, `/build-quiz`, `/rubric`), course-wide sweeps
(`/consistency-check`, `/coverage-map`, `/image-todos`), the issue queue
(`/report-issue`, `/fix-issues`), export styling, course context, and
`/lesson-retro` and `/commit`. All are documented in
[Claude Code](../../docs/claude-code.md). Skills still on the wish list live in
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

A tree view in the VS Code sidebar showing modules and items, with inline
actions like push single item, open in Canvas, move, and rename. Would be much
faster than the command palette for frequent operations.

### Update Claude `/commit` Skill

The Claude commit skill ignores changes to canvas_id changes in course
materials. This is good when working in development mode, but not when working
on real course materials.

We need a way to check which mode we are in. I would suggest checking the URL of
the git remote (origin). If it matches:
`git@github.com:lars-derichter/canvas-local.git` we are in development mode,
otherwise we are in production mode.

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
