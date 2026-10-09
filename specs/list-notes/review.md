# Review: List notes and open one

- Slug: list-notes
- Spec: [spec.md](./spec.md) (Approved, AITechie, 2026-10-09)
- Plan: [plan.md](./plan.md) (Approved, AITechie, 2026-10-09)
- PR: none yet (uncommitted changes on `main`)
- Date: 2026-10-09

## Verification run (by the reviewer)
- `npm run ci` with Node v24.18.0 first on `PATH` (`~/.npmrc` untouched): **exit 0**.
  format:check, lint, typecheck, Vitest **59 files / 463 tests passed**, build, Playwright **67 passed** (7.6 s). Single run, no retries and no flakes. No e2e needed a second run.
- `git diff main -- src/storage src/notes tests/tooling/storage-boundary.test.ts tests/tooling/e2e-isolation.test.ts tests/tooling/licences.test.ts tests/tooling/theme.test.ts tests/tooling/package-contract.test.ts package.json package-lock.json vite.config.ts playwright.config.ts index.html src/index.css e2e/a11y.spec.ts e2e/layout.spec.ts e2e/base-path.spec.ts e2e/document.spec.ts`: **empty**.

## Spec conformance
Key: **met** = a named test exists and passed in the run above.

### Layout and first load
- AC-1: met. `NotesSection.load.test.tsx` (AC-1) plus `App.test.tsx` AC-1 (revised).
- AC-2: met. `NotesSection.load.test.tsx` (AC-2).
- AC-3: met. `NotesSection.load.test.tsx` (AC-3), with `list` recording that Title is in the document.
- AC-4: met. `NotesSection.load.test.tsx` (AC-4).
- AC-5: met. `NotesSection.load.test.tsx` (AC-5), including the StrictMode single-call check.

### The list
- AC-6: met. `NoteList.items.test.tsx` (AC-6), covering the stub order and the in-memory B, C, A order.
- AC-7: met. `NoteList.items.test.tsx` (AC-7), 1,000 items.
- AC-8: met. `NoteList.items.test.tsx` (AC-8), covering name, description and `<time dateTime>`.
- AC-9: met. `NoteList.items.test.tsx` and `display.test.ts` (AC-9). The name keeps the spaces in `"  lead  "` only through `textContent`, as plan note 2 accepts.
- AC-10: met. `NoteList.items.test.tsx` and `display.test.ts` (AC-10), including the lone-surrogate check.
- AC-11: met. `NoteList.items.test.tsx` (all 15 offsets) and `relativeTime.test.ts`.
- AC-12: met. `NoteView.back.test.tsx` (AC-12).
- AC-13: met. `NoteView.open.test.tsx` (AC-13), plus `tests/tooling/plain-text.test.ts` with a sink fixture.

### List states
- AC-14: met. `NotesSection.load.test.tsx` (AC-14).
- AC-15: met. `NotesSection.load.test.tsx` (AC-15).
- AC-16: met. `NotesSection.load.test.tsx` (6 rejection values) and `loadProblems.test.ts`.
- AC-17: met. `NotesSection.load.test.tsx` (AC-17).
- AC-18: met. `NotesSection.load.test.tsx` (AC-18) and `listState.test.ts` (R13).

### Refresh after a save
- AC-19: met. `NoteList.save.test.tsx` (AC-19).
- AC-20: met. `NoteList.save.test.tsx` (AC-20).
- AC-21: met. `NoteList.save.test.tsx` (cases a and b) and `listState.test.ts`.
- AC-22: met. `NoteList.save.test.tsx` (AC-22).
- AC-23: met. `e2e/list-notes.spec.ts` (AC-23).

### Opening a note
- AC-24: met. `NoteView.open.test.tsx` (AC-24).
- AC-25: met. `NoteView.open.test.tsx` (both AC-25 tests).
- AC-26: met. `NoteView.open.test.tsx` (AC-26).
- AC-27: met. `NoteView.open.test.tsx` (AC-27). The hidden form is excluded from the accessibility tree by `hidden`, which is how the test reads "main contains no button".
- AC-28: met. `NoteView.open.test.tsx` (two AC-28 tests) and `route.test.ts`.
- AC-29: met. `NoteView.open.test.tsx` (AC-29).
- AC-30: met. `NoteView.open.test.tsx` (AC-30) and `loadProblems.test.ts`.
- AC-31: met. `NoteView.back.test.tsx` (AC-31) and `hashNavigation.test.ts`.
- AC-32: met. `e2e/open-note.spec.ts` (AC-32). `history.length` is read just before "Back to notes", as plan note 1 records.
- AC-33: met. `e2e/open-note.spec.ts` (AC-33).
- AC-34: met. `e2e/notes-privacy.spec.ts` (AC-34).
- AC-35: met. `e2e/open-note.spec.ts` (AC-35), covering Enter and a `hasTouch` tap.
- AC-36: met. `e2e/open-note.spec.ts` (AC-36).
- AC-37: met. `e2e/open-note.spec.ts` (AC-37).

