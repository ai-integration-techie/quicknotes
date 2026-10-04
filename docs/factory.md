# The SpecFabric factory

[`framework.md`](framework.md) describes the *method*: a loop of stages,
each handing the next a committed artifact, with humans gating the
judgment calls. This document describes the *factory* that runs it: one
agent per stage, an orchestrator that drives the line, and a control plane
that shows where every piece of work is and who it's waiting on.

```
             ┌────────────────────────── /factory (orchestrator, main session) ──────────────────────────┐
  charter ──▶│                                                                                            │
  or idea    │  intent-agent ─▶ spec-agent ─⏸─▶ plan-agent ─⏸─▶ build-agent ─▶ review-agent ─▶ release-agent ─⏸─▶ │──▶ shipped
             │                                        ▲                │                                   │    software
             │                                        └── changes requested (max 2) ──┘                     │
             └───────────┬─────────────────────────────────────────────────────────┬────────────────────────┘
                         │ writes via agents                                        │ records every transition
                         ▼                                                          ▼
               specs/<slug>/intent.md, spec.md,                 factory/team.yaml        (who)
               plan.md, review.md + code + tests                factory/runs/<slug>/run.yaml (where, history)
                                                                factory/BOARD.md         (everything, at a glance)
  ⏸ = human gate, approved by editing the artifact's Status line
```

## The line: stage agents

Each agent is a Claude Code subagent in `.claude/agents/` with one job,
one input artifact, one output artifact, and only the tools that job
needs. Every agent ends its reply with a `## Result` block the
orchestrator parses (`stage`, `artifact`, `outcome`, `open_questions`,
`notes`, plus stage-specific fields).

| Agent | Stage | Reads | Writes | Tools | Refuses when |
|---|---|---|---|---|---|
| `charter-agent` | Charter | human input | `product/charter.md` | Read, Write, Edit, Glob, Grep | — |
| `intent-agent` | Intent | human input, charter | `specs/<slug>/intent.md` | Read, Write, Edit, Glob, Grep | — |
| `spec-agent` | Spec | `intent.md` | `spec.md` (stories, requirements, UX, ACs) | Read, Write, Edit, Glob, Grep | no intent |
| `plan-agent` | Plan | approved `spec.md`, codebase | `plan.md` (API / data / backend / frontend) | + Bash (read-only use) | spec not approved |
| `build-agent` | Implement | approved `plan.md` | code + tests, contract-first | all | plan not approved; tests red |
| `review-agent` | Review | spec, plan, diff | `review.md` (spec, UX, contract conformance) | Read, Write, Glob, Grep, Bash | — (judges, never edits code) |
| `release-agent` | Ship | `review.md` | commit, PR draft | Read, Edit, Glob, Grep, Bash | review not `approve`; no human yes |
| `incident-agent` | Incident | human account, spec/plan, git log | `incident.md` | Read, Write, Edit, Glob, Grep, Bash | — |

**Why agents return questions instead of asking.** Subagents can't hold a
conversation with the human. So an agent drafts what it can and returns
`open_questions`; the orchestrator (or the manual stage command) asks the
human and re-dispatches with the answers. Questions a *draft spec or plan*
records for its approver are surfaced in the gate update instead.

**Why the orchestrator is a command, not an agent.** Subagents can't spawn
subagents. `/factory` runs in the main Claude Code session, which can
dispatch every stage agent and talk to the human.

## The orchestrator loop

`/factory <slug>` on each invocation:

1. Loads (or creates) `factory/runs/<slug>/run.yaml`.
2. **Syncs gates from the artifacts.** The artifact's `Status:` line is
   the source of truth; the ledger mirrors it. A stage waiting on approval
   advances only once a human has set `Status: approved` in the file.
3. Checks the current stage's precondition, dispatches its agent, and
   handles the `## Result`: relays questions, marks `blocked` on failure,
   loops review → build on `changes_requested` (max two rework rounds).
4. Records the transition — stage fields plus one appended event — and
   regenerates `BOARD.md`.
5. At a gate, posts an update naming the accountable human and the exact
   action, and **stops**. Otherwise continues to the next stage.

Hard rules the orchestrator never breaks: it never writes
`Status: approved`; it never commits, pushes, or merges without the
human's explicit yes; a failed stage is `blocked`, never skipped.

