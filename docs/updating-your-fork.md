# Updating Your Fork

The original Canvas Local project may receive bug fixes, new features, or
improved documentation over time. This guide shows you how to pull those updates
into your fork.

> [!TIP]
>
> Before updating, make sure all your local changes are committed. Run
> `git status` to check — if it shows nothing to commit, you're good to go.

## Syncing on GitHub (recommended)

The easiest way to update your fork is directly on GitHub:

1. Go to **your fork** on GitHub (`github.com/YOUR-USERNAME/your-project-name`).
2. If your fork is behind the original project, you'll see a banner that says
   **"This branch is X commits behind"**. Click the **Sync fork** button, then
   click **Update branch**.
3. Once GitHub finishes syncing, pull the changes to your computer:

   ```bash
   git pull
   ```

That's it — your fork is up to date.

## Syncing via the terminal

If you prefer working from the command line, you can sync your fork using Git
directly.

### One-time setup

Add the original Canvas Local project as a remote called `upstream`. You only
need to do this once:

```bash
git remote add upstream https://github.com/lars-vc/canvas-local.git
```

You can verify it was added:

```bash
git remote -v
```

You should see both `origin` (your fork) and `upstream` (the original project).

### Pulling updates

Each time you want to sync:

1. **Fetch** the latest changes from the original project:

   ```bash
   git fetch upstream
   ```

2. **Merge** the changes into your local branch:

   ```bash
   git merge upstream/main
   ```

3. **Push** the updated branch to your fork on GitHub:

   ```bash
   git push
   ```

### Handling merge conflicts

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
