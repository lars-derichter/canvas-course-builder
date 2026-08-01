# Tests

The project uses the built-in [Node.js test runner](https://nodejs.org/api/test.html)
(`node:test` + `node:assert`) — no extra dependencies required.

## Running tests

```bash
npm test
```

## Test structure

Tests live in `test/` and mirror the layout of the source directories they
cover:

```
test/
├── canvas/
│   ├── client.test.js            # HTTP client: pagination, rate limiting, retry
│   └── files.test.js             # MIME type detection
├── cli/
│   ├── merge-items.test.js       # Merging sibling items into one file
│   ├── naming.test.js            # Folder/file/item name derivation and relative paths
│   ├── prune-items.test.js       # Detecting modules and items deleted locally
│   ├── pull-helpers.test.js      # Pull identifier maps, local-modification checks, strategies
│   ├── push-helpers.test.js      # Push file resolver and page/assignment strategies
│   ├── renumber.test.js          # Renumbering and reordering numbered entries
│   └── split-item.test.js        # Splitting a multi-section item into separate files
├── convert/
│   ├── course-scanner.test.js    # Course directory scanning, position extraction, title derivation
│   ├── frontmatter.test.js       # YAML frontmatter parsing and serialization
│   ├── html-to-markdown.test.js  # Canvas HTML → markdown conversion and alerts
│   ├── link-resolver.test.js     # Bidirectional link and file map resolution
│   └── markdown-to-html.test.js  # Markdown → Canvas HTML conversion and alerts
├── export/
│   ├── preprocess.test.js        # Alerts→divs, heading shift, image/link rewriting
│   ├── assemble.test.js          # Combined-document assembly, heading regimes, anchors
│   └── toc.test.js               # TOC generation, parsing, and path validation
├── plugins/
│   ├── remark-external-url.test.js  # External URL frontmatter → link transform
│   ├── remark-file-item.test.js     # File-item frontmatter → link transform
│   └── remark-gfm-alerts.test.js    # GFM blockquote alert syntax transform
└── vscode/
    └── extension.test.js         # VS Code extension command wiring vs. package.json
```

Coverage spans the conversion layer (`lib/convert/`), the export layer
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
