# Plan: Project foundation (app scaffold, lint, tests, CI)

- Status: Approved
- Slug: project-foundation
- Spec: [spec.md](./spec.md) (Status: Approved, AITechie, 2026-10-05, including "Revision 2026-10-05")
- Date: 2026-10-05

## Revision 2026-10-05
The 2026-10-04 revision of this plan was approved, and most of the code
it describes already exists. The spec has since been amended and
re-approved (spec "Revision 2026-10-05", AITechie, 2026-10-05). This
revision makes targeted changes only, following decisions by the Tech
Lead (AITechie). It describes the target state, and the build agent
closes any gap between the code and this plan.
- **Licences (R5 / AC-36):** `MIT-0` joins the OSI allowlist. A named,
  commented exception list in `licences.test.ts` holds exactly
  `caniuse-lite` (CC-BY-4.0), `language-subtag-registry` (CC0-1.0) and
  `mdn-data` (CC0-1.0). The test fails on any other non-OSI licence, if a
  listed package's licence changes, or if an excepted package appears in
  `dist/`.
- **Font (R24 / AC-24):** `src/index.css` sets `--font-sans` explicitly in
  `@theme`, starting with `ui-sans-serif, system-ui`. The plan no longer
  relies on Tailwind's default (Tailwind 4.3.3 changed it to start with
  `-apple-system`). `theme.test.ts` gains the `@theme` check that the
  revised AC-24 asks for.
- **Colour (risk mitigation, accepted):** Tailwind's zinc scale is
  restated as hex in `@theme`, because axe-core can't evaluate `oklch()`
  and reported contrast as "incomplete". `theme.test.ts` allows zinc
  tokens only at Tailwind's own hex values, and `accent` stays the only
  non-zinc token. The a11y test requires contrast to be checked on at
  least 3 nodes, with none left incomplete.
- **Implementation adjustments now part of the plan:**
  `tsconfig.node.json` adds the `dom` lib, `src/test/setup.ts` calls RTL
  `cleanup()`, the noscript e2e test targets `noscript p`, the R2 source
  check allows `src/index.css`, there's a shared `tests/tooling/repo.ts`
  helper, the workflow uses `actions/checkout@v7` and
  `actions/setup-node@v7`, and the README keeps the SpecFabric section
  under "How this project is built".
- **Environment:** the `nvm use 24` workaround (`~/.npmrc` sets `prefix`)
  is documented in Risks and the README guidance.
- **Assumptions and pins:** the assumptions table and the TS `~6.0` /
  ESLint `^9.39` pins are confirmed by the Tech Lead.

## Approach

The repo has no application code yet. It contains only the SpecFabric
framework (`CLAUDE.md`, `docs/`, `templates/`, `.claude/`, `factory/`,
`product/`, `specs/`), a lab kit under `labs/notes-app/` (Python and plain
JS, unrelated to this app), a tool directory `.kilo/` (a self-ignoring
worktree store), and a template `README.md` titled `# <project name>`.
There is no `package.json`, no root `.gitignore` and no `.github/`. So
this plan scaffolds everything at the repo root, **by hand rather than
with `npm create vite`**. The generator would overwrite `README.md`, add
demo assets and pull in an ESLint setup that doesn't match R7.

The app is a static Vite SPA: React 19 + TypeScript (strict) + Tailwind
CSS v4 through the official `@tailwindcss/vite` plugin. Tailwind v4 uses
CSS-first configuration, so the theme (the single `accent` token, the
`body` background and the global `:focus-visible` outline) lives in one
`src/index.css` and there is no `tailwind.config.js`. The quality gate has
three tiers, and each tier checks what it can check reliably:

1. **Vitest + jsdom + React Testing Library** (`npm test`). This covers
   the component tests (shell structure, error boundary) and a
   `tests/tooling/` suite running in the Node environment. That suite
   checks the repo's own contracts: package.json, workflow, ESLint,
   Prettier, TypeScript, theme, privacy and licences. It turns the spec's
   "when inspected" and "given a broken file" criteria into fast,
   repeatable tests instead of one-off manual checks.
2. **Playwright + `@axe-core/playwright` in headless Chromium**
   (`npm run test:a11y`). This builds the app, serves `dist/` with
   `vite preview`, and runs axe plus the layout, reflow, focus, motion,
   network and storage checks. These need a real layout engine.
3. **Manual checks recorded in `review.md`.** These cover what only a
   human can do here: CI failing on a real throwaway PR (AC-17/18),
   Firefox/Safari/iOS (AC-34) and VoiceOver (AC-35).

The local `npm run ci` is a plain `&&` chain (no extra dependency), so it
stops at the first failure. The GitHub Actions workflow runs the same
scripts as separate named steps.

### Package versions (checked against the npm registry on 2026-10-05)

Two of the "latest" versions **cannot** be used together with the
required plugins, so the plan pins below them on purpose:

