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

Nothing here writes to a quiz — no create, no update, no delete. The project
reads the course's quiz list to find the one a module item points at, and
`.canvas-sync.json` tracks that link, but the questions never cross in either
direction. The [`/quiz-build`](ai-assistants.md) skill generates a QTI 1.2
`.zip` that you import through the Canvas web interface by hand. That is the
whole of the quiz support.

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
  local counterparts you removed. It lists them and asks first, and flags the
  ones that hold student work — see
  [Destructive operations and student work](#destructive-operations-and-student-work).

## Destructive Operations and Student Work

Three commands delete things on Canvas: an ordinary `push`, `push --prune` and
`reset-canvas`. What separates them is not how much they delete but which kind
of object they delete, and only one of those kinds takes student work with it.

- **Deleting a module item is safe.** A module item is a link. Removing it
  leaves the page, assignment or file it pointed at exactly where it was, with
  its gradebook column and its submissions untouched. That is all an ordinary
  push does to the modules it manages.
- **Deleting an assignment is not.** `push --prune` calls `DELETE` on the
  assignment object itself, and Canvas takes its gradebook column and every
  submission on it. Canvas's `/undelete` sometimes brings the assignment back;
  the submissions frequently do not come with it, so the grades are gone for
  good.
- **`reset-canvas` does that to every assignment in the course**, alongside
  every module, page and file — except the assignments that are really quizzes,
  below. See [Advanced commands](advanced-commands.md#reset-canvas).
- **Some assignments are quizzes.** A graded Classic Quiz is two objects: the
  quiz that holds the questions, and an assignment that holds its gradebook
  column. Canvas returns that assignment from the assignments API like any other
  (`is_quiz_assignment: true`, with the quiz's id in `quiz_id`), and a `DELETE`
  on it deletes the quiz, its questions and every submission. Neither command
  does that any more: `reset-canvas` skips those assignments and names them, and
  `push --prune` refuses to delete one, reports it as an error, and leaves it
  tracked. If a local file claimed `canvas_type: assignment` for an id that
  Canvas holds as a quiz, that mismatch is yours to settle — delete the quiz in
  Canvas if that is what you meant. A practice quiz has no gradebook column and
  never appears among the assignments, so it is never at risk. A New Quiz is not
  covered by any of this: it is genuinely an assignment that launches an LTI
  tool, and both commands delete it like one.

Pages and files carry no grades, so pruning one costs you the content and
nothing else — recoverable from git, or from a course export.

### Deleting a Module Folder Is Safer Than Deleting an Assignment File

The asymmetry runs the wrong way round from what you would expect:

- **Delete a whole module folder**, and prune deletes the Canvas _module_. The
  module and its item links go; the pages, assignments and files that were in it
  stay in the course, unlinked but intact, gradebook columns and submissions
  included. Prune looks for missing items only inside module folders that still
  exist, so nothing inside a folder you deleted is ever considered for deletion.
- **Delete one assignment file** from a module that still exists, and prune sees
  an item no local file claims. That is a `DELETE` on the assignment object, and
  the grades go with it.

Removing the bigger thing is the safer move. What deleting a module folder costs
you instead is orphans: assignments and pages no module links to any more, which
the tool then forgets — the sync-state entry for the module goes with the module
— and which you clean up in Canvas by hand.

### Fields That Move Grades Already Given

Push sends the whole assignment on every update, and three of the fields it
sends act on work students have already handed in. Canvas applies each one
silently: its web editor warns about them, its API does not.

- **`points_possible`** — Canvas does not rescale the grades already given. The
  raw scores stay as they are, so every percentage in that gradebook column
  moves.
- **`due_at`** — Canvas recomputes late status against the new date, so an
  automatic late policy re-applies or drops its deductions on submissions that
  are already graded.
- **`submission_types`** — Canvas accepts this change only while the assignment
  has no submissions. Once there are any it ignores the change, reports the push
  as a success, and keeps the value it holds. Frontmatter and Canvas disagree
  from then on, and nothing but the warning says so.

Push names the assignment, the field and both values, and then sends the update
anyway. Nothing is blocked: a re-weighting can be entirely deliberate, and only
you know which one this is.

### What the Warnings Tell You

Before it deletes an assignment, the tool asks Canvas whether that assignment
already holds submissions:

- **`push --prune`** flags each doomed assignment in its listing
  (`<-- HAS STUDENT SUBMISSIONS: deletes the gradebook column and every grade in it`),
  counts them in a warning, and names them in the question itself:
  `Delete these from Canvas, including the student submissions and grades? (y/N)`.
- **`reset-canvas`** prints the same warning and lists the assignments by name.
  [Advanced commands](advanced-commands.md#reset-canvas) shows the full output.
- **`push`** prints one warning per changed field for each of the three fields
  above, including under `--dry-run` — the only mode where the warning arrives
  before the change rather than with it.

Two limits on all of that. A check that fails is reported as unknown, never as
safe — `SUBMISSION STATUS UNKNOWN`, or "could not determine whether 1 assignment
being deleted has student submissions" — and silence from a failed check is not
a clean bill of health, so treat an unknown as a yes. And the checks cover
assignments only, because nothing else the tool deletes carries a grade.

All of the above is about Canvas. The tool can also destroy local work: `pull`
overwrites whole files, and `pull --force` overwrites them even when it cannot
tell your writing from Canvas's output. See
[Push and pull are not a merge](#push-and-pull-are-not-a-merge).

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
  with the round-tripped Canvas version. With no sync state at all — right after
  `reset-sync-state`, or on a clone that has never synced — there is no
  timestamp to compare against, so pull skips every file that already exists
  locally and writes only the ones it is adding.
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
