# Changelog

## Unreleased

- **The course context follows backward design.** `context/course-context.md`
  gained a Learning goals section and an Assessment section, and its sections
  now run in the order a course is actually designed: what students should be
  able to do, how you will know they can, then how they get there. Learning
  goals used to be one clause inside the Pedagogy comment, and assessment was
  nowhere, which is why `/evaluation-design` asked you for exam format,
  weighting and allowed aids on every single run. Both new sections ship as
  `TODO` like the rest, so nothing breaks if you leave them empty, and
  `/course-context-init` now interviews you about them.
- **Courses name themselves.** `course.config.yml` gains `title` and `tagline`.
  The title heads the preview site and its navbar, and titles any PDF or DOCX
  export covering the whole course, filename included
  (`exports/programming-fundamentals.pdf` rather than `exports/course.pdf`); a
  module export now prints the course name under the module's title on the
  cover. The tagline subtitles those same covers. The point is where the setting
  lives: `docusaurus.config.js` belongs to the tooling project and is
  overwritten on update, `course.config.yml` is protected. Existing projects
  need two small steps — see
  [The course title moved](docs/updating-your-project.md#the-course-title-moved-into-courseconfigyml-one-off).
- **The style guide and course context moved to `context/`.** `docs/style.md`
  and `docs/course-context.md` are not documentation: they are per-course files
  you own and AI assistants read, and everything else in `docs/` belongs to the
  tooling project and gets overwritten on update. They now live in `context/`,
  which makes that split visible in the file tree, and the style guide is called
  `context/writing-style.md` so that nothing mistakes it for an export style.
  Existing projects need a one-off manual move, because a protected file that
  changes location is the one case the update script cannot prune safely — see
  [Moving to `context/`](docs/updating-your-project.md#moving-to-context-one-off).
- **A Dutch course README template.** `templates/README-course-nl.md` joins the
  English one, so a Dutch-language course no longer starts by translating its
  own README. The English template moved to `templates/README-course-en.md` to
  match the language suffix every other per-language template carries; the old
  path is pruned automatically on your next update.
- **A US-English style baseline.** `templates/writing-style-en-us.md` joins the
  three existing baselines. The English one prescribes UK spelling, which meant
  a US instructor had to edit the guide before it was usable and any AI
  assistant reading it kept writing "colour". The new file is the same guide
  with US spelling, the serial comma mandated rather than left to the author,
  and a US grade level in place of CEFR B2. Nothing changes for existing
  projects: the shipped `context/writing-style.md` is still the UK-spelling
  baseline, and the two files point at each other.
- **Issue forms, a pull-request template, a security policy and a code of
  conduct.** Reporting a bug on the upstream project now walks you through the
  fields that make a report useful, and security problems have a private channel
  instead of a public issue. Because GitHub copies the whole template, these
  files also land in your course repository; each says which project it applies
  to, and
  [Files that belong to the tooling project](docs/customization.md#files-that-belong-to-the-tooling-project)
  explains how to drop them if you would rather not carry them.
- **Prettier and ESLint.** `npm run format` formats the repo and `npm run lint`
  reports defects; both are checked in CI. Formatting now includes markdown, so
  `npm run format` will also rewrap your own course prose at 80 characters — see
  [Keeping your course files tidy](docs/user-guide.md#keeping-your-course-files-tidy)
  for why that is usually what you want, and how to opt out if it is not.
- **The tooling moved from the Unlicense to the MIT licence.** Course content
  keeps its own licence in `course/LICENSE.md`. MIT asks that the copyright
  notice stays with the code, so leave `LICENSE` in place if you publish your
  course repository.
- **No more bundled Century Gothic.** The `thomas-more` style still asks for it
  first, but the font files are gone: on Windows, Office already installs the
  typeface where Typst finds it, and on macOS the exporter now looks inside the
  Office application bundles, which is where Office hides its fonts. Where
  Office is absent, headings fall back to Nunito, which ships with the style
  under the SIL Open Font License and matches the `thomas-more` theme on the
  web.
- **Attribution for the alert icons.** They are GitHub Octicons (MIT) and one
  Google Material Symbol (Apache 2.0); both licences now ship in
  `src/svg-icons/` and are recorded in `THIRD-PARTY.md`.
- **Neutral defaults for the look.** A new `generic` export style
  (Helvetica/Arial, GitHub's alert palette, a "Built with Canvas Course Builder"
  watermark) and a `github` theme are now the shipped defaults. The Thomas More
  style and colours remain as `thomas-more`, selectable but no longer default.
- **`theme` and `export.style` in `course.config.yml`.** Colour and PDF/DOCX
  layout became two independently selectable axes; `--style` on
  `npx course export` overrides the layout for one run.
- **One source of truth for colour.** A theme file in `src/css/themes/` now
  feeds the preview site, Canvas HTML, the alert icons, and PDF exports. DOCX
  still carries its colours in `reference.docx`.
- **`templates/export/` moved to `export-styles/`**, split into one folder per
  style plus the shared pandoc pipeline files. Overrides in
  `sources/export-style/` keep working unchanged.

## 1.0.0 — 2026-08-10

Initial public release: markdown course authoring with Docusaurus preview,
Canvas LMS push/pull/status sync, PDF and DOCX export with customizable styling,
a VS Code extension, bundled AI skills for lesson design and quality checks, and
a template-update mechanism that protects your course content.