| Package | Pin | Why |
|---|---|---|
| `typescript` | `~6.0.3` (not 7.x) | `typescript-eslint@8.71` peer range is `typescript >=4.8.4 <6.1.0`. TS 7 would break R7's required `typescript-eslint` rules. |
| `eslint`, `@eslint/js` | `^9.39` (not 10.x) | `eslint-plugin-jsx-a11y@6.10.2` (last published 2024) declares peer `eslint ^3..^9`. ESLint 10 would need `--legacy-peer-deps`, which `npm ci` in CI shouldn't depend on. |
| `vite` 8.x, `@vitejs/plugin-react` 6.x, `react`/`react-dom` 19.x, `tailwindcss`/`@tailwindcss/vite` 4.x, `vitest` 5.x, `jsdom` 30.x, `@testing-library/react` 16.x, `@testing-library/jest-dom` 7.x, `@playwright/test` 1.63.x, `@axe-core/playwright` 4.13.x, `typescript-eslint` 8.x, `eslint-plugin-react-hooks` 7.x, `eslint-plugin-jsx-a11y` 6.10.x, `eslint-config-prettier` 10.x, `globals`, `prettier` 3.x, `yaml` 2.x, `@types/react`, `@types/react-dom`, `@types/node` ^24 | caret on current major | Mutually compatible per their peer ranges; Vitest 5 engines `^22.12 \|\| ^24 \|\| >=26` and Vite 8 `>=22.12` both accept Node 24. |

Exact resolved versions are fixed by the committed `package-lock.json`
(R3). If the implementer finds a newer `eslint-plugin-jsx-a11y` that
supports ESLint 10, or a `typescript-eslint` that supports TS 7, staying
on the pins above is still fine. Changing them is a plan update, not a
silent swap.

**Confirmed 2026-10-05 by the Tech Lead (AITechie):** the `typescript
~6.0` and `eslint`/`@eslint/js ^9.39` pins stand.

### Assumptions (confirmed by the Tech Lead, AITechie, 2026-10-05)

The spec's six "Open questions / risks" are now recorded as accepted as
proposed (spec "Revision 2026-10-05"), and the Tech Lead has confirmed
each default below:

| # | Spec open question | Default this plan builds |
|---|---|---|
| 1 | Accent colour | Tailwind `blue-700`, as the literal hex `#1d4ed8`, defined once as `--color-accent`. |
| 2 | Node.js version | Node **24** LTS in `.nvmrc` (`24`), `engines.node` (`^24.0.0`) and CI (`node-version-file: .nvmrc`). |
| 3 | Extras beyond the intent | **Keep all four**: secondary empty-state line (R20), `<noscript>` (R22), error boundary (R23), `npm run ci` (R13). |
| 4 | Browser-based a11y check | **Accept** Playwright + axe in headless Chromium in CI (~100-150 MB download, ~1 min). No jsdom-only fallback. |
| 5 | CI trigger duplication | **Accept** `push` (all branches) **and** `pull_request`. Same-repo PRs run the gate twice. |
| 6 | Cross-browser / screen-reader coverage | **Accept** manual Firefox / Safari / iOS Safari / VoiceOver checks recorded in `review.md`. CI automates Chromium only. |

All six rows are confirmed. Changing any of them later is a plan
revision.

## Architecture

### API contract
N/A for network APIs. QuickNotes has no backend and makes no network
calls (charter; R32).

What later features and CI do build against is the **developer-tooling
contract**. Changing it means updating this plan first:

| Script | Command | Exit behaviour |
|---|---|---|
| `dev` | `vite` | Long-running; prints local URL |
| `build` | `tsc -b && vite build` | Non-zero on type or build error; writes `dist/` |
| `typecheck` | `tsc -b` (all referenced configs have `noEmit: true`) | Non-zero on any type error |
| `lint` | `eslint . --max-warnings 0` | Non-zero on any error or warning |
| `format` | `prettier --write .` | Rewrites files |
| `format:check` | `prettier --check .` | Non-zero and lists unformatted files |
| `test` | `vitest run` | Non-zero on failure or when no test files are found (Vitest default `passWithNoTests: false`) |
| `test:a11y` | `npm run build && playwright test` | Builds, Playwright's `webServer` runs `vite preview --port 4173 --strictPort`, non-zero on any failure |
| `ci` | `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build && npm run test:a11y` | Stops at first non-zero |

CI workflow contract (`.github/workflows/ci.yml`, name `CI`, one job
`quality-gate`):
- `on: push: branches: ['**']` and `pull_request`
- `permissions: contents: read`
- `runs-on: ubuntu-latest`, `timeout-minutes: 15`
- No `secrets.*`, no `continue-on-error`, and no deploy or publish step.

The steps, in order and each one named:

1. "Checkout": `actions/checkout@v7`.
2. "Set up Node": `actions/setup-node@v7`, with
   `node-version-file: .nvmrc` and `cache: npm` (R18).
3. "Install dependencies": `npm ci`.
4. "Format check".
5. "Lint".
6. "Type check".
7. "Unit tests".
8. "Build".
9. "Install Playwright Chromium":
   `npx playwright install --with-deps chromium`.
10. "Accessibility": `npm run test:a11y`.

DOM contract that later features inherit:
- One `<header>` (banner) holds the only `<h1>`.
- One `<main>` holds the feature content.
- The theme token `accent` is defined once, and is the only non-zinc
  colour token.
- `--font-sans` is defined once in `@theme`, starting with
  `ui-sans-serif, system-ui`.
- The global `:focus-visible` outline is 2px solid accent, with a 2px
  offset.

### Data model
N/A: no notes, no persistence. The shell must not touch IndexedDB, Web
Storage or cookies (R33). The note model belongs to `note-storage`.

