# Spec: Edit and delete a note

- Status: Approved
- Slug: edit-delete-note
- Intent: [intent.md](./intent.md)
- Jira: none
- Owner: AITechie
- Reviewers: AITechie (Product Owner, Tech Lead)
- Date: 2026-10-09

<!-- Status values: draft -> approved -> superseded.
     Do not move to "approved" without a human sign-off in the Approval
     section below. A spec with open questions cannot be approved. -->

**Revision 2026-10-10** (owner decisions after build, AITechie): (1) AC-46 accepts an axe `incomplete` `color-contrast` result for dialog text over the dimmed backdrop only, with an explicit contrast assertion against the dialog's opaque background; the backdrop stays. (2) A "Changes to earlier specs" row revises `list-notes` AC-48 (Shift+Tab path now passes Delete and Edit). (3) R46 and AC-52 replace the last character of a 100,000-character body instead of typing one more, so the save stays within the limit.

## Summary
The read-only note view from `list-notes` (`#note/<id>`) gains two
buttons next to "Back to notes": **Edit** and **Delete**. Edit turns the
same view into an edit form in place, with no new URL: the same Title and
Note fields, counters, validation and shortcut as the "New note" form,
prefilled with the note exactly as saved, plus "Save changes" and
"Cancel". A save that changes something calls `update`, shows the saved
note, says "Changes saved." and moves the note to the top of the list. A
save that changes nothing writes nothing. Leaving an edit with unsaved
changes (Cancel, "Back to notes", the browser's Back button) asks first in
an in-page dialog; reload and close get the browser's "Leave site?"
warning. Delete asks "Delete this note?" in the same in-page dialog
pattern, with focus on "Keep note". A confirmed delete removes the note
for good, returns to the list, announces "Note deleted." and focuses the
"Your notes" heading. Every failure is reported plainly, typed text is
never lost, and a note deleted in another tab is never recreated.

This spec builds on the approved `list-notes` spec (not built yet) and
**deliberately changes** some of its items and some `create-note` items.
See "Changes to earlier specs".

## Changes to earlier specs
Once this spec is approved, the items below take precedence over the
items they name. This slug does not edit those slugs' own artifacts
(`spec.md`, `plan.md`, `review.md`). Only code and tests change (per
product/decisions.md §3.4). References in earlier specs to `edit-note`
and `delete-note` mean this slug (charter Revision 2026-10-09).

| Earlier item | What it says today | Replaced by (this spec) |
|---|---|---|
| `list-notes` R19, last paragraph ("The view is read-only: no textbox, `contenteditable`, button or control other than the 'Back to notes' link") | The loaded note view has only the "Back to notes" link | In reading mode, the loaded note view has the "Back to notes" link and exactly two buttons, "Edit" and "Delete" (R1, R2). Reading mode still has no textbox or `contenteditable`. Edit mode is R4-R16. The loading, not-found and open-failure states are unchanged (no buttons). |
| `list-notes` AC-27 | `main` has no button and exactly one link | AC-1 here: in reading mode, exactly the buttons "Edit" and "Delete", exactly one link, no textbox, no `contenteditable`. |
| `list-notes` R18 and Decisions applied item 5 ("Opening a note always reads that note with `get(id)`", on any change of route to a note route) | `get(id)` on every entry to a note route | Unchanged, with one exception: when "Keep editing" restores the URL of the note being edited after a route change (R20), the app MUST NOT call `get` again or reset the edit. Entering, saving and leaving edit mode call no `get` either. |
| `list-notes` R24 (Back to notes / browser Back show the list view) | Always shows the list view | Unchanged when no edit has unsaved changes. With unsaved changes, "Back to notes" and any route change first show the discard dialog (R19, R20). After a successful delete, the same navigation rule is used to return to the list, but focus goes to the "Your notes" heading (R28). |
| `list-notes` R29 and AC-17, AC-43 (the "Your notes" section has exactly one live region, an alert used only for a load failure; no live region announces anything else) | One alert region; nothing else is announced in the section | The section also has one status region (`role="status"`), present and empty from the first render, used only for "Note deleted." and the "Already deleted" copy (R35). The alert region is unchanged. AC-38 here replaces `list-notes` AC-17 and AC-43 for the status region; their alert-region checks stay. |
| `list-notes` R36 and AC-53 (UI calls only `create`, `list`, `get`; never `update`, `delete` or `isPersisted`) | No `update` or `delete` | The UI calls only `create`, `list`, `get`, `update` and `delete`. `update` only from a save that changes something (R11); `delete` only from a confirmed delete (R27). Never `isPersisted`. `list` still once per page load (R41). AC-53 here replaces `list-notes` AC-53. |
| `create-note` R27 and AC-37 (already replaced by `list-notes` R36 and AC-53) | Only `create` | As the row above. |
| `list-notes` R14 (refresh after a save) | Only `create` changes the list in memory | Extended, not loosened: `update` and `delete` also change the list in memory, without a `list()` call (R32, R33). The `create` rules are unchanged. |
| `create-note` R25 and the `list-notes` R26 "Leave site?" rule | The `beforeunload` handler is active only while a "New note" field has text | Also active while an edit has unsaved changes (R21). `create-note` AC-35 and AC-36 and `list-notes` AC-38 and AC-39 keep passing as written (they open no edit). |
| `list-notes` R39 (last sentence) and AC-57 ("Nothing in this slug may call `persisted()` or `persist()`") | No persistence calls | Unchanged for loading, opening, editing without saving, and deleting. A save that calls `update` may make the repository call `persisted()` and, if needed, `persist()`, at most once per launch (`note-storage` R30). The UI itself still never calls them (R43). `list-notes` AC-57 passes as written (it opens notes only). |
| `list-notes` Non-goals ("Editing a note (`edit-note`)", "Deleting a note, undo or a trash (`delete-note`), including cleaning up the A8 test notes") | Out of scope | Editing and deleting are this slug. Undo and a trash stay out of scope (Non-goals here). |
| `list-notes` Non-goals ("a modal") | No modal | Still true for the note view itself. The two confirmation dialogs here (R23-R25) are modal, as the owner's in-page confirmation step (intent, Owner decisions item 1). |
| `list-notes` AC-48 (`e2e/notes-layout.spec.ts`: Shift+Tab from the note heading reaches "Back to notes") | One Shift+Tab from the heading reaches "Back to notes" | Shift+Tab from the heading, repeated, reaches "Delete", then "Edit", then "Back to notes", because R1 places Edit and Delete in that path (Revision 2026-10-10). |

These are **not** changed and keep passing as they are:
- the storage boundary: `create-note` R29-R31 and AC-43 to AC-46, `list-notes` R37 and AC-54, `note-storage` AC-51 and AC-53 (UI imports only `src/storage/index.ts`; its export list is pinned and stays exactly as shipped);
- `list-notes` R3 (one `list()` per page load), R20-R23, R25 (no note text in the URL, `document.title` or `history.state`; no `history.pushState`), R26 and R27 (the hidden "New note" form keeps its state);
- every `create-note` requirement for the "New note" form itself, including its copy;
- every `note-storage` requirement. This slug uses `update` and `delete` as shipped.

## Decisions applied
Settled by the intent's Owner decisions (AITechie, 2026-10-09), or
accepted as proposed per product/decisions.md §1.1 because they fit every
standing decision. None of them is an open question.

1. **Delete is confirmed in an in-page dialog, with no undo** (Owner decisions item 1). Focus starts on "Keep note". No `window.confirm()`.
2. **Edit and Delete live only on the opened note view**, next to "Back to notes"; editing is in place, with no URL and no history entry; "Leave site?" on reload or close; Cancel, "Back to notes" and browser Back ask before discarding unsaved changes in the same dialog pattern; after a delete, back to the list, "Note deleted." announced, focus on "Your notes" (Owner decisions item 2).
3. **The dialogs are modal** (`role="alertdialog"`, `aria-modal="true"`, the rest of the page inert). A modal is the standard accessible pattern for "confirm before something permanent", and it keeps the safe choice focused with nothing else reachable. Accepted as proposed per §1.1 and §2.5.
4. **Explicit save, no autosave, no drafts of edits** (§2.1). Edit text is in memory only (R22).
5. **Errors inline, on save, text kept** (§2.2). The "New note" form's rules, copy and focus behaviour are reused where the meaning is the same; new copy only where it differs (R14, Copy table).
6. **No silent fallbacks** (§2.3). Every failed `update` or `delete` is reported. A note deleted elsewhere is never recreated.
7. **A save that changes nothing writes nothing** (§1.1; `note-storage` open question 5): no `update`, no reorder, and the user is told "No changes to save." (R10).
8. **No red** (§2.4). Delete, the dialogs and errors use the zinc greys and the one accent. Danger is carried by wording, structure and focus on the safe choice.
9. **Accessibility first** (§2.5): focus and announcements are defined for every outcome (States table).
10. **Platform limits accepted** (§2.6): the browser's Back button can't be blocked by a page and iOS Safari shows no "Leave site?" warning. These are recorded as risks, not worked around.
11. **Guards revised deliberately** (§3.4), in the table above. The storage boundary stays exactly as it is.
12. **Storage behaviour as shipped** (§1.1): an edit's first `update` in a launch may trigger the browser's persistent-storage request (`note-storage` R30); a delete never does (R31). No new copy (§2.7).
13. **No new dependencies** (§3.2). React and the platform only.
14. **Manual real-browser and VoiceOver checks** (§4.1) are listed as ship checks and never marked passed by agents.
15. **Release by branch and PR, merge on green CI** (§4.2); the owner appears only as "AITechie" (§5.1).

## User stories
- US-1: As the user (AITechie), I want to edit an opened note's title and body, starting from exactly what I saved, so that I can fix typos and keep notes current.
- US-2: As the user, I want to save my changes with a button or Cmd/Ctrl+Enter, be told they were saved, see the note as saved and find it at the top of my list, so that I trust the edit took.
- US-3: As the user, I want a save with nothing changed to leave the note and its place in the list alone, so that the list order stays meaningful.
- US-4: As the user, I want editing to follow the same limits, counters and messages as creating, so that there is one set of rules to learn.
- US-5: As the user, I want my edited text never to be lost: kept on screen when a save fails or the note was deleted elsewhere, and never thrown away by Cancel, "Back to notes", Back, reload or close without a warning, so that editing is safe.
- US-6: As the user, I want to delete the note I opened only after confirming, with focus on the safe choice, so that a single slip can't remove a note for good.
- US-7: As the user, I want a deleted note to disappear from my list straight away, with a clear "Note deleted." and the list ready to use, so that tidying up is quick.
- US-8: As the user, I want honest messages when a delete fails or the note was already deleted elsewhere, so that I'm never misled about what's stored.
- US-9: As a keyboard or screen-reader user, I want editing, deleting and both dialogs to meet WCAG 2.1 AA from 360px to desktop, with focus and announcements at every step, so that they work for me as well as anyone.
- US-10: As the user, I want editing and deleting to send nothing over the network and store nothing outside my notes, so that the charter's privacy promise holds.
- US-11: As the user with long notes and many notes, I want editing and deleting to respond quickly, so that the app stays fast.
- US-12: As the developer, I want every earlier guard this slug changes to be revised on purpose and named, with the storage boundary untouched, so that the test suite stays trustworthy.

## Requirements
Terms: **reading mode** is the loaded note view from `list-notes` R19,
with this slug's actions. **Edit mode** is the same view showing the edit
form. **The note** is the note the view is showing: the result of the
`get` that opened it, or of the last successful `update` since. **The
app URL** is the app's own URL without a hash (`/quicknotes/` in
production).

