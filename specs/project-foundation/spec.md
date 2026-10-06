# Spec: Project foundation (app scaffold, lint, tests, CI)

- Status: Approved
- Slug: project-foundation
- Intent: [intent.md](./intent.md)
- Jira: none
- Owner: AITechie
- Reviewers: AITechie (Product Owner, Tech Lead)
- Date: 2026-10-04

<!-- Status values: draft -> approved -> superseded.
     Do not move to "approved" without a human sign-off in the Approval
     section below. A spec with open questions cannot be approved. -->

## Revision 2026-10-05
Implementation surfaced two conflicts with the approved 2026-10-04
revision. AITechie (Product Owner, Tech Lead) decided how to resolve
them, and the spec is back in `draft` for re-approval.
- **R5 / AC-36 (licences):** the OSI-approved licence rule stays, with an
  explicit, closed list of exceptions for dev-only transitive data
  packages pulled in by spec-required tools (see R5). Any other non-OSI
  licence still fails.
- **R24 / AC-24 (font):** Tailwind 4.3.3 changed its default
  `--font-sans` to start with `-apple-system`. R24 no longer relies on
  Tailwind's default. The app now sets `--font-sans` explicitly in
  `@theme` to a system UI stack starting with `ui-sans-serif, system-ui`.
  AC-24 keeps its check on the `<h1>`'s computed `font-family`.
- **Open questions 1-6:** recorded as accepted as proposed (see Open
  questions).

## Summary
Set up the QuickNotes codebase on the charter's stack (React, Vite,
TypeScript, Tailwind CSS), add an empty app shell, and put automated
quality checks in place from the start. The shell is a header reading
"QuickNotes" and a "No notes yet" empty state, and it meets WCAG 2.1 AA.
A single GitHub Actions workflow runs lint, type checking, the formatting
check, unit tests, an automated accessibility check and the production
build on every push and pull request. As a solo builder, AITechie has no
human reviewer, so these checks fill that gap. Every later v1 feature
builds on this base.

## User stories
- US-1: As the developer (AITechie), I want to clone the repo and start the app locally with documented commands, so that I can begin building features straight away.
- US-2: As the developer, I want single documented commands for lint, type checking, formatting, tests, the accessibility check and the production build, so that I can check my work locally before pushing.
- US-3: As the developer, I want every push and pull request to run the full quality gate in GitHub Actions and fail visibly on any problem, so that no broken or sloppy change gets through unnoticed without a human reviewer.
- US-4: As the user (AITechie), I want the app to open to a clear, readable QuickNotes shell that works from a 360px phone up to desktop, so that the product starts from a usable and recognisable base.
- US-5: As a keyboard or screen-reader user, I want the shell to meet WCAG 2.1 AA, so that every later feature starts from an accessible foundation.
- US-6: As the user, I want the shell to make no third-party network calls and include no tracking, so that the charter's privacy promise holds from day one.

## Requirements

### Stack and project setup
1. R1: The project MUST use React, Vite, TypeScript and Tailwind CSS, as named in the charter. It MUST NOT add a third-party UI component library.
2. R2: TypeScript MUST run in `strict` mode. Application source MUST be `.ts`/`.tsx` (config files MAY be `.js`/`.mjs` if a tool requires it).
3. R3: The project MUST use npm as its package manager and MUST commit `package-lock.json`. CI MUST install with `npm ci`.
4. R4: The repo MUST pin one Node.js LTS major version (proposed: Node 24) in both `.nvmrc` and the `engines.node` field of `package.json`. CI MUST use that same version.
5. R5: All tools and services MUST be free: open-source npm packages and the free GitHub Actions tier only. No paid service, licence key or secret may be needed to install, run, test or build. Every installed npm package, direct or transitive, MUST carry an OSI-approved licence, with only these named exceptions. Each is a dev-only transitive data package under a non-OSI permissive data licence, pulled in by a tool this spec requires, and none ships in `dist/`:
   - `caniuse-lite`: CC-BY-4.0 (via `eslint-plugin-react-hooks` → `browserslist`)
   - `language-subtag-registry`: CC0-1.0 (via `eslint-plugin-jsx-a11y`)
   - `mdn-data`: CC0-1.0 (via `jsdom` → `css-tree`)

   `@csstools/color-helpers` and `@csstools/css-syntax-patches-for-csstree` (MIT-0) need no exception, because MIT-0 is OSI-approved. Any other package with a non-OSI licence, or a listed package found in the production build, MUST fail the check. Adding to this exception list needs a spec revision.

