# Spec: Deploy QuickNotes to GitHub Pages

- Status: Approved
- Slug: pages-deploy
- Intent: [intent.md](./intent.md)
- Jira: none
- Owner: AITechie
- Reviewers: AITechie (Product Owner, Tech Lead, Release Manager)
- Date: 2026-10-06

<!-- Status values: draft -> approved -> superseded.
     Do not move to "approved" without a human sign-off in the Approval
     section below. A spec with open questions cannot be approved. -->

## Summary
Publish the QuickNotes production build to
`https://ai-integration-techie.github.io/quicknotes/` through a dedicated
GitHub Actions workflow. The workflow runs on pushes to `main` and on a
manual "Run workflow" trigger. It runs the full quality gate
(`npm run ci`) on the commit and publishes that same build, using
GitHub's own Pages actions, only if the gate passes. The app is built
with the Vite `base` `/quicknotes/`. Local dev, unit tests and the
Playwright e2e/a11y suite all run under that sub-path, so path problems
show up locally and in CI before they reach the live site.

This spec also **deliberately changes `project-foundation`'s approved
behaviour**. That spec's R15, R17 and AC-15, and the matching guard in
`tests/tooling/workflow.test.ts`, say there is exactly one workflow, that
it has `contents: read` only, and that nothing deploys. Those guards are
replaced by the stricter guards in R26-R30 below, not deleted (see
"Changes to project-foundation").

## Changes to project-foundation
This is a spec-level change to `project-foundation`'s behaviour. Once
this spec is approved, the items below take precedence over the
`project-foundation` items they name. This slug does not edit
`project-foundation`'s own files (`spec.md`, `plan.md`, `review.md`).

| project-foundation item | What it says today | Replaced by (this spec) |
|---|---|---|
| R15 | Exactly one GitHub Actions workflow, for the quality gate | R27: exactly two workflow files, `ci.yml` (gate, unchanged) and `deploy.yml` (deploy). Any other file in `.github/workflows/` fails. |
| R17 | Gate workflow: `ubuntu-latest`, no secrets, `contents: read` only, MUST NOT deploy or publish | Still holds in full for `ci.yml` (R26). Deploying is allowed only in `deploy.yml`, only on `main`, and only after the gate passes (R1-R10, R28-R29). |
| AC-15 | Exactly one workflow; `contents: read`; no secrets; no deploy/publish step | AC-22 (`ci.yml` keeps every AC-15 check, plus a ban on `id-token`), AC-23 (exactly two files), AC-24 to AC-27 (`deploy.yml` structure and where Pages actions may appear). |
| `workflow.test.ts`: `readdirSync(".github/workflows")` equals `["ci.yml"]` | One file | Equals `["ci.yml", "deploy.yml"]`, sorted (AC-23). |
| `workflow.test.ts`: raw text of the workflow must not match `/deploy\|pages\|publish\|upload-artifact/i` | Applies to the only workflow | **Kept unchanged for `ci.yml`**, and extended to reject `id-token` (AC-22). It is not applied to `deploy.yml`, which needs those words. Instead, `deploy.yml` gets the structural checks in AC-1 to AC-5, AC-7 to AC-10, AC-12 and AC-24 to AC-25. These pin its triggers, its jobs, where each Pages action may appear and which job holds write permissions. |
| AC-4 (setup-node reads `.nvmrc`) | Checked on `ci.yml` | Also applies to `deploy.yml` (R2, AC-13). |
| AC-36, last part (only public `actions/*` actions) | Checked on `ci.yml` | Also applies to `deploy.yml` (R7, AC-12). |
| R6 and README ("usually `http://localhost:5173/`") | Dev server at the site root | The dev URL now ends in `/quicknotes/` (R17). AC-1's check (GET the printed URL, expect 200 and `<title>QuickNotes</title>`) is unchanged. |

Every other `project-foundation` requirement and acceptance criterion
still holds. Every `project-foundation` browser check (AC-11, AC-12,
AC-13, AC-21 to AC-24, AC-26 to AC-31, AC-33 and the `dist/` scan in
AC-36) now runs against the build served under `/quicknotes/` (R19).

