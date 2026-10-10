# Plan: Edit and delete a note

- Status: Approved
- Slug: edit-delete-note
- Spec: [spec.md](./spec.md) (Status: draft, under review. Solo mode: the owner approves the spec and this plan together at one gate.)
- Date: 2026-10-09
- Owner: AITechie

**Revision 2026-10-10** (follows spec Revision 2026-10-10, owner decisions made during the build): the AC-46 dialog contrast rule, a list-notes AC-48 row under "Existing tests that change", and the AC-52 replace-last-character change. The build's adaptations are recorded under "Accepted build notes". The plan goes back to draft for re-approval.

**Revision 2026-10-10b** (syncs the plan with the code approved in review iteration 3, F5): D7's restore rule, Step 4, API contract item 3 (`NavWindow.navigation`), risk R10, and build note 11. No spec behaviour changes. The plan goes back to draft for re-approval.

## Decisions applied (not open questions)
This plan is written against the spec as it stands. Choices that
[product/decisions.md](../../product/decisions.md) (Status: Approved)
covers are applied, citing that file, and are not asked again.

| # | Decision | Basis |
|---|---|---|
| A1 | No new dependency, runtime or dev. React's `createPortal` (in `react-dom`, already a dependency) and platform APIs only. No dialog, focus-trap or router library, and no `@testing-library/user-event`. | §3.2; spec R45 |
| A2 | The dialogs use platform primitives directly (the `inert` attribute, `keydown` on `document`, `history.back()`/`forward()`/`replaceState()`), not a wrapper. | §3.3 |
| A3 | The guards this slug changes are exactly the rows of the spec's "Changes to earlier specs" table. Each is listed by file and test under "Existing tests that change". Nothing else is loosened. | §3.4 |
| A4 | No new colour. "Delete" is a zinc secondary button, the backdrop is `zinc-900/50`, and the safe buttons use `accent`. There is no red. | §2.4; spec R36 |
| A5 | Every failure is shown inline, and the text is kept. A note deleted elsewhere is never recreated. | §2.2, §2.3 |
| A6 | Browser Back can't be blocked, and iOS shows no "Leave site?". Both are recorded as risks, not worked around. | §2.6 |
| A7 | AC-60 and AC-61 are manual. Agents never mark them passed. | §4.1 |
| A8 | Release goes by branch and PR, merged on green CI. The owner appears only as "AITechie". | §4.2, §5.1 |

**Owner questions under §1.2: none.** Nothing here changes the charter,
adds a dependency or a cost, adds a network call, or changes what is
stored. The guard changes are exactly the spec's table. The two product
choices (confirmation without undo, and how editing flows) were decided
by the owner on 2026-10-09. The spec problems found while planning are
recorded under "Spec notes found while planning" (Risks). The spec is not
edited. One of those notes (S1, about AC-23) is worth fixing in the spec
before approval. Its recommended wording is given there.

## Plan decisions for the Tech Lead
These are choices the spec leaves to the plan. Approving the plan
approves them.

