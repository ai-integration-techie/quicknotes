# Review: Search notes

- Slug: search-notes
- Spec: [spec.md](./spec.md) (Approved)
- Plan: [plan.md](./plan.md) (Approved)
- PR: not opened yet (uncommitted diff on `main` vs `b25a4a4`)
- Date: 2026-10-10

Verification run by the reviewer: `CI=1 npm run ci` (format, lint
`--max-warnings 0`, `tsc -b`, Vitest, build, Playwright): **exit 0**, Vitest
79 files / **611 passed**, Playwright **118 passed**. `e2e/search-performance.spec.ts`
also re-run with `--repeat-each=3`: 9/9 passed (timings under AC-27).
`git diff main -- src/storage src/notes package.json package-lock.json tests/tooling eslint.config.js playwright.config.ts src/App.tsx src/index.css src/routing e2e/notes.ts e2e/app.ts`
is empty.

## Spec conformance
- AC-1: **met**. `Search.field.test.tsx` (AC-1) checks every clause; `NotesSection.load.test.tsx` AC-1 revised as the changes table allows.
- AC-2: **met**. `Search.field.test.tsx` (AC-2): pending / `[]` / `StorageUnavailableError`, no searchbox, no `role=search`, no status region.
- AC-3: **met**. `Search.field.test.tsx` (AC-3).
- AC-4: **met**. `Search.field.test.tsx` (AC-4); query reset by unmount (plan D2).
- AC-5: **met**. `match.test.ts`: all 23 table rows plus no-throw inputs (`[*+?`, `\\`, `\uDC00`, 10,000 chars, regex chars).
- AC-6: **partially met**. `Search.filter.test.tsx` (AC-6) runs `""`, `" "`, `"\t"`, `"\n"`, `" "`. The last value is U+0020, not the spec's U+00A0. NBSP blankness is checked at unit level (`match.test.ts`, `isBlankQuery`/`queryWords` with U+00A0), and the component uses the same `isBlankQuery`, so the behaviour is right. The component test just doesn't use NBSP as the AC says.
- AC-7: **met**. `Search.filter.test.tsx` (AC-7).
- AC-8: **met**. `match.test.ts` (frozen input, same objects, blank returns input); `tests/tooling/search-module.test.ts` (one type-only import of `src/storage/index.ts`).
- AC-9: **met**, with Tab order checked by DOM order of focusable, non-hidden elements (plan S2, accepted); real Tab is covered by AC-23.
- AC-10: **met**. `outerHTML` equality.
- AC-11: **met**, with a single change event instead of `user.paste` (plan S1, accepted).
- AC-12: **met**. Clear, Escape (`defaultPrevented` true), Escape on empty (false), 4 × Backspace.
- AC-13: **met**. No-match texts not inside a live region, no `list`, cleared afterwards.
- AC-14: **met**. Fake timers: 499/500 ms, restart, 1 / n / none / "1,000 notes match", emptied at once.
- AC-15: **met**. Both "Back to notes" and `hashchange`; hidden field keeps "shop".
- AC-16: **met**.
- AC-17: **met**. `Search.status.test.tsx` (AC-17), with a `textSequence` recorder across save, open and back.
- AC-18: **met**. `e2e/search-notes.spec.ts` (AC-18).
- AC-19: **met**.
- AC-20: **met**. One `list()` call.
- AC-21: **met**. B is opened by URL because it is filtered out (build note; the spec doesn't say how it is opened). Edit, re-match, delete, status "1 note matches", one `list()`.
- AC-22: **met**.
- AC-23: **met**. `e2e/search-notes.spec.ts` (AC-23); `notes-layout.spec.ts` AC-42 revised per the changes table.
- AC-24: **met**. `e2e/search-layout.spec.ts` (outline, 44px, 16px, no animations in results and no-match); `theme.test.ts` unchanged and passing.
- AC-25: **met**. Four viewports × three queries; 320px/200% and text spacing, unclipped.
- AC-26: **met**. axe over 5 states, `color-contrast` ≥ 3 passes and not incomplete.
- AC-27: **met**, as a per-step median of 3 runs (plan D13/S3, accepted). See the perf finding below.
- AC-28: **met**. In-page recorder: last `input` → no-match frame < 100 ms; no long task > 100 ms (init-script observer).
- AC-29: **met**. Note 500's body via `fill`; < 300 ms; no long task > 300 ms.
- AC-30: **met**. `e2e/search-privacy.spec.ts`.
- AC-31: **met**. `Search.privacy.test.tsx`.
- AC-32: **met**. `dependencies` unchanged; `licences`, `storage-boundary` and `package-contract` tooling untouched and passing.
- AC-33: **met**. `e2e-isolation` test untouched and passing. Every new storing e2e test uses the per-test `page`; AC-18's second page is opened in that context and closed.
- AC-34: **not done (manual)**. VoiceOver macOS/iOS Safari and keyboard-only Chrome. Must be recorded here by a human before ship.
- AC-35: **not done (manual, ship)**. Live URL in Chrome and Safari, recorded at ship.

Existing tests changed: only `NotesSection.load.test.tsx` AC-1, the `App.test.tsx` comment, `notes-layout.spec.ts` AC-42, and additive `copy.test.ts` cases. All are allowed by the changes table and the plan. The plan expected an AC-43 `silent()` change, but none was needed: that test's `liveRegions()` selects `[role=alert], [aria-live]`, so it never counted the search `role=status` region. AC-17 covers that region instead. `renderEdit.tsx` `notesStatus()` (the first `[role=status]` in the section) still finds the delete status, which comes before the search area in DOM order.

## UX conformance
- Flow US-1/US-3 (search): **matches**. The field is below the heading and above the list, filters as you type, and announces the count after 500 ms.
- Flow US-2 (case, accents, word order): **matches** (unit + AC-11 "café plans").
- Flow US-5 (clear): **matches**. Button, Escape and deleting the text all clear it, with focus in the field.
- Flow US-6 (no matches / nothing to search): **matches**.
- Flow US-7 (open and come back; reload): **matches** (AC-15, AC-18).
- Flow US-8 (save/edit/delete while searching): **matches** (AC-20, AC-21).
- Screen layout (search area `mt-3`, label, wrapping field row with `basis-48`, status `text-sm zinc-600` taking no space when empty, list, no-match block): **matches** plan D9/D10.
- States table: loading / empty / failed (no field), no query, typing, results, no matches, cleared, back from a note, list changed, last note gone, reload: **all render as specified**. Each has a test.
- Copy: **matches** exactly (`copy.test.ts`).
- Accessibility: `role=search` landmark, visible label, `type=search`, polite status, no-match text not live, non-matches hidden from the a11y tree and Tab order (`hidden` on `<li>`, `hidden` on `<ul>` when nothing matches): **matches**.

## API contract conformance
- UI → repository: **matches**. No new calls (AC-20, AC-22).
- URL, history, storage: **matches**. Search code touches none of them (AC-18, AC-30).
- `match.ts` exports (`fold`, `isBlankQuery`, `queryWords`, `matchNotes`, `primeFolds`): **match**.
- `SEARCH_STATUS_DELAY_MS = 500`: **matches**.
- `copy.ts` additions: **match**.
- `NoteList` `shown?: ReadonlySet<string> | null`, and `focusNote` refuses a hidden item: **match**.
- `NoteListItem` `hidden`: **minor deviation**. It is optional (`hidden?: boolean`, default `false`), not required. This is an accepted build note and is harmless.
- `SearchArea` and `SearchableNotes` props: **match**.
- `NotesSection` props and handle: unchanged.

## Findings
No correctness bugs, privacy problems or security problems found.

1. **Perf headroom (risk, non-blocking).** Local run, 3 repeats × 3 runs. Most steps take about 45-56 ms. "Clear search" (restoring 1,000 notes) is 99 / 75 / 76 ms (median 76), and Escape is about 72 ms. The first run's Clear sits at 99 ms every time, so the median-of-3 rule is what keeps it passing. The whole script runs in GitHub Actions (`ci.yml` and `deploy.yml` run `test:a11y`), and those shared runners are usually slower than this machine. A median that is about 24 ms under budget could flake there. Also, the measurement (by the spec's definition) stops at the first rAF callback, so the style/layout of 1,000 newly shown rows isn't in the number. Recommendation: watch the first GitHub Actions runs. If a step goes over, use plan R2's lever (`content-visibility: auto` on `<li>`) before touching any budget. Budgets change only by a spec revision.
2. **AC-6 NBSP (test fidelity, non-blocking).** Change the last value in `Search.filter.test.tsx` AC-6 from `" "` (U+0020) to `" "` so the test matches the AC. The behaviour itself is already verified at unit level.
3. **Readability (nit).** In `src/noteSearch/match.ts`, `COMBINING_MARKS` is written with literal combining characters (`/[̀-ͯ]/gu`). The bytes are correct (U+0300, U+036F), but `/[̀-ͯ]/gu` would be easier to read and safer to edit.
4. **Coupling (nit).** `renderEdit.tsx` `notesStatus()` picks the first `[role=status]` in the section. It is correct today only because of DOM order (delete status before the search area). The spec's changes table suggested `h2 + [role=status]` or a test id. Not blocking, since the AC-38 tests pass unchanged.
5. **Simplification:** none needed. Keeping all items mounted and hidden (D3), the WeakMap fold cache, and clearing the status in the event handlers are all lean and match the plan.

