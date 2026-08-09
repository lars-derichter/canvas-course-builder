---
name: export-style-edit
description: Make a plain-language change to the course export style — heading colour, fonts, margins, alert colours, paper size — by editing sources/export-style/template.typ (PDF) and/or reference.docx (DOCX), then regenerating the sample to show the result. Forks the shipped defaults on first use. Use for "edit export style", "exportstijl aanpassen", "koppen donkerblauw", "ander lettertype voor de export".
---

# Export style edit

Apply a small, plain-language change to how `npx course export` looks, and
show the result. The iterate-in-place companion to
[`export-style-create`](../export-style-create/SKILL.md) — use that skill
to derive a whole new look from a reference.

## Input

`$ARGUMENTS` is the requested change in plain language ("koppen
donkerblauw", "font Georgia", "grotere marges"). If empty, ask what to
change. If the request is really "build a style from this document/site",
hand off to `export-style-create`.

## Steps

1. **Fork the defaults if needed.** The style lives in
   `sources/export-style/`; if a file you need is not there yet, copy it
   from `templates/export/` first (never edit `templates/export/` itself —
   shipped defaults, overwritten on upstream updates).

2. **Locate the change** (see
   [`docs/export-styling.md`](../../../docs/export-styling.md) if unsure):

   | Request | PDF — `template.typ` | DOCX — `reference.docx` |
   | --- | --- | --- |
   | Heading colour/font | `show heading: set text(fill:/font:)` | `Heading1/2/3` in `word/styles.xml` |
   | Body font/size | `font:`/`fontsize:` in `conf()` | `Normal` + theme `<a:latin>` |
   | Link colour | `show link: set text(fill:)` | `Hyperlink` colour |
   | Margins / paper | `margin:`/`paper:` in `conf()` | `<w:pgMar>`/`<w:pgSz>` |
   | Alert colours | the `alert-colors` map | the per-kind `AlertTitle<Kind>`/`AlertBody<Kind>` styles |
   | Cover logo | `sources/export-style/tm-logo.png` (PDF only) | — |
   | Heading numbering | `sectionnumbering:` in `conf()` | the `numId 900` numbering + heading `numPr` |

   Apply each format-agnostic change to **both** files; a PDF-only tweak
   (justification, page numbering) touches only `template.typ`.

3. **Edit the Typst template** with the Edit tool. Keep the `alert(...)`,
   `linkcard(...)`, `attachment(...)` helpers and the `alert-colors` map —
   the Lua filter calls them by name.

4. **Edit the DOCX** by editing its XML, never in Word (Word drops the
   custom styles):
   ```bash
   D=<fresh dir in the session scratchpad>
   unzip -oq sources/export-style/reference.docx -d "$D"
   # Edit word/styles.xml and/or word/theme/theme1.xml, then:
   ( cd "$D" && zip -Xrq "<absolute repo path>/sources/export-style/reference.docx" . )
   ```
   Font size is in half-points (`<w:sz w:val="28">` = 14pt); colour is
   `<w:color w:val="RRGGBB">` (no `#`). Leave the per-kind
   `AlertTitle<Kind>`/`AlertBody<Kind>` pairs, `LinkCard`, `LinkCardTitle`,
   `Attachment`, and `SourceCode` untouched unless the request is
   specifically about them — the Lua filter references them by name.

5. **Regenerate and show**: `npx course export --sample -f pdf` (add
   `-f docx` when the change touched the DOCX). Confirm the change landed,
   then iterate on request.

## Rules

- Write only under `sources/export-style/`.
- Do not silently redesign — make the requested change and nothing more.
- If a request cannot be met cleanly by the pipeline, say so and offer the
  nearest achievable alternative rather than a fragile hack.

$ARGUMENTS