## User stories
- US-1: As the user (AITechie), I want to open QuickNotes at a stable public HTTPS address from any of my browsers and devices, so that I can use it daily without cloning or running anything.
- US-2: As the developer, I want every `main` commit that passes the full quality gate to be published automatically, so that the live site always matches the latest good `main` with no manual steps.
- US-3: As the developer, I want to start a deploy of `main` by hand ("deploy now") under the same gate rule, so that I can redeploy after a GitHub outage or a failed run.
- US-4: As the developer, I want a commit that fails the gate, or a failed deploy, to never replace the live site, and I want the failure to be visible, so that a bad change never reaches the user unnoticed.
- US-5: As the developer, I want Pages write access to exist only in one job of one workflow, and I want the repo's tests to fail if a deploy path appears anywhere else, so that nothing gets published by accident.
- US-6: As the developer, I want local dev, unit tests and the browser test suite to keep working with the `/quicknotes/` sub-path, so that path bugs are caught locally and in CI rather than on the live site.
- US-7: As the user, I want the hosted app to keep every charter promise ($0, no server, no third-party requests, no data leaving the device), so that hosting doesn't weaken privacy or add cost.

## Requirements

### Deploy workflow: triggers and gating
- R1: The repo MUST contain a dedicated deploy workflow at `.github/workflows/deploy.yml`, named `Deploy`. Its `on:` MUST be exactly `push` with `branches: [main]` plus `workflow_dispatch` with no inputs. It MUST NOT have any other trigger: no `pull_request`, `pull_request_target`, `workflow_run`, `schedule`, `release`, tags or other branches.
- R2: `deploy.yml` MUST run the full quality gate itself, in a gate job (id `quality-gate`) in the same workflow run, on the commit being deployed. The gate job MUST run on `ubuntu-latest` and set up Node with `actions/setup-node`, `node-version-file: .nvmrc` and `cache: npm`. It MUST then run `npm ci`, install Playwright Chromium (`npx playwright install --with-deps chromium`) and run `npm run ci`, each as a separately named step, in that order. This settles the intent's open technical choice: the deploy runs the gate itself and does not read the result of the separate `CI` workflow run (see Open questions / risks, item 1).
- R3: The published site MUST be the `dist/` directory produced by that gate job's `npm run ci`. It MUST be uploaded with `actions/upload-pages-artifact` and `path: dist`, as the step immediately after the `npm run ci` step and as the job's last step. The upload MUST NOT run if `npm run ci` fails. No other job or step may build, rebuild or modify the artifact.
- R4: The publish job (id `deploy`) MUST declare `needs: quality-gate`, and its `if:` MUST require `github.ref == 'refs/heads/main'`. No `if:` anywhere in `deploy.yml` may use `always()`, `failure()` or `cancelled()` (including `!cancelled()`), and no step or job may set `continue-on-error`.
- R5: A manual run (`workflow_dispatch`) started on any branch other than `main` MUST NOT publish. The publish job is skipped (R4). The gate job MAY still run.
- R6: Pull requests and pushes to any branch other than `main` MUST NOT start `deploy.yml` and MUST NOT publish anything. They keep getting the unchanged `CI` workflow (project-foundation R15/R16).
- R7: Publishing MUST use GitHub's own Pages actions only: `actions/upload-pages-artifact` in the gate job and `actions/deploy-pages` in the publish job. Every `uses:` in `deploy.yml` MUST be an `actions/*` action. `deploy.yml` MUST NOT reference `secrets.*`, use a personal access token, push to a `gh-pages` branch or use any third-party deploy action. `actions/configure-pages` is not used, because the base path is fixed in the Vite config (R14).

### Deploy workflow: permissions, environment and concurrency
- R8: `deploy.yml`'s workflow-level `permissions` MUST be exactly `contents: read`. The gate job MUST NOT declare job-level `permissions`. The publish job MUST declare job-level `permissions` of exactly `pages: write` and `id-token: write`, and nothing else. No other job in any workflow file may declare `permissions`, so `pages: write` and `id-token: write` exist only on the publish job.
- R9: `deploy.yml` MUST set a workflow-level `concurrency` group (for example `pages`) with `cancel-in-progress: false`. Two deploys then never publish at the same time, and an in-progress deploy is never cut off partway.
- R10: The publish job MUST use the `github-pages` environment, with its `url` set to the deploy step's `page_url` output, so the run links to the live site. That environment MUST NOT have required reviewers or a wait timer (owner decision 5: no approval step). This is a repository setting and is checked at ship.
- R11: The gate job SHOULD set `timeout-minutes: 15`, and the publish job SHOULD set `timeout-minutes: 10`.

