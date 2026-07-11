---
name: image-todos
description: List all outstanding image work across the course — the transparent placeholder PNGs and image-TODO comment blocks that /build-lesson-module leaves behind. Pure report, writes nothing. Use for "image todos", "openstaande afbeeldingen", "welke afbeeldingen moet ik nog maken", "placeholder images", "beeldwerk oplijsten", "image debt".
---

# Image todos

List every image that still needs to be made across the course:
`/build-lesson-module` drops a 1x1 transparent PNG per planned image in
`_files/` and an HTML-comment TODO block at the bottom of each page that
embeds one. This skill finds all of them, cross-references placeholders with
their TODOs, and reports the outstanding work in one table. Pure report; it
writes nothing.

## Input

`$ARGUMENTS` may name one or more module folders to limit the sweep. Empty
means all of `course/`.

## Steps

1. **Find placeholder PNGs.** `/build-lesson-module` writes a fixed 1x1
   transparent PNG. Decode the known bytes to a temp file and compare
   checksums against every PNG under `course/**/_files/`:

   ```bash
   echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" \
     | base64 -d > /tmp/image-todos-placeholder.png
   shasum /tmp/image-todos-placeholder.png
   find course -path '*/_files/*.png' -exec shasum {} +
   ```

   A checksum match is a confirmed placeholder. Additionally flag any PNG
   under 200 bytes as a *suspected* placeholder (a hand-edited or
   differently generated stub) and label it as suspected in the report.

2. **Find TODO blocks.** Grep the pages under `course/` for HTML comments
   containing `TODO` (`grep -rn 'TODO' course --include='*.md'`, then keep
   only hits inside `<!-- … -->`). `/build-lesson-module` puts one block at
   the bottom of each page with images, listing each placeholder and what
   it must show; other image-related TODO comments count too.

3. **Find embeds.** For each placeholder from step 1, grep the pages for a
   reference to its filename (markdown image syntax or `src=`), and record
   which page(s) embed it.

4. **Cross-reference.** A healthy placeholder is embedded by a page and
   described by a TODO on that page. Flag the orphans:
   - Placeholder PNG with no TODO describing it.
   - Placeholder PNG embedded by no page.
   - TODO naming an image file that does not exist in `_files/`.
   - Embedded image reference whose file is missing — this overlaps with
     the dead-link check in `/consistency-check`; note that overlap in one
     line rather than duplicating the analysis.

5. **Report in chat.** One table:

   `module | page | image file | TODO text (truncated to one line)`

   Then the orphan list from step 4, each entry with file and line. Close
   with one line of totals: "N images outstanding across M modules"
   (suspected placeholders counted separately if any).

   If there are no placeholders and no image TODOs, say the course is
   image-clean and stop — do not invent findings.

## Rules

- Pure report. Write nothing under the repo; the decoded reference PNG
  goes to the scratchpad only.
- A placeholder is only *confirmed* by checksum; size-based hits stay
  labelled as suspected.
- Course-agnostic: no hardcoded module names or image lists; everything
  comes from the filesystem at runtime.
- No commits, no pushes, no staging.
- If nothing is found, say so and stop — do not invent findings.

$ARGUMENTS
