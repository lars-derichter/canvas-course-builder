# Making the template yours

The template ships as a working example: a README about the tooling, English
student-facing labels, an English writing style guide, and a neutral look for
the preview site and the exports. Together they show what a fully configured
course looks like, but they are starting points, not requirements. This page
covers replacing each of them with your own README, language, branding, and
licence.

## The README

The `README.md` in your project root describes Canvas Course Builder, the
tooling — not your course. Replace it with the course README template:

```bash
cp templates/README-course-en.md README.md
```

Courses taught in Dutch want
[`templates/README-course-nl.md`](../templates/README-course-nl.md) instead; it
is the same template with its headings, prose and TODO comments in Dutch, and it
links to the same English guides under `docs/`.

Then work through the copy: change `Course name` to the name of your course,
write the course overview, fill in the module table, check that the licence line
matches [`course/LICENSE.md`](../course/LICENSE.md), and trim the "Useful links"
list to the guides your colleagues will actually need. Delete the tip at the top
when you are done. The TODO comments in the template mark the sections that need
writing.

`README.md` is protected during [upstream updates](updating-your-project.md), so
your version is never overwritten. `templates/` is not, by design: it holds
shipped defaults you copy out of, never edit in place. The same goes for the
style baselines below and for `export-styles/` and `src/css/themes/`.

## The course name

`course.config.yml` holds the name of the course. It titles the preview site and
its navbar, and heads the cover of a full-course PDF or Word export:

```yml
title: Programming Fundamentals
tagline: Bachelor 1, semester 2 # optional, sits above the title on covers
```

Leave `title` out and it falls back to the generic label for your course
language — "Course", "Cursus" — which is a nudge, not a name. Set it once.

The `tagline` is optional and does double duty: Docusaurus keeps it in the site
metadata, and it subtitles the cover of an export covering the whole course. A
module export gets the course name under its title instead, since the tagline
describes the course rather than the module.

Do not put the title in `docusaurus.config.js`. That file belongs to the tooling
project and is overwritten on [upstream updates](updating-your-project.md);
`course.config.yml` is protected, so a title set there sticks.

## Language

`course.config.yml` sets the language of every generated student-facing label:
alert titles ("Note"/"Info"), link and file cards, export labels, the glossary
heading, and the locale of the preview site.

```yml
language: nl   # built-in label sets: en, nl
```

The shipped default is `en`. Change it to `nl`, restart `npm start`, and the
preview site and all generated labels switch to Dutch. Individual labels can be
overridden under `labels:`; the file contains a commented block showing every
overridable key. `course.config.yml` is protected during
[upstream updates](updating-your-project.md), so your choice sticks.

Two other things track the language you write in:

- **The writing style guide** ([writing-style.md](../context/writing-style.md))
  ships as the English baseline, usable as it stands. Make it yours early: the
  authoring skills follow whatever the style guide says. Two routes, and they
  combine:
  - Run `/style-init` with your AI assistant to replace it with a guide matching
    your own language, voice, and audience. It reads samples of your writing and
    interviews you about the rest.
  - Or copy one of the baselines below over `context/writing-style.md` for a
    ready guide with no interview, then edit it by hand or run `/style-init` on
    top of it.

  Each baseline is a complete guide, not a fill-in-the-blanks template. All four
  keep the same two registers, the page-title emoji and the callout set, and
  each is written in the language it prescribes.

  | Baseline                                                                  | Language                                                                                    |
  | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
  | [`templates/writing-style-en.md`](../templates/writing-style-en.md)       | English, UK spelling, title-case headings. Already installed as `context/writing-style.md`. |
  | [`templates/writing-style-en-us.md`](../templates/writing-style-en-us.md) | English, US spelling, title-case headings                                                   |
  | [`templates/writing-style-nl-be.md`](../templates/writing-style-nl-be.md) | Nederlands, Vlaamse variant                                                                 |
  | [`templates/writing-style-nl.md`](../templates/writing-style-nl.md)       | Nederlands, variant Nederland                                                               |

  Either way your version sticks: like `README.md`, `context/writing-style.md`
  is protected during upstream updates.

