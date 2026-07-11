---
title: Working with Claude Code
canvas_type: page
---

# Working with Claude Code

Writing a course is a lot of small, repetitive jobs: drafting pages, keeping your
style consistent, building quizzes, checking for broken links. An AI assistant
that works inside your editor can take on much of that, and this project is set
up to make it easy.

Claude Code is the assistant this project is tuned for. It is an AI coding
assistant by Anthropic that runs in your terminal and inside VS Code. You talk to
it in plain language, and it can read and write your files, run the `npx course`
commands, and follow packaged workflows called **skills**.

## What Are Skills?

A skill is a ready-made workflow you trigger with a slash command. Instead of
explaining a whole task from scratch, you type a short command and the assistant
follows instructions written for exactly that job. For example:

- `/proofread course/01-getting-started/03-alerts.md` checks a page against the
  project's writing style and your spelling.
- `/build-lesson-module lesson-03` turns a finished lesson plan into a complete
  set of student pages.

Skills are plain markdown files in the `.claude/skills/` folder, so you can read
what each one does and adjust it to fit how you work.

## What You Can Do With It

Beyond everyday help — "draft a page about X", "move these three items to another
module", "why did my push fail?" — this project ships a set of skills built for
course authoring. The main families:

- **Writing style** — `/initialize-style` adapts the style guide to your voice,
  `/update-style` folds in new preferences, and `/proofread` checks a page
  against it.
- **Lessons** — `/design-lesson` helps you plan a lesson, `/summarize-lesson`
  makes a one-page class version, and `/build-lesson-module` turns the plan into
  finished student pages. After teaching, `/lesson-retro` debriefs the lesson and
  folds your notes back in.
- **Evaluation** — `/design-evaluation` blueprints an exam, `/build-quiz` turns a
  question list into a Canvas quiz, and `/rubric` writes a grading rubric.
- **Quality** — `/consistency-check` sweeps the whole course for dead links and
  drift, `/coverage-map` checks which learning goals are taught and tested, and
  `/image-todos` lists the artwork you still owe.
- **Export styling** — `/create-export-style` derives a PDF or Word style from a
  reference document, and `/edit-export-style` tweaks it in plain language (see
  [Exporting to PDF or Word](13-exporting.md)).

You do not have to memorise these. Type `/` in Claude Code to see the list, or
just describe what you want and let it suggest the right one.

## Getting Started

1. Install Claude Code from [claude.ai/code](https://claude.ai/code) and open
   your project folder with it. It works in the terminal and as a VS Code
   extension.
2. Ask for something in plain language, or type a slash command like
   `/proofread`.
3. Review what it proposes before it acts. The skills that make bigger changes
   stop and show you a plan first.

> [!TIP]
>
> You stay in control. Claude Code works on your local files and runs the same
> `npx course` commands you would, and it asks before doing anything you have not
> already allowed, like pushing to Canvas or committing to git.

## Using a Different AI Assistant

You are not locked in. The skills live in `.claude/skills/` as plain markdown, so
any AI assistant that supports skills can use the same files, and the ideas —
slash commands, packaged instructions, plain-language requests — carry over to
other tools. If your assistant does not support skills, you can still open a
skill file and paste its instructions, or simply describe the task yourself.

> [!NOTE]
>
> For the full list of skills and what each one does, see the Claude Code guide
> (`docs/claude-code.md`) and the Lesson Workflow guide
> (`docs/lesson-workflow.md`) in the project documentation.
