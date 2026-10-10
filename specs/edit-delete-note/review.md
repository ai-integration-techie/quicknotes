# Review: Edit and delete a note

- Slug: edit-delete-note
- Spec: [spec.md](./spec.md) (Revision 2026-10-10, Approved)
- Plan: [plan.md](./plan.md) (Revision 2026-10-10, Approved)
- PR: none yet (uncommitted on `main` at abe2bca)
- Date: 2026-10-09
- Iteration: 4 (confirmation of the plan sync after iteration 3. Iteration 1 to 3 findings are kept below for the record)

**Verification run by the reviewer:** `npm run ci` on Node 24.18.0 (`~/.nvm/versions/node/v24.18.0/bin` first on PATH; `~/.npmrc` untouched). Exit 0. format:check, lint, typecheck and build passed. Vitest: 71 files, **546/546** passed. Playwright: **101/101** passed in one run, with no failures or flakes, so nothing was re-run. There are no `.skip`, `.only`, `.fixme` or `todo` calls in the new tests.

**Protected paths:** `git diff main` is empty for `src/storage`, `src/notes`, `tests/` (including `tests/tooling`), `package.json` and `package-lock.json`. It is also empty for `eslint.config.js`, `index.html`, `vite.config.ts`, `playwright.config.ts`, `src/noteList/**`, `src/test/renderNotes.tsx`, `e2e/app.ts` and the list-notes and create-note e2e specs (other than `notes-layout.spec.ts`), and for `NoteView.back.test.tsx`. No `eslint-disable` was added.

**PR scope:** the uncommitted `factory/**`, `product/charter.md` and `specs/{pwa-offline,search-notes,theme-mode}/` are out of scope and must stay out of this PR. Plan line 9 ("goes back to draft") is stale but cosmetic.

## Spec conformance
Each test below is the one the plan's test strategy names. All of them passed in the reviewer's run.

