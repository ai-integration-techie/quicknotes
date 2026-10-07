# Review: Create a note

- Slug: create-note
- Spec: [spec.md](./spec.md) (Approved, AITechie, 2026-10-07; owner decisions Q1-Q12)
- Plan: [plan.md](./plan.md) (Approved, AITechie, 2026-10-07; plan decisions D1-D10)
- PR: none yet (uncommitted working tree on `main`)
- Date: 2026-10-07
- Iteration: 1

## How this was verified
- I ran `npm run ci` myself on Node 24.18.0 (`~/.nvm/versions/node/v24.18.0/bin` first on PATH, `~/.npmrc` untouched). **Exit 0.** It ran format:check, lint (`--max-warnings 0`), typecheck, Vitest **349/349** (44 files), build, then Playwright **39/39** (Chromium, `/quicknotes/`). There were no stderr warnings: no React `act` or `flushSync` warnings.
- `git diff main` is **empty** for `e2e/privacy.spec.ts`, `playwright.config.ts`, `index.html`, `src/main.tsx`, `src/notes/**`, `src/storage/**`, `eslint.config.js`, `vite.config.ts`, `package.json`, `package-lock.json`, `tests/tooling/{theme,licences,eslint-config}.test.ts`, `e2e/document.spec.ts`, `src/components/{AppHeader,ErrorBoundary}.tsx` and `ErrorBoundary.test.tsx`.
- I read every changed and new file in `src/`, `e2e/` and `tests/tooling/`.
- I ran mutation spot-checks in a throwaway copy under the scratchpad. The source tree was never edited. The checks were:
  - removing the `flushSync` on `attemptStarted`, which made the both-empty repeat test fail;
  - dropping the `keyCode === 229` IME guard, which made AC-9 and the D9 unit test fail;
  - making the `beforeunload` handler always active, which made AC-35 fail.

  So these tests catch broken code. They don't pass vacuously.
- Out of scope, noted only: `CLAUDE.md`, `docs/factory.md`, `.claude/commands/factory.md`, `factory/team.yaml` and the new `product/decisions.md` are owner process changes. `factory/BOARD.md` and `factory/runs/{create-note,note-storage}/run.yaml` are orchestrator ledger updates.

## Spec conformance
Form and first load
- [x] AC-1 met. `src/App.test.tsx` checks h2, input type=text, textarea and submit button in DOM order (`compareDocumentPosition`). It also checks exactly 2 textboxes and 1 button, 0 link, searchbox or checkbox, and one h1 inside the banner. The section is `aria-labelledby` its h2.
- [x] AC-2 met. `App.test.tsx`: `activeElement` is Title after render. Focus comes from a mount effect, not `autoFocus`; `no-autofocus` is untouched and there is no `eslint-disable` anywhere in `src/`.
- [x] AC-3 met. `App.test.tsx`: no `maxlength` or `required`, and `form.noValidate`.
- [x] AC-4 met. `e2e/create-note.spec.ts`: an rAF-polled `waitForFunction` returns `performance.now()` when Title is focused, and asserts it is below 1000. `keyboard.type("Hello")` with no click works.
- [x] AC-5 met. `tests/tooling/render-path.test.ts` scans the `importClosure(src/main.tsx)` files, with negative fixtures.
- [x] AC-6 met. Component: new info text present, old texts absent, and unchanged after a save. e2e: `base-path.spec.ts` changes only the one line. There is also an extra e2e test in `create-note.spec.ts`.

