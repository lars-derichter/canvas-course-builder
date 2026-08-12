# What Canvas Course Builder Does Not Do

Canvas Course Builder is opinionated. It syncs four kinds of content, expects
one folder layout, and treats your markdown as the source of truth. That is what
makes it small enough to trust — but it means the tool is a poor fit for some
courses, and you should find that out now rather than in week six.

Read this before you commit a semester to it. Everything below is a description
of how the tool works today, not a list of bugs.

## Only Four Canvas Types Sync

| Canvas type               | Push | Pull |
| ------------------------- | ---- | ---- |
| Page                      | yes  | yes  |
| Assignment                | yes  | yes  |
| External URL              | yes  | yes  |
| File                      | yes  | yes  |
| Text header (`SubHeader`) | yes  | yes  |
| Quiz                      | no   | no   |
| Discussion                | no   | no   |
| External tool (LTI)       | no   | no   |
| Anything else             | no   | no   |

Push skips an unknown `canvas_type` with a warning; `npx course validate`
rejects one before you get that far. Pull skips unsupported item types with a
warning, so pulling a Canvas-authored course silently leaves its quizzes,
discussions and LTI links out of your local copy.

Announcements, rubrics, outcomes, groups, the syllabus page and course settings
are outside the tool entirely.

## Quizzes Are Outside the Sync Loop

There is no quiz code in this project — no create, no update, no read, no delete
— and `.canvas-sync.json` does not track quizzes. The
[`/quiz-build`](ai-assistants.md) skill generates a QTI 1.2 `.zip` that you
import through the Canvas web interface by hand. That is the whole of the quiz
support.

What that means in practice:

- **Import is manual and one-way.** Nothing pulls a quiz back into markdown.
- **Re-importing duplicates.** A second import creates a second quiz; delete the
  old one yourself.
- **Six question types.** Multiple choice, multiple answers, true/false, short
  answer, numerical, and essay. Matching, ordering and hotspot questions have to
  be rephrased or downgraded.
- **QTI carries no dates or time limit.** Set availability and the time limit in
  Canvas after importing.

If your course leans heavily on Canvas quizzes, this tool will not carry that
weight.

## A Plain Push Clears the Module's Item List

This one surprises people, so it is worth stating plainly.

Every `npx course push` deletes and recreates all module items in the modules it
manages. The underlying pages, assignments and files survive — a module item is
a link, not the content — but the consequences are real:

- **Anything you added by hand in Canvas drops out of that module.** A quiz you
  placed in the module, a discussion, an LTI link, a page that is not in your
  repository: the content object survives elsewhere in the course, but it is no
  longer in the module.
- **Module item ids change on every push**, so direct links of the form
  `/courses/123/modules/items/456` go stale. Link to pages, not to module items.

The rule of thumb: a module this tool manages is generated output. Anything you
want to keep in it belongs in `course/`.

Two smaller cases where a plain push deletes something real:

- Renaming a binary in `_files/` uploads the new one and deletes the old Canvas
  file.
- `push --prune` deletes the Canvas modules, pages, assignments and files whose
  local counterparts you removed. It lists them and asks first.

## The Folder Structure Is a Contract

The scanner is strict, and it is quiet about it:

- **Only top-level directories under `course/` are modules.** Loose markdown at
  the root of `course/` is ignored — including `course/index.md`, which is why
  that file appears on the preview site but never in Canvas.
- **One level of nesting, and one only.** A subfolder inside a module becomes a
  text header. A folder inside _that_ is **silently dropped**, along with
  everything in it. There is no warning and `validate` does not catch it. This
  is the sharpest edge in the tool.
- **Numeric prefixes drive order.** A file or folder without a `NN-` prefix gets
  position 0, so it sorts first and ties with every other unprefixed sibling in
  whatever order the filesystem returns. `validate` warns, but push proceeds.
  The module-management commands are stricter than push: an unprefixed module
  folder is invisible to `new-item`, `move-module`, `rename-module`,
  `delete-module` and the VS Code sidebar, while push still syncs it.
- **A leading underscore means invisible.** `_files/`, `_category_.json` and
  anything else you prefix with `_` is excluded from sync. Handy as a drafting
  mechanism; easy to trip over if you did not mean it.
- **Canvas item indent is 0 or 1.** Canvas supports five levels; this tool uses
  two.

See [User guide](user-guide.md#course-structure) for the layout the scanner
expects.

## Push and Pull Are Not a Merge

The two directions are not symmetric, and neither one reconciles concurrent
edits.

- **Pull overwrites whole files.** It regenerates the markdown from the Canvas
  HTML. It does not merge your changes with the Canvas version.
- **Conflict detection is a timestamp, not a comparison.** Pull skips a file
  whose modification time is later than the last sync. It does not look at the
  content. That has two consequences worth knowing: a fresh `git clone` sets
  every file's timestamp to checkout time, so pull will skip everything as
  "locally modified"; and push updates the last-sync timestamp too, so a file
  you have just pushed counts as unmodified and a later pull will overwrite it
  with the round-tripped Canvas version.
- **The round trip is lossy.** Canvas HTML becomes markdown through a converter.
  Raw HTML, anything the Canvas rich-content editor added, and formatting
  nuances are normalised away.
- **Pull restructures your working tree.** It renames module folders, subfolders
  and files to match Canvas's names and positions. Local naming and numbering
  that differ from Canvas do not survive.
- **Pull never deletes.** An item deleted in Canvas leaves the local file
  behind, and the next push re-creates it in Canvas.

The workflow the tool is built for is one-directional: write locally, push to
Canvas. Pull is for importing an existing course once, or for recovering edits a
colleague made in the web editor — not for a routine round trip.

## Assignment Fields That Reach Canvas

Push sends `points_possible`, `submission_types`, `due_at`, `unlock_at`,
`lock_at` and `published`. Everything else in an assignment's frontmatter is
ignored: group assignments, peer review, allowed attempts, grading type,
assignment groups, and Canvas's per-section date overrides all have to be set in
Canvas.

Pages take only their title and body. A `published:` key on a page is ignored:
push never sends it, so Canvas decides, and you publish pages in Canvas or by
publishing the module.

See [Frontmatter reference](frontmatter.md) for the fields each type accepts.

## Not a Collaboration Tool

The tool assumes one person owns the markdown. Two colleagues can absolutely
work in one repository — that is what git is for — but there is no locking, and
if you both push to the same Canvas course, the last push wins. Sort out who
owns which module the way you would sort out who owns which file.

## What to Do Instead

- **Quiz-heavy course?** Build quizzes in Canvas and keep the rest here. Push
  does not touch the Canvas quiz objects, only the module links to them, so keep
  the quizzes in a module this tool does not manage.
- **Course that lives in Canvas already, edited by several people in the web
  editor?** This tool will fight you. It wants to be the source of truth.
- **Just want version control for your handouts?** Use the repository and the
  PDF export, and skip the Canvas sync entirely.
