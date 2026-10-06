# Review: Project foundation (app scaffold, lint, tests, CI)

- Slug: project-foundation
- Spec: [spec.md](./spec.md) (Approved, AITechie, 2026-10-05, Revision 2026-10-05)
- Plan: [plan.md](./plan.md) (Approved, AITechie, 2026-10-05, Revision 2026-10-05)
- PR: none yet (changes are uncommitted on `main`; most files untracked)
- Date: 2026-10-05
- Review iteration: 1

## How this review was run
- Node `v24.18.0` placed first on `PATH`; `~/.npmrc` not touched.
- `npm run ci` run by the reviewer in the repo: **exit 0**. Steps ran in
  order format:check → lint → typecheck → test → build → test:a11y.
  Vitest: 13 files, **39/39** passed. Playwright (Chromium): **17/17** passed.
  This matches the build agent's report.
- Negative-path mutations were run in a **scratch copy** of the repo (the
  real source was never edited), with a separate tsbuildinfo cache. The
  scratch copies were deleted afterwards. `git status` in the repo was
  unchanged by the review (apart from this file).
- A fresh `npm ci` into an empty `node_modules` (scratch copy, Node 24)
  exited 0 with no `EBADENGINE`. `npm run dev` then printed
  `http://localhost:5173/`, and `curl` got 200 with `<title>QuickNotes</title>`.

## Spec conformance
Legend: **met** = verified by a passing automated test and/or a reviewer
check run in this review. **pending (human)** = needs GitHub, real
devices or a screen reader. Not marked met.