### Backend
N/A: the charter specifies no server. The app is a static build served
from `dist/`.

### Frontend
Component map for the spec's single screen:

| Spec element | Component / file | Rendering |
|---|---|---|
| Page document | `index.html` | `<html lang="en">`, `<meta charset="UTF-8">`, viewport `width=device-width, initial-scale=1`, `<title>QuickNotes</title>`, `<div id="root">`, `<noscript>` with the exact R22 copy (styled with Tailwind classes; Tailwind v4 auto-scans `index.html`). No external `<script>`/`<link>`. |
| Bootstrap | `src/main.tsx` | `createRoot(#root)`, `<StrictMode><ErrorBoundary><App/></ErrorBoundary></StrictMode>`, imports `./index.css`. |
| Theme | `src/index.css` | `@import "tailwindcss";` then one `@theme` block with: `--color-accent: #1d4ed8`; `--font-sans` set explicitly to a system UI stack starting with `ui-sans-serif, system-ui` (for example `ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`); and `--color-zinc-50` to `--color-zinc-950` restated at Tailwind's own sRGB hex values (`#fafafa`, `#f4f4f5`, `#e4e4e7`, `#d4d4d8`, `#a1a1aa`, `#71717a`, `#52525b`, `#3f3f46`, `#27272a`, `#18181b`, `#09090b`), with a comment saying why (axe-core can't evaluate `oklch()`). In `@layer base`: `body { background-color: var(--color-zinc-50); }` and `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }`. No `@font-face`, keyframes or transitions. |
| App shell layout | `src/App.tsx` | `<div className="min-h-screen">` → `<AppHeader/>` + `<main className="mx-auto w-full max-w-3xl px-4 sm:px-6">` → `<EmptyState/>`. |
| Header | `src/components/AppHeader.tsx` | `<header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6"><h1 className="text-xl font-semibold text-zinc-900">QuickNotes</h1></header>` |
| Empty state | `src/components/EmptyState.tsx` | `<div className="pt-16 text-center">` + `<p className="text-lg font-medium text-zinc-900">No notes yet</p>` + `<p className="text-base text-zinc-600">Your notes will show up here.</p>` (wrapping allowed; `break-words`). |
| Error state | `src/components/ErrorBoundary.tsx` | Class component (React has no hook equivalent; no third-party lib). It uses `getDerivedStateFromError` and `componentDidCatch`, which logs to `console.error` only, with no reporting service (R32). The fallback is `<div role="alert" className="mx-auto max-w-3xl px-4 pt-16 text-center text-zinc-900">Something went wrong. Reload the page to try again.</div>`. |
| Shared copy | `src/copy.ts` | Exported string constants for the copy table, used by components and tests so the exact text lives in one place. (`index.html` copy is duplicated there by necessity and checked by e2e.) |

How each spec State renders:
- **Empty, the default and only Success state:** `App` as above.
- **Loading:** nothing rendered by React. In production, Vite injects the
  CSS `<link>` into `<head>`, so `body` is `zinc-50` before the JS runs
  and there is no white flash. The tab title comes from `index.html`.
- **Error:** the `ErrorBoundary` fallback replaces the whole shell.
- **JS disabled:** the `<noscript>` content shows.

State management: none, since the shell is stateless apart from the error
boundary's `hasError`. Fonts: `src/index.css` sets `--font-sans` explicitly in
`@theme` (R24), and Tailwind preflight applies it to `html`. The app does
not rely on Tailwind's default `--font-sans`, which changed in 4.3.3. No
web fonts are loaded.
Browser targets (R31): `vite.config.ts` sets
`build.target: ['chrome111','edge111','firefox128','safari16.4','ios16.4']`.
That is Tailwind v4's own floor and sits below the last 2 versions of
each browser. `package.json` also gets a `browserslist` field listing
`last 2 Chrome/Edge/Firefox/Safari/iOS versions` so the intent is
documented and checkable.

## Files / components touched
New (repo root unless noted):
- `package.json`: scripts as above, `"type": "module"`, `"private": true`, `engines.node: "^24.0.0"`, `browserslist`.
- `package-lock.json`
- `.nvmrc`: `24`.
- `.gitignore`: `node_modules/`, `dist/`, `coverage/`, `playwright-report/`, `test-results/`, `blob-report/`, `*.tsbuildinfo`, `.DS_Store`.
- `.prettierrc.json`: defaults, `{}` plus nothing else unless needed.
- `.prettierignore`: `dist`, `coverage`, `playwright-report`, `test-results`, `package-lock.json`, `.kilo`, `labs`, `templates`, `docs`, `specs`, `factory`, `product`, `.claude`, `CLAUDE.md`. SpecFabric artifacts and the lab kit are human- or agent-authored markdown/YAML that the app's formatter must not rewrite.
- `eslint.config.js`: flat config with these parts:
  - `globalIgnores` for the same non-app paths plus build output.
  - `@eslint/js` `configs.recommended`.
  - `typescript-eslint` `configs.recommended`.
  - The `eslint-plugin-react-hooks` recommended flat config.
  - `eslint-plugin-jsx-a11y` `flatConfigs.recommended`.
  - `globals.browser` for `src/`, and `globals.node` for config files, `tests/` and `e2e/`.
  - `eslint-config-prettier` last.
