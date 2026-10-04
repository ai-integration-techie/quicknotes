# SpecFabric — executive summary

## What it is

SpecFabric is a software factory built on Claude Code. A product charter
(new product) or an intent (change to an existing product) goes in;
reviewed, tested, shipped software comes out. Eight specialized AI agents
do the drafting, coding, and checking. An orchestrator moves each feature
down the line. Named people approve the decisions that need judgment. A
control plane in the repository shows where every feature is and whose
desk it's sitting on.

## The alternative: vibe coding

"Vibe coding" is prompting an AI assistant until the code seems to work:
no written requirements, no plan anyone signed off on, and review that
amounts to "it runs." It's fast at the start, and for a prototype or a
throwaway script it's often the right call. The trouble starts when that
code has to be maintained, audited, extended by someone else, or trusted
in production.

## Side by side: vibe coding, traditional SDLC, SpecFabric

Vibe coding is fast but uncontrolled; traditional SDLC is controlled but
paced by people at every handoff. SpecFabric keeps the SDLC's gates and
paper trail, and has agents do the drafting, building, and checking
between them.

| | Vibe coding | Traditional SDLC | SpecFabric |
|---|---|---|---|
| **Who produces the work** | One developer prompting ad hoc | People at every stage: analysts, architects, developers, QA | Agents at every stage; people at the gates |
| **Requirements** | Live in a chat history, if anywhere | PRDs and tickets written by hand; drift from the code over time | Numbered requirements and testable acceptance criteria, approved by a named Product Owner, versioned next to the code |
| **Design decisions** | Made silently by the model, mid-prompt | Design docs and architecture reviews; often skipped under deadline or left stale | Approach, trade-offs, risks, and rollback, approved by a Tech Lead before code exists |
| **Definition of done** | "It seems to work" | Hand-written test plans and QA cycles; coverage varies by team | Every acceptance criterion maps to a test; a review agent records each as met or not met |
| **Who approved what** | Unclear | Spread across tickets, email, and meetings | Name and date recorded in each artifact; an event log per feature |
| **Visibility** | Ask the developer | Status meetings and boards updated by hand | One board, updated on every stage change: each feature, its stage, who it's waiting on |
| **When something breaks** | Fix it and move on | Post-mortem, often disconnected from the original requirements | Incident record asks "did the spec or plan miss this?" and feeds a new intent |
| **Handover** | Reverse-engineer intent from code | Docs exist but are often out of date | Intent, spec, plan, and review sit next to the code and are updated with it |
| **Speed to first demo** | Fastest: hours | Slowest: weeks of handoffs between people | Hours to days: agents draft each stage, people only approve |
| **Speed to the 20th feature** | Slows as unwritten assumptions collide | Steady, but throughput scales with headcount | Holds up: each feature starts from written, approved context, and throughput scales with review capacity |
| **Cost of a wrong turn** | Found in code review or production | Found in QA or UAT, after the build | Mostly found at spec review, where a fix is an edit to a paragraph |

Against a traditional SDLC, SpecFabric keeps what works (written
requirements, design review, testing, sign-off, post-mortems) and removes
what slows it down: the hand-offs between people, documents that go
stale, and status tracked by hand. People keep the same accountability;
agents take on the drafting and the legwork.

## Benefits for the business

1. **Faster delivery without losing control.** AI writes the volume:
   specs, plans, code, tests, review notes. People spend their time on
   the three decisions that matter: is this the right thing, is this the
   right approach, is it safe to ship.
2. **Fewer expensive mistakes.** The main review happens at the spec,
   before code exists. Catching a wrong requirement there costs an edit;
   catching it after release costs a rebuild, and sometimes a customer.
3. **Auditability by default.** Every requirement, decision, approval, and
   deviation is a versioned file in git, with a name and date. That helps
   in regulated environments, post-incident reviews, and due diligence.
4. **Predictable process.** Every feature goes through the same stages
   with the same gates. Quality doesn't depend on which engineer, or which
   prompt, happened to build it.
5. **Lower key-person risk.** The knowledge lives in the artifacts, not in
   one developer's head or chat history. Anyone, human or agent, can pick
   up a feature at any stage.
6. **Continuous improvement.** Production incidents become new intents.
   The process learns from what went wrong instead of just patching it.
7. **No new platform to buy or run.** It's plain markdown and YAML in your
   existing repository, driven by Claude Code. You can adopt it one
   feature at a time on an existing codebase.

## Honest trade-offs

- **More upfront effort per feature.** Writing and approving a spec and
  plan takes time. For spikes, prototypes, and throwaway work, vibe coding
  is still the right tool, and SpecFabric doesn't forbid it.
- **The gates are only as good as the reviewers.** An approval given
  without reading the spec removes the benefit. The process makes rubber
  stamps visible; it doesn't prevent them.
- **Tests prove the criteria, not the criteria's completeness.** A spec
  that misses a requirement produces code that misses it too. The incident
  loop exists to close those gaps over time.

## Skills the team will need

The work moves from writing code to specifying, reviewing, and steering.
One person can hold several roles on a small team.

| Role | What they do in SpecFabric | Key skills |
|---|---|---|
| **Product Owner** | Gates charter and spec | Writing precise, testable requirements; saying what's out of scope; turning customer problems into acceptance criteria (Given/When/Then) |
| **Tech Lead / Architect** | Gates plan; owns review quality | System design; spotting risky approaches in a written plan; judging trade-offs; reading AI-generated code critically |
| **Engineers** | Review and correct agent output; take over stages when needed | Code review over code writing; testing strategy; debugging code they didn't write; knowing when to stop an agent and fix the plan |
| **Release Manager** | Gates ship | Change management, release risk, rollback planning, CI/CD |
| **On-call / SRE** | Owns incidents | Root-cause analysis (beyond the trigger); writing post-mortems that find spec or plan gaps |
| **Factory owner (AI enablement)** | Maintains agents, commands, templates, and gate policy | Claude Code configuration (subagents, slash commands, `CLAUDE.md`); prompt and contract design; tuning the line when a stage underperforms |

Skills everyone needs:

- **Specification thinking:** saying exactly what "done" means before
  work starts.
- **Critical review of AI output:** trusting nothing that isn't tied to a
  test or an approved artifact.
- **Git fluency:** the artifacts, approvals, and history all live there.
- **Judgment about when to use the factory:** full process for production
  features, a lighter touch for spikes.

## Getting started

1. Pick one real, medium-sized feature on an existing codebase.
2. Copy `project-template/` into the repo and name the four roles in
   `factory/team.yaml`.
3. Run it through `/factory <slug> "<idea>"`, with people approving at
   each gate.
4. Compare it with a similar past feature: rework, review cycles, defects,
   and how easy the next person finds it to pick up.
5. Expand to a team, then to new products via `/factory charter`.
