# <project name>

This project is built with **SpecFabric**, a spec-driven software factory
for Claude Code: one agent per stage, an orchestrator (`/factory`) that
drives each feature through the line, and a control plane in `factory/`
that shows where every feature is and who it's waiting on. Every stage
handoff is a committed markdown artifact, and a named human gates the
stages that need judgment (charter, spec, plan, ship).

Read [`docs/framework.md`](docs/framework.md) (the method) and
[`docs/factory.md`](docs/factory.md) (the agents and control plane), then
[`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) for the full walkthrough.

## Quick start

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

## Layout

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
