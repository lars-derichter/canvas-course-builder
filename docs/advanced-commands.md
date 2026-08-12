# Advanced Commands

Commands for managing sync state and Canvas content. These commands modify state
destructively — only use them if you know what you are doing.

> [!WARNING]
>
> Canvas has no undo. Back the course up before running anything on this page:
> see [Backing up a Canvas course](backups.md).

## reset-sync-state

```bash
npx course reset-sync-state
```

Removes all instance-specific sync artifacts from the local codebase:

1. Walks every markdown file in `course/` and strips the `canvas_id` field from
   its frontmatter.
2. Deletes `.canvas-sync.json` (the file that tracks module IDs, item IDs, and
   uploaded icon IDs).

After running this command the project is back to a "never pushed" state — the
next `push` will create everything fresh on Canvas.

**When to use:**

- Switching to a different Canvas instance or course.
- Preparing the repo for sharing (strip instance-specific IDs).
- Testing the full sync flow from scratch.

**Note:** The command asks for confirmation, and touches nothing on Canvas. The
Canvas course keeps all its content — which is the trap: push after this on a
course that still holds the old content and you get a duplicate of everything.
It also removes the timestamp `pull` compares against, so the next pull can no
longer tell your own writing from Canvas's output and skips every file that
already exists locally.

## reset-canvas

```bash
npx course reset-canvas
npx course reset-canvas --dry-run   # show what would go, delete nothing
```

Deletes **all** content from the Canvas course configured in `.env`, not only
content this tool created:

- All modules
- All pages
- All assignments, except the ones that are really a quiz
- All files

Deleting an assignment deletes its gradebook column and the student submissions
on it. Canvas's `/undelete` sometimes brings an assignment back, but the
submissions frequently do not come with it, so grades are lost for good. Export
the gradebook first — see [Backing up a Canvas course](backups.md). For which
deletions cost grades and which cost only content, see
[Destructive operations and student work](limitations.md#destructive-operations-and-student-work).

Classic quizzes, discussions, announcements and rubrics survive, but the modules
that linked them do not.

Quizzes survive because the command skips them, not because it cannot reach
them. A graded Classic Quiz is two objects in Canvas: the quiz that holds the
questions, and an assignment that holds its column in the gradebook. That second
object is returned by the assignments API like any other assignment — flagged
`is_quiz_assignment: true`, carrying the quiz's id in `quiz_id` — and a `DELETE`
on it deletes the quiz, its questions and every submission on it. `reset-canvas`
leaves those assignments where they are, names them in its output, and keeps
them out of the count of assignments it is about to delete. A practice quiz has
no gradebook column and never appears in that list at all, so it was never at
risk. A New Quiz is the exception that does get deleted: it is genuinely an
assignment, one that launches an LTI tool, with no separate quiz object behind
it.

The command lists what the course holds, names the assignments that students
have already submitted to and the ones it is skipping, then asks:

```
[reset-canvas] Canvas course 123 contains 4 modules, 18 pages, 2 assignments.
[reset-canvas] All of it will be deleted, including content this project never created.
[reset-canvas] Every assignment counted above is deleted, and its gradebook column and its student submissions go with it.
[reset-canvas] Classic quizzes, discussions, announcements and rubrics are left alone, but the modules that linked them are not.
[reset-canvas] 1 of the assignments on this course is the gradebook half of a graded quiz. It is skipped: deleting it deletes the quiz, its questions and every submission on it, and nothing here could rebuild the quiz afterwards.
  - Test 1 (kept, with its quiz)
[reset-canvas] WARNING: 1 assignment being deleted has student submissions. Deleting an assignment deletes its gradebook column and every submission and grade in it.
  - Exercise 2 (has student submissions)
[reset-canvas] Canvas has no undo. Back the course up first — see docs/backups.md.
[reset-canvas] Delete all content on course 123, including the student submissions and grades? (y/N)
```

Canvas lists three assignments on that course; two of them are counted above,
because the third is the quiz.

The submission check costs no extra request: Canvas puts
`has_submitted_submissions` on the assignments the command already listed. When
Canvas does not answer it — an older instance, a trimmed response — the
assignment is reported as `submission status unknown` and the warning says the
status could not be determined. It is never reported as safe.

Anything other than `y` cancels, so a piped or non-interactive run cancels
rather than deleting.

If individual deletions fail the command continues with the remaining items and
reports a summary of errors at the end.

Use `--verbose` to see each deletion as it happens:

```bash
npx course --verbose reset-canvas
```

**Typical workflow:** Run `reset-canvas` followed by `reset-sync-state` to get
both Canvas and local state back to a clean slate, then `push` to re-create
everything.

## Resilience and Conflict Detection

- **Retry logic**: API calls automatically retry on 429 (rate limit) and 5xx
  errors with exponential backoff (up to 3 attempts).
- **Error recovery**: If a single module or item fails during push/pull, the
  remaining items continue and a summary of errors is shown at the end.
- **Conflict detection**: `pull` writes a file only when the write is provably
  safe — the file does not exist yet, or it is older than the last sync and is
  therefore Canvas's own output coming back. Everything else is skipped with the
  reason printed: a file touched since the last sync, and a file that cannot be
  judged at all because there is no sync state to compare it against (right
  after `reset-sync-state`, or on a clone that has never synced). "Cannot tell"
  is not "unmodified". It compares timestamps, not content, which has
  consequences worth knowing — see
  [Push and pull are not a merge](limitations.md#push-and-pull-are-not-a-merge).
- **Forced overwrite**: `pull --force` writes regardless, and asks first on the
  one combination that can wipe hand-written markdown in a single run —
  `--force` on a `course/` tree that already holds markdown, with no sync state
  to judge it by. A non-interactive run answers no and cancels.
- **Stale ID recovery**: If a module, page, or assignment was deleted on Canvas
  but still has a stored ID locally, push detects the 404 and automatically
  creates a new resource.
- **Progress counters**: Push and pull show progress like `Module 2/5`,
  `Item 3/12`.
