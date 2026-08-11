// @ts-check

// Hosting overlay for the upstream demo site at
// https://lars-derichter.github.io/canvas-course-builder/, used only by
// .github/workflows/deploy-demo-site.yml.
//
// It exists so docusaurus.config.js can keep neutral placeholder hosting
// values, which every copy of this template inherits. If you built a course
// from the template, delete this file and run `npx course setup-pages`: that
// writes your own url and baseUrl straight into docusaurus.config.js. See
// docs/hosting.md.

const config = require('./docusaurus.config.js');

/** @type {import('@docusaurus/types').Config} */
module.exports = {
  ...config,
  url: 'https://lars-derichter.github.io',
  baseUrl: '/canvas-course-builder/',
  organizationName: 'lars-derichter',
  projectName: 'canvas-course-builder',
  trailingSlash: false,
};
