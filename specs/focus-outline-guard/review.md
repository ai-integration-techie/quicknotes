# Review: Focus-outline guard catches every kind of clipping

- Slug: focus-outline-guard
- Spec: [spec.md](./spec.md)
- Plan: [plan.md](./plan.md)
- PR: not yet opened (uncommitted diff vs main db2b003)
- Date: 2026-10-10

## Spec conformance
- AC-1: met. `clippingReasons` is defined once in `e2e/focusGuard.ts`, and all three layout specs import it from `./focusGuard`. The inline `clippingAncestors` walk is deleted. The guard fully covers the old walk: same start (`parentElement`), same end (`<html>`), and the same `overflowX`/`overflowY !== "visible"` test on every ancestor, now with one reason per axis.
- AC-2: met. `focus-guard.spec.ts` "(AC-2)", passes.
- AC-3: met. Inline `content-visibility: auto` on the `<li>` gives exactly `["li content-visibility: auto"]`. `withInline` removes it in a `finally` and then re-asserts `[]`.
- AC-4: met. `["li contain: paint"]`, then restore and `[]`.
- AC-5: met. `strict` and `content` each give `li contain: <value>`; `layout` gives `[]`. Each is restored and re-checked.
- AC-6: met. Self `a (self) content-visibility: auto`; `li` overflow gives exactly `li overflow-x: hidden` and `li overflow-y: hidden`; self overflow gives `[]`. Each is restored and re-checked.
- AC-7: met. The dialog option on "Keep note" gives `[]`. `contain: paint` on the alertdialog is reported with the dialog option on, then restored and re-checked with the same option. The full guard `toContain` the box's `overflow-y: auto`.
- AC-8: met. The note link runs the full guard in place of the old walk, and `backLink` gets a new full-guard check. All other AC-48 assertions are unchanged.
- AC-9: met. In the `inEachView` loop, the reading and edit views run the full guard. The "delete dialog" and "discard dialog" views (`view.endsWith("dialog")`, the only two view names that match) run `{ overflow: false }`. The `expectAccentOutline` assertions are kept.
- AC-10: met. The guard runs on `searchbox` and on `clearSearch` after typing "a". All other AC-24 checks are unchanged.
- AC-11: met. `git diff main -- src package.json package-lock.json` is empty. The only changed or new code files are under `e2e/`. (`specs/pwa-offline/` and `specs/theme-mode/` are untracked artifacts of other slugs, not part of this change. Keep them out of this slug's commit.)
- AC-12: met. Reviewer ran `CI=1 npm run ci` twice:
  - Run 1 failed on one unit test, `src/components/ConfirmDialog.test.tsx` AC-31 (`dialog()` returned null). Nothing in `src/` changed, the test passed 3 out of 3 times in isolation, and run 2 was fully green: 611/611 unit, 124/124 e2e, none flaky.
  - No revised guard ever failed, so R7 was not triggered. See finding 1.
- Strictly stronger check (spec changes table): met. No existing assertion was removed or weakened. The one deletion, the old overflow walk, is a subset of the guard's checks.

## UX conformance
- N/A (test-only change; the spec's UX is N/A). The R4 reason format `<tag>[#id][ (self)] <property>: <value>` matches the spec.

## API contract conformance
- `clippingReasons(locator, options?: { overflow?: boolean }): Promise<string[]>` matches the plan. The default is overflow on. Reasons list the element itself first, then ancestors outward, up to and including `<html>`. The `contain` check splits on whitespace and matches `paint`/`strict`/`content`. Values come from `getComputedStyle`.
- R3: the `{ overflow: false }` option has a doc comment citing focus-outline-guard R3 and edit-delete-note AC-49. Only the dialog-button checks and the AC-7 self-check use it, and the AC-50 call site repeats the citation. Containment is still checked on the element and every ancestor.

## Findings
1. (non-blocking, pre-existing) `src/components/ConfirmDialog.test.tsx` AC-31 can flake: `dialog()` was null right after the click in one of the reviewer's two CI runs. It is unrelated to this diff. Worth a follow-up intent, because a flaky unit test weakens the "two green CI runs" gate.
2. (nit) In AC-7, the box label is computed from the live element (`tag + #id`), so the assertion adapts if the dialog gains an id. That's fine, but it is slightly less pinned than a literal `div`. Not blocking.
3. No security concerns. The guard reads computed styles only, and fixtures are always removed in `finally`.

## Decision
approve

Blocking: none.

## Sign-off
- Reviewed by: <name>, <date>
