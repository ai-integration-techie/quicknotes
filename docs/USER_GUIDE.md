# SpecFabric user guide: starting a project

This walks through using the framework end to end, for both a **greenfield**
start (brand-new product, empty repo) and a **brownfield** start (adding a
feature or initiative to an existing codebase). Read `docs/framework.md`
first if you haven't — this guide assumes you know the Intent → Spec → Plan
→ Implement → Review → Ship loop it describes.

Two levels are in play:

- **Charter** (`product/charter.md`) — once per product. Answers "why does
  this exist." Only used on a greenfield start, or when kicking off a large
  new initiative inside an existing product.
- **Intent → Spec → Plan → Implement → Review → Ship** — once per feature,
  under `specs/<slug>/`. This is the loop you'll run over and over, in both
  greenfield and brownfield projects.

All commands below are Claude Code slash commands, run inside a Claude Code
session at the repo root.

There are two ways to drive the loop, and they use the same stage agents
underneath, so you can mix them freely:

- **Factory mode** — `/factory <slug>` runs stage after stage on its own,
  keeps the control plane (`factory/`) updated, and stops only at human
  gates. Covered in [§0](#0-factory-mode-quick-start). Use this by default.
- **Manual mode** — one command per stage (`/intent`, `/spec`, ...). The
  walkthroughs in §2–§3 use it because it shows each stage explicitly;
  every step there has a factory-mode equivalent.

---

## 0. Factory mode quick start

After [§1](#1-get-the-framework-into-your-project):

```
/factory charter task-tracker     # greenfield only: charter-agent drafts product/charter.md
                                  # → you review it and set Status: approved
/factory charter task-tracker     # → orchestrator queues one run per feature slug
/factory task-crud "add, list, complete, delete tasks"
                                  # → intent-agent, then spec-agent; stops at the spec gate
                                  # → Product Owner reviews spec.md, sets Status: approved
/factory task-crud                # → plan-agent; stops at the plan gate
                                  # → Tech Lead reviews plan.md, sets Status: approved
/factory task-crud                # → build-agent (code + tests) → review-agent
                                  #   (changes requested loops back to build, max 2x)
                                  # → release-agent drafts the commit; asks "Commit and push?"
yes                               # → pushed; run marked done
/factory status                   # the board: every run, its stage, who it's waiting on
```

Brownfield is the same minus the charter lines: start at
`/factory <slug> "<idea>"`.

What you'll see at every stop:

```
SpecFabric · task-crud · spec → awaiting_approval
Done this run: intent (specs/task-crud/intent.md), spec drafted (specs/task-crud/spec.md)
Waiting on: Product Owner (Priya) — review and set Status: approved in specs/task-crud/spec.md
Open questions for them: Should titles be unique?
Resume with: /factory task-crud
```

On first run the orchestrator creates `factory/team.yaml` and asks for the
names behind four roles — **Product Owner** (charter + spec gates), **Tech
Lead** (plan gate), **Release Manager** (ship gate), **On-call**
(incidents). Agents are *Responsible* for each stage; the named human is
*Accountable* for its gate. `factory/BOARD.md` is the one page to look at
for "where is everything." See [`docs/factory.md`](factory.md) for the
architecture and ledger format.

### Jira or no Jira

The orchestrator also asks "Do you track work in Jira?" on that first run.

- **No (non-Jira mode, the default):** everything above is all there is.
  Work is tracked in `factory/BOARD.md` and the run ledgers in git.
- **Yes (Jira mode):** each feature also gets a Jira Epic, and each user
  story in its spec becomes a Jira Story once the spec is approved. Status,
  assignee, and comments follow the run. You can start from an existing
  issue with `/factory PROJ-123`, and update Jira on demand with
  `/factory sync <slug>` (add `--dry-run` to preview). Approvals still
  happen only in git.

Jira mode needs a Jira MCP connector in Claude Code. Setup, the mapping,
and the rules are in [`docs/jira.md`](jira.md).

---

## 1. Get the framework into your project

Both options below start from `project-template/` in the SpecFabric
repo — a self-contained starter kit with no repo-specific content (no
examples). It already contains `CLAUDE.md`, `docs/`, `templates/`,
`.claude/agents/`, `.claude/commands/`, and an empty `factory/` control
plane — nothing to assemble by hand.

### Option A — new (greenfield) repo

```bash
git clone <this-repo-url> specfabric
mkdir my-new-product && cd my-new-product
git init
cp -r ../specfabric/project-template/. .
rm -f product/.gitkeep specs/.gitkeep factory/runs/.gitkeep   # real content will replace these
```

Edit `README.md` to describe your actual product, then make your first
commit:

```bash
git add -A
git commit -m "Start my-new-product from SpecFabric"
```

You now have `docs/`, `templates/`, `.claude/agents/`, `.claude/commands/`,
`factory/`, and `CLAUDE.md` in place. Go to [§2 Greenfield walkthrough](#2-greenfield-walkthrough).

### Option B — existing (brownfield) repo, adopting the framework

From a checkout of this framework repo, copy `project-template/`'s
pieces into your existing project:

```bash
cd my-existing-repo
git checkout -b adopt-specfabric

SF=/path/to/specfabric/project-template
cp -r $SF/templates ./templates
mkdir -p .claude/commands .claude/agents factory/runs docs
cp $SF/.claude/commands/*.md .claude/commands/
cp $SF/.claude/agents/*.md .claude/agents/
cp $SF/docs/framework.md $SF/docs/factory.md $SF/docs/USER_GUIDE.md docs/
```

If you already have `.claude/commands/` or `.claude/agents/`, copy files
individually and check for name collisions first.

Fold the "Operating rules" section of `project-template/CLAUDE.md` into
your project's existing `CLAUDE.md` (create one if you don't have it —
`project-template/CLAUDE.md` is ready to copy verbatim as a starting
point).

```bash
git add -A
git commit -m "Adopt SpecFabric"
git push -u origin adopt-specfabric
```

Open a PR as you normally would. Once merged, go to
[§3 Brownfield walkthrough](#3-brownfield-walkthrough).

---

## 2. Greenfield walkthrough

Worked example: starting a new product called "task tracker."

### Step 1 — Charter the product

```
/charter task-tracker
```

Claude interviews you: vision, target users, success metrics, v1 scope,
non-goals, constraints. It writes `product/charter.md` with
`Status: draft` and a proposed **feature breakdown**, e.g.:

```
- auth: email/password sign-up and login
- task-crud: create/list/complete/delete tasks
- task-sharing: share a task list with another user
```

**You act:** open `product/charter.md`, adjust the feature list if needed,
and fill in the `## Approval` section. This is a real gate — Claude will
not set `Status: approved` itself.

```bash
git add product/charter.md
git commit -m "Approve task-tracker charter"
```

### Step 2 — Run the feature loop for the first slug

Pick the first feature from the charter's breakdown — usually the one
everything else depends on (here, `auth`).

```
/intent auth
```
Claude interviews you about the `auth` problem/outcome specifically and
writes `specs/auth/intent.md`.

```
/spec auth
```
Claude drafts `specs/auth/spec.md`: numbered requirements and testable
acceptance criteria. **You act:** read it, resolve any "Open questions,"
edit `Status: approved` and fill `## Approval`.

```
/plan auth
```
Claude explores the (still mostly empty) codebase, picks a concrete
technical approach — e.g. which auth library, where routes live — and
writes `specs/auth/plan.md`. **You act:** review and approve it the same
way.

```
/implement auth
```
Claude writes the code and tests per the approved plan, runs the test
suite, and stops without committing.

```
/review auth
```
Claude checks the diff against every acceptance criterion in
`specs/auth/spec.md`, reviews the code itself for bugs/security/
simplification, and writes `specs/auth/review.md` with a decision.

```
/ship auth
```
Once review says `approve`, Claude commits (and pushes/opens a PR per
your repo's convention), after confirming with you first.

### Step 3 — Repeat for each remaining feature

```
/intent task-crud
/spec task-crud
/plan task-crud
/implement task-crud
/review task-crud
/ship task-crud
```
...then `task-sharing`, and so on. Features can be run one at a time, or
in parallel across separate branches/sessions once they don't depend on
each other's unshipped work.

### Step 4 — Close the loop when something breaks

```
/incident task-crud
```
Claude writes `specs/task-crud/incident.md` (timeline, impact, root
cause). If the root cause is a gap the spec/plan didn't cover, Claude
will suggest — and can start — a fresh `/intent` for the fix, which is
how the loop feeds back into itself.

---

## 3. Brownfield walkthrough

Same feature loop as greenfield — `/intent` → `/spec` → `/plan` →
`/implement` → `/review` → `/ship` — with three differences:

1. **Skip `/charter`** unless you're kicking off a genuinely large new
   initiative inside the existing product (e.g., "add a mobile app" to a
   web-only product). For a normal feature or fix, start directly at
   `/intent`.
2. **`/plan`'s exploration step matters more.** It reads your actual
   codebase before proposing an approach — for an established project
   this is where existing conventions, layers, and constraints get
   discovered and respected. Skim the "Approach" and "Files/components
   touched" sections of the resulting `plan.md` closely; this is where a
   plan most often needs correcting in a brownfield repo (Claude proposing
   a new pattern where an existing one already covers it, for instance).
3. **Spec constraints should name what already exists** — e.g. "must not
   require a schema migration," "must use the existing `gateway/`
   middleware chain" — so the plan is scoped against reality, not a blank
   slate. The SpecFabric repo's worked example does exactly this: see
   `examples/001-api-rate-limiting/` there for a filled-in intent → spec → plan adding a feature to an existing
   API gateway.

Concretely:

```
/intent api-rate-limiting
/spec api-rate-limiting      # note constraints tied to existing infra
/plan api-rate-limiting      # Claude explores the real codebase first
/implement api-rate-limiting
/review api-rate-limiting
/ship api-rate-limiting
```

Read through the SpecFabric repo's `examples/001-api-rate-limiting/`
(`intent.md`, `spec.md`, `plan.md`) before your first brownfield feature — it's the reference for
how much detail belongs at each stage.

### Full-stack features: where UX and frontend/backend design go

There's no separate design stage. Design is split across the artifacts
you already approve:

| Decision | Where | Who approves | What to check |
|---|---|---|---|
| Tech stack, design system | `product/charter.md` | Product Owner | Decided once; every plan builds on it |
| User stories and UX (flows, screens, states, copy, accessibility) | `spec.md` → User stories, User experience | Product Owner (Design Lead consulted) | Every screen has empty/loading/error/success states; every story has an acceptance criterion |
| API contract, data model, backend, frontend | `plan.md` → Architecture | Tech Lead | The contract is complete enough to build both halves against; every spec screen maps to a component; steps are tagged `[DATA] [API] [BE] [FE]` |
| Build order | `build-agent` | — (tests must pass) | Contract-first: data + API → backend → frontend |
| Conformance | `review.md` | Tech Lead | UX and API contract conformance sections, plus the per-criterion checklist |

A backend-only feature writes "N/A" in the spec's UX section. A CLI or
API feature still has UX: its commands, output, and error messages.

---

## 4. Running multiple features at once

Each `specs/<slug>/` is self-contained, so:

- Give each feature its own branch, named after the slug.
- Run `/intent`/`/spec`/`/plan` for independent features in parallel
  (separate Claude Code sessions or separate people).
- `/ship` each one via its own PR, same as any other change in your repo.
- In factory mode, each slug gets its own `factory/runs/<slug>/run.yaml`;
  `/factory status` shows them all side by side, sorted so blocked and
  awaiting-approval runs come first.
- If two features touch the same code, note the dependency in each
  spec's "Constraints" section and sequence their `/plan` stages so the
  second one explores the first one's *already-implemented* code, not
  its plan.

---

## 5. Command reference

| Command | Stage | Reads | Writes | Requires human approval before next stage |
|---|---|---|---|---|
| `/factory <slug> [idea]` | Orchestrator — runs the stages below in order | `run.yaml` + artifact `Status:` lines | artifacts (via agents), `factory/runs/<slug>/run.yaml`, `factory/BOARD.md` | Stops at every gate |
| `/factory charter <product>` | Orchestrator — charter, then queues feature runs | `product/charter.md` | charter (via agent), one run per slug | Yes |
| `/factory status` | Orchestrator — show the board | all `run.yaml` | `factory/BOARD.md` | — |
| `/factory incident <slug>` | Orchestrator — incident | — (interview) | `incident.md`, run event (+ Jira Bug in Jira mode) | Feeds a new run |
| `/factory PROJ-123` | Orchestrator — start a feature from a Jira issue (Jira mode) | the Jira issue | new run, then the feature flow | Same gates as `/factory <slug>` |
| `/factory sync <slug> [--dry-run]` | Orchestrator — update Jira now (Jira mode) | `run.yaml`, artifacts | Jira Epic/Stories/Bugs, `run.yaml` tracker block | — |
| `/charter <product>` | 0 — Charter (greenfield only) | — | `product/charter.md` | Yes |
| `/intent <slug>` | 1 — Intent | — (interview) | `specs/<slug>/intent.md` | No (informal direction-setting) |
| `/spec <slug>` | 2 — Spec | `intent.md` | `specs/<slug>/spec.md` | **Yes — required** |
| `/plan <slug>` | 3 — Plan | `spec.md` + codebase | `specs/<slug>/plan.md` | **Yes — required** |
| `/implement <slug>` | 4 — Implement | `plan.md` | code + tests | Tests pass + code exists |
| `/review <slug>` | 5 — Review | `spec.md` + diff | `specs/<slug>/review.md` | **Yes — required to ship** |
| `/ship <slug>` | 6 — Ship | `review.md` | commit/PR | Confirm before push |
| `/incident <slug>` | Loop closure | — (interview) | `specs/<slug>/incident.md` | Feeds a new `/intent` |

Each stage command delegates to its agent: `/charter` → `charter-agent`,
`/intent` → `intent-agent`, `/spec` → `spec-agent`, `/plan` → `plan-agent`,
`/implement` → `build-agent`, `/review` → `review-agent`, `/ship` →
`release-agent`, `/incident` → `incident-agent`.

---

## 6. Directory layout reference

```
my-project/
├── CLAUDE.md                    # operating rules (stage gating, approval discipline)
├── docs/
│   ├── framework.md              # the method
│   ├── factory.md                # agents, orchestrator, control plane
│   └── USER_GUIDE.md             # this file
├── templates/                    # blank artifact templates
│   ├── charter.md
│   ├── intent.md
│   ├── spec.md
│   ├── plan.md
│   ├── review.md
│   ├── incident.md
│   ├── team.yaml                 # control-plane templates
│   └── run.yaml
├── .claude/agents/                # one agent per stage
│   ├── charter-agent.md  intent-agent.md  spec-agent.md  plan-agent.md
│   └── build-agent.md    review-agent.md  release-agent.md  incident-agent.md
├── .claude/commands/              # slash commands
│   ├── factory.md                 # the orchestrator
│   ├── charter.md
│   ├── intent.md
│   ├── spec.md
│   ├── plan.md
│   ├── implement.md
│   ├── review.md
│   ├── ship.md
│   └── incident.md
├── factory/                       # control plane
│   ├── team.yaml                  # humans + agents, RACI per stage
│   ├── BOARD.md                   # every run at a glance
│   └── runs/
│       └── task-crud/run.yaml     # per-feature ledger + event log
├── product/
│   └── charter.md                 # once per product (greenfield)
└── specs/
    ├── auth/
    │   ├── intent.md
    │   ├── spec.md
    │   ├── plan.md
    │   └── review.md
    ├── task-crud/
    │   └── ...
    └── task-crud-incident-2026-09-01/   # optional, if not tied to one slug
        └── incident.md
```

---

## 7. FAQ

**What does "approve" actually mean — is there a button?**
No — it's editing the file. Open `spec.md` (or `plan.md`, `charter.md`),
change `Status: draft` to `Status: approved`, and fill in the `##
Approval` section with your name and date. Claude will not do this step
for you; it's the point where a human is required to look.

**Do I have to use `/charter` for a brownfield project?**
No. Use it only when starting something greenfield, or when a brownfield
change is really a new sub-product (e.g., a new mobile client). A normal
feature or bugfix starts at `/intent`.

**What if I realize mid-implementation that the plan is wrong?**
Stop. Tell Claude (or it should tell you, per `CLAUDE.md`'s rules) — update
`plan.md` (and `spec.md` if the requirements themselves were wrong)
first, then continue. Don't let code silently diverge from the artifact
that's supposed to describe it.

**Can I skip stages for a trivial change (e.g., a typo fix)?**
Use your judgment — the framework is for work worth specifying. A
one-line typo fix doesn't need `specs/<slug>/`. A rule of thumb: if you'd
want a PR description longer than two sentences, it's worth an `/intent`.

**How do I enforce the approval gates automatically instead of relying on
discipline?**
Not built into this framework yet — the slash commands check `Status:`
fields before proceeding, but nothing stops someone from hand-editing
`Status: approved` without real review, or committing code without
running `/ship`. If you want harder enforcement, a CI check that greps
`specs/**/spec.md` and `plan.md` for `Status: approved` before allowing a
merge on files under that slug's paths would close that gap — not
included here since it depends on your CI system.
