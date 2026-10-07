# Plan: Deploy QuickNotes to GitHub Pages

- Status: Approved
- Slug: pages-deploy
- Spec: [spec.md](./spec.md) (Status: Approved, AITechie, 2026-10-06)
- Date: 2026-10-06

## Assumptions to confirm at the plan gate
The spec was approved without written answers to its open questions.
This plan treats each proposal as the accepted default. The Tech Lead
(AITechie) confirms or overrides each row by approving this plan. If any
row is changed, the plan goes back to draft.

| # | Spec open question | Default this plan builds on | Effect on this plan |
|---|---|---|---|
| A1 | 1. Gate runs twice per `main` push | Accepted: `deploy.yml` runs `npm run ci` itself (R2). No `workflow_run`. | `CI` and `Deploy` both run the full gate on each `main` push, roughly 2-4 extra free-tier minutes. |
| A2 | 2. Dev server moves to `/quicknotes/` | Accepted: one `base` for dev, build and preview (R14, R17). | Dev URL becomes `http://localhost:5173/quicknotes/`. `dev-server.test.ts` and the README change. |
| A3 | 3. Cross-reference in project-foundation | Accepted: **the owner** adds "R15, R17 and AC-15 superseded by `pages-deploy`" to `specs/project-foundation/spec.md` at ship. | No agent edits project-foundation artifacts. This is a ship checklist item. |
| A4 | 4. Reliance on atomic Pages deploys | Accepted risk: R13 is covered by the static guards (AC-3 to AC-5) plus GitHub's documented behaviour. | No test forces a failed publish. |
| A5 | 5. `github-pages` environment settings | Accepted: checked by hand at ship (AC-11). The default "deployment branches: default branch only" rule stays on. | Manual ship check. |
| A6 | 6. Action major versions | Pinned: `actions/upload-pages-artifact@v5` and `actions/deploy-pages@v5` (see "Action versions"). | Checked by AC-12's `@v\d+` pattern. |

Plan-level decisions the Tech Lead also confirms here:

| # | Decision | Why |
|---|---|---|
| D1 | Add a `preview` npm script (`vite preview`). | AC-31 compares the live site with "the local `/quicknotes/` preview". A documented script makes that comparison reproducible. It costs one README line and one test-list entry, and changes no gate script. The Playwright `webServer` command stays `npx vite preview --port 4173 --strictPort` so the e2e harness doesn't change. |
| D2 | `/quicknotes/` is written once, as `export const APP_BASE` in `vite.config.ts`. `playwright.config.ts` and the e2e helper import it. | R14 says "defined once". A tooling test checks that the literal appears exactly once in the repo's config and test code. |
| D3 | R11's SHOULD timeouts (gate 15, publish 10) are enforced by the guard. | They cost nothing, and an unbounded deploy job could hold the `pages` concurrency group. |
| D4 | The workflow guards move into a pure module, `tests/tooling/workflow-guards.ts`. Each guard returns a list of violations, so the negative tests (R30) can feed it mutated YAML. | The current `workflow.test.ts` asserts inline, so its checks can't be run against mutations. |

## Approach
The change has three parts: a new workflow, a base path, and stricter
guards. None of it touches `src/`.

1. **Deploy workflow.** `.github/workflows/deploy.yml` follows GitHub's
   two-job Pages pattern (the `deploy-pages` README example), with these
   changes. The build job is the full gate (`npm run ci`), so the `dist/`
   that passed every check is the one uploaded. The workflow has
   `permissions: contents: read`, and only the publish job raises that to
   `pages: write` and `id-token: write`. A `github.ref` condition stops
   publishing from non-`main` dispatches. `ci.yml` is not changed at all.
2. **Base path.** `vite.config.ts` gets `base: APP_BASE`
   (`/quicknotes/`). Vite applies it to `serve`, `build` and `preview`.
   I checked this against the installed Vite 8.3.3 with a scratch build
   (`vite build --base=/quicknotes/`) and a scratch preview. The built
   `index.html` references `/quicknotes/assets/index-<hash>.js` and
   `.css`. `/quicknotes/` returns 200. **`/` returns a 302 redirect to
   `/quicknotes/`** (Vite's `baseMiddleware`, used by both dev and
   preview). Paths outside the base return 404.