| # | Decision | Why |
|---|---|---|
| D1 | **Custom `role="alertdialog"`, not a native `<dialog>`.** The dialog is rendered through `createPortal` into a host `<div>` that `App` renders as a sibling **after** its existing root `<div className="min-h-screen">`. While a dialog is open, that root div gets the `inert` attribute: header, `main`, the skip link, and everything else in the app. | **Probe (scratchpad only, no repo files), jsdom 30.1.2 as installed:** `HTMLDialogElement` exists, but `showModal` and `close` are **not functions**. `:modal` never matches. Elements have no `inert` property, and an `[inert]` subtree can still be focused and clicked. A native `showModal()` dialog therefore can't be exercised by component tests at all (R23 requires that it can be). A custom element works the same in jsdom and in browsers. In Chromium, Safari and Firefox, `inert` makes the background unfocusable, unclickable and absent from the accessibility tree. AC-33 checks that in real Chromium. |
| D2 | **Dialog behaviour lives in one component, `ConfirmDialog`, with no handler props on non-interactive elements.** On mount, focus moves to the safe button (layout effect). A `document` `keydown` listener (effect) does two things. Tab and Shift+Tab call `preventDefault()` and move focus to the other button, or to the safe button if focus is outside the dialog. Escape calls `onSafe()` unless `busy`. The full-viewport backdrop (`fixed inset-0`) covers the page, so a click outside hits the backdrop, which has no handler. A `mousedown` listener on the backdrop, added with `addEventListener` in an effect, calls `preventDefault()`, so a click outside doesn't move focus to `body`. | Tab cycling has to be done by the app. With `inert`, the browser would otherwise Tab out to its own chrome. Listeners attached through `addEventListener` keep `jsx-a11y` recommended satisfied without any rule exception: no `onKeyDown`/`onClick` on a `div` with a role, and no `eslint-disable` (spec Constraints, Lint). Escape and Tab can be tested in jsdom with `fireEvent.keyDown(document.activeElement, …)`. |
| D3 | **Focus return is owned by the caller, not the dialog.** When the caller opens a dialog, it records `document.activeElement`. When the safe choice closes the dialog, the caller focuses the right element in the same handler, after a `flushSync` that unmounts the dialog and removes `inert`. That element is: "Delete" (R26); the recorded element for discard via Cancel or Back link; for discard via a route change, the recorded element if `isConnected` and inside the edit form, else Title (R23). | The right focus target differs per opener, and `flushSync`-then-`focus()` is the pattern `useNoteForm` already uses (create-note D3b). |
| D4 | **Edit mode reuses the create-note field components and pure modules, with its own hook.** `NoteField`, `FormMessages`, `formReducer`/`initialFormState` (seeded with the baseline), `keyboard.ts`, `checkBeforeSave`, `focusTargetFor` and `shortcutHint` are reused unchanged. `SaveRow` gains two optional props (`label`, `savingLabel`, and a `secondary` node rendered between the button and the hint), with defaults that render byte-identical create-note markup. `problemFromRejection(error, copy = CREATE_FAILURE_COPY)` gains an optional copy table: edit passes the "Changes …" copy plus a `notFound` entry. A new `useEditNote` hook (`src/noteEdit/useEditNote.ts`) orchestrates the edit save. It mirrors `useNoteForm`'s 40-line save sequence (`savingRef`, `attemptStarted` in its own `flushSync`, check, `savingStarted`, await, outcome) but calls `update`, adds the no-op check and doesn't reset on success. | R7, R8, R9 and R14 say "exactly as the New note fields". Reusing the components and pure rules guarantees that. `useNoteForm` is not refactored. The create form stays untouched, and its 8 test files keep passing as written. The duplication is one small function, accepted under "Explicitly out of scope". |
| D5 | **The baseline is computed, not read back from the DOM.** `baselineOf(note) = { title: note.title.replace(/[\r\n]/gu, ""), body: note.body.replace(/\r\n?/gu, "\n") }` (in `src/noteEdit/baseline.ts`). These are the HTML value-sanitisation rules for `<input type="text">` and the textarea API value. The reducer starts from the baseline, so field values `===` baseline on entry. | Spec R5 and risk 3. Reading values in an effect would need `setState` in an effect, which the `react-hooks` 7 rules flag. For every note created in the app the functions are the identity, so R5's "`===` the stored strings" holds (AC-5). A title seeded with line breaks still gives a no-op save on no change (unit test plus component test). |
| D6 | **"Unsaved changes" is derived in render:** `dirty = state.title !== baseline.title \|\| state.body !== baseline.body` (R17). `useUnsavedTextWarning(dirty)` is reused as a **second, independent** `beforeunload` listener. | Two listeners give "active when either condition holds" (R21) with no change to create-note code. Undoing typing back to the baseline clears `dirty`. |
| D7 | **Route guarding is added to the list-notes navigation store** (`src/routing/hashNavigation.ts`), additively. `setGuard(guard \| null)` installs a function `(to: Route) => boolean`, and `true` means "hold". On `hashchange`, if a guard is set and `to` differs from the current route: when the guard returns `true`, the snapshot is **not** moved and `held: { route, grew }` is set instead (`grew` = `history.length` is greater than when the current route was entered). When `to` equals the current route while something is held, `held` clears (R20, third bullet: closes as "Keep editing"). A further different route replaces `held.route`. `releaseHeld()` moves the snapshot to `held.route` exactly as an unguarded change would (visit + 1, `returnedFromId` set, so `get` runs and focus returns as list-notes). `restoreHeld()` ("Keep editing") brings the URL back with no `pushState`. **(Revision 2026-10-10b.)** The store records each held change as a move from the note's own entry: -1 (Back), +1 (Forward), or `null` (a new or unknown entry); chained held changes add up, and any `null` makes the sum `null`. A `hashchange` counts as a traversal when the route matches a neighbour entry. When both neighbours match, the tie is settled by the change in `window.navigation.currentEntry.index` (the Navigation API) since the last `hashchange`, when available. Without it, the entry before wins, so a wrong guess restores with `forward()`, which can't leave the app. `restoreHeld()` then calls `history.back()` if `grew` or the move is +1, `history.forward()` if the move is -1, and otherwise `history.replaceState(null, "", "#note/<id>")`. It resets the growth baseline (`history.length`) afterwards. The `hashchange` that results (or none, for `replaceState`) lands on the current route, and the snapshot is unchanged, so there is no `get` and no remount. The snapshot gains `held`. `NavWindow.history` gains `forward` and `length`, and `NavWindow` gains an optional `navigation`. The store keeps its own model of the entries it has seen (routes and current index) from its own transitions. | **Probe (scratchpad, jsdom 30.1.2):** `history.back()` and `forward()` traverse fragment entries and fire `hashchange` asynchronously, with `history.length` unchanged. Assigning `location.hash` pushes an entry (length + 1). `forward()` with no forward entry does nothing. `replaceState` fires no `hashchange`. So "Back then Keep editing" must use `forward()`: `replaceState` would turn the list entry into a note entry, and AC-25's second `goBack()` would then leave the app. A guard that sits in the store keeps the snapshot unchanged, so the note view never remounts (no `get`, R20; changed list-notes R18 row). |
| D8 | **What the guard holds.** `LoadedNote` installs the guard while in edit mode. It returns `true` while `dirty` or while `update` is pending (R12). The guard reads refs updated in a layout effect. If `held` is set while saving, nothing is shown until `update` settles. On success it calls `releaseHeld()` (the list shows with the edited note first and focused, AC-14). On failure it opens the discard dialog for `held.route`. If `held` is set while idle and dirty, it opens the discard dialog. "Discard changes" calls `releaseHeld()`. "Keep editing" (or Escape) calls `restoreHeld()` and returns focus as D3. If `held` clears by itself (the user went back to the note), the dialog closes as "Keep editing". | R12, R20, R23. |
| D9 | **Delete settles at `App` level, so it survives the view unmounting (R31).** `LoadedNote` calls `repository.delete(id)` and reports the result through `onDeleteSettled(id, outcome, visit)`, an `App` callback that is safe to call after the view has unmounted. `outcome` is `"deleted"`, `"already-deleted"` or `"failed"` (with a reason). `App`: for deleted or already-deleted it calls `noteGone(id)` (the existing reducer already removes the id from `loaded`, `loading.savedFirst` and the eventual result: R33). If `visit` is still current, it sets a pending return `{ focus: "heading", status }` and calls `backToList()` (the list-notes R24 rule, R28). Otherwise it only queues the status, and moves neither route nor focus. A failure is reported back to the still-mounted view only (R30). If the view has unmounted, it changes nothing. | Keeps navigation and list state in their single owners. |
| D10 | **"Your notes" status region (R35).** `NotesSection` gains a `status: string \| null` prop and renders `<div role="status" className="text-base text-zinc-900 not-empty:mt-3">` directly below the `<h2>`, before the existing alert region, empty from the first render. `App` holds `notesStatus`. It is set in the list-return effect, **after** the list view shows and focus has moved to the heading (`focus()` scrolls it into view, R28). It is cleared (`null`) when a note route is entered and from a new `NoteForm` prop `onAttempt()`, which runs when a "New note" save attempt starts. A repeated text is cleared first in its own `flushSync` commit (R35). | One owner. The list-return effect already exists in list-notes `App`. Its `focusNote(id) \|\| focusHeading()` lands on the heading after a delete, because the id has just been removed. The pending return also forces `focusHeading()` explicitly, so it can't ever land on a link. |
| D11 | **View message area (R3).** `LoadedNote` renders the action row, then one `role="status"` and one `role="alert"` `div` (same classes as `FormMessages`), mounted for the life of the loaded view, outside the mode switch, so their identity holds across modes (AC-3). Their text is state, cleared on Edit or Delete activation, and set after a mode switch with the same clear-first rule. | R3, R10, R13, R30. |
| D12 | **Saving and busy controls use `aria-disabled`, never `disabled`.** Handlers return early while busy. `BackLink` gains an optional `ariaDisabled` prop. Its click in edit mode goes through `LoadedNote`'s handler. When busy, that handler calls `preventDefault()` and does nothing (R12). | Keeps focus where it is (R12, R27, Accessibility). |
| D13 | **Every `className` is a literal string**, switching elements rather than strings when the style depends on state (list-notes D15). The backdrop is `bg-zinc-900/50` and the dialog box is `max-h-[calc(100dvh-2rem)] overflow-y-auto`. Both pass `theme.test.ts`'s colour scan. UI source never names browser storage (list-notes D16). | `theme.test.ts`, `storage-boundary.test.ts` AC-46. |
| D14 | **Red check for AC-50:** every computed `color`, `background-color` and `border-*-color` of every element in `main` and in the dialog layer is in an allow-list. That list is the project's zinc hexes in `rgb()` form, white, black, `rgba(0, 0, 0, 0)`, `rgb(29, 78, 216)`, and `rgba(24, 24, 27, 0.5)` for the backdrop. **AX check for AC-33:** CDP `Accessibility.getFullAXTree` through `page.context().newCDPSession(page)`. Pass means no node with `ignored: false` whose name is "Back to notes", the note's heading text or "QuickNotes" (the header) while the dialog is open, and at least one of each after it closes. | The spec asks the plan to define these checks. |

