# Plan: Focus-outline guard catches every kind of clipping

- Status: Approved
- Slug: focus-outline-guard
- Spec: [spec.md](./spec.md) (must be Status: approved; solo joint gate: spec and plan are approved together, nothing is implemented until both are)
- Date: 2026-10-10

## Approach
Add one shared e2e helper module, `e2e/focusGuard.ts`, following the
existing helper convention (`e2e/notes.ts`, `e2e/editDelete.ts`,
`e2e/search.ts`: camelCase `.ts`, no `.spec`). It exports
`clippingReasons(locator, options?)`, which runs a single self-contained
`locator.evaluate` (the callback is serialised to the browser, so it may not
close over Node values) that walks from the element to `<html>` and returns
the R4 strings. A new `e2e/focus-guard.spec.ts` proves the guard bites
(AC-2 to AC-7). The three named tests then call the guard and assert
`toEqual([])`, keeping every existing check in them.

Decision on the spec's open question 1: **recommended answer kept** (R3 as
written): dialog buttons run the guard with `{ overflow: false }`, so neither
the dialog box nor the backdrop is overflow-checked. *Alternative:* the option
would become `{ overflowExempt: ["[role=alertdialog]", "[data-dialog-backdrop]"] }`,
skipping only those two ancestors, plus one more AC-7 fixture. Per
product/decisions.md §1.1 and §3.4, this plan adds checks and loosens
nothing, so no other question is raised.

The tooling rules for e2e files hold without change. The new files use no
`launchPersistentContext`/`storageState` (`tests/tooling/e2e-isolation.test.ts`),
create no `browser.newContext` (`e2e-contexts.test.ts`), and contain no
`/quicknotes/` literal (`base-path.test.ts`). ESLint already covers
`e2e/**/*.ts`.

## Architecture

### API contract
The test-helper contract, which every guarded test builds against:

```ts
// e2e/focusGuard.ts
export type GuardOptions = { overflow?: boolean }; // default true
export function clippingReasons(
  locator: Locator,
  options?: GuardOptions,
): Promise<string[]>;
// Each reason: `<tag>[#id][ (self)] <property>: <value>`, e.g.
// "li content-visibility: auto", "button (self) contain: paint",
// "div overflow-y: auto". Order: self first, then ancestors outward.
```

Rules (R2): for the element and every ancestor up to and including `<html>`,
report `content-visibility` when it is not `visible`, and `contain` when its
whitespace-split tokens include `paint`, `strict` or `content`. For ancestors
only, and only when `overflow !== false`, report `overflow-x` and `overflow-y`
separately when either is not `visible`. All values come from
`getComputedStyle`. The `{ overflow: false }` option carries a doc comment
citing focus-outline-guard R3 and edit-delete-note AC-49.

### Data model
N/A: test-only, nothing is stored.

### Backend
N/A: there is no backend, and no `src/` change (R6).

### Frontend
N/A: no component, CSS or copy change (R6). The guard reads the shipped
markup as it is. The dialog box (`role="alertdialog"`, `overflow-y-auto`)
and the backdrop (`data-dialog-backdrop`, `overflow-y-auto`) in
`src/components/ConfirmDialog.tsx` are why the dialog buttons need R3.

## Files / components touched
- `e2e/focusGuard.ts` (new): `clippingReasons`, `GuardOptions`.
- `e2e/focus-guard.spec.ts` (new): self-check tests for AC-2 to AC-7.
- `e2e/notes-layout.spec.ts`: the AC-48 test "no animations or transitions with notes, hover and the note view; links show the accent outline, unclipped". The inline `clippingAncestors` walk is replaced by `clippingReasons(noteLink(page, "Normal"))`, and `clippingReasons(backLink(page))` is added in the note view.
- `e2e/edit-delete-layout.spec.ts`: the AC-50 test "no animations, accent focus outline on every new button, no red anywhere". Inside the `inEachView` loop, after each `expectAccentOutline`, the test calls `clippingReasons(btn(page, name))` in the reading and edit views, and `clippingReasons(btn(page, name), { overflow: false })` in the delete and discard dialog views.
- `e2e/search-layout.spec.ts`: the AC-24 test "field and Clear search: accent outline, 44px, 16px text; …". It calls `clippingReasons` on `searchbox(page)` and on `clearSearch(page)` once "a" has been typed.
- Not touched: `edit-delete-a11y.spec.ts`, `search-a11y.spec.ts`, anything under `src/`, CSS, `package.json`, the lockfile and all config files.

## Steps
1. [API] Add `e2e/focusGuard.ts` with the contract above.
2. [TEST] Add `e2e/focus-guard.spec.ts`. Each test seeds notes with `seedNotes` and opens the list (the delete dialog for AC-7). Inline fixtures are set with `el.style.setProperty(...)` and removed in a `finally` with `removeProperty` (R5). After removal, a re-check expecting `[]` proves the restore.
3. [TEST] Revise list-notes AC-48 in `notes-layout.spec.ts`, then run that file.
4. [TEST] Revise edit-delete-note AC-50 in `edit-delete-layout.spec.ts`, then run that file.
5. [TEST] Revise search-notes AC-24 in `search-layout.spec.ts`, then run that file.
6. [TEST] Run `CI=1 npm run ci` **twice**, back to back. Both runs must be green. `CI=1` turns on `forbidOnly` and one retry, so also check the reporter output for a test that passed only on retry, and treat any such flake as a failure. If any guarded check fails on the shipped app, stop and report the reasons to the owner (R7).

## Test strategy
| Acceptance criterion | Layer | Test |
|---|---|---|
| AC-1 | manual (review) | Review: `rg "getComputedStyle" e2e/notes-layout.spec.ts` shows no `clippingAncestors`; the three specs import `clippingReasons` from `./focusGuard` |
| AC-2 | e2e/UI | `focus-guard.spec.ts` › "guard returns [] for a note link as shipped (AC-2)" |
| AC-3 | e2e/UI | `focus-guard.spec.ts` › "content-visibility: auto on the li is reported, then cleared (AC-3)" |
| AC-4 | e2e/UI | `focus-guard.spec.ts` › "contain: paint on the li is reported, then cleared (AC-4)" |
| AC-5 | e2e/UI | `focus-guard.spec.ts` › "contain: strict and content are reported; contain: layout is not (AC-5)" |
| AC-6 | e2e/UI | `focus-guard.spec.ts` › "self content-visibility reported; ancestor overflow per axis; self overflow ignored (AC-6)" |
| AC-7 | e2e/UI | `focus-guard.spec.ts` › "dialog option: Keep note passes, contain: paint on the dialog box is caught, full guard reports overflow-y: auto (AC-7)" |
| AC-8 | e2e/UI | `notes-layout.spec.ts` › the revised AC-48 test |
| AC-9 | e2e/UI | `edit-delete-layout.spec.ts` › the revised AC-50 test |
| AC-10 | e2e/UI | `search-layout.spec.ts` › the revised AC-24 test |
| AC-11 | manual (review) | `git diff --stat main` lists only `e2e/`, `specs/focus-outline-guard/` and `factory/` paths |
| AC-12 | integration (CI) | Two green `CI=1 npm run ci` runs locally, then green GitHub CI on the PR; stop-and-ask per R7 on any failure |

## Risks & rollback
- **The shipped app fails a tightened guard** (spec risk 4). Not expected, since `src/` sets no `content-visibility` or `contain`. If it happens, R7 applies: stop and ask. Neither the app nor the guard changes.
- **The `contain` computed value form differs by browser.** Only Chromium runs. Splitting the value on whitespace covers `"layout paint"`, `"strict"` and `"content"`. AC-5 pins the behaviour.
- **A fixture leaks into a later check.** Each injection is removed in a `finally`, and the test re-checks that the result is `[]`. Each test also has its own page.
- **A focus-dependent `:focus-visible` style changes the computed values.** The guard reads containment and overflow, which are not focus-dependent in this app, and it runs after the existing outline checks.
- **Rollback:** revert the PR. Only e2e files change, so there is no runtime impact.

## Explicitly out of scope
- The overflow-check alternative for dialog buttons (open question 1): the backdrop and the dialog box are both unchecked for overflow. This is accepted per the recommended answer.
- `clip-path`, `mask`, `opacity`, `filter`, z-order overlap (spec risk 2), and any geometric padding check on dialog boxes (spec risk 3).
- Guarding the outline checks in `edit-delete-a11y.spec.ts` and `search-a11y.spec.ts`. Those specs check contrast, not clipping, and the spec names only the layout tests.
- Guarding Edit and Delete inside the list-notes AC-48 test. They are guarded once, in edit-delete-note AC-50.
- Any `src/`, CSS, dependency or config change.

## Approval
- Approved by: AITechie, 2026-10-10
