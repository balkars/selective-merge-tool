# Selective Merge Tool

> Move **only the files and folders you choose** from one Azure DevOps branch into another — instead of merging everything.

A focused web tool for **selective, file-level promotion between branches** (e.g. `UAT → PRODUCTION`). Pick the folders you want, review a side-by-side diff of exactly what differs, then it creates a working branch, pushes the selected files in a single commit, and opens a Pull Request — all against the live Azure DevOps REST API.

No AI, no surprises: it's **deterministic code** that talks only to Azure DevOps over HTTPS.

<p align="center">
  <img src="screenshots/01-branches.png" alt="Branch selection" width="80%" />
</p>

---

## Why

Some branches always carry files you _never_ want to promote — deployment manifests, environment config, infra. A normal merge drags everything along, so teams fall back to keeping two local checkouts and **hand-copying folders** between them.

This tool replaces that manual copy-paste workflow with a guided, reviewable, auditable process.

---

## Features

- **Folder-scoped diffs** — choose which top-level folders to consider; everything else is ignored.
- **True side-by-side review** — see every file that differs between the branches, line by line, before anything is pushed.
- **Cherry-pick at the file level** — uncheck any file to leave it out of the Pull Request.
- **Commit attribution** — each file shows the last commit that touched it on the source branch. Hover for the message/author/date, click to **open the commit in Azure DevOps** and verify the change at the source.
- **One-commit PR** — creates a fresh working branch off the target tip, pushes the selected files in a single commit, and opens a PR with your chosen title, description, and reviewers.
- **Protected folders** — deployment/infra/env-type paths are excluded from selection by default so environment config isn't promoted by accident.
- **In-app Wiki** — run and usage instructions are built into the UI.
- **Read-only until the end** — nothing is written to your repo until you explicitly create the PR. It never force-pushes and never touches the target branch directly.

---

## How it works

```
Branches  →  Folders  →  Diff  →  Create PR  →  Success
```

1. **Branches** — pick the source (merge _from_) and target (merge _into_) branches, and name the working branch.
2. **Folders** — select which folders to include; only changes inside them are considered.
3. **Diff** — review a side-by-side diff (left = target/current, right = source/incoming). Uncheck files to exclude them.
4. **Create PR** — set title, description, and reviewers. The tool creates the working branch, pushes the selected files in one commit, and opens the PR.
5. **Success** — links straight to the new Pull Request.

<p align="center">
  <img src="screenshots/04-folders.png" alt="Folder selection" width="80%" />
</p>

---

## Tech stack

| Layer    | What                                                                 |
| -------- | -------------------------------------------------------------------- |
| Backend  | Node.js + Express — proxies the Azure DevOps REST API (`axios`)      |
| Diffing  | [`diff`](https://www.npmjs.com/package/diff) (`structuredPatch`)     |
| Frontend | React 18 + Babel Standalone (in-browser, no build step)              |
| Config   | `dotenv` — credentials stored in a local `.env`                      |

There is **no build pipeline** — JSX is compiled in the browser by Babel Standalone, which keeps the project trivial to run and hack on.

---

## Getting started

### Prerequisites

- **Node.js** (16+ recommended)
- An **Azure DevOps Personal Access Token (PAT)** with:
  - **Code** → Read & Write
  - **Pull Request** → Read & Write

### Install & run

```bash
git clone <your-repo-url>
cd uat-prod-merge
npm install

# start the server
npm start
# or, with auto-reload during development:
npm run dev
```

Then open **http://localhost:3000**.

The default port is `3000`; override it with the `PORT` environment variable.

### Connect

On first run you'll be prompted for your connection details (later editable via **Settings**):

| Field             | Value                                                              |
| ----------------- | ----------------------------------------------------------------- |
| Organization URL  | `https://dev.azure.com/<org>` &nbsp;_(do **not** include project)_ |
| Project           | Your Azure DevOps project name                                    |
| Repository        | The Git repository name                                           |
| Personal Access Token | A PAT with the scopes listed above                            |

Click **Test connection**, then **Save**. Credentials are written to a local `.env` file and are never sent anywhere except the Azure DevOps REST API.

---

## Configuration

Settings are persisted to `.env` in the project root:

```env
AZURE_ORG_URL=https://dev.azure.com/your-org
AZURE_PROJECT=YourProject
AZURE_REPO=YourRepo
AZURE_PAT=your-personal-access-token
PORT=3000
```

>  Use [`.env.example`](.env.example) as a template.


## License

Licensed under the **Apache License 2.0** — see [`LICENSE`](LICENSE).

```
Copyright 2026 Balkar Singh

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0
```
