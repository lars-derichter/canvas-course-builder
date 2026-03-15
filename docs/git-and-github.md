# Git & GitHub Guide

This guide helps you get set up with Git and GitHub so you can start working
with Canvas Local. No prior experience required.

## What are Git and GitHub?

**Git** is a version control tool that keeps track of every change you make to
your files. Think of it as an unlimited undo history for your entire project.
If you make a mistake or want to go back to an earlier version, Git makes that
easy.

**GitHub** is a website that hosts Git projects online. It lets you store a
backup of your work in the cloud, collaborate with others, and easily get
updates from the original Canvas Local project.

## Creating a GitHub account

If you already have a GitHub account, skip ahead to
[Installing Git](#installing-git).

1. Go to [github.com/signup](https://github.com/signup).
2. Follow the steps to create your account with an email address, password, and
   username.
3. Verify your email address when prompted.

That's it — you're ready to use GitHub.

## Installing Git

### Check if Git is already installed

Open a terminal (on macOS: **Terminal**, on Windows: **Command Prompt** or
**PowerShell**) and run:

```bash
git --version
```

If you see a version number (e.g. `git version 2.43.0`), Git is already
installed and you can skip to [Forking the project](#forking-the-project).

### Windows

Download and run the installer from [git-scm.com/downloads](https://git-scm.com/downloads).
The default settings work fine — just click through the installer.

After installing, open a new **Command Prompt** or **PowerShell** window and
verify with `git --version`.

### macOS

The easiest option is to open **Terminal** and run:

```bash
xcode-select --install
```

This installs Apple's Command Line Tools, which include Git. Follow the prompts
to complete the installation.

Alternatively, if you use [Homebrew](https://brew.sh/), run `brew install git`.

### Linux

Use your distribution's package manager. For example:

```bash
# Ubuntu / Debian
sudo apt install git

# Fedora
sudo dnf install git
```

> [!TIP]
>
> After installing Git for the first time, set your name and email. These appear
> in your change history:
>
> ```bash
> git config --global user.name "Your Name"
> git config --global user.email "your.email@example.com"
> ```

## Forking the project

A **fork** is your own personal copy of a project on GitHub. You'll make changes
in your fork without affecting the original.

1. Make sure you're logged in to GitHub.
2. Go to the Canvas Local project page.
3. Click the **Fork** button in the top-right corner.
4. GitHub creates a copy under your account (e.g.
   `github.com/YOUR-USERNAME/canvas-local`).

## Keeping your project private

If you plan to store evaluation materials (exams, tests) in the `evaluations/`
folder, make sure your project is **private** — otherwise students can find
your materials on GitHub.

You can change your project's visibility in GitHub under **Settings >
General > Danger Zone > Change repository visibility**.

Educators are eligible for a **free GitHub Pro account**, which includes
unlimited private repositories and other benefits. You can apply at
[GitHub Education](https://education.github.com/discount_requests/application).

## Cloning your fork

**Cloning** downloads your fork from GitHub to your computer so you can work on
it locally.

1. On your fork's GitHub page, click the green **Code** button.
2. Copy the URL (it looks like
   `https://github.com/YOUR-USERNAME/your-project-name.git`).
3. Open a terminal and navigate to where you want to store the project. For
   example:

   ```bash
   cd ~/Documents
   ```

4. Run the clone command with the URL you copied:

   ```bash
   git clone https://github.com/YOUR-USERNAME/your-project-name.git
   ```

5. Move into the project folder (use the name of your project):

   ```bash
   cd your-project-name
   ```

You now have a local copy of your fork, ready to go.

## Basic Git workflow

As you work on your course materials, use these three commands to save your
changes:

1. **Stage your changes** — tell Git which files to include in the next save
   point:

   ```bash
   git add .
   ```

   The `.` means "all changed files". You can also add specific files:
   `git add course/01-intro/01-welcome.md`

2. **Commit** — create a save point with a short description of what you
   changed:

   ```bash
   git commit -m "Add welcome page to intro module"
   ```

3. **Push** — upload your commit to GitHub so it's backed up online:

   ```bash
   git push
   ```

> [!TIP]
>
> Commit early and often. Small, frequent commits are easier to understand and
> undo than one large commit with many changes.

## Next steps

With Git and GitHub set up, head back to the [Getting Started](../README.md#getting-started)
section to continue with installing Node.js and setting up the project.
