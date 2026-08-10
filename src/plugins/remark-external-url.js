const { LABEL_SETS } = require('../../lib/config/labels');

/**
 * Remark plugin that replaces the content of external_url pages with a
 * styled link card. Docusaurus normally renders these files as regular
 * documents; this plugin intercepts them and shows only the link.
 *
 * @param {{ label?: string }} [options] - `label` overrides the card label
 *   (defaults to English; docusaurus.config.js passes the course language's
 *   `labels.cards.external_url`).
 */
function remarkExternalUrl(options = {}) {
  const labelText = options.label || LABEL_SETS.en.cards.external_url;

  return (tree, vfile) => {
    const frontMatter = vfile.data.frontMatter;
    if (!frontMatter) return;
    if (frontMatter.canvas_type !== 'external_url') return;
    if (!frontMatter.external_url) return;

    const url = frontMatter.external_url;

    // Build: <div class="external-url-card">
    //          <p class="external-url-label">External link</p>
    //          <p><a href="URL" target="_blank" rel="noopener noreferrer">URL</a></p>
    //        </div>
    const linkNode = {
      type: 'mdxJsxTextElement',
      name: 'a',
      attributes: [
        { type: 'mdxJsxAttribute', name: 'href', value: url },
        { type: 'mdxJsxAttribute', name: 'target', value: '_blank' },
        { type: 'mdxJsxAttribute', name: 'rel', value: 'noopener noreferrer' },
      ],
      children: [{ type: 'text', value: url }],
    };

    const label = {
      type: 'mdxJsxFlowElement',
      name: 'p',
      attributes: [
        {
          type: 'mdxJsxAttribute',
          name: 'className',
          value: 'external-url-label',
        },
      ],
      children: [{ type: 'text', value: labelText }],
    };

    const linkParagraph = {
      type: 'mdxJsxFlowElement',
      name: 'p',
      attributes: [
        {
          type: 'mdxJsxAttribute',
          name: 'className',
          value: 'external-url-link',
        },
      ],
      children: [linkNode],
    };

    const card = {
      type: 'mdxJsxFlowElement',
      name: 'div',
      attributes: [
        {
          type: 'mdxJsxAttribute',
          name: 'className',
          value: 'external-url-card',
        },
      ],
      children: [label, linkParagraph],
    };

    // Replace entire document body with the card
    tree.children.splice(0, tree.children.length, card);
  };
}

module.exports = remarkExternalUrl;
