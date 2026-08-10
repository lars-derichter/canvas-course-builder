const { Marked } = require('marked');
const markedAlert = require('marked-alert');
const { parseFrontmatter } = require('./frontmatter');
const { LABEL_SETS } = require('../config/labels');
const { loadTheme } = require('../config/theme');
const { ICON_FILES } = require('./alert-icons');

/**
 * Escape a string for use inside an HTML attribute value.
 */
function escapeHtmlAttr(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Alert styling: GFM type -> color, background, icon filename. Colours come
 * from the active theme (lib/config/theme.js), so Canvas, the preview site and
 * PDF exports all read one source. Titles come from the course language
 * (lib/config/labels.js) via options.alertTitles.
 *
 * @param {string} [rootDir] - Project root, forwarded to loadTheme().
 * @returns {object} Alert type -> `{ color, background, icon }`.
 */
function getAlertConfig(rootDir) {
  const { alerts } = loadTheme(rootDir);
  const config = {};
  for (const [type, icon] of Object.entries(ICON_FILES)) {
    config[type] = {
      color: alerts[type].fg,
      background: alerts[type].bg,
      icon,
    };
  }
  return config;
}

/**
 * Convert a markdown string to Canvas-compatible HTML.
 *
 * Frontmatter is automatically stripped before conversion.
 *
 * @param {string} markdownContent - Raw markdown (may include frontmatter).
 * @param {object} [options] - Conversion options.
 * @param {object} [options.iconUrls] - Map of alert type to Canvas icon preview URL.
 * @param {object} [options.alertTitles] - Map of alert type to displayed title,
 *   merged over the built-in English titles. Pass the course language's
 *   `labels.alerts` from lib/config/course-config.js.
 * @param {Function} [options.linkResolver] - Callback `(href) => string|null` to resolve internal .md links.
 * @param {Function} [options.fileResolver] - Callback `(href) => string|null` to resolve file/image references.
 * @returns {string} HTML string suitable for Canvas.
 */
function markdownToHtml(markdownContent, options = {}) {
  const alertTitles = { ...LABEL_SETS.en.alerts, ...options.alertTitles };
  // Strip frontmatter so it does not appear in the HTML output
  const { content: rawContent } = parseFrontmatter(markdownContent);

  // Map [!ATTENTION] to [!CAUTION] so marked-alert recognises it
  const content = rawContent.replace(/^(>\s*)\[!ATTENTION\]/gm, '$1[!CAUTION]');

  const marked = new Marked();

  // Keep output simple for Canvas compatibility
  marked.setOptions({
    gfm: true,
    breaks: false,
  });

  // Register GFM alert tokenisation via marked-alert, adding CHECK as a custom variant
  marked.use(
    markedAlert({
      variants: [{ type: 'check', icon: '', title: alertTitles.check }],
    }),
  );

  // Override the alert renderer with Canvas-compatible inline-styled HTML
  const iconUrls = options.iconUrls || {};
  const alertConfig = getAlertConfig(options.rootDir);
  marked.use({
    extensions: [
      {
        name: 'alert',
        level: 'block',
        renderer({ meta, tokens = [] }) {
          const type = meta.variant;
          const cfg = alertConfig[type] || alertConfig.note;
          const title = alertTitles[type] || alertTitles.note;

          let imgHtml = '';
          const url = iconUrls[type];
          if (url) {
            imgHtml = `<img style="height: 0.8em; vertical-align: baseline;" src="${url}" alt="${cfg.icon}" /> `;
          }

          let html = `<div class="markdown-alert markdown-alert-${type}" style="border-left: .25em solid ${cfg.color}; background: ${cfg.background}; padding: .75em 1em;">\n`;
          html += `    <p class="markdown-alert-title" style="color: ${cfg.color}; font-size: 1.2em;">${imgHtml}${title}</p>\n`;
          html += `    ${this.parser.parse(tokens)}`;
          html += `</div>\n<p>&nbsp;</p>\n`;
          return html;
        },
      },
    ],
  });

  // Rewrite internal links: .md links via linkResolver, file links via fileResolver
  if (options.linkResolver || options.fileResolver) {
    const rendererOverrides = {};

    rendererOverrides.link = function ({ href, title, tokens }) {
      let finalHref = href;
      if (options.linkResolver) {
        const resolved = options.linkResolver(href);
        if (resolved) finalHref = resolved;
      }
      // For non-.md links, try fileResolver as fallback
      if (finalHref === href && options.fileResolver) {
        const resolved = options.fileResolver(href);
        if (resolved) finalHref = resolved;
      }
      const titleAttr = title ? ` title="${escapeHtmlAttr(title)}"` : '';
      const text = this.parser.parseInline(tokens);
      return `<a href="${finalHref}"${titleAttr}>${text}</a>`;
    };

    if (options.fileResolver) {
      rendererOverrides.image = function ({ href, title, text }) {
        let src = href;
        if (src && !src.match(/^https?:\/\//) && !src.startsWith('//')) {
          const resolved = options.fileResolver(src);
          if (resolved) src = resolved;
        }
        const titleAttr = title ? ` title="${escapeHtmlAttr(title)}"` : '';
        const alt = text ? escapeHtmlAttr(text) : '';
        return `<img src="${src}" alt="${alt}"${titleAttr}>`;
      };
    }

    marked.use({ renderer: rendererOverrides });
  }

  const html = marked.parse(content);
  return html;
}

module.exports = {
  markdownToHtml,
  getAlertConfig,
};