### Failure behaviour
- R12: If any gate step fails, the publish job MUST NOT run, the previously published version MUST stay live, and the `Deploy` run MUST show as failed on the GitHub Actions page and in the commit's checks.
- R13: If the publish step itself fails, the `Deploy` run MUST show as failed, and the previously published version MUST stay live. This relies on GitHub Pages switching to a new artifact only when a deployment succeeds (see Open questions / risks, item 4). Rollback means reverting the commit on `main`, which then deploys through the normal path (owner decision 6).

### Base path
- R14: `vite.config.ts` MUST set `base: '/quicknotes/'`, defined once, and that value MUST apply to `vite build`, `vite preview` and `vite` (dev).
- R15: In the built `dist/index.html`, every `src` and `href` MUST start with `/quicknotes/`. None may be a root-absolute path outside `/quicknotes/` (for example `/assets/...` or `/src/...`).
- R16: When `dist/` is served with its root mapped to `/quicknotes/`, loading `/quicknotes/` MUST render the shell: the header "QuickNotes" and the "No notes yet" empty state. Every JS and CSS request MUST return HTTP 200, and its path MUST start with `/quicknotes/`.

### Local development and tests
- R17: `npm run dev` MUST serve the shell under `/quicknotes/`, and the local URL it prints MUST end in `/quicknotes/`. `README.md` MUST give the dev URL as `http://localhost:5173/quicknotes/` (or whatever port Vite prints).
- R18: `npm test` MUST keep passing, with no change to the `test` script. Tooling tests that read the Vite config or the workflows MUST be updated to this spec's guards (R26-R30).
- R19: `npm run test:a11y` MUST serve the production build with `vite preview` under `/quicknotes/`, and every Playwright spec MUST load the app from `/quicknotes/`. The e2e suite MUST include a test that fails if the app is loaded from the server root instead. Every existing `project-foundation` browser check MUST keep passing under the sub-path.
- R20: The `npm run ci` script MUST keep its `project-foundation` composition and order: `format:check`, `lint`, `typecheck`, `test`, `build`, `test:a11y`. The `CI` workflow (`ci.yml`) MUST keep its triggers, job, steps and step names unchanged.

### Charter limits
- R21: The deployed site MUST be only the static files from `dist/`. There MUST be no server-side code, serverless or edge functions, redirect or header rules, or runtime configuration fetched from anywhere.
- R22: Hosting and deployment MUST cost $0: free GitHub Pages on the public repository and the free GitHub Actions tier. No paid service, custom domain, CDN or third-party host.
- R23: The deployed page MUST make only same-origin requests (origin `https://ai-integration-techie.github.io`). It MUST NOT include analytics, telemetry, error reporting, uptime monitoring or any third-party asset. `project-foundation` R32 and R33 keep applying to the deployed build.
- R24: `deploy.yml` MUST NOT need any credential other than the workflow's automatic OIDC token (`id-token: write`, publish job only) and the default `GITHUB_TOKEN` at the permissions in R8.

### Documentation
- R25: `README.md` MUST have a "Deployment" section that states:
  - the live URL `https://ai-integration-techie.github.io/quicknotes/`
  - that every push to `main` deploys after `npm run ci` passes
  - how to deploy by hand: Actions → Deploy → Run workflow, on branch `main`
  - that a failed run leaves the previous version live and shows as a failed `Deploy` run
  - that rollback means reverting the commit on `main`
  - the one-time prerequisite: Settings → Pages → Source = "GitHub Actions"

