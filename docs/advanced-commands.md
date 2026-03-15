# Advanced Commands

Commands for managing sync state and Canvas content. These commands modify state
destructively — only use them if you know what you are doing.

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

**Note:** The command runs immediately with no confirmation prompt.

## reset-canvas

```bash
npx course reset-canvas
```

Deletes **all** content from the Canvas course configured in `.env`:

- All modules
- All pages
- All assignments
- All files

The command asks for interactive confirmation before making any changes:

```
Are you sure you want to delete all content on the Canvas course with id 123? (y/n)
```

If individual deletions fail the command continues with the remaining items and
reports a summary of errors at the end.

Use `--verbose` to see each deletion as it happens:

```bash
npx course --verbose reset-canvas
```

**Typical workflow:** Run `reset-canvas` followed by `reset-sync-state` to get
both Canvas and local state back to a clean slate, then `push` to re-create
everything.

## Resilience & Conflict Detection

- **Retry logic**: API calls automatically retry on 429 (rate limit) and 5xx
  errors with exponential backoff (up to 3 attempts).
- **Error recovery**: If a single module or item fails during push/pull, the
  remaining items continue and a summary of errors is shown at the end.
- **Conflict detection**: `pull` checks if local files have been modified since
  the last sync and skips them to avoid overwriting your work. Use `--force` to
  override.
- **Stale ID recovery**: If a module, page, or assignment was deleted on Canvas
  but still has a stored ID locally, push detects the 404 and automatically
  creates a new resource.
- **Progress counters**: Push and pull show progress like `Module 2/5`,
  `Item 3/12`.
