# Tests

The project uses the built-in [Node.js test runner](https://nodejs.org/api/test.html)
(`node:test` + `node:assert`) — no extra dependencies required.

## Running tests

```bash
npm test
```

## Test structure

Tests live in `test/` and mirror the layout of `lib/`:

```
test/
├── canvas/
│   └── files.test.js          # MIME type detection
└── convert/
    ├── frontmatter.test.js    # YAML frontmatter parsing and serialization
    ├── markdown-to-html.test.js  # Markdown → Canvas HTML conversion and alerts
    ├── html-to-markdown.test.js  # Canvas HTML → markdown conversion and alerts
    ├── link-resolver.test.js     # Bidirectional link and file map resolution
    └── course-scanner.test.js    # Course directory scanning, position extraction, title derivation
```

Tests focus on the pure, deterministic functions in the conversion layer. The
Canvas API layer (`lib/canvas/`) is mostly thin HTTP wrappers, so only the
exported utility functions (like `detectContentType`) are unit-tested.
`course-scanner.test.js` creates a temporary directory with fixture files to
test the full directory scanning pipeline.

## Writing new tests

- Create a `*.test.js` file in the matching `test/` subdirectory.
- Use `describe`/`it` from `node:test` and assertions from `node:assert/strict`.
- The test runner discovers all `test/**/*.test.js` files automatically.
