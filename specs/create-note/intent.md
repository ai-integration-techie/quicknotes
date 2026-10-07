# Intent: Create a note

- Status: draft
- Slug: create-note
- Jira: none
- Owner: AITechie
- Date: 2026-10-07

## Problem
QuickNotes is live at `https://ai-integration-techie.github.io/quicknotes/`,
but the user still can't write anything in it. The page shows the
"QuickNotes" header and a "No notes yet" empty state, and nothing else.
The storage layer (`note-storage`) has shipped, so the app can now keep
notes on the device, but there is no screen that lets anyone write one.

The person who feels this is AITechie, the only user. Until they can
create and save a note, the charter's adoption goal (daily use for 4
weeks instead of their current tool) can't even start, and the charter's
first success metric (ready to type in under 1 second from launch) has
nothing to type into.

## Why now
- It is next in the charter's feature breakdown. `project-foundation`,
  `pages-deploy` and `note-storage` have all shipped, and every later
  note feature (`list-notes`, `edit-note`, `delete-note`, `search-notes`)
  needs notes to exist first.
- It is the first feature that actually writes to storage in a real
  browser. Several things were deliberately deferred to this slug:
  - **Real-browser survival (`note-storage` A8).** That a saved note
    survives a reload, a browser restart and a new deploy has so far
    only been simulated. This slug is where it must be checked for real
    (decision 11).
  - **The browser's persistent-storage request.** The first save of each
    launch asks the browser to protect stored notes. Some browsers (for
    example Firefox) may show a permission prompt. A real user sees that
    for the first time in this slug.
  - **What the user sees when storage is unavailable or full** was left
    by `note-storage` to the first UI slug that saves, which is this one.
- Every week without it is a week the adoption clock can't start.

## Desired outcome
Described as behaviour, not implementation.

- The user opens QuickNotes and can start typing a note quickly. The
  charter's "ready to type in under 1 second from launch" target
  applies, and this slug must not make the app slower to become usable.
- The user can give the note a title and a plain-text body. Text is
  kept exactly as typed: line breaks, spaces, tabs, emoji and any
  script, with no trimming or reformatting.
- The user can save the note. When they do, it is saved on this device
  only, through the existing storage layer, and nothing is sent over the
  network.
- After a successful save, the user can tell, clearly and accessibly,
  that the note was saved, and the form is ready for the next note
  (decision 3).
- A saved note is still there after a reload, after closing and
  reopening the browser and after a new deploy. This is checked in a
  real browser, not only in a simulation (A8, decision 11).
- The field rules already agreed in `note-storage` hold, and the user is
  told about them before or when they would break one, never by a
  silently changed or half-saved note:
  - title at most 200 characters, body at most 100,000 characters;
  - a note can't have both the title and the body empty;
  - whitespace counts as content.
  Characters are counted the same way the storage layer counts them (one
  Unicode code point = one character). The browser's built-in input
  length limit counts differently (it counts 😀 as 2), so it can't be
  the only guard.
- If a save fails, the user is told the truth, in plain friendly words,
  and their typed text is not lost from the screen:
  - storage is unavailable (for example some private-browsing modes);
  - storage is full;
  - any other failure.
  The app never claims a note was saved when it wasn't, and never falls
  back to some other place to keep it.
- The new screen meets the same bar as the shell: WCAG 2.1 AA, works with
  keyboard and screen reader, works from a 360px phone up to desktop,
  uses the existing look (zinc greys, the `blue-700` accent, the visible
  focus style, no animations) and the existing copy tone (plain,
  friendly, sentence case, no exclamation marks).
- Opening the app without saving still creates no stored data. The
  `project-foundation` "nothing stored on a fresh load" check (AC-33)
  must keep holding: storage is touched only when the user saves.

## Non-goals
- Showing the list of notes, or opening a saved note. That is
  `list-notes`.
- Editing a note after it is saved. That is `edit-note`.
- Deleting a note. That is `delete-note`.
- Search (`search-notes`), light/dark mode (`theme-mode`), offline
  install and the service worker (`pwa-offline`).
- Saving unsaved text as a draft anywhere (decision 7).
- Any QuickNotes copy about the browser's persistent-storage prompt
  (decision 9), and a skip link (decision 10, waits for `list-notes`).
