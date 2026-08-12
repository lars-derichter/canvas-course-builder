# Canvas Course Builder

Write your course in markdown, in your own editor, with real version control,
and publish it to Canvas LMS with one command.

The Canvas web editor is fine for a page or two. It gets painful when you
maintain a whole course: no history, no search and replace, no offline work, no
way to review changes before students see them. Canvas Course Builder moves the
source of truth to plain markdown files on your computer and treats Canvas as a
publishing target.

## What you get

- **Your own tools.** Write in VS Code or any editor, keep everything in git,
  and review every change before it goes live.
- **Instant preview.** A local website ([Docusaurus](https://docusaurus.io/))
  shows your course as you write, in the same structure students will see.
- **One-command Canvas sync.** `npx course push` creates and updates modules,
  pages, assignments and files in
  [Canvas LMS](https://www.instructure.com/canvas). `pull` brings remote edits
  back into markdown, and `status` shows what would change.
- **PDF and DOCX export.** Hand out a styled course text or a single chapter,
  with your institution's branding.
- **A VS Code extension.** Every command in the sidebar and command palette, so
  daily work needs no terminal.
- **AI-assisted authoring.** Bundled skills help design lessons, build student
  modules, generate Canvas quizzes, proofread, and check course consistency,
  with any AI coding agent that reads `AGENTS.md`.
- **A template that stays updatable.** Create your course from this template and
  keep pulling tooling improvements later; your course content is never
  overwritten.

## What it does not do

Worth knowing before you commit a semester to it:

- **Only pages, assignments, external links and files sync.** Quizzes,
  discussions and external tools do not.
- **Quizzes are outside the sync loop.** A bundled skill generates a QTI package
  you import into Canvas by hand, once, in one direction.
- **A push takes over the modules it manages.** It rebuilds their item lists, so
  anything you added to those modules by hand in Canvas drops out of them.
- **The folder layout is a contract**: one folder per module, one level of
  nesting, numbered prefixes.
- **Push and pull are not a merge.** Your markdown is the source of truth; pull
  is for importing a course once, not for a routine round trip.

The full list, with what to do instead, is in
[limitations](docs/limitations.md). Before pointing it at a course that already
has content, read [backups](docs/backups.md).

## Who it's for

Lecturers and teaching teams who maintain course material in Canvas and want the
comfort of files, folders and version control. You don't need to be technical:
the [user guide](docs/user-guide.md) starts from zero, and there is a
[git and GitHub guide](docs/git-and-github.md) for complete beginners.

## Quick start

1. Click **Use this template** on GitHub and create your course repository.
2. Follow the [user guide](docs/user-guide.md): clone it, install Node.js 24+,
   run `npm install`, and preview the built-in getting-started course with
   `npm start`.
3. Make it your course with `npx course setup` — it asks for the language, the
   name and the look, and puts the matching templates in place (see
   [customization](docs/customization.md)).
4. Connect Canvas with `npx course init` (see the
   [Canvas setup guide](docs/canvas-setup.md)) and push your first module.

## Documentation

The [docs folder](docs/README.md) has the full map. Start with:

- [User guide](docs/user-guide.md): setup, course structure, daily commands
- [Customization](docs/customization.md): README, language, branding, and
  licence
- [AI assistants](docs/ai-assistants.md): the bundled skills and how to add your
  own
- [Troubleshooting](docs/troubleshooting.md): common issues and fixes

## Licensing

- **Tooling** (CLI, libraries, site, VS Code extension): [MIT](LICENSE). Free to
  use, change and redistribute, as long as the copyright notice travels with it.
- **Course content** (`course/`): [CC BY-NC-SA 4.0](course/LICENSE.md) by
  default. Content you write in your own course is yours to license as you wish.
- **Borrowed assets** (the alert icons, the bundled Nunito typeface, and the
  example logo in `export-styles/thomas-more/`): each under its own licence, see
  [THIRD-PARTY.md](THIRD-PARTY.md).

## Contributing

Bug reports, ideas and pull requests are welcome: see the
[contributing guide](docs/contributing.md) and the
[ideas list](docs/roadmap.md). Taking part means following the
[code of conduct](CODE_OF_CONDUCT.md); security problems have their own
[private reporting route](SECURITY.md).