### Commands (all documented in `README.md`)
6. R6: `npm run dev` MUST start a local development server that serves the shell. `README.md` MUST document the steps: clone, `npm install`, `npm run dev`, then open the printed local URL.
7. R7: `npm run lint` MUST run ESLint over all source, test and config files. It MUST exit non-zero on any error **or warning** (`--max-warnings 0`). The rule set MUST include the recommended rules from `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks` and `eslint-plugin-jsx-a11y`.
8. R8: `npm run typecheck` MUST run `tsc` with no emit over the whole project, including tests and config, and MUST exit non-zero on any type error.
9. R9: `npm run format:check` MUST run Prettier in check mode over the repo, respecting a committed `.prettierignore`. It MUST exit non-zero if any file is not formatted. `npm run format` MUST rewrite files to the Prettier style. ESLint MUST NOT enforce formatting rules that conflict with Prettier.
10. R10: `npm test` MUST run the unit and component tests once with Vitest (no watch mode) in a jsdom environment, using React Testing Library. It MUST exit non-zero if any test fails or if no test files are found.
11. R11: `npm run test:a11y` MUST build the app, serve the production build locally, and use Playwright with `@axe-core/playwright` to scan the shell in headless Chromium. It MUST fail on any axe violation tagged `wcag2a`, `wcag2aa`, `wcag21a` or `wcag21aa`. It runs in a real browser because axe cannot check colour contrast under jsdom.
12. R12: `npm run build` MUST type-check and then run `vite build`, writing a static production build to `dist/`. It MUST exit non-zero on failure.
13. R13: `npm run ci` SHOULD run, in order, `format:check`, `lint`, `typecheck`, `test`, `build` and `test:a11y`, stopping at the first failure. This lets the developer reproduce the CI gate locally with one command.
14. R14: At least one Vitest component test for the app shell MUST exist. It MUST check the header heading and the empty-state text, so later features have a pattern to copy.

### Continuous integration
15. R15: The repo MUST contain exactly one GitHub Actions workflow for the quality gate (for example `.github/workflows/ci.yml`). It MUST trigger on `push` to any branch and on `pull_request`.
16. R16: The workflow MUST run each of these as a separate, named step, and the job MUST fail if any of them fails: format check, lint, type check, unit tests, production build, accessibility check.
17. R17: The workflow MUST run on `ubuntu-latest` and MUST NOT use any repository secrets. Its permissions MUST be `contents: read` only. It MUST NOT deploy or publish anything; that belongs to `pages-deploy`.
18. R18: The workflow SHOULD cache npm downloads, through `actions/setup-node` caching, to keep run time down.

### App shell
19. R19: The page MUST render a `<header>` landmark that contains an `<h1>` with the exact text "QuickNotes". It MUST be the only `<h1>` on the page.
20. R20: The page MUST render a `<main>` landmark that contains the empty state: the primary text "No notes yet" and the secondary text "Your notes will show up here." It MUST contain no buttons, inputs, links or other note features.
21. R21: `index.html` MUST set `<html lang="en">`, `<title>QuickNotes</title>`, `<meta charset="UTF-8">`, and `<meta name="viewport" content="width=device-width, initial-scale=1">`. The viewport tag MUST NOT include `maximum-scale` or `user-scalable=no`.
22. R22: `index.html` SHOULD include a `<noscript>` message: "QuickNotes needs JavaScript to run. Please turn it on and reload the page."
23. R23: The app SHOULD wrap the shell in a top-level React error boundary. If rendering throws, it shows "Something went wrong. Reload the page to try again." in an element with `role="alert"`, instead of a blank page.

