# Updating Your Project

The original Canvas Local project may receive bug fixes, new features, or
improved documentation over time. This guide shows you how to pull those updates
into your project.

> [!TIP]
>
> Before updating, make sure all your local changes are committed. Run
> `git status` to check — if it shows nothing to commit, you're good to go.

## One-time setup

Add the original Canvas Local project as a remote called `upstream`. You only
need to do this once:

```bash
git remote add upstream https://github.com/lars-derichter/canvas-local.git
```

You can verify it was added:

```bash
git remote -v
```

You should see both `origin` (your project) and `upstream` (the original
project).

## Pulling updates

The easiest way to update is with the included script:

```bash
bash update-from-upstream.sh
```

The script:

1. Fetches the latest changes from upstream.
2. Squash-merges them into a **single commit** on your branch — upstream's full
   history is not imported.
3. Automatically resolves conflicts: your content (`course/`, `evaluations/`,
   `sources/`) is always kept, while tooling files accept the upstream version.
4. Tags the merge point so you can see which upstream version you're on.

After running the script, install any updated dependencies:

```bash
npm install
```

Then push your updated branch to GitHub:

```bash
git push
```

## Recovering local changes to tooling files

If you modified a tooling file that was also changed upstream (e.g.
`docusaurus.config.js`), the script accepts the upstream version and prints a
warning. You have several options to recover your changes:

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
> If you need to customize tooling files, consider keeping your changes in a
> separate commit so they are easy to re-apply after an update.

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

3. **Resolve conflicts** if any appear. Keep your version for content
   directories and accept upstream for tooling:

   ```bash
   # Keep your content
   git checkout --ours -- course/ evaluations/ sources/

   # Accept upstream for remaining conflicted files
   git checkout --theirs -- path/to/conflicted-file

   # Stage everything
   git add -A
   ```

4. **Commit** the result:

   ```bash
   git commit -m "Import upstream updates from canvas-local"
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