Text and saving
- [x] AC-7 met. `NoteForm.save.test.tsx` uses the in-memory double: `create` is called once, the argument deep-equals `{title, body}`, the keys are exactly `body,title`, and `list()` has 1 note.
- [x] AC-8 met. `it.each` over the 3 spec pairs with `toBe` identity.
- [x] AC-9 met. `NoteForm.keyboard.test.tsx` covers 4 cases (Ctrl/Meta × Title/Note). `isComposing:true` and `keyCode:229` don't save, and the mutation check confirmed this. Ctrl+Enter in Note is default-prevented (no line break).
- [x] AC-10 met. Component: plain Enter in Title is prevented, there is no `submit` event, `create` isn't called, and focus moves to Note. Enter and Shift+Enter in Note aren't prevented and don't save. An e2e companion shows no implicit submit in a real browser: no database is created and the URL is unchanged.
- [x] AC-11 met. `navigator.platform` stubbed as `MacIntel` gives Cmd and `Win32` gives Ctrl. `aria-keyshortcuts` is checked, along with `toHaveAccessibleName("Save note")` and `toHaveAccessibleDescription(hint)`. `platform.test.ts` covers iPhone, iPad, iPod, `""`, Linux and Android.
- [x] AC-12 met. Status "Note saved.", fields empty, focus on Title, alert empty, button reset.
- [x] AC-13 met. With a deferred `create`: "Saving…", `aria-disabled="true"`, not `disabled`, both fields `readOnly`. A second click and a Ctrl+Enter still leave 1 call. The resolve resets everything. There is also a same-tick double-trigger test (D4).
- [x] AC-14 met. "Note saved." clears on an edit, and clears on the next attempt, which then shows the both-empty alert.
- [x] AC-15 met. `NoteForm.failures.test.tsx` runs 5 rejections. A `MutationObserver` shows "Note saved." never appears, and the exact text is kept (including double spaces and `\n`).

Validation and the counter
- [x] AC-16 met. Both-empty alert, focus on Title, `list()` gives `[]`; also via Ctrl+Enter from Note.
- [x] AC-17 met. `create` is called with `{title:" ", body:""}` and "Note saved." shows.
- [x] AC-18 met. Exact message, `aria-invalid`, described-by id, focus, nothing stored, 201 characters kept, and the message is inside Title's wrapper.
- [x] AC-19 met. Exact message under Note (same wrapper, after the textarea), `aria-invalid`, focus on Note, and Title not invalid.
- [x] AC-20 met. Both messages, both fields invalid, focus on Title.
- [x] AC-21 met. 200 😀 saves; 201 😀 reports "It has 201 characters".
- [x] AC-22 met. Typing 250 characters one at a time shows no "too long", no `aria-invalid` and an empty alert.
- [x] AC-23 met. Editing Title clears its message and `aria-invalid`, and typing in Note clears the both-empty alert. There is also an extra test that the other field's error survives.
- [x] AC-24 met. 3 `ValidationError` issue lists give the right messages. Placement isn't asserted, as the plan states. `saveProblems.test.ts` covers mixed and unknown lists (D7).
- [x] AC-25 met. None at 179, then 180 / 200 / 205 with identical `className`, gone again at 179. The counter id is in `aria-describedby`, and an ancestor walk finds no `aria-live` or status/alert role.
- [x] AC-26 met. None at 89,999; "90,000 of 100,000" at 90,000; "100,001 of 100,000" at 100,001.
- [x] AC-27 met. 180 😀 gives "180 of 200 characters".
- [x] AC-28 met. e2e `insertText` of 250 characters: value length 250, counter visible, no "too long", no `aria-invalid`, empty alert.

Storage failures
- [x] AC-29 met. Exact unavailable copy, text kept and editable, button reset, focus on Save note. Via Ctrl+Enter from Note, focus stays in Note.
- [x] AC-30 met. Exact "Storage full" copy.
- [x] AC-31 met. `NotFoundError`, `Error("boom")` and `"boom"` each give the exact generic copy, with no "boom" in the document.
- [x] AC-32 met. A retry that succeeds clears the alert and saves. On a repeat failure, the observed alert sequence is exactly `[msg, "", msg]`.
- [x] AC-33 met. With "SECRET-T" / "SECRET-B": `localStorage` and `sessionStorage` are 0, there are no cookies, and the `console.*` spies record nothing containing SECRET (Error message and stack included). `restoreMocks: true` restores the spies.
- [x] AC-34 met. `e2e/save-note.spec.ts` with `blockIndexedDb` (`open` throws `SecurityError`): the unavailable copy shows and Title is kept.

Leaving with unsaved text
- [x] AC-35 met. `NoteForm.unload.test.tsx`: false when empty, true for `" "` in Title, false when cleared, true for "a" in Note only, false after a save. `useUnsavedTextWarning.test.tsx` checks the listener is removed on cleanup.
- [x] AC-36 met. e2e: typed text gives a `beforeunload` dialog. With nothing typed there is no dialog, and the test clicks first so Chromium's user-activation rule can't explain the missing dialog. This is a good guard against a vacuous pass.

