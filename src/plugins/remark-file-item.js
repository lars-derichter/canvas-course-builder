const path = require('path');

const { LABEL_SETS } = require('../../lib/config/labels');

/**
 * Remark plugin that replaces the content of file item pages with a
 * styled file card. File items are markdown wrappers around binary files
 * (PDF, SVG, etc.) pulled from Canvas. This plugin intercepts them and
 * shows a download link instead of an empty page.
 *
 * @param {{ siteDir?: string, label?: string }} [options] - `siteDir` (the
 *   Docusaurus site root) lets the link be emitted as a `@site/...` alias so
 *   Docusaurus's transformLinks plugin bundles the asset regardless of its
 *   extension. Pass `__dirname` from docusaurus.config.js. `label` overrides
 *   the card label (defaults to English; docusaurus.config.js passes the
 *   course language's `labels.cards.file`).
 */
function remarkFileItem(options = {}) {
  const { siteDir } = options;
  const labelText = options.label || LABEL_SETS.en.cards.file;

  return (tree, vfile) => {
    const frontMatter = vfile.data.frontMatter;
    if (!frontMatter) return;
    if (frontMatter.canvas_type !== 'file') return;
    if (!frontMatter.file_ref) return;

    const fileRef = frontMatter.file_ref;
    const fileName = fileRef.split('/').pop();

    // Emit a `@site/`-aliased URL when we know the site root. Docusaurus's
    // transformLinks plugin treats any `@site/` link as an asset to require()
    // through webpack — bypassing its extension heuristic, which otherwise
    // skips (and breaks) links to .html, .md, or extension-less files. The
    // bare relative fileRef is a fallback for when siteDir isn't configured
    // (e.g. unit tests); transformLinks resolves it relative to this .md file.
    let url = fileRef;
    if (siteDir && vfile.path) {
      const absPath = path.resolve(path.dirname(vfile.path), fileRef);
      url = '@site/' + path.relative(siteDir, absPath).split(path.sep).join('/');
    }

    // Build: <div class="file-item-card">
    //          <p class="file-item-label">File</p>
    //          <p class="file-item-link">[fileName](url)</p>
    //        </div>
    // The link is a plain mdast link node (not a JSX <a>) so transformLinks
    // rewrites it into a webpack asset require() and adds target="_blank".
    const linkNode = {
      type: 'link',
      url,
      children: [{ type: 'text', value: fileName }],
    };

    const label = {
      type: 'mdxJsxFlowElement',
      name: 'p',
      attributes: [
        { type: 'mdxJsxAttribute', name: 'className', value: 'file-item-label' },
      ],
      children: [{ type: 'text', value: labelText }],
    };

    const linkParagraph = {
      type: 'mdxJsxFlowElement',
      name: 'p',
      attributes: [
        { type: 'mdxJsxAttribute', name: 'className', value: 'file-item-link' },
      ],
      children: [linkNode],
    };

    const card = {
      type: 'mdxJsxFlowElement',
      name: 'div',
      attributes: [
        { type: 'mdxJsxAttribute', name: 'className', value: 'file-item-card' },
      ],
      children: [label, linkParagraph],
    };

    // Replace entire document body with the card
    tree.children.splice(0, tree.children.length, card);
  };
}

module.exports = remarkFileItem;
