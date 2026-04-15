---
name: update-style
description: Review style corrections and preferences the user expressed in this conversation, and fold them into docs/style.md as durable rules.
---

# Update style

Turn one-off style corrections from the current conversation into permanent
entries in `docs/style.md`, so the author does not have to repeat the same
feedback next time Claude Code drafts course material.

## Steps

1. **Scan the current conversation** for signals about the author's style
   preferences, including:
   - Direct corrections ("don't use em-dashes", "this is too formal",
     "sentences are too long", "don't start every page with a meta-intro").
   - Rewrites the author made to drafts Claude Code produced — diff
     before/after and extract the pattern.
   - Positive confirmations ("yes exactly, keep doing that") of
     non-obvious choices.
   - Word-choice preferences ("use _kot_ instead of _studentenkamer_",
     "never say _leuk_").

2. **Cluster the findings** by the section of `style.md` they belong to
   (Language, Voice and tone, Exercises, Structure, Headings, Page-title
   emoji, Callouts, Punctuation, AI tells, Links, Code examples).

3. **Propose the edits.** Show the author a concise list of additions,
   rewordings, or removals with the reason for each, sourced from the
   conversation.

4. **Apply after confirmation.** Edit `docs/style.md`. Prefer surgical
   edits over full rewrites so the author can review a small diff.

5. **Check `CLAUDE.md` at the project root** for conflicts with the new
   rules. Update only if something directly contradicts.

6. **Report** what changed and remind the author the next Claude Code
   draft will follow the updated rules.

## Rules

- If the conversation has no style signals, say so and stop — do not
  invent rules.
- Prefer concrete examples over abstract rules. "Avoid _hanteren_,
  prefer _gebruiken_" beats "keep diction plain".
- Do not commit the changes automatically.

$ARGUMENTS