- AC-1: met. `NoteView.actions.test.tsx` (AC-1)
- AC-2: met. `NoteView.actions.test.tsx` (AC-2)
- AC-3: met. `NoteView.actions.test.tsx` (AC-3)
- AC-4: met. `EditNote.open.test.tsx` (AC-4)
- AC-5: met. `EditNote.open.test.tsx` (AC-5) and `noteEdit/baseline.test.ts`
- AC-6: met. `EditNote.open.test.tsx` (AC-6)
- AC-7: met. `EditNote.open.test.tsx` (AC-7)
- AC-8: met. `EditNote.save.test.tsx` (AC-8)
- AC-9: met. `EditNote.save.test.tsx` (AC-9)
- AC-10: met. `EditNote.save.test.tsx` (AC-10)
- AC-11: met. `EditNote.save.test.tsx` (AC-11). In code, the no-op path calls only `onNoChange` and never reaches `repository.update` (`useEditNote.ts` `attemptSave`).
- AC-12: met. `EditNote.save.test.tsx` (AC-12)
- AC-13: met. `EditNote.save.test.tsx` (AC-13)
- AC-14: met. `EditNote.leave.test.tsx` (AC-14) and `hashNavigation.test.ts`
- AC-15: met. `EditNote.save.test.tsx` (AC-15)
- AC-16: met. `EditNote.save.test.tsx` (AC-16) and `saveProblems.test.ts`
- AC-17: met. `EditNote.save.test.tsx` (AC-17)
- AC-18: met. `EditNote.save.test.tsx` (AC-18) and `noteSession.test.ts`
- AC-19: met. `e2e/edit-note.spec.ts` (AC-19)
- AC-20: met. `e2e/edit-note.spec.ts` (AC-20)
- AC-21: met. `EditNote.leave.test.tsx` (AC-21)
- AC-22: met. `EditNote.leave.test.tsx` (AC-22)
- AC-23: met as written. `EditNote.leave.test.tsx` (AC-23) uses `history.back()`, per plan S1. **R20 itself is still not met** in one sequence this AC doesn't cover; F1 is fixed, but see F5 (iteration 2).
- AC-24: met. `EditNote.leave.test.tsx` (AC-24)
- AC-25: met as written. `e2e/edit-note.spec.ts` (AC-25). F5 also applies.
- AC-26: met. `EditNote.leave.test.tsx` (AC-26)
- AC-27: met. `e2e/edit-note.spec.ts` (both AC-27 tests)
- AC-28: met. `e2e/edit-delete-privacy.spec.ts` (AC-28)
- AC-29: met. `ConfirmDialog.test.tsx` (AC-29)
- AC-30: met. `ConfirmDialog.test.tsx` (AC-30)
- AC-31: met. `ConfirmDialog.test.tsx` (AC-31)
- AC-32: met. `ConfirmDialog.test.tsx` (AC-32), plus the R23 test of the Tab cycle and the `inert` attribute on the app root
- AC-33: met. `e2e/edit-delete-a11y.spec.ts` (AC-33, delete and discard): three Tabs and three Shift+Tabs stay on the two buttons, a click at the centre of "Back to notes" changes nothing, and a CDP AX-tree check shows the page hidden while the dialog is open and back after it closes.
- AC-34: met. `DeleteNote.test.tsx` (AC-34)
- AC-35: met. `DeleteNote.test.tsx` (AC-35)
- AC-36: met. `DeleteNote.test.tsx` (AC-36)
- AC-37: met. `e2e/delete-note.spec.ts` (both AC-37 tests)
- AC-38: met. `DeleteNote.test.tsx` (AC-38) covers one status region and one alert region from the first render, and an empty status through loading, a loaded list, an empty list and a form save. It also covers "Note deleted." after a delete, the status clearing when a note is opened, the same DOM node going `["", "Note deleted."]` on a second delete, and a New note save attempt clearing it.
- AC-39: met. `DeleteNote.test.tsx` (AC-39)
- AC-40: met. `DeleteNote.test.tsx` (AC-40)
- AC-41: met. `DeleteNote.test.tsx` (AC-41)
- AC-42: met. `e2e/delete-note.spec.ts` (AC-42). The own context it creates is closed. On not-found the code dispatches `notFound` and calls `onGone`, and never calls `create`.
- AC-43: met. `EditDelete.list.test.tsx` (AC-43)
- AC-44: met. `EditDelete.list.test.tsx` (AC-44)
- AC-45: met. `EditDelete.list.test.tsx` (AC-45)
- AC-46: met, under the Revision 2026-10-10 exception. `e2e/edit-delete-a11y.spec.ts` runs 12 state tests, all with zero violations.
  - The 9 non-dialog states assert `color-contrast` is not in `incomplete` and passes on at least 3 nodes.
  - The 3 dialog states accept `incomplete` only when every incomplete node is inside `[role=alertdialog]` (`allInsideDialog`). They then check explicitly:
    - each `h2`, `p` and `button` in the dialog against the box's opaque background (a button against its own background), needing at least 4.5:1, or 3:1 for large text (24px or more, or 18.66px or more and bold);
    - each keyboard-focused button's outline against the box, needing at least 3:1.
  - Translucent or non-`rgb` colours throw, so they fail. See F3 for a minor robustness gap.
- AC-47: met. `e2e/edit-delete-layout.spec.ts` (AC-47 at 4 viewports)
- AC-48: met. `e2e/edit-delete-layout.spec.ts` (AC-48)
- AC-49: met. `e2e/edit-delete-layout.spec.ts` (AC-49)
- AC-50: met. `e2e/edit-delete-layout.spec.ts` (AC-50). The `oklab` backdrop allow-list entry is accepted build note 9. `tests/tooling/theme.test.ts` is unchanged and passes.
- AC-51: met. `e2e/edit-delete-a11y.spec.ts` (AC-51)
- AC-52: met. `e2e/edit-delete-performance.spec.ts` (AC-52) replaces the last character (`\n` becomes `x`), per Revision 2026-10-10. See F2 for a minor assertion gap.
- AC-53: met. `src/App.storageUse.test.tsx`, rewritten as the plan specifies. The counts are relative to the kept list-notes open step, so the AC-53 flow itself adds 1 `get`, 1 `update` and 1 `delete`, and never calls `create` or `isPersisted`.
- AC-54: met. `tests/tooling/storage-boundary.test.ts` is unchanged and passes.
- AC-55: met. `package.json` is unchanged; `package-contract.test.ts` and `licences.test.ts` are unchanged and pass.
- AC-56: met. `App.editPrivacy.test.tsx` (AC-56)
- AC-57: met. `e2e/edit-delete-privacy.spec.ts` (AC-57): a delete makes no request and no `persisted()` or `persist()` call; an update makes each call at most once.
- AC-58: met. `App.editPrivacy.test.tsx` (AC-58)
- AC-59: met. `e2e-isolation.test.ts` and `e2e-contexts.test.ts` are unchanged and pass. The new e2e tests use the `page` fixture; the one `browser.newContext()` (`delete-note.spec.ts`) is closed, and the second page in the a11y spec is closed.
- AC-60: **not done. Manual**, deferred to the owner (VoiceOver on macOS Safari and iOS Safari, plus a keyboard-only pass in Chrome). Agents never mark it passed.
- AC-61: **not done. Manual at ship**, deferred to the owner (live URL, Chrome and Safari, steps 1-4). Agents never mark it passed.

