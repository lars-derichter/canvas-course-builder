---
name: build-lesson-module
description: Generate a complete student-facing module under course/ from a lesson plan in sources/lessons/. Splits the plan into pages (overview, content, reference cards, summary, glossary, optional homework), builds downloadable code archives from the plan's snippets, and drops transparent PNG placeholders with TODO notes for images. Use for "build lesson module", "module maken van les", "student-materiaal genereren", "lesplan omzetten naar course".
---

# Build lesson module

Turn a lesson plan under `sources/lessons/lesson-NN.md` into a complete
student-facing module under `course/`. The skill runs in two phases:
**Phase A** proposes a design (module name, page split, archive and image
inventory) and stops for approval; **Phase B** writes every file. Never write
files in Phase A.

## Input

`$ARGUMENTS` may hold a path (`sources/lessons/lesson-03.md`), a lesson number
(`lesson 3`, `3`), and/or free-text notes on the page split. If empty and
`ide_opened_file` is under `sources/lessons/`, use that; otherwise ask. Stop
with one sentence if the source is not a `.md` under `sources/lessons/`.

## Read before designing

In order:

- The source lesson plan (full).
- [`docs/course-context.md`](../../../docs/course-context.md) — module
  conventions (page roles, naming, reference-card types and their emoji),
  code-and-downloads rules, glossary. For each section that is still `TODO`
  and that this module needs, infer the answer from existing modules or ask
  the author once, and offer at the end to save it back into
  `course-context.md`.
- [`docs/style.md`](../../../docs/style.md) (full) — the pages are written in
  the student-facing register.
- [`docs/frontmatter.md`](../../../docs/frontmatter.md) — fields per content
  type.
- The one or two lowest-numbered existing modules under `course/` as worked
  examples (pages, `_category_.json`, `_files/`), if any exist. If none exist,
  Phase A's proposal is also a proposal for the module conventions; confirm it
  explicitly.
- The canonical glossary file, if the course has one (see `course-context.md`).

## Phase A — Design

### 1. Module name and position

- Next free `NN` prefix in `course/` (two-digit, leading zero). It is both the
  folder prefix and the `position` in `_category_.json`.
- Folder and sidebar label follow the naming convention in
  `course-context.md` or the existing modules; default:
  `course/NN-<slug>/` with a kebab-case ASCII slug from the lesson title and a
  sentence-case label.

### 2. Inventory the plan

- **Code snippets** (only for courses with code). Read every code block.
  Group into projects: snippets that reference each other belong to one
  project; independent snippets can share one archive in numbered subfolders.
  Name each archive from context. Layout, packaging, and exclusions follow the
  Code and downloads section of `course-context.md`.
- **Reference cards** (only if the course defines card or cheat-sheet page
  types in `course-context.md`). Find every card the plan introduces — the
  plan names them in prose the way `/design-lesson` writes them. Each becomes
  its own page; a lesson may introduce zero.
- **Homework.** Detect a homework/assignment section. No homework page if the
  plan has none.
- **Images.** Find references like "show on the board", "project this",
  diagrams, schemas. Propose a placeholder per reference with a concrete TODO.
  One to three per lesson is normal; none for pages that are clear without an
  image.

### 3. Propose (in chat, no files)

- **Module name and label**, one line.
- **Page split**, numbered, in order (adjust to the page roles in
  `course-context.md`):
  1. `01-<overview>.md` (always) — short intro to the module.
  2. One or more content pages `0X-<slug>.md`, one per block or concept
     cluster. For each: proposed title + one-line summary.
  3. Reference-card pages directly after the content page that introduces
     them, plus a short callout pointer on that content page back to the card.
  4. A summary page.
  5. A glossary page (only if the course generates one), after the summary.
  6. A homework page (if the plan has homework), last.
- **Code projects/archives**: per project, name, file count, layout,
  referencing page(s).
- **Image placeholders**: filename, page, TODO text.

Stop. Wait for `OK` or corrections.

## Phase B — Write (only after approval)

### 4. Build the code archives

For each project, make a tmp dir (`/tmp/build-lesson-module-XXXX/<project>/`)
laid out per the course's conventions. Common rules unless
`course-context.md` says otherwise:

- **No** IDE metadata, build files, or compiled artifacts in the archive.
- **Yes** a `<project>/` root folder, so the student's IDE recognises the
  project after unzipping.
- One class/unit per file, filenames per the language's conventions. Keep the
  plan's code comments in the course's comment language.
- Wrap an incomplete snippet in a minimal runnable entry point with a TODO
  comment.
- Build the archive in `/tmp` (`cd` + `zip -r`) and then **copy** it into
  `course/NN-<slug>/_files/<project>.zip`. Do not let `zip` write its output
  directly into a cloud-synced folder: a rename inside such a mount can fail
  with "Operation not permitted". Same for PNGs: write in `/tmp`, then `cp`.
  Verify with `unzip -l` that the archive holds only the intended files; stop
  with a clear error if not.

