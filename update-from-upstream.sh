#!/usr/bin/env bash
set -euo pipefail

# Update project from the upstream canvas-local template repository.
# Uses a squash merge so only one commit is added to your history.
# Content directories (course/, evaluations/, sources/) and README.md are always preserved.

PROTECTED_DIRS=(course evaluations sources)
PROTECTED_FILES=(README.md)
UPSTREAM_REMOTE="upstream"
UPSTREAM_BRANCH="main"

# --- Preflight checks ---

if [ -n "$(git status --porcelain)" ]; then
  echo "Error: working tree is not clean. Commit or stash your changes first."
  exit 1
fi

if ! git remote get-url "$UPSTREAM_REMOTE" &>/dev/null; then
  echo "Error: remote '$UPSTREAM_REMOTE' not found."
  echo "Run: git remote add $UPSTREAM_REMOTE https://github.com/lars-derichter/canvas-local.git"
  exit 1
fi

# --- Fetch upstream ---

echo "Fetching $UPSTREAM_REMOTE..."
git fetch "$UPSTREAM_REMOTE"

UPSTREAM_REF="$UPSTREAM_REMOTE/$UPSTREAM_BRANCH"
UPSTREAM_HASH=$(git rev-parse --short "$UPSTREAM_REF")

# --- Squash merge ---

echo "Merging $UPSTREAM_REF ($UPSTREAM_HASH) with --squash..."
# Conflicts are expected and handled below; don't let `set -e` abort the script.
git merge "$UPSTREAM_REF" --allow-unrelated-histories --squash || true

# --- Protect local content unconditionally ---
#
# `git merge --squash` only flags conflicts when both sides modify the same
# tracked file. Files that exist upstream but not locally (or vice versa) are
# staged silently with no conflict. So restoring protected paths only inside a
# conflict branch is not enough — we always restore them from HEAD.

echo "Protecting local content: ${PROTECTED_DIRS[*]} ${PROTECTED_FILES[*]}"

for dir in "${PROTECTED_DIRS[@]}"; do
  # Reset index entries under this path back to HEAD. `git checkout HEAD --`
  # alone would leave upstream-only files staged because the squash merge
  # silently added them and they are absent from HEAD's tree.
  git reset HEAD -- "$dir" >/dev/null 2>&1 || true
  if git cat-file -e "HEAD:$dir" 2>/dev/null; then
    git checkout HEAD -- "$dir"
  fi
  # Drop the upstream-only files that are now untracked in the working tree.
  if [ -d "$dir" ]; then
    git clean -fd -- "$dir" >/dev/null
  fi
done

for file in "${PROTECTED_FILES[@]}"; do
  if git cat-file -e "HEAD:$file" 2>/dev/null; then
    git checkout HEAD -- "$file"
  elif [ -f "$file" ]; then
    git rm -f --cached --ignore-unmatch -- "$file" >/dev/null
    rm -f -- "$file"
  fi
done

# --- Resolve any remaining (non-protected) conflicts by accepting upstream ---

CONFLICTED=$(git diff --name-only --diff-filter=U)
if [ -n "$CONFLICTED" ]; then
  echo "Accepting upstream version for:"
  echo "$CONFLICTED" | while read -r file; do
    echo "  $file"
    git checkout --theirs -- "$file"
  done
fi

git add -A

# --- Commit (skip if nothing changed) ---

if git diff --cached --quiet; then
  echo "Nothing to update — already at upstream $UPSTREAM_HASH."
  git tag -f last-upstream-merge "$UPSTREAM_REF" >/dev/null
  exit 0
fi

git commit -m "Import upstream updates from canvas-local ($UPSTREAM_HASH)"

# --- Tag for future reference ---

git tag -f last-upstream-merge "$UPSTREAM_REF"
echo "Tagged last-upstream-merge at $UPSTREAM_HASH."

# --- Done ---

echo ""
echo "Done! Review the changes with: git diff HEAD~1 HEAD --stat"
echo "Then run: npm install"
