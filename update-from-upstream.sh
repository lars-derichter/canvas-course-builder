#!/usr/bin/env bash
set -euo pipefail

# Update project from the upstream canvas-local template repository.
# Uses a squash merge so only one commit is added to your history.
# Content directories (course/, evaluations/, sources/) are always preserved.

CONTENT_DIRS=(course evaluations sources)
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
if git merge "$UPSTREAM_REF" --allow-unrelated-histories --squash 2>/dev/null; then
  echo "Merge completed without conflicts."
else
  echo "Conflicts detected. Resolving automatically..."

  # Keep ours for content directories
  for dir in "${CONTENT_DIRS[@]}"; do
    if [ -d "$dir" ]; then
      git checkout --ours -- "$dir/" 2>/dev/null || true
      echo "  Kept local version: $dir/"
    fi
  done

  # Accept theirs for all remaining conflicts
  CONFLICTED=$(git diff --name-only --diff-filter=U)
  if [ -n "$CONFLICTED" ]; then
    echo "  Accepting upstream version for:"
    echo "$CONFLICTED" | while read -r file; do
      echo "    $file"
      git checkout --theirs -- "$file"
    done
  fi

  git add -A
  echo "All conflicts resolved."
fi

# --- Commit ---

git commit -m "Import upstream updates from canvas-local ($UPSTREAM_HASH)"

# --- Tag for future reference ---

git tag -f last-upstream-merge "$UPSTREAM_REF"
echo "Tagged last-upstream-merge at $UPSTREAM_HASH."

# --- Done ---

echo ""
echo "Done! Review the changes with: git diff HEAD~1 HEAD --stat"
echo "Then run: npm install"
