# Intent: Search notes

- Status: Approved
- Slug: search-notes
- Jira: none
- Owner: AITechie
- Date: 2026-10-09

## Problem
Once `list-notes` and `edit-delete-note` ship, the user can see every
saved note in "Your notes", newest update first, and open, edit or
delete one. The only way to find a particular note is to scroll the list
and read titles and previews. That works for a dozen notes. It does not
work for hundreds. The list deliberately has no paging, so at the
charter's scale of 1,000 notes, finding one note means scrolling through
up to 1,000 entries. A note whose title is blank ("Untitled note"), or
whose words sit deep in the body past the 100-character preview, can't
be recognised from the list at all.

The person who feels this is AITechie, the only user, every time they
come back for something they wrote earlier. The charter's vision is that
QuickNotes "lets you find any note instantly", and one of its three
success metrics is "search returns results in under 100 ms over 1,000
notes". The note tool AITechie uses today has search. Without it,
QuickNotes can't replace that tool for daily use, so the adoption goal
(daily use for 4 weeks) can't be met.

## Why now
- It is next in the charter's feature breakdown, after `list-notes` and
  `edit-delete-note`, and before `theme-mode` and `pwa-offline`. The
  charter's v1 scope includes "Search across both title and body".
- It is the only charter success metric not yet owned by a shipped or
  in-flight slug. `note-storage` explicitly left the real under-100 ms
  check over 1,000 notes to this slug (`note-storage` open question 7,
  review A7).
- The thing it filters now exists: `list-notes` (approved, being built)
  reads every note once per page load and keeps the list in memory.
  Search can build on that without changing storage.
- Every week of daily use adds notes, and the list only gets harder to
  scan.

**Dependencies.** This slug filters the "Your notes" list from the
approved `list-notes` spec and must stay correct as notes are edited and
deleted by `edit-delete-note`, which is being specified now. The spec for
this slug must reconcile with the approved `list-notes` spec and with
`edit-delete-note` as approved. Where they disagree, the approved
earlier spec wins and this slug's spec records the difference.

## Desired outcome
Described as behaviour, not implementation.

- **One search field on the list.** In the list view, "Your notes" has a
  clearly labelled search field above the list. The "New note" form
  still renders first, and focus on load still goes to Title
  (`create-note` R2, `list-notes` R2). Search never takes focus on its
  own.
