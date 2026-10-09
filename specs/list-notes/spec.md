# Spec: List notes and open one

- Status: Approved
- Slug: list-notes
- Intent: [intent.md](./intent.md)
- Jira: none
- Owner: AITechie
- Reviewers: AITechie (Product Owner, Tech Lead)
- Date: 2026-10-08

<!-- Status values: draft -> approved -> superseded.
     Do not move to "approved" without a human sign-off in the Approval
     section below. A spec with open questions cannot be approved. -->

## Summary
QuickNotes starts showing saved notes again. Below the "New note" form, a
"Your notes" section lists every saved note, newest update first, with no
paging. Each entry shows its title (or "Untitled note"), a short preview
of the body and when it was last updated. Picking a note opens a
read-only view of it, at a `#note/<id>` URL that holds only the note's
id, so the browser's Back button and a reload both work. A visible "Back
to notes" link returns to the list, with focus on the note that was
open. The form still renders first with focus in Title, and any unsaved
text in it survives opening a note. A note saved with the form appears
at the top of the list straight away. Empty, loading and failure states
are plain and true. The page gets the skip link that `create-note`
deferred.

To show notes on load, the app now reads storage on load. This spec
**deliberately changes** `project-foundation` AC-33 (as the owner decided
on 2026-10-09) and some `create-note` items. See "Changes to earlier
specs".

## Changes to earlier specs
Once this spec is approved, the items below take precedence over the
items they name. This slug does not edit those slugs' own artifacts
(`spec.md`, `plan.md`, `review.md`). Only code and tests change (per
product/decisions.md §3.4).

| Earlier item | What it says today | Replaced by (this spec) |
|---|---|---|
| `project-foundation` AC-33 (`e2e/privacy.spec.ts`, "no storage or cookies on fresh load") | On a fresh load, `localStorage` and `sessionStorage` are empty, `document.cookie` is empty and `indexedDB.databases()` is empty | Revised as the owner decided (intent, Owner decisions item 1): AC-58 here. A fresh load may create the empty `quicknotes` database and read from it. It still creates no note record, leaves `localStorage`, `sessionStorage`, cookies and Cache Storage empty, calls neither `navigator.storage.persisted()` nor `persist()`, and makes no network request beyond loading the app's own files. The test no longer checks whether the database exists. |
| `project-foundation` R33 (as already narrowed by `create-note`) | IndexedDB is touched only through the repository, and only when the user saves | IndexedDB is touched only through the repository: `list()` once per page load, `get(id)` when a note is opened, and `create` on save (R36). |
| `create-note` R2 (focus in Title on load) | Focus goes to Title on every load | Unchanged when the page loads without a note route. When the page loads at `#note/<id>`, the note view shows and focus goes to its heading (R20, R23). The form is still part of the first render, hidden (R17). `create-note` AC-2 and AC-4 keep passing as written (they load without a hash). |
| `create-note` R11 (focus to Title after a successful save) | Focus moves to Title | Unchanged while the list view shows. If the note view is showing when the save settles, focus isn't moved (R27). |
| `create-note` R26 (nothing touches storage on load) | Loading, rendering and typing call no repository method | Loading calls `list()` exactly once, after the first render (R2, R3). Opening a note calls `get(id)` (R18). Rendering the form and typing still call nothing, and nothing calls `persisted()` or `persist()` on load (R39). |
| `create-note` R27 (only `create`) | The UI calls only `create` | The UI calls only `create`, `list` and `get`. It never calls `update`, `delete` or `isPersisted` (R36). |
| `create-note` R28, first sentence, and AC-38 | `project-foundation` AC-33 keeps passing with its test unchanged | The revised `project-foundation` AC-33 (AC-58 here) passes. R28's isolation rules (per-test contexts, no `launchPersistentContext` or `storageState`) and AC-42 are unchanged. |
| `create-note` AC-1 | Exactly 2 textboxes and 1 button, and no link, searchbox or checkbox | Inside the "New note" section: exactly 2 textboxes and 1 button, and no link. On the page: the skip link and one link per note are allowed (AC-1 here). Still no searchbox or checkbox anywhere. |
| `create-note` AC-6 | `main` contains neither "No notes yet" nor "Your notes will show up here." | The info text checks still hold. "No notes yet" now appears, but only as the "Your notes" empty state (R11). "Your notes will show up here." still never appears. |
| `create-note` AC-37 | After render, typing and a save, only `create` was called; no test observes `list`, `get`, `update`, `delete` or `isPersisted` | AC-53 here: `list` once, `create` once per save, `get` once per note opened, and never `update`, `delete` or `isPersisted`. |
| `create-note` AC-39 | After load and typing, `indexedDB.databases()` returns `[]` | AC-59 here: after load and typing, `localStorage`, `sessionStorage` and cookies are still empty, the URL is unchanged, and the `notes` store (if the database exists) holds 0 records. |
| `create-note` decision 10, Non-goals ("A skip link") and Accessibility (no skip link) | No skip link | The skip link "Skip to your notes" (R28). |
| `create-note` States ("There is no 'has notes' or 'no notes' state") | No list states | The "Your notes" states in this spec (R10-R13). |