| AC | Status | How verified |
|---|---|---|
| AC-1 | met | `tests/tooling/dev-server.test.ts` (pass), plus a reviewer run of fresh `npm ci` → `npm run dev` → printed URL → HTTP 200 with `<title>QuickNotes</title>`. Note: from a fresh copy of the working tree, not a `git clone`, because the code isn't committed yet. |
| AC-2 | met | `tests/tooling/readme.test.ts` (pass). Reviewer read the "Getting started" and "Scripts" sections: all 9 scripts have one-line descriptions. |
| AC-3 | met | `package-contract.test.ts` "stack deps present, strict TS, no UI kit" + "application source is TypeScript only (R2)" (pass). |
| AC-4 | met | `node-pin.test.ts` (pass). `.nvmrc`=`24`, `engines.node`=`^24.0.0`, workflow `node-version-file: .nvmrc`. |
| AC-5 | met | `eslint-config.test.ts` (pass) + reviewer mutation: an unused `const` appended to `src/App.tsx` made `npm run lint` **exit 1** (`@typescript-eslint/no-unused-vars`). The clean repo exits 0. |
| AC-6 | met | `eslint-config.test.ts` "required recommended configs and --max-warnings 0" (pass). The reviewer read `eslint.config.js`: all four recommended presets, with `eslint-config-prettier` last. |
| AC-7 | met | `typecheck.test.ts` (pass, TS2322) + reviewer mutation: `src/Bad.tsx` with `const n: number = "x"` made `npm run typecheck` **exit 2** (TS2322). It exits 0 again after removal. |
| AC-8 | met | `prettier.test.ts` (pass) + reviewer mutation: extra spaces in the `<h1>` JSX tag made `npm run format:check` **exit 1** and name `src/components/AppHeader.tsx`. After `npm run format`, `format:check` **exit 0** and the file matched the original byte for byte. |
| AC-9 | met | Reviewer's `npm test`: `vitest run`, 13 files in jsdom/node, exit 0, no watch mode. `package-contract.test.ts` asserts `vitest run` + `jsdom`. |
| AC-10 | met | Reviewer mutation: the expected heading in `App.test.tsx` changed to `"WrongName"` made `npm test` **exit 1** (App shell test failed). |
| AC-11 | met | `e2e/a11y.spec.ts` "shell has no WCAG 2.1 A/AA axe violations" (pass). Tags `wcag2a/wcag2aa/wcag21a/wcag21aa`, 0 violations, `color-contrast` not incomplete, ≥3 nodes checked. `test:a11y` builds first and `webServer` serves `dist/` via `vite preview`. |
| AC-12 | met | `e2e/a11y.spec.ts` "axe detects a contrast failure" (pass) + the full reviewer mutation: class `text-zinc-600` → `text-zinc-300` in `EmptyState.tsx` made `npm run test:a11y` **exit 1** with a `color-contrast` violation (1 failed, 16 passed). |
| AC-13 | met | `e2e/document.spec.ts` "build output has index.html, hashed js and css" (pass). The reviewer's build produced `dist/index.html`, `assets/index-DAPyqiGd.js` and `assets/index-_XbBXyvV.css`. |
| AC-14 | met | `package-contract.test.ts` "ci script chains the gate in order" (pass). Clean `npm run ci` **exit 0** in the right order (see above). With a lint error, `npm run ci` **exit 1**, and the log shows only `format:check` then `lint`, with typecheck/test/build/test:a11y not run. |
| AC-15 | met | `workflow.test.ts` "one gate workflow with safe settings" (pass). The reviewer read `.github/workflows/ci.yml`: one file, `push` (`**`) + `pull_request`, `ubuntu-latest`, `permissions: contents: read`, no `secrets.`, no `continue-on-error`, no deploy or publish. |
| AC-16 | met | `workflow.test.ts` "named step per check" (pass): it asserts the exact step names and order, including "Install Playwright Chromium". |
| AC-17 | **met** | Throwaway draft PR #2 (closed, branch deleted), recorded 2026-10-06. Each single-fault commit's `pull_request` CI run concluded `failure` at the matching step: lint error → Lint ([run](https://github.com/ai-integration-techie/quicknotes/actions/runs/37430330091)); type error → Type check ([run](https://github.com/ai-integration-techie/quicknotes/actions/runs/37430396706)); formatting drift → Format check ([run](https://github.com/ai-integration-techie/quicknotes/actions/runs/37430456668)); failing test → Unit tests ([run](https://github.com/ai-integration-techie/quicknotes/actions/runs/37430520175)); build error → Build ([run](https://github.com/ai-integration-techie/quicknotes/actions/runs/37430610787)); axe violation → Accessibility ([run](https://github.com/ai-integration-techie/quicknotes/actions/runs/37430674533)). |
| AC-18 | **met** | Green "CI" run (job `quality-gate`, conclusion: success) on cbfa654 (`feat/project-foundation`), recorded 2026-10-06: https://github.com/ai-integration-techie/quicknotes/actions/runs/37423715846 |
| AC-19 | met | `src/App.test.tsx` "renders banner with the only h1 and the empty state in main" (pass). |
| AC-20 | met | `src/App.test.tsx` "has no interactive controls" (pass). |
| AC-21 | met | `e2e/document.spec.ts` "document head meets R21" (pass). The reviewer read `dist/index.html`: `lang="en"`, `charset="UTF-8"`, the exact viewport string, title QuickNotes. |
| AC-22 | met | `e2e/document.spec.ts` "noscript message shows with JS disabled" (pass): exact copy in the raw HTML, and visible with JS off. |
| AC-23 | met | `src/components/ErrorBoundary.test.tsx` (both tests pass). |
| AC-24 | met | `e2e/privacy.spec.ts` "no web fonts; h1 uses system stack" (pass) + `theme.test.ts` "theme sets --font-sans to a system UI stack" (pass). `src/index.css` declares `--font-sans: ui-sans-serif, system-ui, …` once in `@theme`. |
| AC-25 | met | `theme.test.ts`: accent is the only non-zinc token at `#1d4ed8`, zinc tokens equal Tailwind's hex, and the class scan allows only zinc/white/accent, with a self-test that the scan flags `blue-500` (all pass). |
| AC-26 | met | `e2e/layout.spec.ts` "keyboard focus shows 2px accent outline" (pass): Tab focus, outline not `none`, width ≥2, colour `rgb(29, 78, 216)`. |
| AC-27 | met | `e2e/layout.spec.ts` × 4 viewports (360/768/1280/1920, all pass). |
| AC-28 | met | `e2e/layout.spec.ts` "reflows at 320px with 200% root font" (pass). |
| AC-29 | met | `e2e/layout.spec.ts` "survives WCAG 1.4.12 text spacing at 360px" (pass). |
| AC-30 | met | `e2e/layout.spec.ts` "no animations or transitions" (pass). |
| AC-31 | met | `e2e/privacy.spec.ts` "all requests are same-origin" (pass). Reviewer check: the only absolute URLs in `dist/` are XML namespace strings, React's error-doc base URL and Tailwind's licence banner. None of them is requested. |
| AC-32 | met | `tests/tooling/privacy.test.ts` (3 tests pass, including a self-test of the external-asset regex). |
| AC-33 | met | `e2e/privacy.spec.ts` "no storage or cookies on fresh load" (pass). It also asserts `context.cookies()` is empty. |
| AC-34 | **partially met (config met, manual matrix pending, human)** | Config half: `package-contract.test.ts` "browser targets cover last 2 versions" (pass). `browserslist` lists the last 2 of each browser, and `build.target` is `chrome111/edge111/firefox128/safari16.4/ios16.4`. **Pending:** open the shell in current Chrome, Edge, Firefox, Safari and iOS Safari, then record the version and pass/fail for each here (header + empty state, no layout faults). |
| AC-35 | **pending (human)** | Needs macOS VoiceOver + Safari and iOS VoiceOver + Safari. Record the announced order: title "QuickNotes" → "QuickNotes, heading level 1" → "No notes yet" → "Your notes will show up here." Also do the keyboard-only pass the spec mentions (Tab moves no focus into the content, and nothing traps focus). |
| AC-36 | met | `licences.test.ts` (4 tests pass): every lockfile package is OSI-licensed or a listed exception at its exact licence. The exception map is frozen and holds exactly the 3 packages. `e2e/document.spec.ts` "R5 licence exceptions are not shipped" (pass). Reviewer check: all 3 exceptions are marked `dev: true` in `package-lock.json`, and `grep` finds none of their names in `dist/`. `workflow.test.ts` asserts only `actions/*` actions. The README needs no paid service or secret. |

