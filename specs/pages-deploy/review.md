# Review: Deploy QuickNotes to GitHub Pages

- Slug: pages-deploy
- Spec: [spec.md](./spec.md) (Approved, AITechie, 2026-10-06)
- Plan: [plan.md](./plan.md) (Approved, AITechie, 2026-10-06)
- PR: none yet (changes are uncommitted on `main`; a branch and PR come next)
- Date: 2026-10-06
- Iteration: 1

## Verification run by the reviewer
- `npm run ci` on Node v24.18.0 (`~/.nvm/versions/node/v24.18.0/bin` first on `PATH`, `~/.npmrc` not edited). No stale server was listening on port 4173 beforehand. Exit 0.
  - format:check, lint, typecheck: clean
  - Vitest: 15 files, 93/93 passed
  - build: `dist/index.html`, `dist/assets/index-<hash>.js`, `dist/assets/index-<hash>.css`
  - Playwright: 23/23 passed
- `git diff --exit-code HEAD -- .github/workflows/ci.yml`: no diff (`ci.yml` is byte-for-byte unchanged).
- `git diff HEAD` on `src/`, `index.html`, `tests/tooling/node-pin.test.ts`, `tests/tooling/privacy.test.ts` and `specs/project-foundation/`: empty.
- `.github/workflows/deploy.yml` matches the plan's API contract line for line.
- Built `dist/index.html`: the script src is `/quicknotes/assets/index-DAPyqiGd.js` and the stylesheet href is `/quicknotes/assets/index-_XbBXyvV.css`.
- I grepped the diff and new files for URLs and email addresses. The only non-localhost URL is the live URL `https://ai-integration-techie.github.io/quicknotes/`. There are no emails, personal contact details or third-party hosts.