### 5. Image placeholders

Per placeholder, write a 1x1 transparent PNG (kebab-case, ASCII, `.png`) in
`/tmp` and `cp` it into `_files/`:

```bash
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" \
  | base64 -d > /tmp/<name>.png
cp /tmp/<name>.png "course/NN-<slug>/_files/<name>.png"
```

### 6. Write the markdown pages

Student-facing register of `docs/style.md`. Mirror the worked-example modules,
**not** the collega-facing lesson plan.

**Frontmatter.** Per [`docs/frontmatter.md`](../../../docs/frontmatter.md).
Regular pages:

```
---
title: <Title>
canvas_type: page
---
```

Homework becomes a Canvas assignment (`canvas_type: assignment` with
`points_possible`, `submission_types`, `due_at`, `published` — mirror the
worked example's homework page, or ask the author for the values once).

**Page-title emoji.** Only where `docs/style.md` or `course-context.md`
prescribes them (e.g. per page role). No emoji elsewhere.

**Voice.** The student-facing rules of `docs/style.md`: address form, sentence
length, language level, punctuation, no AI-tells, no trailing summaries. Code
blocks tagged, comments in the course's comment language.

**Terminology.** If the course has a canonical glossary, use its base terms
for concepts. The first time a term with synonyms comes up, either name its
listed synonyms once or use the base term alone. Do not standardise on a
synonym, and do not invent synonyms of your own.

**Cross-links.** Within module: `[<label>](./0X-<slug>.md)`. To earlier
modules: `[<label>](../NN-<module>/0X-<slug>.md)`. Downloads:
`[<name>.zip](./_files/<name>.zip)`.

**Images.** Embed where they belong. Add one HTML-comment TODO block at the
bottom of each page that has images, listing each placeholder and what it must
show.

**Page roles.** Follow the module conventions in `course-context.md` and the
worked examples. Defaults:

- **Overview page**: short intro (2–4 sentences), what students need, what the
  lesson covers. Mention tokens or words students will *see* but need not
  master yet only when the lesson actually shows them; list those concrete
  items, do not write a generic "we go deeper later" section.
- **Content pages**: one topic per page. Worked examples; the plan's teaching
  method (prediction exercises, practice instructions) where it uses one.
- **Reference-card pages**: one per card the plan flags, right after its
  introducing content page, laid out per the course's card conventions.
- **Summary page**: self-contained study material. Cover every new concept of
  the lesson in its own right, with a short commented example where it helps.
  Repeating the content pages is intended: this is the revision text. Bold
  lead-in per concept, then prose. No new material beyond the lesson.
- **Glossary page** (only if the course generates one): create the file at the
  right numbered prefix with only the frontmatter header (the title from the
  glossary config, `canvas_type: page`) and an empty body; step 7 fills it. If
  the lesson introduces a term that is not yet in the canonical glossary file,
  add it there first (fields per that file's header; ask the author if unsure
  a term belongs).
- **Homework page** (if any): what to make, how to start, rules, how to hand
  in. Mirror the worked example's homework page.

### 7. Generate the glossary page

Only if the course has a canonical glossary. The page body is generated, never
hand-written. Once the stub from step 6 exists:

```bash
npx course build-glossary -m <NN-slug>
```

If the module folder name does not carry the lesson number in the form the
glossary config expects, set `lesson: N` in the stub's frontmatter first. Then
run `npx course build-glossary --check`; it must report the page up to date.
If it flags a missing term, you skipped adding it to the glossary file above:
add it and re-run.

### 8. `_category_.json`

```json
{
  "label": "<Label>",
  "position": NN
}
```

One trailing newline.

### 9. Style pass

Check every page against `docs/style.md` (student-facing) and
`course-context.md`: headings case, punctuation, register, page-title emoji
only where allowed, canonical glossary terms with no invented synonyms, the
glossary page generated by `build-glossary` (`--check` reports it up to date),
correct frontmatter per page type, no loose source files next to the archives,
internal links pointing to the right numbered files.

### 10. Report (in chat)

Module path; generated files grouped (pages, archives, PNGs,
`_category_.json`); table of image TODOs. Suggest as separate steps, do not
run: `/proofread` on the module; `npx docusaurus start` to check sidebar and
links; unzip one archive in the target IDE to run it. If you gathered
conventions `course-context.md` was missing, offer to save them there.

## Rules

- Target the student-facing register of `course/`, not the lesson plan's.
- Never change the source lesson or other existing modules under `course/`.
- No commits, pushes, or staging.
- Code archives contain only the intended source files — no IDE metadata,
  build files, or compiled artifacts.
- Only the transparent PNG placeholder for images, never generated artwork.
- One lesson per call. Invent no content beyond the plan; if a needed image is
  unclear, write an honest TODO asking the author.

$ARGUMENTS
