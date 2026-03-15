# Claude Code

[Claude Code](https://claude.ai/code) is an AI coding assistant by Anthropic
that runs in your terminal or inside VS Code. It can read your project files,
run commands, and make changes — all guided by natural language instructions.

This project includes a [CLAUDE.md](../CLAUDE.md) file that gives Claude Code
full context about the project structure, available commands, and coding
conventions, so it can assist you effectively out of the box.

## Use cases for course authors

- **Writing course content** — describe what a page or assignment should cover
  and let Claude Code draft the markdown
- **Creating modules and items** — ask Claude Code to run the CLI commands for
  you, filling in names and positions interactively
- **Restructuring courses** — move, rename, merge, or split items across modules
  in bulk
- **Generating markdown from notes** — paste rough notes or bullet points and
  have them turned into polished course pages
- **Debugging sync issues** — describe the problem and let Claude Code inspect
  sync state, logs, and Canvas responses
- **Reviewing content** — ask Claude Code to check for broken links, missing
  frontmatter, or inconsistencies across modules

## Skills

Skills are predefined workflows that Claude Code can run. Type the skill name
(e.g. `/commit`) in Claude Code to invoke it.

### /commit

The `/commit` skill makes committing safer and more consistent. When you type
`/commit` in Claude Code it will:

1. Review all staged and unstaged changes.
2. Stage the appropriate files.
3. Create a commit with a clear message following the project conventions.

#### Commit message conventions

- Imperative, present tense, verb-first (e.g. _Add_, _Fix_, _Update_, _Remove_,
  _Rename_).
- Single-line summary — no conventional-commit prefixes like `feat:` or `fix:`.
- Focus on _what_ changed and _why_, not implementation details.

Examples:

```
Add reset-canvas command to wipe all content from a Canvas course
Upload files to module-named Canvas folder instead of unfiled
Fix push failing to add pages/assignments to Canvas modules
```