### Unsaved form text
- AC-38: met. `NoteView.back.test.tsx` (AC-38).
- AC-39: met. `e2e/open-note.spec.ts` (AC-39).
- AC-40: met. `NoteView.back.test.tsx` (two AC-40 tests: success and `StorageUnavailableError`). Focus stays on the view heading in both.

### Skip link
- AC-41: met. `SkipLink.test.tsx` (both AC-41 tests).
- AC-42: met. `e2e/notes-layout.spec.ts` (AC-42), covering: off-viewport before focus, in the viewport and 44px or taller when focused, the accent outline, Enter to the heading with the URL unchanged, then Tab to the note. See deviation 2.

### Announcements
- AC-43: met. `NotesSection.load.test.tsx` (AC-43).

### Look, layout and accessibility
- AC-44: met. `e2e/notes-a11y.spec.ts`, all 10 states. Each one asserts zero violations, that `color-contrast` is not in `incomplete`, and that it passes on 3 or more nodes. `e2e/a11y.spec.ts` "axe detects a contrast failure" is unchanged and passes.
- AC-45: met. `e2e/notes-layout.spec.ts` (AC-45) at 4 viewports.
- AC-46: met. `e2e/notes-layout.spec.ts` (AC-46).
- AC-47: met. `e2e/notes-layout.spec.ts` (AC-47).
- AC-48: met. `e2e/notes-layout.spec.ts` (AC-48), plus the unchanged `theme.test.ts`.
- AC-49: met. `NoteList.items.test.tsx` (AC-49) and `eslint-config.test.ts` (AC-49). The option is `{ ul: ["list"] }` on `src/components/NoteList.tsx` only, and the recommended set is still on.

### Performance
- AC-50: met. `e2e/notes-performance.spec.ts` (AC-50), with all budgets as in the spec and no budget loosened.
- AC-51: met. `e2e/notes-performance.spec.ts` (AC-51), with the note at index 899 (item 900) and a 100,000-character body.

### Manual accessibility check
- AC-52: **pending, deferred to the owner (manual).** Not passed by any agent. Still to do: VoiceOver on macOS Safari and iOS Safari, plus a keyboard-only pass in desktop Chrome, recorded below or at ship. This is also the only check of Safari list semantics (spec risk 1).

### Storage use, privacy and guards
- AC-53: met. `App.storageUse.test.tsx` (AC-53), plus the revised `NoteForm.save.test.tsx` AC-37.
- AC-54: met. `storage-boundary.test.ts` is unchanged (empty diff) and passes.
- AC-55: met. `package.json` and the lockfile have an empty diff. `package-contract.test.ts` and `licences.test.ts` are unchanged and pass.
- AC-56: met. `App.storageUse.test.tsx` (AC-56).
- AC-57: met. `e2e/notes-privacy.spec.ts` (AC-57).
- AC-58: met. `e2e/privacy.spec.ts`: the rewritten test is the only change in that file.
- AC-59: met. `e2e/save-note.spec.ts` (AC-39; revised by list-notes AC-59).
- AC-60: met. `e2e-isolation.test.ts` is unchanged, and `e2e-contexts.test.ts` has its fixture test.

### Real-browser check (ship)
- AC-61: **pending, deferred to the owner at ship (manual).** Not passed by any agent.

