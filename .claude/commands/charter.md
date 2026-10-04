---
description: Define a new product charter and break it into feature slugs (greenfield entry point) — delegates to charter-agent
argument-hint: <product name>
---

Manual-mode entry point for this stage. The stage contract itself lives
in `.claude/agents/charter-agent.md` — don't duplicate or override it here.

Arguments: $ARGUMENTS

1. Invoke the `charter-agent` subagent (Agent tool) with the product name and everything the user has told you about the product so far (vision, users, success metrics, v1 scope, deferrals, constraints). If the user has given you almost nothing, ask those questions first — one round, not an interrogation.
2. Read the `## Result` block it returns.
   - `outcome: needs_input`, or any `open_questions` other than "none":
     put the questions to the user, then re-invoke `charter-agent` with the
     original input plus their answers. Repeat until it returns without
     blocking questions (non-blocking ones can stay recorded in the
     artifact).
   - `outcome: blocked`: tell the user why and stop.
3. Summarize what was written and where.
4. Never set any artifact's `Status:` to `approved` — only a human does.
   If `factory/runs/<slug>/run.yaml` exists, append an event noting this
   manual stage run so the control plane stays accurate.

Next step: once a human sets the charter's `Status: approved`, run `/intent <slug>` for the first feature slug (or `/factory charter <product>` to queue them all).
