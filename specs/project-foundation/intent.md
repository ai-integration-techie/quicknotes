# Intent: Project foundation (app scaffold, lint, tests, CI)

- Status: Approve
- Slug: project-foundation
- Jira: none
- Owner: AITechie
- Date: 2026-10-04

## Problem
QuickNotes has an approved charter but no code yet. Every v1 feature in the
charter's breakdown (storage, create/list/edit/delete, search, theming,
offline) needs somewhere to live. Without a shared starting point, the
first feature would have to set up the project itself, and quality checks
would be added late, if at all. AITechie is building alone, so there is no
reviewer to catch broken or sloppy changes. Automated checks have to do
that job from the start.

## Why now
This is the first item in the charter's dependency order. Nothing else can
start until it exists. Adding lint, tests and CI later means retrofitting
them onto code that was never held to them. Setting them up now, while the
codebase is empty, costs the least.

## Desired outcome
- AITechie can clone the repo, install dependencies, and start the app
  locally with one documented command. The browser then shows an empty
  QuickNotes app shell: a header reading "QuickNotes" and an empty-state
  area where the notes UI will go (for example, "No notes yet"). It has no
  note features yet.
- The project uses the stack the charter chose: React, Vite, TypeScript
  and Tailwind CSS.
- One documented command checks the code for lint problems and fails when
  it finds any.
- One documented command runs the automated tests. At least one real test
  already exists, for the app shell, so later features have a working
  pattern to copy.
- The app produces a production build with one documented command.
- Every push and every pull request runs the quality checks automatically
  in GitHub Actions. Any failure shows up as a failed check. See the CI
  gate under Decisions for the full list.
- The empty shell already meets the charter's accessibility bar (WCAG 2.1
  AA) so later features start from a compliant base. That covers things
  like page language, a page title, readable contrast, and a sensible
  heading structure. An automated check in CI enforces this.
- The shell looks right and stays usable on supported browsers at every
  width from a 360px phone up to desktop.
- The shell makes no network calls beyond loading its own files, and adds
  no analytics, telemetry or third-party services. This follows the
  charter's privacy rule.
- Everything runs at $0 cost: free tooling and the free GitHub Actions tier
  only.

## Non-goals
- Deploying to GitHub Pages. That is the `pages-deploy` slug. This feature
  only needs the app to build, not to publish it.
- Light/dark mode and a theme toggle. That is the `theme-mode` slug. The
  shell may use one neutral look for now.
- PWA manifest, service worker, offline support, and the under-1-second
  launch target. That is the `pwa-offline` slug.
- Any note functionality or storage: no note model, no IndexedDB, no
  create/list/edit/delete/search. Those belong to `note-storage` and the
  note feature slugs.
- Choosing a third-party component library. The charter says Tailwind
  only, and later feature plans may propose one if needed.
- Anything the charter excludes from v1: accounts, sync, server or backend,
  tags/folders, rich text, sharing, import/export.

## Decisions and constraints for the spec
AITechie answered these on 2026-10-04. The spec should treat them as
settled.

- **Supported browsers:** the last 2 versions of Chrome, Edge, Firefox and
  Safari, including iOS Safari.
- **Supported screen sizes:** layouts from 360px-wide phones up to desktop.
- **Shell content:** a header reading "QuickNotes", plus an empty-state
  placeholder area where the notes UI will go (for example, "No notes
  yet").
- **CI gate:** on every push and pull request, CI fails if any of these
  fail:
  - lint
  - tests
  - TypeScript type checking (tsc)
  - Prettier formatting check (fails on any drift)
  - automated accessibility check (axe-core against the shell)
  - production build (vite build)

  This goes beyond the charter's "lint + tests" by AITechie's choice.
- **Base look:**
  - system UI font stack
  - Tailwind neutral/zinc greys with one accent colour (the spec picks
    which one)
  - plain, friendly copy

  Dark-mode variants stay with `theme-mode`.

## Rough shape (optional)
A standard Vite React-TypeScript starter with Tailwind added. A common
linter setup and a test runner that fits Vite go on top. One GitHub Actions
workflow runs the CI gate listed above. The spec and plan pick the
remaining tools, such as the linter and test runner.

## Open questions
None. AITechie answered all earlier questions on 2026-10-04 (see Decisions
and constraints for the spec).