**Existing tests changed (checked against "Changes to earlier specs" and the plan's "Existing tests that change"):**
- `NoteView.open.test.tsx` (list-notes AC-27 → AC-1): still asserts no textbox, no visible `contenteditable` and one link. The button count changed from 0 to exactly `["Edit", "Delete"]`. Renamed as the plan says. Matches.
- `NotesSection.load.test.tsx` AC-17: still asserts one empty alert region and the form's two regions. Now also asserts exactly one empty `role="status"` and no `[aria-live]`. Matches.
- `NotesSection.load.test.tsx` AC-43: `liveRegions()` now leaves out only `[role=status]`; the alert region and `[aria-live]` stay. The status region is covered by AC-38 as above. Matches, nothing extra loosened.
- `App.storageUse.test.tsx` AC-53: rewritten as the plan specifies; the list-notes steps are kept at the start. Matches.
- `e2e/notes-layout.spec.ts` AC-48: repeated Shift+Tab now reaches Delete, then Edit, then "Back to notes", with the outline check on each. Renamed. Matches the Revision 2026-10-10 row.
- `src/test/repositoryDoubles.ts`: adds `update` and `delete` options (defaults still reject) and a call-through `spyOn` (build note 8). Additive only.

## UX conformance
- Reading mode ("Back to notes", Edit, Delete, in that DOM order, before the article): matches.
- Edit mode in place (no URL change, prefilled, Title focused, counters, validation, shortcut, "Save changes" and Cancel): matches.
- Saving, no-op save, save failures (unavailable, full, failed, not found, validation): matches. Text is kept and the rejection text is never shown.
- Leaving with changes:
  - Cancel, "Back to notes" and a single Back press: match.
  - Back after an earlier "Keep editing" that followed an edited URL: matches in iteration 2 (F1 fixed).
  - **Forward onto an edited-URL entry, then "Keep editing": deviates (F5, iteration 2).** The URL is left on the list route while the edit form shows.
- Reload and close ("Leave site?"; reopens in reading mode): matches.
- Delete dialog ("Delete this note?", title paragraph, "Keep note" focused, Escape safe, "Deleting…"): matches.
- Discard dialog ("Discard your changes?", "Keep editing" focused, Escape safe): matches.
- Dialog mechanics: a custom `alertdialog` in a portal; the app root gets `inert` in a layout effect (build note 3); focus starts on the safe button; Tab and Shift+Tab cycle; a mousedown on the backdrop is cancelled. Matches.
- After a delete, the list shows, the "Your notes" `<h2>` is focused and the status reads "Note deleted.". The "already deleted" copy works the same way. Matches.
- List order: an edited note moves first through `noteSaved`; a deleted note is removed through `noteGone`; no extra `list()`. Matches.
- No red, the accent focus outline, `zinc-900/50` backdrop, flex-wrap reflow (build note 10): matches.

## API contract conformance
- UI → repository: matches.
  - `update(id, {title, body})` runs only after `checkBeforeSave` and `differsFrom(baseline)`, with exactly two keys.
  - `delete(id)` runs once per confirmation, guarded by `deletingRef`.
  - The error mapping matches the contract table (`EDIT_FAILURE_COPY`, `deleteOutcomeFor`).
  - There is no `get` on Edit, Cancel, save, Keep editing or the not-found → Cancel path.
  - `isPersisted` is never called. The UI never calls `persisted()` or `persist()`; only the unchanged `src/notes/persistence.ts` does.
- URL and history: no `pushState`, and `replaceState(null, …)` only. Matches, except that the D7 `restoreHeld` branch selection is wrong in the F5 sequence (iteration 2). Fixed in iteration 3 where the Navigation API is available; see Iteration 3 for the contract change this brings (`NavWindow.navigation`).
- Component and hook contracts: match, with the accepted build notes.
  - Note 2: `held` is optional.
  - Note 4: `onSafe(previouslyFocused)`.
  - Note 5: `backToList` is in `nav`.
  - Note 6: a `deleteSettled` action.
  - Note 7: the status is keyed by visit.
  - All 10 accepted build notes were checked against the code, and none changes spec behaviour.

## Findings
1. **F1 (blocking, correctness, R20). `restoreHeld` can go back instead of forward after an earlier "Keep editing".** In `src/routing/hashNavigation.ts`, `grew` is computed as `win.history.length > enteredLength`. `enteredLength` is set only in `moveTo`, so it is not reset when "Keep editing" restores with `history.back()` (a same-route `hashchange` returns early). The browser keeps the forward entry, so `history.length` stays raised. Any later held change on the same visit then reads `grew: true`, even a Back press.
   - The reviewer reproduced this by running the real `hashNavigation.ts` with a fake history (scratchpad, no repo change). The sequence: open a note from the list, edit with changes, type the list URL (held, grew) and choose "Keep editing" (URL back to `#note/<id>`). Then press browser Back (held, and grew wrongly reads true) and choose "Keep editing". `restoreHeld` calls `history.back()` again, which can't move from index 0, so the URL stays on the list route while the app shows the edit form.
   - If a page before QuickNotes is in the tab's history, it leaves the app instead.
   - This breaks R20 ("Keep editing" → `location.hash` MUST again be `#note/<id>`). It isn't the accepted plan risk R2 (that is only the unknown-entry `replaceState` fallback).
   - Suggested fix: reset `enteredLength = win.history.length` when a held change closes back onto the current route, or in `restoreHeld`. Add a `hashNavigation.test.ts` case for typed URL → Keep → Back → Keep.
2. **F2 (minor, test robustness). The AC-52 save step doesn't prove `update` ran.** `e2e/edit-delete-performance.spec.ts` waits for heading focus, and the no-op path also focuses the heading. The change is real today (`\n` becomes `x`), but asserting "Changes saved." would stop a future no-op from passing silently. Not blocking.
3. **F3 (minor, test robustness). `allInsideDialog` (AC-46) passes vacuously.** `[].every(...)` is true, so a selector that matches no element passes. Asserting at least one match per selector would make the dialog exception strictly as narrow as the revision intends. The explicit contrast checks run regardless, so this is not blocking.
4. **F4 (note).** `ConfirmDialog`'s document-level `keydown` handler takes every Tab (including Ctrl/Alt+Tab, which the browser usually handles first) and Escape during IME composition. This is harmless in practice and recorded only.
5. Security and privacy: no network calls, no emails or URLs in the new src and e2e code, no new `console` calls, nothing written to web storage, and no note text in the URL, `document.title` or `history.state` (AC-28, AC-56, AC-57, AC-58).
6. Simplification: the duplicated save flow in `useEditNote` and `useNoteForm` is accepted (plan R9, out of scope). `LoadedNote.tsx` is 384 lines, which is acceptable.

## Iteration 2 (re-review of the delta)
**Verification:** the reviewer re-ran `npm run ci` on Node 24.18.0. Exit 0. Vitest: 71 files, **548/548** passed. Playwright: **101/101** passed. The only source change in the delta is `src/routing/hashNavigation.ts`, which adds 4 lines that reset `enteredLength` and 4 lines that keep the typed entry in the entries model. The rest of the delta is tests.

- **F1: fixed.** The reviewer re-ran the iteration 1 fake-history repro against the new module (typed list URL → Keep editing → Back → Keep editing). The held change now reads `grew: false`, `restoreHeld` calls `forward()`, and the URL is back on `#note/<id>`.
  - The 2 new `hashNavigation.test.ts` tests would fail on the old logic. Before the fix, `enteredLength` was not reset after a restore or after a self-return to the note. The old module therefore reports `grew: true` where both tests assert `grew: false` ("a typed URL, Keep editing, then the Back button restores with forward, not back (review F1)" and "returning to the note by itself also resets the growth baseline").
- **F2: fixed.** `e2e/edit-delete-performance.spec.ts` now asserts that the view status reads "Changes saved." after the save.
- **F3: fixed.** `allInsideDialog` now needs at least one match per selector (`found.length > 0`).
- **F5 (new, blocking, correctness, R20). The same bug family remains for the Forward button.** The reviewer ran the new module with the same fake history:
  1. Open a note from the list (entries: list, note) and edit it with changes.
  2. Type the list URL (a new list entry after the note; held, `grew: true`).
  3. Choose "Keep editing". `back()` returns to the note, and the typed list entry stays as the forward entry, which the delta deliberately keeps in the model.
  4. Press browser Forward (held, `grew: false`), then choose "Keep editing".

  At step 4, `restoreHeld` tests `before` first. The note entry now has a list route on both sides, so `before` matches and it calls `history.forward()`. There is no forward entry, so nothing happens: `location.hash` stays `""` while the app shows the edit form with the held change cleared. That breaks R20 ("Keep editing" → `location.hash` MUST again be `#note/<id>`). Back then Forward between the same two entries ends the same way.
  - This was latent in iteration 1 too, because the old branch order is the same. It surfaced while checking the F1 fix.
  - It is not plan risk R2 (the unknown-entry fallback).
  - Suggested fix: choose the direction from where the held change actually moved, not from route equality with the neighbours. If `heldEntries.index < entries.index`, the Back button moved, so call `forward()`. If it is greater, the Forward button moved (or the history grew), so call `back()`. Add a unit test for typed URL → Keep editing → Forward → Keep editing.

## Iteration 3 (re-review of the F5 delta)
**Verification:** the reviewer re-ran `npm run ci` on Node 24.18.0. Exit 0. Vitest: 71 files, **558/558** passed. Playwright: **101/101** passed. The delta touches only `src/routing/hashNavigation.ts` and its test.

**F5: fixed in the supported browsers.**
- The store now records each held change as a move (`delta`: -1 Back, +1 Forward, `null` for a new or unknown entry). It settles the both-neighbours-are-list tie with the change in `navigation.currentEntry.index` since the last `hashchange`. `restoreHeld` branches on `grew` or `delta` (`back()`, `forward()`, or the `replaceState` fallback), not on neighbour route equality.
- The reviewer re-ran the fake-history repro against the new module:
  - **With a fake `navigation.currentEntry.index`:** typed URL → Keep editing → Forward → Keep editing → Back → Keep editing restores `#note/<id>` every time. So does the F1 order (typed URL → Keep editing → Back → Keep editing → Forward → Keep editing).
  - **Without the API:** the Back cases restore correctly, but every Forward-onto-the-typed-entry case falls back to `forward()`, which does nothing. The URL stays on the list while the edit form shows. That is the iteration 2 behaviour; it is not a regression, and it can't leave the app.
- Tests: `hashNavigation.test.ts` now covers both the API path (a fake `navigation` in the fake window) and the fallback (`navigation: undefined`). The builder reports that 7 of the 10 new tests fail with the index read disabled; consistent with the fallback repro above. jsdom has no Navigation API, so the component tests exercise the fallback.
- Correctness of the code: no new defect found. `lastIndex` is updated on every `hashchange` (including the store's own `back()` and `forward()`), and `replaceState` doesn't change the index. A jump of more than one entry (the long-press history menu) gives `delta: null` and goes to the accepted `replaceState` fallback (plan risk R2). A typed URL that replaces a forward entry reads as `delta: 1` and correctly goes `back()`.

**Support range (project-foundation R31, R20).** The Navigation API (`window.navigation`, `currentEntry.index`) shipped in:
- Chrome and Edge 102 (2022);
- Safari 26.2, including iOS Safari (December 2025);
- Firefox 147 (January 2026).

By 2026-10-09, the last 2 versions of Chrome, Edge, Firefox, Safari and iOS Safari all include it. The reviewer took these versions from release history known to the reviewer, not from a live check, so the owner should confirm Safari and Firefox during AC-60 and AC-61.
- **R31 is satisfied.** The feature is supported across the target range, and older browsers have a feature-detected fallback.
- **R20 is satisfied across the supported range.** It degrades only outside the range, and only in the typed-URL-then-Forward sequence, where the URL stays on the list while the edit form keeps the text. Data is never lost and the app is never left. This is acceptable as a recorded risk.
- AC-61 step 2 (Chrome and Safari, browser Back with changes) exercises this path manually.

**Plan sync (D7 and the API contract): required, so a plan revision rather than only a build note.**
- Plan D7 and Step 4 specify `restoreHeld`'s branch rule word for word: `forward()` if the held route equals the route immediately before, `back()` if it equals the route immediately after. That rule is exactly what F5 showed to be wrong, and the code no longer follows it.
- API contract item 3 lists `NavWindow.history` gaining `forward` and `length`. The code also adds an optional `navigation` field.
- The plan says: "Changing any of them during the build means updating this plan first." The repo rules say the same: keep artifacts and code in sync.
- A build note alone would leave D7's text describing the old algorithm, so the plan needs:
  - D7's restore rule rewritten: direction from the recorded move, the tie settled by the Navigation API entry index, and a fallback of `forward()` without the API.
  - Contract item 3: `NavWindow` gains an optional read-only `navigation: { currentEntry: { index } | null }`.
  - Step 4's branch list.
  - A risks row for the fallback (outside R31's range; URL left on the list in the typed-URL-then-Forward sequence; no data loss).
  - An accepted build note 11 pointing to these changes.
- This is a plan Revision that the owner (Tech Lead) must re-approve. It needs no code change, and the spec is unaffected because R20's wording stays correct.

## Iteration 4 (plan-sync confirmation)
**Scope:** plan Revision 2026-10-10b (Status: Approved, AITechie 2026-10-10) against `src/routing/hashNavigation.ts` and `hashNavigation.test.ts` as reviewed in iteration 3.

**No code change since iteration 3.** No file under `src/` or `e2e/` is newer than the iteration 3 `review.md`; only `plan.md` changed. CI was not re-run; iteration 3's result stands (Vitest 558/558, Playwright 101/101).

**Plan text vs. code: consistent.**
- [x] D7: the move is recorded as -1, +1 or `null`. Chained held changes are summed, and any `null` gives `null` (`moveOn`). A traversal is a neighbour-route match. The tie is settled by the `navigation.currentEntry.index` step, and without it the entry before wins (`entriesAfter`). `restoreHeld` uses `back()` if `grew` or the move is +1, `forward()` if -1, and `replaceState(null, …)` otherwise, then resets `enteredLength`. All of this matches.
- [x] Step 4: the branch list and the fake `navigation` (present and `undefined`) match the tests.
- [x] API contract item 3: optional read-only `navigation?: { currentEntry: { index } | null }` matches `NavWindow`.
- [x] R10: the fallback behaviour (`forward()` does nothing, so the URL stays on the list; the app is not left and no data is lost) matches the iteration 3 repro.
- [x] Build note 11: 10 tests under "Keep editing always puts the note URL back (review F5)": 7 table sequences plus "with a later entry", "held Forward, then Back to the note by itself" and "without the Navigation API…". The count and names match.

**Non-blocking:** plan header line 5 still says the spec is "Status: draft, under review", but `spec.md` is `Status: Approved`. This is a stale cross-reference that could be tidied in a later edit.

## Decision
**approve** (iteration 4). The iteration 3 blocking item (plan sync) is resolved: the approved plan now describes the code as reviewed.

Blocking: none.

Still pending for the owner at ship: AC-60 and AC-61 (manual), including a check that the Navigation API is present in the current Safari and Firefox (R10). Not blocking: F4 (note only). The uncommitted `factory/**`, `product/charter.md`, `.claude/worktrees/` and the other slugs' specs (`pwa-offline`, `search-notes`, `theme-mode`) must stay out of this PR.

## Sign-off
- Reviewed by:  AITechie, 2026-10-10