- `tsconfig.json`: solution file with `files: []` and references to app and node.
- `tsconfig.app.json`: `src/**`, `strict: true`, `noEmit`, `jsx: react-jsx`, `module: esnext`, `moduleResolution: bundler`, `target: es2022`, `lib: [es2022, dom, dom.iterable]`, `types: ["vite/client", "@testing-library/jest-dom"]`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`.
- `tsconfig.node.json`: `vite.config.ts`, `playwright.config.ts`, `tests/**`, `e2e/**`, with `strict: true`, `noEmit`, `types: ["node"]` and `lib: [es2023, dom, dom.iterable]`. The `dom` lib is needed because the Playwright e2e specs type-check code that runs in the page (`document`, `window`, `getComputedStyle`, `indexedDB`).
- `vite.config.ts`: `react()` and `tailwindcss()` plugins, `build.target`, plus the Vitest `test` block:
  - `environment: 'jsdom'`
  - `include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts']`
  - `setupFiles: ['src/test/setup.ts']`
  - `restoreMocks: true`
  - Imports `defineConfig` from `vitest/config`.
- `playwright.config.ts`: `testDir: 'e2e'`, a single `chromium` project, `forbidOnly: !!process.env.CI`, `retries: process.env.CI ? 1 : 0`, `reporter: process.env.CI ? 'github' : 'list'`, `use.baseURL: 'http://localhost:4173'`, `webServer: { command: 'npx vite preview --port 4173 --strictPort', url, reuseExistingServer: !process.env.CI }`.
- `index.html`
- `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/copy.ts`
- `src/components/AppHeader.tsx`, `src/components/EmptyState.tsx`, `src/components/ErrorBoundary.tsx`
- `src/test/setup.ts`: imports `@testing-library/jest-dom/vitest` and registers `afterEach(() => cleanup())` from React Testing Library. Vitest globals are off, so RTL can't register its automatic cleanup.
- `src/App.test.tsx`, `src/components/ErrorBoundary.test.tsx`
- `tests/tooling/` (each test file `// @vitest-environment node`):
  - `repo.ts`: a shared helper (not a test file), with `ROOT`, `repoPath`, `readText`, `readJson`, `exists` and `listFiles`, so each tooling test reads the repo the same way.
  - `package-contract.test.ts`
  - `node-pin.test.ts`
  - `eslint-config.test.ts`
  - `typecheck.test.ts`
  - `prettier.test.ts`
  - `workflow.test.ts`
  - `theme.test.ts`
  - `privacy.test.ts`
  - `licences.test.ts`
  - `readme.test.ts`
  - `dev-server.test.ts`
- `e2e/a11y.spec.ts`, `e2e/layout.spec.ts`, `e2e/privacy.spec.ts`, `e2e/document.spec.ts`
- `.github/workflows/ci.yml`

Modified:
- `README.md`: title becomes "QuickNotes" with a one-line description. It gains a "Getting started" section (prerequisite Node 24 / `nvm use`, `git clone`, `npm install`, `npm run dev`, open printed URL) and a "Scripts" section with one line per script (`dev`, `lint`, `typecheck`, `format`, `format:check`, `test`, `test:a11y`, `build`, `ci`), including the one-time `npx playwright install chromium` note for `test:a11y`. The Getting started section also notes the `nvm use 24` / `~/.npmrc` `prefix` workaround (see Risks). The existing SpecFabric section and licence attribution are kept below, under a "How this project is built" heading.

Not touched: anything under `docs/`, `templates/`, `.claude/`, `labs/`, `product/`, `factory/`, or `specs/` other than this plan.

## Steps
Each step is a reviewable commit-sized unit. Tests are written before
the code that satisfies them, following the TDD rule.

1. **[API] Toolchain skeleton.** Add `package.json` (scripts, engines,
   browserslist, pinned devDependencies per the version table), `.nvmrc`,
   `.gitignore`, then run `npm install` with Node 24 to produce
   `package-lock.json`. Check: `npm ci` succeeds on a clean checkout.
2. **[API] TypeScript configs.** `tsconfig.json`, `tsconfig.app.json`,
   `tsconfig.node.json`, and a stub `vite.config.ts`. TS 6 defaults
   `types` to `[]`, so set `types` explicitly. Check: `npm run typecheck`
   exits 0.
3. **[API] Formatting and lint configs.** `.prettierrc.json`,
   `.prettierignore` and `eslint.config.js`. Confirm that the
   `react-hooks` v7 flat-config export name matches the installed version.
   Check: `npm run lint` and `npm run format:check` exit 0, and neither
   touches `labs/`, `.kilo/` or the SpecFabric directories.
4. **[TEST] Shell component tests (red).** Add `src/test/setup.ts`,
   `src/copy.ts`, `src/App.test.tsx` (AC-19, AC-20) and
   `src/components/ErrorBoundary.test.tsx` (AC-23). `npm test` fails.
5. **[FE] Document and theme.** `index.html` (R21, R22), `src/index.css`
   (accent token, body background, focus style), and in `vite.config.ts`
   the `react()` and `tailwindcss()` plugins, `build.target` and the
   Vitest `test` block. `src/index.css` sets `--font-sans` explicitly and
   restates the zinc scale as hex (see Frontend).
6. **[FE] Shell components (green).** Add `AppHeader`, `EmptyState`,
   `App`, `ErrorBoundary` and `main.tsx`. Check: `npm test`, `npm run
   build` and `npm run dev` work, and the shell matches the spec layout.
7. **[TEST] Tooling contract tests.** Write the `tests/tooling/*` suite
   (see Test strategy). Check: all pass on the clean repo, and each
   negative-fixture test fails if its guard is removed (for example,
   dropping `--max-warnings 0` from the lint script).
8. **[TEST] Browser checks.** Add `playwright.config.ts` and the
   `e2e/*.spec.ts` files, then run `npx playwright install chromium`
   once. Check: `npm run test:a11y` exits 0.
9. **[TEST] CI workflow.** Add `.github/workflows/ci.yml` per the
   contract above, then run `npm run ci` locally with exit 0.
10. **[API] README.** Rewrite `README.md` as described. Then run
    `npm run format` and confirm `npm run ci` is still green.
11. **[TEST] Review-time manual checks.** Prepare the checklist for
    `review.md`. On a throwaway branch and PR, introduce one fault at a
    time (lint error, type error, formatting drift, failing test, build
    error, axe violation) and record that the named step goes red
    (AC-17). Record the green run on a clean commit (AC-18). Run the
    local mutation checks (AC-5/7/8/10/12/14 negative paths), the
    browser matrix (AC-34) and VoiceOver (AC-35).

## Test strategy
Layers: unit-FE = Vitest + jsdom + RTL. Tooling tests are Vitest in the
Node environment and are listed as "contract". e2e/UI = Playwright +
Chromium against the `vite preview` production build.

| Acceptance criterion | Layer | Test |
|---|---|---|
| AC-1 | integration + manual | `tests/tooling/dev-server.test.ts`, "dev server serves the shell". It starts Vite programmatically (`createServer` with the repo config), GETs `resolvedUrls.local[0]`, and expects 200 with HTML containing `<title>QuickNotes</title>`. In review, a manual fresh-clone `npm install && npm run dev` confirms the printed URL. |
| AC-2 | contract | `tests/tooling/readme.test.ts`, "README documents getting started and every script". It finds a "Getting started" heading listing `npm install` and `npm run dev`, and a "Scripts" heading with a line for each of the 9 scripts. |
| AC-3 | contract | `tests/tooling/package-contract.test.ts`, "stack deps present, strict TS, no UI kit". The 5 named packages are in `dependencies`/`devDependencies`, `tsconfig.app.json` and `tsconfig.node.json` have `strict === true`, and there's no dependency matching a denylist (`@mui/*`, `@chakra-ui/*`, `antd`, `@radix-ui/*`, `@headlessui/*`, `react-bootstrap`, `@mantine/*`, `class-variance-authority` + `@radix-ui` shadcn pattern). It also asserts that `src/**` contains only `.ts`/`.tsx` source (R2), with `src/index.css` as the one allowed non-TS file (the Tailwind theme stylesheet, not application code). |
| AC-4 | contract | `tests/tooling/node-pin.test.ts`, "Node major pinned consistently". `package-lock.json` exists, `.nvmrc` is a single even (LTS) major, `engines.node` names that major, and the workflow's setup-node step uses `node-version-file: .nvmrc`. |
| AC-5 | contract + manual | `tests/tooling/eslint-config.test.ts`, "unused variable fails lint". It runs the ESLint Node API with the repo config over `lintText('const unused = 1;\nexport {}', { filePath: 'src/fixture.tsx' })` and expects `errorCount + warningCount > 0`. It also lints the repo `src/` and expects 0 errors and 0 warnings. In review, the actual `npm run lint` exit code is confirmed on a mutated file. |
| AC-6 | contract | `tests/tooling/eslint-config.test.ts`, "required recommended configs and --max-warnings 0". `calculateConfigForFile('src/App.tsx')` contains a rule from each preset: `no-unused-vars`/`@typescript-eslint/no-unused-vars`, `react-hooks/rules-of-hooks`, `jsx-a11y/alt-text`. The `lint` script contains `--max-warnings 0`. |
| AC-7 | contract + manual | `tests/tooling/typecheck.test.ts`, "string-to-number assignment is a type error". It writes `const n: number = 'x';` to a temp `.tsx`, builds a `ts.createProgram` with `tsconfig.app.json` options, and expects diagnostics length > 0. The clean-repo exit 0 is covered by the Type check CI step. A manual mutation check runs in review. |
| AC-8 | contract + manual | `tests/tooling/prettier.test.ts`, "formatting drift detected". `prettier.check('<p  >x</p>', { filepath: 'src/x.tsx', ...resolvedConfig })` is false, and `prettier.format` output then passes `check`. The CLI naming the file is confirmed manually in review. |
| AC-9 | unit-FE (self-evidencing) | The `npm test` run itself: `vitest run` (no watch) with `environment: 'jsdom'` executes `src/App.test.tsx`. `package-contract.test.ts` "test script is non-watch vitest run" asserts that the script is `vitest run` and that the config environment is `jsdom`. |
| AC-10 | manual | Review mutation: change the expected heading in `App.test.tsx`, run `npm test`, and record the non-zero exit. This relies on Vitest's default failure exit code, so it isn't worth a meta-test. |
| AC-11 | e2e/UI | `e2e/a11y.spec.ts`, "shell has no WCAG 2.1 A/AA axe violations". It uses `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()`, then `expect(violations).toEqual([])`. It also asserts that contrast was really evaluated: `color-contrast` is not in `incomplete`, and the `color-contrast` entry in `passes` covers at least 3 nodes (h1 and both empty-state lines). The `test:a11y` script builds first, and `webServer` serves `dist/`. |
| AC-12 | e2e/UI + manual | `e2e/a11y.spec.ts`, "axe detects a contrast failure". It sets inline `color` on the secondary line to zinc-300 (`#d4d4d8`), runs axe, and expects a `color-contrast` violation. This proves the harness checks contrast. The full mutation (class changed to `text-zinc-300`, and `npm run test:a11y` exits non-zero) is run and recorded in review. |
| AC-13 | e2e/UI (post-build) | `e2e/document.spec.ts`, "build output has index.html, hashed js and css". It uses `fs` to check `dist/index.html` and that `dist/assets/` has `*-[A-Za-z0-9_-]{8,}.js` and `.css`. The build exit 0 is the Build CI step. |
| AC-14 | contract + manual | `tests/tooling/package-contract.test.ts`, "ci script chains the gate in order". It splits the `ci` script on `&&` and expects exactly `[format:check, lint, typecheck, test, build, test:a11y]`. In review, `npm run ci` is run green, and then with a lint error to show it stops before typecheck. |
| AC-15 | contract | `tests/tooling/workflow.test.ts`, "one gate workflow with safe settings". It parses YAML with `yaml`. There's exactly one file in `.github/workflows/`. `on` has `push` and `pull_request`, `runs-on` is `ubuntu-latest`, and `permissions` deep-equals `{contents: 'read'}`. The raw text has no `secrets.`, no `continue-on-error`, and no `deploy`/`pages`/`publish`/`upload-artifact` steps. |
| AC-16 | contract | `tests/tooling/workflow.test.ts`, "named step per check". Steps are found by `name` and `run`: Install dependencies (`npm ci`), Format check, Lint, Type check, Unit tests, Build, Install Playwright Chromium (`playwright install` + `chromium`), Accessibility (`npm run test:a11y`). |
| AC-17 | manual | Throwaway branch/PR with six single-fault commits. Each records the failed step name and red check in `review.md`. |
| AC-18 | manual (observed CI) | A green "CI" run on the feature branch's clean head commit, with its link recorded in `review.md`. |
| AC-19 | unit-FE | `src/App.test.tsx`, "renders banner with the only h1 and the empty state in main". Asserts are made with `within(getByRole('banner'))`, `getAllByRole('heading',{level:1})`, and `within(getByRole('main'))`. |
| AC-20 | unit-FE | `src/App.test.tsx`, "has no interactive controls". `queryAllByRole` is empty for `button`, `textbox`, `link`, `searchbox` and `checkbox`. |
| AC-21 | e2e/UI | `e2e/document.spec.ts`, "document head meets R21". It uses `request.get('/')` to read the raw HTML and `page.goto('/')` for DOM checks. `html[lang]` is `en`, the title is `QuickNotes`, there's a `meta[charset]` with value `utf-8` (case-insensitive), and the viewport `content` is exactly `width=device-width, initial-scale=1`. |
| AC-22 | e2e/UI | `e2e/document.spec.ts`, "noscript message shows with JS disabled". In a `browser.newContext({ javaScriptEnabled: false })`, the locator `noscript p` is visible and has the exact R22 copy (Playwright's text selectors skip `<noscript>`, so the test targets its content directly), and the raw HTML contains `<noscript>` with that text. |
| AC-23 | unit-FE | `src/components/ErrorBoundary.test.tsx`, "renders alert fallback when a child throws". A `Boom` child throws, `console.error` is silenced with `vi.spyOn`, `getByRole('alert')` has the exact copy, and the child text is absent. A second test checks that children render normally when there's no throw. |
| AC-24 | e2e/UI + contract | `e2e/privacy.spec.ts`, "no web fonts; h1 uses system stack". No request URL matches `/\.(woff2?\|ttf\|otf)(\?\|$)/`, and `getComputedStyle(h1).fontFamily` starts with `ui-sans-serif` or `system-ui`. Plus `tests/tooling/theme.test.ts`, "theme sets --font-sans to a system UI stack": the `@theme` block in `src/index.css` declares `--font-sans` exactly once, and its value (whitespace-normalised) starts with `ui-sans-serif, system-ui`. |
| AC-25 | contract | `tests/tooling/theme.test.ts`, "accent is the only non-zinc colour; zinc tokens match Tailwind; shell uses zinc/white/accent". It parses `src/index.css` `@theme` blocks (comments stripped). Every `--color-*` declaration is either `--color-accent: #1d4ed8` (exactly once) or a `--color-zinc-<step>` whose value equals Tailwind's own hex for that step (the 11 values listed under Frontend). Any other colour token, or a zinc token at a different value, fails. It regex-scans `className` strings in `src/**/*.tsx` and `index.html` for colour utilities (`bg-`, `text-`, `border-`, `outline-`, `ring-`, `divide-`, `from-`/`to-`/`via-`, `fill-`, `stroke-`, `decoration-`, `placeholder-`, `accent-`, `caret-`, `shadow-`) and requires every colour to be `zinc-*`, `white` or `accent`. |
| AC-26 | e2e/UI | `e2e/layout.spec.ts`, "keyboard focus shows 2px accent outline". It injects `<button>` into `main`, presses `Tab`, and checks the button is focused. Computed `outlineStyle` isn't `none`, `parseFloat(outlineWidth) >= 2`, and `outlineColor === 'rgb(29, 78, 216)'`. |
| AC-27 | e2e/UI | `e2e/layout.spec.ts`, "no overflow and centred at 360/768/1280/1920", parameterised over 4 viewports. It checks `scrollWidth <= clientWidth`, a non-zero `boundingBox` for the h1 and both lines, every box inside the viewport, and `abs(emptyState centre - clientWidth/2) <= 2`. |
| AC-28 | e2e/UI | `e2e/layout.spec.ts`, "reflows at 320px with 200% root font". The viewport is 320x640 and `document.documentElement.style.fontSize = '200%'`. It checks there's no horizontal overflow and all three texts are visible. |
| AC-29 | e2e/UI | `e2e/layout.spec.ts`, "survives WCAG 1.4.12 text spacing at 360px". It injects the text-spacing stylesheet and checks there's no page overflow. For each of h1 and the two p elements, `scrollWidth <= clientWidth` and `scrollHeight <= clientHeight`. |
| AC-30 | e2e/UI | `e2e/layout.spec.ts`, "no animations or transitions". For every element in `body`, `animationName === 'none'` and every `transitionDuration` part is `0s`. |
| AC-31 | e2e/UI | `e2e/privacy.spec.ts`, "all requests are same-origin". It records `page.on('request')`, uses `goto('/')` with `waitUntil: 'networkidle'`, and checks every `new URL(req.url()).origin === new URL(page.url()).origin`. |
| AC-32 | contract | `tests/tooling/privacy.test.ts`, "no analytics/telemetry SDKs or external assets". `package.json` deps have no denylist entries (`gtag`, `react-ga*`, `@vercel/analytics`, `plausible*`, `@sentry/*`, `posthog*`, `mixpanel*`, `@segment/*`, `@amplitude/*`, `@datadog/*`, `logrocket`, `hotjar`). `src/**` and `index.html` contain no `googletagmanager`, `gtag(`, `sentry`, `posthog` or `plausible`, and no `<script`/`<link` with `src`/`href` matching `^(https?:)?//`. |
| AC-33 | e2e/UI | `e2e/privacy.spec.ts`, "no storage or cookies on fresh load". In a fresh context it checks `localStorage.length === 0`, `sessionStorage.length === 0`, `document.cookie === ''` and `(await indexedDB.databases()).length === 0`. |
| AC-34 | contract + manual | `tests/tooling/package-contract.test.ts`, "browser targets cover last 2 versions". `browserslist` lists last 2 of Chrome, Edge, Firefox, Safari and iOS, and `vite.config.ts` `build.target` includes chrome, edge, firefox, safari and ios entries. The manual matrix (current Chrome, Edge, Firefox, Safari, iOS Safari) is recorded in `review.md`. |
| AC-35 | manual | VoiceOver on macOS Safari and iOS Safari, reading from the top. The announced order is recorded in `review.md`. |
| AC-36 | contract + manual | `tests/tooling/licences.test.ts`, "dependencies are OSI-licensed or a named R5 exception". For every package in `package-lock.json` (not just direct dependencies), it reads `node_modules/<path>/package.json` `license` and checks it against an OSI allowlist (MIT, MIT-0, ISC, Apache-2.0, BSD-2-Clause, BSD-3-Clause, 0BSD, MPL-2.0, BlueOak-1.0.0, Python-2.0, plus `OR`/`AND` expressions of these). A named, commented `R5_EXCEPTIONS` map holds exactly `caniuse-lite: CC-BY-4.0`, `language-subtag-registry: CC0-1.0` and `mdn-data: CC0-1.0`, citing spec R5. A package passes only if its licence is OSI-allowed, or if its name is in the map and its licence equals the listed value. Any other non-OSI licence fails, and so does a listed package whose licence has changed. A second test asserts that the map has exactly those 3 entries and exports it (via `tests/tooling/repo.ts` or a small shared module) for reuse. The "not in `dist/`" half runs after a build: `e2e/document.spec.ts`, "R5 licence exceptions are not shipped", runs inside `npm run test:a11y` (which always builds first). It scans every file under `dist/` and fails if any contains an excepted package name or a `node_modules/<name>` path. Running it there means it is enforced on every CI run, not skipped when `dist/` is absent during `npm test`. `workflow.test.ts` asserts every `uses:` is `actions/*`. In review, a reading of the README confirms no paid service is needed. |

Coverage: no CI coverage threshold, per the spec's non-goals. The shell
code is fully exercised by the tests above, and a threshold can be
proposed when `note-storage` adds real logic.

## Risks & rollback
- **Toolchain version friction.** TS 7 and ESLint 10 are the npm
  `latest` tags but are incompatible with `typescript-eslint` /
  `eslint-plugin-jsx-a11y` peer ranges. *Detection:* `npm ci` peer
  errors, or lint crashes. *Mitigation:* pin `typescript ~6.0.3` and
  `eslint ^9.39` as above. Revisit when the plugins catch up.
- **Node 24 lifecycle.** Node 24 is the Active LTS today. Node 26 is
  expected to take over as Active LTS in late October 2026, and 24 then
  moves to Maintenance LTS (supported into 2028). It still meets "one LTS
  major". The developer's local machine currently runs Node 25.6.1, which
  is not LTS and not 24. `engines` only warns, so the README tells the
  developer to `nvm use`. *Detection:* the npm `EBADENGINE` warning.
  *Rollback:* none needed. Bumping to 26 later is a one-line change in
  `.nvmrc` and `engines`.
- **Tailwind v4 colour space (mitigation accepted 2026-10-05).** v4
  defines zinc in `oklch()`, and axe-core can't evaluate it, so contrast
  checks came back "incomplete" instead of pass/fail. *Mitigation:* the
  zinc scale is restated in `@theme` at Tailwind's own hex values, and
  `theme.test.ts` pins each value so the palette can't drift from
  Tailwind's. The a11y test requires contrast to be checked on at least
  3 nodes, with none left incomplete, so a silent regression back to
  unreadable colours fails CI. The accent is already a hex literal, so
  AC-26's `rgb(29, 78, 216)` check is deterministic. *Cost:* if Tailwind
  ever changes its zinc values, our copy won't follow until we update it.
  That's acceptable because the spec names the colours, not the version.
- **Non-OSI transitive licences.** Three dev-only data packages
  (`caniuse-lite`, `language-subtag-registry`, `mdn-data`) are named R5
  exceptions. *Detection:* `licences.test.ts` fails on any new non-OSI
  licence, on a licence change in a listed package, or if an excepted
  package reaches `dist/`. *Handling:* the implementer stops and raises
  it to the Tech Lead. Adding to the exception list needs a spec
  revision (R5), and AC-36 isn't quietly widened.
- **Tailwind default font drift.** Tailwind 4.3.3 changed its default
  `--font-sans`. *Mitigation:* `--font-sans` is set explicitly in
  `@theme`, and `theme.test.ts` plus the e2e font check pin it.
- **Local `nvm use 24` refuses to run.** On the developer's machine,
  `~/.npmrc` sets `prefix`, which nvm rejects. *Workaround, the
  developer's choice:* put a Node 24 binary first on `PATH` for the
  shell (for example `export PATH="$HOME/.nvm/versions/node/<v24>/bin:$PATH"`),
  or run `nvm use --delete-prefix 24`. Note that `--delete-prefix`
  removes the `prefix` line from `~/.npmrc` for good. The plan and build
  must not edit `~/.npmrc`. The README's Getting started section mentions
  both options in one or two lines. CI isn't affected, because it uses
  `actions/setup-node` with `.nvmrc`.
- **Flaky browser tests.** `networkidle` and the dev-server test may be
  slow on shared runners. *Mitigation:* `retries: 1` in CI only,
  `--strictPort`, and a fixed preview port. A flaky retry still shows in
  the report.
- **Prettier/ESLint scanning the wrong things.** `.kilo/worktrees/` may
  hold full repo copies, and `labs/` contains JS and Python. Without
  ignores, lint, format and tsc would cover them. *Mitigation:* explicit
  ignores in `.prettierignore`, ESLint `globalIgnores` and tsconfig
  `include`. Step 3 verifies them.
- **CI cost and duration.** There are two runs per same-repo PR
  (accepted default #5), plus a Chromium download, and `test:a11y` builds
  a second time after the Build step. That's an estimated 2-4 min per
  run, within the free tier. It could be reduced later with a
  `concurrency` group or Playwright browser caching (out of scope here).
- **Rollback.** All changes are additive except `README.md`. Reverting the
  feature commit(s) restores the template repo exactly. Nothing is
  deployed, so there's no runtime rollback.

## Explicitly out of scope
- Everything in the spec's Non-goals: GitHub Pages and Vite `base`, dark
  mode, PWA, storage, note UI, skip link, Firefox/WebKit in CI, coverage
  thresholds, visual regression, bundle budgets, commit hooks,
  Dependabot/Renovate.
- **Accepted trade-off: `eslint.config.js` is linted but not
  type-checked.** `eslint-plugin-jsx-a11y` ships no TypeScript types, so
  `checkJs` on the config would need hand-written declarations. R2
  allows JS config files. All `.ts` configs (`vite.config.ts`,
  `playwright.config.ts`) and all tests *are* type-checked (R8).
- **Accepted trade-off: some negative-path ACs are verified by
  tool-API tests plus a manual mutation in review, not by end-to-end
  `npm run …` exit-code meta-tests.** This applies to AC-5, 7, 8, 10, 12
  and 14. Spawning the full CLIs against mutated copies of the repo
  inside `npm test` would be slow and brittle. The CI gate itself proves
  the positive exit-0 paths on every run.
- **Accepted trade-off: the production build runs twice** in CI and
  `npm run ci` (the Build step, then `test:a11y`), because R11 requires
  `test:a11y` to build by itself.
- No `npm create vite` scaffold, no demo assets, no
  `eslint-plugin-react-refresh` (not required by R7), no custom favicon.
- No `concurrency` cancellation or Playwright browser cache in the
  workflow.
- No changes to SpecFabric files, `labs/`, or `.kilo/`.

## Approval
- Previous revision (2026-10-04, before Revision 2026-10-05): Approved by: AITechie, 2026-10-04
- Approved by: AITechie, 2026-10-05
- Shipped: 2026-10-06, cbfa654 (PR #1, merged to main)
