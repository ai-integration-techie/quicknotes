# Intent: List notes and open one

- Status: draft
- Slug: list-notes
- Jira: none
- Owner: AITechie
- Date: 2026-10-08

## Problem
QuickNotes is live at `https://ai-integration-techie.github.io/quicknotes/`.
Since `create-note` shipped, the user can write a note and save it on the
device. But nothing in the app ever shows a saved note again. After
"Note saved." the form clears, and the note can only be found by opening
the browser's dev tools. As far as the user can tell, notes go in and
never come back out.

The person who feels this is AITechie, the only user, every time they
use the app. A notes tool you can't read back can't replace their current
tool. The charter's adoption goal (daily use for 4 weeks instead of the
current tool) can't really start until saved notes can be seen and read.

## Why now
- It is next in the charter's feature breakdown. `project-foundation`,
  `pages-deploy`, `note-storage` and `create-note` have shipped. The
  charter's v1 scope includes "List notes and open one".
- Notes are already piling up with no way to see them. That includes the
  real-browser survival check notes saved at `create-note` ship (A8,
  `create-note` AC-58). They will show up in the list as soon as this
  ships.
- `edit-note`, `delete-note` and `search-notes` all start from a list
  of notes and an opened note. They can't be built until this exists.
- Two things were deferred to this slug on purpose:
  - **The skip link.** It was held back from `create-note` (its decision
    10) until there was a list to skip to.
  - **Reading storage when the app opens.** Until now the app has never
    read storage on load, and `project-foundation` AC-33 ("nothing stored
    on a fresh load") was kept as it was. Showing saved notes when the
    app opens means reading storage when the app opens, so that check has
    to be revised deliberately (see Owner decisions, item 1).

## Desired outcome
Described as behaviour, not implementation.

- **The list.** When the user opens QuickNotes, they see all their saved
  notes, with the most recently updated first. There is no paging and no
  "load more". With 1,000 notes, all 1,000 are there.
- **Ready to type stays first.** The app is still ready to type in under
  1 second from launch (charter). The "New note" form shows up straight
  away, with focus in Title, exactly as it does today (`create-note`
  decision 1). Loading the list never delays the form, never takes focus
  away from it, and never blocks typing.
- **Each note can be told apart.** Each entry shows enough to recognise
  the note: its title, and a sensible stand-in when the title is empty
  (a note can have only a body). It also shows when the note was last
  updated. The spec sets the exact content and copy.
- **Opening a note.** The user can pick a note from the list, with mouse,
  touch or keyboard. They then see that note in full, read-only: its
  title and its whole body, exactly as saved (line breaks, spaces,
  emoji, any script). Text is always shown as plain text and never
  interpreted as HTML or Markdown. From the opened note they can get back
  to the list easily, and keyboard focus returns somewhere sensible.
- **New notes show up straight away.** When the user saves a note with
  the create form, it appears at the top of the list in the same tab,
  without a reload. Nothing else about the save changes: "Note saved."
  is still announced, the form clears, and focus goes back to Title
  (`create-note` R11). Other open tabs don't update until they reload.
  That is already the agreed behaviour (`note-storage` R35, cross-tab
  notices are a non-goal).
- **No notes yet.** With no saved notes, the user sees a plain, true
  empty state instead of a list.
- **Honest failures.** If the notes can't be read (storage unavailable,
  for example in some private-browsing modes, or any other failure), the
  user is told plainly that their notes couldn't be loaded. The app never
  shows an empty list as if there were no notes (per
  product/decisions.md §2.3). The create form keeps working as before.
  If a note can't be opened (for example another tab deleted it), the
  user is told so and can get back to the list.
- **Fast with 1,000 notes.** With 1,000 notes stored, the list loads and
  shows without making the page sluggish. Opening a note, even one with
  a 100,000-character body, stays responsive. The spec sets the
  measurable budgets.
- **Same quality bar.** WCAG 2.1 AA, fully usable by keyboard and screen
  reader, 360px phone to desktop, the existing look (zinc greys, one
  `blue-700` accent, the visible focus outline, no animations) and the
  existing copy tone (per product/decisions.md §2.4 and §2.5).
- **Privacy holds.** Reading notes makes no network request and writes
  nothing anywhere. The only new thing that touches storage is reading
  the notes.

## Non-goals
- Editing a note (`edit-note`). The opened note is read-only.
- Deleting a note, undo or a trash (`delete-note`).
- Search or filtering (`search-notes`), and any sort order other than
  most recently updated first. There is no user-selectable sort.
- Light/dark mode (`theme-mode`). Service worker, offline install and the
  full cold-start launch target (`pwa-offline`).
- A notice about whether storage is persistent, or any copy about the
  browser's persistent-storage prompt. `note-storage` exposes
  `isPersisted()` for a later UI slug, and this slug doesn't need it (per
  product/decisions.md §2.7). The app does not call it here.
- Paging, "load more" or partial loading. `note-storage` deliberately
  has no partial list, and the charter's scale is 1,000 notes.