- A notice about whether storage is persistent. `note-storage` decided
  to expose this but not show it, and left it to a later slug.
- Rich text, Markdown rendering, attachments, tags, folders, pinning or
  any field beyond title and body (charter).
- Export, import, backup, sync, accounts or any network call (charter).
- Changing the storage layer's rules (field limits, character counting,
  error types, persistence request timing). This slug uses them as they
  are. If it turns out one of them is wrong for the UI, that goes back
  to `note-storage` as a spec change, not a silent workaround.
- Cross-tab notices (for example telling another open tab that a note
  was created).

## Rough shape (optional)
Hunches only. The spec and plan will confirm or replace them.

- The UI will use the shared repository entry point from `note-storage`
  (`getNoteRepository()`), its exported character counter and limits,
  and its typed error kinds (validation, not-found, unavailable,
  quota-exceeded) to choose what to tell the user.
- **The storage boundary changes on purpose.** Today a tooling test
  (`tests/tooling/storage-boundary.test.ts`, `note-storage` AC-56) fails
  if any UI file reaches a storage module. This slug must change that
  rule deliberately: the UI may now reach the public storage entry
  point, but still never the IndexedDB implementation directly, the
  in-memory test double or test support. The test should be updated to
  say exactly that, not deleted.
- **AC-33 should still hold, with care.** Because the repository opens
  the database lazily, merely showing a create form should not create
  the database. It would break if the screen read from storage on load
  (for example to decide whether to keep showing "No notes yet"), or if
  unsaved text were kept in any browser storage. Any new real-browser
  test that saves a note must run in its own browser context so it
  doesn't affect the fresh-load check.
- The A8 check is a manual check at ship (decision 11). An automated
  reload test in its own browser context may also be added if the plan
  wants one.

## Owner decisions (AITechie, 2026-10-07)
1. **Entry point.** The create form is always visible when the app
   opens, with focus already in the title field. There is no "New note"
   button.
2. **Save trigger.** A Save button plus Cmd+Enter (macOS) / Ctrl+Enter
   (other platforms). No autosave.
3. **After a successful save.** A brief "Note saved" message appears
   and the form clears, ready for the next note. The "No notes yet"
   empty-state copy changes so that it is never untrue after a save,
   along the lines of "Your notes are saved on this device". The exact
   copy is for the spec. The app MUST NOT read storage on load to decide
   what this text says.
4. **Errors.** Errors are shown inline, next to the field they concern
   or next to the Save button. They appear only when the user tries to
   save, never live while typing. Typed text is always kept on screen
   when a save fails.
5. **Limits.** The user can type and paste past the limits (title 200,
   body 100,000 characters). Nothing is silently truncated. A character
   counter appears when a field gets near its limit (for example in the
   last 10%). Saving an over-limit note is blocked, and the message says
   which field is too long.
6. **Both fields empty.** Save stays enabled. Trying to save shows a
   message along the lines of "Add a title or some text first."
7. **Unsaved text on reload or close.** The browser's "Leave site?"
   warning appears only when there is unsaved text. Drafts are not kept
   anywhere.
8. **Storage unavailable or full.** The app tries to save, then explains
   clearly what went wrong, keeping the text. There is no up-front
   storage check on load, so `project-foundation` AC-33 stays intact.
9. **Persistent-storage prompt.** If the browser shows its own
   permission prompt on the first save, QuickNotes adds no copy of its
   own about it.
10. **Skip link.** Not in this slug. It waits for `list-notes`.
11. **Real-browser check (A8).** A manual check at ship, in desktop
    Chrome and desktop Safari, that a saved note survives a reload, a
    browser restart and a new deploy. With no list yet, the note is
    checked through the browser's dev tools or a temporary test. A
    device restart is not part of the required check.
12. **Storage boundary.** Confirmed. The UI may use only the public
    `getNoteRepository()` entry point, and the exports that come with it
    (the error kinds, the character counter and the limits). It may
    never use the IndexedDB implementation, the in-memory test double or
    test support. `tests/tooling/storage-boundary.test.ts` is narrowed
    to enforce exactly this, not removed.

## Open questions
None. All owner questions were answered on 2026-10-07 (see Owner
decisions above).