### Look and layout
24. R24: The shell MUST use the system UI font stack. The app MUST set `--font-sans` explicitly in its Tailwind `@theme`, to a stack that starts with `ui-sans-serif, system-ui`, and MUST NOT rely on Tailwind's default `--font-sans` (which changes between Tailwind versions). It MUST NOT load web fonts.
25. R25: Colours MUST come from Tailwind's zinc greys plus one accent colour, defined once as a named Tailwind theme colour `accent`. The proposed accent is Tailwind `blue-700` (`#1d4ed8`), pending approval (see Open questions).
26. R26: The global focus style MUST be a visible outline of at least 2px in the accent colour on `:focus-visible`. The shell has no focusable elements yet, but every later feature inherits this style.
27. R27: Every text and background colour pair in the shell MUST reach a contrast ratio of at least 4.5:1 (WCAG 1.4.3). The accent MUST reach at least 3:1 against the page background when used as a non-text indicator (WCAG 1.4.11).
28. R28: At every viewport width from 360px to 1920px, the shell MUST show no horizontal scrollbar and no clipped or overlapping text. The content area MUST be centred, with a maximum readable width.
29. R29: To meet WCAG 1.4.10 Reflow, the shell MUST also show no horizontal scrollbar at a 320 CSS px viewport width. It MUST stay readable with no loss of content when text is resized to 200% (1.4.4) and when WCAG 1.4.12 text-spacing overrides are applied.
30. R30: The shell MUST NOT include animations or transitions.
31. R31: The production build MUST target the last 2 versions of Chrome, Edge, Firefox, Safari and iOS Safari. It MUST NOT use features that are unsupported in those browsers without a fallback.

### Privacy
32. R32: When the shell loads from the production build, every network request MUST be same-origin, for the app's own HTML, JS, CSS and icons. The shell MUST NOT include analytics, telemetry, error-reporting services, CDN-hosted assets or web fonts from third parties.
33. R33: The shell MUST NOT read or write IndexedDB, localStorage, sessionStorage or cookies. Storage belongs to `note-storage` and `theme-mode`.

## User experience

### Flows
- **US-1 (developer setup):** 1. Clone the repo. 2. Run `nvm use` (optional) to get the pinned Node version. 3. Run `npm install`. 4. Run `npm run dev`. 5. Open the URL printed in the terminal. 6. The browser shows the QuickNotes shell.
- **US-2 (local checks):** 1. Run any single command (`npm run lint`, `npm run typecheck`, `npm run format:check`, `npm test`, `npm run test:a11y`, `npm run build`), or `npm run ci` for all of them. 2. Success gives exit code 0. 3. Failure gives a non-zero exit code and the tool's own error output, naming the file and line where the tool provides them.
- **US-3 (CI):** 1. Push a commit or open a pull request. 2. GitHub Actions runs the "CI" workflow. 3. Each check shows as a named step. 4. Any failing step marks the check red on the commit or PR, and the log shows which step failed.
- **US-4/US-5 (end user):** 1. Open the app. 2. The page shows the "QuickNotes" header and the "No notes yet" empty state. 3. There is nothing to interact with yet.

### Screens / views
- **App shell (only screen).** No wireframe. Layout from top to bottom:
  - **Header:** full-width bar with a white background and a 1px `zinc-200` bottom border. It contains the `<h1>` "QuickNotes" on the left, in `zinc-900`, semibold, Tailwind `text-xl`. Horizontal padding is 16px (`px-4`) below 640px and 24px (`sm:px-6`) from 640px up.
  - **Main:** page background `zinc-50`. Content is centred with a maximum width of 48rem (`max-w-3xl`, a readable width that later list and editor layouts can share). The empty state sits centred horizontally, with generous top spacing (about 4rem):
    - primary line "No notes yet": `zinc-900`, medium weight, `text-lg`.
    - secondary line "Your notes will show up here.": `zinc-600`, `text-base`.
  - No footer, navigation or icons.
- **Developer surface:** the npm scripts listed in R6 to R13, the "CI" workflow in GitHub Actions, and `README.md`.

### States
- **Empty (default and only state):** header plus empty state, as above. There is no note data yet, so this is always what the user sees.
- **Loading:** no loading indicator. The shell renders as soon as the JS bundle runs. Before that, the page shows a blank `zinc-50` background (the background is set on `body` in CSS, so it does not flash white then grey). The browser tab already reads "QuickNotes" from `index.html`.
- **Error (render failure, R23):** the shell is replaced by a centred message in `role="alert"`: "Something went wrong. Reload the page to try again."
- **JavaScript disabled (R22):** the `<noscript>` message shows instead.
- **Success:** same as Empty.