### Guards that replace project-foundation R15, R17 and AC-15
- R26: `ci.yml` MUST keep every `project-foundation` R17 property: name `CI`, workflow-level `permissions` exactly `contents: read`, no job-level `permissions`, no `secrets.`, no `continue-on-error`, and raw text that does not match `/deploy|pages|publish|upload-artifact/i`. Its raw text MUST also not contain `id-token`.
- R27: `.github/workflows/` MUST contain exactly two files, `ci.yml` and `deploy.yml`. Any other file MUST make the guard fail.
- R28: `deploy.yml` MUST have exactly two jobs, `quality-gate` and `deploy`. The `deploy` job MUST have exactly one step, which uses `actions/deploy-pages`. It MUST NOT have a `run:` step, a checkout or a build.
- R29: Across all workflow files, `actions/upload-pages-artifact` MUST appear exactly once (the last step of `deploy.yml`'s `quality-gate` job, R3), and `actions/deploy-pages` MUST appear exactly once (`deploy.yml`'s `deploy` job). `actions/upload-artifact`, `actions/configure-pages` and every non-`actions/*` action MUST NOT appear in any workflow.
- R30: R1, R2, R3, R4, R7, R8, R9, R10 (workflow part), R14 and R26-R29 MUST be enforced by tooling tests that run in `npm test`. A change that breaks them then fails both `CI` and the deploy gate. Each guard MUST have at least one negative test that feeds it a mutated workflow in memory and expects it to fail.

## User experience

The user-facing outcome is the live URL showing the same QuickNotes
shell as a local production build. For the developer, the GitHub Actions
run is the interface: its names and its pass or fail status.

### Flows
- **US-1 (open the app):**
  1. The user opens `https://ai-integration-techie.github.io/quicknotes/` in any supported browser on any device.
  2. The page shows the "QuickNotes" header and the empty state "No notes yet" / "Your notes will show up here.", exactly as in `project-foundation`.
  3. There is nothing to interact with yet.
- **US-2 (automatic deploy):**
  1. The developer merges or pushes to `main`.
  2. GitHub Actions starts both `CI` and `Deploy` for that commit.
  3. In `Deploy`, the "Quality gate" job runs `npm run ci` and then uploads `dist/`.
  4. The "Publish to GitHub Pages" job deploys the upload, and the run links to the live URL.
  5. Reloading the live URL shows the new version.
- **US-3 (deploy now):**
  1. The developer opens Actions → `Deploy` → "Run workflow" and picks branch `main`.
  2. The same two jobs run as in US-2.
  3. If another branch is picked, the gate may run, but "Publish to GitHub Pages" shows as skipped and nothing is published.
- **US-4 (failure):**
  1. A commit on `main` fails a gate step, or the publish step fails.
  2. The `Deploy` run shows red, with the failing step named, on the Actions page and in the commit's checks.
  3. The live URL keeps serving the previous version.
  4. The developer fixes forward or reverts the commit on `main`. Either one deploys through US-2.
- **US-6 (local):**
  1. `npm run dev` prints `http://localhost:5173/quicknotes/`.
  2. Opening that URL shows the shell.
  3. `npm run ci` runs the full gate, including the browser suite against `http://localhost:4173/quicknotes/`.

### Screens / views
- **Live app shell:** identical to `project-foundation`'s only screen (header plus empty state). There is no new UI.
- **The `Deploy` run in GitHub Actions (developer surface):** two jobs, "Quality gate" and "Publish to GitHub Pages". The publish job shows the `github-pages` environment link to the live URL.

### States
- **Live site, success:** the shell renders, and every asset loads from `/quicknotes/`.
- **Live site, loading:** as in `project-foundation`: a blank `zinc-50` page until the JS runs, with the tab title "QuickNotes".
- **Live site, JS disabled:** the `project-foundation` `<noscript>` message.
- **Live site, render error:** the `project-foundation` error-boundary message.
- **Before the first deploy, or if Pages is not set to GitHub Actions:** the URL returns GitHub's 404 page, and the publish step fails with GitHub's own error. The ship prerequisite covers this.
- **Deploy run in progress:** the live site keeps serving the previous version until the new deployment finishes.
- **Deploy run failed:** the run is red, and the previous version stays live (R12, R13).
- **Manual run on a branch other than `main`:** "Publish to GitHub Pages" is skipped, and the live site doesn't change.

### Copy & validation
There is no new in-app copy. All app text stays as in `project-foundation`'s copy table.

The exact names the workflow shows:

| Item | Text |
|---|---|
| Workflow name | Deploy |
| Gate job name (id `quality-gate`) | Quality gate |
| Publish job name (id `deploy`) | Publish to GitHub Pages |
| Gate steps, in order | Checkout, Set up Node, Install dependencies, Install Playwright Chromium, Quality gate (npm run ci), Upload Pages artifact |
| Publish step | Deploy to GitHub Pages |

Failures show GitHub's and each tool's own output, so no custom messages
are needed. Every failure MUST show as a failed run (R12, R13).

### Accessibility
The target stays WCAG 2.1 AA (charter), as in `project-foundation`. This
feature adds no UI. The existing axe, layout, reflow, focus and motion
checks keep running in CI, now against the build served under
`/quicknotes/` (R19), which is the build that gets deployed. The manual
VoiceOver and cross-browser checks are not repeated for this slug. The
ship-time live check (AC-31) confirms that the shell renders the same.

## Acceptance criteria

### Triggers, gating and failure
- AC-1 (US-2, US-3, R1, R6): Given `.github/workflows/deploy.yml` parsed as YAML, when `on` is inspected, then its keys are exactly `push` and `workflow_dispatch`, `on.push` deep-equals `{ branches: ['main'] }`, and `on.workflow_dispatch` is null or an empty object (no `inputs`). `name` is `Deploy`.
- AC-2 (US-2, R2): Given `deploy.yml`, when job `quality-gate` is inspected, then:
  - `runs-on` is `ubuntu-latest`.
  - Its step names are exactly, in order: "Checkout", "Set up Node", "Install dependencies", "Install Playwright Chromium", "Quality gate (npm run ci)", "Upload Pages artifact".
  - The three command steps run exactly `npm ci`, a command matching `/playwright install.*--with-deps.*chromium/`, and exactly `npm run ci`.
- AC-3 (US-2, US-4, R3): Given `deploy.yml`, when job `quality-gate` is inspected, then its last step is "Upload Pages artifact". That step comes directly after "Quality gate (npm run ci)", uses `actions/upload-pages-artifact@v<n>` with `with.path` equal to `dist`, and has no `if:`.
- AC-4 (US-4, R4, R5): Given `deploy.yml`, when job `deploy` is inspected, then `needs` is `quality-gate` (or `['quality-gate']`) and `if` contains `github.ref == 'refs/heads/main'`. The raw text of `deploy.yml` contains none of `always()`, `failure()`, `cancelled()` or `continue-on-error`.
- AC-5 (US-4, US-5, R4, R5, R12, R30): Given the `deploy.yml` guard function in `tests/tooling/`, when it is fed each of these in-memory mutations of `deploy.yml`, then it fails for every one:
  - (a) `if: always()` added to job `deploy`
  - (b) `needs` removed from job `deploy`
  - (c) `continue-on-error: true` added to the "Quality gate (npm run ci)" step
  - (d) `pull_request` added to `on`
  - (e) `on.push.branches` changed to `['**']`
  - (f) the `github.ref` condition removed from job `deploy`
  - (g) "Upload Pages artifact" moved before "Quality gate (npm run ci)"

  It passes for the real `deploy.yml`.
- AC-6 (US-2, R10, R12): At ship, given the first `Deploy` run on `main` after the Pages source is set, when the Actions page is opened, then both jobs are green and the `github-pages` environment link points to `https://ai-integration-techie.github.io/quicknotes/`. This is a manual check, recorded at ship.

### Permissions, environment and concurrency
- AC-7 (US-5, R8): Given `deploy.yml`, when it is inspected, then:
  - The top-level `permissions` deep-equals `{ contents: 'read' }`.
  - Job `quality-gate` has no `permissions` key.
  - Job `deploy`'s `permissions` deep-equals `{ pages: 'write', 'id-token': 'write' }`.
