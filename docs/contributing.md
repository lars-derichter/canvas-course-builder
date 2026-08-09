# Contributing

Found a bug? Have an idea for an improvement? Contributions are welcome —
whether that's a bug report, a feature suggestion, or a pull request with a fix.

## Reporting an issue

If something isn't working as expected, open an issue on GitHub:

1. Go to the **Issues** tab on
   [the original Canvas Course Builder project page.](https://github.com/lars-derichter/canvas-course-builder)
2. Click **New issue**.
3. Fill in a clear title and description.

A good issue report includes:

- **A descriptive title** — e.g. "Push fails when module folder contains spaces"
  rather than "push broken"
- **What you expected** vs **what actually happened**
- **Steps to reproduce** the problem — what commands did you run, in what order?
- **Error messages or screenshots** — copy the full error output from the
  terminal if possible
- **Your environment** — operating system and Node.js version (`node --version`)
  if relevant

> [!TIP]
>
> Even if you're not sure whether something is a bug, feel free to open an
> issue. It might reveal a documentation gap or an edge case worth handling.

## Suggesting improvements

Have an idea for a new feature or a better workflow? Open an issue the same way,
but describe:

- **What you'd like** — the feature or change you have in mind
- **Why it would help** — the use case or problem it solves
- **How you use Canvas Course Builder today** — this helps prioritise what matters most

Check the [Roadmap](roadmap.md) first — your idea may already be on the
backlog, or already shipped.

## Contributing with a pull request

If you'd like to contribute a fix or improvement yourself, follow these steps:

1. **Fork** the original Canvas Course Builder project — on the project page, click the
   **Fork** button in the top-right corner to create a copy under your account.

2. **Create a branch** for your change:

   ```bash
   git checkout -b fix-push-spaces
   ```

   Use a short, descriptive branch name that reflects what the change does.

3. **Make your changes** and commit them:

   ```bash
   git add .
   git commit -m "Fix push failing when module folder contains spaces"
   ```

4. **Test your changes** before submitting — see [Tests](tests.md) for details
   on the test setup and how to write new tests:

   ```bash
   npm start        # check the Docusaurus preview
   npm run build    # verify the production build succeeds
   npm test         # run the automated tests
   ```

5. **Push** your branch to your fork:

   ```bash
   git push -u origin fix-push-spaces
   ```

6. **Open a pull request** — go to your fork on GitHub, and you'll see a banner
   offering to create a pull request. Click **Compare & pull request**.

### What makes a good pull request

- **Keep it focused** — one fix or feature per pull request. Smaller changes are
  easier to review and merge.
- **Write a clear title and description** — explain what the change does and
  why. If there's a related issue, mention it (e.g. "Fixes #12").
- **Test your changes** — make sure `npm run build` and `npm test` pass before
  submitting.

> [!TIP]
>
> Not sure if your idea is worth a pull request? Open an issue first to discuss
> it. That way you won't spend time on something that might not fit the project
> direction.

## Understanding the codebase

See [Architecture](architecture.md) for a technical overview of the three-layer
design, sync state format, push/pull algorithms, and link resolution.
