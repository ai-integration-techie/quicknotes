# Intent: Note storage (note model and local repository)

- Status: draft
- Slug: note-storage
- Jira: none
- Owner: AITechie
- Date: 2026-10-07

## Problem
QuickNotes is live at `https://ai-integration-techie.github.io/quicknotes/`,
but it can't hold a single note. Nothing in the app defines what a note
is, and nothing can save one, read it back, change it, remove it or list
them. Each of the next four features (`create-note`, `list-notes`,
`edit-note`, `delete-note`) and later `search-notes` needs exactly that.
Without one shared foundation, each of them would invent its own way of
saving notes.

The person who feels this is AITechie, the only user. They can't start
the charter's adoption goal (4 weeks of daily use instead of their
current tool) until notes can be kept. They are also the solo developer,
and without this layer they would have to build storage into every UI
feature.

There is also a data-loss risk that the charter names. Notes live only
in one browser profile. The browser may evict them under storage
pressure, and clearing site data erases them. v1 has no export or
backup, so a lost note can't be recovered. The owner has accepted this
risk for v1 (decision 1).

## Why now
- It is next in the charter's feature breakdown, after
  `project-foundation` and `pages-deploy`, which have both shipped.
- Every remaining note feature depends on it. None of them can start
  until it exists.
- The charter asks this slug to request persistent storage, which is the
  only v1 protection against the browser silently evicting notes. That
  protection should be in place before the first real note is written,
  not added after.
- The way notes are stored is the hardest thing to change later. Notes
  written by early versions must still open in later versions, so the
  shape should be settled before there is real data to migrate.

## Desired outcome
Described as behaviour. The data shapes and interfaces belong to the
spec and plan.

- **A note** has a stable unique identity, a title, a plain-text body,
  the time it was created and the time it was last changed.
- **Field rules (decision 3):** the title can be up to 200 characters
  and the body up to 100,000 characters. Either one may be empty, but
  not both. Text is stored exactly as typed, with no trimming, and read
  back unchanged, including line breaks, whitespace, emoji and
  non-Latin scripts. A note that breaks these rules is rejected with a
  clear error and nothing is saved.
- **Create:** the app can save a new note and gets back the saved note,
  with its identity and both times filled in.
- **Read:** the app can fetch one note by its identity. Asking for a note
  that doesn't exist gives a clear "not found" result, not a crash.
- **Update:** the app can change a note's title and body, under the same
  field rules. The "last changed" time moves forward. The "created" time
  and the identity never change.
- **Delete (decision 4):** the app can remove a note, and it is really
  removed from storage. After that it no longer appears when read or
  listed. Any undo is up to `delete-note`.
- **List:** the app can get all notes, with enough information to show
  them most recently changed first, which is what `list-notes` needs.
- **Notes persist.** A saved note is still there after a page reload, a
  browser restart, a device restart and a new deploy of the app.
- **Notes never leave the device.** Saving or reading a note makes no
  network request of any kind. There is no server, no sync and no
  telemetry about note content.
- **Storage starts lazily (decision 8).** Nothing touches the browser
  database when the app loads. The database is opened only the first
  time notes are saved or read. So the `project-foundation` privacy
  check that no IndexedDB database exists after a fresh load (AC-33)
  stays unchanged and keeps passing.
- **Persistent storage is requested on the first save, never on page
  load (decision 2).** If the browser denies it or doesn't support it,
  notes still save normally. On later launches, the app asks again
  until it's granted. Once granted, it stops asking.
- **Persistence state is exposed, not shown (decision 7).** Storage can
  report whether it is persistent. Whether to show the user a notice is
  for a later UI slug. This slug shows nothing.
- **Failures are typed, visible and never silent (decision 5).** If the
  browser blocks storage (for example in some private-browsing modes),
  the storage is full, or a save fails, the calling feature gets a
  clear error whose kind it can tell apart and show. There is no
  fallback, not even session-only storage. The caller is never told a
  save succeeded when it didn't.
- **Two tabs (decision 6):** if the same note is changed in two open
  tabs, the last save wins. Other tabs may show old data until they are
  reloaded.
- **Storage sits behind a boundary that doesn't depend on IndexedDB**,
  as the charter's architecture note requires. The rest of the app,
  and its tests, use notes without knowing how they're stored. That
  keeps the features testable and leaves room for sync later without a
  rewrite.
