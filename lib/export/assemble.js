const fs = require('fs');
const path = require('path');

const { flattenItems } = require('../convert/course-scanner');
const { preprocessItem } = require('./preprocess');

/**
 * Deterministic anchor id for an item's relativePath. Shared by assemble (which
 * injects it into the item's chapter heading) and preprocess (which rewrites
 * cross-links to `#anchor`), so a link and its target always agree.
 *
 * @param {string} relativePath - Item path relative to course/ (posix or native).
 * @returns {string}
 */
function anchorFor(relativePath) {
  return (
    'sec-' +
    relativePath
      .replace(/\\/g, '/')
      .replace(/\.md$/i, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
  );
}

/** Escape a value for inclusion inside a double-quoted pandoc attribute. */
function escapeAttr(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Escape a value for inclusion inside a double-quoted YAML scalar. */
function escapeYaml(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Build the pandoc YAML metadata block for the combined document. Only fields
 * that are set are emitted. `title` drives the title page in template.typ;
 * `toc` drives the generated table of contents. `labels` (a flat map of label
 * key -> display string) is what filter.lua and template.typ read so alert
 * titles and the attachment label follow the course language.
 *
 * @param {object} meta
 * @returns {string} A `---`-delimited YAML block, or '' when nothing to emit.
 */
function buildMetaBlock(meta = {}) {
  const lines = [];
  for (const key of ['title', 'subtitle', 'course', 'date']) {
    if (meta[key]) lines.push(`${key}: "${escapeYaml(meta[key])}"`);
  }
  lines.push(`lang: ${meta.lang || 'en'}`);
  if (meta.toc) lines.push('toc: true');
  if (meta.labels && Object.keys(meta.labels).length > 0) {
    lines.push('labels:');
    for (const [key, value] of Object.entries(meta.labels)) {
      lines.push(`  ${key}: "${escapeYaml(value)}"`);
    }
  }
  return `---\n${lines.join('\n')}\n---`;
}

/**
 * Ensure the item body carries its chapter anchor. The author's leading H1 (now
 * shifted to `level`) becomes the chapter heading, so we inject the anchor into
 * it rather than duplicate it. When a body has no leading heading, we generate
 * one from the item title.
 *
 * @param {string} body - Preprocessed markdown body.
 * @param {object} item - Scanner item.
 * @param {number} level - Target heading level for this item.
 * @param {string} anchor - Anchor id to attach.
 * @returns {string}
 */
function injectAnchorOrGenerate(body, item, level, anchor) {
  const lines = body.split('\n');
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i += 1;

  if (i < lines.length && /^#{1,6}\s+\S/.test(lines[i])) {
    if (!/\{#[^}]+\}\s*$/.test(lines[i])) {
      lines[i] = lines[i].replace(/\s*$/, ` {#${anchor}}`);
    }
    return lines.slice(i).join('\n');
  }

  return `${'#'.repeat(level)} ${item.title} {#${anchor}}\n\n${body}`;
}

/**
 * Render one item to markdown at the given heading level. Pages and assignments
 * contribute their preprocessed body; external_url and file items become a
 * chapter heading followed by a link-card / attachment div.
 *
 * @param {object} item - Scanner item, optionally carrying `rawMd`.
 * @param {number} level - Target heading level.
 * @param {number} shift - Heading shift for the body (level - 1, plus indent).
 * @param {object} ctx - Preprocess context (courseDir, includedPaths, ...).
 * @returns {string}
 */
function renderItem(item, level, shift, ctx) {
  const anchor = anchorFor(item.relativePath);
  const hashes = '#'.repeat(level);

  if (item.canvasType === 'external_url') {
    const url = (item.frontmatter && item.frontmatter.external_url) || '';
    return (
      `${hashes} ${item.title} {#${anchor}}\n\n` +
      `::: {.link-card title="${escapeAttr(item.title)}" url="${escapeAttr(url)}"}\n:::`
    );
  }

  if (item.canvasType === 'file') {
    const ref = item.frontmatter && item.frontmatter.file_ref;
    const name = ref ? path.posix.basename(ref.replace(/\\/g, '/')) : item.file;
    return (
      `${hashes} ${item.title} {#${anchor}}\n\n` +
      `::: {.attachment name="${escapeAttr(name)}"}\n:::`
    );
  }

  const raw =
    item.rawMd != null
      ? item.rawMd
      : fs.readFileSync(path.join(ctx.courseDir, item.relativePath), 'utf8');
  const body = preprocessItem(raw, item, { ...ctx, headingShift: shift });
  return injectAnchorOrGenerate(body, item, level, anchor);
}

/**
 * Assemble one combined markdown string for the whole export.
 *
 * Heading regimes:
 *  - `course` — module title as H1, items as H2 (body shifted +1). Used for
 *    full-course export and for selections spanning more than one module.
 *  - `flat`   — items as H1 (no shift). Used for a single module or a
 *    single-module selection.
 *  - `bare`   — one item, no chrome, body untouched. Used for single-item
 *    export.
 *
 * Subheaders (subfolders) become a heading at the item level; their children
 * are nested one level deeper via their `indent`.
 *
 * @param {Array<{moduleTitle: string, moduleFolder?: string, items: object[]}>} groups
 * @param {object} meta - { title?, subtitle?, course?, date?, lang?, toc?, regime }
 * @param {object} ctx - { courseDir, includedPaths, linkMap?, courseId? }
 * @returns {string}
 */
function buildCombinedMarkdown(groups, meta, ctx) {
  const regime = meta.regime || 'flat';
  const fullCtx = { ...ctx, anchorFor };
  const parts = [];

  const metaBlock = buildMetaBlock(meta);
  if (metaBlock) parts.push(metaBlock);

  if (regime === 'bare') {
    const item = groups[0].items[0];
    parts.push(renderItem(item, 1, 0, fullCtx));
    return parts.join('\n\n') + '\n';
  }

  const itemLevel = regime === 'course' ? 2 : 1;
  const baseShift = itemLevel - 1;

  for (const group of groups) {
    if (regime === 'course') {
      const manchor = anchorFor(`${group.moduleFolder}/`);
      parts.push(`# ${group.moduleTitle} {#${manchor}}`);
    }

    for (const node of flattenItems(group.items)) {
      if (node.type === 'subheader') {
        parts.push(
          `${'#'.repeat(itemLevel)} ${node.title} {#${anchorFor(
            `${group.moduleFolder}/${node.folderName}`,
          )}}`,
        );
        continue;
      }
      const extra = node.indent || 0;
      parts.push(renderItem(node, itemLevel + extra, baseShift + extra, fullCtx));
    }
  }

  return parts.join('\n\n') + '\n';
}

module.exports = {
  buildCombinedMarkdown,
  buildMetaBlock,
  injectAnchorOrGenerate,
  renderItem,
  anchorFor,
};