- AC-8 (US-5, R8, R26): Given every workflow file, when it is parsed, then `deploy.yml`'s `deploy` job is the only job in any file with a `permissions` key, and `ci.yml`'s raw text does not contain `id-token`. A mutation that adds `permissions: { pages: write }` to `ci.yml`'s `quality-gate` job, or to `deploy.yml`'s `quality-gate` job, makes the guard fail.
- AC-9 (US-4, R9): Given `deploy.yml`, when top-level `concurrency` is inspected, then `group` is a non-empty string and `cancel-in-progress` is `false`.
- AC-10 (US-2, R10): Given `deploy.yml`, when job `deploy` is inspected, then `environment.name` is `github-pages` and `environment.url` matches `/steps\.[\w-]+\.outputs\.page_url/`.
- AC-11 (US-5, R10): At ship, given the repository's Settings → Environments → `github-pages`, when it is inspected, then it has no required reviewers and no wait timer. This is a manual check, recorded at ship.

### Actions and credentials
- AC-12 (US-5, US-7, R7, R24, R29): Given `deploy.yml`, when every `uses:` is collected, then:
  - Each one matches `/^actions\/[\w-]+@v\d+$/`.
  - None is `actions/upload-artifact` or `actions/configure-pages`.
  - The raw text has no `secrets.`.
  - No `run:` contains `git push` or `gh-pages`.
- AC-13 (US-2, R2): Given `deploy.yml`, when the "Set up Node" step of `quality-gate` is inspected, then it uses `actions/setup-node@v<n>`, and `with` deep-equals `{ 'node-version-file': '.nvmrc', cache: 'npm' }`.

### Base path
- AC-14 (US-1, US-6, R14): Given `vite.config.ts`, when it is resolved through Vite's config API for the `build` command and for the `serve` command, then `base` is `/quicknotes/` in both.
- AC-15 (US-1, R15): Given `dist/` after `npm run build`, when `dist/index.html` is parsed, then:
  - Every `<script src>` and `<link href>` starts with `/quicknotes/assets/`.
  - No `src` or `href` attribute starts with `/` unless it starts with `/quicknotes/`.
  - The `<script type="module">` points to a hashed `.js` file that exists in `dist/assets/`.
- AC-16 (US-1, US-6, R16, R19): Given the production build served by `vite preview` and loaded in Playwright at `http://localhost:4173/quicknotes/` with response logging, when the page has loaded and the network is idle, then:
  - The `<h1>` "QuickNotes" and the text "No notes yet" are visible.
  - At least one `.js` response and one `.css` response were received.
  - Every `.js` and `.css` response has status 200, and its URL path starts with `/quicknotes/`.
- AC-17 (US-6, R19): Given `playwright.config.ts`, when it is inspected, then `use.baseURL` and `webServer.url` both end in `/quicknotes/`. Given the e2e suite, a dedicated test asserts that `new URL(page.url()).pathname` starts with `/quicknotes/` after navigating the way every other spec does. That test fails if the specs navigate to the server root.

### Local development and tests
- AC-18 (US-6, R17): Given the dev-server tooling test, which starts Vite programmatically with the repo config, when the local URL is read from `resolvedUrls.local[0]`, then it ends in `/quicknotes/`, and an HTTP GET to it returns 200 with HTML containing `<title>QuickNotes</title>`.
- AC-19 (US-6, R18, R19, R20): Given the clean repo, when `npm run ci` runs locally, then it exits 0, and every `project-foundation` unit, tooling and e2e test passes with the base path in place. The `ci` script still splits on `&&` into `[format:check, lint, typecheck, test, build, test:a11y]`.
- AC-20 (US-6, R6, R20): Given `ci.yml`, when it is parsed, then it is unchanged in triggers (`push: { branches: ['**'] }`, `pull_request`), job (`quality-gate` only), step names and order, and setup-node settings. The existing `project-foundation` "named step per check", "sets up Node from .nvmrc with npm caching" and `node-pin.test.ts` checks pass without edits to their expectations.
- AC-21 (US-6, R17, R25): Given `README.md`, when it is read, then:
  - It has a "Deployment" section containing the exact URL `https://ai-integration-techie.github.io/quicknotes/` and the phrases "npm run ci", "Run workflow", "revert" and "GitHub Actions" (as the Pages source).
  - The Getting started section gives a dev URL ending in `/quicknotes/`.

