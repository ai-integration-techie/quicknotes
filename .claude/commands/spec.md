---
description: Draft a testable spec.md from intent.md (Stage 2) — delegates to spec-agent
argument-hint: <slug>
---

Manual-mode entry point for this stage. The stage contract itself lives
in `.claude/agents/spec-agent.md` — don't duplicate or override it here.

Arguments: $ARGUMENTS

1. Invoke the `spec-agent` subagent (Agent tool) with the slug.
2. Read the `## Result` block it returns.
   - `outcome: needs_input`, or any `open_questions` other than "none":
     put the questions to the user, then re-invoke `spec-agent` with the
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

Next step: a human (Product Owner) reviews `spec.md`, resolves its open questions, and sets `Status: approved`. Then `/plan <slug>`.
