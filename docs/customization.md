# Making the template yours

The template ships with worked-example defaults: Dutch student-facing
labels, a Flemish-Dutch writing style guide, and an export style that
imitates the Thomas More course template. They show what a fully configured
course looks like, but they are examples, not requirements. This page
covers swapping each of them for your own language, branding, and licence.

## Language

`course.config.yml` sets the language of every generated student-facing
label: alert titles ("Note"/"Info"), link and file cards, export labels,
the glossary heading, and the locale of the preview site.

```yml
language: en   # built-in label sets: en, nl
```

The shipped default is `nl` (Dutch). Change it to `en`, restart
`npm start`, and the preview site and all generated labels switch to
English. Individual labels can be overridden under `labels:`; the file
contains commented examples. `course.config.yml` is protected during
[upstream updates](updating-your-project.md), so your choice sticks.

Two other places carry language defaults:

- **The writing style guide** ([style.md](style.md)) ships filled in for a
  Flemish-Dutch web-development course, as a worked example. Run
  `/style-init` with your AI assistant to replace it with a guide matching
  your own language, voice, and audience. Do this early: the authoring
  skills follow whatever the style guide says.
- **Some skills are tuned to the example defaults.** `/proofread`, for
  instance, checks Dutch texts against the shipped style guide. After
  `/style-init`, the skills follow your rules instead.

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
- `sources/export-style/tm-logo.png` is the cover logo. The filename is
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
