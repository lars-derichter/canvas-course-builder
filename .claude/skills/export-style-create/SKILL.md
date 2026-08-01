---
name: export-style-create
description: Derive a reusable PDF/DOCX export style from a reference — a Word document, a PDF, a website URL, or a CSS file — and write it to sources/export-style/ so course exports match that look. Phase A proposes a style spec and stops for approval; Phase B writes template.typ + reference.docx and regenerates the sample. Use for "create export style", "exportstijl maken", "maak een huisstijl voor de export", "match this Word template".
---

# Export style create

Turn a reference document, website, or stylesheet into a custom export style
for `npx course export`. The style lives in `sources/export-style/`
(protected from upstream updates) and overrides the shipped defaults in
`templates/export/`.

## Input

`$ARGUMENTS` may hold a path to a `.docx` or `.pdf`, a website URL, or a
`.css` file. If empty, use the file open in the IDE when it is one of those;
otherwise ask which reference to derive the style from. Stop with one
sentence if the source is not a document, URL, or stylesheet.

## Steps

### Phase A — Inspect and propose (writes nothing)

1. **Read first**:
   [`docs/export-styling.md`](../../../docs/export-styling.md) — what
   `template.typ` (PDF via Typst) and `reference.docx` (DOCX via Word
   styles) each control, and how `--var` variables map into the template;
   [`templates/export/template.typ`](../../../templates/export/template.typ)
   — the default you will fork; note the `conf(...)` signature (font,
   codefont, fontsize, margin, paper) and the `alert-colors` map. The
   custom paragraph styles inside `templates/export/reference.docx`
   (`AlertTitle`, `AlertBody`, `LinkCard`, `LinkCardTitle`, `Attachment`)
   are mapped by the Lua filter and **must survive** any edit to the DOCX.

2. **Extract the visual decisions** from the reference:
   - `.docx` — unzip into a fresh directory in the session scratchpad; read
     `word/styles.xml` (font, size, colour of `Title`, `Heading1/2/3`,
     `Normal`), `word/theme/theme1.xml` (theme fonts, colours), and the
     `<w:sectPr>` in `word/document.xml` (margins).
   - `.pdf` — read it with the Read tool (it renders pages); judge fonts,
     heading treatment, body size, colours, and margins by eye.
   - Website URL — `WebFetch` the page and its stylesheet; extract
     `font-family` for body and headings, base `font-size`, link and
     heading colours, content `max-width`/margins, accent colour.
   - `.css` — parse the same properties directly.

3. **Present the style spec** as a table, one row per decision with where
   it applies:

   | Decision | Value | PDF (template.typ) | DOCX (reference.docx) |
   | --- | --- | --- | --- |
   | Body font | … | `font:` in `conf()` | `Normal` + theme `<a:latin>` |
   | Heading font | … | `show heading` rule | `Heading 1/2/3` |
   | Heading colour | … | `show heading … set text(fill:)` | `Heading 1/2/3` colour |
   | Body size | … | `fontsize:` in `conf()` | `Normal` size |
   | Link/accent colour | … | `show link` rule | `Hyperlink` colour |
   | Margins | … | `margin:` in `conf()` | `<w:pgMar>` |
   | Paper | … | `paper:` in `conf()` | `<w:pgSz>` |

   Say plainly what the reference asks for that the pipeline cannot do
   cleanly (per-heading background bands, running chapter headers, …).

   Stop. Wait for explicit approval before starting Phase B.

### Phase B — Write and regenerate (only after approval)

4. **Fork the defaults** into `sources/export-style/` (create the folder if
   absent):
   `cp templates/export/template.typ templates/export/reference.docx sources/export-style/`

5. **Edit `sources/export-style/template.typ`** (PDF): change the `conf()`
   defaults to the spec and add `show` rules for what the signature does
   not cover:
   ```typst
   show heading: set text(font: ("Your Heading Font",), fill: rgb("#1a3c6e"))
   show link: set text(fill: rgb("#1a5fb4"))
   ```
   Keep the `alert(...)`, `linkcard(...)`, `attachment(...)` helpers and
   the `alert-colors` map — the Lua filter calls them by name.

6. **Edit `sources/export-style/reference.docx`** by editing its XML, never
   in Word (Word drops the custom styles):
   ```bash
   D=<fresh dir in the session scratchpad>
   unzip -oq sources/export-style/reference.docx -d "$D"
   # Edit word/styles.xml and/or word/theme/theme1.xml, then:
   ( cd "$D" && zip -Xrq "<absolute repo path>/sources/export-style/reference.docx" . )
   ```
   In `word/styles.xml`: `Normal`, `Heading1/2/3`, `Hyperlink` — font via
   `<w:rFonts>`, size via `<w:sz>` in half-points (`28` = 14pt), colour via
   `<w:color w:val="RRGGBB">` (no `#`); theme fonts via `<a:latin typeface>`
   in `word/theme/theme1.xml`. Leave `AlertTitle`, `AlertBody`, `LinkCard`,
   `LinkCardTitle`, and `Attachment` untouched.

7. **Regenerate and show the sample**: `npx course export --sample -f pdf`
   and `-f docx`. Surface `exports/style-sample.pdf` (and the DOCX), point
   out any DOCX degradation that applies (see `docs/export-styling.md`),
   and iterate on request. Small later tweaks are the job of
   [`export-style-edit`](../export-style-edit/SKILL.md).

## Rules

- Write only under `sources/export-style/`. Never edit `templates/export/`
  (shipped defaults, overwritten on upstream updates).
- Keep PDF and DOCX in sync: apply each format-agnostic decision (fonts,
  colours, margins) to both files.
- If the reference uses a licensed font the system lacks, say so — Typst
  uses installed system fonts; suggest `typst fonts` to list them and a
  close free alternative.

$ARGUMENTS
