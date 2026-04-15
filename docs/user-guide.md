# User Guide

- **Write in markdown** — use familiar tools (VS Code, Git) instead of the
  Canvas web editor
- **Version control** — full Git history for all course materials
- **Local preview** — Docusaurus dev server for instant feedback before
  publishing
- **Batch sync** — push/pull entire courses or individual modules in one command
- **Portable content** — markdown files work independently of Canvas

Write course materials as markdown, preview via
[Docusaurus](https://docusaurus.io/), and sync with
[Canvas LMS](https://www.instructure.com/canvas).

## Getting Started

1. **Create a [GitHub](https://github.com/) account** if you don't have one yet,
   and **install [Git](https://git-scm.com/downloads)** — see the
   [Git & GitHub Guide](git-and-github.md) if you need help with these steps

2. **Create your own copy** — click **Use this template** at the top-right of
   [this project’s homepage,](https://github.com/lars-derichter/canvas-local)
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

5. **Install [Node.js 20+](https://nodejs.org/)** — download the installer from
   the link, run it, and accept the default settings

6. **Install dependencies and start the preview** — run these two commands to
   download the required packages and open a local preview in your browser:

   ```bash
   npm install
   npm start
   ```

   The included **Getting Started** module walks you through writing markdown,
   organising content, syncing with Canvas, and using the VS Code extension.

7. **Connect to Canvas** — when you are ready to publish, run the interactive
   setup to configure your Canvas API credentials:

   ```bash
   npx course init
   ```

   See the [Canvas Setup Guide](canvas-setup.md) for detailed instructions on
   obtaining your API URL, token, and course ID.

8. **Start writing** — add your own content to `course/` alongside or in place
   of the example module:

   ```bash
   npx course new-module    # create a module (asks for name and position)
   ```

## Course Structure

### Course Modules (sync with Canvas / preview locally with Docusaurus)

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
to Canvas. See [Sources Guide](sources.md) for conventions.

## Markdown Files

Markdown is a simple way to format text using plain characters — for example,
`**bold**` for **bold** and `# Heading` for a heading. Your course materials are
written as markdown files, which are just regular text files that end in `.md`.

See [Markdown Guide](markdown.md) for supported syntax and custom alerts.

See [Frontmatter Guide](frontmatter.md) for supported frontmatter syntax.

## Managing Course Materials

### Managing Modules

```bash
npx course new-module     # create a new module (asks for name and position)
npx course move-module    # move a module to a different position
npx course rename-module  # rename a module
npx course delete-module  # delete a module and renumber remaining
```

All commands are interactive and handle renumbering automatically.

### Managing Items

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

### Docusaurus preview

```bash
npm start          # start Docusaurus dev server
npm run build      # production build
```

### Canvas Sync

```bash
npx course push                  # push all modules to Canvas
npx course push --dry-run        # preview without making changes
npx course push -m 01-intro      # push a single module
npx course push --prune          # also delete Canvas modules and items removed locally
npx course pull                  # import existing Canvas course
npx course pull --force           # overwrite locally modified files
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

#### New Academic Year

See the [New Academic Year Guide](new-academic-year.md) for switching your
materials to a new Canvas course at the start of a new academic year.

## VS Code Integration

All course commands are available through a visual sidebar and the VS Code
command palette. See the [VS Code Guide](vscode.md) for setup and the full
command list.

## Troubleshooting

See [Troubleshooting](troubleshooting.md) for solutions to common connection
errors, push/pull issues, and sync state problems.

## Advanced Commands

```bash
npx course reset-sync-state      # remove canvas_id fields and delete .canvas-sync.json
npx course reset-canvas          # delete all modules, pages, assignments, and files from Canvas
```

See [Advanced Commands](advanced-commands.md) for details on these destructive
operations.

## Claude Code

See [Claude Code](claude-code.md) for how to use Claude Code as an AI assistant
for writing course content, managing modules, and more.

## Updating Your Project

See [Updating Your Project](updating-your-project.md) for how to pull in bug
fixes and new features from the original Canvas Local project.

## Contributing

See [Contributing](contributing.md) for how to report issues, suggest
improvements, and submit pull requests.

## Theme

The Docusaurus preview uses Thomas More-inspired styling (orange `#fa6432`
accent, Nunito font, light weights). Customise in `src/css/custom.css`.

## Ideas

See [Improvement Ideas](improvement-ideas.md) for feature ideas under
consideration, like PDF export and content templates.
