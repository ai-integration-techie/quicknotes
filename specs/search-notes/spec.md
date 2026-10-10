# Spec: Search notes

- Status: Approved
- Slug: search-notes
- Intent: [intent.md](./intent.md)
- Jira: none
- Owner: AITechie
- Reviewers: AITechie (Product Owner, Tech Lead)
- Date: 2026-10-09

<!-- Status values: draft -> approved -> superseded.
     Do not move to "approved" without a human sign-off in the Approval
     section below. A spec with open questions cannot be approved. -->

## Summary
"Your notes" gets one labelled search field, "Search notes", between its
heading and the list. As the user types, the list narrows to the notes
that have every word of the query somewhere in their title or body,
ignoring case and accents, in the list's usual order. Results are normal
list entries. A polite status line under the field says how many notes
match, after the user pauses typing. A clear button and Escape bring the
full list back. When nothing matches, "No matching notes" says so. The
query is kept in memory only: it survives opening a note and coming back,
but never goes into the URL or storage, and a reload starts empty. The
field only appears once there are notes to search, so the empty and
failure states stay exactly as `list-notes` shows them. Over 1,000 notes,
each keystroke shows its results in under 100 ms (the charter's search
metric).

This spec builds on the approved `list-notes` spec (shipped) and the
draft `edit-delete-note` spec, and **deliberately changes** a few of their
items and `create-note` AC-1. See "Changes to earlier specs".

## Changes to earlier specs
Once this spec is approved, the items below take precedence over the
items they name. This slug does not edit those slugs' own artifacts
(`spec.md`, `plan.md`, `review.md`). Only code and tests change (per
product/decisions.md §3.4). Where this table names an `edit-delete-note`
item, it refers to that spec's draft of 2026-10-09; if the approved
version differs, the approved version wins and this table is updated
before this spec's plan is approved.