- **The writing skills read `writing-style.md` at runtime.** `/proofread`
  derives its checks from whatever the guide says, so it follows your rules as
  soon as you change them, in whatever language you write.

## Branding

Branding splits along two axes, both set in `course.config.yml`:

```yml
theme: github        # colour everywhere, plus the site's fonts
export:
  style: generic     # PDF and DOCX layout, fonts and cover
```

The shipped defaults are deliberately neutral. `thomas-more` is available for
both keys as a worked example of full institutional branding; set both to it for
the complete house style.

### Colour: the theme

A theme is a CSS file of custom properties, and it is the single source of truth
for colour. The preview site, the alert colours in Canvas pages, the alert icons
uploaded to Canvas, and PDF exports all read the same file — so a colour you
change in one place changes everywhere.

Built-in themes live in [`src/css/themes/`](../src/css/themes/):

| Theme                                                  | Look                                                                                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| [`github.css`](../src/css/themes/github.css)           | The default. GitHub's light-mode palette, near-black headings, a blue accent, and a system font stack with no web-font request. |
| [`thomas-more.css`](../src/css/themes/thomas-more.css) | Orange accent, navy secondary, Nunito and Inconsolata from Google Fonts, and the pastel alert set.                              |

The tokens, all prefixed `--ccb-`:

| Token                                                                                      | What it colours                                                                                                                         |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `--ccb-accent`, and `-dark` / `-darker` / `-darkest` / `-light` / `-lighter` / `-lightest` | Links, active navigation, and the ramp Docusaurus derives its UI from                                                                   |
| `--ccb-secondary`                                                                          | Bold text, the site footer, file cards — the "weight" colour                                                                            |
| `--ccb-fg`, `--ccb-fg-muted`                                                               | Body text and secondary text                                                                                                            |
| `--ccb-border`                                                                             | Rules, table lines, card outlines                                                                                                       |
| `--ccb-surface`, `--ccb-surface-subtle`, `--ccb-surface-sunken`                            | Page, sidebar and code-block backgrounds                                                                                                |
| `--ccb-code-bg`                                                                            | Inline code                                                                                                                             |
| `--ccb-heading`, `--ccb-link`                                                              | Headings and links                                                                                                                      |
| `--ccb-alert-<kind>-fg` / `-bg`                                                            | The six alert kinds: `note`, `tip`, `important`, `warning`, `caution`, `check`. `fg` is the left rule and the title, `bg` fills the box |
| `--ccb-font-sans`, `--ccb-font-mono`, and the size / weight / line-height tokens           | The preview site's typography. Export typography belongs to the export style, not here                                                  |

To make a theme of your own, copy one into `sources/` — which is protected
during upstream updates — and point `theme:` at the path:

```bash
cp src/css/themes/github.css sources/my-theme.css
```

```yml
theme: sources/my-theme.css
```

Then edit the colours. Restart `npm start` to see the site change; exports and
Canvas pages pick it up on the next run.

> [!NOTE]
>
> One surface does not follow the theme: **Word output**. Colours in DOCX
> exports are baked into the export style's `reference.docx` and cannot be
> injected. Use `/export-style-edit` to recolour it to match.

[`src/css/custom.css`](../src/css/custom.css) holds no colours of its own — it
maps the `--ccb-*` tokens onto Docusaurus's `--ifm-*` variables and styles the
components. The site title and navbar label come from `title` in
`course.config.yml`, above.

### Layout: the export style

An export style decides how a PDF or Word document is laid out: typography,
margins, the cover, and any fonts it ships. Built-in styles live in
[`export-styles/`](../export-styles/):

