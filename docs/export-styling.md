# Export Styling

`npx course export` turns course markdown into a printable PDF or an editable
Word document. This guide explains how the export pipeline is put together and
how to customise the look, either by hand or with the
[`/export-style-create`](#deriving-a-style-from-a-reference) and
`/export-style-edit` Claude skills.

For prerequisites and everyday usage, see the
[Export section of the User Guide](user-guide.md#exporting-to-pdf-or-docx).

## The pipeline

One export is a single [pandoc](https://pandoc.org/) run over one combined
markdown string that the exporter assembles from the selected items:

```
course/*.md ─▶ preprocess (alerts→divs, heading shift, link/image rewrite)
            ─▶ assemble  (title page, TOC, chapters, link cards, page breaks)
            ─▶ pandoc ──┬─▶ Typst  ─(template.typ)─▶  PDF
                        └─▶ Word   ─(reference.docx)─▶ DOCX
                     via filter.lua (maps the exporter's divs per format)
```

The same combined markdown feeds both formats. What differs is the final
renderer: PDF goes through [Typst](https://typst.app/) using `template.typ`,
DOCX through pandoc's Word writer using `reference.docx`. A single Lua filter
translates the exporter's fenced divs (alerts, link cards, attachments, page
breaks) into the right thing for each renderer.

## The four style files

The shipped defaults live in `templates/export/`. Your overrides live in
`sources/export-style/` — that folder is protected from upstream updates, so a
custom style survives `npx course update`. To override a file, drop a file of
the same name into `sources/export-style/`; the resolver prefers it over the
shipped default. A `--template` or `--reference-doc` CLI flag wins over both.

| File | Renderer | Controls |
| --- | --- | --- |
| `template.typ` | PDF (Typst) | Fonts, sizes, margins, colours, title page, TOC, alert/link-card/attachment styling, page-break behaviour. |
| `reference.docx` | DOCX (Word) | All Word paragraph and character styles: `Normal`, `Heading 1/2/3`, `Hyperlink`, and the custom `Alert Title/Body`, `Link Card`, `Link Card Title`, `Attachment` styles. |
| `defaults.yml` | both | Pandoc defaults shared by every export (TOC depth, section numbering). Layout defaults deliberately live in `template.typ` instead, so `--var` can override them. |
| `filter.lua` | both | Maps the exporter's `.alert`, `.link-card`, `.attachment`, and `.page-break` divs onto Typst function calls (PDF) or custom-style paragraphs (DOCX). Rarely needs editing. |

> [!IMPORTANT]
>
> The alert kinds and their Dutch titles appear in three places that must stay
> in sync: `ALERT_CONFIG` in `lib/convert/markdown-to-html.js`, the
> `alert-colors` map in `template.typ`, and `ALERT_TITLES` in `filter.lua`.
> Change a kind or colour in one, change it in all three.

## Overriding layout with `--var`

`--var key=value` passes a variable straight into the Typst template, so you can
tweak the PDF without editing any file:

```bash
npx course export -m 01-intro --var mainfont="Georgia" --var fontsize=12pt
npx course export -m 01-intro --var margin=2cm
```

Recognised variables mirror the `conf()` signature in `template.typ`:
`mainfont`, `codefont`, `fontsize`, `margin`, `papersize`. `--var` affects
**PDF only** — DOCX styling comes entirely from `reference.docx`.

To see which fonts Typst can actually use on this machine:

```bash
typst fonts
```

Typst renders with installed **system fonts**. The shipped template sticks to
widely available fonts; if you set `mainfont` to something you have not
installed, Typst falls back and the result will not match. Install the font, or
pick one `typst fonts` lists.

## Deriving a style from a reference

Two Claude skills automate the editing described above:

- **`/export-style-create`** takes a Word document, a PDF, a website URL, or a
  CSS file, works out the fonts, colours, spacing, and margins, proposes a style
  spec, and — after you approve — writes `template.typ` and `reference.docx`
  into `sources/export-style/` and regenerates the sample.
- **`/export-style-edit`** makes a plain-language change ("headings dark blue",
  "bigger margins", "font Georgia") to an existing style and regenerates the
  sample so you can see it.

Both edit the DOCX by unzipping it, editing its XML, and rezipping — never in
Word, which would drop the custom alert and link-card styles.

## Previewing a style

`--sample` renders a kitchen-sink document that exercises every element (all
alert kinds, code, tables, lists, a link card, an attachment, a page break):

```bash
npx course export --sample -f pdf
npx course export --sample -f docx
```

## DOCX degradations

DOCX is a lossy target next to the Typst PDF. These are known and accepted:

- **Table of contents** — Word writes the TOC as a field that shows empty until
  you update it: open the document, select all (Ctrl/Cmd-A), then press F9.
- **`--var` font/margin variables** affect the PDF only. Style the DOCX through
  `reference.docx`.
- **Alerts** keep their coloured border and Dutch title but have no icon.
- **Inline SVG** renders natively in the PDF. For DOCX, pandoc needs
  `rsvg-convert` (from librsvg, e.g. `brew install librsvg`) on the PATH to
  rasterise it; without it the image is dropped with a warning. SVG shown
  directly in Word also needs Word 2016 or newer. Use PNG for images that must
  appear in DOCX everywhere.

## Further reading

- [Pandoc manual — Templates](https://pandoc.org/MANUAL.html#templates)
- [Pandoc manual — Creating a PDF with Typst](https://pandoc.org/MANUAL.html#creating-a-pdf)
- [Typst — Tutorial](https://typst.app/docs/tutorial/) and
  [Reference](https://typst.app/docs/reference/)
- [Pandoc — Custom Styles in DOCX](https://pandoc.org/MANUAL.html#custom-styles)
