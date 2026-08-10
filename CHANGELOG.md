# Changelog

## Unreleased

- **Neutral defaults for the look.** A new `generic` export style
  (Helvetica/Arial, GitHub's alert palette, a "Built with Canvas Course
  Builder" watermark) and a `github` theme are now the shipped defaults. The
  Thomas More style and colours remain as `thomas-more`, selectable but no
  longer default.
- **`theme` and `export.style` in `course.config.yml`.** Colour and
  PDF/DOCX layout became two independently selectable axes; `--style` on
  `npx course export` overrides the layout for one run.
- **One source of truth for colour.** A theme file in `src/css/themes/`
  now feeds the preview site, Canvas HTML, the alert icons, and PDF exports.
  DOCX still carries its colours in `reference.docx`.
- **`templates/export/` moved to `export-styles/`**, split into one folder
  per style plus the shared pandoc pipeline files. Overrides in
  `sources/export-style/` keep working unchanged.

## 1.0.0 — 2026-08-10

Initial public release: markdown course authoring with Docusaurus preview,
Canvas LMS push/pull/status sync, PDF and DOCX export with customizable
styling, a VS Code extension, bundled AI skills for lesson design and
quality checks, and a template-update mechanism that protects your course
content.
