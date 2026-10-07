# Intent: Deploy QuickNotes to GitHub Pages

- Status: draft
- Slug: pages-deploy
- Jira: none
- Owner: AITechie
- Date: 2026-10-06

## Problem
QuickNotes builds and passes its quality gate, but nobody can open it
anywhere except on a developer machine. AITechie wants to use it as a daily
personal tool (the charter's adoption metric is 4 weeks of daily use), and
that can't start until the app lives at a stable web address that can be
opened from any of AITechie's browsers and devices.

Today, getting the app in front of a browser means cloning the repo,
installing dependencies and running a local server. Every change to main
would need that repeated by hand. This is felt by AITechie, the only user,
on every change.

## Why now
- It is second in the charter's feature breakdown, right after
  `project-foundation`, which has now shipped.
- Every later feature (storage, notes, search, theme, offline) should be
  checked in the real hosted environment as it lands, not only locally.
  Problems specific to the hosted address (for example the app being served
  from a `/quicknotes/` sub-path instead of the site root) are cheapest to
  catch while the app is still an empty shell.
- `pwa-offline` depends on the app being served from a real HTTPS address.
- Waiting means features pile up untested in the place they will actually
  run.

## Desired outcome
- When a change lands on main and the full quality gate (`npm run ci`)
  passes on that commit, the latest version of QuickNotes becomes
  available at its public GitHub Pages address without anyone doing
  anything by hand. A commit that fails the gate is never published.
- AITechie can also start a deploy of main by hand ("deploy now"), for
  example to redeploy after a GitHub outage. It follows the same rule:
  nothing is published unless the gate passes.
- The address is `https://ai-integration-techie.github.io/quicknotes/`.
  Opening it shows the same QuickNotes shell as a local production build,
  with styles and scripts loading correctly from that sub-path (no blank
  page, no missing assets).
- A broken or failed deploy is visible to AITechie (for example as a failed
  workflow run on GitHub) and leaves the previously published version in
  place rather than a half-published site.
- The deployed app keeps every charter promise that holds locally: no
  server-side code, no third-party network calls, no data leaving the
  device, and $0 hosting cost.
- Pull requests and pushes to other branches keep getting the existing
  quality-gate check, and do not publish anything.
- The quality-gate rules from `project-foundation` that guard against
  accidental deploys (read-only permissions, no deploy/publish steps in the
  gate workflow, "exactly one workflow file") are updated deliberately so
  they still protect the gate while allowing this one sanctioned deploy
  path, rather than being loosened or deleted.

## Non-goals
- Offline support, service worker, web app manifest or installability
  (`pwa-offline`).
- Any note features (storage, create, list, edit, delete, search) or theme
  work.
- Preview deployments for pull requests or branches.
- Any hosting other than GitHub Pages, and any paid service.
- A custom domain.
- A manual approval step or protected environment before publishing.
- Automated checks against the live URL after a deploy.
- Any rollback mechanism beyond reverting the commit on main.
- Any server, backend, API or edge function.
- Analytics, uptime monitoring, error reporting or any other third-party
  service on the deployed site.
- Release versioning, changelogs or tagged releases.

## Owner decisions (AITechie, 2026-10-06)
These answer the questions raised on the first draft and are inputs to the
spec.
1. **Gating:** deploy only after the full quality gate (`npm run ci`)
   passes on that main commit. Whether the deploy reuses the existing CI
   run's result or runs the gate itself is a technical choice left to the
   Spec and Plan.
2. **Manual trigger:** yes. Add a manual "deploy now" trigger alongside the
   automatic deploy on push to main.
3. **Address:** the default `https://ai-integration-techie.github.io/quicknotes/`.
   No custom domain, so the app is served from the `/quicknotes/` sub-path.
4. **Repository visibility:** confirmed public, so free GitHub Pages is
   within the $0 cost limit.
5. **Deploy approval:** no manual approval step or protected environment
   before publishing.
6. **Rollback:** revert the commit on main and let it redeploy. Nothing
   faster is needed.
7. **Post-deploy verification:** no automated check against the live URL.
   A manual check of the live URL at ship time is enough.
8. **Supported browsers and screen sizes:** already decided in
   `specs/project-foundation/spec.md`: the last 2 versions of Chrome, Edge,
   Firefox, Safari and iOS Safari, and widths from 360px phones to desktop.
   This slug inherits that and doesn't reopen it.

## Ship prerequisite
- The repository's GitHub Pages source must be set to "GitHub Actions".
  This is a one-time owner step at ship time. The orchestrator may do it
  through the GitHub CLI, but only with AITechie's explicit OK in the
  conversation.

## Rough shape (optional)
- Likely a separate GitHub Actions workflow that builds the app and
  publishes it to GitHub Pages using GitHub's own Pages deployment actions,
  with write permission scoped only to that workflow and that job.
- The Vite build will need to know it is served under `/quicknotes/`. The
  local end-to-end and accessibility tests currently assume the site root,
  so the spec will need to say how both keep working.
- None of this is a commitment; the Spec and Plan stages decide.

## Open questions
- None for the owner. One technical choice is left to the Spec and Plan:
  whether the deploy reuses the existing CI run's result or runs
  `npm run ci` itself before publishing.