**Summary:** 34 met (AC-17 and AC-18 recorded on GitHub, 2026-10-06), 1 partially
met (AC-34, the manual browser matrix is deferred to the owner), and 1 pending human
check (AC-35, VoiceOver and keyboard pass, deferred to the owner). None of the 36 is not met. The plan routes all
pending items to review on purpose (plan "Test strategy" and step 11). The
reviewer can't do them without GitHub access, a Firefox/Safari/iOS device
matrix and VoiceOver.

## UX conformance
- Flow US-1 (developer setup): **matches**. README steps verified, and a fresh install + `npm run dev` serves the shell.
- Flow US-2 (local checks): **matches**. Each script exits 0 clean, and the ones mutated in review exit non-zero with the tool's own file/line output (ESLint `14:7`, tsc `(1,14)`, Prettier `[warn] <file>`).
- Flow US-3 (CI): **matches by inspection**. There's one "CI" workflow with each check as a named step. The live red/green behaviour is pending (AC-17/18).
- Flow US-4/US-5 (end user): **matches**. Header + empty state, nothing interactive (AC-19/20, e2e).
- Screen, header: **matches**. `<header>` has `bg-white`, `border-b border-zinc-200` (1px), `px-4 sm:px-6`, and an `<h1>` with `text-xl font-semibold text-zinc-900`.
- Screen, main: **matches**. `max-w-3xl` centred, body `zinc-50`, empty state with `pt-16` (4rem), centred text. Primary `text-lg font-medium text-zinc-900`, secondary `text-base text-zinc-600`. No footer, navigation or icons.
- State Empty / Success: **matches** (default render).
- State Loading: **matches**. `dist/index.html` puts the CSS `<link>` in `<head>`, and `body { background-color: zinc-50 }` is in `@layer base`, so there's no white flash. The title is in static HTML.
- State Error: **matches**. The `ErrorBoundary` fallback is a centred `role="alert"` with the exact copy and replaces the whole shell (it wraps `<App/>` in `main.tsx`). It's unit-tested. There's no browser-level test of the fallback, but the spec doesn't require one.
- State JS disabled: **matches**. `<noscript>` shows the exact copy (e2e).
- Copy table: **matches**. All six strings are exact (`src/copy.ts`, `index.html`, and tests).
- Accessibility section: automated parts **match** (landmarks, single h1, axe, contrast, reflow, text spacing, focus style, no motion). VoiceOver and the keyboard-only pass are **pending (human)**, see AC-35.

