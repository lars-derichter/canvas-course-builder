# Tests

The project uses the built-in [Node.js test runner](https://nodejs.org/api/test.html)
(`node:test` + `node:assert`) — no extra dependencies required.

## Running tests

```bash
npm test
```

## Test structure

Tests live in `test/` and mirror the layout of the source directories they
cover: `test/canvas/` for `lib/canvas/`, `test/cli/` for `cli/`,
`test/config/` for `lib/config/`, `test/convert/` for `lib/convert/`,
`test/export/` for `lib/export/`, `test/plugins/` for `src/plugins/`, and
`test/vscode/` for the bundled VS Code extension. Each file is named after
what it covers, e.g. `test/convert/course-scanner.test.js` or
`test/cli/push-helpers.test.js`.

Coverage spans the config layer (`lib/config/`), the conversion layer
(`lib/convert/`), the export layer
(`lib/export/`), the Canvas HTTP client and helpers (`lib/canvas/`), CLI command
helpers (`cli/`), the Docusaurus remark plugins (`src/plugins/`), and the local
VS Code extension (`.vscode/extensions/course-manager/`). Tests that exercise
filesystem behaviour (`course-scanner`, `merge-items`, `split-item`, `renumber`,
`pull-helpers`) create a temporary directory with fixture files and clean it up
afterwards. The export tests stay CI-safe by never spawning pandoc or Typst —
`preflight` takes an injectable exec, and the rest operate on strings.

## Manual end-to-end checks

Some paths need the real pandoc/Typst toolchain (and, for the sidebar, VS Code),
so they are verified by hand rather than in the automated suite:

- `npx course export --sample -f pdf` and `-f docx` — the style sample renders.
- `npx course export --sample -f pdf --style thomas-more`, then the same with
  `theme: thomas-more` in `course.config.yml` — style and theme change the
  output independently.
- `npx course export -m 01-getting-started` — a module with alerts, an SVG file
  item, an external URL, and a subfolder renders as one document.
- The two-step TOC flow: `npx course export-toc`, delete some lines, then
  `npx course export --toc exports/toc.md`.
- `npx course export --flagged` after setting `export: true` on a few items.
- VS Code: multi-select several items in the sidebar and export them together.
- The `/export-style-create` and `/export-style-edit` skills: derive or tweak a
  style and confirm the regenerated sample reflects it.

## Writing new tests

- Create a `*.test.js` file in the matching `test/` subdirectory.
- Use `describe`/`it` from `node:test` and assertions from `node:assert/strict`.
- The test runner discovers all `test/**/*.test.js` files automatically.
