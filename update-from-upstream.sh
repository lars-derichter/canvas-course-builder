#!/usr/bin/env bash
set -euo pipefail

# Update project from the upstream canvas-local template repository.
# Uses a squash merge so only one commit is added to your history.
# Content directories (course/, evaluations/, sources/) and the protected files
# (README.md, CLAUDE.md, docs/style.md) are always preserved. Remaining
# conflicts accept the upstream version.

# --- Load configuration ---
#
# Settings live in an external file so per-repo customizations survive upstream
# updates (the file lists itself under protected_files). Format is `key = value`
# with space-separated lists; '#' begins a comment.

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/update-from-upstream.conf"

if [ ! -f "$CONFIG_FILE" ]; then
  cat > "$CONFIG_FILE" <<'EOF'
# Configuration for update-from-upstream.sh
# Lists are space-separated. Lines starting with # are comments.

# Directories whose local content is always kept (never overwritten by upstream).
protected_dirs = course evaluations sources

# Individual files always kept. Includes this config file itself so your
# customizations here survive future upstream updates.
protected_files = README.md CLAUDE.md docs/style.md update-from-upstream.conf

# Upstream git remote and branch to merge from.
upstream_remote = upstream
upstream_branch = main
EOF
  echo "Created default config at $CONFIG_FILE."
  echo "Review it, commit it, then run this script again."
  exit 0
fi

PROTECTED_DIRS=()
PROTECTED_FILES=()
UPSTREAM_REMOTE=""
UPSTREAM_BRANCH=""

while IFS= read -r line || [ -n "$line" ]; do
  line="${line%%#*}"                                   # strip comments
  [[ "$line" =~ ^[[:space:]]*$ ]] && continue          # skip blanks
  if [[ ! "$line" =~ ^[[:space:]]*([a-z_]+)[[:space:]]*=[[:space:]]*(.*)$ ]]; then
    echo "Warning: ignoring malformed config line: $line" >&2
    continue
  fi
  key="${BASH_REMATCH[1]}"
  value="${BASH_REMATCH[2]}"
  value="${value%"${value##*[![:space:]]}"}"           # trim trailing whitespace
  case "$key" in
    protected_dirs)  read -r -a PROTECTED_DIRS  <<< "$value" ;;
    protected_files) read -r -a PROTECTED_FILES <<< "$value" ;;
    upstream_remote) UPSTREAM_REMOTE="$value" ;;
    upstream_branch) UPSTREAM_BRANCH="$value" ;;
    *) echo "Warning: unknown config key '$key' in $CONFIG_FILE" >&2 ;;
  esac
done < "$CONFIG_FILE"

if [ -z "$UPSTREAM_REMOTE" ] || [ -z "$UPSTREAM_BRANCH" ]; then
  echo "Error: $CONFIG_FILE must set upstream_remote and upstream_branch."
  exit 1
fi

# Soft safeguard: warn if the config file isn't protecting itself.
case " ${PROTECTED_FILES[*]} " in
  *" $(basename "$CONFIG_FILE") "*) : ;;
  *) echo "Warning: $(basename "$CONFIG_FILE") is not in protected_files; upstream could overwrite it." >&2 ;;
esac

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
