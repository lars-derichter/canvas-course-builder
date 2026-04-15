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

## Writing style

Claude Code follows the conventions in [style.md](style.md) when drafting
course content: language register, tone, structure, formatting, and patterns
to avoid.

Two skills help you keep `style.md` in sync with how you actually write:

- Run `/initialize-style` once when you set up a new course, to adapt
  `style.md` to your own voice and audience.
- Run `/update-style` now and then after a working session in which you
  corrected Claude Code's drafts, to fold those corrections into `style.md`
  as durable rules so you don't have to repeat them.

You can also edit `style.md` by hand at any time. Treat it as a living
document — the more it reflects your real preferences, the less you'll need
to correct Claude Code's output.

## Skills

Skills are predefined workflows that Claude Code can run. Type the skill name
(e.g. `/commit`) in Claude Code to invoke it.

### /initialize-style

The `/initialize-style` skill adapts [style.md](style.md) to your own voice
and audience. When you type `/initialize-style` in Claude Code it will:

1. Ask for samples of your own writing and read them (strongly preferred).
2. Interview you about course language, student level, tone, formality,
   punctuation, emoji, and callout preferences — only the parts the samples
   did not already answer.
3. Rewrite `style.md` to match, preserving its section structure.
4. Update [CLAUDE.md](../CLAUDE.md) if anything in it now contradicts the
   new style.

If you have no samples, the skill will run interview-only and warn you that
the result is a best guess. You can still edit the file directly afterwards
or refine it later with `/update-style`.

Run this once when you set up a new course, and again whenever your voice
or audience changes substantially.

### /update-style

The `/update-style` skill reviews the current Claude Code conversation for
style corrections, rewrites, and preferences you expressed, and folds them
into [style.md](style.md) as durable rules. Use it after a session in which
you corrected Claude Code's drafts, so you don't have to repeat the same
feedback next time.

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
