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
git remote add upstream https://github.com/lars-vc/canvas-local.git
```

You can verify it was added:

```bash
git remote -v
```

You should see both `origin` (your project) and `upstream` (the original
project).

## Pulling updates

Each time you want to sync:

1. **Fetch** the latest changes from the original project:

   ```bash
   git fetch upstream
   ```

2. **Merge** the changes into your local branch. The
   `--allow-unrelated-histories` flag is needed because your project was created
   from a template, not forked:

   ```bash
   git merge upstream/main --allow-unrelated-histories
   ```

3. **Push** the updated branch to your project on GitHub:

   ```bash
   git push
   ```

## Handling merge conflicts

Most updates won't conflict with your course materials because your content
lives in `course/` while upstream changes typically affect tooling and
configuration files. However, if you've modified the same file that was updated
upstream, Git may report a merge conflict.

When that happens:

1. Git will tell you which files have conflicts.
2. Open each file and look for conflict markers (`<<<<<<<`, `=======`,
   `>>>>>>>`). The top section is your version, the bottom section is the
   upstream version.
3. Edit the file to keep the parts you want, and remove the conflict markers.
4. Stage and commit the resolved files:

   ```bash
   git add .
   git commit -m "Merge upstream updates"
   ```

> [!TIP]
>
> If a merge gets too complicated, you can abort it and try again later:
>
> ```bash
> git merge --abort
> ```
