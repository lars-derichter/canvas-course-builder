---
name: edit-export-style
description: Make a plain-language change to the course export style — heading colour, fonts, margins, alert colours, paper size — by editing sources/export-style/template.typ (PDF) and/or reference.docx (DOCX), then regenerating the sample to show the result. Forks the shipped defaults on first use. Use for "edit export style", "exportstijl aanpassen", "koppen donkerblauw", "grotere marges in de PDF", "ander lettertype voor de export", "change the export font".
---

# Edit export style

Apply a small, plain-language change to how `npx course export` looks, and show
the result. This is the iterate-in-place companion to
[`create-export-style`](../create-export-style/SKILL.md); use that skill when
deriving a whole new look from a reference document.

## Input

`$ARGUMENTS` is the requested change in plain language, e.g. "koppen
donkerblauw", "font Georgia", "grotere marges", "alerts platter". If empty, ask
what to change. If the request is really "build a style from this document/site",
hand off to `create-export-style` instead.

## Procedure

1. **Fork the defaults if needed.** The style lives in `sources/export-style/`.
   If a file you need to edit is not there yet, copy it from the shipped
   default first (never edit `templates/export/` — it is overwritten on
   upstream updates):
   - `cp templates/export/template.typ sources/export-style/template.typ`
   - `cp templates/export/reference.docx sources/export-style/reference.docx`

2. **Locate the change** in the pipeline (see
   [`docs/export-styling.md`](../../../docs/export-styling.md) if unsure):

   | Request | PDF — `template.typ` | DOCX — `reference.docx` |
   | --- | --- | --- |
   | Heading colour/font | `show heading: set text(fill:/font:)` | `Heading1/2/3` in `word/styles.xml` |
   | Body font/size | `font:`/`fontsize:` in `conf()` | `Normal` + theme `<a:latin>` |
   | Link colour | `show link: set text(fill:)` | `Hyperlink` colour |
   | Margins / paper | `margin:`/`paper:` in `conf()` | `<w:pgMar>`/`<w:pgSz>` |
   | Alert colours | the `alert-colors` map | `AlertTitle` colour |

   Apply each **format-agnostic** change to **both** files so PDF and DOCX stay
   in sync. A PDF-only tweak (e.g. justification, page numbering) touches only
   `template.typ`.

3. **Edit the Typst template** directly with the Edit tool. Keep the
   `alert(...)`, `linkcard(...)`, `attachment(...)` helpers and the
   `alert-colors` map present — the Lua filter calls them by name.

4. **Edit the DOCX** by unzipping, editing its XML, and rezipping — never in
   Word, which would drop the custom styles:
   ```bash
   D="$SCRATCHPAD/refdocx"; rm -rf "$D"; mkdir -p "$D"
   unzip -oq sources/export-style/reference.docx -d "$D"
   # …Edit word/styles.xml and/or word/theme/theme1.xml…
   ( cd "$D" && zip -Xrq "$OLDPWD/sources/export-style/reference.docx" . )
   ```
   Font size is in half-points (`<w:sz w:val="28">` = 14pt); colour is
   `<w:color w:val="RRGGBB">` (no `#`). Leave `AlertTitle`, `AlertBody`,
   `LinkCard`, `LinkCardTitle`, and `Attachment` untouched unless the request
   is specifically about them.

5. **Regenerate and show:**
   ```bash
   npx course export --sample -f pdf
   ```
   Add `-f docx` when the change touched the DOCX. Surface the sample and
   confirm the change landed, then iterate on request.

## Guardrails

- Write only under `sources/export-style/`.
- Do not silently redesign — make the requested change and nothing more.
- If a request cannot be met cleanly by the pipeline, say so and offer the
  nearest achievable alternative rather than a fragile hack.