Storage use and project-foundation AC-33
- [x] AC-37 met. A spy repository records no call while rendering and typing, and only `create` (once) after a save. The stubs' `list`, `get`, `update`, `delete` and `isPersisted` reject if the UI ever calls them. The `list()` calls in AC-7, AC-16, AC-18 and AC-19 are the test itself inspecting the double, which those ACs require and the plan's AC-37 row allows.
- [x] AC-38 met. `git diff main -- e2e/privacy.spec.ts` is empty, and "no storage or cookies on fresh load" passes.
- [x] AC-39 met. After typing "draft" in both fields and waiting for network idle: `local`, `session` and `cookie` are all empty, `databases` is `[]`, and the URL is unchanged.
- [x] AC-40 met. Exactly 1 record with title and body, read directly with `getAll`, and `databases()` contains `quicknotes`.
- [x] AC-41 met. Same test, separate `test.step`: after a reload the record `toEqual`s the saved one (all 5 fields), and the form is empty with focus on Title.
- [x] AC-42 met. `tests/tooling/e2e-isolation.test.ts` checks `playwright.config.ts` and `e2e/**`, with positive and negative fixtures. All saving e2e tests use the per-test `page` fixture, and there is no `newContext`, `storageState` or `launchPersistentContext`.

Storage boundary
- [x] AC-43 met. `storage-boundary.test.ts` uses `uiModules()` discovery (lists files, covers the new `src/noteForm/`). Every direct import under `notes`, `storage` or `test` must be `src/storage/index.ts`. The closure-wide `idb`/`fake-indexeddb` check is kept, and at least one UI module must import the entry point.
- [x] AC-44 met. All 6 spec fixtures fail, plus `fake-indexeddb/auto` and `idb`. `../storage`, `../storage/index` and `react` pass.
- [x] AC-45 met. `exportSurface` uses the TS compiler API and splits values from types. The exact R30 lists are pinned. Fixtures for the factory re-export, a test re-export, a type re-export from test, `export *` and an added interface all fail.
- [x] AC-46 met. The UI source regex is applied to every UI module, and each of the 6 patterns has a fixture. The AC-51 and AC-53 test bodies are unchanged: no `+`/`-` line in either, verified with `git diff`. `privacy.test.ts` adds the "UI privacy" scan (R31, R39).

Privacy and dependencies
- [x] AC-47 met. Request log cleared after network idle, then the save gives `[]`. `privacy.spec.ts` "all requests are same-origin" passes unchanged.
- [x] AC-48 met. `package-contract.test.ts`: `dependencies` keys are exactly `react` and `react-dom`. `package.json`, the lockfile and `licences.test.ts` are unchanged. No dependencies were added, dev included (D2).
- [x] AC-49 met. The saved state and 5 failure states contain no `/persist|permission/i`.

Accessibility and layout
- [x] AC-50 met. Exactly one status region and one alert region in the form, both with `textContent === ""`.
- [x] AC-51 met. `e2e/a11y.spec.ts` covers 6 states (idle, 180-character title, title too long, both empty, saved, unavailable). Each has 0 violations, `color-contrast` not incomplete, and at least 3 contrast passes. "axe detects a contrast failure" is retargeted to the secondary info line; the `#d4d4d8` recolour and the assertion are unchanged.
- [x] AC-52 met. `e2e/layout.spec.ts`: Title, then Tab to Note, then Tab to Save note, then Shift+Tab ×2 back to Title. Each control has a non-`none` outline at least 2px wide in `rgb(29, 78, 216)`.
- [x] AC-53 met. 4 viewports: no overflow. Shell texts, labels, fields, button and hint are visible and inside the viewport. `main form` is centred within 2px, and the button is at least 44px tall.
- [x] AC-54 met. At 320px, 200% root font and title-too-long: no overflow, and labels, fields, button, hint, error, counter and info lines are visible.
- [x] AC-55 met. At 360px with text spacing and title-too-long: no overflow, and no clipping for `h1, h2, label, main p, button, [role=status], [role=alert]`.
- [x] AC-56 met. The "no animations or transitions" test is unchanged (idle). The new saving-state test uses `hangIndexedDb` and asserts "Saving…" with `aria-disabled`. `theme.test.ts` (project-foundation AC-25) is unchanged and passes. No new colour token; the `@custom-variant aria-invalid` adds no colour.
- [ ] AC-57 **pending (manual).** VoiceOver on macOS Safari and iOS Safari, plus a keyboard-only pass in desktop Chrome. Not done yet. It must be recorded here before ship, and is **not** marked passed. See finding F1 for one extra check to include.