3. **Guards.** The project-foundation `ci.yml` checks are kept. Their
   assertions move into pure guard functions, and new guards cover
   `deploy.yml`, the directory listing and cross-file rules. Each guard
   has negative tests on in-memory mutations (R30).

**Finding that shapes the e2e work.** Playwright resolves `goto(url)` as
`new URL(url, baseURL)` (`resolveBaseURL` in playwright-core 1.63). With
`baseURL` set to `http://localhost:4173/quicknotes/`, `page.goto("/")`
resolves to `http://localhost:4173/`. Vite preview then redirects that
to `/quicknotes/`, so the existing specs **would still pass** while
loading from the server root. GitHub Pages does not do that redirect:
`https://ai-integration-techie.github.io/` is a different site. Two
consequences follow:
- Every spec must navigate with the relative path `./`, through one
  shared helper.
- The AC-17 test can't just check `page.url()` after loading. It must
  also assert that the navigation response was **not redirected**
  (`response.request().redirectedFrom() === null`). It also proves its
  own detector works: `goto("/")` must show a redirect.

The existing `request.get("/")` calls in `document.spec.ts` have the same
problem, because APIRequestContext follows redirects. They switch to the
helper's path too.

### Action versions
Checked with `git ls-remote --tags` on 2026-10-06:

| Action | Latest major tag | Resolves to | Pinned as |
|---|---|---|---|
| `actions/upload-pages-artifact` | `v5` (= `v5.0.0`) | `fc324d35…` | `@v5` |
| `actions/deploy-pages` | `v5` (= `v5.0.1`) | `368f8252…` | `@v5` |
| `actions/checkout` | `v7` (= `v7.0.1`) | — | `@v7` (same as `ci.yml`) |
| `actions/setup-node` | `v7` (= `v7.0.0`) | — | `@v7` (same as `ci.yml`) |

Why the two Pages actions work together: I read the `action.yml` files
at the `v5` tags. `upload-pages-artifact@v5` tars `path` and uploads it
with `actions/upload-artifact@v7.0.0` as the artifact `github-pages`.
`deploy-pages@v5` (runtime `node24`) deploys the artifact `github-pages`
by default. Its source rejects artifacts not uploaded with
`upload-artifact@v4` or later, and v7 meets that. Both actions use
default inputs except `path: dist`.

Pinning by major tag (`@v5`) rather than by commit SHA matches `ci.yml`
and AC-12's pattern `/^actions\/[\w-]+@v\d+$/`. AC-12 would reject SHA
pins.

## Architecture

### API contract
There is no HTTP API. The contracts in this feature are the workflow
file and the URL base.

