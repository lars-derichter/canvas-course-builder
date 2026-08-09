---
name: commit
description: Stage changes and create a git commit with a clear, consistent message. Use for "commit", "commit dit", "maak een commit", "commit the changes".
---

# Commit

Create a git commit following the project's commit message conventions.

## Steps

1. Review all changes with `git status` (never `-uall`) and `git diff`.
2. **Before staging**, run `git remote get-url origin` to determine the
   mode:
   - Origin URL contains `canvas-course-builder` → **development mode**: skip all
     changes inside `course/` unless the user explicitly asks to include
     them — they are typically temporary sync-test artifacts that should
     not reach git history or the remote.
   - Otherwise → **production mode**: stage everything (including
     `canvas_id` and other `course/` changes) normally.
3. Stage by name (`git add <file>...`), never `git add -A` or `git add .`.
4. Commit with the message in a HEREDOC, ending in the standard Claude
   Code co-author trailer the harness specifies for the current model —
   never a hardcoded model name:
   ```bash
   git commit -m "$(cat <<'EOF'
   Message here

   <standard Claude Code co-author trailer>
   EOF
   )"
   ```

## Message style

- Imperative, present tense, verb-first (Add, Fix, Update, Replace,
  Remove, Rewrite, …); no conventional-commit prefixes (`feat:`, `fix:`).
- A single-line summary focused on what and why, concise but clear
  without reading the diff. A blank line plus a short body only when the
  summary alone cannot carry the motivation.
- Examples from this project:
  ```
  Add reset-canvas command to wipe all content from a Canvas course
  Fix push failing to add pages/assignments to Canvas modules
  Replace example module with comprehensive Getting Started guide
  ```

## Rules

- Never push or amend unless explicitly asked.
- Never skip hooks (`--no-verify`). If a pre-commit hook fails, fix the
  issue, re-stage, and create a new commit — do not amend.

$ARGUMENTS
