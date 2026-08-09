# Updating Your Project

The original Canvas Course Builder project may receive bug fixes, new features, or
improved documentation over time. This guide shows you how to pull those updates
into your project.

> [!TIP]
>
> Before updating, make sure all your local changes are committed. Run
> `git status` to check — if it shows nothing to commit, you're good to go.

## One-time setup

Add the original Canvas Course Builder project as a remote called `upstream`. You only
need to do this once:

```bash
git remote add upstream https://github.com/lars-derichter/canvas-course-builder.git
```

You can verify it was added:

```bash
git remote -v
```

You should see both `origin` (your project) and `upstream` (the original
project).

The first time you run the script it creates a configuration file,
`update-from-upstream.conf`, and exits without merging anything. Review the
file, commit it, then run the script again. See
[Configuring what's protected](#configuring-whats-protected) for what the
settings mean.

## Pulling updates

The easiest way to update is with the included script:

```bash
bash update-from-upstream.sh
```

The script:

1. Fetches the latest changes from upstream.
2. Squash-merges them into a **single commit** on your branch — upstream's full
   history is not imported.
3. Always keeps your protected paths. The content directories (`course/`,
   `evaluations/`, `sources/`) and the protected files (`README.md`,
   `CLAUDE.md`, `docs/style.md`, and the config file itself) are restored from
   your version, never overwritten by upstream.
4. Prompts you for any **other** file that changed on both sides. For each
   conflict you choose what to do (see
   [Resolving conflicts](#resolving-conflicts) below).
5. Tags the merge point so you can see which upstream version you're on.

After running the script, install any updated dependencies:

```bash
npm install
```

Then push your updated branch to GitHub:

```bash
git push
```

## Configuring what's protected

The script reads its settings from `update-from-upstream.conf`. The file uses a
simple `key = value` format with space-separated lists; lines starting with `#`
are comments.

```ini
# Directories whose local content is always kept (never overwritten by upstream).
protected_dirs = course evaluations sources

# Individual files always kept. Includes this config file itself so your
# customizations here survive future upstream updates.
protected_files = README.md CLAUDE.md docs/style.md docs/course-context.md update-from-upstream.conf

# Upstream git remote and branch to merge from.
upstream_remote = upstream
upstream_branch = main
```

- **`protected_dirs`** — directories whose local content is always kept.
  Anything upstream adds inside them is dropped.
- **`protected_files`** — individual files always kept. The config file lists
  itself here, so your edits to it survive future updates. Add any tooling file
  you've customized and don't want upstream to touch.

> [!NOTE]
>
> `docs/course-context.md` was added to the default `protected_files` when the
> lesson skills were introduced. If your `update-from-upstream.conf` predates
> that, add it to your `protected_files` line yourself — otherwise upstream
> updates will overwrite your course-specific version with the template.
- **`upstream_remote`** / **`upstream_branch`** — where to merge from.

Because the config file is itself protected, edits you make here are never
overwritten. Commit the file after changing it.

### Renamed skill folders

Upstream occasionally renames a skill folder (in 2026: `initialize-style` →
`style-init`, `update-style` → `style-update`, `create-export-style` →
`export-style-create`, `edit-export-style` → `export-style-edit`). A squash
merge does not delete the old folder in your project, so the update script
prunes known old paths automatically — but it can only do that from the run
*after* the one that brought it the new list. After an update that renames
skills, either run the update once more or remove the old folders yourself
with `git rm -r`. If you customized one of the old skills, re-apply your
edits to the renamed successor; the old content stays in your git history.

## Resolving conflicts

A conflict only happens when a file outside your protected paths was changed
**both** locally and upstream. For each such file the script shows when each
side was last committed and prompts:

```
Conflict: docusaurus.config.js
  local last commit:    2026-05-20
  upstream last commit: 2026-05-28
  [l]ocal  [u]pstream  [m]erge in editor  [a]lways keep local   (default: upstream = most recent)
```

| Choice | What it does |
| --- | --- |
| `l` | Keep your version of the file. |
| `u` | Take the upstream version. |
| `m` | Open the conflict-marked file in your editor so you can merge by hand. The script waits, then checks that no conflict markers remain. |
| `a` | Keep your version **and** add the file to `protected_files` in the config, so it stops conflicting on future updates. |
| Enter | Apply the default — whichever side was committed most recently (ties go to upstream). |

If the script runs without a terminal (e.g. from another script), it applies
the default automatically for every conflict.

The `a` option is the clean way to "pin" a tooling file you've customized: the
next update restores it from your version before the resolver ever runs, so you
won't be asked again.

## Recovering local changes to tooling files

If you took the upstream version (`u`, or the default) of a file you'd actually
customized, you can recover your version afterwards.

**Before pushing** — restore your version from the previous commit:

```bash
git checkout HEAD~1 -- path/to/file
git add path/to/file
git commit -m "Restore local changes to path/to/file"
```

**After pushing** — recover from an earlier commit:

```bash
# See what changed
git diff HEAD~1 HEAD -- path/to/file

# Restore your version entirely
git checkout HEAD~1 -- path/to/file

# Or selectively re-apply your edits on top of the upstream version
```

> [!TIP]
>
> To stop being asked about a file you always want to keep, choose `a`
> (always keep local) at the prompt, or add it to `protected_files` yourself.

## Manual workflow

If you prefer to run the steps yourself instead of using the script:

1. **Fetch** the latest changes:

   ```bash
   git fetch upstream
   ```

2. **Squash merge** the changes. The `--squash` flag applies all upstream
   changes without importing their commit history. The
   `--allow-unrelated-histories` flag is needed because your project was created
   from a template, not forked:

   ```bash
   git merge upstream/main --allow-unrelated-histories --squash
   ```

3. **Restore your content from HEAD**, then resolve any remaining conflicts.
   A squash merge only flags conflicts when both sides modify the same file —
   files that exist upstream but not locally are added silently as staged
   additions. `git checkout HEAD --` will not unstage them (they are absent
   from HEAD), so first reset the index for those paths, then check out from
   HEAD, then clean the working tree:

   ```bash
   # Unstage upstream-only additions in your content paths
   git reset HEAD -- course/ evaluations/ sources/ 2>/dev/null || true

   # Restore your content and protected files from HEAD
   git checkout HEAD -- course/ evaluations/ sources/ \
     README.md CLAUDE.md docs/style.md docs/course-context.md \
     update-from-upstream.conf 2>/dev/null || true

   # Drop the now-untracked upstream-only files
   git clean -fd -- course/ evaluations/ sources/

   # For each remaining conflicted file, keep your version...
   git checkout HEAD -- path/to/conflicted-file
   # ...or take upstream's:
   git checkout --theirs -- path/to/conflicted-file

   # Stage everything
   git add -A
   ```

   The protected paths above mirror the defaults in `update-from-upstream.conf`;
   adjust the list to match your own config.

4. **Commit** the result:

   ```bash
   git commit -m "Import upstream updates from canvas-course-builder"
   ```

5. **Tag** the merge point for future reference:

   ```bash
   git tag -f last-upstream-merge upstream/main
   ```

6. **Install** updated dependencies and **push**:

   ```bash
   npm install
   git push
   ```

> [!TIP]
>
> If a merge gets too complicated, you can abort it and try again later:
>
> ```bash
> git merge --abort
> ```