### Copy & validation
Tone: plain and friendly, sentence case, no jargon, no exclamation marks.

| Location | Exact text |
|---|---|
| `<title>` | QuickNotes |
| Header `<h1>` | QuickNotes |
| Empty state, primary | No notes yet |
| Empty state, secondary | Your notes will show up here. |
| Error boundary | Something went wrong. Reload the page to try again. |
| `<noscript>` | QuickNotes needs JavaScript to run. Please turn it on and reload the page. |

The shell has no inputs, so no validation rules apply.

The command-line output is whatever each tool prints by default (ESLint, tsc, Prettier, Vitest, Playwright, Vite). The spec does not require custom messages, but every failure MUST produce a non-zero exit code.

### Accessibility
Target: WCAG 2.1 AA (charter).
- **Structure:** a `banner` landmark (`<header>`) and a `main` landmark (`<main>`). There is exactly one `<h1>` ("QuickNotes"), and no heading levels are skipped. The empty-state lines are paragraphs, not headings, so the outline stays a single `<h1>` until real content arrives.
- **Screen readers:** reading order is "QuickNotes" (heading level 1), then "No notes yet", then "Your notes will show up here." The page title "QuickNotes" is announced on load. The page has no decorative images. Any added later must have `alt=""`.
- **Keyboard:** the shell has no interactive elements, so pressing Tab moves no focus into the page content, and nothing traps focus. Because nothing can be focused yet, no skip link is needed. `create-note` or `list-notes` should add one when navigation arrives. The global `:focus-visible` style (R26) is in place for later features.
- **Contrast (calculated on the proposed palette):**
  - `zinc-900` (`#18181b`) on white: about 17.7:1
  - `zinc-900` on `zinc-50` (`#fafafa`): about 16.9:1
  - `zinc-600` (`#52525b`) on `zinc-50`: about 7.4:1
  - accent `blue-700` (`#1d4ed8`) on white: about 6.7:1
  - accent on `zinc-50`: about 6.4:1

  All pairs pass AA for normal text (4.5:1) and for non-text indicators (3:1).
- **Zoom and reflow:** pinch-zoom is never disabled (R21). Content reflows at 320 CSS px and at 200% text size (R29).
- **Motion:** there is none (R30).
- **Automated enforcement:** axe-core runs in CI (R11, R16). Manual checks with VoiceOver on iOS Safari and macOS Safari, and a keyboard-only pass, are recorded in `review.md`.