## Changes to existing tests vs. the spec's "Changes to earlier specs" table
| File › test | Table row | Verdict |
|---|---|---|
| `e2e/privacy.spec.ts` › AC-33, rewritten as AC-58 | `project-foundation` AC-33 | Matches. Only the `databases` assertion was dropped. Local and session storage, cookie, `context.cookies()` and the new caches, persistence-counter, note-count and request checks are all there. The file's other two tests are unchanged. |
| `e2e/save-note.spec.ts` › AC-39 | `create-note` AC-39 | Matches. `indexedDB.databases()` became `countStoredNotes → 0`, and local, session, cookie and URL are kept. The comment was retargeted to AC-58. |
| `src/App.test.tsx` › AC-1 | `create-note` AC-1 | Matches. Textbox = 2 and button = 1 stay page-wide. Link = 0 is now scoped to "New note". Searchbox and checkbox = 0 stay page-wide. One new check: the only link on the page is the skip link. |
| `src/App.test.tsx` › AC-6 | `create-note` AC-6 | Matches. "No notes yet" appears exactly once, inside "Your notes". "Your notes will show up here." is still null. |
| `NoteForm.save.test.tsx` › AC-37 | `create-note` AC-37 | Matches. It now expects `list` = 1 and everything else 0 after render and typing, then `create` = 1 after a save. |
| `repositoryDoubles.ts`, `setup.ts`, `copy.test.ts`, `eslint-config.test.ts`, `e2e/app.ts` | Support, or additive (plan D13, D14) | Match the plan. `get` and `update`/`delete`/`isPersisted` still reject if called. |
| `e2e/create-note.spec.ts` › AC-10, `databaseNames → []` replaced by `countStoredNotes → 0` | **Not literally named** in the table. The plan lists `create-note.spec.ts` as byte-for-byte unchanged. | Deviation 1, judged below. |

### Judgement of the three reported deviations
1. **create-note AC-10 e2e assertion (`databaseNames → []` replaced by `countStoredNotes → 0`).** Acceptable in substance, and not loosened beyond what the table already allows.
   - `create-note` AC-10's own text is about Enter not saving. It never required "no database".
   - The old assertion becomes false only because of the owner's AC-33 decision (spec R39, risk 5). The table's AC-33 row says plainly that "the test no longer checks whether the database exists".
   - The replacement is identical to the table's `create-note` AC-39 row, and it still proves nothing was saved.
   - However, it is a guard change the table doesn't name, and `plan.md` (the "byte-for-byte unchanged" list and "Not touched") is now out of sync with the code. The orchestrator authorised it, not the owner. **The owner should acknowledge it at sign-off**, ideally as a one-line note in the plan's "Existing tests that change" table. This is not blocking.
2. **Skip link in the page flow when focused.** R28 and AC-42 are met: top left, white, accent, underlined, 44px or taller, global outline, hidden off-screen until focused.
   - It deviates from the Screens text ("at the top left **over the header**"). Focusing it pushes the header down by about one row, where the plan's D7 classes (`focus:top-2`, absolute) would have overlaid it.
   - The reason given is that an overlay hides the h1 background from axe, so `color-contrast` lands in `incomplete`, which AC-44 forbids. That conflict is genuine.
   - It is a cosmetic layout deviation from a stated spec detail, so it is recorded here for the owner to accept. This is not blocking.
3. **Back link arrow as an `aria-hidden` SVG.** It matches the spec's intent: "a '←' before it that is hidden from assistive technology". It is drawn in `currentColor` (accent) rather than typed, and the link's name is exactly "Back to notes". Cosmetic. This is not blocking.

## UX conformance
- Flow US-1/US-2 (open and see notes): matches. The form renders first, focus goes to Title, then "Loading your notes…" (not live), then the list in `list()` order.
- Flow US-3 (open a note): matches. A plain fragment link, `#note/<id>`, `get` once, focus on the `<h2>`, scroll to top.
- Flow US-4 (back): matches. `history.back()` when the note was entered from the list, otherwise `replaceState(null, …)`. Focus returns to the opened link, else to the "Your notes" heading.
- Flow US-5 (reload, link, unknown): matches. A malformed id shows not-found without calling `get`.
- Flow US-6 (save, then see it): matches. `onSaved` runs inside the success `flushSync` and inserts at the top with no second `list()`.
- Flow US-7 (unsaved text): matches. The form stays mounted in `<div hidden>`, and `beforeunload` stays on.
- Flow US-8 (empty and failures): matches.
- Flow US-11 (skip link): matches, except for the overlay detail (deviation 2).
- Screen, list view: matches the classes given in Screens and plan, except the skip link's focused position (deviation 2).
- Screen, note view: matches, including the Back link (SVG arrow, deviation 3), the article and `<h2>` with `pre-wrap`/`break-words`, and the body `div` with the body text as its only child.
- Every state in the States table is rendered: list loading, loaded, empty, failed (unavailable and other), after a save, back from a note; note view loading, loaded, untitled/no text, not found, open failed; skip link focused. Render failure and JavaScript off are unchanged. No state is left unrendered.
- Announcements: the "Your notes" alert region exists from the first render and gets text **only** from `failureText()` for `phase: "failed"`. No other live region was added (grep: the only `role="alert"`/`role="status"` elements are the two in `FormMessages`, the one in `NotesSection` and the one in `ErrorBoundary`).
- Focus rules:
  - On load, Title; at a note route, the heading. The Title focus is gated by `activeRef`.
  - Open goes to the `<h2>` once settled, never while loading.
  - Back goes to the link, else the heading.
  - The skip link goes to the heading.
  - A save that settles during the note view moves no focus, because `focusField` is gated for success, failure and the initial focus alike.

