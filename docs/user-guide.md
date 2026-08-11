# User guide

Canvas Course Builder lets you write course materials as markdown files on your
own computer, preview them on a local website
([Docusaurus](https://docusaurus.io/)), and sync them with
[Canvas LMS](https://www.instructure.com/canvas) in one command. This guide
covers setup and the daily workflow; the [docs index](README.md) lists every
other guide. If anything fails along the way, check
[Troubleshooting](troubleshooting.md).

## Getting started

1. **Create a [GitHub](https://github.com/) account** if you don't have one yet,
   and **install [Git](https://git-scm.com/downloads)** — see the
   [Git and GitHub guide](git-and-github.md) if you need help with these steps

2. **Create your own copy** — click **Use this template** at the top-right of
   [this project's homepage](https://github.com/lars-derichter/canvas-course-builder),
   then select **Create a new repository**. Pick a descriptive name that
   reflects the course, like `course-web-development` or `course-databases` —
   this makes it much easier to find your materials, especially if you manage
   multiple courses (each as its own project). Choose whether it should be
   public or private

3. **Navigate to your project** — after creating it, GitHub takes you to the new
   repository. Verify that the page header shows your own username
   (`github.com/YOUR-USERNAME/YOUR-PROJECT-NAME`) before continuing

> [!WARNING]
>
> If you plan to store evaluation materials (exams, tests) in the `evaluations/`
> folder, make sure your project is **private** — otherwise students can find
> your materials on GitHub. See
> [Keeping your project private](git-and-github.md#keeping-your-project-private)
> for how to change this setting.

4. **Clone your project** to your computer — on your project's GitHub page,
   click the green **Code** button, then copy the HTTPS URL. Open a terminal (on
   macOS: **Terminal**, on Windows: **Command Prompt** or **PowerShell**) and
   run the following command, replacing the URL with the one you just copied:

   ```bash
   # paste your URL after "git clone"
   git clone https://github.com/YOUR-USERNAME/your-project-name.git
   ```

   Then move into the project folder (use the name of your project):

   ```bash
   cd your-project-name
   ```

5. **Install [Node.js 24+](https://nodejs.org/)** — download the installer from
   the link, run it, and accept the default settings

6. **Install dependencies and start the preview** — run these two commands to
   download the required packages and open a local preview in your browser:

   ```bash
   npm install
   npm start
   ```

   The included **Getting started** module walks you through writing markdown,
   organising content, syncing with Canvas, and using the VS Code extension.

   > [!NOTE]
   >
   > `npm start` keeps running while the preview is open — the terminal is busy
   > until you stop it with **Ctrl+C**. Open a second terminal for other
   > commands. Those other commands start with `npx course`: `npx` runs the
   > `course` tool that ships with the project, no extra installation needed.

7. **(Optional) Install pandoc and Typst for PDF/DOCX export** — only needed if
   you want to export course materials to printable documents. Install both:

   ```bash
   # macOS
   brew install pandoc typst
   # Windows
   winget install --id JohnMacFarlane.Pandoc --id Typst.Typst
   # Linux: use your package manager for pandoc; see the Typst releases page
   ```

   See [Exporting to PDF or DOCX](#exporting-to-pdf-or-docx) below. DOCX export
   needs only pandoc; PDF export also needs Typst.

8. **Connect to Canvas** — when you are ready to publish, run the interactive
   setup to configure your Canvas API credentials:

   ```bash
   npx course init
   ```

   See the [Canvas setup guide](canvas-setup.md) for detailed instructions on
   obtaining your API URL, token, and course ID.

9. **Start writing** — add your own content to `course/` alongside or in place
   of the example module:

   ```bash
   npx course new-module    # create a module (asks for name and position)
   ```

10. **Make it yours** — swap the tooling README for your course's own, set the
    course language, and add your own branding and content licence. The
    [customization guide](customization.md) covers all four.

## Course structure

### Course modules (sync with Canvas / preview locally with Docusaurus)

```
course/
  01-module-name/
    _category_.json          # Docusaurus sidebar label/order
    _files/                  # Embedded assets and file item binaries
      diagram.png
      report.pdf
    01-page-name.md          # Canvas Page
    02-assignment-name.md    # Canvas Assignment
    03-link-name.md          # Canvas ExternalUrl
    04-report.md            # Canvas File (wrapper, points to _files/)
    05-subfolder-name/       # Canvas Text Header
      01-nested-page.md      # Indented module item
```

- Filenames are lowercase, hyphenated, prefixed with 00-99 for ordering
- Files and folders prefixed with `_` are internal and excluded from Canvas
  syncing (e.g. `_files/`, `_category_.json`)
- Canvas item type is set via `canvas_type` in frontmatter (default: `page`)
- Assignment frontmatter supports: `points_possible`, `submission_types`,
  `due_at`
- External URL frontmatter requires: `external_url`
- File item frontmatter requires: `file_ref` pointing to the binary in `_files/`
  (e.g. `file_ref: _files/report.pdf`). The binary is uploaded to Canvas as a
  module item. In Docusaurus, a styled file card with a download link is shown
- Images and files in `_files/` can also be referenced from markdown content
  (`![Alt](_files/image.png)`) — these are embedded in page content, not added
  as separate module items

### Evaluations (private)

```
evaluations/
  2526/                      # academic year
    exam-name/
      instructions.md
      start/                 # starter code for students
      solution/              # example solution
```

### Sources (private)

Reference materials, inspiration, and notes. Not served by Docusaurus or synced
to Canvas. See the [sources guide](sources.md) for conventions.

## Course name, language and labels

`course.config.yml` at the project root names the course and sets the language
of every generated, student-facing label in one place: alert titles (Canvas
HTML, Docusaurus preview, and PDF/DOCX exports), the "External link" and "File"
cards in the preview, the attachment and online-footnote labels in exports,
default export titles and filenames, the fallback title for unnamed pulled
items, and the generated glossary page. It also sets the Docusaurus site locale,
so the site chrome ("On this page", "Next", …) follows along.

```yaml
title: Programming Fundamentals # names the preview site and its navbar
tagline: Bachelor 1, semester 2 # optional one-line descriptor

language: en # built-in label sets: en, nl (shipped default: en)

labels: # optional per-label overrides on top of the set
  alerts:
    caution: Watch out
  cards:
    file: Download
```

Without a `title`, the site falls back to the generic label for the course
language ("Course", "Cursus"). Set it — it is the one place that names the
course, and unlike `docusaurus.config.js` it survives an upstream update.

Override groups and keys: `alerts` (`note`, `tip`, `important`, `warning`,
`caution`, `check`), `cards` (`external_url`, `file`), `export` (`attachment`,
`online`, `course_title`, `selection_title`), `pull` (`untitled`), and
`glossary` (`title`, `intro`, `operators`, `terms`). When the file or a key is
missing, English is used.

After changing the language or a label, re-push modules whose pages contain
alerts (`npx course push`) and regenerate glossary pages
(`npx course build-glossary`) so Canvas picks up the new labels. The file is
listed in `protected_files`, so upstream updates never overwrite your choice.

## Markdown files

Markdown is a simple way to format text using plain characters — for example,
`**bold**` for **bold** and `# Heading` for a heading. Your course materials are
written as markdown files, which are just regular text files that end in `.md`.

See the [markdown guide](markdown.md) for supported syntax and custom alerts,
and the [frontmatter guide](frontmatter.md) for the metadata fields.

### Keeping your course files tidy

`npm run format` runs Prettier over your markdown. It rewraps prose at 80
characters and normalises list markers, emphasis, table alignment and
frontmatter. Nothing about the rendered page changes — this is source formatting
only, and your fenced code blocks are left exactly as you wrote them.

It is worth running, for three reasons:

- **Consistency without policing it.** Course material accumulates from many
  places: a page drafted by an AI skill, a paragraph pasted out of Word or a
  slide deck, something typed in a hurry the night before class. Each arrives
  with its own wrapping and list markers. One command makes the whole course
  look like it was written in one sitting.
- **Readable diffs across an academic year.** This is the practical win. With
  prose wrapped at 80 characters, fixing one sentence shows up in `git diff` as
  one or two changed lines. With a paragraph sitting on a single long line, the
  same fix reports the entire paragraph as changed and you cannot see what you
  actually altered.
- **It catches markdown that renders wrong silently.** A missing blank line
  before a list, a misaligned table, stray trailing whitespace — Prettier
  normalises all of it, so a page behaves the same in the preview and after
  `npx course push`.

Run it whenever suits you: before a commit, or after a long writing session. It
is never required. Nothing checks your course, and `npx course push` does not
care either way.

If you would rather Prettier left your writing alone, add the content
directories to `.prettierignore`:

```
course/
evaluations/
sources/
```

## Managing course materials

### Managing modules

```bash
npx course new-module     # create a new module (asks for name and position)
npx course move-module    # move a module to a different position
npx course rename-module  # rename a module
npx course delete-module  # delete a module and renumber remaining
```

All commands are interactive and handle renumbering automatically.

### Managing items

```bash
npx course new-item           # create a page, assignment, url, subsection, or add a file
npx course move-item          # reorder an item within its module
npx course movetomodule-item  # move an item to a different module
npx course rename-item        # rename an item
npx course delete-item        # delete an item and renumber remaining
npx course merge-items        # merge two items into one
npx course split-item         # split an item into two files at a given line
```

Item commands auto-detect the current module when run from inside a module
folder. Items can be added to the module root or into subsections.

### Generated glossary pages

```bash
npx course build-glossary          # regenerate module glossary pages from the canonical glossary
npx course build-glossary --check  # verify pages are up to date (CI / pre-push)
```

If your course keeps a canonical glossary in
`sources/reference-materials/glossary.yml`, this command renders a cumulative
glossary page per module. See the [lesson workflow](lesson-workflow.md) for the
file format and how it fits the authoring flow.

### Searching course content

```bash
npx course search "flexbox"                          # find a word or phrase in course/
npx course search "flexbox" -C 4                     # show more context around matches
npx course search "flexbox" --evaluations --sources  # also search those folders
npx course search "Flexbox" --case-sensitive         # match upper/lower case exactly
```

Results are grouped per file with the module and item they belong to, line
numbers, and a few lines of context around each match. By default only `course/`
is searched; `--evaluations` and `--sources` widen the scope.

### Docusaurus preview

```bash
npm start          # start Docusaurus dev server
npm run build      # production build
```

You can also publish the preview as a free public website on GitHub Pages — a
handy fallback when Canvas is unavailable. See the [hosting guide](hosting.md).

### Canvas sync

```bash
npx course push                  # push all modules to Canvas
npx course push --dry-run        # preview without making changes
npx course push -m 01-intro      # push a single module
npx course push --prune          # also delete Canvas modules and items removed locally
npx course pull                  # import existing Canvas course
npx course pull --force          # overwrite locally modified files
npx course status                # compare local vs Canvas state
npx course status --remote       # also fetch and compare against Canvas
npx course diff                  # show what changed locally since the last sync
npx course validate              # check course content for errors before pushing
```

#### Global flags

```bash
npx course --verbose <command>   # show API request details
npx course --quiet <command>     # only show errors
```

#### New academic year

See the [new academic year guide](new-academic-year.md) for switching your
materials to a new Canvas course at the start of a new academic year.

## Exporting to PDF or DOCX

Turn course materials into printable PDFs or editable Word documents — handy for
exams, handouts, and offline review. This needs pandoc (and Typst for PDF); see
the [optional install step](#getting-started) above.

```bash
npx course export course/01-intro/03-alerts.md   # one item
npx course export -m 01-intro                     # a whole module
npx course export                                 # the full course
npx course export -m 01-intro -f docx             # Word instead of PDF
npx course export --flagged                       # only items with export: true
```

Multiple items combine into one document with a title page, a generated table of
contents, and a page break between chapters. Output lands in `exports/`
(gitignored). Non-markdown items become link cards (external URLs) or attachment
references (files) in the combined document.

For a curated selection, use the two-step **table of contents** flow: generate a
list, delete the lines you do not want, then export what remains.

```bash
npx course export-toc                    # writes exports/toc.md
# …edit exports/toc.md, delete unwanted lines…
npx course export --toc exports/toc.md
```

All of this is also available from the VS Code sidebar, including multi-select
export of highlighted items.

To change how exports look, `course.config.yml` picks the layout with
`export.style` and the colours with `theme`; `--style <name>` overrides the
layout for one run. See [export styling](export-styling.md) for the pipeline,
[Customization](customization.md#branding) for the colour tokens, and the
`/export-style-create` and `/export-style-edit` skills for deriving a house
style from a Word template.

## Advanced commands

```bash
npx course reset-sync-state      # remove canvas_id fields and delete .canvas-sync.json
npx course reset-canvas          # delete all modules, pages, assignments, and files from Canvas
```

See [advanced commands](advanced-commands.md) for details on these destructive
operations.

## Further guides

| Guide                                             | What it covers                                         |
| ------------------------------------------------- | ------------------------------------------------------ |
| [VS Code integration](vscode.md)                  | The sidebar and command palette                        |
| [AI assistants](ai-assistants.md)                 | Assistant setup, the bundled skills, creating your own |
| [Lesson workflow](lesson-workflow.md)             | From lesson idea to published module with the skills   |
| [Customization](customization.md)                 | README, language, branding, and licence                |
| [Hosting](hosting.md)                             | Publishing the preview site on GitHub Pages            |
| [Updating your project](updating-your-project.md) | Pulling in upstream improvements                       |
| [Troubleshooting](troubleshooting.md)             | Common errors and their fixes                          |
| [Contributing](contributing.md)                   | Issues, ideas, and pull requests                       |
