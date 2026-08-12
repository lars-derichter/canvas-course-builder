# Backing up a Canvas course

Canvas has no undo. Delete a page in the web interface and it goes to the course
bin for a while; delete a module through the API and it is gone. Canvas Course
Builder talks to the API, so before you point it at a course that already holds
content — a course you taught last year, a course a colleague handed over, any
course with student work in it — take a backup.

This takes a few minutes once. It is the difference between a bad afternoon and
a bad semester.

> [!WARNING]
>
> Three commands can destroy Canvas content: `npx course reset-canvas` deletes
> every module, page, assignment and file in the course, including content this
> tool never created. `npx course push --prune` deletes the Canvas modules and
> items you removed locally. And an ordinary `npx course push` clears the item
> list of every module it manages, so anything you added by hand in Canvas drops
> out of those modules. See [Limitations](limitations.md) for exactly what each
> one touches.

## Route 1: export the course to a file

The quickest backup, and the one to take before your first push. It produces a
single `.imscc` file you download and keep.

1. Open the course in Canvas and click **Settings** in the course navigation.
2. In the right-hand sidebar, click **Export Course Content**.
3. Choose **Course** as the export type and click **Create Export**.
4. Wait for the export to finish — Canvas emails you when it is ready for a
   large course — then click the link to download the `.imscc` file.
5. Store it somewhere that is not your laptop's Downloads folder.

To restore it, create or open a course, go to **Settings > Import Course
Content**, choose **Canvas Course Export Package**, and upload the file.

An export carries pages, assignments, files, modules, quizzes and discussions.
It does **not** carry student submissions, grades, or announcements sent to
students. If those matter, back the course up before anyone submits anything, or
export the gradebook separately from **Grades > Export**.

## Route 2: copy the course into a sandbox

A copy gives you a working Canvas course to compare against, rather than a file
you have to import before you can look at it.

1. Open the course, click **Settings**, then **Copy this Course** in the
   right-hand sidebar.
2. Give the copy a name that says what it is —
   `Backup of Web development 2025-26, before sync` — and set the dates.
3. Click **Create Course**.

Whether you can do this depends on your Canvas permissions. If the button is not
there, ask whoever administers Canvas at your institution for a sandbox course;
most institutions hand them out on request.

## Route 3: work in a sandbox, then copy over

The safest way to start, and the one to use while you are still learning what
push does.

1. Get an empty sandbox course, and put its course ID in `.env` with
   `npx course init` (see [Canvas setup](canvas-setup.md)).
2. Push, look at the result, fix, push again. Break whatever you like — nobody
   is enrolled.
3. When the course looks right, copy it into the real course: open the real
   course, **Settings > Import Course Content > Copy a Canvas Course**, and pick
   the sandbox.
4. Only then point `.env` at the real course. See
   [New academic year](new-academic-year.md), which is the same move performed
   every summer.

The cost of this route is that the Canvas ids differ between the two courses, so
your `.canvas-sync.json` describes the sandbox, not the real course. Run
`npx course reset-sync-state` when you switch.

## What git backs up, and what it does not

[Git and GitHub](git-and-github.md) call your repository a backup, and for your
own writing it is: every version of every markdown file, recoverable. That is
the half of the problem git solves.

It does not back up Canvas. Your repository knows nothing about the pages a
colleague wrote in the web editor, the quiz you built by hand, the discussion
threads, or the student submissions. Pushing your markdown to GitHub protects
your markdown. Only a Canvas export or a course copy protects the course.

## When to take one

- **Before the first push to any course that already has content.** The CLI
  warns you at this point and asks for confirmation.
- **Before `reset-canvas` or `push --prune`**, every time. Both prompt, and both
  point back here.
- **At the end of each academic year**, before you repoint the project at a new
  course.
- **Before you try something you have not tried before**, which for a while is
  most things.