## Acceptance criteria
- AC-1 (US-1, R6): Given a fresh clone with the pinned Node version, when the developer runs `npm install` then `npm run dev`, then the command prints a local URL, and an HTTP GET to that URL returns 200 with HTML containing `<title>QuickNotes</title>`.
- AC-2 (US-1, R6): Given `README.md`, when it is read, then it contains a "Getting started" section listing `npm install` and `npm run dev`, and a "Scripts" section listing `dev`, `lint`, `typecheck`, `format`, `format:check`, `test`, `test:a11y`, `build` and `ci`, each with a one-line description.
- AC-3 (US-1, R1, R2): Given `package.json` and `tsconfig*.json`, when they are inspected, then `react`, `react-dom`, `vite`, `typescript` and `tailwindcss` are dependencies, `compilerOptions.strict` is `true`, and no third-party UI component library (for example MUI, Chakra, Ant Design or shadcn-generated packages) is present.
- AC-4 (US-1, R3, R4): Given the repo, when it is inspected, then `package-lock.json` exists, `.nvmrc` holds a single LTS major version, `package.json` `engines.node` names the same major, and the CI workflow's `setup-node` step reads `.nvmrc` (or pins the same major).
- AC-5 (US-2, R7): Given a source file that contains an unused variable (an ESLint warning or error), when `npm run lint` runs, then it exits non-zero. Given the clean repo, it exits 0.
- AC-6 (US-2, R7): Given the ESLint config, when it is inspected, then it includes the recommended configs of `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks` and `eslint-plugin-jsx-a11y`, and the `lint` script passes `--max-warnings 0`.
- AC-7 (US-2, R8): Given a `.tsx` file that assigns a `string` to a `number` variable, when `npm run typecheck` runs, then it exits non-zero. Given the clean repo, it exits 0.
- AC-8 (US-2, R9): Given a source file with formatting drift (for example extra spaces inside a JSX tag), when `npm run format:check` runs, then it exits non-zero and names the file. After `npm run format`, `npm run format:check` exits 0.
- AC-9 (US-2, R10, R14): Given the clean repo, when `npm test` runs, then Vitest runs at least one test file in jsdom, all tests pass, the command exits 0 and does not enter watch mode.
- AC-10 (US-2, R10): Given a test changed to assert the wrong heading text, when `npm test` runs, then it exits non-zero.
- AC-11 (US-2, R11): Given the clean repo, when `npm run test:a11y` runs, then it builds the app, serves `dist/`, runs axe in headless Chromium with the tags `wcag2a`, `wcag2aa`, `wcag21a` and `wcag21aa`, reports zero violations and exits 0.
- AC-12 (US-2, R11, R27): Given the empty-state secondary text temporarily set to `zinc-300` on `zinc-50` (a contrast failure), when `npm run test:a11y` runs, then axe reports a `color-contrast` violation and the command exits non-zero.
- AC-13 (US-2, R12): Given the clean repo, when `npm run build` runs, then it exits 0 and `dist/index.html` plus at least one hashed `.js` and one `.css` asset exist under `dist/`.
- AC-14 (US-2, R13): Given the clean repo, when `npm run ci` runs, then it runs format check, lint, typecheck, test, build and test:a11y in that order and exits 0. Given a lint error, it exits non-zero and does not run the later steps.
- AC-15 (US-3, R15, R17): Given `.github/workflows/`, when it is inspected, then exactly one quality-gate workflow exists. Its `on:` includes `push` and `pull_request`, `runs-on` is `ubuntu-latest`, `permissions` is `contents: read`, it references no `secrets.*`, and it has no deploy or publish step.
- AC-16 (US-3, R16): Given the workflow file, when it is inspected, then it has separately named steps that run `npm ci`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run test:a11y` (including a step that installs the Playwright Chromium browser).
- AC-17 (US-3, R16): Given a pull request whose only change is a lint error, when CI runs, then the "Lint" step fails and the PR check shows as failed. The same holds for each of: a type error (Type check), formatting drift (Format check), a failing test (Unit tests), a build error (Build) and an axe violation (Accessibility). The reviewer verifies this on a throwaway branch and records the result in `review.md`.
- AC-18 (US-3, R16): Given a clean commit pushed to any branch, when CI runs, then every step passes and the check shows as passed.
- AC-19 (US-4, R19, R20): Given the app shell rendered in Vitest, when the test queries by role, then `getByRole('banner')` contains `getByRole('heading', { level: 1, name: 'QuickNotes' })`, `getAllByRole('heading', { level: 1 })` has length 1, and `getByRole('main')` contains the texts "No notes yet" and "Your notes will show up here.".
- AC-20 (US-4, R20): Given the app shell rendered in Vitest, when the test queries for `button`, `textbox`, `link`, `searchbox` and `checkbox` roles, then none are found.
- AC-21 (US-5, R21): Given the built `dist/index.html`, when it is parsed, then `<html>` has `lang="en"`, `<title>` is "QuickNotes", a `<meta charset>` of UTF-8 is present, and the viewport meta content equals `width=device-width, initial-scale=1` (no `maximum-scale`, no `user-scalable`).
- AC-22 (US-4, R22): Given `dist/index.html`, when it is parsed, then it contains a `<noscript>` element whose text is "QuickNotes needs JavaScript to run. Please turn it on and reload the page.".
- AC-23 (US-4, R23): Given the error boundary rendered in Vitest around a child that throws on render, when it renders, then `getByRole('alert')` has the text "Something went wrong. Reload the page to try again." and the thrown child's output is absent.
- AC-24 (US-4, R24, R32): Given the production build served locally and loaded in Playwright, when the page has finished loading, then no request to a font file (`.woff`, `.woff2`, `.ttf`, `.otf`) is made, and the computed `font-family` of the `<h1>` starts with `ui-sans-serif` or `system-ui`. Also, the theme CSS defines `--font-sans` in `@theme`, and its value starts with `ui-sans-serif, system-ui`.
- AC-25 (US-4, R25): Given the Tailwind configuration/theme CSS, when it is inspected, then exactly one non-zinc colour token named `accent` is defined, and the shell's rendered classes use only zinc greys, white and `accent`.
- AC-26 (US-5, R26): Given the production build loaded in Playwright, when the test injects a `<button>` into `<main>` and focuses it via the Tab key, then its computed `outline-style` is not `none`, its `outline-width` is at least 2px, and its `outline-color` equals the accent colour.
- AC-27 (US-4, R28): Given the production build loaded in Playwright, when the viewport is set in turn to 360x740, 768x1024, 1280x800 and 1920x1080, then at each size `document.documentElement.scrollWidth <= window.innerWidth`, the `<h1>` and both empty-state lines are fully visible with non-zero size, and the empty-state content's horizontal centre is within 2px of the viewport's centre.
- AC-28 (US-5, R29): Given the production build loaded in Playwright at a 320x640 viewport, when the root font size is set to 200%, then `document.documentElement.scrollWidth <= window.innerWidth` and all shell text is still present and visible.
- AC-29 (US-5, R29): Given the production build at 360px width, when WCAG 1.4.12 text-spacing CSS is injected (line-height 1.5, letter-spacing 0.12em, word-spacing 0.16em, paragraph spacing 2em), then no shell text is clipped (each text element's `scrollWidth <= clientWidth` and `scrollHeight <= clientHeight`) and there is no horizontal page scroll.
- AC-30 (US-5, R30): Given the production build loaded in Playwright, when the computed styles of all shell elements are read, then every `animation-name` is `none` and every `transition-duration` is `0s`.
- AC-31 (US-6, R32): Given the production build served on `http://localhost:<port>` and loaded in Playwright with request logging, when the page has loaded and the network is idle, then every recorded request's origin equals the page origin.
- AC-32 (US-6, R32): Given the repo's source and `package.json`, when they are searched, then they contain no analytics, telemetry or error-reporting SDKs (for example Google Analytics/gtag, Plausible, Sentry or PostHog) and no `<script>` or `<link>` pointing to an external host.
- AC-33 (US-6, R33): Given the production build loaded in Playwright on a fresh browser context, when the page has loaded, then `localStorage.length` and `sessionStorage.length` are 0, `document.cookie` is empty, and `indexedDB.databases()` returns an empty list.
- AC-34 (US-4, R31): Given the build config, when it is inspected, then the build target or browserslist covers the last 2 versions of Chrome, Edge, Firefox, Safari and iOS Safari. On review, the shell is opened manually in the current Chrome, Edge, Firefox, Safari and iOS Safari, and each shows the header and the empty state with no layout faults, recorded in `review.md`.
- AC-35 (US-5): Given macOS VoiceOver with Safari, and VoiceOver on iOS Safari, when the shell loads and the user reads the page from the top, then VoiceOver announces the page title "QuickNotes", the heading "QuickNotes, heading level 1", "No notes yet" and "Your notes will show up here." in that order, recorded in `review.md`.
- AC-36 (US-1, R5): Given the repo, when `package.json`, the workflow and `README.md` are inspected, then every dependency is an npm package. Also, when the licence of every installed package in `package-lock.json` (direct and transitive) is checked, each one is OSI-approved or is one of the named R5 exceptions with its stated licence: `caniuse-lite` (CC-BY-4.0), `language-subtag-registry` (CC0-1.0) or `mdn-data` (CC0-1.0). The check fails on any other non-OSI licence, including a listed package whose licence has changed. None of the excepted packages appears in `dist/`. Finally, the workflow uses only GitHub-hosted `ubuntu-latest` runners and public `actions/*` (or other free, public) actions, and no step needs a secret or paid account.

