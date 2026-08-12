---
title: ⚠️ Before You Publish
canvas_type: page
---

# Before You Publish

Publishing is the one part of this tool that can lose work, so it gets its own
page before the page that shows you how.

## Canvas Has No Undo

Delete a page in the Canvas web editor and it sits in the course bin for a
while. Delete it through the API, which is what this tool uses, and it is gone.
There is no bin, no confirmation dialog you can walk back, and no version
history on the Canvas side.

That is fine when the course is empty and yours. It matters when the course
already has content, especially content someone else put there.

> [!IMPORTANT]
>
> Before your first push to a Canvas course that already has anything in it,
> back it up. Canvas → **Settings** → **Export Course Content** → **Course** →
> **Create Export** gives you a file you can re-import. It takes about two
> minutes and it is the only thing standing between a mistake and a bad week.

The safest way to learn this tool is in a **sandbox course**: an empty Canvas
course nobody is enrolled in. Push to it, break it, push again. Most
institutions hand out sandbox courses on request. When your material looks
right, copy it into the real course from Canvas's own **Import Course Content**
screen.

## What Push Actually Does

`npx course push` does not merge. It makes Canvas match your files:

- A module folder becomes a Canvas module. A markdown file becomes a page, an
  assignment, a link or a file, depending on its frontmatter.
- **Push rebuilds the item list of every module it manages.** The pages and
  assignments themselves survive, but anything you added to one of those modules
  by hand in Canvas (a quiz, a discussion, a link to an external tool) drops out
  of the module.

That last point is the one that surprises people. Treat a module this tool
manages as generated output: if you want something in it, it belongs in your
`course/` folder.

## The Commands That Delete

Three of them, in increasing order of how much you should think first:

| Command                   | What it removes                                                  |
| ------------------------- | ---------------------------------------------------------------- |
| `npx course push`         | Module items in the modules it manages (the content survives)    |
| `npx course push --prune` | Canvas modules, pages, assignments and files you deleted locally |
| `npx course reset-canvas` | Everything in the course, including content this tool never made |

The last two list what they are about to do and ask before doing it. The first
one does not ask, because it runs every time you publish.

> [!WARNING]
>
> `reset-canvas` is for wiping a scratch course back to empty. Run it on a live
> course and you delete your colleagues' files along with your own. It tells you
> what the course holds before it asks, so read that line.

## Two Habits Worth Forming

- **`npx course push --dry-run` first.** It reports what would happen and
  changes nothing. Read it. Then run the real push.
- **`npx course validate` when something feels off.** It catches missing
  frontmatter, broken internal links and invalid assignment settings while they
  are still cheap to fix.

With that out of the way, on to [Canvas Syncing](./02-canvas-syncing.md).
