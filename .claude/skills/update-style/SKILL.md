---
name: update-style
description: Review style corrections and preferences the user expressed in this conversation, and fold them into docs/style.md as durable rules. Use for "update style", "stijlregel toevoegen", "onthoud deze schrijfvoorkeur", "make this a style rule".
---

# Update style

Turn one-off style corrections from the current conversation into permanent
entries in [`docs/style.md`](../../../docs/style.md), so the author does
not have to repeat the same feedback next time Claude Code drafts material.

## Steps

1. **Scan the conversation** for style signals: direct corrections ("don't
   use em-dashes", "too formal", "sentences too long"), rewrites the author
   made to drafts (diff before/after, extract the pattern), positive
   confirmations of non-obvious choices, and word-choice preferences ("use
   _kot_ instead of _studentenkamer_", "never _leuk_").

2. **Cluster the findings by the actual current headings of `style.md`** —
   read them at runtime, never assume a section list. Mind the registers:
   a preference expressed about student material belongs in the
   student-facing section, one about lesson plans in the collega-facing
   section, and only genuinely general rules under the shared rules.

3. **Propose the edits**: a concise list of additions, rewordings, or
   removals with the reason for each, sourced from the conversation. Apply
   only after confirmation, with surgical `Edit`s so the author can review
   a small diff.

4. **Check `CLAUDE.md` at the project root** and update it only where a
   new rule directly contradicts it. Then report what changed; the next
   draft follows the updated rules.

## Rules

- If the conversation has no style signals, say so and stop — do not
  invent rules.
- Prefer concrete examples over abstract rules: "avoid _hanteren_, prefer
  _gebruiken_" beats "keep diction plain".
- Do not commit the changes automatically.

$ARGUMENTS