## Constraints
- **Stack (charter):** React + Vite + TypeScript + Tailwind CSS. No backend. No third-party component kit.
- **Tools (chosen in this spec):** npm, ESLint (flat config) with `typescript-eslint`, `react-hooks` and `jsx-a11y`, Prettier, Vitest with jsdom and React Testing Library, and Playwright with `@axe-core/playwright` (headless Chromium) for the accessibility and layout browser checks. Exact versions are left to the plan.
- **Cost:** $0. Free, open-source tooling and the free GitHub Actions tier only (R5).
- **Privacy (charter):** no analytics or telemetry, and no third-party network calls (R32, R33).
- **Accessibility (charter):** WCAG 2.1 AA.
- **Browsers (owner decision):** last 2 versions of Chrome, Edge, Firefox, Safari and iOS Safari. Automated browser checks run in Chromium only. Firefox and Safari/WebKit coverage for this feature is manual (AC-34).
- **Screen sizes (owner decision):** 360px phones up to desktop (tested up to 1920px). Reflow is also verified at 320 CSS px, as WCAG 2.1 AA requires.
- **Solo builder:** CI is the only reviewer, so every gate step must be blocking. No step may be marked `continue-on-error`.

## Non-goals
- Deploying to GitHub Pages, or setting a Vite `base` path for Pages (`pages-deploy`).
- Dark mode, `prefers-color-scheme` handling, a theme toggle and remembering the theme (`theme-mode`). The shell is light-only.
- Web app manifest, service worker, offline support, install prompt, app icons beyond a default favicon, and the under-1-second launch target (`pwa-offline`).
- The note model, IndexedDB, the repository layer, and any create, list, edit, delete or search UI (`note-storage` and the note feature slugs).
- A skip link and navigation landmarks. There is nothing to skip to yet.
- Automated cross-browser runs in Firefox or WebKit in CI. These may be added later.
- Code-coverage thresholds in CI (the plan may propose one), visual regression tests, bundle-size budgets, commit hooks (Husky/lint-staged), Dependabot or Renovate.
- Everything the charter excludes from v1: accounts, sync, server or backend, tags/folders, rich text, attachments, sharing, import/export.