These are **not** changed and keep passing as they are:
- the storage boundary: `create-note` R29-R31 and AC-43 to AC-46 (UI imports only `src/storage/index.ts`, whose export list is pinned), and `note-storage` AC-51 and AC-53;
- `create-note` R25 (no draft stored anywhere, "Leave site?" only with unsaved text), R33 (static info text), R34 (the form's two live regions) and AC-42 (no `launchPersistentContext` or `storageState`);
- every `note-storage` requirement. This slug uses the storage layer as shipped;
- every `pages-deploy` requirement. Hash routing needs no `404.html` or server fallback, because the part after `#` never reaches the server (this matches the `pages-deploy` non-goal on client-side routing).

## Decisions applied
Settled by the intent's Owner decisions (AITechie, 2026-10-09), or
accepted as proposed per product/decisions.md §1.1 because they fit every
standing decision. None of them is an open question.

1. **AC-33 revised** as the owner decided (Owner decisions item 1).
2. **Layout and flow** as the owner decided (Owner decisions item 2): form first, "Your notes" below; a read-only note view that replaces the main content; "Back to notes"; `#note/<id>` history entries.
3. **Unsaved form text survives** because the form stays mounted (hidden) while a note is open, and its state is kept in memory only (R26). Nothing is written anywhere (§2.1, `create-note` R25).
4. **Refresh after a save** adds the note that `create` returned to the top of the list in memory. It doesn't re-read storage, so a save can't trigger a second failure path (R14; per §1.1 and §2.1).
5. **The list is read once per page load** (R3). Opening a note always reads that note with `get(id)`, so a note deleted elsewhere gives "Note not found" instead of stale text (R18, R21).
6. **Load failure is said plainly and offers a reload, not a retry button** (R12; per §2.2 and §2.3). No new control is added.
7. **Info text stays where it is**, unchanged (`create-note` R33): static, below the form and above "Your notes".
8. **Display rules:** "Untitled note" for a blank title; a 100-character whitespace-collapsed preview; relative "Updated …" times without a ticking timer (R6-R8).
9. **The skip link** is "Skip to your notes", shown in the list view only (R28; per §2.5 and §2.7).
10. **No new colour** for any list or view state (R30; per §2.4).
11. **No new runtime dependency** and no virtualisation library (R35, R40; per §3.2).
12. **Real-browser checks are manual ship checks** that agents never mark passed (R42; per §4.1).

## User stories
- US-1: As the user (AITechie), I want to see all my saved notes when I open QuickNotes, most recently updated first, so that I can find what I wrote.
- US-2: As the user, I want each entry to show the note's title (or a clear stand-in), a preview and when it was last updated, so that I can tell notes apart.
- US-3: As the user, I want to open a note by mouse, touch or keyboard and read it in full, exactly as I saved it, so that QuickNotes can replace my current note tool.
- US-4: As the user, I want to get back to the list easily, with the "Back to notes" link or the browser's Back button, and land where I was, so that browsing notes is quick.
- US-5: As the user, I want an opened note to have its own URL that I can reload, with no note text in it, and a clear message for a note that doesn't exist, so that the browser behaves as I expect and my text stays private.
- US-6: As the user, I want a note I just saved to appear at the top of the list straight away, so that I can see it was kept.
- US-7: As the user, I want unsaved text in the form to still be there after I open and close a note, so that reading a note never costs me a draft.
- US-8: As the user, I want a plain empty state when I have no notes, and an honest message when notes can't be loaded or opened, so that I'm never misled.
- US-9: As the user, I want the form to stay ready to type first, with the list never delaying it or taking my focus, so that quick capture is unchanged.
- US-10: As the user with 1,000 notes, I want the list and a long note to load and respond quickly, so that the app stays fast as my notes grow.
- US-11: As a keyboard or screen-reader user, I want a skip link, a proper structure, sensible focus and announcements, at WCAG 2.1 AA from 360px to desktop, so that reading notes works for me as well as anyone.
- US-12: As the user, I want reading notes to send nothing over the network and store nothing new, so that the charter's privacy promise holds.
- US-13: As the developer, I want every earlier guard this slug changes to be revised on purpose and named, with the storage boundary untouched, so that the test suite stays trustworthy.

## Requirements

### Layout and first load
- R1: In the list view, `<main>` MUST contain, in this DOM order: the "New note" section (`create-note` R1, unchanged), the info text (`create-note` R33, unchanged wording, style and position), and a `<section>` labelled by a visible `<h2>` "Your notes". The page MUST still have exactly one `<h1>` ("QuickNotes", in the banner), and the only `<h2>`s in the list view are "New note" and "Your notes".
- R2: The form MUST stay part of the first render, and on a load without a note route (R20) focus MUST still go to Title as in `create-note` R2 and R3. The `list()` call MUST start only after the first render has been committed. Loading the list, its result or its failure MUST NOT move focus, change either field's value, or make a field read-only.
- R3: The app MUST call the repository's `list()` exactly once per page load, whatever route the page loads at. It MUST NOT read the list again on a save, a route change, window focus, `visibilitychange`, a timer or polling.

### The list
- R4: When `list()` resolves with one or more notes, the "Your notes" section MUST show a list (exposed as a list to assistive technology, including VoiceOver in Safari) with exactly one item per note, in the order `list()` returned them (`note-storage` R17: `updatedAt` descending, ties by `id` ascending). The UI MUST NOT re-sort, filter or drop notes (except as R21 states). Every note MUST be in the DOM at once: no paging, "load more", windowing or virtualisation.
- R5: Each item MUST contain exactly one link, with `href="#note/<id>"`. The link MUST contain, in this order: the title line (R6), the preview line (R7, only when shown) and the updated line (R8). The link's accessible name MUST be exactly the title line's text, and its accessible description MUST be the preview line's text (when shown) followed by the updated line's text. The whole item area is the link, so it can be clicked or tapped anywhere.
- R6: **Title line.** It MUST show the note's title as plain text, wrapping onto as many lines as needed, never truncated and never scrolling sideways. A title is **blank** when it contains no character other than whitespace (it matches `/^\s*$/u`, including `""`). For a blank title, the title line MUST read "Untitled note" in `zinc-600`. A non-blank title's element MUST have `textContent` equal to the stored title.
- R7: **Preview line.** It MUST be computed from the body: replace every run of whitespace (`/\s+/gu`, including line breaks and tabs) with one space; trim both ends; if the result has more than 100 characters (Unicode code points, as `countCharacters`), keep the first 100 code points, trim the end, and add "…" (U+2026). The preview MUST never split a code point (no lone surrogate). When the body is blank (as R6 defines it), there MUST be no preview line. The preview is display only: stored text is never changed.
- R8: **Updated line.** It MUST read "Updated " followed by the note's relative update time, wrapped in a `<time>` element whose `dateTime` is `new Date(updatedAt).toISOString()`. With `elapsed = now - updatedAt` in milliseconds, and each unit count rounded down:

  | Elapsed | Text |
  |---|---|
  | under 60 seconds, including negative (a future time) | just now |
  | under 60 minutes | {n} minute(s) ago |
  | under 24 hours | {n} hour(s) ago |
  | under 7 days | {n} day(s) ago |
  | under 30 days | {n} week(s) ago (n = days / 7) |
  | under 365 days | {n} month(s) ago (n = days / 30) |
  | 365 days or more | {n} year(s) ago (n = days / 365) |

  Counts and plurals follow `Intl.RelativeTimeFormat("en-US", { numeric: "always" })` (for example "1 minute ago", "2 days ago"). `now` is read each time the list view renders (on load, after a save, and when the list view is shown again after a note). There is no timer, so an open page doesn't update the text on its own.
- R9: All note text (title, preview, body) MUST be rendered as plain text, never interpreted as HTML or Markdown. UI modules MUST NOT use `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML` or `insertAdjacentHTML`.

### List states
- R10: **Loading.** While `list()` is pending, the section MUST show its heading and the text "Loading your notes…" (`zinc-600`), and the section MUST have `aria-busy="true"`. There is no spinner. The loading text MUST NOT be in a live region. When `list()` settles, the loading text is removed and `aria-busy` is removed or set to `"false"`.
- R11: **Empty.** When `list()` resolves with `[]`, the section MUST show "No notes yet" (primary) and "Notes you save will show up here." (secondary), and no list.
- R12: **Load failure.** When `list()` rejects, the section MUST show one message in its alert region (R29), chosen by the error:
  - a `NoteStorageError` with `kind` `"unavailable"` → the "List unavailable" copy;
  - anything else (any other `kind`, or anything that isn't a `NoteStorageError`) → the "List failed" copy.

  The section MUST NOT show a list, an empty state or a partial list. The app MUST NOT retry, fall back to other storage or offer a retry button; the copy tells the user to reload. The form MUST keep working as in `create-note`.
- R13: After a load failure, the section MUST stay in the failure state for the rest of the page load, including after a successful save (a list with only the new note would wrongly suggest it's the only note).

### Refresh after a save
- R14: When `create` resolves, the note it resolved with MUST appear in the list exactly once, as the first item, without another `list()` call:
  - list loaded with notes → the new note is added at the top;
  - list empty → the empty state is replaced by a list with that one note;
  - list still loading → when `list()` resolves, the result is shown with the saved note first and exactly once, whether or not the result already contained it;
  - list failed → nothing changes (R13).

  A failed save MUST leave the list unchanged. Notes saved in other tabs don't appear until a reload (`note-storage` R35).
- R15: A save MUST NOT move focus to the list or change any other part of the `create-note` save behaviour: "Note saved." is announced, the fields clear and focus goes to Title (`create-note` R11), except as R27 states.

### Opening a note (the note view)
- R16: Activating a note link (click, tap, or Enter on the focused link) MUST navigate to its `#note/<id>` URL as a normal same-document link navigation, which adds one browser history entry. Clicks with a modifier key or the middle button keep the browser's default (for example opening a new tab at that URL, which then opens the note, R20).
- R17: While the route is a note route (R20), `<main>` MUST show only the note view. The "New note" section, the info text, the "Your notes" section and the skip link MUST be hidden from sight and from assistive technology (for example with the `hidden` attribute), but the form MUST stay mounted (R26). The header stays.
- R18: On entering a note route (on load, or on any change of route to a note route), the app MUST call `get(id)` once and show the result. It MUST NOT show the note from the list in memory instead. While `get` is pending, the view MUST show the "Back to notes" link and the text "Opening note…" (`zinc-600`, not a live region).
- R19: When `get` resolves, the view MUST show, in this order:
  - the "Back to notes" link (R24);
  - an `<article>` labelled by an `<h2>` that holds the title exactly as stored, with spaces preserved (`white-space: pre-wrap`) and long words wrapped, or "Untitled note" in `zinc-600` when the title is blank (R6);
  - the updated line, exactly as R8;
  - the body exactly as stored, as one plain-text block with line breaks, runs of spaces and tabs preserved (`white-space: pre-wrap`) and long unbroken text wrapped (no sideways scroll). Its `textContent` MUST be `===` to the stored body. When the body is blank, the view MUST show "This note has no text." (`zinc-600`) instead.

  The view is read-only: no textbox, `contenteditable`, button or control other than the "Back to notes" link.
- R20: **Routes.** The route is a **note route** when `location.hash` starts with `#note/`; the id is the rest of the hash. Any other hash, including none and `#`, is the list view. Loading or reloading the page at a note route MUST show the note view for that id. If the id doesn't match `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/` (the `note-storage` R1 form), the view MUST show the not-found state without calling `get`.
- R21: **Not found.** When `get` rejects with a `NoteStorageError` of `kind` `"not-found"`, or the id is malformed (R20), the view MUST show the "Back to notes" link, an `<h2>` "Note not found" and the "Not found" copy. If a note with that id is in the list, the app MUST remove it from the list, because it is known to be gone.
- R22: **Open failure.** When `get` rejects with anything else, the view MUST show the "Back to notes" link, an `<h2>` "This note couldn't be opened", and the "Open unavailable" copy for `kind` `"unavailable"` or the "Open failed" copy for anything else. The list is not changed.
- R23: **Focus on open.** When the view reaches the loaded, not-found or open-failure state, focus MUST move to the view's `<h2>` (which has `tabindex="-1"`), and the page MUST be scrolled to the top. The app MUST NOT move focus while the view is loading.
- R24: **Back to the list.** The view's "Back to notes" link MUST have an `href` of the app's own URL without a hash (`/quicknotes/` in production). A plain activation MUST:
  - go back one history entry (`history.back()`) when the route shown immediately before this note route, in this page load, was the list view;
  - otherwise (the page loaded at the note route, or the user went from one note route straight to another), replace the current history entry with the app URL without a hash (`history.replaceState(null, "", …)`) and show the list view, so no history entry is added.

  The browser's Back button, or any other change to a non-note route, MUST also show the list view. In every case, when the list view shows again, focus MUST move to the link of the note that was open if it's in the list at that moment, or else to the "Your notes" `<h2>` (`tabindex="-1"`). The focused element is scrolled into view.
- R25: Note text MUST NOT appear in the URL, `document.title` or `history.state`. The URL holds only the id. `document.title` stays "QuickNotes" in every view. Any `history.replaceState` call passes `null` as its state, and the app doesn't call `history.pushState`.

### Unsaved form text
- R26: Opening a note MUST NOT unmount or reset the form. When the list view shows again, both fields' values, any counters, field errors and messages ("Note saved." or an alert), and the saving state MUST be exactly as they were. The text is kept in memory only: never in IndexedDB, `localStorage`, `sessionStorage`, cookies, Cache Storage, the URL or `history.state` (`create-note` R25). The `create-note` "Leave site?" warning MUST stay active while the note view shows and either field has text.
- R27: A save that is in progress when a note is opened MUST complete normally, with this one change to `create-note` R11 and R21: if the note view is showing when the save settles, focus MUST NOT move. On success, the fields clear, "Note saved." is set in the status region and the note is added to the list (R14). On failure, the text and the alert message are kept. Either outcome is visible when the list view shows again.

### Skip link
- R28: In the list view, the first focusable element in the document MUST be a link with the text "Skip to your notes", placed before the header. It MUST be visually hidden until it has focus, then shown at the top left of the page (white background, accent text, at least 44px tall) with the global focus outline. Activating it MUST move focus to the "Your notes" `<h2>` and scroll it into view, without changing the URL or adding a history entry. It MUST NOT be rendered in the note view. Focus on load still goes to Title (R2), so the skip link is reached with Shift+Tab from Title, or Tab from the start of the page.

### Announcements
- R29: The "Your notes" section MUST contain one alert region (`role="alert"`) that exists, empty, from the first render. It is used only for the load-failure message (R12). No live region announces loading, a loaded list, the empty state or a newly added note (the form's "Note saved." already covers a save). The note view uses focus (R23), not live regions. The form's live regions are unchanged (`create-note` R34).

### Look, layout and accessibility
- R30: The list and the note view MUST follow `project-foundation` R24-R30 and `create-note` R32: system font, zinc greys, white surfaces, the single `accent` (`blue-700`), no new colour token, no animations or transitions. Hover uses `zinc-100`. No state (hover, focus, previously opened) uses a new colour. Every link MUST show the global 2px accent `:focus-visible` outline, and no ancestor may clip it.
- R31: Both views MUST meet `project-foundation` R28 and R29 (360px to 1920px with no horizontal scroll; reflow at 320px, at 200% text and with WCAG 1.4.12 text spacing), including with 200-character unbroken titles, long unbroken previews and a 100,000-character unbroken body.
- R32: Each note link and the "Back to notes" link SHOULD be at least 44px tall.
- R33: Every state in the States table MUST meet WCAG 2.1 AA, with zero axe violations for the `wcag2a`, `wcag2aa`, `wcag21a` and `wcag21aa` tags.

### Performance
- R34: Measured in headless Chromium against the production build, with 1,000 stored notes (each with a 60-character title and a 2,000-character body):
  - Title MUST be focused within 1,000 ms of navigation start (as `create-note` AC-4);
  - all 1,000 note links MUST be in the DOM within 2,500 ms of navigation start;
  - no long task (`PerformanceObserver`, `longtask`) longer than 300 ms may occur from navigation start until all links are in the DOM;
  - opening a note whose body has 100,000 characters MUST show its full body with focus on its heading within 1,000 ms of the click, and going back MUST put focus on its link within 1,000 ms, each with no long task over 300 ms.
- R35: The list MUST be built with React and the platform only: no list-virtualisation or other new library.

### Storage use, privacy and guards
- R36: The UI MUST call only the repository's `create`, `list` and `get`. It MUST NOT call `update`, `delete` or `isPersisted`. Rendering the form and typing MUST NOT call any repository method.
- R37: The storage boundary MUST stay exactly as `create-note` R29-R31 set it: UI modules import only `src/storage/index.ts`, its export list is unchanged, and `tests/tooling/storage-boundary.test.ts` is not loosened.
- R38: `project-foundation` AC-33 MUST be revised exactly as the owner decided (Owner decisions item 1) and MUST pass (AC-58).
- R39: Loading the list and opening a note MUST make no network request and MUST NOT write anything anywhere: no note record, no `localStorage`, `sessionStorage`, cookie or Cache Storage entry. The only storage side effect allowed is the lazy creation of the empty `quicknotes` database by the first read (`note-storage` R25, R27). Nothing in this slug may call `navigator.storage.persisted()` or `persist()` (`note-storage` R31).
- R40: This slug MUST NOT add a runtime dependency (`dependencies` stays exactly `react` and `react-dom`). A dev-only dependency MAY be added if the plan justifies it, under `project-foundation` R5 with the exception list unchanged.
- R41: The UI MUST NOT write note text to the console, and MUST NOT put note text in any error message (`create-note` R24, now covering `list` and `get` failures too).
- R42: Before ship, the real-browser checks (AC-61 and AC-52) MUST be done by hand on the live site and recorded. Agents never mark them passed (per product/decisions.md §4.1).
- R43: Every new e2e test that stores or seeds notes MUST run in its own browser context, as `create-note` R28 requires. `create-note` AC-42 (no `launchPersistentContext` or `storageState`) stays unchanged.

## User experience

### Flows
- **US-1 / US-2 (open the app and see notes):**
  1. The user opens `https://ai-integration-techie.github.io/quicknotes/`.
  2. The "New note" form shows straight away, with the cursor in Title, exactly as today. The info text sits below it.
  3. Below that, "Your notes" shows "Loading your notes…" for a moment (often too briefly to notice).
  4. The list appears: every note, newest update first. Each entry shows the title (or "Untitled note"), a one- or two-line preview and "Updated 5 minutes ago".
  5. Focus stays in Title throughout. The user can type at any point.
- **US-3 (open a note):**
  1. The user clicks or taps an entry, or Tabs to it and presses Enter.
  2. The page shows the note view: "Back to notes", the title as a heading, "Updated …", and the full body with its line breaks and spacing. The URL ends in `#note/<id>`.
  3. Focus is on the note's heading, so a screen reader reads the title.
- **US-4 (back to the list):**
  1. The user activates "Back to notes", or presses the browser's Back button.
  2. The form and list show again, the URL loses its `#note/…` part, and focus is on the entry they had opened.
- **US-5 (reload, link, unknown note):**
  1. Reloading at `#note/<id>` reopens that note (with the browser's "Leave site?" warning first, if the form had text).
  2. "Back to notes" then shows the list, without adding a history entry.
  3. At `#note/<id>` for a note that doesn't exist, or a malformed id, the view shows "Note not found" and the "Back to notes" link.
- **US-6 (save, then see it):**
  1. The user saves a note with the form.
  2. "Note saved." is announced, the fields clear, focus returns to Title (unchanged), and the note appears at the top of "Your notes".
- **US-7 (unsaved text):**
  1. The user has typed a half-finished note, then opens an existing note to check something.
  2. On "Back to notes" (or browser Back), the half-finished text is still in the form, exactly as left.
- **US-8 (empty and failures):**
  1. With no notes, "Your notes" shows "No notes yet" / "Notes you save will show up here."
  2. If the notes can't be read, "Your notes" shows the failure message, which is announced. The form still works.
  3. If an opened note can't be read, the view says so and offers "Back to notes".
- **US-11 (skip link):**
  1. From the top of the page (or Shift+Tab from Title), the first Tab stop is "Skip to your notes", which appears when focused.
  2. Enter moves focus to the "Your notes" heading. The next Tab reaches the first note.

### Screens / views
Two views on one page. No wireframe; layout from top to bottom.

- **List view** (no hash, or any hash that isn't a note route):
  - **Skip link:** "Skip to your notes", visually hidden until focused; when focused, it shows at the top left over the header (`bg-white`, accent text, underlined, `px-3 py-2`, at least 44px tall, with the focus outline).
  - **Header:** unchanged (`<h1>` "QuickNotes").
  - **Main** (`max-w-3xl`, centred, `px-4` / `sm:px-6`, as today):
    - **New note section:** unchanged from `create-note`.
    - **Info text:** unchanged from `create-note` (centred, `mt-12`).
    - **Your notes section,** about 3rem below the info text (`mt-12`), with bottom padding (`pb-12`):
      - `<h2>` "Your notes": `zinc-900`, semibold, `text-lg`, left-aligned (same style as "New note").
      - **Loading:** "Loading your notes…", `text-base`, `zinc-600`, below the heading.
      - **Empty:** "No notes yet" (`zinc-900`, medium, `text-lg`) and "Notes you save will show up here." (`zinc-600`, `text-base`), left-aligned below the heading.
      - **Failure:** the message in the alert region below the heading, `text-base`, `zinc-900`. Plain text; no red (per product/decisions.md §2.4).
      - **List:** a white box with a 1px `zinc-300` border and rounded corners, items separated by 1px `zinc-200` lines. Each item is one block link, `px-4 py-3`, full width, hover `bg-zinc-100`:
        - title line: `text-base`, medium, `zinc-900`, wrapping (`break-words`); "Untitled note" in `zinc-600`;
        - preview line: `text-sm`, `zinc-600`, wrapping;
        - updated line: `text-sm`, `zinc-600`.
        - No underline, icon or chevron. The global 2px accent outline shows on focus and isn't clipped by the box.
- **Note view** (`#note/<id>`):
  - **Header:** unchanged. No skip link.
  - **Main** (same column):
    - "Back to notes" link at the top (`pt-6`): accent text, underlined, `text-base`, at least 44px tall, with a "←" before it that is hidden from assistive technology.
    - **Loaded:** an `<article>` with the `<h2>` title (`text-xl`, semibold, `zinc-900`, `whitespace-pre-wrap`, `break-words`), the updated line (`text-sm`, `zinc-600`) below it, then the body (`mt-4`, `text-base`, `zinc-900`, `whitespace-pre-wrap`, `break-words`) on the page background, with bottom padding (`pb-12`).
    - **Loading:** "Opening note…" (`zinc-600`) below the link.
    - **Not found / open failure:** the `<h2>` and one paragraph (`text-base`, `zinc-900`) below the link.
- **Desktop (640px and up):** one column, capped at 48rem and centred, for both views. List items and the body fill the column.
- **360px phone:** the same column, full width minus 16px each side. Long titles and previews wrap; the body wraps; nothing scrolls sideways.

### States
| View / state | What the user sees | Announcement | Focus |
|---|---|---|---|
| List: loading | Form, info text, "Your notes", "Loading your notes…" | none | Title (on load) |
| List: loaded | Form, info text, the list of every note | none | unchanged (Title on load) |
| List: empty | "No notes yet" / "Notes you save will show up here." | none | unchanged |
| List: load failed, unavailable | "List unavailable" copy; no list | alert | unchanged |
| List: load failed, other | "List failed" copy; no list | alert | unchanged |
| List: after a save | New note first in the list; form shows "Note saved." | status: "Note saved." (existing) | Title (existing) |
| List: back from a note | Form exactly as left; list as before (minus a note found missing, R21) | none | the opened note's link, else the "Your notes" heading |
| Note view: loading | "Back to notes", "Opening note…" | none | not moved |
| Note view: loaded | "Back to notes", title heading, "Updated …", body | heading read on focus | the `<h2>` |
| Note view: untitled / no text | "Untitled note" heading; "This note has no text." | heading read on focus | the `<h2>` |
| Note view: not found | "Back to notes", "Note not found", "Not found" copy | heading read on focus | the `<h2>` |
| Note view: open failed | "Back to notes", "This note couldn't be opened", the matching copy | heading read on focus | the `<h2>` |
| Skip link focused | "Skip to your notes" shown at top left | link read on focus | the skip link |
| Render failure | The `project-foundation` error boundary message | alert (existing) | n/a |
| JavaScript off | The `project-foundation` `<noscript>` message | n/a | n/a |

The form's own states are unchanged (`create-note` States table).

### Copy & validation
Tone (from `project-foundation`): plain and friendly, sentence case, no
jargon, no exclamation marks.

| Location | Exact text |
|---|---|
| Skip link | Skip to your notes |
| List section heading (`<h2>`) | Your notes |
| List loading | Loading your notes… |
| Empty state, primary | No notes yet |
| Empty state, secondary | Notes you save will show up here. |
| List unavailable | Your notes couldn't be loaded. This browser isn't letting QuickNotes read its storage right now, which can happen in private browsing. Reload the page to try again. |
| List failed | Your notes couldn't be loaded because something went wrong. Reload the page to try again. |
| Blank title stand-in (list and view) | Untitled note |
| Preview truncation mark | … (U+2026, after the first 100 characters) |
| Updated line | Updated just now / Updated {n} minute(s) ago / … / Updated {n} year(s) ago (R8) |
| Back link | Back to notes |
| Note loading | Opening note… |
| Blank body | This note has no text. |
| Not found heading | Note not found |
| Not found | This note isn't on this device. It may have been deleted, or the link may be wrong. |
| Open failure heading | This note couldn't be opened |
| Open unavailable | This browser isn't letting QuickNotes read its storage right now, which can happen in private browsing. Go back to your notes, or reload the page to try again. |
| Open failed | Something went wrong while opening this note. Go back to your notes, or reload the page to try again. |

All `create-note` and `project-foundation` copy is unchanged, including
the info text. `document.title` stays "QuickNotes".

This slug has no input, so no validation. The display rules are R6
(blank title), R7 (preview) and R8 (relative time). Ids in the URL are
checked against the UUID form (R20).

### Accessibility
Target: WCAG 2.1 AA (charter).
- **Structure, list view:** skip link, `banner` (`<h1>` "QuickNotes"), `main` with the "New note" section (`<h2>`), the info text, and the "Your notes" section (`<h2>`) holding the list. No skipped heading levels.
- **Structure, note view:** `banner`, then `main` with the "Back to notes" link and an `<article>` labelled by its `<h2>`. Everything from the list view is hidden from assistive technology.
- **List semantics:** a real list with one item per note, announced with its count. Tailwind's reset removes list markers, and Safari then drops list semantics, so the plan MUST keep them (for example `role="list"` on the `<ul>`). If that needs a lint exception, it MUST be the narrowest rule option (for example `jsx-a11y/no-redundant-roles` allowing `ul: ["list"]`), named in the plan and commented. The jsx-a11y recommended set stays on.
- **Note links:** one Tab stop per note. Name = the title (or "Untitled note"); description = preview and updated time, through `aria-describedby`.
- **Keyboard:** Tab order in the list view: skip link → Title → Note → Save note → each note link in list order. Enter opens a note. In the note view, "Back to notes" is the first Tab stop in `main`. Browser Back (Alt+Left, Cmd+[) works. No keyboard trap.
- **Focus:** on load → Title (or the note's heading at a note route). On open → the note's `<h2>`. On back → the opened note's link, or the "Your notes" `<h2>`. Skip link → the "Your notes" `<h2>`. A save while the note view shows doesn't move focus.
- **Live regions:** the "Your notes" alert region for a load failure only (R29). The form's regions are unchanged. Nothing announces loading or a loaded list, so opening the app doesn't interrupt the announcement of the Title field.
- **Contrast:** `zinc-900` and `zinc-600` on white, `zinc-50` and `zinc-100` (`zinc-600` on `zinc-100` is about 7.0:1), and accent on white and `zinc-50` (6.7:1 and 6.4:1). All pass 4.5:1.
- **Zoom and reflow:** titles, previews and the body wrap; no horizontal scroll at 320px, at 200% text or with 1.4.12 text spacing.
- **Motion:** none.
- **Manual pass:** VoiceOver on macOS Safari and iOS Safari, plus a keyboard-only pass in desktop Chrome (AC-52).

## Acceptance criteria
Test layers, as in `create-note`: **component** = Vitest + React Testing
Library in jsdom (`npm test`), with a repository supplied by the test
(the in-memory double, or a stub whose methods resolve, reject with an
error class from `src/storage/index.ts`, or stay pending), the route set
through `location.hash` before render, and the time set with
`vi.setSystemTime` where it matters. **e2e** = Playwright against the
production build under `/quicknotes/`, loaded with `gotoApp` from
`e2e/app.ts` (a note route is `APP_PATH` plus `#note/<id>`), each test in
its own context (R43). **Seeded** means notes written straight into the
`quicknotes` database's `notes` store in the page (schema as
`note-storage` R27) before a reload. **tooling** = Vitest under
`tests/tooling/`. **manual** = recorded in `review.md` or at ship.

"Activating a link" in a component test means clicking it; the plan
decides how jsdom follows the hash. Note ids in examples are valid UUIDs
from the repository.

Naming: AC-58 here is the revised `project-foundation` AC-33. This spec's
own numbers are always written without a prefix.

### Layout and first load
- AC-1 (US-1, US-9, R1): Component: given an in-memory repository with two notes, after `<App />` renders and the list settles, then `main` holds, in DOM order, the "New note" section, the two info lines and the "Your notes" section; the level-2 heading names are exactly `["New note", "Your notes"]`; there is exactly one level-1 heading. Inside the "New note" section there are exactly 2 textboxes, 1 button and no link. There is no searchbox or checkbox on the page.
- AC-2 (US-9, R2): Component: given a repository whose `list()` stays pending, after render, then Title has focus and "Loading your notes…" is shown. When "abc" is typed into Title and then `list()` resolves with 3 notes, then Title still has focus, its value is "abc", and neither field is read-only.
- AC-3 (US-9, R2): Component: given a spy repository whose `list` records, at the moment it is called, whether the Title field is in the document, after render, then it recorded `true`.
- AC-4 (US-9, R2, R12): Component: given `list()` rejecting with `StorageUnavailableError`, after render, then Title has focus, and saving "a" / "b" still calls `create` once and shows "Note saved.".
- AC-5 (US-1, R3): Component: given a spy repository, when the app renders, the user types, saves a note, opens a note, goes back, and `location.hash` is set to `#elsewhere`, then `list` was called exactly once.

### The list
- AC-6 (US-1, R4): Component: given a stub `list()` resolving `[X, Y, Z]` where X has the lowest `updatedAt`, then the note links are in the order X, Y, Z (the UI doesn't re-sort). Given an in-memory repository with notes created at clocks 1000 (A), 3000 (B) and 2000 (C), then the order is B, C, A.
- AC-7 (US-1, US-10, R4): Component: given a stub `list()` resolving 1,000 notes, then the "Your notes" list has exactly 1,000 list items, each with one link whose `href` is `#note/<that note's id>`, and nothing on the page matches `/load more|show more|next page/i`.
- AC-8 (US-2, R5, R8): Component: given the system time `2026-10-08T12:05:00Z` and a note `{ title: "Shopping", body: "Milk\nEggs", updatedAt: Date.parse("2026-10-08T12:00:00Z") }`, then its link's accessible name is "Shopping", its accessible description is "Milk Eggs Updated 5 minutes ago", and it contains a `<time>` with `dateTime` `"2026-10-08T12:00:00.000Z"`.
- AC-9 (US-2, R6): Component: given notes with titles `""`, `" "` and `"\t"`, then each link's name is "Untitled note". Given the title `"  lead  "`, the title line's `textContent` is `"  lead  "`. Given a 200-character title, its full text is in the document (not truncated).
- AC-10 (US-2, R7): Component: given these bodies, the preview line's text is:
  - `"line1\n\n  line2\tend"` → `"line1 line2 end"`;
  - 150 × `"a"` → 100 × `"a"` + `"…"`;
  - 100 × `"a"` → 100 × `"a"` (no `"…"`);
  - 101 × `"😀"` → 100 × `"😀"` + `"…"`, with no lone surrogate;
  - 99 × `"a"` + `" b"` + 10 × `"c"` → 99 × `"a"` + `"…"`;
  - `""`, `"   "` and `"\n\n"` → no preview line, and the link's description is only the updated line.
- AC-11 (US-2, R8): Component: given the system time T = `2026-10-08T12:00:00Z` and notes with `updatedAt` = T minus each value below, then the updated lines read:
  - 0, −5,000 ms (future) and 59,999 ms → "Updated just now";
  - 60,000 ms → "Updated 1 minute ago"; 59 min → "Updated 59 minutes ago";
  - 60 min → "Updated 1 hour ago"; 23 h 59 min → "Updated 23 hours ago";
  - 24 h → "Updated 1 day ago"; 6 days 23 h → "Updated 6 days ago";
  - 7 days → "Updated 1 week ago"; 29 days → "Updated 4 weeks ago";
  - 30 days → "Updated 1 month ago"; 364 days → "Updated 12 months ago";
  - 365 days → "Updated 1 year ago"; 800 days → "Updated 2 years ago".
- AC-12 (US-2, R8): Component: given a note updated at T and the system time T, then it reads "Updated just now". When the system time moves 10 minutes on and nothing else happens (timers advanced), it still reads "Updated just now". After opening the note and going back, it reads "Updated 10 minutes ago".
- AC-13 (US-3, R9): Component: given a note with title `"<img src=x onerror=alert(1)>"` and body `"**bold** <script>x</script>"`, then in the list and in the note view that text appears literally, and `main` contains no `img`, `script` or `strong` element. Tooling: no UI module matches `/dangerouslySetInnerHTML|innerHTML|outerHTML|insertAdjacentHTML/`; a fixture containing each one makes the check fail.

### List states
- AC-14 (US-8, R10, R29): Component: given `list()` pending, then the "Your notes" section shows "Loading your notes…", has `aria-busy="true"`, has no list and no "No notes yet", and the loading text has no ancestor with `aria-live`, `role="status"` or `role="alert"`. After `list()` resolves, the loading text is gone and `aria-busy` is absent or `"false"`.
- AC-15 (US-8, R11): Component: given `list()` resolving `[]`, then the section shows "No notes yet" and "Notes you save will show up here.", no element with role `list`, and its alert region is empty.
- AC-16 (US-8, R12): Component: given `list()` rejecting with `new StorageUnavailableError()`, then the section's alert region text is exactly the "List unavailable" copy, and there is no list and no "No notes yet". Given rejections with `QuotaExceededError`, `NotFoundError`, `ValidationError`, `new Error("boom")` and the non-Error value `"boom"`, the text is exactly the "List failed" copy each time, and "boom" doesn't appear in the document.
- AC-17 (US-8, R29): Component: given `<App />` just rendered with `list()` pending, then the "Your notes" section contains exactly one `role="alert"` element, and it is empty; the form still contains its own one status and one alert region (`create-note` AC-50).
- AC-18 (US-8, R13): Component: given the AC-16 unavailable state, when "a" / "b" is saved and `create` resolves, then the section still shows the "List unavailable" copy and no list item.

### Refresh after a save
- AC-19 (US-6, R14, R15): Component: given an in-memory repository with notes A and B loaded, when "New" / "Body" is saved, then the first link's name is "New", there are 3 items, `list` was called once in total, "Note saved." is in the status region, both fields are empty and Title has focus.
- AC-20 (US-6, R14): Component: given `list()` resolving `[]`, when "Only" is saved, then the list shows exactly one item, "Only", and "No notes yet" is gone.
- AC-21 (US-6, R14): Component: given `list()` pending, when a save resolves with note N and then `list()` resolves with (a) `[N, A]` or (b) `[A]`, then in both cases the links are N, A, and N appears once.
- AC-22 (US-6, R14): Component: given notes A and B loaded, when a save is rejected with `StorageUnavailableError`, then the list still has exactly A, B in that order.
- AC-23 (US-6, R14): e2e: given a fresh context, when "First" and then "Second" are saved through the form, then without a reload the "Your notes" list shows "Second" then "First", and a marker set on `window` before the saves is still set (no navigation happened).

### Opening a note
- AC-24 (US-3, R16, R17, R18, R19): Component: given notes A (`"Shopping"` / `"Milk\n\n  Eggs\tx"`) and B loaded, when A's link is activated, then `location.hash` is `#note/<A.id>`, `get` was called once with `A.id`, and the view shows the link "Back to notes", a level-2 heading "Shopping" with focus, and a body element whose `textContent` is `===` `"Milk\n\n  Eggs\tx"`. `queryByRole` finds no textbox, no "Save note" button, no "Your notes" heading and no "Skip to your notes" link.
- AC-25 (US-3, R18): Component: given A loaded in the list and `get(A.id)` resolving with title "Fresh", when A is opened, then the heading is "Fresh". Given `get` pending, the view shows "Back to notes" and "Opening note…", no level-2 heading, and focus is not on any element inside the view.
- AC-26 (US-3, R19): Component: given a note with title `" "` and body `""`, when opened, then the heading is "Untitled note" and "This note has no text." is shown. Given body `"  \n "`, "This note has no text." is shown. Given title `"  lead  "`, the heading's `textContent` is `"  lead  "`.
- AC-27 (US-3, R19): Component: given an opened note, then `main` contains no textbox, no `[contenteditable]`, no button, and exactly one link, "Back to notes".
- AC-28 (US-5, R20): Component: given `location.hash` `#note/<A.id>` before render, then the note view for A shows with focus on its heading, `list` was called once and `get` once. Given `#note/not-a-uuid`, `#note/` and `#note/<A.id in upper case>`, then "Note not found" shows and `get` was not called. Given `#elsewhere` and `#`, the list view shows with focus in Title.
- AC-29 (US-5, R21, R24): Component: given A in the list and `get(A.id)` rejecting with `NotFoundError`, when A is opened, then the heading "Note not found" has focus and the "Not found" copy is shown. After "Back to notes", A is no longer in the list and the "Your notes" heading has focus.
- AC-30 (US-8, R22): Component: given `get` rejecting with `StorageUnavailableError`, then the heading "This note couldn't be opened" has focus and the "Open unavailable" copy is shown. Given `new Error("boom")`, the "Open failed" copy is shown and "boom" isn't in the document. In both cases the list, after going back, is unchanged.
- AC-31 (US-4, R23, R24): Component: given A opened from the list, when "Back to notes" is activated, then the list view shows, `location.hash` is empty, and A's link has focus. Given A opened from the list, when `location.hash` is set to `""` and `hashchange` fires (as browser Back does), then the same holds.
- AC-32 (US-4, US-5, R16, R20, R24): e2e: given a fresh context with notes A and B saved through the form, when A's link is clicked, then the URL matches `/\/quicknotes\/#note\/[0-9a-f-]{36}$/` and A's heading is focused. `page.goBack()` → the list view, the URL has no `#note/`, and A's link is focused. `page.goForward()` → A's view again. `page.reload()` → A's view, heading focused. Then "Back to notes" → the list view, no `#note/` in the URL, and `history.length` is the same as before the click.
- AC-33 (US-4, R24): e2e: given A opened from the list, when `history.length` is read, "Back to notes" is clicked, and `history.length` is read again, then both values are equal, and `page.goForward()` shows A's view (the link went back, it didn't add an entry).
- AC-34 (US-5, R25): e2e: given a note "SECRET-TITLE" / "SECRET-BODY" saved and opened, then `page.url()` doesn't contain "SECRET", `document.title` is "QuickNotes", and `JSON.stringify(history.state)` doesn't contain "SECRET". After "Back to notes" from a reloaded note route, `history.state` is `null`.
- AC-35 (US-3, R16): e2e: given a saved note, when its link is focused by Tab and Enter is pressed, then its view opens. Given a context with `hasTouch: true`, when the link is tapped (`locator.tap()`), then its view opens.
- AC-36 (US-5, R20, R21): e2e: given a fresh context loaded at `#note/00000000-0000-4000-8000-000000000000`, then "Note not found" is visible and focused; "Back to notes" shows the list view.
- AC-37 (US-3, R19): e2e: given a note with body `"line one\nline two\n\n    indented\t😀 עברית"` saved and opened, then the body element's `textContent` equals that body, its computed `white-space` is `pre-wrap`, and its height is at least 4 times its computed `line-height`.

### Unsaved form text
- AC-38 (US-7, R26): Component: given 181 characters typed in Title (so the counter shows) and "draft" in Note, when a note is opened and then "Back to notes" is activated, then Title still holds the same 181 characters, Note holds "draft", and "181 of 200 characters" is shown. Given the title-too-long error state instead, the error message and `aria-invalid` are still there after going back. While the note view shows, a cancelable `beforeunload` event has `defaultPrevented` true, `localStorage.length` and `sessionStorage.length` are 0, `location.hash` is `#note/<id>`, and `history.state` is `null`.
- AC-39 (US-7, R26): e2e: given "half a thought" typed into Note, when a note is opened and `page.goBack()` is called, then Note's value is "half a thought". While the note view shows, `page.close({ runBeforeUnload: true })` fires a `beforeunload` dialog.
- AC-40 (US-7, R27): Component: given A loaded, "New" typed into Title and a `create` that stays pending, when Save note is clicked and A is opened (view loaded, heading focused), and `create` then resolves with note N, then focus is still on A's heading. After "Back to notes", both fields are empty, the status region reads "Note saved.", and N is the first list item. Given `create` rejecting with `StorageUnavailableError` instead, after going back Title still holds "New" and the alert region shows the "Storage unavailable" copy (`create-note`).

### Skip link
- AC-41 (US-11, R28): Component: given the list view, then the first focusable element in document order is a link named "Skip to your notes", placed before the `banner`. Activating it moves focus to the "Your notes" heading (which has `tabindex="-1"`), and `location.hash` and `history.length` are unchanged. In the note view, no link named "Skip to your notes" exists.
- AC-42 (US-11, R28): e2e: given a fresh context with one saved note and focus in Title, when Shift+Tab is pressed, then the skip link has focus, its bounding box is inside the viewport and at least 44px tall, and its outline is 2px `rgb(29, 78, 216)`. Before it has focus, its bounding box is at most 1×1px or outside the viewport. Enter moves focus to the "Your notes" heading with the URL unchanged, and the next Tab focuses the note's link.

### Announcements
- AC-43 (US-11, R29): Component: given in turn a pending, a resolved non-empty and a resolved empty `list()`, and then a successful save, then no element inside the "Your notes" section with `role="status"`, `role="alert"` or `aria-live` ever has text. Only the AC-16 failure puts text in its alert region.

### Look, layout and accessibility
- AC-44 (US-11, R33): e2e: given each state in turn, when axe runs with the tags `wcag2a`, `wcag2aa`, `wcag21a` and `wcag21aa`, then there are zero violations, `color-contrast` is not in `incomplete` and passes on at least 3 nodes:
  - list loaded with an untitled note, a note without a body and a normal note;
  - list loading (an init script that makes `indexedDB.open` never succeed);
  - list empty;
  - list load failed (the `create-note` AC-34 init script that makes `indexedDB.open` throw);
  - note view loaded; note view untitled with no text; not found; open failed (the same throwing init script, at a note route);
  - skip link focused.

  The `project-foundation` "axe detects a contrast failure" check still fails as expected.
- AC-45 (US-11, R31, R32): e2e: given viewports 360x740, 768x1024, 1280x800 and 1920x1080, a list with three notes (one with a 200-character unbroken title, one with a 5,000-character unbroken body, one normal), and then the note view of a note with a 100,000-character unbroken body, then at each size `scrollWidth <= innerWidth` in both views, every note link and the "Back to notes" link lie fully within the viewport horizontally and are at least 44px tall, and the `main` column's horizontal centre is within 2px of the viewport's.
- AC-46 (US-11, R31): e2e: given a 320x640 viewport and root font size 200%, then the list view (with the AC-45 notes) and the note view have no horizontal scroll, and every title, preview, updated line, the body and "Back to notes" are visible.
- AC-47 (US-11, R31): e2e: given a 360px viewport and the WCAG 1.4.12 text-spacing CSS, then in the list view (AC-45 notes) and the note view there is no horizontal scroll, and no `h2`, title line, preview line, updated line, body element or link is clipped (`scrollWidth <= clientWidth` and `scrollHeight <= clientHeight`).
- AC-48 (US-11, R30): e2e: given the list view with notes, a hovered note link and the note view, then the `project-foundation` "no animations or transitions" check passes. A note link and "Back to notes", focused by keyboard, have `outline-style` not `none`, `outline-width` at least 2px and `outline-color` `rgb(29, 78, 216)`, and no ancestor of a note link has a computed `overflow` other than `visible`. Tooling: `project-foundation` AC-25 (one non-zinc token, `accent`) still passes.
- AC-49 (US-11, R4): tooling or component: given the list, then the `<ul>` is exposed with role `list` and each note is a `listitem` (`getByRole('list')` inside the "Your notes" section has as many `listitem`s as notes). If the plan adds a lint rule option for this, the ESLint config test checks that only that option was added and the jsx-a11y recommended set is still on.

### Performance
- AC-50 (US-9, US-10, R34): e2e: given a fresh context seeded with 1,000 notes (60-character titles, 2,000-character bodies) and reloaded with a `longtask` `PerformanceObserver` registered by init script, then Title is focused at a `performance.now()` below 1,000; all 1,000 note links are in the DOM at a `performance.now()` below 2,500; no long task over 300 ms was recorded up to then; and `page.keyboard.type("Hello")` straight after focus makes Title's value "Hello".
- AC-51 (US-10, R34): e2e: given the AC-50 seed plus one note with a 100,000-character body of 2,000 lines, whose `updatedAt` is set so that it sorts as item 900, when its link is scrolled to and clicked, then within 1,000 ms its heading is focused and the body's `textContent` has 100,000 characters. When "Back to notes" is clicked, then within 1,000 ms its link is focused and inside the viewport. No long task over 300 ms is recorded in either step.

### Manual accessibility check
- AC-52 (US-11, R42): manual, recorded in `review.md`: with VoiceOver on macOS Safari and on iOS Safari, and in a keyboard-only pass in desktop Chrome:
  - on load, focus is announced as the "Title" text field, and nothing else interrupts it;
  - "Your notes" is announced as a list with the right number of items; each link reads its title, then its preview and updated time;
  - the skip link appears on focus and moves to "Your notes";
  - opening a note announces its title as a heading; "Back to notes" and browser Back return focus to that note's link;
  - a load failure (forced by blocking site data) announces its message;
  - "Note not found" is announced for an unknown id.

### Storage use, privacy and guards
- AC-53 (US-13, R36): Component: given a spy repository (every method a `vi.fn`; `list` resolves `[A]`, `get` resolves A, `create` resolves a note), when the app renders, then `list` has 1 call and nothing else has been called; typing in both fields adds no call; one save adds exactly one `create` call; opening A adds exactly one `get` call; going back adds none. `update`, `delete` and `isPersisted` are never called.
- AC-54 (US-13, R37): tooling: `tests/tooling/storage-boundary.test.ts` runs with the `create-note` AC-43 to AC-46 checks and the `note-storage` AC-51 and AC-53 checks unchanged in what they assert, and passes, including the pinned export list of `src/storage/index.ts`.
- AC-55 (US-12, R40): tooling: `package.json` `dependencies` has exactly the keys `react` and `react-dom`, and `tests/tooling/licences.test.ts` passes with its exception list unchanged.
- AC-56 (US-12, R41): Component: given notes titled "SECRET-T" with body "SECRET-B" loaded and opened, and then `get` rejecting with `StorageUnavailableError` and `list` rejecting with `new Error("x")` in further renders, then a spy on `console.log/info/warn/error/debug` recorded no call whose arguments contain "SECRET".
- AC-57 (US-12, R39): e2e: given a fresh context with two notes saved, request logging, and an init script that counts calls to `StorageManager.prototype.persisted` and `persist`, when the page is reloaded and the network is idle, the request log and counters are cleared, and then both notes are opened and closed in turn, then no request was recorded and both counters are 0. `localStorage.length` and `sessionStorage.length` are 0, `document.cookie` is empty, and the `notes` store still holds exactly 2 records.
- AC-58 (US-12, US-13, R38; revised `project-foundation` AC-33): e2e, in `e2e/privacy.spec.ts`, replacing the "no storage or cookies on fresh load" test: given a fresh context with request logging and an init script that counts calls to `StorageManager.prototype.persisted` and `persist`, when `gotoApp(page, { waitUntil: "networkidle" })` runs and "No notes yet" is visible, then:
  - `localStorage.length` and `sessionStorage.length` are 0, `document.cookie` is `""`, and `context.cookies()` is `[]`;
  - `caches.keys()` resolves `[]`;
  - both counters are 0;
  - opening `quicknotes` in the page and counting its `notes` store gives 0 (if the store doesn't exist, the count is taken as 0);
  - every logged request is a `GET` to the page's origin whose path starts with `/quicknotes/`, or is `/favicon.ico`.

  The test doesn't check whether the database exists.
- AC-59 (US-12, R26, R39; revised `create-note` AC-39): e2e: given a fresh context, when the app loads and "draft" is typed into both fields (no save) and the network goes idle, then `localStorage.length` and `sessionStorage.length` are 0, `document.cookie` is empty, the `notes` store count is 0 (as in AC-58), and the page URL is unchanged.
- AC-60 (US-13, R43): tooling: `create-note` AC-42 (no `launchPersistentContext` or `storageState` in `playwright.config.ts` or `e2e/`) passes unchanged. Every new e2e test that saves or seeds notes uses the per-test `page` fixture or a context it creates and closes.

### Real-browser check (ship)
- AC-61 (US-1, US-3, US-4, US-5, R42): manual at ship, on the live URL, in current desktop Chrome and current desktop Safari, each in turn:
  1. Open the app. The existing notes, including the A8 check notes from `create-note` AC-58, are listed newest first, with titles, previews and "Updated …" lines.
  2. Open each A8 note. Its title and two-line body with an emoji show exactly as saved.
  3. Use "Back to notes", then the browser's Back and Forward buttons, then reload on a note. Each behaves as in AC-32.
  4. Save a new note. It appears at the top straight away.

  The result for each browser and step is recorded at ship. Agents never mark it passed.

## Constraints
- **Charter:** React + Vite + TypeScript + Tailwind; no backend; notes never leave the device; WCAG 2.1 AA; $0; "ready to type in under 1 second"; 1,000 notes is the scale.
- **Owner decisions (intent, 2026-10-09)** are binding: AC-33 revised exactly as stated (item 1); form first and "Your notes" below, a note view that replaces the main content with "Back to notes", focus back on the opened note, `#note/<id>` history entries holding only the id, Back and reload working, and unsaved form text never lost (item 2).
- **Standing decisions** (product/decisions.md, Approved): explicit actions, no drafts (§2.1); plain, specific errors (§2.2); no silent fallbacks (§2.3); one accent, no red (§2.4); accessibility first (§2.5); platform limits recorded as risks (§2.6); no new runtime dependency (§3.2); guards revised in a named table (§3.4); manual real-browser checks (§4.1); branch, PR and green CI before merge (§4.2); the owner appears only as "AITechie" (§5.1).
- **Storage layer used as shipped:** `list()` order (R17), single-transaction read (R39), lazy open (R25), `get` and `NotFoundError` (R13), typed errors (R20) and no persistence calls on reads (R31) come from `note-storage` and are not changed here. If one proves wrong for the list, it goes back to `note-storage` as a spec change.
- **Routing:** hash-based on the one `/quicknotes/` page, so GitHub Pages needs no fallback page (`pages-deploy` non-goal). No routing library.
- **Design system:** `project-foundation`'s zinc greys, the one `accent` (`blue-700`), the global focus outline, the system font, no animations. No new colour token.
- **Browsers and sizes:** inherited from `project-foundation`: last 2 versions of Chrome, Edge, Firefox, Safari and iOS Safari; 360px to 1920px, reflow at 320px. Automated browser tests run in Chromium only; Safari is covered by AC-52 and AC-61.
- **Tests:** component tests in Vitest + React Testing Library (jsdom); e2e, layout, axe and performance checks in Playwright (headless Chromium) under `/quicknotes/` through `gotoApp`, each storing test in its own context; tooling tests under `tests/tooling/`. Every check runs in `npm run ci`, except the manual AC-52 and AC-61.
- **Lint:** `eslint-plugin-jsx-a11y` recommended stays on. Any rule option added for list semantics must be the narrowest possible and named in the plan.

## Non-goals
- Editing a note (`edit-note`); the note view is read-only.
- Deleting a note, undo or a trash (`delete-note`), including cleaning up the A8 test notes.
- Search, filtering, or any sort other than most recently updated first (`search-notes`); no user-selectable sort.
- Light/dark mode (`theme-mode`). Service worker, offline install and the full cold-start launch target (`pwa-offline`).
- Any notice about persistent storage, and any call to `isPersisted()`, `persisted()` or `persist()`.
- Paging, "load more", partial loading or virtualisation.
- Live updates from other tabs (`note-storage` R35), and re-reading the list after load.
- A retry button for a failed load or open.
- Absolute dates or times, or a live-ticking relative time.
- A side-by-side (list plus note) layout, a modal, or a "selected" highlight in the list.
- Note text in the URL, page title or history state; a `pushState` router or routing library; a `404.html` fallback.
- Changing the storage layer or its public entry point.
- Tags, folders, pinning, rich text, Markdown rendering, attachments, export, import, sync or accounts (charter).
- New runtime dependencies.
- Automated Firefox or WebKit runs.

## Open questions / risks
No question needs the owner under product/decisions.md §1.2: the AC-33
revision and the layout were decided on 2026-10-09, and everything else
is applied as a decision (see "Decisions applied"). The items below are
risks recorded for visibility, per §2.6. The approver accepts them by
approving this spec.

1. **Safari list semantics (risk).** With list markers removed, Safari and VoiceOver drop list semantics unless the list has an explicit role. R4 and AC-49 require the semantics; the manual pass (AC-52) confirms them in Safari. A lint option may be needed (see Accessibility).
2. **A save that finishes while a note is open isn't announced (risk).** In that case (R27), "Note saved." or the failure message is set in the hidden form, so a screen reader doesn't announce it then. The user sees it on return. Saves usually finish in milliseconds, so this needs a very fast open right after Save.
3. **Relative times go stale on an open page (accepted by design).** With no timer (R8), "Updated just now" stays until the list view is rendered again (a save, or returning from a note). A reload refreshes it.
4. **CI timing for the performance checks (risk).** AC-50 and AC-51 run in CI's headless Chromium on shared runners. The budgets (1,000 ms, 2,500 ms, 300 ms long tasks) leave a margin over what React needs to render 1,000 short items, but CI timing varies. They prove the design doesn't block, not real-device speed. If they prove flaky, the plan may retry the measurement, but the budgets change only through a spec revision.
5. **The first load in each browser creates the empty `quicknotes` database (accepted, Owner decisions item 1).** It holds no notes and causes no permission prompt (`note-storage` R31).
6. **Note ids in browser history (minor).** Opened notes leave `…/quicknotes/#note/<id>` entries in the browser's history. The id is a random UUID with no note text in it (R25), so it reveals nothing on its own.
7. **A8 test notes show up (accepted at `create-note` approval).** The notes saved for `create-note` AC-58 appear in the list on the live site and stay until `delete-note` ships or the owner removes them by hand.
8. **Superseded items in approved specs (owner housekeeping).** As at `create-note`, agents don't edit approved artifacts. The owner may add a one-line cross-reference to `project-foundation` (AC-33) and `create-note` (R2, R11, R26, R27, R28, AC-1, AC-6, AC-37, AC-38, AC-39, decision 10) at ship.

## Approval
<!-- Who approved this spec, and when. A spec is not approved until a
     human signs off here — this is the primary judgment gate in the
     framework; do not skip it. -->
- Approved by: AITechie, 2026-10-09
