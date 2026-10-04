---
description: Commit/push a reviewed change and close out the loop (Stage 6) — delegates to release-agent
argument-hint: <slug>
---

Manual-mode entry point for this stage. The stage contract itself lives
in `.claude/agents/release-agent.md` — don't duplicate or override it here.

Arguments: $ARGUMENTS

1. Invoke the `release-agent` subagent (Agent tool) with the slug and
   `confirmed: no`. It checks `review.md` approves, runs the tests, and
   drafts a commit message / PR description without changing anything.
2. If it returns `blocked`, tell the user why and stop.
3. Show the user the files, branch, and drafted commit message, and ask
   explicitly: "Commit and push?" Do not proceed without a clear yes.
4. On a yes, re-invoke `release-agent` with the slug and `confirmed: yes`.
   Report the commit sha (and PR link if one was opened).
5. If `factory/runs/<slug>/run.yaml` exists, record the ship event and
   who confirmed it. If `factory/team.yaml` has `tracker.mode: jira`, end by
   suggesting `/factory sync <slug>` to close the Epic in Jira.

Next step: watch it in production. If something goes wrong, `/incident <slug>`.