## Approach
This slug is UI only. It uses `update` and `delete` from
`src/storage/index.ts` as shipped, and the pinned export list doesn't
change. It builds on the list-notes code: `App`, `useHashNavigation`,
`useNoteList` (whose `noteSaved` and `noteGone` already cover R32 and R33),
`NoteView` with its inner `LoadedNote`, `BackLink` and `NotesSection`.

`NoteView`'s loaded state becomes a small state machine
(`src/noteEdit/noteSession.ts`, a pure reducer). Its states are
`reading { note }`, `editing { note, baseline }`, `confirmDelete { note,
pending }`, `discard { reason: "cancel" | "back" | "route" }` (inside
editing), and `goneAfterEdit`. The reading-mode action row adds "Edit" and
"Delete". The edit form (`EditNoteForm`) reuses the create-note fields,
counters, messages and shortcut. A save first runs the same checks, then
compares against the baseline: no change means no `update`. On success,
the resolved note goes into the list through `noteSaved` (first, no
re-read).

Leaving an edit with changes goes through the discard dialog. Cancel and
"Back to notes" ask directly. Route changes are held by a guard in the
navigation store and restored without new history entries (D7). Delete
opens the same `ConfirmDialog` pattern. A confirmed delete returns to the
list with the list-notes R24 rule, sets "Note deleted." in a new "Your
notes" status region and focuses the heading. Both dialogs are custom,
modal alertdialogs rendered in a portal, with the rest of the app `inert`
(D1, D2). The jsdom probe ruled out `showModal()` for component testing.

## Architecture

### API contract
There's no server API. The contracts are the repository calls the UI
makes, the URL and history behaviour, and the props between components.
Changing any of them during the build means updating this plan first.

**1. UI → repository** (only through `src/storage/index.ts`; R41, R42)

| Call | When | Resolves | Rejects → UI |
|---|---|---|---|
| `list()` | Unchanged: exactly once per page load (list-notes R3). | | |
| `get(id)` | Unchanged: once per note-route entry (`NoteView` mount). Never on Edit, Cancel, save, Keep editing, a dialog, or the "Changes not found" → Cancel path (R15, R41). | | |
| `create(input)` | Unchanged ("New note" form). | | |
| `update(id, { title, body })` | Once per save attempt that passes `checkBeforeSave` and differs from the baseline (R11). Exactly two keys, current DOM values. | `Note` N → reading mode with N, "Changes saved.", `noteSaved(N)` (R13, R32) | `"unavailable"` → `CHANGES_UNAVAILABLE`; `"quota-exceeded"` → `CHANGES_FULL`; `ValidationError` → as create-note R18 (empty → `BOTH_EMPTY`; too-long → field message with `actual`; other → `CHANGES_FAILED`); `"not-found"` → `CHANGES_NOT_FOUND` plus `noteGone(id)` (R15); anything else → `CHANGES_FAILED`. Text kept, focus unchanged (R14). |
| `delete(id)` | Once per "Delete note" activation while not pending (R27). | → `onDeleteSettled(id, "deleted")` (R28) | `NotFoundError` → `"already-deleted"` (R29); `"unavailable"` → `DELETE_UNAVAILABLE`; anything else → `DELETE_FAILED` (R30). |
| `isPersisted` | Never. | | |

Errors are never logged, and their messages are never shown (R16).

**2. URL and history** (R4, R20, R28, R44)
- Edit mode has no URL. Entering and leaving it touches neither `location` nor `history`.
- A guarded route change is held (D7). "Keep editing" uses `back()`, `forward()` or `replaceState(null, …)`. "Discard changes" shows the held route.
- After a delete, `backToList()` runs: `history.back()` if `cameFromList`, else `replaceState(null, "", appUrl)`.
- Never `pushState`. History state is always `null`. `document.title` is never written.

**3. Component and hook contracts**
- `HashNavigation` (additive): `setGuard(guard: ((to: Route) => boolean) | null): void`, `releaseHeld(): void`, `restoreHeld(): void`. `NavSnapshot` gains `held: { route: Route; grew: boolean } | null`. `NavWindow.history` gains `forward` and `length`. **(Revision 2026-10-10b.)** `NavWindow` gains an optional read-only `navigation?: { readonly currentEntry: { readonly index: number } | null }` (the Navigation API, feature-detected; absent in jsdom).
- `Navigation` (hook result) gains the same three methods and `held`.
- `NoteView` props (additive): `onUpdated(note: Note): void`, `onDeleteSettled(id, outcome: DeleteOutcome, visit: number): void`, `visit: number`, plus `nav: Pick<Navigation, "held" | "setGuard" | "releaseHeld" | "restoreHeld">`.
- `NotesSection` props (additive): `status: string | null`. The handle is unchanged.
- `NoteForm` / `useNoteForm` (additive): optional `onAttempt?(): void`, called right after `attemptStarted`.
- `SaveRow` (additive, optional): `label = SAVE_BUTTON`, `savingLabel = SAVE_BUTTON_SAVING`, `secondary?: ReactNode`.
- `BackLink` (additive, optional): `ariaDisabled?: boolean`.
- `problemFromRejection(error, copy?: FailureCopy)`, where `FailureCopy = { unavailable; quota; generic; notFound? }`. The default is the create copy.
- `ConfirmDialog` props: `{ heading: string; description: ReactNode; describedByIds: string[]; safeLabel; otherLabel; otherBusyLabel?; busy: boolean; onSafe(): void; onOther(): void }`. `useDialogHost()` reads the host element and `setModalOpen` from the `ModalLayer` context.
- `DeleteOutcome = { kind: "deleted" } | { kind: "already-deleted" } | { kind: "failed"; reason: "unavailable" | "other" }`.

### Data model
N/A. There is no schema, record, migration or retention change.
`update` and `delete` are used as shipped (`note-storage` R14, R15). UI
state is in memory only (R22):
- `Baseline = { title: string; body: string }` (D5).
- `NoteSession` (pure reducer, `src/noteEdit/noteSession.ts`): `reading`, `editing`, `confirmDelete { pending: boolean }`, `discardOpen { reason, returnFocus }` and `goneAfterEdit`, with actions `edit`, `cancel`, `askDiscard`, `keepEditing`, `discard`, `saved(note)`, `noChange`, `notFound`, `askDelete`, `keepNote`, `deleteStarted` and `deleteFailed`. Every action returns a new object.
- `ListState` is unchanged: R32 is `noteSaved`, and R33 is `noteGone` (already removes from `savedFirst`, `gone` and `loaded`).

### Backend
N/A. QuickNotes has no backend, and the storage layer is unchanged.

### Frontend
**Composition (`src/App.tsx`):**
- The return becomes a fragment: `<ModalLayer>` provides the host and `modalOpen`. It contains the existing `<div className="min-h-screen" inert={modalOpen || undefined}>…</div>`, then `<div data-dialog-host="" />`.
- `NoteView` gets the new props.
- `NotesSection` gets `status={notesStatus}`.
- `NoteForm` gets `onAttempt={clearNotesStatus}`.
- The list-return effect also handles the pending delete return (D9, D10).

**Screens and components (spec "Screens / views")**

