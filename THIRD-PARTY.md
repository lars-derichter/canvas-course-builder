# Third-party assets

This repository is licensed under the Unlicense (tooling, see `LICENSE`) and
CC BY-NC-SA 4.0 (course content, see `course/LICENSE.md`). The files listed
below are the property of their respective owners and are covered by
**neither** licence. They ship with the template as a worked example of
institutional branding, in the `thomas-more` export style and theme.

- `export-styles/thomas-more/fonts/Century Gothic*.ttf` — the Century Gothic
  typeface, © Monotype Imaging Inc. Bundled so PDF exports of the example
  style render consistently on machines where the font is not installed.
- `export-styles/thomas-more/logo.png` — the logo of Thomas More University
  of Applied Sciences, a trademark of Thomas More. Used as the example cover
  mark in that style.
- The colours in `src/css/themes/thomas-more.css` are Thomas More's.

`src/css/themes/thomas-more.css` also imports the Nunito and Inconsolata
webfonts from Google Fonts. Both are licensed under the SIL Open Font
License 1.1 and are fetched at runtime rather than bundled here.

Neither the `thomas-more` style nor the `thomas-more` theme is the default —
the shipped defaults (`generic` and `github`) are brand-neutral. When you
build your own course, point `theme:` and `export.style:` in
`course.config.yml` at your institution's colours, fonts and logo;
[docs/customization.md](docs/customization.md) explains how.