### Guards replacing project-foundation R15, R17 and AC-15
- AC-22 (US-5, R26): Given `ci.yml`, when `workflow.test.ts` runs, then:
  - `name` is `CI`.
  - The top-level `permissions` deep-equals `{ contents: 'read' }`.
  - No job has a `permissions` key.
  - The raw text matches none of `/secrets\./`, `/continue-on-error/`, `/deploy|pages|publish|upload-artifact/i` or `/id-token/`.
- AC-23 (US-5, R27): Given `.github/workflows/`, when it is listed and sorted, then it equals exactly `['ci.yml', 'deploy.yml']`. The guard function fails when it is given a listing with a third file (for example `release.yml`) or a listing missing `deploy.yml`.
- AC-24 (US-5, R28): Given `deploy.yml`, when `jobs` is inspected, then its keys are exactly `quality-gate` and `deploy`. Job `deploy` has exactly one step: it is named "Deploy to GitHub Pages", uses `actions/deploy-pages@v<n>`, and has no `run`.
- AC-25 (US-5, R29): Given all workflow files, when every `uses:` is collected per file and job, then `actions/upload-pages-artifact` appears exactly once (`deploy.yml`, job `quality-gate`, last step) and `actions/deploy-pages` appears exactly once (`deploy.yml`, job `deploy`).
- AC-26 (US-5, R30): Given the tooling suite, when `npm test` runs, then the checks for AC-1 to AC-5, AC-7 to AC-10, AC-12 to AC-14 and AC-22 to AC-25 run as Vitest tests under `tests/tooling/`. Each guard has at least one negative test on an in-memory mutation that expects failure.
- AC-27 (US-5, R26, R29): Given an in-memory `ci.yml` mutation that adds a step using `actions/deploy-pages`, `actions/upload-pages-artifact` or `actions/upload-artifact`, when the `ci.yml` guard runs, then it fails.

### Charter limits and live checks
- AC-28 (US-7, R21, R22): Given `dist/` after `npm run build`, when it is listed recursively, then:
  - It contains only `.html`, `.js`, `.css` and static image or icon files.
  - It contains no `_worker.js`, `functions/` directory, `_redirects`, `_headers` or `CNAME`.
  - The repo root has no `CNAME` file.
- AC-29 (US-7, R23): Given the production build served under `/quicknotes/`, when the existing `project-foundation` checks AC-31 (every request is same-origin), AC-32 (no analytics or telemetry SDKs) and AC-33 (no storage or cookies) run, then all pass.
- AC-30 (US-7, R23): At ship, given the live URL opened in desktop Chrome with DevTools Network open and the cache disabled, when the page has loaded, then:
  - Every request's origin is `https://ai-integration-techie.github.io`.
  - Every request path starts with `/quicknotes/`, except that a browser-initiated `/favicon.ico` request to the same origin is allowed.
  - The console shows no errors (the `/favicon.ico` 404 is allowed).

  This is a manual check, recorded at ship.
- AC-31 (US-1, R16): At ship, given the live URL opened in current desktop Chrome and in iOS Safari on a phone, when the page loads, then it shows the "QuickNotes" header and the "No notes yet" / "Your notes will show up here." empty state, with styles applied (`zinc-50` page background, header bottom border), the same as the local `/quicknotes/` preview. This is a manual check, recorded at ship.
- AC-32 (US-3, R1, R5): At ship, given Actions → `Deploy` → "Run workflow" on `main`, when it completes, then both jobs pass and the live URL still serves the shell. This is a manual check, recorded at ship. R5 (no publish from a non-`main` dispatch) is proved statically by AC-4 and AC-5. Running it on another branch at ship is optional.

## Constraints
- **Charter:** static hosting on GitHub Pages through GitHub Actions; no server; $0; no third-party network calls; WCAG 2.1 AA; React + Vite + TypeScript + Tailwind.
- **Owner decisions (intent, 2026-10-06):**
  - Gate on `npm run ci` for the deployed commit.
  - Add a manual trigger.
  - Use the default `github.io` address under `/quicknotes/`.
  - The repo is public.
  - No approval step.
  - Rollback by revert.
  - No automated live-URL checks (manual at ship).
  - Browsers and screen sizes are inherited from `project-foundation`.
