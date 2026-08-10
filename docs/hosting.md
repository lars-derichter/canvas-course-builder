# Hosting your course on the web

Your course content lives as markdown and is served locally by Docusaurus with
`npm start`. You can also publish it as a public website on **GitHub Pages** for
free. This gives your students a stable URL to read the materials — handy as a
fallback when Canvas is unavailable.

The website only contains your `course/` folder. The `evaluations/` and
`sources/` folders are never built into the site, so your exam materials stay
out of the public version even though they live in the same repository.

## Public site, private repository

The published website is **public**: anyone with the link can read it. Your
repository stays **private**, so your source files, exam materials, and Canvas
credentials are not exposed.

> [!IMPORTANT]
>
> GitHub Pages on a **private** repository requires a paid plan (GitHub Pro or
> higher). Educators and students get GitHub Pro for free through
> [GitHub Education](https://education.github.com). Apply there first if you
> haven't already.

## Setting it up

Run the setup command once from your project folder:

```bash
npx course setup-pages
```

It reads your GitHub repository from the `origin` remote and:

1. Updates `docusaurus.config.js` with the correct site URL and base path
   (`https://YOUR-USERNAME.github.io/your-project-name/`).
2. Creates `.github/workflows/deploy.yml`, a workflow that rebuilds and
   redeploys the site automatically on every push.

The command is safe to run again — it updates existing values instead of
duplicating them.

After running it, two manual steps remain:

1. On GitHub, go to **Settings > Pages** and set **Source** to **GitHub
   Actions**.
2. Commit and push your changes:

   ```bash
   git add .
   git commit -m "Set up GitHub Pages hosting"
   git push
   ```

The workflow runs on every push to your default branch. When it finishes, your
site is live at `https://YOUR-USERNAME.github.io/your-project-name/`. You can
watch progress under the **Actions** tab on GitHub.

## Using your own domain

If you own a domain and want to use it instead of the `github.io` address:

```bash
npx course setup-pages --domain courses.example.org
```

This sets the site URL to your domain and writes a `CNAME` file. You still need
to point your domain's DNS at GitHub Pages and confirm the custom domain under
**Settings > Pages**. See
[GitHub's custom domain guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

## Troubleshooting

If the deploy fails, open the failed run under the **Actions** tab to read the
log. The most common cause is a **broken link**: the site is configured to fail
the build on broken internal links (`onBrokenLinks: 'throw'` in
`docusaurus.config.js`), so a wrong link path stops the deploy. Run
`npm run build` locally to catch the same error before pushing.