Real-browser survival
- [ ] AC-58 **pending (manual, at ship).** A8 check in desktop Chrome and desktop Safari: reload, browser restart, new deploy. Owner task at ship, **not** marked passed.

Changes to earlier specs (checked against the spec's table and the plan's "Existing tests that change")
- [x] project-foundation AC-19 and AC-20 in `src/App.test.tsx`: the h1 and banner checks are kept, and the empty-state checks are replaced by the info text plus null checks on the old literals. The no-controls test became AC-1, still with 0 link, searchbox and checkbox.
- [x] pages-deploy AC-16 in `e2e/base-path.spec.ts`: one line changed, nothing else.
- [x] a11y: the shell axe test became the idle state of the AC-51 loop, with all 3 assertions kept. The contrast-failure test changes only its target.
- [x] layout AC-26 to AC-29: `TEXTS`, the visible set, the `main form` centre selector, the 44px button check, the too-long setup, and the clip selector are changed exactly as the plan lists. The focus probe is removed and replaced by AC-52. The tolerance, overflow helper and `TEXT_SPACING_CSS` are unchanged.
- [x] note-storage AC-56: the `UI_FILES` list was replaced by `uiModules()`. The closure-wide `notes/storage/test` check was replaced by the per-module rule, as the spec allows. The sanity checks and the closure-wide package check are kept.
- [x] Nothing is loosened beyond the table.

## UX conformance
Flows
- US-1 (open and type): matches. The form is in the first render and Title is focused (AC-2, AC-4).
- US-2/US-4 (save): matches. Tab or Enter moves to Note; button or Cmd/Ctrl+Enter saves; "Saving…" with read-only fields; then "Note saved.", fields cleared, focus on Title; the message clears on the next edit.
- US-5 (both empty): matches. The button is never disabled, the alert shows, focus goes to Title, and typing clears it.
- US-5 (near and over the limit): matches. Counter from 180 / 90,000; nothing truncated; no error until save; on save the message shows under the field with `aria-invalid` and focus; editing clears it and the counter stays.
- US-6 (storage fails): matches. Copy is mapped by kind, text is kept, focus is unchanged, and the next attempt clears the alert first.
- US-7 (leave with unsaved text): matches (AC-35, AC-36).
- US-3 (survival): simulated by AC-41. The real check is AC-58 (pending).

Screens
- Header unchanged. `main` keeps its classes. The section has `pt-6`, and the h2 is `text-lg font-semibold text-zinc-900`. Labels and fields match the spec's styling (`border-zinc-500`, `bg-white`, `px-3 py-2`, `text-base`, rounded; the textarea has `rows=12` and `resize-y`). Error and counter `<p>` sit under each field in that order. The button has `min-h-11` and `bg-accent`, and the hint is `text-sm text-zinc-600` in a `flex-wrap` row. Both regions sit directly below the Save row and take no space when empty (`not-empty:mt-3`). The info text is `mt-12`, centred, in the old empty-state styles. Matches, with one minor spacing note (F2).

States
- Loading, idle empty, idle with text, saving, saved, both empty, too long, unavailable, quota and other failure: each one renders as in the spec's States table, and the live region and focus columns match. The render-failure and JS-off states are unchanged (ErrorBoundary and `<noscript>` untouched). No state is left unrendered.