| Style         | Look                                                                                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generic`     | The default. Helvetica/Arial, near-black headings, A4 with 2.5 cm margins, and a "Built with Canvas Course Builder" watermark on the cover.                                                 |
| `thomas-more` | Century Gothic headings where the machine has that font, Nunito bundled as the fallback, and the Thomas More logo. The logo belongs to its owner — see [THIRD-PARTY.md](../THIRD-PARTY.md). |

`npx course export --style thomas-more` overrides the config for one run.

The comfortable route to a style of your own is AI-assisted:

- `/export-style-create` derives a complete style from a reference you give it:
  a Word template, a PDF, a website URL, or a CSS file.
- `/export-style-edit` makes plain-language tweaks ("headings dark blue",
  "bigger margins") to an existing style.

By hand, copy the closest style out and point `export.style` at it:

```bash
cp -r export-styles/generic sources/my-style
```

The pieces inside are:

- `template.typ` styles PDF exports (Typst).
- `reference.docx` styles DOCX exports (Word styles).
- `logo.png` is the cover logo. The filename is fixed; put your own logo there
  under that name, or delete it for a logo-less cover. The shipped watermark is
  generated from `logo.typ` next to it, which carries the command to regenerate
  it.
- `fonts/` holds fonts to embed in PDF exports; without it, exports fall back to
  fonts installed on your machine. Only put a font here if its licence allows
  you to redistribute it, and note it in `THIRD-PARTY.md`.

To change one file without forking a whole style, drop it in
`sources/export-style/` — that path wins per file over whatever style is
selected, and `sources/` is protected during upstream updates.

See [export-styling.md](export-styling.md) for the full export pipeline.

## Licence

The licences also follow the tooling/content split:

- The **tooling** is [MIT licensed](../LICENSE). Leave `LICENSE` where it is:
  MIT asks that the copyright notice stays with the code, so it has to travel
  along if you publish your course repository.
- Your **course content** defaults to CC BY-NC-SA 4.0, declared in
  [`course/LICENSE.md`](../course/LICENSE.md). That file is yours: edit it to
  change or replace the licence for your own material, and update the licence
  section of your README to match.

## Files that belong to the tooling project

"Use this template" copies the whole repository, so your course starts out with
a handful of files that govern the upstream project rather than your course:

- [`CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md) and
  [`SECURITY.md`](../SECURITY.md)
- `.github/ISSUE_TEMPLATE/` and `.github/PULL_REQUEST_TEMPLATE.md`
- [`CONTRIBUTING.md`](../CONTRIBUTING.md), which forwards to
  [contributing.md](contributing.md)
- [`CHANGELOG.md`](../CHANGELOG.md), the tooling's changelog

Each one says up front which project it applies to, so leaving them in place
costs nothing and keeps the bug-report route to the upstream project open for
whoever works on your course with you. Most people leave them.

If you would rather not carry them, deleting the files is only half the job:
[upstream updates](updating-your-project.md) deliver them again. Delete them,
then list them in `update-from-upstream.conf`:

```ini
protected_dirs = course evaluations sources .github/ISSUE_TEMPLATE
protected_files = README.md AGENTS.md CLAUDE.md context/writing-style.md context/course-context.md update-from-upstream.conf course.config.yml CODE_OF_CONDUCT.md SECURITY.md .github/PULL_REQUEST_TEMPLATE.md
```

Protection restores a path from your own history, and a protected path that is
absent from your history gets removed instead — which is exactly what you want
here. Commit the deletions first, so "absent from your history" is true by the
time the next update runs.

> [!WARNING]
>
> Protect the individual paths, not `.github` as a whole. That directory also
> holds the CI workflow and, if you publish with [GitHub Pages](hosting.md), the
> deploy workflow; protecting it wholesale would freeze both at the version you
> happen to have today.

`LICENSE` and `THIRD-PARTY.md` are a different case: they cover code that stays
in your repository, so leave them alone.