- **Ship prerequisite (not code):** Settings → Pages → Source must be "GitHub Actions" before the first deploy. This is a one-time owner step at ship. The orchestrator may set it through the GitHub CLI only with AITechie's explicit OK in the conversation.
- **Least privilege:** `pages: write` and `id-token: write` exist only on the `deploy` job of `deploy.yml` (R8).
- **Tooling:** only `actions/*` actions. No new npm dependencies are expected. If the plan finds it needs one, `project-foundation` R5's licence rule applies.
- **Supersession:** this spec changes `project-foundation` R15, R17 and AC-15, and its `workflow.test.ts` guard, as set out in "Changes to project-foundation". It does not edit `project-foundation`'s artifacts.
- **Solo builder:** the gate is the only reviewer, so no step in either workflow may be non-blocking.

## Non-goals
- Offline support, service worker, manifest or installability (`pwa-offline`).
- Any note features or theme work.
- Preview deployments for pull requests or branches.
- Any host other than GitHub Pages, any paid service, or a custom domain / `CNAME`.
- A manual approval step, required reviewers or a wait timer on the `github-pages` environment.
- Automated checks against the live URL after a deploy (smoke tests, link checks, uptime monitoring).
- Any rollback mechanism beyond reverting the commit on `main`.
- An SPA fallback `404.html` or client-side routing support. The shell has a single URL, so a later feature that adds routes must handle this.
- Reusing the `CI` workflow's result through `workflow_run` or a cross-workflow status lookup (see Open questions / risks, item 1).
- Any change to the `CI` workflow (`ci.yml`), including adding `concurrency` or excluding `main`.
- A custom favicon. The browser's same-origin `/favicon.ico` 404 is accepted.
- Release versioning, changelogs or tags.
- Any server, backend, API, edge function, analytics, error reporting or other third-party service.

## Open questions / risks
The approver must accept or change each item before this spec can be
approved.

1. **The gate runs twice on every push to `main` (decision, needs acceptance).** `deploy.yml` runs `npm run ci` itself (R2) instead of waiting for the `CI` run's result. So on every push to `main`, `CI` and `Deploy` both run the full gate, which adds roughly 2-4 minutes of free-tier Actions time. In return, the guarantee is simple and self-contained: the artifact that passed the gate is exactly the one published, and the manual trigger follows the same rule without looking up another run. The alternative is `workflow_run` after `CI` succeeds, plus a status lookup for manual runs. That avoids the duplicate run but is harder to guard and to reason about. Accept R2 as written, or choose `workflow_run`.
2. **The dev server also moves to `/quicknotes/` (decision, needs acceptance).** R14 and R17 apply the base everywhere, so local dev matches production and path bugs show up early. The cost is that the dev URL changes from `http://localhost:5173/` to `http://localhost:5173/quicknotes/`. Accept, or limit `base` to build and preview only.
3. **Cross-reference in project-foundation (owner housekeeping).** This spec supersedes parts of an approved, shipped spec, and this slug does not edit that spec. Should the owner add a one-line note to `specs/project-foundation/spec.md` at ship ("R15, R17 and AC-15 superseded by `pages-deploy`")? Recommended: yes, done by the owner, because agents don't edit approved artifacts.
4. **Reliance on atomic GitHub Pages deploys (risk).** R13 (a failed publish leaves the previous version live) depends on GitHub Pages switching to a new artifact only after a successful deployment. That is GitHub's behaviour, and this repo can't test it. The owner ruled out automated live checks, and there is no safe way to force a failed publish on `main`. So R13 is covered by the static guards (AC-3 to AC-5) plus GitHub's documented behaviour. Accept this risk.
5. **`github-pages` environment settings live outside the code (risk).** R10's "no reviewers, no wait timer", and GitHub's default deployment-branch rule for `github-pages` (default branch only), are repository settings, so they are checked by hand at ship (AC-11). The default branch rule is an extra safeguard that matches R4 and R5, and it should stay on. Accept.
6. **Action major versions (minor, for the plan).** The spec names `actions/upload-pages-artifact` and `actions/deploy-pages` but leaves the major versions to the plan. The plan must pick majors that work together, because the artifact format has to match.

## Approval
<!-- Who approved this spec, and when. A spec is not approved until a
     human signs off here — this is the primary judgment gate in the
     framework; do not skip it. -->
- Approved by: AITechie, 2026-10-06