**`.github/workflows/deploy.yml`** (exact intended content. Names come
from the spec's copy table.)

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  quality-gate:
    name: Quality gate
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Checkout
        uses: actions/checkout@v7

      - name: Set up Node
        uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Chromium
        run: npx playwright install --with-deps chromium

      - name: Quality gate (npm run ci)
        run: npm run ci

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v5
        with:
          path: dist

  deploy:
    name: Publish to GitHub Pages
    needs: quality-gate
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5
```

How this file meets the spec:
- The `deploy` job's `if:` has no status function, so GitHub adds an
  implicit `success()`. A failed or cancelled gate skips the publish
  job (R4, R12).
- The upload step has no `if:`, so it runs only when every earlier step
  passed (R3).
- The file must contain no comments with the words `always()`,
  `failure()`, `cancelled()` or `continue-on-error`, because AC-4 checks
  the raw text.

**Auth.** The workflow uses only the automatic `GITHUB_TOKEN`
(`contents: read`) and, on the publish job only, the OIDC token
(`id-token: write`). It uses no `secrets.*` (R24).

**Errors.** Failures surface as GitHub's and each tool's own output. A
failed step marks the run red (R12, R13).

**URL contract.** The app lives at `<origin>/quicknotes/`, with assets
under `/quicknotes/assets/`. Locally:
- dev: `http://localhost:5173/quicknotes/`
- preview: `http://localhost:4173/quicknotes/`
- Playwright `baseURL` and `webServer.url`: `http://localhost:4173/quicknotes/`

### Data model
N/A — the feature stores no data. `dist/` contains only static files.

### Backend
N/A — there is no server (charter, R21). The "backend" here is GitHub
Actions and Pages, configured entirely by `deploy.yml` (above) plus two
repository settings checked at ship:
- Pages source = GitHub Actions
- the `github-pages` environment has no reviewers and no wait timer

### Frontend
There is no new UI or component. `src/` is unchanged. The spec's
screens map like this:

| Spec screen / state | How it is rendered | What proves it |
|---|---|---|
| Live app shell (success) | The existing `App` → `AppHeader` + `EmptyState`, served from `/quicknotes/` with base-prefixed assets | AC-16 (e2e), AC-31 (manual) |
| Loading | Unchanged: blank `zinc-50` page with title "QuickNotes" until JS runs | Existing `document.spec.ts` head checks, under the sub-path |
| JS disabled | Unchanged `<noscript>` in `index.html` | Existing "noscript message" e2e, now at `./` |
| Render error | Unchanged `ErrorBoundary` | Existing `ErrorBoundary.test.tsx` (jsdom, base-independent) |
| Before first deploy / Pages not set up | GitHub's 404. Nothing in the repo. | Ship prerequisite |
| `Deploy` run views (in progress, failed, non-`main` dispatch skipped) | GitHub Actions UI, using the job and step names above | AC-2, AC-4, AC-24 (static); AC-6, AC-32 (manual) |

Build config:
- `vite.config.ts` exports `APP_BASE = "/quicknotes/"` and sets
  `base: APP_BASE`. Nothing else changes, so `build.target` and the
  `test` block stay as they are.
- The Vitest jsdom tests don't use URLs, so `base` doesn't affect them.
  Step 3 confirms this by running `npm test`.

## Files / components touched
New:
- `.github/workflows/deploy.yml`: the deploy workflow (above).
- `tests/tooling/workflow-guards.ts`: pure guards. Each returns
  `string[]` (violations); `[]` means pass.
  - `workflowListingViolations(names: string[])`: AC-23.
  - `ciWorkflowViolations(raw: string)`: AC-22, AC-27, plus the `actions/*` rule.
  - `deployWorkflowViolations(raw: string)`: AC-1 to AC-4, AC-7, AC-9, AC-10, AC-12, AC-13, AC-24, R11.
  - `crossWorkflowViolations(files: Record<string, string>)`: AC-8, AC-25, and R29's bans across all files.
  - A helper `mutateYaml(raw, edit)`: parses, applies `edit` to a `structuredClone`, and returns `yaml.stringify` output. The real parsed workflow is never mutated.
- `tests/tooling/deploy-workflow.test.ts`: positive checks on the real `deploy.yml`, plus the AC-5 mutations (a)-(g) and the AC-8 deploy-side mutation.
- `tests/tooling/base-path.test.ts`:
  - AC-14: `resolveConfig({ root, configFile }, "build")` and `(…, "serve")` both give `base === "/quicknotes/"`.
  - D2: the `/quicknotes/` literal appears exactly once across `vite.config.ts`, `playwright.config.ts` and `e2e/*.ts`.
- `e2e/app.ts`: `APP_PATH = "./"` and `gotoApp(page, options?)`, which returns the navigation `Response`.
- `e2e/base-path.spec.ts`: AC-15 (`dist/index.html` scan), AC-16 (response logging), AC-17 (config + no-redirect test + detector self-check).

Changed:
- `vite.config.ts`: add the `APP_BASE` export and `base: APP_BASE`.
- `playwright.config.ts`: import `APP_BASE`. `BASE_URL = http://localhost:${PORT}${APP_BASE}`, used for both `use.baseURL` and `webServer.url`.
- `e2e/a11y.spec.ts` (2 navigations), `e2e/layout.spec.ts` (6, including the viewport loop), `e2e/privacy.spec.ts` (3): `page.goto("/", …)` → `gotoApp(page, …)`. Assertions don't change.
- `e2e/document.spec.ts`:
  - 2 × `page.goto("/")` → `gotoApp` and 2 × `request.get("/")` → `request.get(APP_PATH)`.
  - Add the AC-28 `dist/` listing test, including the repo-root `CNAME` check.
- `tests/tooling/workflow.test.ts`:
  - "one gate workflow with safe settings": the line `readdirSync(...)).toEqual(["ci.yml"])` is replaced by `workflowListingViolations(sorted listing)` equal to `[]` (AC-23). Its other assertions stay, and `ciWorkflowViolations(raw)` equal to `[]` is added. That adds the "no job-level `permissions`" check and `/id-token/` (AC-22).
  - "named step per check", "sets up Node from .nvmrc with npm caching" and "uses only public actions/* actions" are **unchanged** (AC-20).
  - New tests: the listing guard's negatives (adding `release.yml`, missing `deploy.yml`), the `ci.yml` mutation negatives (AC-27, AC-8 ci-side), and the cross-file checks (AC-8, AC-25).
- `tests/tooling/dev-server.test.ts`: the URL expectation changes from `/^http:\/\/localhost:\d+\/$/` to `/^http:\/\/localhost:\d+\/quicknotes\/$/` (AC-18). The fetch and `<title>` assertion are unchanged.
- `tests/tooling/readme.test.ts`:
  - `SCRIPTS` gains `"preview"` (D1).
  - New test "documents deployment": the Deployment section has the exact URL, "npm run ci", "Run workflow", "revert" and "GitHub Actions".
  - New test "Getting started dev URL ends in /quicknotes/".
- `tests/tooling/package-contract.test.ts`: "documents the developer-tooling scripts" gains `preview: "vite preview"`. The `ci` and `test` expectations are unchanged (AC-19, R18, R20).
- `package.json`: add `"preview": "vite preview"`. No dependency changes.
- `README.md`:
  - Getting started step 4 becomes `http://localhost:5173/quicknotes/`.
  - Scripts gains `npm run preview`.
  - New "Deployment" section with the six R25 points.

Unchanged, on purpose:
- `.github/workflows/ci.yml` (R20)
- `tests/tooling/node-pin.test.ts` (AC-20)
- `tests/tooling/privacy.test.ts`: `index.html`'s `/src/main.tsx` is still a same-origin source path.
- `index.html`, `src/**`
- every `specs/project-foundation/*` file, and this spec

## Steps
Contract first: the deploy contract (workflow + guards), then the base
path, then the browser suite, then docs. The tags map to this feature
like this:
- `[API]` = the workflow/URL contract
- `[FE]` = build and app-serving config
- `[TEST]` = test-only

Run every command with Node 24 first on `PATH`:
`export PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH"`. Don't edit
`~/.npmrc`. The baseline today is `npm test`: 13 files, 39 tests, all
green.

1. **[TEST] Guard module + `ci.yml` and listing guards (red).**
   - Create `workflow-guards.ts` with `workflowListingViolations`, `ciWorkflowViolations` and `crossWorkflowViolations`.
   - Update `workflow.test.ts` as listed under "Files / components touched".
   - Expected: the `ci.yml` guards pass. The listing and cross-file tests fail, because `deploy.yml` doesn't exist yet.
2. **[API] Add `deploy.yml` + `deployWorkflowViolations` + `deploy-workflow.test.ts`.**
   - Write the workflow exactly as in the API contract.
   - Add positive tests (AC-1 to AC-4, AC-7, AC-9, AC-10, AC-12, AC-13, AC-24, AC-25) and the mutation suite (AC-5 a-g; AC-8 on `deploy.yml`'s `quality-gate`).
   - Expected: `npm test` is green, and `ci.yml` is byte-for-byte unchanged (`git diff --exit-code .github/workflows/ci.yml`).
3. **[FE] Base path in Vite.**
   - Add `APP_BASE` and `base` to `vite.config.ts`.
   - Add `base-path.test.ts` (AC-14, D2) and update `dev-server.test.ts` (AC-18).
   - Expected: `npm test` is green. `npm run build` gives a `dist/index.html` whose asset URLs start with `/quicknotes/assets/`.
4. **[FE] Playwright under the sub-path.**
   - Update `playwright.config.ts`, add `e2e/app.ts`, and switch every navigation in the four existing specs to the helper.
   - Expected: `npm run test:a11y` is green, and every project-foundation browser check passes under `/quicknotes/`. Locally, stop any old preview on port 4173 first, because `reuseExistingServer` is on outside CI.
5. **[TEST] New browser-suite checks.**
   - Add `e2e/base-path.spec.ts` (AC-15, AC-16, AC-17) and the AC-28 test in `document.spec.ts`.
   - Prove the AC-17 test fails: temporarily set `APP_PATH` to `"/"`, run it, see it fail, then revert. Record this in the review.
6. **[FE] Docs + `preview` script.**
   - Update `package.json`, `README.md` (Getting started URL, Scripts, Deployment), `readme.test.ts` and `package-contract.test.ts`.
   - Expected: `npm test` is green.
7. **[TEST] Full local gate.**
   - `npm run ci` exits 0 from a clean tree (AC-19). Check that `git status` shows only the files listed in this plan.
   - Push the branch and open a PR. `CI` runs and passes. `Deploy` must **not** start (R6): check the PR's checks list.
8. **Ship (Release Manager, not this plan's implementer).** The owner does these by hand:
   - Set Settings → Pages → Source = "GitHub Actions". The orchestrator may do this through `gh` only with AITechie's explicit OK.
   - Check `github-pages` for no reviewers, no wait timer, and default-branch-only deployments (AC-11, A5).
   - Merge, then check the first `Deploy` run (AC-6), a manual dispatch (AC-32), and the live checks (AC-30, AC-31).
   - Add the project-foundation cross-reference note (A3).

## Test strategy
"Tooling" means a Vitest test under `tests/tooling/` (node environment),
run by `npm test` in both `CI` and the deploy gate.

| Acceptance criterion | Layer | Test |
|---|---|---|
| AC-1 triggers, name | unit-BE (tooling) | `deploy-workflow.test.ts` › "Deploy runs on push to main and manual dispatch only" |
| AC-2 gate job steps | unit-BE (tooling) | `deploy-workflow.test.ts` › "quality-gate runs npm ci, Playwright install and npm run ci as named steps in order" |
| AC-3 upload is last, after gate, no `if` | unit-BE (tooling) | `deploy-workflow.test.ts` › "uploads dist with upload-pages-artifact as the last step, right after the gate" |
| AC-4 needs + main-only + no status overrides | unit-BE (tooling) | `deploy-workflow.test.ts` › "publish needs the gate, is main-only, and nothing overrides failure" |
| AC-5 mutations (a)-(g) | unit-BE (tooling) | `deploy-workflow.test.ts` › "deploy guard rejects mutation: <a…g>" (`it.each`), plus "deploy guard passes the real deploy.yml" |
| AC-6 first deploy green, env link | manual | Ship check: Actions → Deploy run on `main`, both jobs green, `github-pages` link = live URL |
| AC-7 permissions | unit-BE (tooling) | `deploy-workflow.test.ts` › "contents: read at top; only the publish job has pages/id-token write" |
| AC-8 sole holder of `permissions`, no id-token in ci | unit-BE (tooling) | `workflow.test.ts` › "only deploy.yml's deploy job declares permissions" + mutation tests "rejects permissions on ci.yml quality-gate" and "rejects permissions on deploy.yml quality-gate" |
| AC-9 concurrency | unit-BE (tooling) | `deploy-workflow.test.ts` › "workflow-level concurrency never cancels an in-progress deploy" |
| AC-10 environment | unit-BE (tooling) | `deploy-workflow.test.ts` › "publish job uses github-pages with the page_url output" |
| AC-11 env has no reviewers / timer | manual | Ship check: Settings → Environments → `github-pages` |
| AC-12 actions/* only, no secrets, no git push | unit-BE (tooling) | `deploy-workflow.test.ts` › "uses only pinned actions/* actions and no credentials" |
| AC-13 setup-node from .nvmrc | unit-BE (tooling) | `deploy-workflow.test.ts` › "sets up Node from .nvmrc with npm caching" |
| AC-14 base for build and serve | unit-BE (tooling) | `base-path.test.ts` › "resolved base is /quicknotes/ for build and serve" (+ D2 "base literal is defined once") |
| AC-15 dist/index.html paths | e2e (node-side, after build) | `e2e/base-path.spec.ts` › "built index.html references only /quicknotes/ assets" |
| AC-16 shell + asset responses under sub-path | e2e/UI | `e2e/base-path.spec.ts` › "shell loads under /quicknotes/ with every JS/CSS 200 from the sub-path" |
| AC-17 config + root-navigation detector | e2e/UI | `e2e/base-path.spec.ts` › "Playwright baseURL and webServer.url end in /quicknotes/" (via `test.info()`), "specs navigate straight to /quicknotes/ without a redirect", and "root navigation is detected as a redirect" (self-check) |
| AC-18 dev server URL | integration (tooling) | `dev-server.test.ts` › "dev server serves the shell" (updated regex) |
| AC-19 full gate passes, ci composition | integration + unit-BE | `npm run ci` exit 0 locally and in both workflows. `package-contract.test.ts` › "ci script chains the gate in order" (unchanged) |
| AC-20 ci.yml unchanged | unit-BE (tooling) | `workflow.test.ts` › "one gate workflow with safe settings" (triggers, jobs), "named step per check", "sets up Node from .nvmrc with npm caching", and `node-pin.test.ts`, the last three with unchanged expectations. Plus `git diff` on `ci.yml` at review. |
| AC-21 README deployment + dev URL | unit-BE (tooling) | `readme.test.ts` › "documents deployment", "Getting started dev URL ends in /quicknotes/" |
| AC-22 ci.yml guards | unit-BE (tooling) | `workflow.test.ts` › "one gate workflow with safe settings" (now including no job `permissions` and `/id-token/`) |
| AC-23 exactly two workflow files | unit-BE (tooling) | `workflow.test.ts` › "workflows directory is exactly ci.yml and deploy.yml" + "listing guard rejects a third file" + "listing guard rejects a missing deploy.yml" |
| AC-24 two jobs; deploy job is one deploy-pages step | unit-BE (tooling) | `deploy-workflow.test.ts` › "exactly quality-gate and deploy; deploy has one deploy-pages step" + mutation "rejects a run step in the deploy job" |
| AC-25 each Pages action exactly once | unit-BE (tooling) | `workflow.test.ts` › "upload-pages-artifact and deploy-pages each appear exactly once, in place" |
| AC-26 guards live in npm test with negatives | unit-BE (tooling) | Shown by the rows above. Every guard function has at least one `…rejects…` test. Checked at review by listing `tests/tooling/*workflow*.test.ts` and `base-path.test.ts`. |
| AC-27 ci.yml rejects Pages/upload actions | unit-BE (tooling) | `workflow.test.ts` › "ci guard rejects a step using <deploy-pages / upload-pages-artifact / upload-artifact>" (`it.each`) |
| AC-28 dist contents, no CNAME | e2e (node-side, after build) | `e2e/document.spec.ts` › "dist is static files only, with no host config or CNAME" |
| AC-29 same-origin, no SDKs, no storage | e2e/UI + tooling | Existing `e2e/privacy.spec.ts` › "all requests are same-origin", "no storage or cookies on fresh load" (now at `./`), and `tests/tooling/privacy.test.ts` › "no analytics/telemetry SDKs in dependencies" |
| AC-30 live network/console | manual | Ship check: Chrome DevTools on the live URL, cache disabled |
| AC-31 live shell on desktop + iOS | manual | Ship check: Chrome desktop + iOS Safari, compared with `npm run preview` at `/quicknotes/` |
| AC-32 manual dispatch on main | manual | Ship check: Actions → Deploy → Run workflow on `main`. R5 is proved statically by AC-4/AC-5. |

The tooling guards don't depend on `dist/`, because `npm test` runs
before `build` in the gate. Every `dist/` scan (AC-15, AC-28) runs in
Playwright, after `test:a11y`'s build, like the existing "build output"
test.

## Risks & rollback

| Risk | Detection | Mitigation / response |
|---|---|---|
| Specs silently load from the server root because Vite redirects `/` to `/quicknotes/` | AC-17 no-redirect test and its self-check | All navigation goes through `gotoApp`, and Step 5 proves the detector fails when `APP_PATH` is `/` |
| Pages source not set to "GitHub Actions" before merge | First `Deploy` publish step fails with GitHub's error. Live URL 404s. | Ship prerequisite (Step 8). Re-run with Actions → Deploy → Run workflow on `main` once it is set. |
| `github-pages` environment protection blocks or delays deploys | Run waits on approval, or the deploy is rejected | AC-11 manual check. Defaults have no reviewers. |
| Pages action majors change behaviour (for example a future v6 artifact format) | Deploy step fails | Majors are pinned. Upgrade both together in a later change, checking that the uploader's `upload-artifact` version is still accepted by `deploy-pages`. |
| Gate flakiness now blocks deploys as well as CI | Red `Deploy` run | Playwright already retries once in CI (`retries: process.env.CI ? 1 : 0`). Re-run the workflow, or fix forward. |
| Queued deploys: with `cancel-in-progress: false`, a newer push replaces an older *pending* run in group `pages` | Actions shows the superseded run as cancelled | Accepted. The latest `main` still deploys, and a running deploy is never cut off (R9). |
| `vitest/config`-based `vite.config.ts` imported by `playwright.config.ts` fails to load under Playwright's TS loader | `npm run test:a11y` errors at startup | Fallback, recorded as a plan update before continuing: Playwright config keeps its own `/quicknotes/` literal, and D2's single-definition test whitelists `playwright.config.ts`. AC-17 still guards the value. |
| Local `reuseExistingServer` picks up a stale root-based preview on port 4173 | e2e failures locally only | Stop old preview servers. The AC-17 config test points straight at the cause. |
| The gate runs twice per `main` push | Actions minutes | Accepted (A1). Free tier on a public repo. |

**Rollback.**
- Bad app change: revert the commit on `main`. The revert deploys
  through the normal path (R13).
- Undo this feature: revert its merge commit. `deploy.yml` disappears
  and the guards return to the one-workflow state. The site keeps
  serving the last deployment until Pages is unpublished. That is
  Settings → Pages, done by the owner.
- Stop deploys without a code change: disable the `Deploy` workflow in
  the Actions UI.

## Explicitly out of scope
- No change to `ci.yml`, including adding `concurrency` or excluding
  `main` (spec non-goal). The duplicate gate run is accepted (A1).
- No `workflow_run` or cross-workflow status lookup.
- No `actions/configure-pages`. The base is fixed in Vite, not read from
  the Pages API.
- SHA-pinning actions. AC-12 requires `@v<n>` tags, matching `ci.yml`.
  Floating major tags is a trade-off accepted for consistency.
- No automated checks against the live URL. AC-6, AC-11 and AC-30 to
  AC-32 are manual at ship (owner decision).
- No test that forces a failed publish (A4).
- No SPA `404.html`, custom favicon, `CNAME`, PR or branch preview
  deploys.
- No edits to `specs/project-foundation/*` or to this spec. The
  cross-reference note is the owner's job at ship (A3).
- The Playwright `webServer` command is not switched to `npm run
  preview` (D1).

## Approval
- Approved by: AITechie, 2026-10-06