## Open questions / risks
**Resolution (recorded 2026-10-05):** the approver (AITechie) accepted questions 1-6 as proposed:
1. accent `blue-700`
2. Node 24
3. keep the four additions (R13, R20 secondary line, R22, R23)
4. Playwright with axe in headless Chromium
5. trigger on both `push` and `pull_request`
6. manual cross-browser and VoiceOver checks recorded in `review.md`

No questions are open. The original text is kept below for the record.

1. **Accent colour (needs approver decision).** Proposed: Tailwind `blue-700`, `#1d4ed8`. It contrasts about 6.7:1 on white and 6.4:1 on `zinc-50`, so it passes AA for normal text (4.5:1) and non-text indicators (3:1). Alternatives that also pass on white: `indigo-700` (`#4338ca`), `teal-700` (`#0f766e`), `violet-700` (`#6d28d9`). `theme-mode` will need a dark-mode partner shade later (for example `blue-400` on `zinc-900`). Approve `blue-700` or name another.
2. **Node.js version.** The proposal is to pin Node 24 (the current Active LTS line) in `.nvmrc`, `engines` and CI. Confirm, or pick another LTS major.
3. **Additions beyond the intent, for the approver to keep or cut.** These are the empty-state secondary line "Your notes will show up here." (R20), the `<noscript>` message (R22), the top-level error boundary and its copy (R23), and the combined `npm run ci` script (R13). Each is small, but the intent did not ask for them.
4. **Browser-based accessibility check adds CI weight (risk).** Colour contrast cannot be checked under jsdom, so R11 uses Playwright with headless Chromium. This adds a browser download (roughly 100-150 MB) and about a minute to each CI run. It stays within the free tier for a solo repo. The fallback would be axe in jsdom via `vitest-axe`, which would silently skip contrast checks. Accept this cost, or choose the jsdom-only check and do contrast by hand.
5. **CI trigger duplication (minor).** Triggering on both `push` (all branches) and `pull_request` runs the gate twice for a PR from a branch in the same repo. This follows the owner's "every push and every PR" decision literally. Accept, or limit `push` to `main`.
6. **Manual cross-browser and screen-reader checks (risk).** AC-34 and AC-35 depend on a manual pass during review, because CI only automates Chromium. Accept, or add Firefox/WebKit Playwright projects in CI (more time, still free).

## Approval
<!-- Who approved this spec, and when. A spec is not approved until a
     human signs off here — this is the primary judgment gate in the
     framework; do not skip it. -->
- Previous revision (2026-10-04, before Revision 2026-10-05): Approved by: AITechie, 2026-10-04
- Approved by: AITechie, 2026-10-05
- Shipped: 2026-10-06, cbfa654 (PR #1, merged to main)
- 