| Spec screen / part | Component | Notes |
|---|---|---|
| Note view, reading mode | `NoteView` › `LoadedNote` (`src/components/NoteView.tsx`, extended; split into `src/components/LoadedNote.tsx` if `NoteView.tsx` passes ~250 lines) | Action row `<div className="flex flex-wrap items-center justify-between gap-2">`: `BackLink`, then `<div className="flex gap-2">` with "Edit" and "Delete" (`type="button"`, secondary). Then the view message area (D11), then the existing `<article>`. |
| Secondary button | literal classes | `min-h-11 rounded-md border border-zinc-500 bg-white px-4 font-medium text-zinc-900 hover:bg-zinc-100` |
| Primary button | as "Save note" | `min-h-11 rounded-md bg-accent px-4 font-medium text-white` |
| Note view, edit mode | `src/components/EditNoteForm.tsx` | Action row with `BackLink` only, then the view message area, then `<section aria-labelledby>` with `<h2 className="mt-4 text-lg font-semibold text-zinc-900">Edit note</h2>` and `<form noValidate>`. Inside the form: `NoteField` Title, `NoteField` Note, `SaveRow label="Save changes" secondary={<Cancel/>}`, `FormMessages`. |
| Dialog layer | `src/dialog/ModalLayer.tsx`, `src/components/ConfirmDialog.tsx` | Portal into the host. Backdrop `fixed inset-0 z-20 overflow-y-auto bg-zinc-900/50 px-4 pt-[15vh]`. Box `role="alertdialog" aria-modal="true"`, `mx-auto w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-md border border-zinc-300 bg-white p-6`. `<h2 className="text-lg font-semibold text-zinc-900">`, the paragraphs, then the button row `mt-6 flex flex-wrap gap-2` with the safe (primary) button first. |
| Delete dialog | `src/components/DeleteDialog.tsx` | The title `<p className="mt-2 whitespace-pre-wrap break-words text-base font-medium text-zinc-900">{title}</p>`, or the `text-zinc-600` "Untitled note" element (`isBlank`), then the warning `<p>`. `aria-describedby` = both ids. |
| Discard dialog | `src/components/DiscardDialog.tsx` | One text `<p>`. |
| "Your notes" status line | `NotesSection` | D10. |

**How each spec state renders** (spec States table)

| State | Rendering and focus |
|---|---|
| Reading mode | As above. Focus on the `<h2>` at open (list-notes, unchanged). |
| Edit idle / with changes | The form is seeded from the baseline. `NoteField` shows counters at ≥90% straight away (`counterValue` runs in render). Focus moves to Title via `flushSync` then `focus()` on Edit. |
| Edit saving | `SaveRow saving` → "Saving…" with `aria-disabled`. Cancel and `BackLink` have `aria-disabled`. Fields are `readOnly`. The guard holds route changes. |
| Saved / no-op | `flushSync` to reading mode with N (or the unchanged note). Clear the view status, then set it to `CHANGES_SAVED` or `NO_CHANGES`. Focus the `<h2>`. |
| Both empty / too long / save failed / not found | The form's `FormMessages` and `NoteField` errors, reusing create-note's focus rule (`focusTargetFor`). Storage failures leave focus unchanged. Not found also calls `onGone(id)`. |
| Discard dialog | `DiscardDialog`; "Keep editing" is focused. |
| Discard via Cancel / no-change Cancel | Reading mode, focus on "Edit". |
| Discard via Back / route | `backToList()` or `releaseHeld()`; focus as list-notes R24. |
| Cancel after "Changes not found" | Session `goneAfterEdit` → `NoteView` renders its existing not-found `Problem` and focuses its `<h2>`. No `get`. |
| Delete dialog / deleting | `DeleteDialog`, `busy` → "Deleting…" with `aria-disabled`; "Keep note" has `aria-disabled`; Escape is ignored. |
| Deleted / already deleted | List view. "Your notes" status set; focus on the heading. The empty state if no notes remain. |
| Delete failed | Dialog closed, reading mode, the view alert region set, focus on "Delete". |
| Old address after a delete | list-notes not-found via `get`. |

**Copy** (`src/copy.ts`, literal spec text): `EDIT_BUTTON`,
`DELETE_BUTTON`, `EDIT_HEADING`, `SAVE_CHANGES`, `CANCEL_BUTTON`,
`CHANGES_SAVED`, `NO_CHANGES`, `CHANGES_UNAVAILABLE`, `CHANGES_FULL`,
`CHANGES_FAILED`, `CHANGES_NOT_FOUND`, `DISCARD_HEADING`, `DISCARD_TEXT`,
`KEEP_EDITING`, `DISCARD_CHANGES`, `DELETE_HEADING`, `DELETE_TEXT`,
`KEEP_NOTE`, `DELETE_NOTE`, `DELETING`, `NOTE_DELETED`, `ALREADY_DELETED`,
`DELETE_UNAVAILABLE` and `DELETE_FAILED`. Existing constants are reused
for labels, the hint, counters, both-empty and too-long, and
`SAVE_BUTTON_SAVING` for "Saving…".

## Files / components touched
Names are from the list-notes plan, checked against the list-notes build
under review on 2026-10-09. **The build agent re-checks every name after
list-notes merges** (Risks R1).

New (production):
- `src/noteEdit/baseline.ts`, `src/noteEdit/noteSession.ts`, `src/noteEdit/useEditNote.ts`, `src/noteEdit/deleteOutcome.ts` (maps a rejection to `DeleteOutcome`, never reading `message`)
- `src/dialog/ModalLayer.tsx`
- `src/components/ConfirmDialog.tsx`, `DeleteDialog.tsx`, `DiscardDialog.tsx`, `EditNoteForm.tsx`, `NoteActions.tsx` (the action row), optionally `LoadedNote.tsx`

Changed (production):
- `src/routing/hashNavigation.ts`, `src/routing/useHashNavigation.ts`: guard, `held`, `releaseHeld` and `restoreHeld` (D7)
- `src/components/NoteView.tsx`: loaded state → session, actions, edit form, dialogs, `goneAfterEdit`
- `src/components/NotesSection.tsx`: `status` prop and region (D10)
- `src/components/BackLink.tsx`: `ariaDisabled`
- `src/components/SaveRow.tsx`: optional props (D4)
- `src/noteForm/saveProblems.ts`: optional copy table and `notFound` (D4)
- `src/components/NoteForm.tsx`, `src/noteForm/useNoteForm.ts`: optional `onAttempt` (D10)
- `src/App.tsx`: `ModalLayer`, `inert`, the dialog host, `notesStatus`, `onDeleteSettled`, pending return
- `src/copy.ts`

New (tests and support):
- unit: `src/noteEdit/baseline.test.ts`, `noteSession.test.ts`, `deleteOutcome.test.ts`
- component: `src/components/NoteView.actions.test.tsx`, `EditNote.open.test.tsx`, `EditNote.save.test.tsx`, `EditNote.leave.test.tsx`, `ConfirmDialog.test.tsx`, `DeleteNote.test.tsx`, `EditDelete.list.test.tsx`, `src/App.editPrivacy.test.tsx`
- `src/test/renderEdit.tsx`: `openNote(name)`, `editNote(name)`, `dialog()`, `viewRegions()`, `notesStatus()`, plus `historyBack()` (calls `history.back()` and then `settle()`)
- e2e: `e2e/editDelete.ts` (helpers: `readStoredNote`, `removeStoredNote` from a second page, `faultNoteWrites(page, "hang" | "fail")` that wraps `IDBObjectStore.prototype.delete`/`put` behind a `window` flag, the text-spacing CSS, the colour allow-list from D14, and the CDP AX helper), `e2e/edit-note.spec.ts`, `e2e/delete-note.spec.ts`, `e2e/edit-delete-a11y.spec.ts`, `e2e/edit-delete-layout.spec.ts`, `e2e/edit-delete-performance.spec.ts`, `e2e/edit-delete-privacy.spec.ts`

