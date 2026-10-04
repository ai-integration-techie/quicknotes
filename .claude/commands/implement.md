---
description: Implement an approved plan.md — code and tests (Stage 4) — delegates to build-agent
argument-hint: <slug>
---

Manual-mode entry point for this stage. The stage contract itself lives
in `.claude/agents/build-agent.md` — don't duplicate or override it here.

Arguments: $ARGUMENTS

1. Invoke the `build-agent` subagent (Agent tool) with the slug, plus any blocking findings from an existing `review.md` with `changes requested` (that makes this a rework pass).
2. Read the `## Result` block it returns.
   - `outcome: needs_input`, or any `open_questions` other than "none":
     put the questions to the user, then re-invoke `build-agent` with the
     original input plus their answers. Repeat until it returns without
     blocking questions (non-blocking ones can stay recorded in the
     artifact).
   - `outcome: blocked`: tell the user why and stop.
3. Summarize what was written and where.
4. Never set any artifact's `Status:` to `approved` — only a human does.
   If `factory/runs/<slug>/run.yaml` exists, append an event noting this
   manual stage run so the control plane stays accurate. If `factory/team.yaml`
   has `tracker.mode: jira`, end by suggesting `/factory sync <slug>` to
   update Jira.

Next step: `/review <slug>`.
