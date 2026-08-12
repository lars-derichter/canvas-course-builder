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

## reset-canvas

```bash
npx course reset-canvas
npx course reset-canvas --dry-run   # show what would go, delete nothing
```

Deletes **all** content from the Canvas course configured in `.env`, not only
content this tool created:

- All modules
- All pages
- All assignments
- All files

Quizzes, discussions, announcements, rubrics and grades survive — there is no
API call for them here — but the modules that linked them do not.

The command lists what the course holds, then asks:

```
[reset-canvas] Canvas course 123 contains 4 modules, 18 pages, 2 assignments.
[reset-canvas] All of it will be deleted, including content this project never created.
[reset-canvas] Canvas has no undo. Back the course up first — see docs/backups.md.
[reset-canvas] Delete all content on course 123? (y/N)
```

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
- **Conflict detection**: `pull` skips files modified since the last sync rather
  than overwriting them. It compares timestamps, not content, which has
  consequences worth knowing — see
  [Push and pull are not a merge](limitations.md#push-and-pull-are-not-a-merge).
- **Stale ID recovery**: If a module, page, or assignment was deleted on Canvas
  but still has a stored ID locally, push detects the 404 and automatically
  creates a new resource.
- **Progress counters**: Push and pull show progress like `Module 2/5`,
  `Item 3/12`.