## API contract conformance
- UI to repository: matches. `list()` runs once in `useNoteList`'s effect (promise ref, StrictMode-safe). `get(id)` runs once per `NoteView` mount, keyed by `visit`, never for a malformed id. `create` is unchanged apart from passing its resolved note to `onSaved`. `update`, `delete` and `isPersisted` are never called (AC-53).
- Error mapping: matches. `listFailureReason` and `openOutcome` use `instanceof NoteStorageError` and `kind`, and never read `.message`.
- URL and history: matches. The UI code has no `pushState`. Its only `replaceState` passes `null`. `document.title` is never written. The note link has no click handler. The Back and skip links intercept only plain clicks (`isPlainClick`).
- Component and hook contracts: match plan section 3. Two small additions: `src/routing/plainClick.ts` (a shared helper) and `OpenState.loaded.openedAt` (the "now" for the view's updated line). Neither changes behaviour.

## Findings
No correctness or security bug blocks this change. Notes:
- **Privacy:**
  - The UI code makes no network call (`fetch`/XHR/beacon/WebSocket grep is empty) and makes no `navigator.storage` call.
  - Note text never reaches the URL, `history.state` or `document.title` (code inspection, plus AC-34 and AC-57).
  - No email address or personal contact detail appears in the diff or in any new source, test or spec file. The owner appears only as "AITechie".
- **Pre-existing:** `ErrorBoundary` calls `console.error(error, componentStack)` (unchanged from `project-foundation`). A render error is very unlikely to carry note text, and AC-56 passes. No action is needed for this slug.
- **Out-of-scope changes in the working tree (housekeeping, must not ride in this slug's PR):**
  - `product/charter.md`, which merges `edit-note` and `delete-note` into `edit-delete-note`. Its approval line reads `- Approved by:  Approved by: AITechie, 2026-10-09`, a duplicated label. The charter's Status and approval are the owner's to write; this reviewer has not verified who wrote them.
  - `factory/runs/*` for other slugs, plus the untracked `specs/` and `factory/runs/` folders for `edit-delete-note`, `pwa-offline`, `search-notes` and `theme-mode`.
  - At ship, commit the list-notes code, tests and artifacts on their own branch, and the charter revision separately.
- **Simplification (optional, not blocking):** `listShown()` on every return gives a new `now`, which re-renders all memoised items. That is by design (R8, AC-12), and AC-51 shows it fits the 1,000 ms budget.
- **Plan sync:** the plan's D7 skip-link classes (`focus:top-2`) and its unchanged-file list no longer match the code (deviations 1 and 2). Agents don't edit approved artifacts. The owner may add a one-line addendum at sign-off.

## Decision
**approve**

Blocking: none.

The owner should acknowledge the following at sign-off. None of it blocks:
- Deviation 1: the `e2e/create-note.spec.ts` AC-10 assertion, revised like the `create-note` AC-39 row but not named in the table.
- Deviation 2: the skip link shows in the page flow, not over the header.
- AC-52 and AC-61 are still to be done by hand.
- Keep the charter and other-slug changes out of the list-notes PR.

## Manual checks (owner)
- AC-52 (VoiceOver: macOS Safari, iOS Safari; keyboard-only: desktop Chrome): _pending_
- AC-61 (live site, desktop Chrome and desktop Safari, steps 1-4): _pending, at ship_

## Sign-off
- Reviewed by: <name>, <date>
