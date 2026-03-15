---
title: VS Code
canvas_type: page
---

# VS Code

Visual Studio Code (VS Code) is a free code editor that works beautifully with this project. You do not need it — any text editor and a terminal will do — but it makes the experience a lot smoother.

## Why VS Code?

VS Code is a great match for Canvas Local because it brings together everything you need in one window:

- **Markdown support** — syntax highlighting, live preview, and formatting shortcuts for the markdown files you write your course in
- **Built-in terminal** — run CLI commands like `npx course push` without leaving the editor
- **Git integration** — the Source Control panel lets you stage, commit, and push changes visually (see [Git Workflow](09-git-workflow.md) for a walkthrough)
- **Course Manager extension** — this project includes a custom VS Code extension that puts all course commands in the sidebar and command palette, so you can manage your course without typing commands at all

It is free, open-source, and runs on Windows, macOS, and Linux.

## Installing VS Code

1. Go to [code.visualstudio.com](https://code.visualstudio.com/) and download the installer for your operating system.

2. Install it:
   - **Windows** — run the downloaded installer and follow the prompts. Check the option to add VS Code to your PATH if offered.
   - **macOS** — open the downloaded `.zip` file and drag **Visual Studio Code** into your **Applications** folder.
   - **Linux** — follow the instructions on the download page for your distribution, or install the `.deb` or `.rpm` package directly.

3. Open VS Code and use **File > Open Folder** (or **Cmd+O** / **Ctrl+K Ctrl+O**) to open your `canvas-local` project folder.

> [!TIP]
>
> If you installed VS Code with the PATH option (Windows) or ran **Shell Command: Install 'code' command in PATH** from the command palette (macOS), you can open your project from the terminal: `code canvas-local`

## Installing the Course Manager Extension

From the project root, run:

```bash
npm run vscode:install
```

You only need to do this once (or again after the extension is updated).

## The Course Manager Sidebar

After installing the extension, you will see a **Course Manager** panel in the VS Code sidebar. It shows a tree view of all your modules and items, complete with icons for each content type.

The tree updates automatically whenever you add, rename, or delete files — no need to refresh manually.

### Inline Actions

Each module in the sidebar has quick-action buttons:

- **Push module** (cloud icon) — push just that module to Canvas
- **Open in Canvas** (link icon) — open the module directly on Canvas in your browser

### Right-Click Menu

Right-click any module or item in the sidebar to see context actions:

- **New**, **Rename**, **Move**, **Delete** — the same management commands, without typing
- **Merge items** — a two-step process: first right-click an item and choose "Set as Merge Source", then right-click the target item and choose "Merge with Source"
- **Split item** — split a long page into two files at a specific line

You can also drag and drop items to reorder them within a module.

## Title Bar Buttons

At the top of the sidebar, you will find toolbar buttons for the most common actions:

- **Preview** — starts the Docusaurus dev server so you can preview your course locally
- **Push** — push all modules to Canvas
- **Pull** — pull content from Canvas
- **Status** — compare your local files against Canvas
- **Diff** — see what changed locally since the last sync
- **Validate** — check your content for errors before pushing

## Command Palette

Open the command palette with **Cmd+Shift+P** (macOS) or **Ctrl+Shift+P** (Windows/Linux) and type **"Course:"** to see all available commands:

| Command | What it does |
| --- | --- |
| Course: Init (Canvas Setup) | Configure Canvas API credentials |
| Course: Push to Canvas | Push all modules |
| Course: Push to Canvas (Dry Run) | Preview push without making changes |
| Course: Push Module to Canvas... | Push a single module |
| Course: Pull from Canvas | Pull content from Canvas |
| Course: Status | Compare local vs sync state |
| Course: Diff | Show changes since last sync |
| Course: Validate | Check content for errors |
| Course: New Module | Create a new module |
| Course: Move Module | Reorder a module |
| Course: Rename Module | Rename a module |
| Course: Delete Module | Delete a module |
| Course: New Item | Create a new item |
| Course: Move Item | Reorder an item |
| Course: Move Item to Module | Move an item to another module |
| Course: Rename Item | Rename an item |
| Course: Delete Item | Delete an item |
| Course: Merge Items | Combine two items into one |
| Course: Split Item | Split an item into two files |

## How It Works

The extension runs CLI commands in the VS Code integrated terminal, so you see the same output and interactive prompts as you would in a regular terminal. Before running any command, it checks that your workspace contains a `course/` directory.

> [!TIP]
> If you have a file open inside a module folder, the extension automatically detects which module you are working in — no need to select it manually.

## Updating

If the extension is updated (for example, after pulling new changes), reinstall it:

```bash
npm run vscode:install
```

Then reload VS Code (or run **Developer: Reload Window** from the command palette) to pick up the new version.
