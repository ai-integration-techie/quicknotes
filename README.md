# QuickNotes

A fast, private notes app that runs entirely in your browser: no account, no server, no tracking.

## Getting started

Prerequisite: Node.js 24 (the version pinned in `.nvmrc`). With nvm, run `nvm use` in the repo.

If `nvm use` refuses to run because your `~/.npmrc` sets `prefix`, either put a Node 24 binary first on `PATH` for the shell (for example `export PATH="$HOME/.nvm/versions/node/<v24>/bin:$PATH"`), or run `nvm use --delete-prefix 24`. Note that `--delete-prefix` removes the `prefix` line from `~/.npmrc` for good, so pick whichever you prefer.

1. `git clone <this repo's URL>` and `cd` into it.
2. `npm install`
3. `npm run dev`
4. Open the local URL printed in the terminal (usually `http://localhost:5173/`).

## Scripts

- `npm run dev`: start the Vite development server with hot reload.
- `npm run lint`: run ESLint over all source, test and config files; fails on any error or warning.
- `npm run typecheck`: type-check the whole project with `tsc` (no output files).
- `npm run format`: rewrite files in the Prettier style.
- `npm run format:check`: check formatting with Prettier; fails and lists any unformatted file.
- `npm test`: run the Vitest unit, component and tooling tests once (jsdom, no watch mode).
- `npm run test:a11y`: build, serve the production build and run the Playwright + axe accessibility and layout checks in headless Chromium. Run `npx playwright install chromium` once first.
- `npm run build`: type-check, then write the static production build to `dist/`.
- `npm run ci`: run format check, lint, typecheck, tests, build and the accessibility check in order, stopping at the first failure (the same gate as GitHub Actions).

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
