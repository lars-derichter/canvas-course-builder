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

Claude Code follows the conventions in [style.md](style.md) when drafting course
content: language register, tone, structure, formatting, and patterns to avoid.

Three skills wrap around `style.md`:

- Run `/proofread <path>` to check an existing document against `style.md`
  (spelling, grammar, naturalness, audience-appropriate register).
- Run `/initialize-style` once when you set up a new course, to adapt `style.md`
  to your own voice and audience.
- Run `/update-style` now and then after a working session in which you
  corrected Claude Code's drafts, to fold those corrections into `style.md` as
  durable rules so you don't have to repeat them.

You can also edit `style.md` by hand at any time. Treat it as a living document
— the more it reflects your real preferences, the less you'll need to correct
Claude Code's output.

## Skills

Skills are predefined workflows that Claude Code can run. Type the skill name
(e.g. `/commit`) in Claude Code to invoke it.

### /proofread

The `/proofread` skill checks a Dutch markdown document against
[style.md](style.md) and your spelling. When you type `/proofread <path>` in
Claude Code it will:

1. Determine the register from the file path (`course/`, `evaluations/` are
   student-facing; `sources/lessons/`, `sources/lesson-plans/`, and anything
   else under `sources/` are collega-facing). For other paths, it asks.
2. Read `style.md` and apply the shared rules plus the audience-specific
   section.
3. Run mechanical checks: em-dashes, AI-tell phrases, Hollandisms, title-case
   headings, address form (`u`/`jij`), audience-mismatch (page-title emoji or
   callouts in a collega doc; meta-intros in a student doc).
4. Spell-check with `hunspell` if installed, treating `cSpell.words` in
   [.vscode/settings.json](../.vscode/settings.json) and code-block tokens as
   the project whitelist.
5. Read the prose for naturalness: anglicisms and translated-English patterns,
   decorative tricolons, scattered bold, trailing summaries.
6. Report findings in three buckets: **must fix**, **strongly suggest**,
   **consider**. Each finding includes the line number, the quoted text, a
   one-sentence diagnosis, and a proposed replacement.

The skill reports but does not auto-fix. After the report it offers to apply
selected fixes; the default is to leave the file alone. Nothing is committed.

For best spell-checking, install `hunspell` with `nl_NL` and `en_GB`
dictionaries:

```bash
brew install hunspell
mkdir -p ~/Library/Spelling && cd ~/Library/Spelling
curl -fLO https://raw.githubusercontent.com/LibreOffice/dictionaries/master/nl_NL/nl_NL.aff
curl -fLO https://raw.githubusercontent.com/LibreOffice/dictionaries/master/nl_NL/nl_NL.dic
curl -fLO https://raw.githubusercontent.com/LibreOffice/dictionaries/master/en/en_GB.aff
curl -fLO https://raw.githubusercontent.com/LibreOffice/dictionaries/master/en/en_GB.dic
```

Without `hunspell`, the skill falls back to a visual spelling scan and says so
in the report.

### /initialize-style

The `/initialize-style` skill adapts [style.md](style.md) to your own voice and
audience. When you type `/initialize-style` in Claude Code it will:

1. Ask for samples of your own writing and read them (strongly preferred).
2. Interview you about course language, student level, tone, formality,
   punctuation, emoji, and callout preferences — only the parts the samples did
   not already answer.
3. Rewrite `style.md` to match, preserving its section structure.
4. Update [CLAUDE.md](../CLAUDE.md) if anything in it now contradicts the new
   style.

If you have no samples, the skill will run interview-only and warn you that the
result is a best guess. You can still edit the file directly afterwards or
refine it later with `/update-style`.

Run this once when you set up a new course, and again whenever your voice or
audience changes substantially.

### /update-style

The `/update-style` skill reviews the current Claude Code conversation for style
corrections, rewrites, and preferences you expressed, and folds them into
[style.md](style.md) as durable rules. Use it after a session in which you
corrected Claude Code's drafts, so you don't have to repeat the same feedback
next time.

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