## API contract conformance
- Entry point only. UI modules import storage solely as `"../storage"`: `App.tsx`, `NoteForm.tsx`, `NoteField.tsx`, `noteForm/saveCheck.ts`, `noteForm/saveProblems.ts` and `noteForm/useNoteForm.ts`. AC-43 enforces this.
- `getNoteRepository()` is called in `App` only when there is no `repository` prop (D1). `create({title, body})` is the only method called: exactly two keys, values read from the DOM unchanged, and the resolved `Note` is ignored. `countCharacters`, `TITLE_MAX_CHARS` and `BODY_MAX_CHARS` are used for the pre-check and the counter.
- Rejection mapping (`saveProblems.ts`) matches the plan's outcome table row for row. It never reads `error.message` and never logs. A non-`NoteStorageError` gives the generic copy, and so does an unknown `kind`.
- `src/storage/index.ts` is unchanged, and its export surface is pinned by AC-45.
- Data model: N/A, as the plan says. Backend: N/A, as the plan says.
- No deviation.

## Findings
Correctness and security: no bugs found. Notes on the diff:

- **F1 (low, accepted plan risk). Both-empty repeat announcement is verified only at the DOM level.** On a second empty save, the `alert` text is removed and re-added in two separate synchronous `flushSync` commits within one task. `NoteForm.failures.test.tsx` › "a repeated both-empty alert is removed and re-added as two DOM changes (R22)" proves that with a `MutationObserver`. My mutation check confirms the test fails if the first `flushSync` is removed, so the test isn't structural in a vacuous sense. Whether VoiceOver re-announces two mutations in one task can't be tested in jsdom. This is exactly the plan's first risk row ("Accepted for v1"). The spec has no AC that requires a repeated *empty* message to be announced; R22 and AC-32 cover failures, which have a real `await` in between. **Ask:** during the AC-57 VoiceOver pass, also press Save twice with both fields empty and record whether the second press is announced. If it isn't, the plan's stated follow-up applies: yield one frame between clear and set, as a plan change.
- **F2 (nit, plan drift).** `SaveRow` uses `mt-4`, while the plan's design-system list says `mt-2` for the Save row. Each `NoteField` wrapper also has `mt-4`, which the plan doesn't list. The spec doesn't fix this spacing, and axe and layout pass. Either align the class or note it in the plan the next time it's touched, per "keep artifacts and code in sync".
- **F3 (nit, vacuous assertion).** `src/App.test.tsx` (AC-50) has `expect(app.status).toHaveTextContent("")`, which matches any text. The next two lines (`textContent).toBe("")` for both regions) carry the real assertion, so coverage is fine, but the line could be removed.
- **F4 (info).** D7 moves focus for a `ValidationError` rejection (too-long or empty), even though R21 says "focus unchanged" for failures. The approved plan settled this, and in practice the pre-check makes the path unreachable. AC-24 asserts messages only, and `saveProblems.test.ts` covers `focusTargetFor`.
- **F5 (info). Deleting `src/components/EmptyState.tsx` is correct.** Plan "Files touched" and step 5 call for it. There are no remaining imports, and the `EMPTY_STATE_*` constants are removed; `copy.test.ts` asserts they're gone. The old literals remain only in the "is absent" assertions.
- Things checked and found clean:
  - No new dependencies.
  - No network APIs in UI source; the privacy scan is extended to UI modules.
  - No `console.*` in production code.
  - No emails, phone numbers or personal contact details in any changed file.
  - The only URLs are pre-existing `example.com` fixtures in `privacy.test.ts`, plus the spec's own live-site URL.
  - No `eslint-disable`.
  - The reducer is pure and returns new objects, which `formState.test.ts` checks with frozen input.
  - Refs are read only in handlers.
  - The guard ref makes the one-save rule deterministic.
  - A synchronous throw from `create` is caught by the same `try`.

## Decision
**approve**

Every automated acceptance criterion, AC-1 to AC-56, has a passing test that I ran myself and that tests the stated behaviour. The existing-test changes match the spec's "Changes to earlier specs" table exactly, with nothing loosened. `e2e/privacy.spec.ts` and the note-storage AC-51 and AC-53 tests are unchanged. No blocking findings.

Before ship (not blocking this review):
- AC-57 manual VoiceOver and keyboard pass, recorded in this file. Include the repeated empty-save check from F1.
- AC-58 A8 survival check in desktop Chrome and Safari, recorded at ship.
- Q9 cross-reference notes in the earlier specs (owner task at ship).

## Sign-off
- Reviewed by: <name>, <date>