## Decision
**approve**

Nothing is blocking. Before ship, AC-34 must be recorded here by a human, and AC-35 is a manual ship check. Watch the first GitHub Actions run of AC-27 (finding 1). Findings 2-4 are optional follow-ups.

## Iteration 2 — AC-27 CI fix (uncommitted diff on top of bd9c4cf)
Scope: `src/components/NoteList.tsx`, `src/components/NoteListItem.tsx`, plan build notes B1/B2. No test, e2e or budget file changed (`git diff --stat HEAD -- e2e tests` is empty).

Verification (re-run by reviewer): `CI=1 npm run ci` green (format, lint, typecheck, vitest, build, 118/118 Playwright). `e2e/search-performance.spec.ts` re-run: AC-27, AC-28, AC-29 pass.

- **Memo props stable:** **yes**. `onLink` is `useCallback([])`, `note` objects come from the list unchanged, and `now` is a number. Moving `hidden` onto the `<li>` that `NoteList` owns means a search toggle re-renders only the `<li>`, not the memoised item. That is the intended win.
- **Ref callback:** the inline `ref` in `NoteListItem` is recreated only when the item re-renders (a `now` tick or a note change). React then detaches and reattaches it, and `onLink` deletes and re-sets the same map entry. That's correct and the same as before.
- **`focusNote` on hidden items:** unchanged and still correct. `link.closest("li")` is still the `<li hidden>` parent, so R17/AC for a hidden note still returns false.
- **`now` updates:** `now` is still a prop of the memoised item, so relative times still refresh on tick.
- **DOM / a11y / copy:** unchanged. The output is still `ul[role=list] > li[hidden?] > a` with the same classes, ids and aria wiring. The divider selector `[&>li:not([hidden])~li]` still targets the same `<li>`.
- **Tests not loosened:** confirmed. The budget, the median-of-3 rule and the assertions are untouched.
- **B1/B2 accurate:** B1 matches the diff. One wording nit: B1 says "memoised `NoteListItem`" as if new, but `memo` was already there at bd9c4cf. The fix is moving `hidden` out of its props. The reviewer did not reproduce B1's medians; the passing run is consistent with them. B2 matches: no `content-visibility` anywhere in the diff. The focus-ring clipping rationale is plausible and is recorded rather than shipped.
- **API contract:** the iteration 1 deviation "`NoteListItem` `hidden?` optional" is now moot because the prop is removed. `NoteList`'s `shown` contract is unchanged. The plan's contract line for `NoteListItem` should drop `hidden`. B1 effectively records this; it's a non-blocking doc nit. Three places in `plan.md` still describe the old design: D3 (line 38), the contract line `NoteListItem` props `hidden: boolean` (line 89) and the changes-table row for `NoteListItem.tsx` (line 142). They should point to B1, which supersedes them.

Residual risk: CI headroom is now about 2x locally (Clear ~38 ms), but only the next GitHub Actions run proves AC-27 there.

**Decision (iteration 2): approve.** Nothing is blocking. Confirm AC-27 on the PR's CI run before ship.

## Sign-off
- Reviewed by: <name>, <date>