Other forms: `/factory charter <product>` drafts the charter and — once
it's approved — queues a `pending` run per feature slug; `/factory status`
prints the board; `/factory incident <slug>` runs the incident agent and
offers a follow-up run if the spec/plan missed something.

## The control plane: `factory/`

Plain files in git, so the history of the factory *is* the git history —
no extra service to run, and every change to state is reviewable.

### `team.yaml` — the development team

Humans and agents on one roster (template:
[`templates/team.yaml`](../templates/team.yaml)):

| Stage | Responsible (does the work) | Accountable (owns the gate) | Gate? |
|---|---|---|---|
| Charter | `charter-agent` | Product Owner | yes |
| Intent | `intent-agent` | Product Owner | no |
| Spec | `spec-agent` | Product Owner (Design Lead consulted on UX, if named) | **yes** |
| Plan | `plan-agent` | Tech Lead | **yes** |
| Implement | `build-agent` | Tech Lead | no (tests must pass) |
| Review | `review-agent` | Tech Lead | no (decision recorded) |
| Ship | `release-agent` | Release Manager | **yes** (confirms push) |
| Incident | `incident-agent` | On-call | no |

The point of the structure: agents are never Accountable. Every gate has a
named person, and the board always says whose desk a run is sitting on.
One person can hold several roles on a small team.

### `runs/<slug>/run.yaml` — the run ledger

One per feature (template: [`templates/run.yaml`](../templates/run.yaml)).
It holds the mode (greenfield/brownfield), current stage, overall status,
`waiting_on`, per-stage `{status, agent, artifact, started, completed}`
plus stage extras (`approved_by`, `tests`, `decision`, `confirmed_by`),
open questions, and an append-only `events` list.

Stage states: `pending → in_progress → awaiting_approval → approved →
done`, or `blocked` with a reason. Non-gated stages go
`in_progress → done`.

### `BOARD.md` — the factory floor

Regenerated on every transition: one row per run (blocked first, then
awaiting approval, in progress, pending, done) with stage, status, who
it's waiting on, and the last event; then the team roster. It's the page
to link in a standup.

### Jira mode (optional)

`team.yaml` has a `tracker` block. With `mode: none` (the default) the
control plane is only the files above. With `mode: jira`, the orchestrator
also **reconciles** each run with Jira at every stop: an Epic per slug, a
Story per approved user story, status and assignee following the stages,
and a Bug per incident. The Jira keys, and a record of what Jira was last
set to, live in the `tracker` block of `run.yaml`. Jira mirrors git and never approves
anything; if Jira is unavailable, the run carries on and the sync is
retried later. Details: [`jira.md`](jira.md).

A filled-in example — one shipped feature and one paused at intent with
an open question — lives in
[`examples/task-tracker-app/factory/`](../examples/task-tracker-app/factory/).

## Running it end to end

```
/factory charter task-tracker        # charter drafted → Product Owner approves product/charter.md
/factory charter task-tracker        # runs queued for task-crud, auth, task-sharing
/factory task-crud                   # intent → spec drafted → stop: Product Owner
                                     #   (approve specs/task-crud/spec.md)
/factory task-crud                   # plan drafted → stop: Tech Lead (approve plan.md)
/factory task-crud                   # build → tests green → review approve →
                                     #   release draft → "Commit and push?" → yes → done
/factory status                      # board
```

Manual stage commands (`/spec`, `/plan`, ...) call the same agents and
append to the same ledger, so you can drop to manual mode for any stage
and pick the run back up with `/factory` afterwards.

## Extending the factory

- **Add a stage** (e.g. a security-review or docs agent): add an agent in
  `.claude/agents/`, a row in the orchestrator's stage table in
  `.claude/commands/factory.md`, a `raci` entry in `team.yaml`, and a
  stage entry in `templates/run.yaml`.
- **Change who gates what:** edit `raci` in `factory/team.yaml`. Removing a
  gate entirely is a process change — write it down in `CLAUDE.md` so it's
  deliberate.
- **Run outside an interactive session:** the stage contracts are plain
  markdown, so the same agents can be driven from the Claude Agent SDK or
  CI; keep the human gates as required PR reviews on the artifact files.
