const { spawn } = require('child_process');
const path = require('path');

/**
 * Build the pandoc argument list for one export run.
 *
 * @param {object} opts
 * @param {string} opts.input - Path to the combined markdown file.
 * @param {string} opts.output - Path to the output PDF/DOCX.
 * @param {string} opts.format - 'pdf' or 'docx'.
 * @param {string} opts.filter - Path to the Lua filter.
 * @param {string} [opts.defaultsFile] - Path to a pandoc defaults YAML file.
 * @param {string} [opts.template] - Path to the Typst template (PDF only).
 * @param {string} [opts.referenceDoc] - Path to reference.docx (DOCX only).
 * @param {string} [opts.resourcePath] - Directory pandoc resolves assets from.
 * @param {object} [opts.variables] - Extra `-V key=value` pandoc variables.
 * @param {boolean} [opts.toc] - Whether to emit a table of contents.
 * @param {string} [opts.logo] - Absolute path to the cover logo (PDF only).
 * @returns {string[]} Argument vector for pandoc.
 */
function buildPandocArgs(opts) {
  const {
    input,
    output,
    format,
    filter,
    defaultsFile,
    template,
    referenceDoc,
    resourcePath,
    variables = {},
    toc,
    logo,
  } = opts;

  const args = ['-f', 'markdown', input, '-o', output, '--standalone'];

  if (defaultsFile) args.push('--defaults', defaultsFile);
  if (filter) args.push('--lua-filter', filter);
  if (toc) args.push('--toc');

  if (format === 'pdf') {
    args.push('--pdf-engine', 'typst');
    if (template) args.push('--template', template);
    if (logo) {
      // Pandoc compiles the generated .typ from a temp dir; Typst rejects
      // absolute paths outside its project root, so widen the root to /.
      args.push('-V', `logo=${logo}`);
      args.push('--pdf-engine-opt=--root=/');
    }
  } else if (format === 'docx') {
    if (referenceDoc) args.push('--reference-doc', referenceDoc);
  }

  if (resourcePath) args.push('--resource-path', resourcePath);

  for (const [key, value] of Object.entries(variables)) {
    args.push('-V', `${key}=${value}`);
  }

  return args;
}

/**
 * Run pandoc, inheriting stderr so its diagnostics reach the user. Rejects
 * with a readable error on non-zero exit.
 *
 * @param {object} opts - Same shape as buildPandocArgs.
 * @returns {Promise<void>}
 */
function runPandoc(opts) {
  const args = buildPandocArgs(opts);
  const env = { ...process.env };
  if (opts.format === 'pdf' && opts.fontsDir) {
    // Let Typst find the fonts shipped with the style (e.g. Century Gothic).
    env.TYPST_FONT_PATHS = process.env.TYPST_FONT_PATHS
      ? `${opts.fontsDir}${path.delimiter}${process.env.TYPST_FONT_PATHS}`
      : opts.fontsDir;
  }
  return new Promise((resolve, reject) => {
    const child = spawn('pandoc', args, { stdio: ['ignore', 'inherit', 'inherit'], env });
    child.on('error', (err) => {
      reject(new Error(`Failed to start pandoc: ${err.message}`));
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pandoc exited with code ${code}.`));
    });
  });
}

module.exports = { buildPandocArgs, runPandoc };
