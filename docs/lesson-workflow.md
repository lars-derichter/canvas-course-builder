# Lesson workflow

Canvas Local includes a set of [Claude Code](claude-code.md) skills that take a
lesson from rough idea to published Canvas module. Using them is optional — you
can keep writing modules by hand — but together they form a complete authoring
flow:

```
idea/notes
   │  /design-lesson
   ▼
sources/lessons/lesson-NN.md          (full lesson plan, for you and colleagues)
   │  /summarize-lesson                │  /build-lesson-module
   ▼                                   ▼
sources/lesson-plans/                 course/NN-<slug>/
lesson-plan-NN.md                     (student-facing module)
(one-page class version)                 │  /proofread, npm start
                                         ▼
                                      npx course push
```

## The two registers

The workflow produces material for two audiences, defined in
[style.md](style.md):

- **Collega-facing** — the lesson plan and class version under `sources/`.
  Written for you and fellow teachers; never served by Docusaurus or synced to
  Canvas.
- **Student-facing** — the module under `course/`; served by Docusaurus and
  pushed to Canvas.

## Course context

All lesson skills read [course-context.md](course-context.md) first: your
course's pedagogy, learning-goal scheme, lesson-plan template, module page
roles, code-download conventions, glossary, and scope boundaries. Run
`/initialize-course-context` once to fill it in; the skills ask about (and
offer to record) anything it doesn't cover yet. The richer that file, the less
the skills need to ask.

## Steps

1. **Design** — `/design-lesson` turns notes, a "next logical lesson" request,
   or a Q&A conversation into a full lesson plan at
   `sources/lessons/lesson-NN.md`. It always proposes a design first — with
   pros and cons of your ideas and its own — and writes only after you
   approve.
2. **Class version** (optional) — `/summarize-lesson` distills the plan into a
   one-page teaching reminder at `sources/lesson-plans/lesson-plan-NN.md`.
3. **Build** — `/build-lesson-module` converts the plan into a student module
   under `course/`: overview, content pages, reference cards (if your course
   uses them), summary, glossary page, homework assignment, downloadable code
   archives, and placeholder images with TODO notes. Again design-first,
   write-after-approval.
4. **Check and publish** — `/proofread` the new pages, preview with
   `npm start`, then `npx course push`.

See [claude-code.md](claude-code.md) for what each skill does in detail.

## The glossary pipeline

If your course maintains a canonical glossary, per-module glossary pages are
*generated*, never hand-written:

- The canonical source is one YAML file, by default
  `sources/reference-materials/glossary.yml`:

  ```yaml
  # Optional; defaults shown. Lives in the glossary file itself so your
  # settings survive upstream updates.
  config:
    title: "📘 Glossary"            # forced page title
    page_pattern: "glossary\\.md$"  # which page files to (re)generate
    module_pattern: "^(\\d+)"       # folder regex that yields the lesson number
    intro: "This is the glossary as it stands after lesson {lesson}. ..."
    kinds: [concept, code, operator]
    code_kinds: [code, operator]    # kinds rendered as inline code
    headings:
      operators: Operators
      terms: Terms

  terms:
    - term: variable
      lesson: 1
      kind: concept
      synonyms: []
      definition: A named box that holds a value.
    - term: "&&"
      lesson: 2
      kind: operator
      synonyms: []
      definition: Logical and.
  ```

- `npx course build-glossary` rewrites every matching module page as the
  cumulative list of all terms up to that module's lesson number. The lesson
  number comes from a `lesson:` frontmatter key on the page, or else from
  `module_pattern` applied to the folder name (by default the module's numeric
  prefix).
- `npx course build-glossary --check` verifies the pages are up to date
  without writing — useful before a push.
- Existing frontmatter such as `canvas_id` is preserved, so regeneration is
  safe on already-synced pages.

New terms enter the YAML file when you design a lesson (`/design-lesson` adds
them) or build a module; the pages then follow from one command.

## Adopting the workflow mid-course

Nothing requires starting from scratch. Point `course-context.md` at your
existing modules as worked examples, put any existing lesson plans in
`sources/lessons/` (numbered `lesson-NN.md`), and the skills pick up your
conventions from there.