Changed (tests and support): see "Existing tests that change".

Not touched: `src/storage/**`, `src/notes/**`, `src/test/inMemoryNoteRepository.ts`, `src/noteForm/formState.ts`, `keyboard.ts`, `saveCheck.ts`, `platform.ts`, `useUnsavedTextWarning.ts`, `src/components/NoteField.tsx`, `FormMessages.tsx`, `src/noteList/**` (the reducer already covers R32 and R33), `src/index.css`, `index.html`, `package.json`, `package-lock.json`, `vite.config.ts`, `playwright.config.ts`, `eslint.config.js`, and every tooling test listed as unchanged below.

## Steps
Each step can be reviewed on its own and leaves `npm run ci` green.
**Start only after list-notes is merged into `main`** (Risks R1).

1. **[API] Contracts first.**
   - `src/copy.ts` and `copy.test.ts`: the new constants against the spec's literal text.
   - `saveProblems.ts`: the optional `FailureCopy` (with `saveProblems.test.ts` additions; existing cases unchanged).
   - `SaveRow` optional props, with a test that default rendering is unchanged.
   - `src/noteEdit/deleteOutcome.ts` and `baseline.ts` with unit tests.
   - The new types (`DeleteOutcome`, the `NavSnapshot.held` shape).
2. **[DATA] N/A.** No schema or stored-shape change.
3. **[BE] N/A.** No backend. The storage layer is used as shipped.
4. **[FE] Navigation guard (D7), test first.** Extend `hashNavigation.ts` and its unit tests with the fake window (a `history` stub with `back`/`forward`/`length`). Cover: hold when guarded; clear on returning to the current route; replace on a further route; `releaseHeld` gives visit + 1 and `returnedFromId`; and `restoreHeld` for each branch (`grew` or move +1 → `back`, move -1 → `forward`, unknown → `replaceState(null, …)`), with the fake window's `navigation.currentEntry.index` both present and `undefined` (Revision 2026-10-10b). Existing tests are unchanged.
5. **[FE] Pure session reducer.** `noteSession.ts` with every transition unit-tested (no-op save, `notFound` → `goneAfterEdit` on cancel, delete pending ignores keep/escape).
6. **[FE] Dialog layer.** `ModalLayer`, `ConfirmDialog`, `DeleteDialog`, `DiscardDialog` and `ConfirmDialog.test.tsx` (focus, Tab and Shift+Tab cycle, Escape, busy, `inert` on the app root, no handler props). Run `npm run lint` here to confirm jsx-a11y needs no exception (D2).
7. **[FE] Reading-mode actions and the delete flow.** `NoteActions`, view regions (D11), `NotesSection` status (D10), `App` `onDeleteSettled` and pending return, `NoteForm onAttempt`. The list-notes tests change exactly as listed below (AC-27, AC-17, AC-43 rows) in the same commit.
8. **[FE] Edit mode.** `useEditNote`, `EditNoteForm`, the guard wiring (D8), `BackLink ariaDisabled`, and the `AC-53` rewrite of `App.storageUse.test.tsx` in the same commit.
9. **[TEST] E2e.** `e2e/editDelete.ts`, then the six new spec files. Every storing test uses the `page` fixture or a context it creates and closes in `finally` (R47).
10. **[TEST] Gate.**
    - Run `npm run ci` with Node 24.18.0 first on `PATH`.
    - Confirm `git diff main -- src/storage src/notes tests/tooling/storage-boundary.test.ts tests/tooling/licences.test.ts tests/tooling/e2e-isolation.test.ts package.json package-lock.json eslint.config.js` is empty (AC-54, AC-55, AC-59).
    - Record AC-60 in `review.md`. AC-61 is done at ship by the owner.

## Test strategy
Layers: **unit-FE** = Vitest pure functions. **component** = Vitest + RTL
in jsdom, `<App repository={…} />` with the in-memory double (A then B as
in the spec) or a spy or stub, routes set via `renderAt`. Activation is
`fireEvent.click` then `settle()`. "Back button" is modelled with
`history.back()` then `settle()` (see S1). **e2e** = Playwright, Chromium,
production build, `gotoApp`, per-test `page` fixture or a closed own
context. **tooling** = `tests/tooling/`. **manual** = review or ship.

