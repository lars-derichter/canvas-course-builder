# Making the template yours

The template ships as a working example: a README about the tooling,
English student-facing labels, an English writing style guide, and an
export style that imitates the Thomas More course template. Together they
show what a fully configured course looks like, but they are starting
points, not requirements. This page covers replacing each of them with your
own README, language, branding, and licence.

## The README

The `README.md` in your project root describes Canvas Course Builder, the
tooling — not your course. Replace it with the course README template:

```bash
cp templates/README-course.md README.md
```

Then work through the copy: change `Course name` to the name of your
course, write the course overview, fill in the module table, check that the
licence line matches [`course/LICENSE.md`](../course/LICENSE.md), and trim
the "Useful links" list to the guides your colleagues will actually need.
Delete the tip at the top when you are done. The TODO comments in the
template mark the sections that need writing.

`README.md` is protected during [upstream updates](updating-your-project.md),
so your version is never overwritten. `templates/` is not, by design: it
holds shipped defaults you copy out of, never edit in place. The same goes
for the style baselines and export defaults below.

## Language

`course.config.yml` sets the language of every generated student-facing
label: alert titles ("Note"/"Info"), link and file cards, export labels,
the glossary heading, and the locale of the preview site.

```yml
language: nl   # built-in label sets: en, nl
```

The shipped default is `en`. Change it to `nl`, restart `npm start`, and
the preview site and all generated labels switch to Dutch. Individual
labels can be overridden under `labels:`; the file contains a commented
block showing every overridable key. `course.config.yml` is protected
during [upstream updates](updating-your-project.md), so your choice sticks.

Two other things track the language you write in:

- **The writing style guide** ([style.md](style.md)) ships as the English
  baseline, usable as it stands. Make it yours early: the authoring skills
  follow whatever the style guide says. Two routes, and they combine:
  - Run `/style-init` with your AI assistant to replace it with a guide
    matching your own language, voice, and audience. It reads samples of
    your writing and interviews you about the rest.
  - Or copy one of the baselines below over `docs/style.md` for a ready
    guide with no interview, then edit it by hand or run `/style-init` on
    top of it.

  Each baseline is a complete guide, not a fill-in-the-blanks template. All
  three keep the same two registers, the same proficiency levels, the
  page-title emoji and the callout set, and each is written in the language
  it prescribes.

  | Baseline | Language |
  | -------- | -------- |
  | [`templates/style-generic-en.md`](../templates/style-generic-en.md) | English, UK spelling, title-case headings. Already installed as `docs/style.md`. |
  | [`templates/style-generic-nl-be.md`](../templates/style-generic-nl-be.md) | Nederlands, Vlaamse variant |
  | [`templates/style-generic-nl.md`](../templates/style-generic-nl.md) | Nederlands, variant Nederland |

  Either way your version sticks: like `README.md`, `docs/style.md` is
  protected during upstream updates.

- **The writing skills read `style.md` at runtime.** `/proofread` derives
  its checks from whatever the guide says, so it follows your rules as soon
  as you change them, in whatever language you write.

## Branding

### The preview site

The local preview uses a Thomas More-inspired palette defined in
[`src/css/custom.css`](../src/css/custom.css). Change the colour variables
at the top of that file to restyle the site. The site title and navbar
label are set in [`docusaurus.config.js`](../docusaurus.config.js).

### PDF and DOCX exports

The shipped export style imitates the Thomas More course template, fonts
and logo included, as an example of a fully branded style. The bundled
fonts and logo belong to their owners (see
[THIRD-PARTY.md](../THIRD-PARTY.md)); replace them with your institution's
assets for your own course.

Exports resolve every style asset per file: anything you place in
`sources/export-style/` wins over the shipped default in
`templates/export/`, and `sources/` is protected during upstream updates.

The comfortable route is AI-assisted:

- `/export-style-create` derives a complete style from a reference you
  give it: a Word template, a PDF, a website URL, or a CSS file.
- `/export-style-edit` makes plain-language tweaks ("headings dark blue",
  "bigger margins") to an existing style.

By hand, the pieces are:

- `sources/export-style/template.typ` styles PDF exports (Typst).
- `sources/export-style/reference.docx` styles DOCX exports (Word styles).
- `sources/export-style/logo.png` is the cover logo. The filename is
  fixed; put your own logo there under that name, or delete the shipped
  one for a logo-less cover.
- `sources/export-style/fonts/` holds fonts to embed in PDF exports;
  without it, exports fall back to fonts installed on your machine.

See [export-styling.md](export-styling.md) for the full export pipeline.

## Licence

The licences also follow the tooling/content split:

- The **tooling** is public domain ([Unlicense](../LICENSE)); nothing to do
  there.
- Your **course content** defaults to CC BY-NC-SA 4.0, declared in
  [`course/LICENSE.md`](../course/LICENSE.md). That file is yours: edit it
  to change or replace the licence for your own material, and update the
  licence section of your README to match.