- **Filters as the user types.** As the user types, the list narrows to
  the notes that match, with no button to press and no Enter needed.
  Each result looks exactly like a normal list entry (title or "Untitled
  note", preview, "Updated …") and opens the note in the same way.
- **Over title and body.** A note matches when the query is found in its
  title or its body, as stored. The display stand-ins ("Untitled note",
  the shortened preview, "Updated …") are not searched. Matching
  ignores case and accents, and a note matches when every word of the
  query appears in its title or body, in any order and as part of a
  word (Owner decisions, item 1).
- **Same order as the list.** Matching notes keep the list's order, most
  recently updated first. There is no relevance ranking.
- **Fast at the charter's scale.** With 1,000 notes, the list shows the
  right results in under 100 ms after each keystroke, and typing in the
  field never stutters or drops characters. The spec defines exactly
  what is measured and on which notes.
- **Easy to clear.** Clearing the field (deleting the text, or a clear
  control) shows the full list again, exactly as `list-notes` shows it.
  A query that is empty or only spaces filters nothing.
- **Honest when nothing matches.** If no note matches, the user sees a
  plain "no matching notes" message that names nothing private beyond
  what they typed, and a way to clear the search. If the user has no
  notes at all, they see the `list-notes` empty state, not a search
  message.
- **Not hidden by a failure.** If the list couldn't be loaded, the
  `list-notes` failure message stays as it is. Search does not pretend
  to work over notes it doesn't have (per product/decisions.md §2.3).
- **Survives opening a note.** Opening a result and coming back (with
  "Back to notes" or the browser's Back button) returns to the same
  query and the same filtered list, with focus on the note that was
  open, as `list-notes` does for the full list. The query lives in
  memory only and is not kept in the URL, so a reload, a new tab or a
  bookmark starts with an empty search (Owner decisions, item 2).
- **List stays true while searching.** A note saved with the form, an
  edit, or a delete made while a query is active shows up correctly in
  the filtered list straight away, without a reload: it appears if it
  matches and doesn't if it doesn't.
- **Every character works.** Queries and notes in any script, with
  emoji, line breaks or tabs, match correctly. Nothing splits a
  character, and pasting a long query is fine.
- **Same quality bar.** WCAG 2.1 AA, fully usable by keyboard and screen
  reader, the number of results announced politely as the user types
  without interrupting them, 360px phone to desktop, the existing look
  (zinc greys, one `blue-700` accent, the visible focus outline, no
  animations) and the existing copy tone.
- **Privacy holds.** Searching makes no network request and writes
  nothing anywhere: not to IndexedDB, `localStorage`, `sessionStorage`,
  cookies or Cache Storage. The query and note text never go to the
  console or into an error message.

## Non-goals
- Highlighting the matched words, or showing a snippet of the body
  around the match instead of the normal preview (per
  product/decisions.md §2.7, defer extras).
- Fuzzy or typo-tolerant matching, stemming, synonyms, regular
  expressions or search operators (quotes, `-`, `OR`, field prefixes).
- Relevance ranking or any sort other than most recently updated first
  (`list-notes` non-goal).
- Search history, recent or saved searches, or suggestions.
- A keyboard shortcut to jump to the search field (for example `/` or
  Cmd/Ctrl+K). The field is reachable by Tab; a shortcut can come later
  (§2.5, §2.7).
- A separate search page or screen, or searching from the note view.
- Searching anything other than title and body (dates, ids).
- Changing the storage layer: no new index, no query API, no schema
  version bump. Search works over the notes the list already holds
  (`note-storage` non-goal: `list()` is the only read-all operation).
- Re-reading storage on each keystroke, or live updates from other tabs
  (`list-notes` R3, `note-storage` R35).
- Paging, "load more" or virtualisation of results (`list-notes` R4).
- Tags, folders, pinning, rich text, Markdown, attachments, export,
  import, sync or accounts (charter).
- Light/dark mode (`theme-mode`), service worker and offline install
  (`pwa-offline`).
- New runtime dependencies, including search libraries (§3.2).

## Decisions applied from product/decisions.md
These are not open questions. They fit every standing decision and are
accepted as proposed per product/decisions.md §1.1, so the spec carries
them.

1. **Filter as the user types (charter, §2.1).** The charter's breakdown
   says "as the user types", so there is no Search button. This is not
   autosave: searching saves nothing.
2. **Placement (§1.1).** The search field sits inside the existing "Your
   notes" section, above the list, in the list view only. No new screen,
   view or route. Focus on load stays in Title.
3. **No errors while typing (§2.2).** Any query is valid. There is no
   validation message. The only messages are "no matching notes" and
   the existing `list-notes` failure states.
4. **No silent fallbacks (§2.3).** When the list failed to load, search
   does not show an empty result as if nothing matched. The spec decides
   whether the field is hidden or disabled in that state.
5. **No new colour (§2.4).** The field, the "no matching notes" state
   and any clear control use the zinc greys and the one accent.
6. **Accessibility first (§2.5).** A visible label, a real search field,
   a polite announcement of the result count (not on every keystroke if
   that would flood a screen reader; the spec sets the rule), and
   predictable focus. This adds a live region to "Your notes", which
   `list-notes` R29 and AC-43 forbid today, so they are revised (item 9).
7. **In memory, over the list already loaded (§1.1, §3.2).** Search
   filters the notes `list-notes` read once on load, kept up to date by
   saves, edits and deletes. No new storage reads, no storage change, no
   index and no library.
8. **Platform text handling (§3.3).** Case and accent folding (Owner
   decisions, item 1) uses the platform's own Unicode support, not a
   wrapper library. Characters are Unicode code points, as everywhere
   else (`note-storage` R4).
9. **Guards changed deliberately (§3.4).** `create-note` AC-1 and
   `list-notes` AC-1 assert "no searchbox anywhere on the page", and
   `list-notes` R4 says the UI never filters notes, R29 and AC-43 forbid
   live-region text in "Your notes" except a load failure. This slug's
   spec revises each of these in a "Changes to earlier specs" table and
   loosens nothing else. The storage boundary (UI imports only
   `src/storage/index.ts`, with its pinned export list) stays as it is.
10. **Performance check (§4.1).** The under-100 ms budget is checked
    automatically in headless Chromium against the production build,
    with the same 1,000-note seed `list-notes` uses (60-character titles,
    2,000-character bodies), unless the spec justifies another. Checks on
    a real device are manual ship checks that agents never mark passed.
11. **Platform limits (§2.6).** Browser-provided extras on search fields
    (a built-in clear button in some browsers, the iOS keyboard's
    "Search" key) vary by browser and are accepted, not worked around.
12. **Release (§4.2, §4.3) and privacy in the repo (§5.1).** Branch and
    PR into `main`, merge only when CI is green. The owner appears only
    as "AITechie".

## Rough shape (optional)
Hunches only. The spec and plan will confirm or replace them.

- A labelled `<input type="search">` at the top of "Your notes", with a
  polite status line under it ("3 notes match" / "No notes match").
- A pure function, independent of IndexedDB and React (charter
  architecture note), that takes the query and the in-memory notes and
  returns the matching ones in order. It can be unit-tested and timed on
  its own.
- Fold each note's title and body once, when the list loads or a note
  changes, and fold the query on each keystroke, so a keystroke is a
  plain substring check per note. At 1,000 notes of 2,000 characters
  that is about 2 million characters per keystroke, well within budget.
- Keep the query in the same in-memory app state that keeps the form
  text while a note is open (`list-notes` R26), so Back returns to it.
- Possibly defer rendering the filtered list behind the input (React's
  deferred value) so typing never waits on 1,000 list items.

## Owner decisions (AITechie, 2026-10-09)
Both questions raised under product/decisions.md §1.2 were answered with
the recommended option.

1. **How a query matches** (§1.2: a visible product choice).
   - Matching ignores case and accents ("cafe" finds "Café").
   - The query is split into words. Leading, trailing and repeated
     spaces are ignored.
   - A note matches when every word appears in its title or body, in
     any order and as part of a word ("shop list" finds "Shopping list"
     and "list for the shop").
   - Rejected: an exact-phrase match, and a case-only match where
     accents must match.
2. **The query is not kept in the URL** (§1.2: what is stored and who
   can see it).
   - The query lives in memory only. Nothing about it goes into the
     address, `history.state`, browser history or bookmarks, in line
     with `list-notes` R25.
   - It survives opening a note and coming back with "Back to notes" or
     the browser's Back button.
   - It does not survive a reload. A reload, a new tab or a bookmark
     starts with an empty search.

## Open questions
None. Both owner questions were answered on 2026-10-09 (see Owner
decisions above).

Risks recorded for the spec (no owner answer needed, per §2.6):
- **Large bodies.** Notes can hold up to 100,000 characters. The 100 ms
  budget is checked on the agreed 1,000-note seed (decision 10). A
  library made mostly of very long notes could be slower; the spec
  should record this rather than promise it.
- **Screen-reader chatter.** Announcing a count while the user types
  can interrupt them. The spec must set when the count is announced,
  and the manual VoiceOver pass confirms it.
- **Built-in clear buttons and Escape** behave differently across
  browsers on search fields (decision 11). The spec should not depend on
  them as the only way to clear.