| Acceptance criterion | Layer | Test |
|---|---|---|
| AC-1 | component | `NoteView.actions.test.tsx` › "reading mode has one link and exactly Edit and Delete, in order, before the article; Tab order link → Edit → Delete (AC-1)" |
| AC-2 | component | `NoteView.actions.test.tsx` › "no Edit or Delete while loading, not found or open failed, or in the list; list items keep one link and no button (AC-2)" |
| AC-3 | component | `NoteView.actions.test.tsx` › "the view has one empty status and one empty alert region that are the same nodes in edit mode (AC-3)" |
| AC-4 | component | `EditNote.open.test.tsx` › "Edit opens the form in place: same hash and history.length, no repository call, fields prefilled, Title focused, no article (AC-4)" |
| AC-5 | component + unit-FE | `EditNote.open.test.tsx` › "fields equal the stored strings exactly (AC-5)"; `baseline.test.ts` › "baselineOf is the identity for in-app notes; strips title line breaks and normalises CRLF (AC-5, spec risk 3)" |
| AC-6 | component | `EditNote.open.test.tsx` › "no maxlength or required, noValidate, unique ids, labels control the edit fields (AC-6)" |
| AC-7 | component | `EditNote.open.test.tsx` › "counters show straight away at 90% and stay outside live regions; no message while typing (AC-7)" |
| AC-8 | component | `EditNote.save.test.tsx` › "Ctrl/Cmd+Enter saves from either field, not while composing; Enter in Title moves to Note; keyshortcuts and platform hint (AC-8)" |
| AC-9 | component | `EditNote.save.test.tsx` › "both empty shows the message, focuses Title, calls nothing and never deletes (AC-9)" |
| AC-10 | component | `EditNote.save.test.tsx` › "too-long title and note: messages, aria-invalid, describedby, focus; removed on edit (AC-10)" |
| AC-11 | component | `EditNote.save.test.tsx` › "no-op save (including typed and undone) calls no update, says No changes to save., keeps list order (AC-11)" |
| AC-12 | component | `EditNote.save.test.tsx` › "a changed save calls update once with exactly two keys, shows Changes saved., and moves the note first without list or get (AC-12)" |
| AC-13 | component | `EditNote.save.test.tsx` › "while saving: Saving…, aria-disabled not disabled, read-only fields, repeat triggers and Cancel/Back ignored (AC-13)" |
| AC-14 | component + unit-FE | `EditNote.leave.test.tsx` › "a route change during a save waits; success shows the list with A first and focused; failure opens the discard dialog (AC-14)"; `hashNavigation.test.ts` › "guard holds a route and releaseHeld commits it (D7)" |
| AC-15 | component | `EditNote.save.test.tsx` › "update failures show the matching Changes copy, keep text and focus, never show the rejection text (AC-15)" |
| AC-16 | component + unit-FE | `EditNote.save.test.tsx` › "ValidationError issues map like create-note R18 (AC-16)"; `saveProblems.test.ts` › "edit copy table maps not-found and generic (AC-16)" |
| AC-17 | component | `EditNote.save.test.tsx` › "a retry clears the alert first, then shows the outcome (AC-17)" |
| AC-18 | component + unit-FE | `EditNote.save.test.tsx` › "NotFoundError: Changes not found, no create, note removed from list; Cancel → discard → Note not found without get (AC-18)"; `noteSession.test.ts` › "notFound then discard → goneAfterEdit" |
| AC-19 | e2e | `e2e/edit-note.spec.ts` › "edit and save with Ctrl+Enter: Changes saved., first in the list, record keeps id and createdAt with a later updatedAt, survives reload (AC-19)" |
| AC-20 | e2e | `e2e/edit-note.spec.ts` › "a no-op save writes nothing and keeps the order after reload (AC-20)" |
| AC-21 | component | `EditNote.leave.test.tsx` › "Cancel: no change returns to reading mode; with changes asks; Keep editing keeps text; Discard restores the note (AC-21)" |
| AC-22 | component | `EditNote.leave.test.tsx` › "Back to notes with changes asks without navigating; Discard shows the list with A focused; no changes goes straight back (AC-22)" |
| AC-23 | component + unit-FE | `EditNote.leave.test.tsx` › "Back-button route change with changes holds the edit; Keep editing restores the note URL without new history or get; Discard shows the list (AC-23)" (the route change is `history.back()`; S1); `hashNavigation.test.ts` › "restoreHeld branches (D7)" |
| AC-24 | component | `EditNote.leave.test.tsx` › "returning to the note while the dialog is open closes it; another route becomes the destination (AC-24)" |
| AC-25 | e2e | `e2e/edit-note.spec.ts` › "browser Back with changes asks; Keep editing restores the URL with the same history.length; Discard then Forward shows the original (AC-25)" |
| AC-26 | component | `EditNote.leave.test.tsx` › "beforeunload is prevented only while the edit or the New note form has unsaved text (AC-26)" |
| AC-27 | e2e | `e2e/edit-note.spec.ts` › "closing with changes raises beforeunload (AC-27)" and "reloading with changes reopens the note read-only (AC-27)" |
| AC-28 | e2e | `e2e/edit-delete-privacy.spec.ts` › "edit text never reaches the URL, title, history.state or web storage (AC-28)" |
| AC-29 | component | `ConfirmDialog.test.tsx` › "Delete opens a modal alertdialog with name, description, Keep note focused, no delete and no window dialogs (AC-29)" |
| AC-30 | component | `ConfirmDialog.test.tsx` › "Escape and Keep note close the delete dialog, focus Delete, delete nothing (AC-30)" |
| AC-31 | component | `ConfirmDialog.test.tsx` › "delete dialog title line: Untitled note for blank, exact spaces, full 200 characters (AC-31)" |
| AC-32 | component | `ConfirmDialog.test.tsx` › "discard dialog role, name, description, button order and Escape (AC-32)"; plus "Tab and Shift+Tab cycle between the two buttons; the app root is inert while open (R23)" |
| AC-33 | e2e | `e2e/edit-delete-a11y.spec.ts` › "dialogs trap Tab, ignore outside clicks and hide the page from the accessibility tree (AC-33)" (CDP check, D14) |
| AC-34 | component | `DeleteNote.test.tsx` › "confirmed delete calls delete once, shows the list without A, focuses Your notes, says Note deleted., no extra list or get (AC-34)" |
| AC-35 | component | `DeleteNote.test.tsx` › "while deleting: Deleting…, aria-disabled, Escape and repeat clicks ignored (AC-35)" |
| AC-36 | component | `DeleteNote.test.tsx` › "deleting the last note shows No notes yet with the status and heading focus (AC-36)" |
| AC-37 | e2e | `e2e/delete-note.spec.ts` › "delete after opening from the list goes back without adding history; Forward shows Note not found (AC-37)" and "delete after loading at the note URL replaces the entry; reload shows only B (AC-37)" |
| AC-38 | component | `DeleteNote.test.tsx` › "Your notes has one status and one alert region from the first render; status only after a delete, cleared on open and New note save attempt, repeated via empty (AC-38)" |
| AC-39 | component | `DeleteNote.test.tsx` › "NotFoundError on delete returns to the list with the Already deleted copy (AC-39)" |
| AC-40 | component | `DeleteNote.test.tsx` › "delete failures close the dialog, keep the note, show the copy, focus Delete, leave the list (AC-40)" |
| AC-41 | component | `DeleteNote.test.tsx` › "a route change closes an idle delete dialog; a pending delete completes without moving focus (AC-41)" |
| AC-42 | e2e | `e2e/delete-note.spec.ts` › "two tabs: deleting an already deleted note says so; saving an edit of it shows Changes not found and recreates nothing (AC-42)" |
| AC-43 | component | `EditDelete.list.test.tsx` › "edits and deletes made while list() is pending are merged into its result (AC-43)" |
| AC-44 | component | `EditDelete.list.test.tsx` › "with the list failed, edit and delete leave the failure shown and still set Note deleted. (AC-44)" |
| AC-45 | component | `EditDelete.list.test.tsx` › "editing and deleting leave the hidden New note form untouched (AC-45)" |
| AC-46 | e2e | `e2e/edit-delete-a11y.spec.ts` › "<state>: no WCAG 2.1 A/AA axe violations, contrast evaluated (AC-46)", once for each of the 12 states. Delete failed and deleting use `faultNoteWrites`; save failed uses `removeStoredNote` from a second page. **Revision 2026-10-10:** for the three dialog states only (discard, delete, deleting), a `color-contrast` `incomplete` result is accepted when every incomplete node is inside the dialog. Each dialog text element (heading, paragraphs, button labels) is then checked explicitly against the dialog box's opaque background: at least 4.5:1 for normal text, and at least 3:1 for large text and for the focus outline. Every other state keeps "contrast not incomplete and passes on at least 3 nodes". The backdrop stays. |
| AC-47 | e2e | `e2e/edit-delete-layout.spec.ts` › "no overflow, buttons inside the viewport and 44px tall, dialogs inside, column centred at WxH (AC-47)" × 4 viewports |
| AC-48 | e2e | `e2e/edit-delete-layout.spec.ts` › "reflow at 320px and 200% text, dialogs scroll to their buttons (AC-48)" |
| AC-49 | e2e | `e2e/edit-delete-layout.spec.ts` › "WCAG 1.4.12 text spacing at 360px clips nothing (AC-49)" |
| AC-50 | e2e + tooling | `e2e/edit-delete-layout.spec.ts` › "no animations, accent focus outline on every new button, no red anywhere (AC-50)" (D14 allow-list); `tests/tooling/theme.test.ts` (unchanged) |
| AC-51 | e2e | `e2e/edit-delete-a11y.spec.ts` › "keyboard only: open, edit, save, delete (AC-51)" |
| AC-52 | e2e | `e2e/edit-delete-performance.spec.ts` › "100,000-character edit and save, and delete with 1,000 notes, each under 1,000 ms with no long task over 300 ms (AC-52)". **Revision 2026-10-10:** the edit step replaces the last character of the 100,000-character body (select the last character, type "x") instead of appending one, so the save stays within the limit and calls `update`. |
| AC-53 | component | `src/App.storageUse.test.tsx` › "the UI calls list once, get per open, update only for a real change, delete only when confirmed, never isPersisted (edit-delete-note AC-53; revises list-notes AC-53)" |
| AC-54 | tooling | `tests/tooling/storage-boundary.test.ts` (unchanged) |
| AC-55 | tooling | `tests/tooling/package-contract.test.ts` › "runtime dependencies are exactly react and react-dom" and `licences.test.ts` (both unchanged) |
| AC-56 | component | `App.editPrivacy.test.tsx` › "no console call or shown message contains note text across every update and delete failure (AC-56)" |
| AC-57 | e2e | `e2e/edit-delete-privacy.spec.ts` › "delete and edit send no request; delete calls no persistence API; edits call each at most once; nothing written elsewhere (AC-57)" |
| AC-58 | component | `App.editPrivacy.test.tsx` › "no pushState, confirm, alert or prompt; every replaceState passes null, across the edit and delete flows (AC-58)" |
| AC-59 | tooling | `tests/tooling/e2e-isolation.test.ts` (unchanged) and `tests/tooling/e2e-contexts.test.ts` (unchanged) |
| AC-60 | manual | `specs/edit-delete-note/review.md`: VoiceOver on macOS and iOS Safari, plus a keyboard-only pass in Chrome. Agents never mark it passed. |
| AC-61 | manual | At ship on the live URL, Chrome and Safari, steps 1-4. Recorded by the owner. Agents never mark it passed. |

