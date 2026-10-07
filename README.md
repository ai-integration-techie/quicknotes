# QuickNotes

A fast, private notes app that runs entirely in your browser: no account, no server, no tracking.

## Getting started

Prerequisite: Node.js 24 (the version pinned in `.nvmrc`). With nvm, run `nvm use` in the repo.

If `nvm use` refuses to run because your `~/.npmrc` sets `prefix`, either put a Node 24 binary first on `PATH` for the shell (for example `export PATH="$HOME/.nvm/versions/node/<v24>/bin:$PATH"`), or run `nvm use --delete-prefix 24`. Note that `--delete-prefix` removes the `prefix` line from `~/.npmrc` for good, so pick whichever you prefer.

1. `git clone <this repo's URL>` and `cd` into it.
2. `npm install`
3. `npm run dev`
4. Open the local URL printed in the terminal (usually `http://localhost:5173/quicknotes/`). The app is served under `/quicknotes/`, the same path as the live site.

## Scripts

- `npm run dev`: start the Vite development server with hot reload.
- `npm run lint`: run ESLint over all source, test and config files; fails on any error or warning.
- `npm run typecheck`: type-check the whole project with `tsc` (no output files).
- `npm run format`: rewrite files in the Prettier style.
- `npm run format:check`: check formatting with Prettier; fails and lists any unformatted file.
- `npm test`: run the Vitest unit, component and tooling tests once (jsdom, no watch mode).
- `npm run test:a11y`: build, serve the production build and run the Playwright + axe accessibility and layout checks in headless Chromium. Run `npx playwright install chromium` once first.
- `npm run build`: type-check, then write the static production build to `dist/`.
- `npm run preview`: serve the production build from `dist/` locally at `http://localhost:4173/quicknotes/` (run `npm run build` first).
- `npm run ci`: run format check, lint, typecheck, tests, build and the accessibility check in order, stopping at the first failure (the same gate as GitHub Actions).

## Deployment

The app is live at https://ai-integration-techie.github.io/quicknotes/, served by GitHub Pages.

- **Automatic:** every push to `main` runs the `Deploy` workflow. It runs the full gate (`npm run ci`) on that commit and publishes the `dist/` it built only if every check passes.
- **By hand:** in GitHub, open Actions → Deploy → Run workflow and pick branch `main`. A run started on any other branch runs the gate but never publishes.
- **Failures:** if the gate or the publish step fails, the run shows as a failed `Deploy` run on the Actions page and in the commit's checks, and the previous version stays live.
- **Rollback:** revert the bad commit on `main`. The revert deploys through the normal path.
- **One-time setup:** in the repository's Settings → Pages, set Source to "GitHub Actions" before the first deploy.

## How this project is built

This project is built with **SpecFabric**, a spec-driven software factory
for Claude Code: one agent per stage, an orchestrator (`/factory`) that
drives each feature through the line, and a control plane in `factory/`
that shows where every feature is and who it's waiting on. Every stage
handoff is a committed markdown artifact, and a named human gates the
stages that need judgment (charter, spec, plan, ship).

Read [`docs/framework.md`](docs/framework.md) (the method) and
[`docs/factory.md`](docs/factory.md) (the agents and control plane), then
[`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) for the full walkthrough.

### Quick start

```
/factory charter my-product   # greenfield: charter, then one queued run per feature
/factory my-feature "idea"    # intent → spec; stops for Product Owner approval
/factory my-feature           # resume after each approval: plan → build → review → ship
/factory status               # the board
```

Using Jira? Set `tracker.mode: jira` in `factory/team.yaml` (or answer
"yes" on the first `/factory` run) to mirror each feature as an Epic with
Stories. See [`docs/jira.md`](docs/jira.md).

Or one stage at a time: `/charter`, `/intent`, `/spec`, `/plan`,
`/implement`, `/review`, `/ship`, `/incident` (same agents underneath).

### Layout

- `docs/` — `framework.md` (the loop), `factory.md` (agents + control
  plane), `USER_GUIDE.md` (walkthrough + command reference)
- `templates/` — artifact templates + `team.yaml` / `run.yaml`
- `.claude/agents/` — one agent per stage
- `.claude/commands/` — `/factory` + one command per stage
- `factory/` — control plane: `team.yaml`, `runs/<slug>/run.yaml`, `BOARD.md`
  (created on first `/factory` run)
- `product/charter.md` — greenfield only
- `specs/<slug>/` — one directory per feature

---

The framework files in this project (`CLAUDE.md`, `docs/`, `templates/`,
`.claude/`) come from SpecFabric, Copyright (c) 2026 SpecFabric
contributors, released under the MIT License (full text in
`docs/SPECFABRIC_LICENSE`; your own project can use any license). SpecFabric is not
affiliated with or endorsed by Anthropic; "Claude" and "Claude Code" are
trademarks of Anthropic, PBC.