## API contract conformance
- Network API: N/A (plan: no backend, no network calls). This is enforced by AC-31.
- Developer-tooling contract: **matches**. All 9 scripts equal the plan's table exactly (`package-contract.test.ts` "documents the developer-tooling scripts" plus the `test` and `ci` assertions, and the reviewer read `package.json`).
- CI workflow contract: **matches**. Name `CI`, one job `quality-gate`, `push: branches ['**']` + `pull_request`, `contents: read`, `ubuntu-latest`, `timeout-minutes: 15`, the 10 named steps in the plan's order, `actions/checkout@v7` and `actions/setup-node@v7` (both tags exist upstream), with `node-version-file: .nvmrc` and `cache: npm`.
- DOM contract: **matches**. One banner holding the only h1, one main, the `accent` token defined once as the only non-zinc colour, `--font-sans` defined once in `@theme` starting with `ui-sans-serif, system-ui`, and `:focus-visible` set to `outline: 2px solid var(--color-accent); outline-offset: 2px`.

## Findings
No correctness bugs, security issues or privacy issues found. None of the
findings below is blocking.

Security and privacy sweep (clean):
- No secrets, API keys or tokens anywhere in `src/`, `tests/`, `e2e/`, configs or the workflow. The workflow uses no `secrets.*`, has read-only `contents`, and uses only first-party `actions/*`.
- No email addresses or personal contact details in the new files, README, charter, specs or factory ledgers. The README's clone step uses a placeholder (`<this repo's URL>`).
- No third-party network calls: no CDN, font or analytics references in source or HTML, and the runtime is checked by AC-24/31. `ErrorBoundary` logs to `console.error` only.
- `dev-server.test.ts` and Playwright bind to `localhost` only.

Low / simplification (optional, no change required for this feature):
1. **Unused export.** `NOSCRIPT_MESSAGE` in `src/copy.ts` isn't imported anywhere. `e2e/document.spec.ts` repeats the string as `NOSCRIPT_COPY`, and `e2e/layout.spec.ts`/`a11y.spec.ts` hardcode the other copy strings. Either import from `src/copy.ts` in e2e (which pulls `src/copy.ts` into the node tsconfig) or drop the export. It's harmless either way, because the e2e test pins the exact text.
2. **Duplicated `@theme` parsing** in `tests/tooling/theme.test.ts`. `themeColourTokens()` and `themeDeclarations()` each strip comments and match `@theme` blocks separately. One shared helper would do. The `[^}]*` block regex would also break if `@theme` ever held nested braces, but it doesn't today.
3. **Broad raw-text guard** in `workflow.test.ts`: `/deploy|pages|publish|upload-artifact/i` over the whole YAML would also trip on a harmless comment or step name containing "pages". That's acceptable as a tripwire, but `pages-deploy` will need its own workflow file anyway (and the "exactly one file" assertion will need revisiting then).
4. **"repo source lints clean" test is brittle to stray files.** `eslint.lintFiles(["src"])` reports any message, and in the scratch copy a stray `src/App.tsx.bak` made it fail. It duplicates `npm run lint`, which already gates CI. It's fine to keep as the plan specifies. Just be aware that it fails on editor backup files in `src/`.
5. **Local `reuseExistingServer`.** Locally, Playwright reuses whatever is already on port 4173. A stale `vite preview` from an older build could make e2e run against old assets. It's CI-safe (`!process.env.CI`) and was accepted in the plan. Noted only.
6. **npm `allow-scripts` warning** on a fresh `npm ci`, for `fsevents@2.3.3` (an optional macOS-only dependency). It's informational. Install still exits 0, CI runs on Ubuntu where `fsevents` is skipped, and Vite works without it.
7. **Duplicate builds and type checks** (`typecheck`, `build`, and `test:a11y` → `build` all run `tsc -b`). The plan already accepted this. Noted only.

## Decision
**approve**. The implementation matches the approved spec and plan, with
no code changes requested. I verified the full local gate myself on Node 24.18.0:
`npm run ci` exited 0, Vitest 39/39 and Playwright 17/17 passed, and every
negative-path check I could run locally (AC-5/7/8/10/12/14) exits non-zero
as required.

Blocking code findings: none.

**Before the ship gate, the human must complete and record the following**
(the plan routes these to review, and they are not marked passed above):
1. AC-17: a throwaway PR with 6 single-fault commits, showing the right named step red each time (record links).
2. AC-18: a green "CI" run on the clean feature commit (record the link).
3. AC-34: a manual check in current Chrome, Edge, Firefox, Safari and iOS Safari (record versions and results).
4. AC-35: VoiceOver on macOS Safari and iOS Safari reading order, plus a keyboard-only pass (record results).

If any of these fails, this review flips to `changes_requested` with that
item as the blocker.

## Sign-off
- Reviewed by: AITechie, 2026-10-06.