- **Fast enough for search later.** Listing about 1,000 notes is quick
  enough that `search-notes` can still meet the charter's under-100 ms
  target over 1,000 notes.
- **The live app looks the same as today.** This slug adds no screens,
  buttons or messages, and every existing quality-gate check, including
  the `project-foundation` privacy checks, keeps passing unchanged.

## Non-goals
- Any UI to create, list, open, edit or delete notes. Those are
  `create-note`, `list-notes`, `edit-note` and `delete-note`.
- Search and filtering by query (`search-notes`).
- Any on-screen message about storage, persistence, eviction risk or
  errors. Showing these belongs to the feature that owns the screen.
- Undo for delete, and any "trash" or soft-delete in storage. Undo, if
  any, is decided in `delete-note`.
- Any fallback when storage is blocked or full, including session-only
  or in-memory storage for the live app.
- Keeping tabs in sync with each other, or detecting conflicting edits
  between tabs.
- Theme preference storage (`theme-mode`).
- Offline caching of the app itself, service workers or the manifest
  (`pwa-offline`).
- Export, import, backup or restore. The charter excludes them from v1,
  and the owner has kept it that way (decision 1).
- Sync across devices, browsers or tabs through any server, and any
  account or multi-user support.
- Tags, folders, pinning, archiving, rich text, attachments or any field
  beyond title, body, identity and the two timestamps.
- Any server, backend, paid service or third-party network call.

## Owner decisions (AITechie, 2026-10-07)
These answer the questions raised on the first draft and are inputs to
the spec.
1. **Data-loss risk:** accepted for v1. Export stays out of scope, as
   the charter says. Revisit after v1.
2. **Persistent storage:** request it on the first save, not on load. If
   it's denied or unavailable, notes still save normally, and the app
   asks again on each later launch until it's granted.
3. **Fields:** the title may be up to 200 characters and the body up to
   100,000. Either may be empty, but not both. Text is stored exactly as
   typed, with no trimming.
4. **Delete:** a real delete in storage. Any undo is decided in
   `delete-note` (for example by keeping the note in memory briefly).
5. **Storage blocked or full:** a clear, typed error the UI can show,
   with no fallback (not even session-only).
6. **Two tabs:** last save wins for v1. Other tabs may show stale data
   until reloaded.
7. **Non-persistent warning:** storage exposes whether it's persistent,
   and a later UI slug decides whether to show a notice. No UI in this
   slug.
8. **Go-live:** lazy. The database opens and persistence is requested
   only on first use, so `project-foundation`'s "no IndexedDB on fresh
   load" privacy check (AC-33) stays unchanged.
9. **Technical choices left to the spec and plan:** `idb` or the raw
   IndexedDB API, the identity and timestamp formats, the database name
   and future migrations, and the sort order of list.

## Rough shape (optional)
Not a commitment. The spec and plan decide.
- A small note model plus a repository interface with create, read,
  update, delete and list, and an IndexedDB-backed implementation behind
  it. An in-memory implementation of the same interface would let later
  UI features test without a real browser database. It would be a test
  aid only, not a fallback for the live app (decision 5).
- Any wrapper library (for example `idb`) must meet `project-foundation`
  R5 (free, OSI-licensed) and add no network calls.
- How "characters" are counted for the 200 and 100,000 limits (for
  example whether an emoji counts as one) is for the spec to pin down.

## Open questions
None for the owner. The 2026-10-07 decisions answer all nine questions
from the first draft.

One reading for the spec to confirm, so the spec doesn't guess:
decision 2 says persistent storage is requested on the first save, and
decision 8 says on first use (the first save or read). This intent
records the stricter reading. The database opens on the first save or
read. Persistence is requested at the first save. On later launches,
until it's granted, the app asks again at the first save of that launch,
never on page load. If the owner meant "first read" too, the spec should
say so.

Technical choices left to the spec and plan (decision 9):
- Using a wrapper library such as `idb` or the raw IndexedDB API.
- The identity format, how times are recorded, the database and store
  names, and how stored data will be versioned and migrated in future.
- Whether "list" returns notes already sorted or leaves sorting to the
  caller.
