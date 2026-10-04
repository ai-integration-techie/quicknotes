# The SpecFabric method

A practical implementation of the AI-native SDLC loop described in
["The AI-Native SDLC playbook"](https://claude.com/blog/the-ai-native-sdlc-playbook):
software development where AI agents are the primary producers of code and
humans act as specifiers, reviewers, and orchestrators. The center of gravity
shifts from writing code to writing and approving the artifacts that steer
the AI that writes the code.

## The core idea

Traditional SDLC hands work between people at ambiguous, informal boundaries
("let's sync on Slack"). The SpecFabric loop instead hands work between *stages*,
and every handoff is a **versioned, committed artifact** — a markdown file
in git, not a meeting or a Slack thread. Each stage reads the artifact the
previous stage produced, and writes the artifact the next stage will read.
That's what makes the loop automatable and auditable: an agent (or a human)
can pick up any stage cold, because the full context is in the file.

```
Charter (product/charter.md)   — once per product, greenfield only
  │  (human approves vision + v1 feature breakdown)
  ▼
Idea
  │  (human + Claude, conversational)
  ▼
Intent    intent.md      — the problem, why now, desired outcome, non-goals
  │  (human approves scope)
  ▼
Spec      spec.md        — user stories, requirements, UX, acceptance criteria
  │  (human approves the spec — this is the main judgment gate)
  ▼
Plan      plan.md        — approach, architecture (API/data/backend/frontend), steps, risks
  │  (human approves the approach before code is written)
  ▼
Implement  diff + tests  — Explore → Plan → Implement → Commit inner loop
  │
  ▼
Review    review.md + PR — spec conformance check, findings, human sign-off
  │
  ▼
Ship      merged commit  — the loop's output becomes the next loop's input
  │
  ▼
Operate → incident.md (if something breaks) → feeds a new Intent
```

It is a **loop**, not a line: incidents, user feedback, and follow-up ideas
from the "Operate" end become the next "Intent" at the top. Nothing here is
sequential-and-done — specs get amended, plans get re-cut mid-implementation,
and that's fine as long as the artifact is updated, not just the code.

## Roles: what stays human

AI produces the volume; humans hold the judgment calls. Concretely, a human
must explicitly approve at three points, and the framework treats skipping
these as a defect, not a shortcut:

1. **Spec approval** — the requirements and acceptance criteria are correct
   and complete enough to build against. This is the highest-leverage
   review in the loop: an error here is expensive downstream, and cheap to
   catch here.
2. **Plan approval** — the technical approach is sound before code exists.
3. **Ship approval** — the diff actually satisfies the spec, and the change
   is safe to merge.

Everything else — drafting the intent from a conversation, writing the
first-pass spec, exploring the codebase, writing the plan, writing the code
and tests, drafting the PR description — is AI-first. The human's job is to
read, question, and gate, not to author from scratch.

## Artifacts

| Stage | File | Written by | Approved by |
|---|---|---|---|
| Intent | `specs/<slug>/intent.md` | Claude, interviewing the human | Human (informally — sets direction) |
| Spec | `specs/<slug>/spec.md` — user stories, requirements, UX, acceptance criteria | Claude, from the intent | Human (explicit sign-off required) |
| Plan | `specs/<slug>/plan.md` — approach, per-layer architecture, steps, test strategy | Claude, from the approved spec + codebase exploration | Human (explicit sign-off required) |
| Implementation | code diff + tests | Claude, from the approved plan | Tests + human review |
| Review | `specs/<slug>/review.md` | Claude, checking diff against spec | Human |
| Incident (if needed) | `specs/<slug>/incident.md` | Claude, post-mortem style | Human |

Templates for each of these live in [`templates/`](../templates/).

## Where design lives

UX design and frontend/backend design aren't separate stages; each sits
in the artifact whose approver is best placed to judge it.

```
Charter  Tech stack & architecture, Design system   once per product   Product Owner
Spec     User stories, User experience               what users see     Product Owner (Design Lead consulted)
           (flows, screens, states, copy, a11y)
Plan     Architecture: API contract | Data model |   how it's built     Tech Lead
           Backend | Frontend; steps tagged
           [DATA] [API] [BE] [FE] [TEST]
Implement  contract-first: data + API → backend → frontend, tests per layer
Review     spec conformance + UX conformance + API contract conformance
```

The API contract in `plan.md` is the boundary both halves build
against, so the frontend never guesses what the backend returns. A
backend-only feature marks its UX section "N/A"; for a CLI or API, the
commands, output, and error messages *are* the UX.

## Why gate on the spec, not the code

Reviewing a diff tells you whether the code does what the author intended.
It doesn't tell you whether the author intended the right thing. Under this
framework, the correctness question ("is this what we should build?") is
answered and approved *before* implementation, in `spec.md`. Code review
then only has to answer "does the diff match the spec?" — a much narrower,
more mechanical question that AI can help with directly (see
`/review`).

This is also why a spec's acceptance criteria should be written as
verifiable statements, not prose: they become the test plan.

## From method to factory

Because every stage reads one artifact and writes the next, each stage
can be owned by a dedicated agent with a narrow contract
(`.claude/agents/`), and a single orchestrator (`/factory`) can drive a
feature through all of them — stopping at exactly the human gates above,
never past them. A control plane in the repo (`factory/`) records who is
on the team (humans and agents), where every run is, and what it's
waiting on. See [`factory.md`](factory.md).

## Using this in a project

This project already carries the templates, agents, commands,
`CLAUDE.md` rules, and docs. Run `/factory <slug> "<idea>"` (or `/intent <slug>` to drive
stages by hand). See [`USER_GUIDE.md`](USER_GUIDE.md).

See [`CLAUDE.md`](../CLAUDE.md) for the operating rules Claude Code follows
inside a repo that has adopted this framework.