### Existing tests that change
Only the rows of the spec's "Changes to earlier specs" table. Every
assertion that still applies is kept. The names are from the list-notes
build under review. The build agent re-checks them after the merge.

| Spec table row | File › test | Exact change |
|---|---|---|
| list-notes R19 / AC-27 | `src/components/NoteView.open.test.tsx` › "the view has no control other than Back to notes (AC-27)" | **Revised as edit-delete-note AC-1.** Kept: exactly one link, no textbox, no `[contenteditable]`. Changed: the button count goes from 0 to exactly two, "Edit" then "Delete". Renamed "…(list-notes AC-27, revised by edit-delete-note AC-1)". The loading, not-found and failed checks (if any assert no button) stay as they are, because they remain true. |
| list-notes R19 (other view tests) | `NoteView.open.test.tsx` › "opening a note … shows the read-only view with the heading focused (AC-24)" | Only if it asserts zero buttons in the loaded view: that one assertion becomes "no textbox". Everything else is unchanged. The build agent greps for `queryByRole("button")`/`getAllByRole("button")` in `NoteView.*.test.tsx`. |
| list-notes R29, AC-17 | `src/components/NotesSection.load.test.tsx` › "Your notes has exactly one empty alert region from the first render; the form keeps its two regions (AC-17)" | Kept: exactly one empty `role="alert"` in Your notes, and the form's two regions. Changed: any assertion that Your notes has exactly one live region (`[role=status], [role=alert], [aria-live]`, lines ~58 and ~241) becomes one alert **plus** one empty `role="status"`. Renamed "…(revised by edit-delete-note AC-38)". |
| list-notes R29, AC-43 | `NotesSection.load.test.tsx` › "no live region in Your notes gets text except on a load failure (AC-43)" | Kept for the alert region and any `aria-live`. The status region is excluded from "gets no text" and is covered by edit-delete-note AC-38, which also asserts it stays empty through loading, loaded, empty and a form save. Renamed likewise. |
| list-notes R36 / AC-53; create-note R27 / AC-37 | `src/App.storageUse.test.tsx` › "the UI calls list once, create per save, get per open, and never update, delete or isPersisted (AC-53)" | **Rewritten as edit-delete-note AC-53.** Kept: `list` once, `get` once per open, `create` per save, `isPersisted` 0. Changed: `update` is exactly 1 and `delete` exactly 1 over the spec's AC-53 flow. The list-notes open and back steps are kept at the start. |
| create-note AC-37 (as revised by list-notes) | `src/components/NoteForm.save.test.tsx` › "…(create-note AC-37, revised by list-notes AC-53)" | **Unchanged.** `update` and `delete` stay 0 there because it opens no edit. |
| support | `src/test/repositoryDoubles.ts` › `createStubRepository` | Additive: options `update?` and `delete?`. The defaults still reject if called. |
| support | `src/test/renderNotes.tsx` | Unchanged. The new helpers go in `src/test/renderEdit.tsx`. |
| additive | `src/routing/hashNavigation.test.ts`, `src/noteForm/saveProblems.test.ts`, `src/copy.test.ts` | New cases only. Existing cases are unchanged (the fake window gains `forward` and `length`). |
| create-note R25, list-notes R26 | `NoteForm.unload.test.tsx`, `NoteView.back.test.tsx` (AC-38), `e2e/open-note.spec.ts` (AC-39), `e2e/create-note.spec.ts` (AC-35/36) | **Unchanged.** They open no edit. |
| list-notes R39 / AC-57 | `e2e/notes-privacy.spec.ts` (AC-57) | **Unchanged.** It only opens notes. |
| list-notes AC-48 (spec Revision 2026-10-10 row) | `e2e/notes-layout.spec.ts` › the AC-48 test's Shift+Tab step from the note heading | **Revised.** Instead of one Shift+Tab reaching "Back to notes", Shift+Tab is pressed repeatedly from the heading, and focus is asserted on "Delete", then "Edit", then "Back to notes". The outline and unclipped checks on each are kept, and the test is renamed "…(revised by edit-delete-note)". Everything else in the test is unchanged. |

These must pass byte-for-byte unchanged: `tests/tooling/storage-boundary.test.ts`,
`e2e-isolation.test.ts`, `e2e-contexts.test.ts`, `licences.test.ts`,
`package-contract.test.ts`, `theme.test.ts`, `privacy.test.ts`,
`plain-text.test.ts`, `eslint-config.test.ts`; every `NoteForm.*.test.tsx`;
`src/noteList/**` tests; and every existing `e2e/*.spec.ts`.