### Reading mode actions
- R1: In reading mode, the view MUST show, in this DOM and Tab order: the "Back to notes" link, a button "Edit", a button "Delete" (both `type="button"`, in the same row as the link), the view's message area (R3), then the `<article>` (`list-notes` R19). The buttons MUST NOT appear in the view's loading, not-found or open-failure states, in the list view, or in list rows (list items keep exactly one link and no button).
- R2: Reading mode MUST contain exactly one link ("Back to notes"), exactly two buttons ("Edit", "Delete"), and no textbox or `contenteditable`.
- R3: **View message area.** The loaded note view MUST contain one status region (`role="status"`) and one alert region (`role="alert"`), below the action row, both present and empty from when the loaded state first renders and kept mounted in both modes. The status region is used only for "Changes saved." and "No changes to save." (R10, R13); the alert region only for delete failures (R30). Their text MUST be cleared when Edit or Delete is activated, or when the view is left. To show the same text twice in a row, the region is cleared first, so it is announced again.

### Edit mode
- R4: Activating "Edit" MUST switch the view to edit mode without changing `location.hash`, adding a history entry or calling any repository method. Edit mode shows, in this order: the "Back to notes" link (in the action row, with no Edit or Delete button), the view message area (empty), and a `<section>` labelled by a visible `<h2>` "Edit note" holding one `<form>` with, in DOM and Tab order: a single-line input labelled "Title", a `<textarea>` labelled "Note", a `<button type="submit">` "Save changes", a `<button type="button">` "Cancel", the shortcut hint, and the form's message area (one `role="status"` and one `role="alert"`, present and empty from when the form renders). The `<article>` is not rendered in edit mode. Every `id` in the document MUST be unique, and each label MUST be associated with its edit field (not with the hidden "New note" field of the same name).
- R5: On entering edit mode, Title's value MUST be `===` the note's title and Note's value `===` its body. The app MUST NOT trim, normalise or otherwise change them. The **baseline** of an edit is the two values the fields hold right after they are filled.
- R6: On entering edit mode, focus MUST move to the Title field.
- R7: The edit fields MUST behave exactly as the "New note" fields do in `create-note`: R4 (no `maxlength` or `required`, `noValidate`), R5 (text passed on unchanged), R6 (plain Enter in Title moves to Note), R14 (messages only on a save attempt, never while typing), R16 and R17 (too-long messages below the field, `aria-invalid`, `aria-describedby`, removed when the field is edited), and R19 (a counter from 90% of the limit, "{count} of {limit} characters", not a live region). A counter MUST show as soon as edit mode opens if the prefilled text is at or over 90% of its limit.
- R8: A save attempt MUST start when the user activates "Save changes" (click, tap, or Enter/Space on the focused button), or presses Ctrl+Enter or Cmd+Enter in either edit field, except during an IME composition (`isComposing`), as `create-note` R7. The button MUST have `aria-keyshortcuts="Control+Enter Meta+Enter"` and the platform hint ("Press Cmd+Enter to save." on Apple platforms, "Press Ctrl+Enter to save." elsewhere) as its accessible description, as `create-note` R35. There is no autosave.
- R9: A save attempt MUST first clear every message in the form, then check the values as `create-note` R8 (using `countCharacters`, `TITLE_MAX_CHARS` and `BODY_MAX_CHARS`). Both fields empty → the both-empty message in the form's alert region, focus to Title (`create-note` R15). Too long → `create-note` R16. If any check fails, no repository method is called. Emptying both fields never deletes the note.
- R10: **No-op save.** If the checks pass and both fields are `===` the baseline, the app MUST NOT call `update`. It MUST return to reading mode showing the note unchanged, set "No changes to save." in the view's status region, move focus to the view's `<h2>`, and leave the list unchanged.
- R11: Otherwise the app MUST call `update(id, { title, body })` exactly once, on the repository from `getNoteRepository()`, with the note's id and exactly those two keys holding the fields' current values.
- R12: **Saving state.** While `update` is pending:
  - "Save changes" reads "Saving…" with `aria-disabled="true"` (not `disabled`), and "Cancel" and the "Back to notes" link have `aria-disabled="true"`;
  - both fields are `readOnly`;
  - further save attempts, Cancel and "Back to notes" activations are ignored (the link's default navigation is prevented);
  - a route change (for example the browser's Back button) MUST NOT be acted on until `update` settles. Then, on success, the route change is shown as normal (nothing is unsaved); on failure, the discard dialog is shown for it (R20).
- R13: **Save success.** When `update` resolves with note N, the app MUST: switch to reading mode showing N (title, "Updated …" per `list-notes` R8, body); set "Changes saved." in the view's status region; move focus to the view's `<h2>`; and update the list (R32). It MUST NOT call `get` or `list`.
- R14: **Save failure.** When `update` rejects, the form MUST show one message in its alert region, chosen as follows:
  - `kind` `"unavailable"` → the "Changes unavailable" copy;
  - `kind` `"quota-exceeded"` → the "Changes full" copy;
  - `kind` `"validation"` → mapped as `create-note` R18 (empty → the both-empty message; title/body too-long → that field's message using the issue's `actual`; any other issue → the "Changes failed" copy);
  - `kind` `"not-found"` → the "Changes not found" copy (R15);
  - anything else, including a value that isn't a `NoteStorageError` → the "Changes failed" copy.

  Both fields MUST keep their exact text and become editable again, "Save changes", "Cancel" and "Back to notes" lose `aria-disabled`, focus stays where it was when the save started, and the message stays until the next save attempt (which clears it first, R9). The view stays in edit mode with the same baseline.
- R15: **Note deleted elsewhere.** After a save rejects with `NotFoundError`, the app MUST NOT call `create` or anything else to recreate the note, and MUST remove the note from the list in memory (as `list-notes` R21). From then on in this edit: Cancel, after the discard dialog if there are unsaved changes, MUST show the `list-notes` not-found state ("Note not found", focus on its `<h2>`) without calling `get`; "Back to notes" behaves as R19. A further save attempt calls `update` again as normal.
- R16: Messages MUST NOT contain note text, and the UI MUST NOT write note text to the console (`create-note` R24).

### Leaving an edit
- R17: An edit has **unsaved changes** when either field's value is not `===` its baseline. Typing and then undoing back to the baseline leaves no unsaved changes.
- R18: **Cancel.** With no unsaved changes, Cancel MUST return to reading mode showing the note as it was, with focus on "Edit", and call no repository method. With unsaved changes, it MUST open the discard dialog (R25). "Keep editing" closes it with nothing changed; "Discard changes" returns to reading mode showing the note as it was, with focus on "Edit".
- R19: **"Back to notes" in edit mode.** With no unsaved changes, it MUST behave exactly as `list-notes` R24. With unsaved changes, it MUST NOT navigate; it MUST open the discard dialog. "Discard changes" then behaves exactly as `list-notes` R24 (focus on the note's link if it is in the list, else the "Your notes" `<h2>`); "Keep editing" closes the dialog with nothing changed.
- R20: **Route changes in edit mode** (any `hashchange` away from the note route, such as the browser's Back or Forward button, or an edited URL). With no unsaved changes, the new route MUST be shown as normal (`list-notes` R18, R24). With unsaved changes, the app MUST keep showing the edit form with its text and open the discard dialog instead of showing the new route. Then:
  - "Discard changes" → the new route is shown as normal (for the list view: focus on the note's link if it's in the list, else the "Your notes" `<h2>`);
  - "Keep editing" → `location.hash` MUST again be `#note/<id>` of the note being edited, `history.length` MUST NOT be greater than before the route change, the app MUST NOT call `history.pushState` or `get`, and the fields, baseline and form messages are unchanged;
  - a further route change while the dialog is open: if it returns to the note being edited, the dialog closes as "Keep editing"; otherwise it becomes the destination for "Discard changes". Only one dialog is ever open.
- R21: **Reload and close.** While an edit has unsaved changes, the app MUST have an active `beforeunload` handler that calls `preventDefault()` (and sets `returnValue`), so the browser shows its own "Leave site?" warning. This is in addition to `create-note` R25: the handler is active when either condition holds and inactive when neither does (for example right after a successful save, a no-op save or a discard). If the user leaves anyway, the page reopens at the same `#note/<id>` in reading mode, with the stored note.
- R22: Edit text MUST be held in memory only: never in IndexedDB (other than through `update`), `localStorage`, `sessionStorage`, cookies, Cache Storage, the URL, `history.state` or `document.title`. Entering and leaving edit mode MUST NOT change `document.title` ("QuickNotes").

### Confirmation dialogs
- R23: **Dialog pattern** (shared by R24 and R25). Each dialog MUST:
  - be built in the page (never `window.confirm`, `alert` or `prompt`), with `role="alertdialog"`, `aria-modal="true"`, labelled by its visible `<h2>` and described by its body text (`aria-labelledby`, `aria-describedby`);
  - on opening, move focus to its safe button;
  - while open, make everything outside it inert: not focusable, not clickable and hidden from assistive technology. Tab and Shift+Tab MUST cycle between the dialog's two buttons only. Clicking or tapping outside the dialog MUST do nothing;
  - treat Escape as the safe choice;
  - when closed by the safe choice, return focus to the element that had focus just before it opened (for a route change, that element if it is still in the form, else the Title field);
  - show its two buttons in this DOM and visual order: the safe button (accent background) first, the other button (secondary style) second.

  At most one dialog is open at a time. The mechanism (for example a native `<dialog>` with `showModal()`, or a custom element with `inert`) is the plan's choice, as long as the component tests can check this behaviour.
- R24: **Delete dialog.** `<h2>` "Delete this note?"; then the note's title as its own paragraph, exactly as stored (`textContent` `===` the title, spaces preserved, long words wrapped), or "Untitled note" in `zinc-600` when the title is blank (`list-notes` R6); then the text "It will be removed from this device for good. This can't be undone."; then the buttons "Keep note" (safe) and "Delete note". Its description is the title paragraph followed by the text.
- R25: **Discard dialog.** `<h2>` "Discard your changes?"; the text "Your changes to this note haven't been saved. Discarding them can't be undone."; the buttons "Keep editing" (safe) and "Discard changes".

### Deleting
- R26: Activating "Delete" MUST open the delete dialog and call no repository method. "Keep note" or Escape closes it, with focus back on "Delete", nothing deleted and no repository call.
- R27: Activating "Delete note" MUST call `delete(id)` exactly once with the note's id. While it is pending, "Delete note" reads "Deleting…" with `aria-disabled="true"` (not `disabled`), "Keep note" has `aria-disabled="true"`, further activations and Escape are ignored, and the dialog stays open.
- R28: **Delete success.** When `delete` resolves, the app MUST: close the dialog; remove the note from the list (R33); return to the list view using the `list-notes` R24 rule (`history.back()` when the route shown immediately before this note route, in this page load, was the list view; otherwise `history.replaceState(null, "", <the app URL>)`); set "Note deleted." in the "Your notes" status region (R35); and move focus to the "Your notes" `<h2>` and scroll it into view (not to a note link). If it was the last note, the list shows the `list-notes` empty state. Reaching the old `#note/<id>` again (Forward, history or reload) MUST show the `list-notes` not-found state through `get` (never stale text).
- R29: **Already deleted.** When `delete` rejects with `NotFoundError`, the app MUST do exactly as R28, except that the status text is the "Already deleted" copy.
- R30: **Delete failure.** When `delete` rejects with anything else, the app MUST close the dialog, stay in reading mode with the note unchanged, set one message in the view's alert region ("Delete unavailable" copy for `kind` `"unavailable"`, "Delete failed" copy for anything else, including values that aren't a `NoteStorageError`), and move focus to "Delete". The list is unchanged.
- R31: **Route changes around a delete.** A route change while the delete dialog is open and no delete is pending MUST close the dialog as "Keep note" (nothing deleted) and show the new route as normal. A route change while `delete` is pending MUST NOT cancel it: the new route is shown as normal, and when `delete` settles, R33 and R35 still apply (success or not-found: the note is removed and the status text is set), but the app MUST NOT navigate or move focus because of it. A failure in that case changes nothing.

### List stays true
- R32: **After an update.** When `update` resolves with note N, without a `list()` call:
  - list loaded → the item with N's id is removed and N is inserted as the first item (so N appears exactly once, first);
  - list empty → impossible in practice; if it happens, the list shows N;
  - list still loading → when `list()` resolves, the result is shown with any item with N's id replaced by N and moved first, or N added first if absent;
  - list failed → nothing changes (`list-notes` R13).
- R33: **After a delete** (R28, R29, R31), and after a `NotFoundError` from `update` (R15), the item with that id MUST be removed from the list without a `list()` call; if the list is still loading, it is dropped from the result when `list()` resolves; if the list failed, nothing changes. With no items left, the empty state shows.
- R34: Editing, saving, cancelling and deleting MUST NOT change the hidden "New note" form's values, counters, messages or saving state (`list-notes` R26).
- R35: **"Your notes" status region.** The "Your notes" section MUST contain one status region (`role="status"`), present and empty from the first render (alongside its alert region, `list-notes` R29), placed below the `<h2>`. It is used only for "Note deleted." and the "Already deleted" copy. Its text MUST be set only once the list view is showing, and cleared when a note is next opened or a save attempt starts in the "New note" form. To repeat the same text, it is cleared first.

### Look, layout and accessibility
- R36: Everything in this slug MUST follow `list-notes` R30: system font, zinc greys, white surfaces, the one `accent` (`blue-700`), no new colour token, no red, no animations or transitions. Every control MUST show the global 2px accent `:focus-visible` outline, unclipped. Button styles:
  - **primary** ("Save changes", "Keep note", "Keep editing"): as "Save note" (accent background, white text, medium weight, rounded, `px-4`);
  - **secondary** ("Edit", "Delete", "Cancel", "Delete note", "Discard changes"): white background, 1px `zinc-500` border, `zinc-900` text, medium weight, rounded, `px-4`, hover `bg-zinc-100`;
  - `aria-disabled` buttons look the same (text changes say what is happening).
- R37: Every button in this slug MUST be at least 44px tall.
- R38: Reading mode, edit mode and both dialogs MUST meet `project-foundation` R28 and R29 (360px to 1920px with no horizontal scroll; reflow at 320px, at 200% text and with WCAG 1.4.12 text spacing), including a 200-character unbroken title in the delete dialog and a 100,000-character body in the edit field. A dialog taller than the viewport MUST scroll inside itself so both buttons can be reached.
- R39: Every state in the States table MUST meet WCAG 2.1 AA, with zero axe violations for the `wcag2a`, `wcag2aa`, `wcag21a` and `wcag21aa` tags.
- R40: Everything MUST work by keyboard alone, with the Tab orders in the Accessibility section and no keyboard trap other than the dialogs' intended focus cycle.

### Storage use, performance, privacy and guards
- R41: The UI MUST call only the repository's `create`, `list`, `get`, `update` and `delete`, and never `isPersisted`. `update` is called only by R11 and `delete` only by R27. `list()` is still called exactly once per page load (`list-notes` R3); nothing in this slug re-reads the list. Entering or leaving edit mode, a no-op save, a successful `update`, "Keep editing" and opening or closing a dialog MUST NOT call `get`.
- R42: The storage boundary MUST stay exactly as `create-note` R29-R31 and `list-notes` R37 set it.
- R43: Editing and deleting MUST make no network request, and MUST write nothing except through `update` and `delete` on the `quicknotes` `notes` store: no `localStorage`, `sessionStorage`, cookie or Cache Storage entry. UI code MUST NOT call `navigator.storage.persisted()` or `persist()`. The repository may call them during the first `update` of a launch (`note-storage` R30), never for a `delete` (R31).
- R44: The app MUST NOT call `history.pushState`. Any `history.replaceState` call passes `null` as its state. Note text MUST NOT appear in the URL, `document.title` or `history.state` (`list-notes` R25).
- R45: This slug MUST NOT add a runtime dependency (`dependencies` stays exactly `react` and `react-dom`). A dev-only dependency MAY be added if the plan justifies it, under `project-foundation` R5 with the exception list unchanged.
- R46: Measured in headless Chromium against the production build:
  - with a note whose body has 100,000 characters open, activating "Edit" MUST show both fields filled, with focus in Title, within 1,000 ms; after Note's last character is replaced by a different one (Note stays at 100,000 characters), "Save changes" MUST show reading mode with focus on its `<h2>` within 1,000 ms;
  - with 1,000 stored notes, after "Delete note" is activated, the list view MUST show with focus on "Your notes" within 1,000 ms;
  - no long task (`longtask`) over 300 ms in any of those steps.
- R47: Every new e2e test that stores or seeds notes MUST run in its own browser context (`create-note` R28, `list-notes` R43). Two-tab tests use two pages in one context the test creates and closes.
- R48: Before ship, the real-browser and assistive-technology checks (AC-60, AC-61) MUST be done by hand and recorded. Agents never mark them passed (§4.1).

## User experience

### Flows
- **US-1 / US-2 (edit and save):**
  1. From the list, the user opens a note. The view shows "← Back to notes", then "Edit" and "Delete", then the note.
  2. The user activates "Edit". In the same place, with the same URL, the view shows the "Edit note" form: Title and Note filled with the note exactly as saved, "Save changes", "Cancel" and the shortcut hint. The cursor is in Title.
  3. The user changes the text and clicks "Save changes" or presses Cmd/Ctrl+Enter.
  4. For a moment the button reads "Saving…" and the fields can't be edited.
  5. The view shows the saved note, read-only, "Updated just now", with "Changes saved." below the buttons (announced). Focus is on the note's title heading.
  6. "Back to notes": the note is now first in the list, with focus on its entry.
- **US-3 (nothing changed):** the user opens Edit and saves without changing anything (or changes something and changes it back). Nothing is written. The view goes back to reading mode with "No changes to save.", and the note keeps its place in the list.
- **US-4 (rules):** counters appear at 180 title / 90,000 note characters (immediately, if the note is already that long). On save: both fields empty → "Add a title or some text first."; too long → the field's message. Nothing is saved, and the text stays.
- **US-5 (save fails):** the matching message appears below the buttons and is announced; the text stays; focus stays put; the user can try again.
- **US-5 (note deleted elsewhere):** saving says "Your changes weren't saved because this note has been deleted, maybe in another tab. Your text is still here, so you can copy it." The note is gone from the list. The user can copy the text, then Cancel (to "Note not found") or go "Back to notes".
- **US-5 (leaving an edit):**
  1. No unsaved changes: Cancel goes back to reading mode; "Back to notes" and browser Back go to the list. No question.
  2. Unsaved changes, Cancel / "Back to notes" / browser Back: the "Discard your changes?" dialog appears, focus on "Keep editing". Keep editing (or Escape) returns to the form with the text, and the URL is the note's again. "Discard changes" carries on: Cancel → reading mode; "Back to notes" / Back → the list.
  3. Unsaved changes, reload or close: the browser's "Leave site?" warning. Leaving anyway reopens the note read-only.
- **US-6 / US-7 (delete):**
  1. In reading mode, the user activates "Delete".
  2. The "Delete this note?" dialog shows the note's title, "It will be removed from this device for good. This can't be undone.", and "Keep note" (focused) and "Delete note".
  3. "Keep note" or Escape: the dialog closes, focus is back on "Delete", nothing changed.
  4. "Delete note": it reads "Deleting…" for a moment. Then the list shows without the note, "Note deleted." shows below "Your notes" and is announced, and focus is on the "Your notes" heading. With no notes left: "No notes yet".
  5. Browser Forward or a reload at the old address shows "Note not found".
- **US-8 (delete fails):** the dialog closes, the note is still shown, the failure message appears below the buttons and is announced, focus is on "Delete". If another tab had already deleted it: back to the list with "That note had already been deleted, maybe in another tab."

### Screens / views
No wireframe; layout from top to bottom. Header, `<main>` column
(`max-w-3xl`, centred, `px-4` / `sm:px-6`) and the list view are as in
`list-notes`, except the "Your notes" status line.

- **Note view, reading mode** (`#note/<id>`, loaded):
  - **Action row** (`pt-6`): "← Back to notes" link on the left; "Edit" and "Delete" secondary buttons on the right, `gap-2`. When the row is too narrow (for example at 320px with 200% text) the buttons wrap below the link, left-aligned. Nothing scrolls sideways.
  - **View message area** directly below the row: "Changes saved." / "No changes to save." (`text-base`, `zinc-900`) or a delete failure message (`text-base`, `zinc-900`, no red). Takes no space when empty.
  - **Article** as in `list-notes`.
- **Note view, edit mode** (same URL):
  - Action row with only "← Back to notes".
  - View message area (empty).
  - `<section>` with `<h2>` "Edit note" (`zinc-900`, semibold, `text-lg`, `mt-4`), then the form, styled exactly as the "New note" form: Title label and input, its error and counter; Note label and 12-row textarea (vertically resizable, scrolls inside), its error and counter.
  - **Save row:** "Save changes" (primary), "Cancel" (secondary), then the hint ("Press Cmd+Enter to save." / "Press Ctrl+Enter to save.", `text-sm`, `zinc-600`). At 360px the hint wraps below the buttons.
  - **Form message area** below the Save row (status and alert regions), as in `create-note`.
  - Bottom padding `pb-12`.
- **Delete dialog / discard dialog:** the page behind is dimmed with `zinc-900` at 50% opacity and inert. The dialog is a white box with a 1px `zinc-300` border, rounded, `p-6`, `max-w-md` wide (and at most the viewport width minus 32px), centred horizontally, near the upper third of the viewport, scrolling inside itself if taller than the viewport minus 32px. Contents: `<h2>` (`text-lg`, semibold, `zinc-900`); for delete, the title paragraph (`text-base`, medium, `zinc-900`, `whitespace-pre-wrap`, `break-words`; "Untitled note" in `zinc-600`); the text (`text-base`, `zinc-900`); a button row (`mt-6`, `gap-2`, wrapping): safe button (primary) then the other (secondary).
- **List view after a delete:** "Your notes" `<h2>`, then the status line "Note deleted." (`text-base`, `zinc-900`) below it, then the list or the empty state.
- **Desktop (640px and up):** one column, capped at 48rem; dialogs centred, 28rem wide.
- **360px phone:** the same column; dialogs fill the width minus 16px each side; button rows wrap if needed.

### States
| View / state | What the user sees | Announcement | Focus |
|---|---|---|---|
| Reading mode | Back link, "Edit", "Delete", the note | heading read on focus (on open, `list-notes` R23) | the `<h2>` (on open) |
| Edit mode, idle | "Edit note" form filled with the note; counters if at or over 90% | label read on focus | Title |
| Edit mode, with changes | Typed text; counters; no errors | none | wherever the user is |
| Edit: saving | "Saving…" (`aria-disabled`); Cancel and Back link `aria-disabled`; fields read-only | none | unchanged |
| Edit: saved | Reading mode with N; "Changes saved." | status (polite): "Changes saved." | the `<h2>` |
| Edit: no-op save | Reading mode unchanged; "No changes to save." | status (polite): "No changes to save." | the `<h2>` |
| Edit: both empty | "Add a title or some text first." below the buttons | alert | Title |
| Edit: too long | Message under each over-limit field; `aria-invalid` | none (read via `aria-describedby` on focus) | first invalid field |
| Edit: save failed (unavailable / full / other) | Matching message below the buttons; text kept | alert | unchanged |
| Edit: note deleted elsewhere | "Changes not found" message; text kept; note gone from the list | alert | unchanged |
| Discard dialog | "Discard your changes?", "Keep editing", "Discard changes"; page dimmed | dialog name and description read on focus | "Keep editing" |
| Discard: keep editing | Edit form as before; URL is the note's | none | the element focused before (else Title) |
| Discard: from Cancel | Reading mode, note unchanged | none | "Edit" |
| Discard: from Back link / route change | List view (or the new route) | none (`list-notes` R24) | the note's link, else "Your notes" `<h2>` |
| Cancel, no changes | Reading mode, note unchanged | none | "Edit" |
| Delete dialog | "Delete this note?", title, warning, "Keep note", "Delete note"; page dimmed | dialog name and description read on focus | "Keep note" |
| Delete: kept | Reading mode | none | "Delete" |
| Delete: deleting | "Deleting…" (`aria-disabled`); "Keep note" `aria-disabled` | none | unchanged |
| Delete: deleted | List view without the note (or "No notes yet"); "Note deleted." | status (polite): "Note deleted." | "Your notes" `<h2>` |
| Delete: already deleted | List view without the note; "Already deleted" copy | status (polite) | "Your notes" `<h2>` |
| Delete: failed | Reading mode, note unchanged; failure message below the buttons | alert | "Delete" |
| Old address after a delete | `list-notes` "Note not found" | heading read on focus | its `<h2>` |
| Edit then reload / close with changes | Browser "Leave site?" warning; then reading mode | n/a | the `<h2>` |

The "New note" form, the list and the other note view states are
unchanged (`create-note`, `list-notes` States tables).

### Copy & validation
Tone (from `project-foundation`): plain and friendly, sentence case, no
jargon, no exclamation marks. `{n}` uses en-US thousands separators.

| Location | Exact text |
|---|---|
| Reading mode button | Edit |
| Reading mode button | Delete |
| Edit section heading (`<h2>`) | Edit note |
| Title label / Note label | Title / Note (as `create-note`) |
| Save button, idle | Save changes |
| Save button, saving | Saving… |
| Cancel button | Cancel |
| Shortcut hint | Press Cmd+Enter to save. / Press Ctrl+Enter to save. (as `create-note`) |
| Counter | {n} of 200 characters / {n} of 100,000 characters (as `create-note`) |
| Both empty | Add a title or some text first. (as `create-note`) |
| Title too long | The title is too long. It has {n} characters and the limit is 200. (as `create-note`) |
| Note too long | The note is too long. It has {n} characters and the limit is 100,000. (as `create-note`) |
| Changes saved | Changes saved. |
| No-op save | No changes to save. |
| Changes unavailable | Your changes weren't saved. This browser isn't letting QuickNotes store notes right now, which can happen in private browsing. Your text is still here. |
| Changes full | Your changes weren't saved because there's no storage space left for QuickNotes on this device. Free up some space, then try again. Your text is still here. |
| Changes failed | Your changes weren't saved because something went wrong. Your text is still here, so you can try again. |
| Changes not found | Your changes weren't saved because this note has been deleted, maybe in another tab. Your text is still here, so you can copy it. |
| Discard dialog heading | Discard your changes? |
| Discard dialog text | Your changes to this note haven't been saved. Discarding them can't be undone. |
| Discard dialog buttons | Keep editing / Discard changes |
| Delete dialog heading | Delete this note? |
| Delete dialog title line | the note's title exactly as stored, or "Untitled note" |
| Delete dialog text | It will be removed from this device for good. This can't be undone. |
| Delete dialog buttons | Keep note / Delete note |
| Delete button, deleting | Deleting… |
| Note deleted | Note deleted. |
| Already deleted | That note had already been deleted, maybe in another tab. |
| Delete unavailable | The note wasn't deleted. This browser isn't letting QuickNotes change its storage right now, which can happen in private browsing. The note is still here. |
| Delete failed | The note wasn't deleted because something went wrong. It's still here, so you can try again. |

All `create-note`, `list-notes` and `project-foundation` copy is
unchanged. `document.title` stays "QuickNotes".

Field rules (from `note-storage`, as in `create-note`): title at most 200
characters, note at most 100,000, counted in Unicode code points
(`countCharacters`); not both empty (whitespace counts); text saved
exactly as in the fields; checked only on save; the counter is the only
live feedback. A save that equals the baseline writes nothing (R10).

### Accessibility
Target: WCAG 2.1 AA (charter).
- **Structure, reading mode:** `banner`, then `main` with the action row (link, two buttons), the message area and the `<article>` labelled by its `<h2>`.
- **Structure, edit mode:** `main` with the "Back to notes" link, the message area and a `<section>` labelled by `<h2>` "Edit note" holding the form. The hidden "New note" form stays hidden from assistive technology (`list-notes` R17); the edit fields' labels point only to the edit fields.
- **Dialogs:** `role="alertdialog"`, `aria-modal="true"`, named by the `<h2>`, described by the body text (for delete: the title, then the warning). The page behind is inert. Focus starts on the safe button and cycles between the two buttons. Escape = the safe choice.
- **Keyboard / Tab order:** reading mode: "Back to notes" → "Edit" → "Delete". Edit mode: "Back to notes" → Title → Note → "Save changes" → "Cancel". Dialogs: safe button ↔ other button. Enter in Title moves to Note; Ctrl/Cmd+Enter saves from either field (an addition, never the only way). Browser Back works (with the discard question when needed).
- **Focus:** as the States table. Every outcome either moves focus to something that names it (a heading, a field, a dialog button) or announces it through a live region, or both.
- **Live regions:** the view's status and alert regions (R3), the edit form's status and alert regions (R4), and the "Your notes" status region (R35), all present and empty before any message, so messages are announced. Counters are never live.
- **Buttons while busy:** `aria-disabled`, never `disabled`, so focus isn't lost.
- **Invalid fields:** `aria-invalid="true"` plus a text message; the field border becomes 2px `zinc-900` (as `create-note`).
- **Contrast:** as `create-note` and `list-notes`; secondary buttons are `zinc-900` on white (and on `zinc-100` when hovered), with a `zinc-500` border (about 4.8:1, passing 3:1 for 1.4.11). Dialog content sits on white; the dimmed backdrop carries no text.
- **Zoom and reflow:** R38.
- **Motion:** none; dialogs appear and disappear without transitions.
- **Manual pass:** VoiceOver on macOS Safari and iOS Safari, plus a keyboard-only pass in desktop Chrome (AC-60).

## Acceptance criteria
Test layers, as in `list-notes`: **component** = Vitest + React Testing
Library in jsdom (`npm test`), with a repository supplied by the test (the
in-memory double, or a stub whose methods resolve, reject with an error
class from `src/storage/index.ts`, or stay pending), the route set through
`location.hash`, and the time set with `vi.setSystemTime` where it
matters. **e2e** = Playwright against the production build under
`/quicknotes/`, loaded with `gotoApp` from `e2e/app.ts`, each test in its
own context (R47). **Seeded** means notes written straight into the
`quicknotes` `notes` store before a reload. **tooling** = Vitest under
`tests/tooling/`. **manual** = recorded in `review.md` or at ship.

"Opened A" means: the list loaded, A's link activated, and A's view in
reading mode with focus on its heading. "Edit A" means opened A and then
"Edit" activated. "Changed" means at least one character typed into a
field. Unless an AC says otherwise, the repository is the in-memory double
holding notes A (`"Shopping"` / `"Milk\n\n  Eggs\tx"`, older) and B
(newer).

### Reading mode actions
- AC-1 (US-1, US-6, R1, R2; revised `list-notes` AC-27): Component: given opened A, then `main` contains exactly one link ("Back to notes"), exactly two buttons, named "Edit" and "Delete", in the DOM order link, "Edit", "Delete", all before the `article`; no textbox and no `[contenteditable]`. Tab from "Back to notes" focuses "Edit", then "Delete".
- AC-2 (US-1, US-6, R1): Component: given A's view with `get` pending, with `get` rejecting with `NotFoundError`, and with `get` rejecting with `StorageUnavailableError`, then in each no button named "Edit" or "Delete" exists. In the list view, no button named "Edit" or "Delete" exists, and every list item contains exactly one link and no button.
- AC-3 (US-9, R3): Component: given opened A, then the view (outside any form) contains exactly one `role="status"` and one `role="alert"` element, both empty. After "Edit", both are still the same DOM nodes (same element identity) and empty.

### Editing
- AC-4 (US-1, R4, R5, R6): Component: given opened A, with `location.hash` and `history.length` recorded and the spy counts recorded, when "Edit" is clicked, then `location.hash` and `history.length` are unchanged, no repository method was called, a level-2 heading "Edit note" is shown, `getByRole('textbox', { name: 'Title' })` is an `<input>` with value `===` `"Shopping"` and has focus, `getByRole('textbox', { name: 'Note' })` is a `<textarea>` with value `===` `"Milk\n\n  Eggs\tx"`, there is a `type="submit"` button "Save changes" and a `type="button"` button "Cancel", and there is no "Edit" button, no "Delete" button and no `article`.
- AC-5 (US-1, R5): Component: given notes with title / body `"  lead and trail  "` / `"line1\nline2\n\n  indented\ttab  "`, `"👩‍💻 🇮🇳"` / `"日本語 العربية עברית हिन्दी"`, `"<b>not html</b>"` / `"é vs é"` (precomposed and decomposed) and `""` / `"x"`, when each is opened and edited, then both field values are `===` the stored strings.
- AC-6 (US-4, R4, R7): Component: in edit mode, neither edit field has `maxlength` or `required`, the edit form has `noValidate`, no two elements in the document share an `id`, and the `<label>`s "Title" and "Note" inside the edit form are associated with the edit fields (their `control` is the visible edit field).
- AC-7 (US-4, R7): Component: given notes with a 185-character title and with a 90,000-character body, when each is edited, then "185 of 200 characters" is shown below Title and "90,000 of 100,000 characters" below Note straight away, linked through `aria-describedby` and not inside any `aria-live`, `role="status"` or `role="alert"` element. Given a 179-character title, no counter. When Title is extended to 250 characters by typing, "250 of 200 characters" shows and nothing contains "too long", and Title has no `aria-invalid`.
- AC-8 (US-2, US-4, R8): Component: given edit A changed, when `keyDown` `Enter` with `ctrlKey: true` fires on Title, then `update` is called once. The same holds for `metaKey: true`, and for both on Note. With `ctrlKey: true` and `isComposing: true`, `update` is not called. Plain `Enter` in Title moves focus to Note and calls nothing. "Save changes" has `aria-keyshortcuts="Control+Enter Meta+Enter"`, its accessible name is "Save changes", and its accessible description is "Press Cmd+Enter to save." with the platform stubbed as macOS and "Press Ctrl+Enter to save." with it stubbed as Windows.
- AC-9 (US-4, R9): Component: given edit A, when both fields are cleared and "Save changes" is clicked, then the edit form's alert region text is "Add a title or some text first.", Title has focus, neither `update` nor `delete` was called, and after Cancel → "Discard changes" → "Back to notes", A is still in the list. When "a" is typed into Note instead of saving, the alert region is empty.
- AC-10 (US-4, R9): Component: given edit A, when Title is set to 201 `"a"` and saved, then "The title is too long. It has 201 characters and the limit is 200." shows below Title, Title has `aria-invalid="true"` and that message's id in `aria-describedby`, focus is in Title, and `update` was not called. Given Note set to 100,001 characters, the Note message shows and Note has focus. Given both, both messages show and Title has focus. When one character is deleted from Title, its message and `aria-invalid` are removed.
- AC-11 (US-3, R10, R13): Component: given a spy repository and edit A, when "Save changes" is clicked with nothing typed, then `update` was not called, reading mode shows A, the view's status region text is "No changes to save.", A's heading has focus; and after "Back to notes" the links are still B, A. The same holds when "x" is typed at the end of Title and then deleted before saving.
- AC-12 (US-2, R11, R13, R32): Component: given the system time `2026-10-09T12:00:00Z`, `update` resolving through the in-memory double, and edit A, when Title is changed to "Shopping list" and "Save changes" clicked, then `update` was called exactly once with `(A.id, { title: "Shopping list", body: "Milk\n\n  Eggs\tx" })` (exactly those two keys), reading mode shows the heading "Shopping list" with focus, the updated line reads "Updated just now", the view's status region text is "Changes saved.", and `get` and `list` were not called again. After "Back to notes", the links are "Shopping list" then B, `list` was called once in total, and the "Shopping list" link has focus.
- AC-13 (US-2, R12): Component: given edit A changed and an `update` that stays pending, when "Save changes" is clicked, then it is named "Saving…", has `aria-disabled="true"` and is not `disabled`; "Cancel" and the "Back to notes" link have `aria-disabled="true"`; both fields are `readOnly`. A second click and a Ctrl+Enter don't call `update` again (still 1 call). Clicking "Cancel" or "Back to notes" changes neither the view nor `location.hash`. After `update` resolves, reading mode shows.
- AC-14 (US-2, US-5, R12, R20): Component: given edit A changed and a pending `update`, when `location.hash` is set to `""` and `hashchange` fires, then the edit form is still shown. When `update` then resolves, the list view shows with the updated A as the first link, A's link focused, and no dialog. Given the same with `update` rejecting with `StorageUnavailableError`, then the discard dialog shows over the edit form and the fields hold the typed text.
- AC-15 (US-5, R14): Component: given edit A with Title changed to "Keep me", for `update` rejecting with `new StorageUnavailableError()`, `new QuotaExceededError(...)`, `new Error("boom")` and the non-Error value `"boom"`, when "Save changes" is clicked, then the edit form's alert region text is exactly, in turn, the "Changes unavailable", "Changes full", "Changes failed" and "Changes failed" copy; Title still holds "Keep me" and is editable; "Save changes" reads "Save changes" without `aria-disabled`; focus is on "Save changes"; "Changes saved." is not in the document; and "boom" is not in the document. When the save was started with Ctrl+Enter from Note, focus stays in Note.
- AC-16 (US-4, US-5, R14): Component: given edit A changed and `update` rejecting with a `ValidationError` whose issues are, in turn, `[{ field: "note", rule: "empty" }]`, `[{ field: "title", rule: "too-long", limit: 200, actual: 250 }]` and `[{ field: "id", rule: "not-a-string" }]`, then the messages shown are, in turn, "Add a title or some text first.", "The title is too long. It has 250 characters and the limit is 200." and the "Changes failed" copy.
- AC-17 (US-5, R9, R14): Component: given the AC-15 unavailable state, when "Save changes" is clicked again and `update` rejects again, then the alert region was empty at the moment the new attempt started (observed through its text sequence) and then shows the message again. When it is clicked again and `update` resolves, the alert region is empty and reading mode shows "Changes saved.".
- AC-18 (US-5, R15, R33): Component: given edit A changed and `update` rejecting with `new NotFoundError()`, when "Save changes" is clicked, then the alert region shows the "Changes not found" copy, the fields keep their text, and `create` was not called. When Cancel is clicked, the discard dialog shows; "Discard changes" then shows the heading "Note not found" with focus, and `get` was not called again. After "Back to notes", A is not in the list.
- AC-19 (US-1, US-2, R11, R13, R32): e2e: given a fresh context with "First" / "one" and then "Second" / "two" saved through the form, when "First" is opened, "Edit" clicked, Note changed to "one\nmore 😀" and Ctrl+Enter pressed, then "Changes saved." is visible, the heading "First" is focused, and the body reads "one\nmore 😀". After "Back to notes" without a reload, "First" is the first link. Reading the `notes` store directly gives the record with the same `id` and `createdAt`, body `"one\nmore 😀"` and an `updatedAt` greater than before. After a reload, "First" is still first.
- AC-20 (US-3, R10): e2e: given a fresh context with "First" then "Second" saved, when "First" is opened, edited, and saved with nothing changed, then "No changes to save." is visible, and the `notes` store record of "First" has the same `updatedAt` as before. After a reload, the links are "Second", "First".

### Leaving an edit
- AC-21 (US-5, R17, R18): Component: given edit A with nothing changed, when Cancel is clicked, then reading mode shows A, "Edit" has focus, no dialog exists and no repository method was called. Given edit A with "x" typed and then deleted, Cancel behaves the same. Given edit A changed, when Cancel is clicked, then an `alertdialog` named "Discard your changes?" shows with "Keep editing" focused; "Keep editing" closes it with the typed text still in the fields and focus on "Cancel"; Cancel again → "Discard changes" → reading mode shows A's original title and body, "Edit" has focus, and `update` was never called.
- AC-22 (US-5, R19): Component: given edit A changed, when "Back to notes" is clicked, then the discard dialog shows and `location.hash` is still `#note/<A.id>`. "Discard changes" → the list view shows, `location.hash` is empty, A's link has focus and is named "Shopping". Given edit A with nothing changed, "Back to notes" shows the list view straight away with no dialog.
- AC-23 (US-5, R20, R41): Component: given edit A changed (opened from the list), with `history.length` and the `get` call count recorded, when `location.hash` is set to `""` and `hashchange` fires, then the discard dialog shows over the edit form, which still holds the typed text. When "Keep editing" is clicked, then `location.hash` is `#note/<A.id>`, `history.length` is not greater than recorded, the `get` count is unchanged, the fields hold the typed text, and focus is on the field that had it before. Doing the same again and clicking "Discard changes" shows the list view with A's link focused. Given edit A with nothing changed, the `hashchange` shows the list view with no dialog.
- AC-24 (US-5, R20): Component: given the AC-23 dialog open after a change to `""`, when `location.hash` is set back to `#note/<A.id>` and `hashchange` fires, then the dialog closes and the edit form is unchanged. Given it open and `location.hash` set to `#note/<B.id>` instead, then one dialog is still open, and "Discard changes" shows B's view.
- AC-25 (US-5, R20): e2e: given a fresh context with A and B saved, A opened from the list, "Edit" clicked and "typed" typed into Note, with `history.length` recorded, when `page.goBack()` runs, then the discard dialog is visible with "Keep editing" focused. When Enter is pressed, then the URL ends in `#note/<A.id>`, Note still ends in "typed", and `history.length` equals the recorded value. When `page.goBack()` runs again and "Discard changes" is clicked, then the list view shows, the URL has no `#note/`, and A's link is focused. `page.goForward()` then shows A in reading mode with its original body.
- AC-26 (US-5, R21): Component: given edit A with nothing changed and an empty "New note" form, a cancelable `beforeunload` event has `defaultPrevented` false; after a change, true; after a successful save, false; after a change that is then typed back to the baseline, false; after a change and "Discard changes", false. Given "draft" in the hidden "New note" Title and edit A with nothing changed, true.
- AC-27 (US-5, R21, R22): e2e: given edit A changed, when `page.close({ runBeforeUnload: true })` runs, then a `beforeunload` dialog fires. In another test, given edit A changed and a `dialog` handler that accepts, when the page is reloaded, then A's view shows in reading mode with its stored body, there is no textbox in `main`, and the heading is focused.
- AC-28 (US-5, US-10, R22, R44): e2e: given edit A changed with "SECRET-EDIT" typed, then `page.url()` doesn't contain "SECRET", `document.title` is "QuickNotes", `JSON.stringify(history.state)` doesn't contain "SECRET", `localStorage.length` and `sessionStorage.length` are 0, `document.cookie` is empty, and the `notes` store record for A is unchanged.

### Confirmation dialogs
- AC-29 (US-6, US-9, R23, R24, R26): Component: given opened A and a spy on `window.confirm`, `window.alert` and `window.prompt`, when "Delete" is clicked, then an element with role `alertdialog` and `aria-modal="true"` is shown, named "Delete this note?", whose accessible description contains "Shopping" followed by "It will be removed from this device for good. This can't be undone."; its buttons are, in DOM order, "Keep note" then "Delete note"; "Keep note" has focus; `delete` was not called; and none of the window spies was called.
- AC-30 (US-6, R23, R26): Component: given the AC-29 dialog, when Escape is pressed, then the dialog is gone, "Delete" has focus and `delete` was not called. The same holds for clicking "Keep note".
- AC-31 (US-6, R24): Component: given notes with titles `""` and `"\t"`, the delete dialog's title paragraph reads "Untitled note". Given `"  lead  "`, its `textContent` is `"  lead  "`. Given a 200-character title, the full title is in the dialog.
- AC-32 (US-5, US-9, R23, R25): Component: given the discard dialog (AC-21), then it has role `alertdialog`, `aria-modal="true"`, the name "Discard your changes?", the description "Your changes to this note haven't been saved. Discarding them can't be undone.", the buttons "Keep editing" then "Discard changes", and Escape closes it as "Keep editing".
- AC-33 (US-9, R23): e2e: given each dialog open in turn (delete from reading mode; discard from Cancel), when Tab is pressed 3 times and then Shift+Tab 3 times, then after every key press focus is on one of the dialog's two buttons. A mouse click at the centre of the "Back to notes" link's bounding box changes neither the URL nor the dialog. Chromium's accessibility tree (read through CDP `Accessibility.getFullAXTree`, or another check the plan names) contains no node for the "Back to notes" link, the article heading or the header while the dialog is open, and contains them again after it closes.

### Deleting
- AC-34 (US-6, US-7, R27, R28, R33, R35): Component: given a spy over the in-memory double, A opened from the list, when "Delete" then "Delete note" are clicked, then `delete` was called exactly once with `A.id`, the list view shows with only B's link, `location.hash` is empty, the "Your notes" `<h2>` has focus, the "Your notes" status region text is "Note deleted.", `list` was called once in total, and `get` was not called after the delete.
- AC-35 (US-6, R27): Component: given the delete dialog and a `delete` that stays pending, when "Delete note" is clicked, then it is named "Deleting…" with `aria-disabled="true"` (not `disabled`), "Keep note" has `aria-disabled="true"`, Escape and a second click leave the dialog open and `delete` at 1 call.
- AC-36 (US-7, R28): Component: given only A stored, when A is opened and deleted, then the "Your notes" section shows "No notes yet", the status region reads "Note deleted.", and the "Your notes" `<h2>` has focus.
- AC-37 (US-7, R28): e2e: given a fresh context with A and B saved and A opened from the list, with `history.length` recorded, when A is deleted, then the list view shows without A, the URL has no `#note/`, "Note deleted." is visible, the "Your notes" heading is focused, and `history.length` equals the recorded value. `page.goForward()` shows "Note not found" with its heading focused. In another test, given the page loaded at `#note/<A.id>`, when A is deleted, then the list view shows, the URL has no hash, `history.length` is unchanged, and after a reload A is not listed and the `notes` store holds only B.
- AC-38 (US-7, US-9, R35; revised `list-notes` AC-17 and AC-43): Component: given `<App />` just rendered with `list()` pending, then the "Your notes" section contains exactly one `role="status"` element and one `role="alert"` element, both empty. Through loading, a loaded list, an empty list and a form save, the status region stays empty. After a delete, it reads "Note deleted."; after a note is opened and the list shown again, it is empty; when a second note is deleted, its text sequence goes empty then "Note deleted." again. A save attempt in the "New note" form empties it.
- AC-39 (US-8, R29): Component: given A opened from the list and `delete` rejecting with `new NotFoundError()`, when "Delete note" is clicked, then the list view shows without A, the "Your notes" status region reads "That note had already been deleted, maybe in another tab.", and the "Your notes" `<h2>` has focus.
- AC-40 (US-8, R30): Component: given A opened and `delete` rejecting with `new StorageUnavailableError()`, when "Delete note" is clicked, then no dialog exists, reading mode still shows "Shopping", the view's alert region reads the "Delete unavailable" copy, and "Delete" has focus. Given `new QuotaExceededError(...)`, `new Error("boom")` and `"boom"`, it reads the "Delete failed" copy and "boom" isn't in the document. After "Back to notes", the list is still A and B.
- AC-41 (US-6, R31): Component: given the delete dialog open (not pending), when `location.hash` is set to `""` and `hashchange` fires, then the dialog is gone, the list view shows with A still listed, and `delete` was not called. Given "Delete note" clicked with `delete` pending, when the hash changes to `""`, then the list view shows; when `delete` then resolves, A's link is removed, the status region reads "Note deleted.", and focus is wherever it was before the resolution.
- AC-42 (US-5, US-8, R15, R29, R43): e2e: given one context with two pages on the app, note A saved in page 1 and page 2 reloaded, and A opened in both, when page 1 deletes A, and page 2 then clicks "Delete" and "Delete note", then page 2 shows the list view with "That note had already been deleted, maybe in another tab." In a second run, when page 2 instead clicks "Edit", types "x" and saves, then it shows the "Changes not found" copy with its text kept, and the `notes` store holds no record with `A.id`.

### List stays true
- AC-43 (US-2, US-7, R32, R33): Component: given the page loaded at `#note/<A.id>` with `list()` pending, when A is edited to "New A" and `update` resolves with N, and `list()` then resolves `[B, A]`, then the links are "New A", B, with N once. Given the same with A deleted instead, and `list()` resolving `[A, B]`, then the only link is B.
- AC-44 (US-7, R32, R33): Component: given `list()` rejecting with `StorageUnavailableError`, when a note opened by URL is edited and saved, and another is deleted, then the "Your notes" section still shows the "List unavailable" copy and no list item, and after the delete the status region reads "Note deleted.".
- AC-45 (US-5, R34): Component: given 181 characters typed in the "New note" Title (counter showing) and "draft" in its Note, when A is opened, edited and saved, then B is opened and deleted, then on the list view the "New note" Title still holds the same 181 characters, Note holds "draft", and "181 of 200 characters" is shown.

### Look, layout and accessibility
- AC-46 (US-9, R39): e2e: given each state in turn, when axe runs with the tags `wcag2a`, `wcag2aa`, `wcag21a` and `wcag21aa`, then there are zero violations, `color-contrast` is not in `incomplete` and passes on at least 3 nodes: reading mode; reading mode with "Changes saved."; edit mode idle; edit mode with a counter showing; edit title-too-long; edit both-empty; edit save failed (forced by deleting the note's record from a second page in the same context, so the "Changes not found" copy shows); the discard dialog; the delete dialog; the delete dialog deleting; delete failed; the list view with "Note deleted.".

  **Dialog exception (Revision 2026-10-10):** in the three dialog states only (discard dialog, delete dialog, delete dialog deleting), `color-contrast` results in `incomplete` are accepted when every such node is inside the dialog, and the same test then asserts, for every text element in the dialog (heading, title paragraph, body text, both buttons' labels), that the contrast of its computed `color` against the dialog box's own opaque computed `background-color` (for a button, against the button's opaque background) is at least 4.5:1 (or at least 3:1 for large text: 24px and up, or 18.66px and up when bold), and that each dialog button's keyboard focus outline colour is at least 3:1 against the dialog box's background. Any other `incomplete` result, in any state, still fails. The dimmed backdrop stays.
- AC-47 (US-9, R37, R38): e2e: given viewports 360x740, 768x1024, 1280x800 and 1920x1080 and a note with a 200-character unbroken title and a 5,000-character unbroken body, then in reading mode, in edit mode and with each dialog open: `scrollWidth <= innerWidth`; "Edit", "Delete", "Save changes", "Cancel" and each dialog button lie fully within the viewport horizontally and are at least 44px tall; each dialog lies fully within the viewport horizontally; and the `main` column's horizontal centre is within 2px of the viewport's.
- AC-48 (US-9, R38): e2e: given a 320x640 viewport and root font size 200%, then reading mode, edit mode (with a 100,000-character unbroken body) and each dialog (with the 200-character unbroken title) have no horizontal page scroll, and every button, label, field and dialog text is visible or reachable by scrolling the dialog itself; each dialog's buttons can be scrolled into view and clicked.
- AC-49 (US-9, R38): e2e: given a 360px viewport and the WCAG 1.4.12 text-spacing CSS, then in reading mode, edit mode and each dialog there is no horizontal scroll, and no `h2`, `label`, button, message or dialog paragraph is clipped (`scrollWidth <= clientWidth` and `scrollHeight <= clientHeight`, except the dialog box itself, which may scroll vertically).
- AC-50 (US-9, R36): e2e: in reading mode, edit mode and each dialog, the `project-foundation` "no animations or transitions" check passes. "Edit", "Delete", "Save changes", "Cancel", "Keep note", "Delete note", "Keep editing" and "Discard changes", focused by keyboard, each have `outline-style` not `none`, `outline-width` at least 2px and `outline-color` `rgb(29, 78, 216)`. No element in the note view or a dialog has a computed `color`, `background-color` or `border-color` whose hue is red (the plan defines the check, for example: every computed colour is a zinc grey, white, black, transparent or `rgb(29, 78, 216)`, allowing alpha on the backdrop). Tooling: `project-foundation` AC-25 (one non-zinc token, `accent`) still passes.
- AC-51 (US-9, R40): e2e: given a fresh context with A and B saved, using the keyboard only (no mouse): Tab to A's link, Enter; Tab to "Edit", Enter; type "!" in Title; Ctrl+Enter; then "Changes saved." is visible. Shift+Tab / Tab to "Delete", Enter; Tab to "Delete note", Enter; then the list view shows without A, with "Your notes" focused.

### Performance
- AC-52 (US-11, R46): e2e: given a fresh context seeded with 1,000 notes (60-character titles, 2,000-character bodies) plus one note with a 100,000-character body of 2,000 lines, reloaded with a `longtask` `PerformanceObserver` registered by init script, when the long note is opened and "Edit" clicked, then within 1,000 ms Title is focused and Note's value has 100,000 characters. When the last character of Note is replaced by a different one (so Note stays at 100,000 characters and the save is valid) and "Save changes" clicked, then within 1,000 ms reading mode shows with the heading focused. When another note is opened and deleted, then within 1,000 ms of clicking "Delete note" the list view shows with "Your notes" focused and 1,000 links. No long task over 300 ms is recorded in any of these steps.

### Storage use, privacy and guards
- AC-53 (US-12, R41; revised `list-notes` AC-53): Component: given a spy repository (every method a `vi.fn`; `list` resolves `[A, B]`, `get` resolves the requested note, `update` resolves the updated note, `delete` resolves), when the app renders, A is opened, edited with no change and saved, edited with a change and saved, edited with a change and cancelled through "Discard changes", edited with a change and kept through "Keep editing" after a `hashchange`, then cancelled through "Discard changes", and then deleted through the dialog, then, in total: `list` 1 call; `get` 1 call (A's open); `update` 1 call; `delete` 1 call; `create` 0; `isPersisted` 0.
- AC-54 (US-12, R42): tooling: `tests/tooling/storage-boundary.test.ts` runs with the `create-note` AC-43 to AC-46 checks and the `note-storage` AC-51 and AC-53 checks unchanged in what they assert, and passes, including the pinned export list of `src/storage/index.ts`.
- AC-55 (US-10, R45): tooling: `package.json` `dependencies` has exactly the keys `react` and `react-dom`, and `tests/tooling/licences.test.ts` passes with its exception list unchanged.
- AC-56 (US-10, R16): Component: given a note "SECRET-T" / "SECRET-B" opened and edited to "SECRET-T2", with `update` rejecting in turn with each error of AC-15, AC-16 and AC-18, and `delete` rejecting with each error of AC-40, then a spy on `console.log/info/warn/error/debug` recorded no call whose arguments contain "SECRET", and no shown message contains "SECRET".
- AC-57 (US-10, R43): e2e: given a fresh context with notes A and B saved, request logging, and an init script that counts calls to `StorageManager.prototype.persisted` and `persist`, when the page is reloaded and the network is idle, the log and counters are cleared, and then B is deleted, then no request was recorded and both counters are 0. When A is then edited and saved twice, no request was recorded, `persisted` was called at most once and `persist` at most once. `localStorage.length` and `sessionStorage.length` are 0, `document.cookie` is empty, and `caches.keys()` resolves `[]`.
- AC-58 (US-10, US-12, R44, R23): Component: given spies on `history.pushState`, `history.replaceState`, `window.confirm`, `window.alert` and `window.prompt`, when every flow in AC-21 to AC-24, AC-34, AC-36, AC-39 and AC-41 runs (including a page loaded at a note route and then deleted), then `pushState` and the three window methods were never called, and every `replaceState` call had `null` as its first argument.
- AC-59 (US-12, R47): tooling: `create-note` AC-42 (no `launchPersistentContext` or `storageState` in `playwright.config.ts` or `e2e/`) passes unchanged. Every new e2e test that saves or seeds notes uses the per-test `page` fixture or a context it creates and closes.

### Manual checks (ship)
- AC-60 (US-9, R48): manual, recorded in `review.md`: with VoiceOver on macOS Safari and on iOS Safari, and in a keyboard-only pass in desktop Chrome:
  - on an opened note, "Edit" and "Delete" are announced as buttons after "Back to notes";
  - "Edit" announces the Title field with the note's title in it;
  - a save announces "Changes saved." (and the note's heading), a no-op save "No changes to save.", a both-empty save its message, a too-long save the field and its message on focus;
  - each dialog is announced as an alert dialog with its heading and text, with focus on the safe button, and nothing outside it can be reached;
  - a delete announces "Note deleted." and lands on "Your notes";
  - Cancel and "Back to notes" with changes ask first; browser Back with changes asks first and "Keep editing" keeps the text.
- AC-61 (US-1, US-2, US-6, US-7, R48): manual at ship, on the live URL, in current desktop Chrome and current desktop Safari, each in turn:
  1. Open a note, edit its body (a line break and an emoji), save. "Changes saved." shows, the note is first in the list, and after a reload the edit is still there.
  2. Edit again, then press the browser's Back button: the discard question appears. Keep editing, then reload: "Leave site?" appears.
  3. Delete a note through the dialog. It leaves the list, "Note deleted." shows, and Forward shows "Note not found".
  4. Optionally, the owner deletes the A8 check notes from `create-note` AC-58 this way.

  The result for each browser and step is recorded at ship. Agents never mark it passed.

## Constraints
- **Charter:** React + Vite + TypeScript + Tailwind; no backend; notes never leave the device; WCAG 2.1 AA; $0; v1 scope "Create, edit and delete notes".
- **Owner decisions (intent, 2026-10-09)** are binding: in-page confirmation with focus on the safe choice and no undo (item 1); Edit and Delete only on the opened note view, editing in place with no URL, "Leave site?" on reload/close, Cancel / "Back to notes" / browser Back ask before discarding, after a delete back to the list with "Note deleted." and focus on "Your notes" (item 2).
- **Standing decisions** (product/decisions.md, Approved): §2.1, §2.2, §2.3, §2.4, §2.5, §2.6, §3.2, §3.4, §4.1, §4.2, §5.1, as applied above.
- **Depends on `list-notes` being built first.** Its spec is approved; its plan is still a draft and its code isn't merged. This slug's plan builds on the `list-notes` implementation (note view, routing, list state, hidden form). Where this spec and the approved `list-notes` spec differ, the differences are only those in "Changes to earlier specs".
- **Storage layer used as shipped:** `update` (R14: both fields, single transaction, `NotFoundError` without recreating, `updatedAt` always forward), `delete` (R15: real delete, `NotFoundError`), typed errors (R20), last-write-wins (R34), no cross-tab notifications (R35) and persistence timing (R30, R31). If one proves wrong, it goes back to `note-storage` as a spec change.
- **Routing:** hash-based as in `list-notes`; no `pushState`; no routing library; edit mode has no URL.
- **Design system:** `project-foundation`'s zinc greys, one `accent`, the global focus outline, the system font, no animations. No new colour token; no red.
- **Browsers and sizes:** as `project-foundation` (last 2 versions of Chrome, Edge, Firefox, Safari, iOS Safari; 360px-1920px, reflow at 320px). Automated browser tests in Chromium only; Safari covered by AC-60 and AC-61.
- **Tests:** component tests in Vitest + React Testing Library (jsdom); e2e, layout, axe and performance in Playwright (headless Chromium) through `gotoApp`, each storing test in its own context; tooling under `tests/tooling/`. Everything runs in `npm run ci` except AC-60 and AC-61.
- **Lint:** `eslint-plugin-jsx-a11y` recommended stays on. Any rule exception the dialogs need must be the narrowest option, named in the plan and commented.

## Non-goals
- Undo after a delete, a trash, an archive, soft delete or tombstones; no change to `note-storage` R15.
- Deleting several notes, or "delete all".
- Edit or Delete in the list rows, or anywhere other than the opened note view.
- A URL or history entry for edit mode (such as `#note/<id>/edit`), and reopening an edit after a reload.
- Autosave, drafts of edits, edit history or versions.
- Conflict detection, merging, or a warning that another tab changed the note; live updates from other tabs.
- An Escape shortcut to cancel an edit (Escape only answers the dialogs), or any keyboard shortcut for Edit or Delete.
- "Save as a new note" after a note was deleted elsewhere (the text stays on screen to copy).
- Changing the storage layer, its rules, sort order, error kinds or public entry point.
- Changing the "New note" form's behaviour or copy.
- Search (`search-notes`), light/dark mode (`theme-mode`), service worker and offline install (`pwa-offline`).
- Tags, folders, pinning, rich text, Markdown, attachments, export, import, sync or accounts (charter).
- A notice or copy about persistent storage or the browser's prompt.
- New runtime dependencies. Automated Firefox or WebKit runs.

## Open questions / risks
No question needs the owner under product/decisions.md §1.2: the two
product choices (confirmation without undo; where Edit and Delete live and
how editing flows) were decided on 2026-10-09, and everything else is
applied as a decision (see "Decisions applied"). The items below are
risks recorded for visibility, per §2.6. The approver accepts them by
approving this spec.

1. **Browser Back can't be blocked (risk, §2.6).** A page can't stop the Back button. With unsaved changes, the URL changes first; the app then keeps the edit form on screen, asks, and on "Keep editing" puts the note's URL back without adding history (R20). For a moment the address bar shows the list URL. If Back would leave QuickNotes entirely (the note was the first page loaded), only the browser's "Leave site?" warning can help (R21).
2. **iOS Safari shows no "Leave site?" warning (risk, §2.6; as `create-note` risk 7).** On an iPhone, reloading or closing the tab during an edit loses unsaved changes without warning. Cancel, "Back to notes" and Back still ask.
3. **Browser text normalisation (risk; as `create-note` risk 4).** The Title input drops line breaks and the textarea stores `\r\n` as `\n`. Notes created in the app never contain these, so nothing changes. A note with line breaks in its title (only possible from outside the app, such as seeding) would show without them in the edit field; because the baseline is the field values (R5), saving without a change still writes nothing, but saving any other change stores the title without them.
4. **"Changes saved." may be read after the heading (risk).** After a save, focus moves to the note's heading and "Changes saved." is a polite status. A screen reader reads the heading first and may queue or drop the polite message. The visible text stays. AC-60 checks it in VoiceOver.
5. **Route change during a save is held back (minor).** If Back is pressed while `update` is pending (usually a few milliseconds), the app waits for the save before acting on it (R12). The URL shows the new route meanwhile.
6. **First save of a launch may show a browser prompt (risk, accepted by §2.7).** In some browsers (for example Firefox) the first `update` of a launch may make the browser ask about persistent storage (`note-storage` R30). The save doesn't wait for it. No QuickNotes copy.
7. **Order after an edit with clock skew (minor).** The edited note is placed first in memory (R32). If another note has an `updatedAt` in the future (a device clock that was wrong), storage would sort that one first; a reload shows the storage order.
8. **Other tabs show old data (accepted, `note-storage` R35).** A tab doesn't learn about edits or deletes in another tab until it reloads or acts on the note. Acting on a note deleted elsewhere is reported (R15, R29), never silently recreated; editing a note changed elsewhere overwrites it (last save wins, `note-storage` R34).
9. **Dialog mechanism and jsdom (plan risk).** jsdom may not implement `HTMLDialogElement.showModal()` or the `inert` behaviour. The plan picks a mechanism that the component tests can exercise (R23), and the e2e checks (AC-33) confirm the real focus and inert behaviour in Chromium.
10. **Depends on `list-notes` code (schedule risk).** This slug can't be implemented until `list-notes` is merged. If building `list-notes` changes its approved spec, this spec is re-checked against the change before its plan is approved.
11. **Superseded items in approved specs (owner housekeeping).** Agents don't edit approved artifacts. The owner may add a one-line cross-reference at ship to `list-notes` (R14, R18, R19, R24, R29, R36, R39, AC-17, AC-27, AC-43, AC-53, Non-goals) and `create-note` (R25, R27, AC-37).
12. **A8 test notes (resolved by this slug).** `create-note` open question 11 and `list-notes` risk 7 are resolved: the owner can delete the A8 notes with the new Delete after ship (AC-61 step 4).

## Approval
<!-- Who approved this spec, and when. A spec is not approved until a
     human signs off here — this is the primary judgment gate in the
     framework; do not skip it. -->
- Previous revision (before Revision 2026-10-10), approved by: AITechie, 2026-10-09
- Approved by: AITechie, 2026-10-09
