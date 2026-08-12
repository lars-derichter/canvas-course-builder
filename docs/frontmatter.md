# Frontmatter Reference

Every markdown file in `course/` uses YAML frontmatter to define its Canvas type
and metadata.

## Common Fields

| Field         | Type          | Description                                                                                                                               |
| ------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `title`       | string        | Display title on Canvas. Auto-generated from filename if omitted.                                                                         |
| `canvas_type` | string        | One of `page`, `assignment`, `external_url`, `file`. Defaults to `page`.                                                                  |
| `canvas_id`   | string/number | Canvas resource ID. Written automatically after first push — do not set manually.                                                         |
| `export`      | boolean       | Set `true` to include this item in `npx course export --flagged`. See [Exporting to PDF or DOCX](user-guide.md#exporting-to-pdf-or-docx). |

## Page

```yaml
---
title: Getting Started
canvas_type: page
---
```

Pages are the default type. The `canvas_type` field can be omitted.

| Field      | Type    | Default       | Description                                                                                                                                                                                                       |
| ---------- | ------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `download` | boolean | `false`       | Force inline `.html` links on this page to download in the local preview instead of opening in a new tab. Only affects Docusaurus; Canvas links are unchanged. See [Markdown](markdown.md#linking-to-html-files). |
| `lesson`   | number  | module prefix | Glossary pages only: the lesson number the generated glossary renders up to (`npx course build-glossary`). Without it, the module's numeric prefix is used.                                                       |

## Assignment

```yaml
---
title: Lab 1
canvas_type: assignment
points_possible: 100
submission_types:
  - online_upload
due_at: 2026-03-20T23:59:00Z
published: true
---
```

| Field              | Type     | Default | Description                                                                                                                           |
| ------------------ | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `points_possible`  | number   | —       | Maximum score for the assignment.                                                                                                     |
| `submission_types` | string[] | —       | How students submit. Options: `online_upload`, `online_text_entry`, `online_url`, `media_recording`, `none`. Multiple values allowed. |
| `due_at`           | string   | —       | Due date in ISO 8601 format (e.g. `2026-03-20T23:59:00Z`).                                                                            |
| `lock_at`          | string   | —       | Date after which submissions are no longer accepted. ISO 8601.                                                                        |
| `unlock_at`        | string   | —       | Date when the assignment becomes available. ISO 8601.                                                                                 |
| `published`        | boolean  | —       | Whether the assignment is visible to students.                                                                                        |

## External URL

```yaml
---
title: Canvas Documentation
canvas_type: external_url
external_url: https://canvas.instructure.com/doc/api/
---
```

| Field          | Type   | Description                                                     |
| -------------- | ------ | --------------------------------------------------------------- |
| `external_url` | string | **Required.** The URL to link to. Must be a valid absolute URL. |

External URL items appear in the Canvas module as clickable links. They have no
markdown body.

## File Item

A file item puts a downloadable file (PDF, DOCX, ZIP, ...) in a Canvas module.
The recommended form is a small markdown wrapper, with the binary itself in the
module's `_files/` folder:

```yaml
---
title: Course Syllabus
canvas_type: file
file_ref: _files/syllabus.pdf
---
```

| Field      | Type   | Description                                                                                                   |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| `file_ref` | string | **Required.** Path to the binary, relative to the wrapper file, usually inside the module's `_files/` folder. |

On Canvas the item links straight to the uploaded file; in the local preview the
wrapper renders as a download card. Because the wrapper is a normal markdown
file, it supports `title`, ordering via the filename prefix, and the `export`
flag like any other item.

Non-markdown files dropped directly into a module folder also work: the scanner
detects them as file items automatically, with the filename as title. They carry
no frontmatter, so they cannot use the `export` flag; to include one in an
export, list it by path or add it to a TOC file — see
[Exporting to PDF or DOCX](user-guide.md#exporting-to-pdf-or-docx).

## Notes

- `canvas_id` is managed by the CLI. Editing it manually may cause sync issues.
- Fields not recognised by Canvas are silently ignored during push. Only the
  fields listed above reach Canvas — see
  [Limitations](limitations.md#assignment-fields-that-reach-canvas) for what
  that leaves out.
- Pull takes the fields above from Canvas, including clearing one that Canvas no
  longer has, and carries over every other key you added — `export`, `lesson`,
  anything of your own.