- Live updates from other tabs (`note-storage` R35).
- Changing the storage layer: its sort order, field rules, error kinds,
  lazy open or public entry point. If one turns out wrong for the list,
  it goes back to `note-storage` as a spec change.
- Tags, folders, pinning, rich text, Markdown rendering, attachments,
  export, import, sync or accounts (charter).
- Cleaning up the A8 test notes. They stay until `delete-note` ships, or
  until the owner removes them by hand (accepted at `create-note`
  approval, its open question 11).
- New runtime dependencies, for example a list-virtualisation library
  (per product/decisions.md §3.2).

## Decisions applied from product/decisions.md
These are not open questions. They are recorded so the spec carries them.

1. **Refresh after a save (§1.1, §2.1).** The list updates in the same
   tab after every successful save from the create form, with no reload
   and no polling. Whether the spec re-reads the list or adds the saved
   note is left to the spec and plan. A failed save leaves the list as
   it is.
2. **Failure to load is said plainly (§2.2, §2.3).** No silent empty
   list and no fallback storage.
3. **Skip link (§2.5, §2.7).** It was deferred to this slug, and this is
   the slug that needs it. The page gets a skip link so keyboard users
   can reach the notes without tabbing through the form. Its exact
   target and copy are for the spec.
4. **Accessibility (§2.5).** The list, the opened note, loading, empty and
   error states, and moving between list and note all get proper
   structure, focus handling and live-region announcements where needed.
5. **No new colours (§2.4).** The selected or opened note is shown
   without a new colour token.
6. **Guards are changed deliberately (§3.4).** The UI now calls the
   repository's `list` and `get` as well as `create`. That changes
   `create-note` R27 and AC-37 ("only `create` is called"), and `create-note`
   R26 ("nothing touches storage on load"). These go in the spec's
   "Changes to earlier specs" table. They are not loosened silently.
   The storage boundary (UI imports only `src/storage/index.ts`, with
   its pinned export list) stays exactly as it is.
   `project-foundation` AC-33 is also affected, and that change goes to
   the owner (Owner decisions, item 1).
7. **No new dependencies (§3.2).** The list is built with React and the
   platform only.
8. **Real-browser checks (§4.1).** Checking the list against the real
   notes on the live site (including the A8 notes) in desktop Chrome and
   Safari, and a VoiceOver pass, are manual ship checks. Agents never
   mark them as passed.
9. **Release (§4.2, §4.3).** Branch and PR into `main`, merge only when
   CI is green.
10. **Privacy in the repo (§5.1).** The owner appears only as
    "AITechie".

## Rough shape (optional)
Hunches only. The spec and plan will confirm or replace them.

- The app shell renders the form first, as today. The list loads after
  the first render through `getNoteRepository().list()`, which already
  returns notes in the right order (`note-storage` R17) and is designed
  for 1,000 notes in one read (`note-storage` R39, AC-40). Opening a note
  could use `get(id)`, so a note deleted in another tab gives a clear
  "not found" instead of stale text.
- `list()` opens the database lazily (`note-storage` R25), and the first
  open creates the empty `quicknotes` database. That is why
  `project-foundation` AC-33 can't stay as written. Listing doesn't call
  `persisted()` or `persist()` (`note-storage` R31), so no browser
  permission prompt appears on load.
- The static info text from `create-note` ("Your notes are saved on this
  device" / "They stay in this browser and are never sent anywhere.")
  may need to move or merge with the list's heading or empty state. The
  spec decides, and keeps it true.
- Rendering 1,000 entries, and a 100,000-character body, without a
  virtualisation library needs a performance check in a real browser
  (Playwright). The `note-storage` budget was measured in an in-process
  database, not in a browser.

## Owner decisions (AITechie, 2026-10-09)
Both questions raised under product/decisions.md §1.2 were answered with
the recommended option.

1. **`project-foundation` AC-33 is revised on purpose.** On a fresh load
   the app may create the empty `quicknotes` database and read from it.
   A fresh load still:
   - creates no note record;
   - leaves `localStorage`, `sessionStorage`, cookies and Cache Storage
     empty;
   - makes no `navigator.storage.persisted()` or `persist()` call;
   - makes no network request.
   The revised test checks exactly these points. It goes in the spec's
   "Changes to earlier specs" table. There is no check for whether the
   database exists before reading.
2. **Layout and flow.**
   - The "New note" form comes first, with a "Your notes" section below
     it. The form stays first, so "ready to type" doesn't change.
   - Selecting a note replaces the main content with a read-only view of
     that note. The view has a visible "Back to notes" control. Going
     back shows the form and list again and puts focus on the note that
     was opened.
   - Opening a note adds a browser history entry. Its URL hash holds only
     the note's id, never its text. The browser's Back button returns to
     the list, and reloading that URL reopens the same note.
   - Unsaved text in the form is never lost by opening a note. The spec
     decides how.

## Open questions
None. Both owner questions were answered on 2026-10-09 (see Owner
decisions above).