## Spec conformance
| AC | Result | How verified |
|---|---|---|
| AC-1 triggers, name | met | `deploy-workflow.test.ts` › "Deploy runs on push to main and manual dispatch only"; guard `deployTopLevelViolations`; AC-5 (d)/(e) negatives. Read the file myself. |
| AC-2 gate job steps | met | `deploy-workflow.test.ts` › "quality-gate runs npm ci, Playwright install and npm run ci as named steps in order"; guard `gateJobViolations`/`gateCommandViolations` |
| AC-3 upload last, after gate, no `if` | met | `deploy-workflow.test.ts` › "uploads dist with upload-pages-artifact as the last step…"; AC-5 (g) and "upload path changed" negatives |
| AC-4 needs, main-only, no status overrides | met | `deploy-workflow.test.ts` › "publish needs the gate, is main-only, and nothing overrides failure"; guard raw bans plus an exact `if` match |
| AC-5 mutations (a)-(g) fail, real file passes | met | `deploy-workflow.test.ts` › "deploy guard rejects mutation: (a)…(g)" (7 cases) and "deploy guard passes the real deploy.yml" |
| AC-6 first Deploy run green, env link | **pending (manual, ship)** | Not verifiable here. Needs GitHub after merge. Not passed. |
| AC-7 permissions | met | `deploy-workflow.test.ts` › "contents: read at top; only the publish job has pages/id-token write"; negatives "top-level permissions widened" and "permissions on the quality-gate job" |
| AC-8 sole `permissions` holder, no id-token in ci | met | `workflow.test.ts` › "only deploy.yml's deploy job declares permissions", "rejects permissions on ci.yml quality-gate", "rejects permissions on deploy.yml quality-gate", "cross guard rejects id-token in ci.yml" |
| AC-9 concurrency | met | `deploy-workflow.test.ts` › "workflow-level concurrency never cancels an in-progress deploy"; negative "cancel-in-progress: true" |
| AC-10 environment | met | `deploy-workflow.test.ts` › "publish job uses github-pages with the page_url output"; negative "a different environment". The guard also checks that the referenced step id exists. |
| AC-11 env has no reviewers or wait timer | **pending (manual, ship)** | Repository setting. Not passed. |
| AC-12 actions/* only, no secrets, no git push | met | `deploy-workflow.test.ts` › "uses only pinned actions/* actions and no credentials"; negatives "SHA-pinned action", "secrets reference", "gh-pages push", and the cross-guard "third-party deploy action" |
| AC-13 setup-node from .nvmrc | met | `deploy-workflow.test.ts` › "sets up Node from .nvmrc with npm caching"; negative "setup-node without .nvmrc" |
| AC-14 base for build and serve | met | `base-path.test.ts` › "resolved base is /quicknotes/ for build and serve" (Vite `resolveConfig`), plus D2's "base literal is defined once" |
| AC-15 dist/index.html paths | met | `e2e/base-path.spec.ts` › "built index.html references only /quicknotes/ assets"; I also inspected `dist/index.html` |
| AC-16 shell + JS/CSS 200 under sub-path | met | `e2e/base-path.spec.ts` › "shell loads under /quicknotes/ with every JS/CSS 200 from the sub-path" |
| AC-17 config + no-redirect detector | met | `e2e/base-path.spec.ts` › "Playwright baseURL and webServer.url end in /quicknotes/", "specs navigate straight to /quicknotes/ without a redirect", "root navigation is detected as a redirect". I did not run plan step 5's temporary `APP_PATH = "/"` mutation, because reviewers don't edit code. The self-check test shows that `goto("/")` produces a redirect, and the no-redirect test asserts `redirectedFrom() === null`, so the detector would fail. A `grep` of `e2e/` shows the only `goto("/")` is that self-check. |
| AC-18 dev server URL | met | `dev-server.test.ts` › "dev server serves the shell" (regex `/quicknotes/$`, 200, `<title>`) |
| AC-19 full gate, ci composition | met | I ran `npm run ci` (exit 0). `package-contract.test.ts` `ci` expectation unchanged. |
| AC-20 ci.yml unchanged | met | `git diff` is empty. "named step per check", "sets up Node from .nvmrc with npm caching" and `node-pin.test.ts` are unchanged and pass. |
| AC-21 README deployment + dev URL | met | `readme.test.ts` › "documents deployment", "Getting started dev URL ends in /quicknotes/". I read the README: all six R25 points are there. |
| AC-22 ci.yml guards | met | `workflow.test.ts` › "one gate workflow with safe settings". The original inline asserts are kept, and `ciWorkflowViolations` adds the job-level `permissions` check and `/id-token/`. |
| AC-23 exactly two workflow files | met | `workflow.test.ts` › "workflows directory is exactly ci.yml and deploy.yml", "listing guard rejects a third file", "listing guard rejects a missing deploy.yml" |
| AC-24 two jobs; deploy is one deploy-pages step | met | `deploy-workflow.test.ts` › "exactly quality-gate and deploy; deploy has one deploy-pages step"; negatives "a run step in the deploy job" and "a third job" |
| AC-25 each Pages action exactly once | met | `workflow.test.ts` › "upload-pages-artifact and deploy-pages each appear exactly once, in place"; 4 cross-guard negatives |
| AC-26 guards in npm test, each with a negative | met (see note) | All listed checks run as Vitest tests under `tests/tooling/`. Every guard function (listing, ci, deploy, cross) has at least one negative test. The AC-14 base-path check has no mutation negative. R30's negative-test rule is about workflow mutations, and the approved plan's test strategy has none for AC-14, so the plan already accepted this gap. |
| AC-27 ci.yml rejects Pages/upload actions | met | `workflow.test.ts` › "ci guard rejects a step using %s" (3 cases) |
| AC-28 dist static only, no host config/CNAME | met | `e2e/document.spec.ts` › "dist is static files only, with no host config or CNAME" |
| AC-29 same-origin, no SDKs, no storage | met | `e2e/privacy.spec.ts` › "all requests are same-origin", "no storage or cookies on fresh load" (now via `gotoApp`); `tests/tooling/privacy.test.ts` (unchanged, passes) |
| AC-30 live network/console | **pending (manual, ship)** | Needs the live URL. Not passed. |
| AC-31 live shell, desktop Chrome + iOS Safari | **pending (manual, ship)** | Needs the live URL. Not passed. |
| AC-32 manual dispatch on main | **pending (manual, ship)** | Needs GitHub. The R5 part is proved statically (AC-4, AC-5). Not passed. |

### Pending manual items (Release Manager, at ship; none of them passed yet)
- [ ] R6 / plan step 7: on the PR, `CI` runs and passes and `Deploy` does **not** start (check the PR's checks list).
- [ ] Ship prerequisite: Settings → Pages → Source = "GitHub Actions". This needs AITechie's explicit OK if the orchestrator does it via `gh`.
- [ ] AC-11 / A5: `github-pages` environment has no required reviewers and no wait timer, and the deployment-branch rule stays "default branch only".
- [ ] AC-6: the first `Deploy` run on `main` has both jobs green, and the environment link is `https://ai-integration-techie.github.io/quicknotes/`.
- [ ] AC-32: Actions → Deploy → Run workflow on `main` has both jobs green, and the live URL still serves the shell.
- [ ] AC-30: live URL in desktop Chrome, DevTools Network open, cache disabled. Every request is same-origin and under `/quicknotes/` (a `/favicon.ico` request is allowed), and the console shows no errors besides the favicon 404.
- [ ] AC-31: live shell in desktop Chrome and iOS Safari matches `npm run preview` at `/quicknotes/`.
- [ ] A3: the owner adds the "R15, R17 and AC-15 superseded by `pages-deploy`" note to `specs/project-foundation/spec.md`.

## UX conformance
- Flow US-1 (open the app): matches. The shell renders under `/quicknotes/` locally (AC-16). The live check is pending (AC-31).
- Flow US-2 (automatic deploy): matches statically. `push: branches: [main]`, then gate, upload, publish, and the environment URL from `page_url`. The live run is pending (AC-6).
- Flow US-3 (deploy now): matches statically. `workflow_dispatch` has no inputs, and the publish `if` is main-only, so a non-main dispatch skips the publish job. The live run is pending (AC-32).
- Flow US-4 (failure): matches statically. There is no `if:` on the upload step, and the publish job has an implicit `success()` with no status-function overrides and no `continue-on-error`. A failed publish leaving the old version live is an accepted risk (A4).
- Flow US-6 (local): matches. The dev URL ends in `/quicknotes/` (AC-18), the README says `http://localhost:5173/quicknotes/`, and the browser suite runs against `http://localhost:4173/quicknotes/`.
- Screen "Live app shell": matches. `src/` is unchanged.
- Screen "Deploy run": matches. The workflow `Deploy`, the jobs "Quality gate" / "Publish to GitHub Pages", and the step names are exactly the spec's copy table, and the guard enforces them.
- State success: matches (AC-15, AC-16).
- State loading: matches. `index.html` is unchanged, and `document.spec.ts`'s head checks run under the sub-path.
- State JS disabled: matches. The noscript e2e runs via `gotoApp`.
- State render error: matches. `ErrorBoundary` is unchanged and its jsdom test passes.
- State before first deploy / Pages not configured: no code to check here. The ship prerequisite covers it.
- States deploy in progress / failed / non-main dispatch skipped: matches statically (`cancel-in-progress: false`, implicit success gating, main-only `if`). Live observation is pending.

## API contract conformance
- `deploy.yml` matches the plan's "exact intended content" in every key and value: triggers, `permissions`, `concurrency`, both jobs, names, timeouts, step order, `@v7` / `@v5` pins, environment and step id.
- Permissions: the workflow level is `contents: read`. Only the `deploy` job has `pages: write` and `id-token: write`. The gate job has no `permissions`.
- There are no `secrets.*`, no PAT, no `gh-pages` push, no `configure-pages` and no `upload-artifact`.
- URL contract: `APP_BASE = "/quicknotes/"` is defined once in `vite.config.ts`, and `playwright.config.ts` and the e2e specs import it. `baseURL` and `webServer.url` are `http://localhost:4173/quicknotes/`.
- `ci.yml`: unchanged.
- Guard revision against the spec's "Changes to project-foundation" table: matches, and nothing was loosened.
  - The only removed line is `readdirSync(...)).toEqual(["ci.yml"])`, now `workflowListingViolations(listing)` = `[]` (exactly `ci.yml` and `deploy.yml`).
  - Every other original `ci.yml` assertion is kept verbatim, including the raw `/deploy|pages|publish|upload-artifact/i` ban. `ciWorkflowViolations` adds the job-level `permissions` ban, `/id-token/`, and the Pages/upload action bans.
  - The raw-word ban is not applied to `deploy.yml`, as the table allows. `deploy.yml` gets the structural guards instead.

## Findings
No correctness or security bugs found. On the deviations the build agent reported:

1. **Guards stricter than the AC wording: not a problem.**
   - The deploy job's `if` must equal `github.ref == 'refs/heads/main'` exactly (AC-4 says "contains"). The exact match is what rejects the "OR-ed open" mutation, which a "contains" check would let through.
   - Other strict points: R11 timeouts are enforced (plan D3), every gate step is barred from having an `if`, job names are checked, and the upload step may not carry a `run`.
   - All of these stay inside R1-R11 and R26-R30 and match the approved contract. If a later change needs a compound condition, the guard and the spec must change together, and that is the intended friction.
2. **13 extra negative tests: not a problem.** They strengthen R30 without changing any expectation, and they are fast pure-function tests.
3. **e2e titles built from `${APP_BASE}`: not a problem.** They render identically to the plan's titles ("…/quicknotes/…", as the Playwright output shows) and keep D2's "literal defined once" test honest.
4. **5 navigations in `layout.spec.ts` rather than 6: not a problem.** The plan counted the viewport loop's 4 runs as separate navigations, but that loop is one `goto` call site. All 5 call sites were converted, and a `grep` shows no `goto("/")` or `request.get("/")` left in `e2e/` except the deliberate self-check.

Non-blocking observations:
- **Low-risk hardening (follow-up, would need a plan change):**
  - `actions/checkout@v7` keeps its default `persist-credentials: true`, so the gate job's `contents: read` `GITHUB_TOKEN` stays in `.git/config` while `npm ci` / `npm run ci` run dependency code.
  - On a public repo with a read-only token the exposure is minimal, and the Pages-write and OIDC permissions live only in the separate `deploy` job.
  - The fix is `with: { persist-credentials: false }`. That deviates from the plan's exact contract, so it is not requested here.
- **Simplification (optional):**
  - `crossWorkflowViolations` repeats the `ci.yml` `id-token` check and the non-`actions/*` / banned-action checks that `ciWorkflowViolations` and `deployWorkflowViolations` already make.
  - The positive tests in `deploy-workflow.test.ts` repeat assertions the guard already makes.
  - The repetition is harmless, and the plan asked for named per-AC positive tests.
- **Side effect of non-main dispatches:** a `workflow_dispatch` on another branch still runs the gate and uploads a `github-pages` artifact, which is never deployed. The spec allows this (R5 "MAY still run"). It also shares the `pages` concurrency group, so it can queue behind a `main` deploy. Accepted.
- **Plan step 5 evidence:** the temporary `APP_PATH = "/"` failure run is not recorded by the build agent. The self-check test covers the same property (see AC-17 above). Optionally record that run at ship.

## Decision
**approve**

Blocking: none. Every automatable acceptance criterion (AC-1 to AC-5, AC-7 to AC-10, AC-12 to AC-29) is met and was verified by my own `npm run ci` run. AC-6, AC-11, AC-30, AC-31, AC-32, R6 on the PR, and the Pages source setting are pending manual ship checks (listed above) and are **not** marked passed.

## Sign-off
- Reviewed by: <name>, <date>