| Earlier item | What it says today | Replaced by (this spec) |
|---|---|---|
| `create-note` AC-1 (as already revised by `list-notes` AC-1) | No searchbox or checkbox anywhere on the page | Inside the "New note" section: unchanged (exactly 2 textboxes, 1 button, no link, no searchbox). On the page: exactly one searchbox, "Search notes", inside "Your notes", present only when the list has loaded with at least one note (R1, R2). Still no checkbox anywhere. Checked by AC-1 here. |
| `list-notes` AC-1 | "There is no searchbox or checkbox on the page" | AC-1 here: with the list loaded with two notes, the page has exactly one searchbox ("Search notes", inside "Your notes"), no checkbox, and no "Clear search" button while the query is empty. All other AC-1 checks (DOM order, headings, the "New note" section contents) are unchanged. |
| `list-notes` R4 ("The UI MUST NOT re-sort, filter or drop notes (except as R21 states)") | The list always shows every loaded note | With a blank query (R6), unchanged: every note, in `list()` order. With a non-blank query, the list shows only the matching notes (R7, R11), still in `list()` order. The UI still never re-sorts. "Every note MUST be in the DOM at once" now reads: every **matching** note is shown at once; no paging, "load more" or virtualisation. Non-matching notes may stay in the DOM only if hidden from sight, Tab and assistive technology (R11). |
| `list-notes` R29 and AC-43 (one alert region, used only for a load failure; nothing else in "Your notes" is announced), as already revised by `edit-delete-note` R35 and AC-38 (plus one status region for "Note deleted.") | At most those two live regions in the section | The section also contains the search status region (R15), rendered only together with the search field, used only for the match count. The load-failure alert region and the delete status region are unchanged. With a blank query the search status region stays empty, so AC-43's "nothing announces loading, a loaded list, the empty state or a saved note" still holds. AC-17 here replaces `list-notes` AC-43 for the search region. |
| `list-notes` AC-17 and `edit-delete-note` AC-38 ("exactly one `role="alert"`" / "exactly one `role="status"` and one `role="alert"`" in the section) | Counted with `list()` pending | Unchanged: they are checked with `list()` pending, when the search area (and its status region) is not rendered (R2). After the list loads with notes, the section has one more `role="status"` (the search status, inside or right after the `role="search"` element). `edit-delete-note` AC-38's later checks apply to the delete status region, which tests select by position (directly below the `<h2>`) or by a test id the plan names, not by "the only status". |
| `list-notes` R24 (focus on return goes "to the link of the note that was open if it's in the list at that moment") | "The list" = all notes | "The list" means the list **as shown**, under the current query (R17). If the opened note is in memory but filtered out, focus goes to the "Your notes" `<h2>`. The same reading applies to `edit-delete-note` R19 and R20 ("Discard changes" → focus on the note's link if it is in the list). |
| `list-notes` R28 and AC-42 (skip link; "the next Tab focuses the note's link") | After the skip link, the next Tab reaches the first note | Activating the skip link still moves focus to the "Your notes" `<h2>` (unchanged). The next Tab now focuses the "Search notes" field (when shown), and the first note link follows the field (and "Clear search", when shown). AC-23 here replaces AC-42's last clause; the rest of AC-42 is unchanged. |
| `list-notes` Accessibility, Keyboard ("Tab order in the list view: skip link → Title → Note → Save note → each note link") | No search stop | Skip link → Title → Note → Save note → Search notes → Clear search (only while the field has text) → each shown note link (R24). |
| `list-notes` States table ("List: loaded") | One loaded state | Split into the search states in this spec's States table (no query, results, no matches). "List: loading", "empty" and "load failed" are unchanged and have no search field. |
| `list-notes` Non-goals ("Search, filtering … (`search-notes`)") | Out of scope | Search and filtering by query are this slug. Re-sorting and user-selectable sorts stay out of scope. |

These are **not** changed and keep passing as they are:
- the storage boundary: `create-note` R29-R31 and AC-43 to AC-46, `list-notes` R37 and AC-54, `note-storage` AC-51 and AC-53 (UI imports only `src/storage/index.ts`; its export list is pinned);
- `list-notes` R1 (the only `<h2>`s in the list view are "New note" and "Your notes"; this slug adds no heading), R2 (focus on load in Title; loading never moves focus), R3 (one `list()` per page load), R5-R9 (item content), R10-R13 (loading, empty and failure states), R14 (refresh after a save), R25 (nothing in the URL, `document.title` or `history.state` but the id), R26 (form state kept in memory), R34 (load performance) and every acceptance criterion not named above;
- `edit-delete-note` R28 (after a delete, focus on the "Your notes" `<h2>`), R32-R35 (list updates in memory), R41 (repository calls);
- every `create-note` requirement for the "New note" form, including R25 ("Leave site?" only for unsaved note text);
- every `note-storage` requirement. Search reads nothing from storage.

## Decisions applied
Settled by the intent's Owner decisions (AITechie, 2026-10-09), or
accepted as proposed per product/decisions.md §1.1 because they fit every
standing decision. None of them is an open question.

1. **Matching** as the owner decided (Owner decisions item 1): case- and accent-insensitive, the query split into words, every word found in the title or the body, in any order, as part of a word (R5-R7).
2. **The query lives in memory only**, survives opening a note and coming back, and is gone after a reload (Owner decisions item 2; R16, R17).
3. **Filter as the user types**, no Search button (charter breakdown; §2.1). Searching saves nothing.
4. **Placement:** inside "Your notes", between its heading and the list, list view only. No new screen, route or heading (§1.1). Focus on load stays in Title (R3).
5. **No validation** (§2.2): every query is valid; the only messages are the count, "No matching notes", and the existing `list-notes` states.
6. **Hidden, not disabled, when there is nothing to search** (§2.3; intent decision 4). While the list is loading, empty or failed, the search field isn't rendered, so search never pretends to work over notes it doesn't have, and the `list-notes` states show exactly as before (R2). A disabled field would be a control that can't do anything, with no message saying why.
7. **No new colour** (§2.4): the field copies the "New note" field style; "Clear search" uses the `edit-delete-note` secondary button style (R21).
8. **Accessibility first** (§2.5): a visible label, a real `type="search"` field inside a `search` landmark, a polite count announced 500 ms after typing pauses (not on every keystroke), predictable focus, Escape as an addition to the visible clear button (R13, R15).
9. **In memory, over the list already loaded** (§1.1, §3.2): no new storage read, no index, no library. Matching is a pure function, independent of React and IndexedDB (charter architecture note; R8).
10. **Platform text handling** (§3.3): case and accent folding use `String.prototype.normalize` and `toLowerCase` (R5).
11. **Guards changed deliberately** (§3.4), in the table above. The storage boundary is untouched.
12. **Performance check** (§4.1): automated in headless Chromium against the production build, with the `list-notes` 1,000-note shape (60-character titles, 2,000-character bodies) plus fixed marker words so results can be checked (R25). Real-device checks are manual ship checks agents never mark passed.
13. **Platform limits accepted** (§2.6): the browser's own clear button in search fields, Escape's built-in behaviour and the iOS keyboard's "Search" key vary by browser; the app doesn't depend on them (R13).
14. **Defer extras** (§2.7): no highlighting, snippets or shortcut.
15. **Release** by branch and PR into `main`, merge on green CI (§4.2); the owner appears only as "AITechie" (§5.1).

## User stories
- US-1: As the user (AITechie), I want to type a few words into one search field above my notes and see the list narrow as I type, so that I can find a note without scrolling.
- US-2: As the user, I want matching to ignore case and accents and to find my words in any order, anywhere in the title or the text, so that I find a note even when I don't remember its exact wording.
- US-3: As the user, I want each result to look and open exactly like a normal list entry, in the usual newest-first order, so that there is nothing new to learn.
- US-4: As the user with 1,000 notes, I want results in under 100 ms and typing that never stutters, so that search feels instant.
- US-5: As the user, I want to clear the search with a button, Escape, or by deleting the text, and get my full list back, so that searching is never a dead end.
- US-6: As the user, I want a plain message when nothing matches, and the usual empty or failure message when there are no notes to search, so that I'm never misled.
- US-7: As the user, I want my search to still be there after I open a note and come back, but never saved in the address or on the device, so that browsing results is quick and my searches stay private.
- US-8: As the user, I want notes I save, edit or delete while searching to show up correctly in the results straight away, so that the results are always true.
- US-9: As a keyboard or screen-reader user, I want a labelled field, a count announced without interrupting my typing, and sensible focus, at WCAG 2.1 AA from 360px to desktop, so that search works for me as well as anyone.
- US-10: As the user, I want searching to send nothing over the network and store nothing anywhere, so that the charter's privacy promise holds.
- US-11: As the developer, I want every earlier guard this slug changes to be revised on purpose and named, with the storage boundary untouched, so that the test suite stays trustworthy.

## Requirements
Terms: **the loaded list** is the notes the app holds in memory for
"Your notes" (`list-notes` R4, R14, R21; `edit-delete-note` R32, R33), in
their order. **The query** is the search field's current value. **The
shown list** is what "Your notes" displays in the list view.

### The search field
- R1: When the "Your notes" list has loaded and holds at least one note, the section MUST contain, after the `<h2>` and the section's existing message regions and before the list (or the no-match state, R14), a **search area**: one element with `role="search"` (or the `<search>` element) holding, in DOM and Tab order:
  - a visible `<label>` "Search notes" associated with
  - an `<input type="search">` (role `searchbox`, accessible name "Search notes") with `autocomplete="off"` and no `maxlength`, `required`, `pattern` or `placeholder`;
  - only while the field's value is not `""`, a `<button type="button">` "Clear search".

  Directly after the search area (or as its last child) is the search status region (R15). The search area MUST contain no other control. It MUST NOT be inside a `<form>` (so nothing can submit it).
- R2: The search area and its status region MUST NOT be rendered while the list is loading (`list-notes` R10), in the empty state (R11) or after a load failure (R12, R13); those states MUST look and behave exactly as `list-notes` specifies. If the loaded list becomes empty (for example the last note is deleted, or found gone), the search area MUST be removed, the query MUST be reset to `""`, and the `list-notes` empty state shows. When a note is later saved, the search area appears again, empty.
- R3: The search field MUST never take focus on its own: not on load, not when it first appears, not when the list changes, and not on returning from a note. Focus on load stays in Title (`create-note` R2, `list-notes` R2). Only a user action moves focus into it (Tab, click, tap, or "Clear search", R13).
- R4: This slug MUST NOT change the "New note" section, the info text, the header, the skip link's text or target, or add any heading.

### Matching
- R5: **Folding.** Matching MUST compare folded text, where `fold(s)` behaves exactly as `s.normalize("NFD").replace(/[̀-ͯ]/gu, "").toLowerCase().normalize("NFC")`: decompose, remove the Combining Diacritical Marks block (U+0300 to U+036F), lower-case (locale-independent), recompose. So "Café", "CAFE", "café" (decomposed) and "cafe" all fold to "cafe"; "İstanbul" folds to "istanbul"; "Việt" to "viet"; text in other scripts is kept apart from its case (for example Hangul syllables stay whole). No other folding is done (no width folding, no "ß" to "ss", no ligature expansion).
- R6: **Words.** A query is **blank** when it matches `/^\s*$/u` (including `""`, spaces, tabs, line breaks and U+00A0). Otherwise its **words** are the query with both ends trimmed, split on `/\s+/u`. Repeated words are allowed and change nothing.
- R7: **A match.** A note matches a non-blank query when, for every word `w`, `fold(title)` contains `fold(w)` as a substring or `fold(body)` contains `fold(w)` as a substring, where `title` and `body` are the note's stored strings. Words may be found in different fields, in any order, and inside longer words ("shop" matches "Shopping"). A word never matches across the title and body boundary. Every character in a word is literal: there are no operators, quotes, wildcards or regular expressions. The display stand-ins ("Untitled note", the preview and its "…", "Updated …" and the time) are never searched.
- R8: Matching MUST be a pure function in its own module, which imports neither React nor any IndexedDB code (only the `Note` type from `src/storage/index.ts`). It takes the query and the loaded list and returns the matching notes in the same order, without changing its inputs. It MAY cache folded text per note (for example keyed by note object), as long as results always match R5-R7 for the current notes.
- R9: Matching MUST accept any string without throwing, including lone surrogates, control characters, regular-expression characters (`.*+?^${}()|[]\`) and strings of any length. It MUST NOT split a code point it returns or displays (it displays nothing of its own).

### Filtering
- R10: With a blank query, the shown list MUST be exactly the `list-notes` list: every note in the loaded list, in order, with items exactly as `list-notes` R5-R8, and the search status region MUST be empty.
- R11: With a non-blank query, the shown list MUST be the notes in the loaded list that match (R7), in the loaded list's order, with no ranking or re-sorting. Each shown item MUST be exactly the item `list-notes` R5-R8 renders for that note (same link, `href`, accessible name and description). Notes that don't match MUST NOT be visible, focusable, or exposed to assistive technology; the list exposed to assistive technology MUST have exactly one item per matching note. If there are no matches, R14 applies.
- R12: The shown list MUST follow every change of the field's value (typing, deleting, paste, cut, undo, an IME composition once committed, the browser's own clear button) with no button and no Enter. While an IME composition is in progress the app MAY wait for `compositionend`. Pressing Enter in the field MUST NOT submit anything, navigate, reload, change the URL or history, or move focus.
- R13: **Clearing.**
  - Activating "Clear search" (click, tap, Enter or Space) MUST set the field's value to `""`, show the full list (R10), empty the search status region at once, and move focus to the search field (the button itself then disappears, R1).
  - Pressing Escape in the field while its value is not `""` MUST do the same, with focus staying in the field, and MUST call `preventDefault()` on the event.
  - Pressing Escape in the empty field MUST do nothing (no `preventDefault()`).
  - Deleting all the text (or leaving only whitespace) shows the full list as R10.
- R14: **No matches.** With a non-blank query and no matching note, the section MUST show, in place of the list, "No matching notes" (primary) and "Try fewer or different words, or clear the search to see all your notes." (secondary), and no element with role `list`. Neither text is in a live region (the count is announced by R15). This state MUST NOT show with a blank query, while loading, when the loaded list is empty, or after a load failure.
- R15: **Search status.** The section MUST contain one `role="status"` region (polite) for search, rendered with the search area and empty when it first appears. With a non-blank query, its text MUST be set to the count copy for the shown list ("1 note matches", "{n} notes match" with en-US thousands separators, or "No notes match") **500 ms** after the last change to the query or to the shown list; every further change within that time restarts the wait. When the query becomes blank, the text MUST be emptied at once and any pending update cancelled. The region holds no other text. The 500 ms delay is one named constant.

### Keeping the query
- R16: The query MUST be kept in memory only. It MUST NOT be written to the URL, `history.state`, `document.title`, IndexedDB, `localStorage`, `sessionStorage`, cookies or Cache Storage, and MUST NOT be logged. After a reload, in a new tab or window, or at a bookmarked or typed URL, the search field MUST start empty and the full list shows. (`autocomplete="off"` also stops browsers restoring the field's value on reload.)
- R17: Opening a note (`list-notes` R16) and returning to the list view (the "Back to notes" link, the browser's Back button, or any change to a non-note route) MUST keep the query, the field's value, the shown list and the search status text exactly as they were, unless the loaded list changed meanwhile (R19). On return, focus MUST move to the link of the note that was open if that note is in the shown list at that moment, or else to the "Your notes" `<h2>` (`list-notes` R24, read with "the list" meaning the shown list). The hidden search field keeps its value while the note view shows (as the form does, `list-notes` R26).
- R18: The query is not unsaved note text: typing in the search field MUST NOT turn on the "Leave site?" warning (`create-note` R25 is unchanged).

### List stays true
- R19: The shown list MUST always equal the matching notes (R7) of the current loaded list for the current query. When the loaded list changes while a query is active (a save, `list-notes` R14; an edit, `edit-delete-note` R32; a delete or a note found gone, `list-notes` R21 and `edit-delete-note` R33), the shown list MUST be recomputed with the same query, without a `list()` call, without a reload, and without clearing the query. A saved or edited note appears only if it matches; an edited note that no longer matches leaves the shown list.
- R20: Searching MUST NOT call any repository method. `list()` is still called exactly once per page load (`list-notes` R3).

### Look, layout and accessibility
- R21: The search area MUST follow `list-notes` R30: system font, zinc greys, white surfaces, the one `accent` (`blue-700`), no new colour token, no red, no animations or transitions. The label is styled like the "New note" labels (`text-sm`, medium, `zinc-900`); the field like the "New note" Title field (white, 1px `zinc-500` border, rounded, `px-3 py-2`, `text-base` 16px, `zinc-900`); "Clear search" like the `edit-delete-note` secondary button (white, 1px `zinc-500` border, `zinc-900` text, medium, rounded, `px-4`, hover `bg-zinc-100`). The field and "Clear search" MUST each be at least 44px tall and show the global 2px accent `:focus-visible` outline, unclipped.
- R22: The list view with the search area MUST meet `project-foundation` R28 and R29 (360px to 1920px with no horizontal scroll; reflow at 320px, at 200% text and with WCAG 1.4.12 text spacing), including with a 2,000-character unbroken query (the field scrolls its own text; the page doesn't widen) and in the no-match state.
- R23: Every state in this spec's States table MUST meet WCAG 2.1 AA, with zero axe violations for the `wcag2a`, `wcag2aa`, `wcag21a` and `wcag21aa` tags.
- R24: Everything MUST work by keyboard alone. Tab order in the list view: skip link → Title → Note → Save note → Search notes → Clear search (only while shown) → each shown note link. There is no keyboard shortcut to reach the field (non-goal) and no keyboard trap.

### Performance
- R25: **Search speed (charter metric).** Measured in headless Chromium against the production build, in a fresh context seeded with the **search seed**:
  - **Search seed:** 1,000 notes, `i` = 0 to 999, each with a title of exactly 60 characters and a body of exactly 2,000 characters (the `list-notes` AC-50 shape), distinct `updatedAt` values so the order is fixed. Text is built deterministically (a fixed-seed generator the plan names) from a fixed list of lower-case ASCII filler words, none of which contains "caf", "market" or "zq". Markers: the 10 notes with `i % 100 === 7` contain "Café" (precomposed) in the body starting after character 1,500; the 20 notes with `i % 50 === 3` contain "MARKET" in the title. So "cafe" matches exactly 10 notes, "market" exactly 20, and "cafe market" none.
  - **Measured step:** for each keystroke or action, the time from the triggering event's `timeStamp` (`input` for typing and Backspace, `click` for "Clear search", `keydown` for Escape) to the first `requestAnimationFrame` callback at which the visible note links in "Your notes" are exactly the expected set (computed by the test from the seed with its own reference implementation of R5-R7), or the no-match text is visible when the set is empty, MUST be **under 100 ms**.
  - **Script:** type "cafe market" one character at a time, waiting for each result before the next key; press Backspace 7 times (back to "cafe"); click "Clear search" (1,000 notes); type "market"; press Escape (1,000 notes). Every step is measured.
  - **No stutter:** typing "cafe market" with `page.keyboard.type` and no delay MUST leave the field's value exactly "cafe market", show the correct (empty) result within 100 ms of the last `input` event, and record no long task (`longtask`) over 100 ms from the first key until then.
- R26: Pasting a 2,000-character query (the full body of one seeded note) MUST show the correct results (at least that note) within 300 ms of the `input` event, with no long task over 300 ms.
- R27: This slug MUST NOT add a runtime dependency (`dependencies` stays exactly `react` and `react-dom`) or a search, indexing or virtualisation library. A dev-only dependency MAY be added if the plan justifies it, under `project-foundation` R5 with the exception list unchanged.

### Privacy and guards
- R28: Searching MUST make no network request and write nothing anywhere (no IndexedDB write, `localStorage`, `sessionStorage`, cookie or Cache Storage entry), and MUST NOT call `navigator.storage.persisted()` or `persist()`. The UI MUST NOT write the query or note text to the console or put it in any error message (`create-note` R24).
- R29: The storage boundary MUST stay exactly as `create-note` R29-R31 and `list-notes` R37 set it.
- R30: Before ship, the manual checks (AC-34, AC-35) MUST be done by hand and recorded. Agents never mark them passed (§4.1).
- R31: Every new e2e test that stores or seeds notes MUST run in its own browser context (`create-note` R28, `list-notes` R43).

## User experience

### Flows
- **US-1 / US-3 (search):**
  1. The user opens QuickNotes. The "New note" form shows with the cursor in Title, as today. Below the info text, "Your notes" loads; once it has notes, a "Search notes" field appears under the heading, above the list.
  2. The user clicks the field (or Tabs to it from "Save note") and types "shop".
  3. With each letter, the list narrows to the notes with "shop" in the title or text, newest update first. Each entry looks exactly as before.
  4. When they pause, the line under the field reads "2 notes match" (a screen reader says it politely).
  5. They click or Tab to a result and press Enter. The note opens as usual.
- **US-2 (words, case, accents):** "cafe paris" finds a note titled "Paris" whose text says "Café". "CAFE" finds "café". Word order doesn't matter.
- **US-5 (clear):** "Clear search" (shown next to the field while it has text) or Escape empties the field and brings back the full list, with the cursor in the field. Deleting the text does the same.
- **US-6 (nothing matches):** "zebra" shows "No matching notes" and "Try fewer or different words, or clear the search to see all your notes." in place of the list; after the pause, "No notes match" is announced.
- **US-6 (nothing to search):** with no notes, "Your notes" shows "No notes yet" and no search field. If the notes couldn't be loaded, the failure message shows and no search field.
- **US-7 (open and come back):**
  1. With "shop" in the field, the user opens a result.
  2. "Back to notes" or the browser's Back button returns to the list: "shop" is still in the field, the same results show, and focus is on the note they opened.
  3. A reload clears the search: the field is empty and every note shows.
- **US-8 (while searching):** with "shop" in the field, the user saves a new note "Shop hours" with the form: it appears at the top of the results. A note saved as "Ideas" doesn't appear until the search is cleared. Editing a result so it no longer mentions "shop" removes it from the results; deleting one removes it.

### Screens / views
One new area in the list view. No wireframe; layout of "Your notes" from
top to bottom:

- `<h2>` "Your notes" (unchanged).
- The section's message regions (unchanged): the load-failure alert (`list-notes`) and the "Note deleted." status (`edit-delete-note`); they take no space when empty.
- **Search area** (`mt-3`), only when the list has loaded with at least one note:
  - Label "Search notes" (`text-sm`, medium, `zinc-900`) above the field row.
  - **Field row** (`flex`, `gap-2`, wrapping): the search field (fills the remaining width, `min-w-0`, styled like Title, at least 44px tall); "Clear search" (secondary button, at least 44px tall) to its right, only while the field has text. When the row is too narrow (for example 320px at 200% text), the button wraps below the field, left-aligned.
  - **Status line** (`mt-2`, `text-sm`, `zinc-600`): the count, or nothing. Takes no space when empty.
- **The list** (`mt-3`), unchanged in look, showing only the matching notes.
- **No matches** (`mt-3`), in place of the list: "No matching notes" (`zinc-900`, medium, `text-lg`) and "Try fewer or different words, or clear the search to see all your notes." (`zinc-600`, `text-base`), left-aligned, like the empty state.
- **Desktop (640px and up):** one column capped at 48rem; the field row fills the column.
- **360px phone:** the same column; the field and "Clear search" share one row; nothing scrolls sideways. A long query scrolls inside the field.
- **Note view:** unchanged. The search area is hidden with the rest of the list view (`list-notes` R17) and keeps its value.

Browsers may add their own clear icon inside a search field, and the iOS
keyboard may show a "Search" key; both are accepted (decision 13).

### States
| View / state | What the user sees | Announcement | Focus |
|---|---|---|---|
| List: loading | As `list-notes`; no search field | none | Title (on load) |
| List: empty | "No notes yet" / "Notes you save will show up here."; no search field | none | unchanged |
| List: load failed | `list-notes` failure copy; no search field | alert (existing) | unchanged |
| Search: no query | Search field (empty), no "Clear search", full list | none | unchanged (Title on load) |
| Search: typing | Field with text, "Clear search", results narrowing with each key; status line unchanged until the pause | none while typing | the field |
| Search: results | Matching notes in list order; "{n} notes match" / "1 note matches" | status (polite), 500 ms after the last change | the field |
| Search: no matches | "No matching notes" + guidance, no list; "No notes match" | status (polite), 500 ms after the last change | the field |
| Search: cleared | Empty field, full list, status line empty | none (focus lands on the field, which is read) | the field |
| Search: back from a note | Same query, results and status as before | none | the opened note's link if shown, else "Your notes" `<h2>` |
| Search: list changed while searching | Results recomputed (a save, edit or delete) | status updated 500 ms later if the count changed; plus the existing "Note saved." / "Note deleted." | per the action (`create-note`, `edit-delete-note`) |
| Search: last note gone | `list-notes` empty state; no search field; query reset | as the action ("Note deleted.") | as the action |
| Reload / new tab | Empty field, full list | none | Title |

### Copy & validation
Tone (from `project-foundation`): plain and friendly, sentence case, no
jargon, no exclamation marks. `{n}` uses en-US thousands separators.

| Location | Exact text |
|---|---|
| Search label | Search notes |
| Clear button | Clear search |
| Status, one match | 1 note matches |
| Status, several | {n} notes match |
| Status, none | No notes match |
| No matches, primary | No matching notes |
| No matches, secondary | Try fewer or different words, or clear the search to see all your notes. |

No placeholder text. The query is never echoed back in any message. All
`create-note`, `list-notes`, `edit-delete-note` and `project-foundation`
copy is unchanged. `document.title` stays "QuickNotes".

Validation: none. Any query is valid, of any length (§2.2). A blank
query filters nothing (R6, R10).

### Accessibility
Target: WCAG 2.1 AA (charter).
- **Structure:** the search area is a `search` landmark inside `main`, within the "Your notes" section, after its `<h2>`. No new heading.
- **Label:** a visible `<label>` "Search notes" whose text is the field's accessible name. No placeholder used as a label.
- **Field:** `type="search"` (role `searchbox`), 16px text so iOS doesn't zoom, `autocomplete="off"`.
- **Keyboard:** Tab order as R24. Escape clears (an addition to the visible button, §2.5). Enter does nothing. "Clear search" returns focus to the field. No keyboard trap.
- **Focus:** the field never takes focus by itself (R3). On return from a note, focus goes to the opened note's link if it is shown, else the "Your notes" `<h2>` (R17).
- **Announcements:** the search status region is polite and updated 500 ms after typing pauses (R15), so a screen reader isn't interrupted on every key. The no-match texts are not live (the status announces the count). The list itself is never live.
- **Results:** the list's item count, as announced by screen readers, equals the number of matches (R11).
- **Contrast:** as `create-note` and `list-notes` (`zinc-900` and `zinc-600` on white and `zinc-50`, about 7:1 or better; `zinc-500` borders about 4.8:1 for 1.4.11).
- **Zoom and reflow:** R22.
- **Motion:** none.
- **Manual pass:** VoiceOver on macOS Safari and iOS Safari, plus a keyboard-only pass in desktop Chrome (AC-34).

## Acceptance criteria
Test layers, as in `list-notes`: **component** = Vitest + React Testing
Library in jsdom (`npm test`), with a repository supplied by the test (the
in-memory double, or a stub whose methods resolve, reject with an error
class from `src/storage/index.ts`, or stay pending), and fake timers
where the 500 ms delay matters. **unit** = Vitest on the pure matching
module. **e2e** = Playwright against the production build under
`/quicknotes/`, loaded with `gotoApp` from `e2e/app.ts`, each test in its
own context (R31). **Seeded** means notes written straight into the
`quicknotes` `notes` store before a reload. **tooling** = Vitest under
`tests/tooling/`. **manual** = recorded in `review.md` or at ship.

"Searched for X" means X typed into the "Search notes" searchbox. Unless
an AC says otherwise, the repository is the in-memory double holding,
newest first: C (`"Shopping list"` / `"milk"`), B (`"Ideas"` /
`"café plans"`) and A (`"Groceries"` / `"Shopping for the party"`).

### The search field
- AC-1 (US-1, R1, R3, R4; revised `create-note` AC-1 and `list-notes` AC-1): Component: after `<App />` renders and the list settles, the page has exactly one searchbox, named "Search notes", inside the "Your notes" section and inside an element with role `search`; it is an `<input type="search">` with `autocomplete="off"` and no `maxlength`, `required`, `pattern` or `placeholder`; its `<label>` is visible text "Search notes"; it is not inside a `<form>`. In DOM order: the "Your notes" `<h2>`, the searchbox, the list. There is no button named "Clear search", no checkbox on the page, the level-2 headings are exactly `["New note", "Your notes"]`, Title has focus, and the "New note" section still holds exactly 2 textboxes, 1 button, no link and no searchbox.
- AC-2 (US-6, R2): Component: given `list()` pending, given `list()` resolving `[]`, and given `list()` rejecting with `StorageUnavailableError`, then in each there is no searchbox and no element with role `search`, and the section shows exactly the `list-notes` loading, empty or "List unavailable" content.
- AC-3 (US-9, R3): Component: given `list()` pending and focus in Title, when "abc" is typed into Title and `list()` then resolves with 3 notes, then the searchbox is shown, Title still has focus and its value is "abc".
- AC-4 (US-6, R2, R19): Component: given only A stored, searched for "groc", when A is opened, `get` rejects with `NotFoundError` and "Back to notes" is activated, then the section shows "No notes yet", there is no searchbox and no "No matching notes". When "Later" / "x" is then saved with the form, the searchbox is shown with value `""` and the list shows "Later".

### Matching
- AC-5 (US-2, R5, R6, R7): unit: the matching function returns a match exactly as below (title / body / query → result):

  | Title | Body | Query | Match |
  |---|---|---|---|
  | `"Café"` | `""` | `"cafe"` | yes |
  | `""` | `"café au lait"` | `"CAFÉ"` | yes |
  | `"NAIVE"` | `""` | `"naïve"` | yes |
  | `"Uber"` | `""` | `"über"` | yes |
  | `"Việt Nam"` | `""` | `"viet"` | yes |
  | `"İstanbul"` | `""` | `"istanbul"` | yes |
  | `"Shopping list"` | `""` | `"shop list"` | yes |
  | `""` | `"list for the shop"` | `"shop list"` | yes |
  | `"Shopping"` | `""` | `"shop list"` | no |
  | `"Groceries"` | `"milk"` | `"groceries milk"` | yes |
  | `"ab"` | `"cd"` | `"bc"` | no |
  | `"a.b"` | `""` | `"a.b"` | yes |
  | `"axb"` | `""` | `"a.b"` | no |
  | `"(x"` | `""` | `"("` | yes |
  | `"日本語"` | `""` | `"日本"` | yes |
  | `""` | `"עברית"` | `"עברית"` | yes |
  | `""` | `"a😀b"` | `"😀"` | yes |
  | `""` | `"line one\nline two"` | `"one\ntwo"` | yes |
  | `"한"` | `""` | `"하"` | no |
  | `"x"` | `"\uD800"` | `"\uD800"` | yes |
  | `"x"` | `""` | `"  x   "` | yes |
  | `"Plans"` | `""` | `"plans plans"` | yes |
  | `"cat"` | `""` | `"cats"` | no |

  No call throws, including queries `"[*+?"`, `"\\"`, `"\uDC00"` and a 10,000-character string.
- AC-6 (US-5, R6, R10): Component: when the searchbox is set in turn to `""`, `" "`, `"\t"`, `"\n"` and `" "` (with timers advanced 1,000 ms each time), then the links are C, B, A, the search status region is empty, and "No matching notes" is absent.
- AC-7 (US-2, R7): Component: given only a note with title `""` and body `"x"` and a note `"Long"` with a body of 150 `"a"` (so the list shows "Untitled note", a preview ending in "…" and "Updated …" lines), when searched for "untitled", then "No matching notes" shows; for "updated", "No matching notes"; for "…", "No matching notes"; for "ago", "No matching notes".
- AC-8 (US-11, R8, R9): unit: given a frozen array of frozen notes `[C, B, A]`, the function returns `[C, A]` for "shop" (same objects, same order) and leaves the input unchanged; it returns the input notes in order for a blank query. tooling: the matching module's imports include no `react`, `react-dom`, `idb`-style or `src/storage/` path other than a type-only import from `src/storage/index.ts`.

### Filtering
- AC-9 (US-1, US-3, R11, R12): Component: when "shop" is typed one character at a time, then after each character the links are exactly the matching notes of the table in order ("s": C, B, A — "plans" has an "s"; "sh": C, A; "shop": C, A), with no button pressed and no Enter. Within the section, `getByRole('list')` has exactly 2 `listitem`s, B's link is not found by `queryByRole('link', { name: 'Ideas' })`, and Tab from the searchbox (with "Clear search" shown) goes to "Clear search" then C's link then A's link.
- AC-10 (US-3, R11): Component: A's link `outerHTML` with a blank query is `===` A's link `outerHTML` while searched for "groc".
- AC-11 (US-1, R12): Component: when "café plans" is pasted into the searchbox (`user.paste`), then the only link is B. When Enter is pressed in the searchbox, then `location.hash`, `history.length`, the searchbox value and the links are unchanged, the searchbox still has focus, and no repository method was called.
- AC-12 (US-5, R13): Component: searched for "shop", then "Clear search" is shown; when it is clicked, the searchbox value is `""`, the links are C, B, A, "Clear search" is gone, the searchbox has focus, and the search status region is empty. Searched for "shop" again, when Escape is pressed in the searchbox, the same holds and the `keydown` event's `defaultPrevented` is true. With the searchbox empty, an Escape `keydown` has `defaultPrevented` false and nothing changes. Searched for "shop", when Backspace is pressed 4 times, the links are C, B, A.
- AC-13 (US-6, R14): Component: when searched for "zebra", then the section shows "No matching notes" and "Try fewer or different words, or clear the search to see all your notes.", has no element with role `list`, does not show "No notes yet", and neither text has an ancestor with `aria-live`, `role="status"` or `role="alert"`. After "Clear search", both texts are gone and the list shows C, B, A.
- AC-14 (US-9, R15): Component, fake timers: when the searchbox first appears, its status region exists and is empty. When "shop" is typed, the status is empty; after 499 ms it is still empty; after 1 more ms it reads "2 notes match". When "s" is typed into an empty searchbox, then 400 ms pass, "h" is typed, and 400 ms pass, the status is still its previous value (empty); after 100 more ms it reads "2 notes match". Searched for "ideas" → "1 note matches". "zebra" → "No notes match". "Clear search" → empty at once, and still empty 1,000 ms later. Given 1,000 notes titled "Note {i}", searched for "note" → "1,000 notes match".

### Keeping the query
- AC-15 (US-7, R17): Component, fake timers advanced: searched for "shop" and the status reading "2 notes match", when A's link is activated and then "Back to notes", then the searchbox value is "shop", the links are C, A, A's link has focus, and the status reads "2 notes match". The same holds when, instead of "Back to notes", `location.hash` is set to `""` and `hashchange` fires. While the note view shows, the searchbox (hidden) still has value "shop".
- AC-16 (US-7, R17, R19): Component: searched for "shop", when C is opened and `get` rejects with `NotFoundError`, and "Back to notes" is activated, then the links are A only and the "Your notes" `<h2>` has focus.
- AC-17 (US-9, R15; revised `list-notes` AC-43 for the search region): Component: given in turn a pending, a resolved non-empty and a resolved empty `list()`, a successful save, and opening a note and going back, all with a blank query, then the search status region (when present) never has text, and the `list-notes` alert region only has text in the load-failure case.
- AC-18 (US-7, US-10, R16): e2e: given a fresh context with A, B and C saved, when "SECRET-Q" is typed into "Search notes", then `page.url()` doesn't contain "SECRET", `JSON.stringify(history.state)` doesn't contain "SECRET", `document.title` is "QuickNotes", `localStorage.length` and `sessionStorage.length` are 0, and `document.cookie` is empty. After clearing and searching for "shop", opening C and `page.goBack()`, the searchbox value is "shop" and C's link is focused. After `page.reload()`, the searchbox value is `""` and all three notes are listed. A second page opened in the same context at the app URL has an empty searchbox.
- AC-19 (US-7, R18): Component: with the "New note" fields empty, when searched for "shop", a cancelable `beforeunload` event has `defaultPrevented` false.

### List stays true
- AC-20 (US-8, R19, R20): Component: given a spy over the in-memory double, searched for "shop" (links C, A), when "Shop hours" / "x" is saved with the form, then the links are "Shop hours", C, A and the searchbox value is still "shop"; when "Other" / "y" is saved, the links are still "Shop hours", C, A; after "Clear search", "Other" is the first of 5 links. `list` was called once in total.
- AC-21 (US-8, R19; with `edit-delete-note`): Component, run once `edit-delete-note` is built (adjusted to its approved spec if it differs): searched for "shop", when A is opened, edited to "Party" / "cake" and saved, and "Back to notes" is activated, then the only link is C and the "Your notes" `<h2>` has focus; after 500 ms the status reads "1 note matches". When B is opened, its body edited to "shopping run" and saved, then after going back the links are B, C. When C is opened and deleted, then the only link is B and the searchbox value is still "shop". `list` was called once in total.
- AC-22 (US-10, R20): Component: given a spy repository, after the list settles, when 20 characters are typed into the searchbox, "Clear search" is clicked, text is typed again and Escape pressed, then no repository method was called after the initial `list`.

### Look, layout and accessibility
- AC-23 (US-9, R24; revised `list-notes` AC-42, last clause): e2e: given a fresh context with one saved note, when Shift+Tab from Title focuses the skip link and Enter is pressed, then the "Your notes" heading is focused; the next Tab focuses "Search notes"; after typing "a" (matching the note), the next Tab focuses "Clear search" and the next the note's link. Tab from "Save note" with an empty searchbox focuses "Search notes" and then the first note link.
- AC-24 (US-9, R21): e2e: "Search notes" and "Clear search", focused by keyboard, have `outline-style` not `none`, `outline-width` at least 2px and `outline-color` `rgb(29, 78, 216)`, and are each at least 44px tall; the searchbox's computed `font-size` is at least 16px. The `project-foundation` "no animations or transitions" check passes with results shown and in the no-match state. Tooling: `project-foundation` AC-25 (one non-zinc token, `accent`) still passes.
- AC-25 (US-9, R22): e2e: given viewports 360x740, 768x1024, 1280x800 and 1920x1080 and the notes C, B, A, with the query "a", then with a 2,000-character unbroken query, and then with "zebra", at each size `scrollWidth <= innerWidth`, the searchbox and "Clear search" lie fully within the viewport horizontally, and "No matching notes" and its guidance are fully within the viewport. Given 320x640 with root font size 200%, and given 360px with the WCAG 1.4.12 text-spacing CSS, then there is no horizontal scroll, and the label, searchbox, "Clear search", status line and no-match texts are visible and not clipped (`scrollWidth <= clientWidth` and `scrollHeight <= clientHeight`, except the searchbox's own text).
- AC-26 (US-9, R23): e2e: given each state in turn, when axe runs with the tags `wcag2a`, `wcag2aa`, `wcag21a` and `wcag21aa`, then there are zero violations, `color-contrast` is not in `incomplete` and passes on at least 3 nodes: search with no query; results with the status showing; no matches with the status showing; "Clear search" focused; a 360px viewport with results.

### Performance
- AC-27 (US-4, R25): e2e: given a fresh context seeded with the search seed and reloaded, with a page script that records each `input`, `click` and `keydown` `timeStamp` on the search area and checks the visible note links in "Your notes" on each `requestAnimationFrame`, when the R25 script runs ("cafe market" one key at a time, 7 × Backspace, "Clear search", "market", Escape), then every one of the 26 steps (11 keys, 7 Backspaces, 1 click, 6 keys, 1 Escape) shows its expected result in under 100 ms, the expected results being computed by the test's own reference implementation of R5-R7 over the seed (10 notes for "cafe", 0 for "cafe market", 20 for "market", 1,000 after clearing).
- AC-28 (US-4, R25): e2e: given the AC-27 seed and a `longtask` `PerformanceObserver` registered by init script, when "Search notes" is focused and `page.keyboard.type("cafe market")` runs with no delay, then the searchbox value is exactly "cafe market", "No matching notes" is visible within 100 ms of the last `input` event, and no long task over 100 ms was recorded from the first key until then.
- AC-29 (US-4, R26): e2e: given the AC-27 seed, when the full 2,000-character body of seeded note 500 is pasted into "Search notes" (`locator.fill`), then note 500's link is visible within 300 ms of the `input` event, and no long task over 300 ms was recorded.

### Privacy and guards
- AC-30 (US-10, R28): e2e: given a fresh context with three notes saved, request logging, and an init script that counts calls to `StorageManager.prototype.persisted` and `persist`, when the page is reloaded, the network is idle, the log and counters are cleared, and then "shop" is typed, cleared, "zebra" typed and Escape pressed, then no request was recorded, both counters are 0, `localStorage.length` and `sessionStorage.length` are 0, `document.cookie` is empty, `caches.keys()` resolves `[]`, and the `notes` store still holds exactly 3 records with unchanged `updatedAt` values.
- AC-31 (US-10, R28): Component: given notes "SECRET-T" / "SECRET-B" loaded, when searched for "SECRET-Q", "SECRET-T" and a query of 1,000 `"SECRET"`, then a spy on `console.log/info/warn/error/debug` recorded no call whose arguments contain "SECRET".
- AC-32 (US-11, R27, R29): tooling: `package.json` `dependencies` has exactly the keys `react` and `react-dom`; `tests/tooling/licences.test.ts` passes with its exception list unchanged; `tests/tooling/storage-boundary.test.ts` passes with the `create-note` AC-43 to AC-46 and `note-storage` AC-51 and AC-53 checks unchanged in what they assert, including the pinned export list of `src/storage/index.ts`.
- AC-33 (US-11, R31): tooling: `create-note` AC-42 (no `launchPersistentContext` or `storageState` in `playwright.config.ts` or `e2e/`) passes unchanged. Every new e2e test that saves or seeds notes uses the per-test `page` fixture or a context it creates and closes.

### Manual checks (ship)
- AC-34 (US-9, R30): manual, recorded in `review.md`: with VoiceOver on macOS Safari and on iOS Safari, and in a keyboard-only pass in desktop Chrome:
  - on load, focus is announced as the "Title" text field, and nothing about search interrupts it;
  - "Search notes" is announced as a search field; typing "shop" isn't interrupted, and after a pause "2 notes match" (or the right count) is announced once;
  - "No notes match" is announced for a query with no results;
  - "Clear search" and Escape clear the field and the field is announced;
  - opening a result and going back keeps the query and lands on that note;
  - the results list is announced with the number of matching items.
- AC-35 (US-1, US-2, US-7, R30): manual at ship, on the live URL, in current desktop Chrome and current desktop Safari, each in turn:
  1. Search for a word from deep in a note's body, then for it in capitals and without its accents. The note is found each time.
  2. Open a result, then use "Back to notes", then the browser's Back button. The query and results are kept each time.
  3. Use the browser's own clear icon in the field (if shown). The full list returns.
  4. Reload. The field is empty and every note shows.

  The result for each browser and step is recorded at ship. Agents never mark it passed.

## Constraints
- **Charter:** React + Vite + TypeScript + Tailwind; no backend; notes never leave the device; WCAG 2.1 AA; $0; "search returns results in under 100 ms over 1,000 notes"; v1 scope "Search across both title and body".
- **Owner decisions (intent, 2026-10-09)** are binding: case- and accent-insensitive word matching over title and body (item 1); the query in memory only, never in the URL, kept across opening a note, gone after a reload (item 2).
- **Standing decisions** (product/decisions.md, Approved): §1.1, §2.1, §2.2, §2.3, §2.4, §2.5, §2.6, §2.7, §3.2, §3.3, §3.4, §4.1, §4.2, §5.1, as applied above.
- **Builds on shipped `list-notes`:** the list state held in memory (the `ListState` reducer), `NotesSection`, `NoteList` and the hash routing as built. Search filters what the list already holds; it does not change how the list loads, refreshes or orders notes.
- **Depends on draft `edit-delete-note`:** R19 and AC-21 cover edits and deletes as that draft specifies (`update` and `delete` changing the list in memory, the "Your notes" status region). If its approved version differs, the approved version wins and this spec is re-checked before its plan is approved. Everything else here works with `list-notes` alone.
- **Storage layer used as shipped:** no new read, index, query API or schema change (`note-storage` non-goal). Characters are Unicode code points (`note-storage` R4) wherever counted.
- **Routing:** hash-based as in `list-notes`; the query is never part of a route; no `pushState`; no routing library.
- **Design system:** zinc greys, one `accent`, the global focus outline, the system font, no animations; no new colour token.
- **Browsers and sizes:** as `project-foundation` (last 2 versions of Chrome, Edge, Firefox, Safari, iOS Safari; 360px to 1920px, reflow at 320px). Automated browser tests in Chromium only; Safari covered by AC-34 and AC-35.
- **Tests:** component tests in Vitest + React Testing Library (jsdom); unit tests for the matching module; e2e, layout, axe and performance in Playwright (headless Chromium) through `gotoApp`, each storing test in its own context; tooling under `tests/tooling/`. Everything runs in `npm run ci` except AC-34 and AC-35.
- **Lint:** `eslint-plugin-jsx-a11y` recommended stays on; no rule is loosened for this slug.

## Non-goals
- Highlighting matched words, or a snippet around the match instead of the normal preview (§2.7).
- Fuzzy or typo-tolerant matching, stemming, synonyms, regular expressions, exact-phrase matching, or operators (quotes, `-`, `OR`, field prefixes).
- Folding beyond R5: width forms, "ß" and "ss", ligatures, or marks outside U+0300 to U+036F.
- Relevance ranking or any order other than the list's (most recently updated first).
- Search history, recent or saved searches, suggestions, or autocomplete.
- A keyboard shortcut to the field (for example `/` or Cmd/Ctrl+K).
- A separate search page, a search route, a URL parameter for the query, or searching from the note view.
- Searching anything other than the stored title and body (dates, ids, display stand-ins).
- Changing the storage layer: no index, query API or schema bump; no re-reading storage on a keystroke; no live updates from other tabs.
- Paging, "load more" or virtualisation of results.
- Hiding or restyling the browser's own clear icon in search fields.
- Tags, folders, pinning, rich text, Markdown, attachments, export, import, sync or accounts (charter).
- Light/dark mode (`theme-mode`); service worker and offline install (`pwa-offline`).
- New runtime dependencies, including search libraries. Automated Firefox or WebKit runs.

## Open questions / risks
No question needs the owner under product/decisions.md §1.2: both product
choices (how a query matches; the query in memory only) were decided on
2026-10-09, and everything else is applied as a decision (see "Decisions
applied"). The items below are risks recorded for visibility, per §2.6.
The approver accepts them by approving this spec.

1. **Large bodies (risk).** The 100 ms budget is checked on the agreed 1,000-note seed (2,000-character bodies, about 2 million characters per keystroke). A library made mostly of very long notes (up to 100,000 characters each) could be slower. This spec doesn't promise 100 ms for that; R26 and AC-29 check that a long query stays responsive.
2. **Showing the full list again (plan risk).** Clearing the search (or a one-letter query) shows up to 1,000 items. Re-creating 1,000 list items within 100 ms may be tight in CI's headless Chromium. The plan should choose an approach that keeps this cheap (for example keeping items mounted and hiding non-matching ones, R11 allows it, or deferring list rendering behind the field so typing never waits), and AC-27 measures it.
3. **CI timing (risk, as `list-notes` risk 4).** AC-27 to AC-29 run on shared CI runners. The budgets prove the design doesn't block, not real-device speed. If they prove flaky, the plan may repeat the measurement, but the budgets change only through a spec revision.
4. **Screen-reader chatter (risk).** The count is announced 500 ms after typing pauses (R15). A slow typist may hear intermediate counts; a fast one only the last. If a save or delete changes the count, the count may be announced after "Note saved." or "Note deleted.". AC-34 checks this in VoiceOver. The delay is one constant, so a later spec can tune it.
5. **Folding limits (accepted by design).** R5 removes only Latin-style combining accents and lower-cases text. "strasse" doesn't find "Straße", full-width "ＡＢＣ" doesn't match "abc", and marks outside U+0300 to U+036F (for example Hebrew points or Arabic vowel marks) must match as typed. Lower-casing is locale-independent, so Turkish dotless "ı" is not the same as "i".
6. **Built-in clear icons and Escape vary by browser (accepted, §2.6).** Chrome and Safari show their own clear icon in search fields and may clear the field on Escape themselves; either way the field's value changes and the list follows (R12). "Clear search" is always available, so nothing depends on the browser's control. Some screen readers may announce both clear controls.
7. **Back/forward cache (minor).** If the user leaves QuickNotes and comes back with the browser's Back button, a browser may restore the page from its back/forward cache with the query still in memory. That is the browser restoring the same page, not storage; a reload still starts empty.
8. **Results may hide the note just saved (accepted by design).** With a query active, a note saved with the form that doesn't match won't appear in the results (R19). "Note saved." is still announced, and clearing the search shows it at the top.
9. **Depends on `edit-delete-note` (schedule risk).** AC-21 can only run once `edit-delete-note` is built. If its approved spec changes how edits and deletes update the list or the "Your notes" status region, this spec's "Changes to earlier specs" and AC-21 are re-checked before this plan is approved.
10. **Superseded items in approved specs (owner housekeeping).** Agents don't edit approved artifacts. The owner may add a one-line cross-reference at ship to `create-note` (AC-1) and `list-notes` (R4, R24, R28, R29, AC-1, AC-42, AC-43, Accessibility keyboard order, States, Non-goals).

## Approval
<!-- Who approved this spec, and when. A spec is not approved until a
     human signs off here — this is the primary judgment gate in the
     framework; do not skip it. -->
- Approved by: AITechie, 2026-10-09