## Accepted build notes (Revision 2026-10-10)
These are the build's adaptations of the plan, accepted as plan notes. They change no spec behaviour.
1. **`LoadedNote.tsx`:** the loaded view is split into its own file (the optional split the Frontend table allowed).
2. **`NavSnapshot.held` is optional** (`held?: …`), so list-notes snapshots and tests that build snapshots compile unchanged.
3. **`inert` is set by `ConfirmDialog` in a layout effect** on the app root (and removed on unmount), instead of by `App` through `ModalLayer` state. The behaviour of D1 is the same.
4. **`onSafe` receives the previously focused element**, recorded by `ConfirmDialog` on open, so callers apply D3's focus return with it.
5. **`backToList` is in `NoteView`'s `nav` prop**, alongside `held`, `setGuard`, `releaseHeld` and `restoreHeld`.
6. **A `deleteSettled` action** in the session reducer handles the delete outcome inside the view (D9's split of App and view is unchanged).
7. **The "Your notes" status is stored per list visit** (keyed by the navigation `visit`). It shows only on the list visit it was set for and clears on the next note entry (R35, D10).
8. **Test doubles:** `createStubRepository` gains `update` and `delete` options, and tests use `vi.spyOn` on the in-memory double where a spy over real behaviour is needed (AC-34, AC-53).
9. **D14 allow-list:** an `oklab(…)` entry is added for the backdrop's computed `zinc-900` at 50% opacity, as Chromium reports it, matched to the same colour and alpha.
10. **Layout:** the action row and button rows use `flex-wrap`, so at 320px with 200% text the buttons wrap below the link (spec Screens).
11. **(Revision 2026-10-10b, review F5.) `restoreHeld` branches on the recorded move, not on neighbour routes.** `hashNavigation.ts` records each held change's move (-1, +1, or `null`, summed across chained held changes), settles a both-neighbours tie with `navigation.currentEntry.index` when the Navigation API is present, and falls back to `forward()` without it (D7, contract item 3, R10). `hashNavigation.test.ts` gains 10 tests under "Keep editing always puts the note URL back (review F5)": 7 Keep-editing sequences (typed URL, Back and Forward in combination), "with a later entry", "held Forward, then Back to the note by itself", and "without the Navigation API, Back → Keep editing still restores with forward()".

## Risks & rollback
| # | Risk | Detection | Mitigation |
|---|---|---|---|
| R1 | **Build order and naming.** list-notes is in review, not merged. Its file, prop and test names may still change. | Build agent check. | **Start the build only after list-notes merges into `main`.** Re-check every name in "Files" and "Existing tests that change" against `main` first. If list-notes' merged spec changed, re-check this spec too (spec risk 10). |
| R2 | **`history.forward()`/`back()` restore lands on the wrong entry** (for example after a reload with older same-document entries, D7's "unknown" branch). | AC-23 and AC-25; AC-61 step 2. | The unknown case falls back to `replaceState(null, …)`: the URL is right and the length unchanged, but the entry is overwritten. Chromium's 50-entry history cap makes `grew` read false at the cap, which goes to the same fallback. |
| R3 | **`inert` focus quirks.** The focused element sits inside the subtree that becomes inert when a dialog opens. | AC-33, AC-51. | The dialog's layout effect moves focus to the safe button in the same commit. Focus return runs after the `flushSync` that removes `inert` (D3). |
| R4 | **jsdom doesn't enforce `inert`**, so component tests can't prove outside elements are unfocusable or unclickable. | — | Component tests assert the `inert` attribute on the app root and the Tab cycle. Real enforcement is AC-33 (Chromium) and AC-60 (Safari, VoiceOver). |
| R5 | **jsx-a11y or react-hooks 7 flags the dialog or hook code.** | `npm run lint` in step 6. | D2 avoids handler props on role elements. If a rule still objects, restructure. Any exception must be the narrowest one, commented and named in this plan before merging (spec Constraints, Lint). |
| R6 | **`faultNoteWrites` doesn't reach the storage layer's write path.** | AC-46 delete-failed and deleting states don't appear. | Wrap the IndexedDB prototype method the shipped `transactions.ts` uses (checked at build time). The helper lives in e2e only. |
| R7 | **Performance budgets flake on CI** (AC-52). | CI. | One commit per mode switch, no per-keystroke work beyond `counterValue`. Budgets change only through a spec revision. |
| R8 | **"Changes saved." read after the heading** (spec risk 4); first-update persistence prompt (spec risk 6); iOS has no Leave site (spec risk 2). | AC-60. | Accepted by the spec. |
| R9 | **Duplicated save orchestration** in `useEditNote` and `useNoteForm` drifts. | Review. | The pure parts are shared. A later refactor can merge them once both are shipped (out of scope). |
| R10 | **(Revision 2026-10-10b.) No Navigation API** outside project-foundation R31's range (Firefox before 147, Safari before 26.2). In the typed-URL-then-Forward "Keep editing" case, the tie falls back to `forward()`, which does nothing, so the URL stays on the list route while the edit form shows. It can't leave the app or lose text. | AC-60, AC-61. | Accepted. The owner confirms the API is present in the current Safari and Firefox during AC-60/AC-61. |

**Spec notes found while planning** (recorded, the spec is not edited;
the owner may fix them before approving):
- **S1 (recommend fixing the spec wording). AC-23's `history.length` check can't pass with a hash assignment.** The probe confirms that setting `location.hash` pushes an entry (jsdom and browsers alike), so after "Keep editing" `history.length` is already greater than recorded, whatever the app does. The plan's test models the Back button with `history.back()`, which is what AC-23 describes ("opened from the list", Keep editing restores without new history). Recommended spec edit: in AC-23, "when `history.back()` is called and `hashchange` fires". AC-14, AC-24 and AC-41 keep using hash assignment, because they check no length.
- **S2. R20 "MUST NOT be greater than before" for an edited URL.** Typing a URL adds an entry before the app hears of it. "Keep editing" goes `back()` to the note, but the length stays one more. This is the platform limit of §2.6 and is covered by the browser-Back risk.
- **S3. The R28 status text is set "once the list view is showing".** With `cameFromList`, `history.back()` is asynchronous, so the status and focus are applied in the list-return effect (D10). This matches the spec. It is noted so the build doesn't set the text before the list shows.
- **S4. R31 "a route change while delete is pending, to another note".** R35 sets the status only on the list view. The plan queues it until the list next shows.

**Rollback:** revert the merge commit. No stored data changes shape.
Notes edited or deleted stay as they are, and the list-notes app reads
them normally.

## Explicitly out of scope
- **A shared save hook for the create and edit forms** (R9). Duplication is accepted to leave `useNoteForm` untouched.
- **A native `<dialog>`/`showModal()`** (D1, jsdom has no support), and any focus-trap library.
- **Recovering the exact history entry in D7's unknown branch**; the `replaceState` fallback is accepted.
- Undo, trash, bulk delete, Edit or Delete in list rows, an edit URL, autosave or drafts, conflict detection, an Escape-to-cancel shortcut for edits, "save as new" (spec non-goals).
- Any change to `src/storage/**`, `src/notes/**`, the export list, `@theme` tokens, `eslint.config.js`, `index.html`, `vite.config.ts`, `playwright.config.ts` or `package.json`.
- Editing this spec or any other slug's artifacts. Cross-references in list-notes and create-note are the owner's housekeeping (spec risk 11).
- Automated Firefox and WebKit runs.

## Approval
<!-- Filled in by a human (Tech Lead) only. -->
- Previous revision (2026-10-09): Approved by: AITechie, 2026-10-09
- Previous revision (2026-10-10): Approved by: AITechie, 2026-10-09
- Approved by:  AITechie, 2026-10-10
