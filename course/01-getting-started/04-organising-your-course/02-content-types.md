---
title: Content Types
canvas_type: page
---

# Content Types

Every item in a module has a type that determines how it appears on Canvas. You
set the type by adding a `canvas_type` field at the top of your markdown file
(in the frontmatter). Here are the four types you can use.

## Page (Default)

The most common type. Rendered as a Canvas wiki page.

```yaml
---
title: My page
canvas_type: page
---
```

If you omit `canvas_type`, the item defaults to `page`.

## Assignment

Creates a Canvas assignment with grading support.

```yaml
---
title: Homework 1
canvas_type: assignment
points_possible: 100
submission_types:
  - online_upload
  - online_text_entry
due_at: "2026-03-20T23:59:00Z"
---
```

Supported fields:

| Field              | Description                                         |
| ------------------ | --------------------------------------------------- |
| `points_possible`  | Maximum score                                       |
| `submission_types` | How students submit (upload, text, url)             |
| `due_at`           | Deadline in ISO 8601 format                         |
| `unlock_at`        | Date when the assignment becomes available          |
| `lock_at`          | Date after which submissions are no longer accepted |
| `published`        | Whether the assignment is visible to students       |

## External URL

Links to an external website. No content body is synced, just the link.

```yaml
---
title: MDN Web Docs
canvas_type: external_url
external_url: https://developer.mozilla.org
---
```

The link opens in a new tab by default.

## File

Uploads a binary file (PDF, SVG, ZIP, etc.) to Canvas as a module item. The
actual file lives in `_files/` and the markdown wrapper points to it with
`file_ref`.

```yaml
---
title: Workflow diagram
canvas_type: file
file_ref: _files/workflow-diagram.svg
---
```

Place the binary in the module's `_files/` directory and create a `.md` wrapper
next to your other items:

```
course/01-module/
  _files/
    workflow-diagram.svg
  05-workflow-diagram.md   -> File: "Workflow Diagram"
```

This module contains three live examples: the
[Workflow Diagram](../02-workflow-diagram.md) (SVG), the
[Example PDF](../09-example-pdf.md), and the
[HTML Starter](../13-html-starter.md).

> [!NOTE]
>
> Over 35 file types are supported, including PDF, PNG, JPG, SVG, MP4, DOCX, and
> many more. When you pull a course from Canvas, file items are automatically
> converted to this wrapper format.
