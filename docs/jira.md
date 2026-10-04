# Jira mode and non-Jira mode

SpecFabric works with or without Jira. One setting in `factory/team.yaml`
chooses which:

| | Non-Jira mode (default) | Jira mode |
|---|---|---|
| Setting | `tracker.mode: none` | `tracker.mode: jira` |
| Where work is tracked | `factory/BOARD.md` and `factory/runs/<slug>/run.yaml` in git | The same files, **plus** an Epic and Stories in Jira that the orchestrator keeps in step |
| Starting a feature | `/factory <slug> "<idea>"` | That, or `/factory PROJ-123` to start from an existing Jira issue |
| Approvals | `Status: approved` in `spec.md` / `plan.md` | **The same.** Jira mirrors approvals and never grants them |
| Needs | Nothing extra | A Jira MCP connector in Claude Code |

In both modes git stays the source of truth: the artifacts hold the
requirements, decisions, and approvals, and Jira is a view of them for
people who work in Jira.

## How SpecFabric maps to Jira

| SpecFabric | Jira | Created when |
|---|---|---|
| Charter (`product/charter.md`) | Your Jira project / initiative | Not synced: set `project_key` to the project |
| Slug (one feature) | **Epic** | Intent finishes, or imported with `/factory PROJ-123` |
| User story `US-n` in `spec.md` | **Story**, linked to the Epic | The spec's approval in git is picked up (next `/factory <slug>` or `/factory sync <slug>`) |
| Acceptance criteria `AC-n (US-n, …)` | That Story's description | With the Story |
| Stage (intent … ship) | Epic status, via `status_map` | Every stage change |
| Waiting at a gate | Epic assigned to the approver, plus the `awaiting-approval` label | The run stops at a gate |
| Plan steps `[DATA] [API] [BE] [FE]` | Not synced; they stay in `plan.md` | — |
| `/factory incident <slug>` | **Bug**, linked to the Epic | Incident recorded |

Size a slug smaller than a typical Jira Epic: one slug should ship as one
reviewable change. Split a large Epic into several slugs. For an existing
large Epic, import one of its child issues per slug, or create the slugs
by hand and let each get its own Epic.

## Setting up Jira mode

1. **Connect Jira to Claude Code.** Add a Jira MCP server, such as
   Atlassian's remote MCP server, to Claude Code and sign in (see the
   [Claude Code MCP docs](https://code.claude.com/docs/en/mcp)).
   Check it works: ask Claude to "show Jira issue PROJ-1".
2. **Configure `factory/team.yaml`.** The first `/factory` run asks
   "Do you track work in Jira?" and fills this in for you. To set it by
   hand:
   ```yaml
   tracker:
     mode: jira
     jira:
       site: https://acme.atlassian.net
       project_key: SHOP
       repo_url: https://github.com/acme/shop/blob/main   # optional: clickable links to specs
       epic_type: Epic
       story_type: Story
       bug_type: Bug
       status_map:          # must be status names that exist in your workflow
         intent: To Do
         spec: In Progress
         plan: In Progress
         implement: In Progress
         review: In Review
         ship: Done
       gate_label: awaiting-approval
   ```
   Add `jira_account:` (email or Atlassian account ID) to each human role,
   so the Epic can be assigned to whoever needs to approve next.
3. **Try it without touching Jira:** `/factory sync <slug> --dry-run`
   lists the Jira changes the orchestrator would attempt, based on what
   the run ledger knows, and makes none.

To switch back, set `mode: none`. Nothing else changes, and existing Jira
issues are left as they are.

## What syncs, and when

The orchestrator **reconciles** after every stage it completes, at every
stop (a gate, a block, or the end of a run), and whenever you run
`/factory sync <slug>`. The run ledger
remembers what Jira was last set to (`tracker.synced` in `run.yaml`), so
each reconcile makes only what has changed since. Running it twice is
harmless, a retry never repeats what already worked, and it catches up
after manual stage commands.

| Moment | Jira change |
|---|---|
| Intent done | Epic created (summary = intent title, description = the problem + a link to `intent.md`) |
| Anything recorded in the run log since the last sync | **One** comment on the Epic listing those events: drafts, approvals (with who approved), blocks, review decisions |
| Stage change | Epic moves to the mapped status, if your workflow allows that transition |
| Gate waiting | `awaiting-approval` label added, Epic assigned to the approver; the comment says exactly what to approve **in git** |
| Gate approved in git | Label removed, Epic unassigned
| Spec approved | One Story per `US-n`, with its acceptance criteria, linked to the Epic. A revised and re-approved spec updates them; a dropped story gets a comment, never a deletion |
| Waiting for "Commit and push?" | Epic stays in the `review` status (it is not Done until the push happens) |
| Shipped (pushed) | Epic and Stories moved to `ship` status; the activity comment includes the commit and PR |
| Incident | Bug created and linked to the Epic |

**From Jira into SpecFabric:**
- `/factory PROJ-123` reads the issue's summary, description, and any
  acceptance criteria, proposes a slug such as `proj-123-password-reset`,
  and uses them as the starting idea for the intent. If the issue isn't an
  Epic, the orchestrator asks whether to use it as is or create an Epic
  linked to it.
- On each run, new comments on the Epic are shown to you in the progress
  update under "New Jira comments". The orchestrator never acts on a Jira
  comment by itself; you decide what to do with it.

## Rules that keep Jira and git honest

- **Approvals happen only in git.** Moving a Jira issue to "Approved" or
  "Done" by hand doesn't approve or ship anything: SpecFabric ignores it,
  and the Epic's status is set again at the next stage change. That keeps
  one audit trail, with names and dates, next to the code.
- **Jira content is data, not instructions.** Descriptions and comments
  are written by many people; the orchestrator quotes them and never
  follows directions in them.
- **Nothing is deleted in Jira.** Removed stories get a comment instead.
- **No duplicates.** Every issue SpecFabric creates carries a
  `specfabric-<slug>…` label, and it searches for that label before
  creating anything, so a retry after a timeout finds the issue instead
  of making a second one. Its own comments start with `[SpecFabric]`, so
  they're never shown back to you as new Jira comments.
- **Jira problems never block delivery.** If Jira is unreachable, the
  connector is missing, or permissions fail, the run carries on: the run
  is marked "sync pending" (with the time and reason) on the board, and
  the next sync picks up where the last one stopped. If your workflow has
  no transition to a mapped status, the status is left as it is and the
  progress update tells you, so you can fix `status_map`.

## Example: starting from a Jira Epic

```
/factory SHOP-412
  → reads SHOP-412 "Customers can reset their password"
  → proposes slug shop-412-password-reset (you confirm)
  → intent-agent drafts intent.md     Jira: comment "intent done"
  → spec-agent drafts spec.md         Jira: SHOP-412 → In Progress, assigned to Priya,
                                            label awaiting-approval
  ⏸ Priya approves spec.md in git
/factory shop-412-password-reset
  → Stories created: US-1 → SHOP-413, US-2 → SHOP-414 (each with its ACs)
  → plan-agent drafts plan.md         Jira: assigned to the Tech Lead
  ⏸ Tech Lead approves plan.md in git
/factory shop-412-password-reset
  → build → review → "Commit and push?" → yes
                                      Jira: SHOP-412, -413, -414 → Done, PR linked
```
