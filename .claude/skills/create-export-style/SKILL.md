---
name: create-export-style
description: Derive a reusable PDF/DOCX export style from a reference — a Word document, a PDF, a website URL, or a CSS file — and write it to sources/export-style/ so course exports match that look. Phase A proposes a style spec and stops for approval; Phase B writes template.typ + reference.docx and regenerates the sample. Use for "create export style", "exportstijl maken", "maak een huisstijl voor de export", "match this Word template", "style the PDF like this site".
---

# Create export style

Turn a reference document, website, or stylesheet into a custom export style
for `npx course export`. The style lives in `sources/export-style/` (which is
protected from upstream updates) and overrides the shipped defaults in
`templates/export/`. The skill runs in two phases: **Phase A** inspects the
source and proposes a style spec, then stops for approval; **Phase B** writes
the files and regenerates the sample. Never write files in Phase A.

## Input

`$ARGUMENTS` may hold a path to a `.docx` or `.pdf`, a website URL, or a `.css`
file. If empty and `ide_opened_file` is one of those, use it; otherwise ask
which reference to derive the style from. Stop with one sentence if the source
is not a document, URL, or stylesheet.

## Read before designing

- [`docs/export-styling.md`](../../../docs/export-styling.md) — the pipeline
  primer: what `template.typ` (PDF via Typst) and `reference.docx` (DOCX via
  Word styles) each control, and how `--var` variables map into the template.
- [`templates/export/template.typ`](../../../templates/export/template.typ) —
  the shipped default you will fork. Note the `conf(...)` signature (font,
  codefont, fontsize, margin, paper) and the `alert-colors` map.
- The custom paragraph styles inside `templates/export/reference.docx`
  (`AlertTitle`, `AlertBody`, `LinkCard`, `LinkCardTitle`, `Attachment`) — the
  Lua filter maps the exporter's divs onto these, so they **must survive** any
  edit to the DOCX.

## Phase A — inspect the source and propose a spec

Extract the visual decisions from the reference, then present them as a table.

- **`.docx`** — unzip it to the scratchpad and read `word/styles.xml`
  (font, size, colour of `Title`, `Heading1/2/3`, `Normal`) and
  `word/theme/theme1.xml` (theme fonts, colour scheme). Read the `<w:sectPr>`
  in `word/document.xml` for page margins.
- **`.pdf`** — read it with the Read tool (it renders pages) and judge the
  fonts, heading treatment, body size, colours, and margins by eye.
- **website URL** — `WebFetch` the page and its stylesheet; extract
  `font-family` for body and headings, base `font-size`, link colour, heading
  colours, content `max-width`/margins, and any accent colour.
- **`.css`** — parse the same properties directly.

Produce a **style spec** table with one row per decision and, for each, where
it will be applied:

| Decision | Value | PDF (template.typ) | DOCX (reference.docx) |
| --- | --- | --- | --- |
| Body font | … | `font:` in `conf()` | `Normal` + theme `<a:latin>` |
| Heading font | … | `show heading` rule | `Heading 1/2/3` |
| Heading colour | … | `show heading … set text(fill:)` | `Heading 1/2/3` colour |
| Body size | … | `fontsize:` in `conf()` | `Normal` size |
| Link/accent colour | … | `show link` rule | `Hyperlink` colour |
| Margins | … | `margin:` in `conf()` | `<w:pgMar>` |
| Paper | … | `paper:` in `conf()` | `<w:pgSz>` |

Note anything the reference asks for that the pipeline cannot do cleanly (e.g.
per-heading background bands, running headers with the chapter title) and say
so plainly. Then stop for approval. Do not write files.

## Phase B — write the style and regenerate the sample

1. **Fork the defaults.** Copy the two shipped files into
   `sources/export-style/` (create the folder if absent):
   - `cp templates/export/template.typ sources/export-style/template.typ`
   - `cp templates/export/reference.docx sources/export-style/reference.docx`

2. **Edit `sources/export-style/template.typ`** (PDF). Change the `conf()`
   defaults (`font`, `codefont`, `fontsize`, `margin`, `paper`) to the spec,
   and add `show` rules for anything the signature does not cover — heading
   colour and font, link colour:
   ```typst
   show heading: set text(font: ("Your Heading Font",), fill: rgb("#1a3c6e"))
   show link: set text(fill: rgb("#1a5fb4"))
   ```
   Keep the `alert(...)`, `linkcard(...)`, `attachment(...)`, and `alert-colors`
   definitions intact — the filter calls them by name.

3. **Edit `sources/export-style/reference.docx`** (DOCX) by editing its XML,
   never in Word (Word would drop the custom styles):
   ```bash
   D="$SCRATCHPAD/refdocx"; rm -rf "$D"; mkdir -p "$D"
   unzip -oq sources/export-style/reference.docx -d "$D"
   ```
   With the Edit tool, change `word/styles.xml` (`Normal`, `Heading1/2/3`,
   `Hyperlink` — font via `<w:rFonts>`, size via `<w:sz>` in half-points,
   colour via `<w:color w:val="RRGGBB">`) and `word/theme/theme1.xml` (theme
   `<a:latin typeface>`). **Leave `AlertTitle`, `AlertBody`, `LinkCard`,
   `LinkCardTitle`, and `Attachment` untouched.** Then rezip in place:
   ```bash
   ( cd "$D" && zip -Xrq "$OLDPWD/sources/export-style/reference.docx" . )
   ```

4. **Regenerate and show the sample:**
   ```bash
   npx course export --sample -f pdf
   npx course export --sample -f docx
   ```
   Surface `exports/style-sample.pdf` (and the DOCX) to the author. Point out
   any DOCX degradation that applies (see `docs/export-styling.md`).

5. **Iterate** on request; small tweaks are the job of
   [`edit-export-style`](../edit-export-style/SKILL.md).

## Guardrails

- Write only under `sources/export-style/`. Never edit `templates/export/`
  (those are the shipped defaults, overwritten on upstream updates).
- Keep PDF and DOCX in sync: apply each format-agnostic decision (fonts,
  colours, margins) to both `template.typ` and `reference.docx`.
- If the reference is a brand with a licensed font the system lacks, say so —
  Typst uses installed system fonts; suggest `typst fonts` to list them and a
  close free alternative.
