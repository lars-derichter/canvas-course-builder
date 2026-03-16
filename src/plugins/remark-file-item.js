/**
 * Remark plugin that replaces the content of file item pages with a
 * styled file card. File items are markdown wrappers around binary files
 * (PDF, SVG, etc.) pulled from Canvas. This plugin intercepts them and
 * shows a download link instead of an empty page.
 */
function remarkFileItem() {
  return (tree, vfile) => {
    const frontMatter = vfile.data.frontMatter;
    if (!frontMatter) return;
    if (frontMatter.canvas_type !== 'file') return;
    if (!frontMatter.file_ref) return;

    const fileRef = frontMatter.file_ref;
    const fileName = fileRef.split('/').pop();

    // Build: <div class="file-item-card">
    //          <p class="file-item-label">Bestand</p>
    //          <p class="file-item-link"><a href="fileRef" target="_blank">fileName</a></p>
    //        </div>
    const linkNode = {
      type: 'mdxJsxTextElement',
      name: 'a',
      attributes: [
        { type: 'mdxJsxAttribute', name: 'href', value: fileRef },
        { type: 'mdxJsxAttribute', name: 'target', value: '_blank' },
        { type: 'mdxJsxAttribute', name: 'rel', value: 'noopener noreferrer' },
      ],
      children: [{ type: 'text', value: fileName }],
    };

    const label = {
      type: 'mdxJsxFlowElement',
      name: 'p',
      attributes: [
        { type: 'mdxJsxAttribute', name: 'className', value: 'file-item-label' },
      ],
      children: [{ type: 'text', value: 'Bestand' }],
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
