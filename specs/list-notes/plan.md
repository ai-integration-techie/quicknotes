# Plan: List notes and open one

- Status: Approved
- Slug: list-notes
- Spec: [spec.md](./spec.md) (Status: draft, under review; solo mode, so the owner approves the spec and this plan together at one gate)
- Date: 2026-10-08
- Owner: AITechie

## Decisions applied (not open questions)
The spec is still a draft. This plan is written against it as it stands.
Choices covered by [product/decisions.md](../../product/decisions.md)
(Status: Approved) are applied, with that file cited, and are not asked
again.

| # | Decision | Basis |
|---|---|---|
| A1 | No new dependency, runtime or dev. No router, no virtualisation library, no `@testing-library/user-event`. `fireEvent` and jsdom's own fragment navigation cover the component ACs, and Playwright covers real input. | §3.2; spec R35, R40 |
| A2 | Hash routing uses `location.hash`, `hashchange`, `history.back()` and `history.replaceState()`. These are platform APIs, not a wrapper. | §3.3 |
| A3 | The guards this slug changes are exactly the ones in the spec's "Changes to earlier specs" table. Each is listed by file, test and assertion under "Existing tests that change". Nothing else is loosened. | §3.4 |
| A4 | No new colour. Every state uses `zinc-*`, `white` and `accent`. Failure copy is `zinc-900` text. | §2.4; spec R30 |
| A5 | Load and open failures are stated plainly, with no retry button and no fallback. | §2.2, §2.3; spec R12, R22 |
| A6 | AC-52 (VoiceOver and keyboard) and AC-61 (live site, Chrome and Safari) are manual. Agents never mark them passed. | §4.1; spec R42 |
| A7 | Ship goes through a branch and a PR into `main`, merged only when CI is green. | §4.2 |
| A8 | The owner appears only as "AITechie". No contact details appear in any file, fixture or commit. | §5.1 |
| A9 | The narrow `jsx-a11y/no-redundant-roles` option for `<ul role="list">` (D10) is the one the spec names as allowed (Accessibility; Constraints, Lint). It is applied, not asked. | §1.1; spec AC-49 |

No choice in this plan meets a §1.2 trigger. Nothing changes the
charter. Nothing adds a dependency, a cost, a network call or a third
party. What is stored doesn't change. No guard is loosened beyond the
spec's table, and there is no new screen or flow beyond the spec's.
**There are no open questions for the owner.** The spec problems found
while planning are small. They are recorded under "Spec notes found
while planning" (risks), and the spec is not edited.

## Plan decisions for the Tech Lead
These are choices the spec leaves to the plan. Approving the plan
approves them.

| # | Decision | Why |
|---|---|---|
| D1 | **Hash navigation is a small store, one per `App` instance, read through `useSyncExternalStore`.** `createHashNavigation(window)` (in `src/routing/hashNavigation.ts`) listens for `hashchange`, keeps an immutable snapshot `{ route, visit, cameFromList, returnedFromId }`, and has `backToList()`. `useHashNavigation()` creates the store once with `useState(() => …)`. | No router dependency (A1). The first render already knows the route, so the form is still in the first render and is hidden at a note route (R2, R17). One store per instance keeps component tests isolated. `visit` goes up on every route change, so a new note entry always remounts the view and calls `get` once (R18). `cameFromList` is fixed when a note route is entered (R24). `returnedFromId` is the id of the note route just left, which focus-return needs (R24). |
| D2 | **The form stays mounted inside one `<div hidden>`** that wraps the "New note" section, the info text and "Your notes". `NoteForm` gets two new props. `active` is false while the note view shows. `onSaved(note)` reports the note that `create` resolved with. `useNoteForm` reads `active` through a ref that a layout effect updates. The ref gates every focus move it makes: Title on mount (`create-note` R2), Title after a save (R11), and the field focus after a failure (R21). | The form keeps its state while a note is open (R26), and `beforeunload` stays registered. The focus gate is the R27 change and nothing more. The reducer, the messages and the saving state are untouched. At a note route on load, Title isn't focused, because the view's heading takes focus instead (R2, R23). |
| D3 | **List state is a pure reducer** (`src/noteList/listState.ts`). Its states are `loading { savedFirst, gone }`, `loaded { notes, now }` and `failed { reason: "unavailable" \| "other" }`. Its actions are `listResolved(notes, now)`, `listRejected(reason)`, `noteSaved(note, now)`, `noteGone(id)` and `listShown(now)`. Every action returns a new object. `failed` ignores every later action. | It covers all four R14 cases, R13 and R21 in a unit-testable function, with no re-read. `now` is read in effects and handlers and passed in, never during render. eslint-plugin-react-hooks 7 (React Compiler rules) flags `Date.now()` in render, and R8 says `now` is taken on load, after a save and when the list shows again. Nothing else updates it, so no timer exists (AC-12). |
| D4 | **Exactly one `list()` per page load, and one `get(id)` per note entry, even in development StrictMode.** Each hook keeps its promise in a ref (`promiseRef.current ??= repository.list()`). Each effect run subscribes to that promise with its own "still mounted" flag. | `main.tsx` renders in `<StrictMode>`, which runs effects twice in development. The ref keeps R3 and R18 true in `npm run dev` as well as in the production build that e2e uses. The call starts in `useEffect`, which runs after the first commit (R2, AC-3). |
| D5 | **The note view (`NoteView`) is keyed by `visit`** and has four states: loading, loaded, not found and failed (`"unavailable"` or `"other"`). A malformed id (it fails `NOTE_ID_PATTERN`) starts in the not-found state and never calls `get` (R20). A `NotFoundError` calls `onGone(id)`, so the reducer drops that note (R21). | One mount per entry gives "get once on entering" (R18) without any comparison logic. It never shows the in-memory list copy (R18, AC-25). |
| D6 | **Focus and scroll.** The view's `<h2>` and the "Your notes" `<h2>` have `tabIndex={-1}`. On reaching a settled view state, `heading.focus({ preventScroll: true })` runs, then `(document.scrollingElement ?? document.documentElement).scrollTop = 0` (R23). On return to the list, `link.focus()` runs, or failing that `heading.focus()`. The default focus scroll brings the element into view (R24). | jsdom has no `scrollTo` or `scrollIntoView`; calling them logs "Not implemented" errors. Setting `scrollTop` works in browsers and does nothing in jsdom. Focus waits for the settled state, so focus doesn't move while the view is loading (R23, AC-25). |
| D7 | **Skip link:** `<a href="#notes-heading">` rendered before `<AppHeader />`, in the list view only. Its literal classes are `absolute left-2 -top-24 focus:top-2 z-10 inline-flex min-h-11 items-center bg-white px-3 py-2 text-accent underline`. A plain click calls `preventDefault()` and then `focusHeading()`. | Off-screen positioning meets AC-42 ("outside the viewport" before focus) with no utility-order conflict. `sr-only` plus `focus:not-sr-only` plus `focus:absolute` would set `position` twice. `preventDefault` keeps the URL and the history length as they were (R28, AC-41). The `#notes-heading` href is a fallback only, and it is not a note route. |
| D8 | **Back link:** `<a href={appUrl}>`, where `appUrl` is `location.pathname + location.search` (`/quicknotes/` in production). A plain primary click with no modifier calls `preventDefault()` and then `nav.backToList()`. That calls `history.back()` if `cameFromList`. Otherwise it calls `history.replaceState(null, "", appUrl)` and moves the store to the list route. Modifier and middle clicks keep the browser's default. The app never calls `pushState`. | This is R24 and R25 exactly. `replaceState` doesn't fire `hashchange`, so the store updates itself after it. The `href` stays a real URL, so the link still works when opened in a new tab. |
| D9 | **Link name and description.** Each item's link has `aria-labelledby` set to the title line's id, and `aria-describedby` set to the preview line's id (when present) and the updated line's id. The ids come from `useId()` in `NoteListItem`. | Content-based naming would put all three lines in the name. R5 says the name is the title line only, and the description is the preview followed by the updated line (AC-8, AC-10). |
| D10 | **List semantics:** `<ul role="list">` in `src/components/NoteList.tsx`. `eslint.config.js` gets one block, with a comment, scoped to that one file: `{ files: ["src/components/NoteList.tsx"], rules: { "jsx-a11y/no-redundant-roles": ["error", { ul: ["list"] }] } }`. | Tailwind's preflight sets `list-style: none`, and Safari then drops list semantics unless the role is explicit (spec risk 1). In the installed jsx-a11y 6.10.2, an option for one element replaces the default only for that element (`nav` keeps its default). This is the narrowest option the rule offers, on one file. The recommended set stays on everywhere, and AC-49's ESLint test pins this. |
| D11 | **Display rules are pure functions.** In `src/noteList/display.ts`: `isBlank(s) = /^\s*$/u.test(s)`, and `previewText(body)` collapses `/\s+/gu` to a space, trims, and when `countCharacters(collapsed) > 100` keeps `Array.from(collapsed).slice(0, 100).join("")`, trims the end and adds "…". It returns `null` for a blank body. In `src/noteList/relativeTime.ts`: `relativeTime(updatedAt, now)` uses the R8 thresholds with whole-unit flooring, `"just now"` below 60 s (including negative values), and `new Intl.RelativeTimeFormat("en-US", { numeric: "always" }).format(-n, unit)` otherwise. | Code points come from `Array.from`, so no surrogate is ever split (AC-10). `countCharacters` comes from `src/storage/index.ts`, which is already exported and allowed (R37), so "character" means the same thing everywhere. |
| D12 | **Failure mapping is pure** (`src/noteList/loadProblems.ts`). `listFailureReason(error)` gives `"unavailable"` only for `error instanceof NoteStorageError && error.kind === "unavailable"`, and `"other"` for anything else. `openOutcome(error)` gives `"not-found"`, `"unavailable"` or `"other"` the same way. These functions never read `error.message` and never log. | R12, R21, R22 and R41. A non-`Error` rejection such as `"boom"` maps to `"other"`, and its text is never rendered (AC-16, AC-30). |
| D13 | **Component-test conventions.** (a) `createStubRepository` takes new `list` and `get` options. Its default `list` changes from "reject: list must not be called" to a promise that never settles. `get`, `update`, `delete` and `isPersisted` still reject if called. (b) `src/test/setup.ts` adds `history.replaceState(null, "", "/")` to its `afterEach`, so the hash never leaks between tests. (c) The route is set before render with `history.replaceState(null, "", "/#note/<id>")`, through a new `renderAt(hash, repository)` helper. (d) "Activating a link" means `fireEvent.click(link)` and then `await settle()`. jsdom 30.1.2 (installed) follows fragment links itself. A probe run while planning confirmed that a click on `href="#note/x"` adds a history entry and fires `hashchange` in a later task. `history.back()` does the same. Ctrl+click is not told apart in jsdom, so R16's modifier rule is shown by the app not intercepting note links at all. (e) The system time is set with `vi.useFakeTimers({ toFake: ["Date"] })` and `vi.setSystemTime`, so `setTimeout` (used by `settle()`) stays real. AC-12 fakes timers too and advances them. | (a) The old rejection enforced `create-note` R27, which the spec replaces. Leaving it would put every existing form test into the "List failed" state. A pending default keeps those tests exactly as they were (the list stays in "loading"), and it avoids `act()` warnings in tests that end synchronously. The stronger, exact call-count rule moves to the rewritten AC-37 test and to AC-53. (b) to (e) follow from how jsdom behaves, as checked in the probe. |
| D14 | **E2e helpers.** `gotoApp(page, options?, hash = "")` gets an optional third argument, so a note route is `APP_PATH + "#note/<id>"` (existing callers don't change). New `e2e/notes.ts` holds: the list-notes copy; `saveNote(page, title, body)` (fills the form and waits for "Note saved."); `seedNotes(page, notes)` (opens `quicknotes` at version 1, with an upgrade that creates `notes` with `keyPath: "id"`, exactly as `note-storage` R27, puts the records and closes); `countStoredNotes(page)` (opens `quicknotes`; if `upgradeneeded` fires, it aborts that transaction so the test never creates the database, and returns 0); `trackPersistenceCalls(page)` (an init script wrapping `StorageManager.prototype.persisted` and `persist` with counters on `window`); `observeLongTasks(page)` (an init script with a buffered `PerformanceObserver` for `longtask`); and `noteLinks(page)`. Base-path regexes and prefixes come from `APP_BASE`, imported from `vite.config.ts`. | The `base-path` tooling guard allows the `/quicknotes/` literal only in `vite.config.ts`. Seeding writes the same schema the app would create, so the app reads it as it is. Aborting the upgrade keeps AC-58's "the count is 0 if the store doesn't exist" without changing the origin's storage. |
| D15 | **Every `className` is a literal `className="…"` attribute.** When a style depends on state (for example the zinc-600 "Untitled note"), the code switches between two elements, each with a literal class string, never between two strings. | `tests/tooling/theme.test.ts` (project-foundation AC-25) reads only literal `className="…"` attributes. That keeps every colour visible to the scan, as in `create-note` D5. |
| D16 | **UI source never names browser storage or HTML injection, even in comments.** | `storage-boundary.test.ts` AC-46 forbids `indexedDB`, `IDB…`, `localStorage`, `sessionStorage`, `document.cookie` and `caches.` in UI modules. The new AC-13 scan forbids the four HTML sinks. Comments say "browser storage" and "raw HTML" instead. |

## Approach
This slug is UI only. It uses the storage layer as shipped, through
`src/storage/index.ts` and its pinned export list. `App` stays the
composition root. It gets two hooks: `useHashNavigation()` (D1), which
gives the current route, and `useNoteList(repository)` (D3, D4), which
reads the list once after the first commit and keeps it in a pure
reducer. In the list view, `<main>` renders the existing `NoteForm` and
`InfoText` and a new `NotesSection`, all inside one wrapper. At a note
route, that wrapper gets `hidden`, and a `NoteView` keyed by the visit
counter is rendered after it (D2, D5). The form never unmounts, so
unsaved text, errors, messages and an in-flight save all survive opening
a note. Its focus moves are gated by `active` (R27).

A save adds the resolved note to the reducer through `NoteForm`'s new
`onSaved` callback. It never re-reads storage (R14). Opening a note is a
normal fragment link. The browser, or jsdom in tests, adds the history
entry, and `hashchange` drives the store. "Back to notes" either calls
`history.back()` or replaces the entry, depending on how the note route
was entered (D8). Focus follows the spec's table. The view's heading
takes focus once the view settles. On return, focus goes to the opened
note's link, or else to the "Your notes" heading. The skip link moves to
the "Your notes" heading.

All display rules (blank title, preview, relative time) and failure
mapping are pure functions with unit tests. All copy lives in
`src/copy.ts`. Styling reuses the project-foundation tokens and the
global focus outline, with no new token and no motion.

## Architecture

### API contract
There's no server API. The plan's contracts are (1) which repository
calls the UI makes, (2) the URL and history behaviour, and (3) the props
between components. Changing any of these during implementation means
updating this plan first.

**1. UI → repository** (imported only from `src/storage/index.ts`; R36, R37)

| Call | When | Resolves | Rejects → UI |
|---|---|---|---|
| `list()` | Exactly once per page load, in `useNoteList`'s effect after the first commit, whatever the route (R2, R3) | `Note[]`, already sorted (`note-storage` R17). Shown in that order. | `NoteStorageError` of kind `"unavailable"` → "List unavailable" copy. Anything else → "List failed" copy. State `failed` lasts for the rest of the load (R12, R13). |
| `get(id)` | Once per entry into a note route with a valid id (`NoteView` mount, D5). Never for a malformed id (R18, R20). | `Note` → loaded view | Kind `"not-found"` → not-found view, plus `noteGone(id)`. Kind `"unavailable"` → "Open unavailable". Anything else → "Open failed" (R21, R22). |
| `create(input)` | Unchanged from `create-note` (the form's Save) | `Note` → the form's existing success path, then `onSaved(note)` → `noteSaved` (R14) | Unchanged form failure path. The list is not touched (R14). |
| `update`, `delete`, `isPersisted` | Never (R36) | — | — |

Errors are never logged, and their messages are never shown (R41).

**2. URL and history** (R16, R20, R24, R25)
- Note route: `location.hash` starts with `#note/`, and the id is the rest of the hash. The id is valid when it matches `NOTE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/`. Every other hash (none, `#`, `#elsewhere`, `#notes-heading`) is the list view.
- Note link `href`: `` `#note/${id}` `` (`noteHref`). The app adds no click handler, so the browser does the navigation and adds one history entry.
- Back link `href`: `appUrl()` = `location.pathname + location.search`. A plain activation calls `history.back()` when `cameFromList` is true, and otherwise `history.replaceState(null, "", appUrl())` followed by a store update.
- The app never calls `history.pushState`. No state object is ever passed except `null`. `document.title` is never written.

**3. Component and hook contracts**
- `useHashNavigation(): { route: Route; visit: number; cameFromList: boolean; returnedFromId: string | null; backToList(): void }`, where `Route = { kind: "list" } | { kind: "note"; id: string; valid: boolean }`.
- `useNoteList(repository): { state: ListState; noteSaved(note): void; noteGone(id): void; listShown(): void }`. `noteSaved` and `listShown` read `Date.now()` inside themselves (handlers and effects only).
- `NoteForm` props: `{ repository; active: boolean; onSaved(note: Note): void }`.
- `NotesSection` props: `{ state: ListState }`, plus a React 19 `ref` prop to `NotesSectionHandle = { focusNote(id: string): boolean; focusHeading(): void }`.
- `NoteView` props: `{ repository; route: { id: string; valid: boolean }; onBack(event): void; onGone(id: string): void }`.
- `SkipLink` props: `{ onActivate(): void }`.

### Data model
No schema, record, migration or retention change. The data model is N/A
because the slug uses `note-storage` as shipped. The first `list()` may
lazily create the empty `quicknotes` database, as the owner decided
(spec risk 5, `note-storage` R25 and R27).

UI state is held in memory only and never persisted (R26):
- `ListState` = `{ phase: "loading"; savedFirst: readonly Note[]; gone: ReadonlySet<string> }` | `{ phase: "loaded"; notes: readonly Note[]; now: number }` | `{ phase: "failed"; reason: "unavailable" | "other" }`.
  - `listResolved(notes, now)` from loading gives `[...savedFirst, ...notes.filter(n => !savedIds.has(n.id) && !gone.has(n.id))]`, so a note saved during loading is first and appears once (AC-21).
  - `noteSaved(note, now)`: when loaded, gives `[note, ...notes without note.id]`; when loading, puts the note at the front of `savedFirst`; when failed, changes nothing.
  - `noteGone(id)`: when loaded, filters the note out; when loading, adds the id to `gone`; when failed, changes nothing.
  - `listShown(now)`: when loaded, sets `now`; otherwise changes nothing.
- `NavSnapshot` = `{ route, visit, cameFromList, returnedFromId }` (D1).
- `OpenState` = `{ status: "loading" }` | `{ status: "loaded"; note }` | `{ status: "not-found" }` | `{ status: "failed"; reason: "unavailable" | "other" }`.

### Backend
N/A. QuickNotes has no backend (charter). The repository is the only
data boundary, and this slug doesn't change it (`note-storage`
requirements unchanged, R37).

### Frontend
**Composition (`src/App.tsx`)**, in DOM order:
1. `<SkipLink>`, in the list view only (R28).
2. `<AppHeader />`, unchanged.
3. `<main className="mx-auto w-full max-w-3xl px-4 sm:px-6">`:
   - `<div hidden={route.kind === "note"}>` holding `<NoteForm active=… onSaved=… />`, `<InfoText />` and `<NotesSection ref=… state=… />` (R1, R17).
   - `{route.kind === "note" && <NoteView key={visit} … />}`.
4. App effect on `visit`: when the route is the list and `returnedFromId !== null`, it calls `listShown()`, then `notesRef.current.focusNote(id) || notesRef.current.focusHeading()` (R24, R8, AC-12).

**Screens and components (spec "Screens / views")**

| Spec screen / part | Component | Notes |
|---|---|---|
| Skip link | `src/components/SkipLink.tsx` | D7. Not rendered in the note view. |
| Header | `AppHeader` (unchanged) | |
| New note section | `NoteForm` (+ `active`, `onSaved`) | D2. Its markup is unchanged. |
| Info text | `InfoText` (unchanged) | Same place, `mt-12`. |
| Your notes section | `src/components/NotesSection.tsx` | `<section aria-labelledby="notes-heading" aria-busy={loading ? "true" : undefined} className="mt-12 pb-12">`, `<h2 id="notes-heading" tabIndex={-1} className="text-lg font-semibold text-zinc-900">Your notes</h2>`, one `<div role="alert" className="text-base text-zinc-900 not-empty:mt-3">` present from the first render (R29), then the body for the current state. |
| List | `src/components/NoteList.tsx` | `<ul role="list" className="mt-3 rounded-md border border-zinc-300 bg-white divide-y divide-zinc-200">` (D10). It keeps a `Map<id, HTMLAnchorElement>` of link refs for `focusNote`. No `overflow` other than visible on any ancestor of a link (AC-48). |
| List item | `src/components/NoteListItem.tsx` (`memo`) | `<li>` holding `<a href={noteHref(id)} aria-labelledby aria-describedby className="block min-h-11 px-4 py-3 hover:bg-zinc-100">`: title `<span className="block break-words text-base font-medium text-zinc-900">` (or the zinc-600 "Untitled note" element), preview `<span className="block break-words text-sm text-zinc-600">`, and `<UpdatedLine className="block …">`. No underline and no icon. |
| Updated line (list and view) | `src/components/UpdatedLine.tsx` | `Updated <time dateTime={new Date(updatedAt).toISOString()}>{relativeTime(updatedAt, now)}</time>` (R8). |
| Note view | `src/components/NoteView.tsx` | `<div className="pt-6 pb-12">`, then `<BackLink>`, then the state body. Loaded: `<article aria-labelledby>` with `<h2 tabIndex={-1} className="whitespace-pre-wrap break-words text-xl font-semibold text-zinc-900">` (or the zinc-600 "Untitled note" heading), `<UpdatedLine>` (`text-sm text-zinc-600`), and a body `<div className="mt-4 whitespace-pre-wrap break-words text-base text-zinc-900">{note.body}</div>` whose only child is the body text node (AC-24, AC-37), or `<p className="mt-4 text-base text-zinc-600">This note has no text.</p>`. |
| Back link | `src/components/BackLink.tsx` | `<a href={appUrl()} onClick className="inline-flex min-h-11 items-center gap-1 text-base text-accent underline"><span aria-hidden="true">←</span>Back to notes</a>` (D8, R32). |

**How each spec state renders**

| State | Rendering |
|---|---|
| List: loading | `aria-busy="true"`. `<p className="mt-3 text-base text-zinc-600">Loading your notes…</p>`, outside the alert region and any live region. The alert is empty. |
| List: loaded | `NoteList` with every note, in `list()` order. No paging. |
| List: empty | `<p className="mt-3 text-lg font-medium text-zinc-900">No notes yet</p>` and `<p className="text-base text-zinc-600">Notes you save will show up here.</p>`. No `<ul>`. |
| List: failed | The alert region holds `LIST_UNAVAILABLE` or `LIST_FAILED`. Nothing else is shown below the heading. |
| List: after a save | The reducer puts the note first. The form's own status and focus behaviour are unchanged. |
| List: back from a note | The wrapper is shown again. `listShown(now)` runs, and focus goes to the link or else the heading. |
| Note view: loading | Back link, then `<p className="mt-4 text-base text-zinc-600">Opening note…</p>`. No `<h2>`. Focus doesn't move. |
| Note view: loaded / untitled / no text | As in the table above. Focus goes to the `<h2>`, and the page scrolls to the top. |
| Note view: not found | Back link, `<h2 tabIndex={-1}>Note not found</h2>` and `<p>` with the "Not found" copy (`text-base text-zinc-900`). Focus goes to the `<h2>`. |
| Note view: open failed | Back link, `<h2>This note couldn't be opened</h2>` and the "Open unavailable" or "Open failed" copy. Focus goes to the `<h2>`. |
| Skip link focused | Shown at the top left, with the global outline. |
| Render failure / JS off | Unchanged (`ErrorBoundary`, `<noscript>`). |

**Copy** (`src/copy.ts`, all literal spec text): `SKIP_TO_NOTES`,
`NOTES_HEADING`, `NOTES_LOADING`, `NOTES_EMPTY_PRIMARY`,
`NOTES_EMPTY_SECONDARY`, `LIST_UNAVAILABLE`, `LIST_FAILED`,
`UNTITLED_NOTE`, `PREVIEW_ELLIPSIS` (U+2026), `updatedLine(relative)`
(`"Updated " + relative`), `BACK_TO_NOTES`, `NOTE_OPENING`,
`NOTE_NO_TEXT`, `NOT_FOUND_HEADING`, `NOT_FOUND`, `OPEN_FAILED_HEADING`,
`OPEN_UNAVAILABLE` and `OPEN_FAILED`.

## Files / components touched
New (production):
- `src/routing/route.ts`: `parseRoute`, `NOTE_ID_PATTERN`, `noteHref`, `appUrl`
- `src/routing/hashNavigation.ts`, `src/routing/useHashNavigation.ts`
- `src/noteList/listState.ts`, `src/noteList/display.ts`, `src/noteList/relativeTime.ts`, `src/noteList/loadProblems.ts`, `src/noteList/useNoteList.ts`
- `src/noteView/useOpenNote.ts` (the `get` call, with the D4 promise ref, and `OpenState`)
- `src/components/SkipLink.tsx`, `NotesSection.tsx`, `NoteList.tsx`, `NoteListItem.tsx`, `UpdatedLine.tsx`, `NoteView.tsx`, `BackLink.tsx`

Changed (production):
- `src/App.tsx`: composition, navigation, list hook and focus-return effect
- `src/components/NoteForm.tsx`: passes `active` and `onSaved` to the hook
- `src/noteForm/useNoteForm.ts`: second argument `{ active, onSaved }`. The focus gate goes on the three focus calls, and `onSaved(note)` runs inside the success `flushSync`. Nothing else changes.
- `src/copy.ts`: new constants
- `eslint.config.js`: one file-scoped block (D10)

New (tests and support):
- `src/routing/route.test.ts`, `src/routing/hashNavigation.test.ts`
- `src/noteList/listState.test.ts`, `display.test.ts`, `relativeTime.test.ts`, `loadProblems.test.ts`
- `src/components/NotesSection.load.test.tsx`, `NoteList.items.test.tsx`, `NoteList.save.test.tsx`, `NoteView.open.test.tsx`, `NoteView.back.test.tsx`, `SkipLink.test.tsx`
- `src/App.storageUse.test.tsx`
- `src/test/renderNotes.tsx`: `renderAt(hash, repository)`, `notesSection()`, `noteLinkNames()`, `activate(link)` (click plus `settle`), `makeNote(n, overrides)`
- `tests/tooling/plain-text.test.ts` (AC-13 tooling), `tests/tooling/e2e-contexts.test.ts` (AC-60, second half)
- `e2e/notes.ts` (helpers, D14), `e2e/list-notes.spec.ts`, `e2e/open-note.spec.ts`, `e2e/notes-privacy.spec.ts`, `e2e/notes-layout.spec.ts`, `e2e/notes-a11y.spec.ts`, `e2e/notes-performance.spec.ts`

Changed (tests and support), listed under "Existing tests that change":
- `src/App.test.tsx`, `src/components/NoteForm.save.test.tsx`, `src/copy.test.ts` (additive)
- `src/test/repositoryDoubles.ts`, `src/test/setup.ts`
- `tests/tooling/eslint-config.test.ts` (additive)
- `e2e/app.ts` (an optional parameter), `e2e/privacy.spec.ts` (one test rewritten), `e2e/save-note.spec.ts` (one assertion)

Not touched: `src/storage/**`, `src/notes/**`, `src/test/inMemoryNoteRepository.ts`, `src/test/noteRepositoryContract.ts`, `src/index.css`, `index.html`, `package.json`, `package-lock.json`, `vite.config.ts`, `playwright.config.ts`, `tests/tooling/storage-boundary.test.ts`, `tests/tooling/e2e-isolation.test.ts`, `tests/tooling/theme.test.ts`, `tests/tooling/licences.test.ts`, `tests/tooling/package-contract.test.ts`, `tests/tooling/render-path.test.ts`, `tests/tooling/privacy.test.ts`, every other `e2e/*.spec.ts`, and every other slug's artifacts.

## Steps
Each step can be reviewed on its own and leaves `npm run ci` green.
Steps 6 and 7 are the exception: they must land in one commit, because
wiring `list()` into the load is what makes the old AC-33 and AC-39
assertions false.

1. **[API] Pin the contracts first.**
   - `src/copy.ts` and `src/copy.test.ts`: the new constants, each asserted against the spec's literal text.
   - `src/routing/route.ts` and `route.test.ts`: `parseRoute` (none, `#`, `#elsewhere`, `#note/`, an upper-case id, a valid id), `noteHref`, `appUrl`.
   - `tests/tooling/plain-text.test.ts`: the HTML-sink scan over `uiModules()`, with fixtures for each sink (AC-13 tooling). It is green against today's code.
   - `tests/tooling/e2e-contexts.test.ts`: every `browser.newContext(` in `e2e/` sits in a `try` whose `finally` closes that context, with a passing and a failing fixture (AC-60). It is green today: `privacy.spec.ts` already follows this.
2. **[DATA] N/A.** No schema or stored-shape change (Data model).
3. **[BE] N/A.** No backend. The storage layer is used as shipped.
4. **[FE] Pure logic, test first.** `listState.ts`, `display.ts`, `relativeTime.ts`, `loadProblems.ts` and `hashNavigation.ts`, with their unit tests. That includes the full AC-10 and AC-11 tables, all four R14 cases plus R13 and R21 in the reducer, and the store's `cameFromList` and `returnedFromId` transitions, driven by a fake window (an `EventTarget` plus `location`/`history` stubs).
5. **[FE] Hooks and components, not yet mounted.**
   - The `useHashNavigation`, `useNoteList` and `useOpenNote` hooks.
   - The `SkipLink`, `NotesSection`, `NoteList`, `NoteListItem`, `UpdatedLine`, `NoteView` and `BackLink` components.
   - The `eslint.config.js` block (D10), plus the AC-49 test in `eslint-config.test.ts`.
   - Test support: `repositoryDoubles.ts` options, `setup.ts` hash reset, `renderNotes.tsx`. The new default `list` doesn't matter yet, because `App` doesn't call it.
6. **[FE] Wire `App`, and change the component tests (same commit as step 7).**
   - `App.tsx` composition. `NoteForm` and `useNoteForm` get `active` and `onSaved`.
   - The component suites listed under Files.
   - `src/App.test.tsx` and `NoteForm.save.test.tsx` changed exactly as listed below.
7. **[TEST] Change the existing e2e tests on purpose.** The `e2e/privacy.spec.ts` AC-33 test is rewritten as AC-58. `e2e/save-note.spec.ts` AC-39 is revised as AC-59. `e2e/app.ts` gets the `hash` parameter.
8. **[TEST] New e2e coverage.** The `e2e/notes.ts` helpers, then `list-notes`, `open-note`, `notes-privacy`, `notes-layout`, `notes-a11y` and `notes-performance` specs. Every storing test uses the `page` fixture or a context it closes in `finally` (R43).
9. **[TEST] Gate and hand-off.**
   - Run `npm run ci` with Node 24.18.0 first on `PATH`.
   - Confirm `git diff main -- src/storage src/notes tests/tooling/storage-boundary.test.ts tests/tooling/e2e-isolation.test.ts tests/tooling/licences.test.ts package.json package-lock.json` is empty (AC-54, AC-55, AC-60).
   - Confirm `git diff main -- e2e/privacy.spec.ts` touches only the one test (AC-58).
   - Record AC-52 in `review.md`. AC-61 is done at ship, on the live site, by the owner.

## Test strategy
Layers: **unit-FE** = Vitest, pure functions. **component** = Vitest +
React Testing Library in jsdom, `<App repository={…} />` (the in-memory
double or a stub), with the route set by `renderAt` and time set with
`vi.setSystemTime` (D13). **e2e** = Playwright, Chromium, production
build under `/quicknotes/`, `gotoApp`, the per-test `page` fixture or a
context the test closes (R43). **tooling** = Vitest under
`tests/tooling/`. **manual** = `review.md` or ship.

| Acceptance criterion | Layer | Test |
|---|---|---|
| AC-1 | component | `NotesSection.load.test.tsx` › "main holds New note, the info lines and Your notes in order; h2s are exactly New note and Your notes (AC-1)" |
| AC-2 | component | `NotesSection.load.test.tsx` › "loading the list never moves focus, changes a value or makes a field read-only (AC-2)" |
| AC-3 | component | `NotesSection.load.test.tsx` › "list() starts only after the form is in the document (AC-3)" |
| AC-4 | component | `NotesSection.load.test.tsx` › "with the list unavailable, Title is focused and a save still works (AC-4)" |
| AC-5 | component | `NotesSection.load.test.tsx` › "list() is called once across typing, a save, open, back and a hash change (AC-5)" |
| AC-6 | component | `NoteList.items.test.tsx` › "shows notes in list() order, without re-sorting (AC-6)" (stub `[X, Y, Z]`, and in-memory at clocks 1000/3000/2000 giving B, C, A) |
| AC-7 | component | `NoteList.items.test.tsx` › "renders all 1,000 notes at once, each linking to #note/<id>, with no paging (AC-7)" |
| AC-8 | component | `NoteList.items.test.tsx` › "a link's name is the title and its description is the preview and updated line, with a <time> (AC-8)" |
| AC-9 | component + unit-FE | `NoteList.items.test.tsx` › "blank titles read Untitled note; titles are kept exactly and never truncated (AC-9)"; `display.test.ts` › "isBlank (AC-9)" |
| AC-10 | component + unit-FE | `NoteList.items.test.tsx` › "preview lines follow the collapse and 100-code-point rule (AC-10)" (each listed body); `display.test.ts` › "previewText table (AC-10)" (includes the lone-surrogate check) |
| AC-11 | component + unit-FE | `NoteList.items.test.tsx` › "updated lines follow the R8 table (AC-11)" (all 15 offsets through `App`); `relativeTime.test.ts` › "R8 thresholds and plurals (AC-11)" |
| AC-12 | component | `NoteView.back.test.tsx` › "relative time doesn't tick, and refreshes when the list shows again (AC-12)" |
| AC-13 | component + tooling | `NoteView.open.test.tsx` › "markup in note text renders literally in the list and the view (AC-13)"; `tests/tooling/plain-text.test.ts` › "no UI module uses an HTML sink (AC-13)" and "the sink scan flags each fixture (AC-13)" |
| AC-14 | component | `NotesSection.load.test.tsx` › "loading: text, aria-busy, no list, not in a live region; cleared when settled (AC-14)" |
| AC-15 | component | `NotesSection.load.test.tsx` › "empty: No notes yet, the secondary line, no list, empty alert (AC-15)" |
| AC-16 | component + unit-FE | `NotesSection.load.test.tsx` › "load failure copy by error, with no list and no rejection text (AC-16)" (6 rejection values); `loadProblems.test.ts` › "listFailureReason (AC-16)" |
| AC-17 | component | `NotesSection.load.test.tsx` › "Your notes has exactly one empty alert region from the first render; the form keeps its two regions (AC-17)" |
| AC-18 | component + unit-FE | `NotesSection.load.test.tsx` › "a load failure stays after a successful save (AC-18)"; `listState.test.ts` › "failed ignores noteSaved and noteGone (R13)" |
| AC-19 | component | `NoteList.save.test.tsx` › "a saved note goes first, with no second list() and the form's save behaviour unchanged (AC-19)" |
| AC-20 | component | `NoteList.save.test.tsx` › "a save replaces the empty state with a one-item list (AC-20)" |
| AC-21 | component + unit-FE | `NoteList.save.test.tsx` › "a save during loading is first and appears once, whether or not list() includes it (AC-21)" ((a) and (b)); `listState.test.ts` › "listResolved merges savedFirst without duplicates (R14)" |
| AC-22 | component | `NoteList.save.test.tsx` › "a failed save leaves the list unchanged (AC-22)" |
| AC-23 | e2e | `e2e/list-notes.spec.ts` › "saved notes appear newest first without a reload or navigation (AC-23)" |
| AC-24 | component | `NoteView.open.test.tsx` › "opening a note sets the hash, calls get once and shows the read-only view with the heading focused (AC-24)" |
| AC-25 | component | `NoteView.open.test.tsx` › "the view shows what get returns, not the list copy (AC-25)" and "while get is pending: Opening note…, no h2, focus not in the view (AC-25)" |
| AC-26 | component + unit-FE | `NoteView.open.test.tsx` › "untitled heading, no-text message, and the title kept exactly (AC-26)"; `display.test.ts` › "isBlank (AC-9)" |
| AC-27 | component | `NoteView.open.test.tsx` › "the view has no control other than Back to notes (AC-27)" |
| AC-28 | component + unit-FE | `NoteView.open.test.tsx` › "loading at #note/<id> opens it with one list() and one get() (AC-28)" and "malformed ids show Note not found without get; other hashes show the list (AC-28)"; `route.test.ts` › "parseRoute (AC-28)" |
| AC-29 | component | `NoteView.open.test.tsx` › "NotFoundError shows Note not found and removes the note from the list (AC-29)" |
| AC-30 | component + unit-FE | `NoteView.open.test.tsx` › "open failures show the matching copy and leave the list unchanged (AC-30)"; `loadProblems.test.ts` › "openOutcome (AC-30)" |
| AC-31 | component + unit-FE | `NoteView.back.test.tsx` › "Back to notes and a hashchange to '' both return focus to the opened link (AC-31)"; `hashNavigation.test.ts` › "returnedFromId and cameFromList (R24)" |
| AC-32 | e2e | `e2e/open-note.spec.ts` › "click, Back, Forward, reload and Back to notes behave as browser history (AC-32)" |
| AC-33 | e2e | `e2e/open-note.spec.ts` › "Back to notes after opening from the list goes back instead of adding an entry (AC-33)" |
| AC-34 | e2e | `e2e/notes-privacy.spec.ts` › "note text never reaches the URL, the title or history.state (AC-34)" |
| AC-35 | e2e | `e2e/open-note.spec.ts` › "a note opens with Enter and with a tap (AC-35)" (the tap uses its own `hasTouch` context, closed in `finally`) |
| AC-36 | e2e | `e2e/open-note.spec.ts` › "an unknown id shows Note not found, focused, and Back to notes shows the list (AC-36)" |
| AC-37 | e2e | `e2e/open-note.spec.ts` › "the body keeps line breaks, spaces, tabs, emoji and RTL text, in pre-wrap (AC-37)" |
| AC-38 | component | `NoteView.back.test.tsx` › "form values, counter and errors survive opening a note; beforeunload stays on; nothing is stored (AC-38)" |
| AC-39 | e2e | `e2e/open-note.spec.ts` › "unsaved text survives open and Back, and closing during the view raises beforeunload (AC-39)" |
| AC-40 | component | `NoteView.back.test.tsx` › "a save that settles while a note is open doesn't move focus, and shows its outcome on return (AC-40)" (success and `StorageUnavailableError`) |
| AC-41 | component | `SkipLink.test.tsx` › "the skip link is the first focusable element and moves focus to Your notes without touching history (AC-41)" and "no skip link in the note view (AC-41)" |
| AC-42 | e2e | `e2e/notes-layout.spec.ts` › "skip link: hidden until Shift+Tab from Title, 44px, accent outline, Enter then Tab reaches the note (AC-42)" |
| AC-43 | component | `NotesSection.load.test.tsx` › "no live region in Your notes gets text except on a load failure (AC-43)" |
| AC-44 | e2e | `e2e/notes-a11y.spec.ts` › "<state>: no WCAG 2.1 A/AA axe violations, contrast evaluated (AC-44)", once for each of the 10 listed states. `e2e/a11y.spec.ts` › "axe detects a contrast failure" stays unchanged. |
| AC-45 | e2e | `e2e/notes-layout.spec.ts` › "no overflow, links inside the viewport and 44px tall, column centred at WxH (AC-45)" × 4 viewports |
| AC-46 | e2e | `e2e/notes-layout.spec.ts` › "list and note view reflow at 320px with 200% root font (AC-46)" |
| AC-47 | e2e | `e2e/notes-layout.spec.ts` › "list and note view survive WCAG 1.4.12 text spacing at 360px (AC-47)" |
| AC-48 | e2e + tooling | `e2e/notes-layout.spec.ts` › "no animations or transitions with notes, hover and the note view; links show the accent outline, unclipped (AC-48)"; `tests/tooling/theme.test.ts` › "accent is the only non-zinc custom colour" (unchanged) |
| AC-49 | component + tooling | `NoteList.items.test.tsx` › "Your notes is a list with one listitem per note (AC-49)"; `tests/tooling/eslint-config.test.ts` › "list semantics option is ul:list on NoteList.tsx only; jsx-a11y recommended still on (AC-49)" |
| AC-50 | e2e | `e2e/notes-performance.spec.ts` › "1,000 notes: Title focused under 1,000 ms, all links under 2,500 ms, no long task over 300 ms (AC-50)" |
| AC-51 | e2e | `e2e/notes-performance.spec.ts` › "a 100,000-character note at item 900 opens and returns within 1,000 ms with no long task over 300 ms (AC-51)" |
| AC-52 | manual | `specs/list-notes/review.md`: VoiceOver on macOS Safari and iOS Safari, plus a keyboard-only pass in Chrome. Agents never mark it passed. |
| AC-53 | component | `src/App.storageUse.test.tsx` › "the UI calls list once, create per save, get per open, and never update, delete or isPersisted (AC-53)" |
| AC-54 | tooling | `tests/tooling/storage-boundary.test.ts` (unchanged): every existing test, including "src/storage/index.ts exports exactly the R30 value and type names (AC-45)" |
| AC-55 | tooling | `tests/tooling/package-contract.test.ts` › "runtime dependencies are exactly react and react-dom (create-note AC-48)" and `tests/tooling/licences.test.ts` (both unchanged) |
| AC-56 | component | `src/App.storageUse.test.tsx` › "no console call contains note text across load, open and failures (AC-56)" |
| AC-57 | e2e | `e2e/notes-privacy.spec.ts` › "opening and closing notes sends no request, calls no persistence API and writes nothing (AC-57)" |
| AC-58 | e2e | `e2e/privacy.spec.ts` › "fresh load stores no note and no web storage, sets no cookies, calls no persistence API and requests only app files (AC-58; revised project-foundation AC-33)" |
| AC-59 | e2e | `e2e/save-note.spec.ts` › "typing without saving stores nothing and leaves the URL unchanged (AC-39; revised by list-notes AC-59)" |
| AC-60 | tooling | `tests/tooling/e2e-isolation.test.ts` (unchanged, `create-note` AC-42); `tests/tooling/e2e-contexts.test.ts` › "every e2e newContext is closed in finally (AC-60)" and its fixture test |
| AC-61 | manual | At ship, on the live URL, in desktop Chrome and desktop Safari. The owner records steps 1 to 4 for each browser. Agents never mark it passed. |

### Existing tests that change
Each change below is one the spec's "Changes to earlier specs" table
requires. Nothing is loosened beyond that table, and every assertion
that still applies is kept as it is.

| Earlier item (spec table row) | File › test | Exact change |
|---|---|---|
| `project-foundation` AC-33 / R33; `create-note` R28 (first sentence) and AC-38 | `e2e/privacy.spec.ts` › "no storage or cookies on fresh load" | **Rewritten on purpose as AC-58**, keeping its own `browser.newContext()` and `finally { context.close() }`. Kept: `localStorage.length` 0, `sessionStorage.length` 0, `document.cookie` `""`, `context.cookies()` `[]`. Removed: `databases: (await indexedDB.databases()).length` → `0`. This is the only assertion the owner's decision drops. Added: request logging, `trackPersistenceCalls` counters at 0, `caches.keys()` → `[]`, `countStoredNotes` → 0, waiting for "No notes yet", and every request being a `GET` on the page's origin with a path starting with `APP_BASE`, or `/favicon.ico`. Renamed as in the AC-58 row. The file's other two tests are unchanged. |
| `create-note` AC-39 | `e2e/save-note.spec.ts` › "typing without saving stores nothing and leaves the URL unchanged (AC-39)" | In the `page.evaluate`, `databases: await indexedDB.databases()` and the expected `databases: []` are replaced by `countStoredNotes(page)` → `0`. Kept: `local: 0`, `session: 0`, `cookie: ""`, `page.url()` unchanged, and the typing steps. Renamed with "; revised by list-notes AC-59". The comment above `describe` ("Nothing leaks into project-foundation AC-33's fresh load") becomes "…into list-notes AC-58's fresh load". |
| `create-note` AC-1 | `src/App.test.tsx` › "main holds the New note form: h2, Title input, Note textarea, Save note submit, in DOM order (AC-1)" | Lines 52-89 are kept as they are, except lines 79-81. The `for` loop over `["link", "searchbox", "checkbox"]` page-wide becomes: inside the "New note" section, `link` count 0; page-wide, `searchbox` and `checkbox` counts 0. The page-wide `textbox` = 2 and `button` = 1 (lines 77-78) are **kept page-wide**, because they still hold. One new line: with the default pending list, the page has exactly one link, the skip link. |
| `create-note` AC-6 | `src/App.test.tsx` › "renders banner with the only h1 and the info text in main (AC-6)" | Kept: the h1 assertions (lines 26-30), `INFO_PRIMARY` and `INFO_SECONDARY` in `main`, and `queryByText("Your notes will show up here.")` null (lines 36-38). Line 35 (`queryByText("No notes yet")` null) becomes: rendered with `list` resolving `[]` and settled, "No notes yet" appears exactly once, inside the "Your notes" section. "The info text is unchanged after a successful save (AC-6)" (lines 41-50) is unchanged. |
| `create-note` AC-37 (R26, R27) | `src/components/NoteForm.save.test.tsx` › "rendering and typing call no repository method; a valid save calls only create, once (AC-37)" | It uses a spy whose `list` resolves `[]`. After render and `settle()`: `list` has 1 call, and `create`, `get`, `update`, `delete` and `isPersisted` have none. Typing adds no call to any method. After a valid save: `create` has 1 call, `list` still 1, and `get`, `update`, `delete` and `isPersisted` have 0. Renamed "…(create-note AC-37, revised by list-notes AC-53)". The full open/back part of AC-53 is in `App.storageUse.test.tsx`. |
| `create-note` R27 (support code) | `src/test/repositoryDoubles.ts` › `createStubRepository` | `list` default: `unused("list")` (which rejects) becomes a promise that never settles (D13a). New options `list?` and `get?`. `get`, `update`, `delete` and `isPersisted` still reject if called. The `createSpyRepository` comment "(AC-37)" is updated to "(create-note AC-37; list-notes AC-53)". |
| — (additive support) | `src/test/setup.ts` | `afterEach` also runs `history.replaceState(null, "", "/")` (D13b). `cleanup()` is unchanged. |
| — (additive) | `src/copy.test.ts` | New literal checks for the list-notes copy. Existing checks are unchanged. |
| — (additive) | `tests/tooling/eslint-config.test.ts` | New AC-49 test. `calculateConfigForFile("src/components/NoteList.tsx")` gives `jsx-a11y/no-redundant-roles` options exactly `[{ ul: ["list"] }]` at `error`. `calculateConfigForFile("src/App.tsx")` gives the rule at `error` with no options. Both still contain `jsx-a11y/alt-text` and the other recommended rules. The three existing tests are unchanged. |
| — (additive) | `e2e/app.ts` › `gotoApp` | Optional third parameter `hash = ""`, so it calls `page.goto(APP_PATH + hash, options)`. Existing calls behave exactly as before. |
| `create-note` R2, R11 | none | No test changes. `App.test.tsx` AC-2 and `e2e/create-note.spec.ts` AC-4 load without a hash and keep passing as written. The R27 exception has its own test (AC-40). |
| `create-note` decision 10, the skip-link non-goal, and the "no list states" States row | none | No existing test asserted that there was no skip link or no list state. New coverage: AC-41, AC-42, AC-14 to AC-18. |

These stay byte-for-byte unchanged and must pass:
`tests/tooling/storage-boundary.test.ts` (AC-54), `e2e-isolation.test.ts`,
`licences.test.ts`, `package-contract.test.ts`, `theme.test.ts`,
`privacy.test.ts` and `render-path.test.ts`; `e2e/a11y.spec.ts`,
`layout.spec.ts`, `create-note.spec.ts`, `base-path.spec.ts` and
`document.spec.ts`; and every `NoteForm.*.test.tsx` other than the one
AC-37 test above, plus all `src/notes/**` and `src/storage/**` tests.
Baseline when planning: 44 test files and 349 tests, all passing
(`npx vitest run`, Node 24.18.0).

## Risks & rollback
| Risk | Detection | Mitigation |
|---|---|---|
| **The performance budgets flake on CI's shared runners** (AC-50, AC-51; spec risk 4). | CI failure on those tests only. | Rendering is one commit of 1,000 memoised items with no per-item effects. Previews are cheap string work. Playwright already retries once in CI. The budgets change only through a spec revision, never in the test. |
| **A long task over 300 ms when 1,000 items commit at once.** | AC-50's long-task observer. | Keep each item light: three spans, ids from `useId`, no per-item effects or listeners. If it still fails, profile first. Chunked rendering would break R4 ("every note in the DOM at once"), so it would need a spec change, not a plan tweak. |
| **Safari drops list semantics** (spec risk 1). | AC-52 manual pass. | `role="list"` (D10). AC-49 pins it in jsdom. |
| **A save that settles while a note is open isn't announced** (spec risk 2). | AC-52. | Accepted by the spec. The outcome is visible on return (AC-40). |
| **jsdom navigation behaviour differs from browsers** (asynchronous `hashchange`, modifier clicks still navigate, no `scrollTo`). | Component test failures. | D13: always `await settle()` after a click or `history.back()`. Scroll uses `scrollTop`. Real-browser history, Back/Forward, reload and touch are covered in e2e (AC-32 to AC-36). Probe run while planning on jsdom 30.1.2. |
| **The hash leaks between tests in one file.** | Order-dependent failures. | `setup.ts` resets the URL after each test (D13b). |
| **A StrictMode double effect causes two `list()` calls in dev.** | Visible only in dev. AC-5 and AC-53 run without StrictMode. | D4's promise ref. Add a hook unit test that mounts under `<StrictMode>` and asserts one call (in `NotesSection.load.test.tsx`, under AC-5). |
| **The React Compiler lint rules (`react-hooks` 7) flag `Date.now()` or ref access during render.** | `npm run lint`. | `now` is read only in effects and handlers (D3). Refs are read only in effects and handlers. If a rule still objects, restructure; don't disable it. |
| **A comment or name in UI code trips a tooling scan** (storage words, HTML sinks, the `/quicknotes/` literal in `e2e/`). | Tooling tests. | D14 and D16. Use "browser storage" or "raw HTML" in comments, and `APP_BASE` in e2e. |
| **`act()` warnings from list promises resolving in tests that end synchronously.** | Console noise only. These aren't failures. | The default stub `list` never settles (D13a). New tests always `await settle()` after render. |
| **`hangIndexedDb` and `blockIndexedDb` now also affect the list.** | `a11y.spec` "storage unavailable" and `layout.spec` AC-56 fail. | Checked against their assertions: both use `main form [role=…]` locators and form-only checks. A list failure fills only the notes alert, outside `form`. No change is needed. |
| **Seeded e2e data leaking into another test.** | AC-58 or AC-59 fails. | Every storing test uses the `page` fixture or its own closed context (R43, AC-60). |

**Spec notes found while planning** (recorded here, not edited in the
spec; the owner may fix them in the spec before approving):
1. AC-32 ends with "`history.length` is the same as before the click". After the earlier note-link click, this can only mean the "Back to notes" click. Read the other way, it contradicts AC-32's own first step, which adds an entry. The test reads `history.length` just before clicking "Back to notes".
2. R5 and AC-9: for a title like `"  lead  "`, browsers trim the accessible name to "lead". The test checks the title line's `textContent` (as AC-9 says), not that the name keeps the spaces.
3. R16: modifier and middle clicks can't be told apart in jsdom (it follows the link either way). The plan meets R16 by never intercepting note-link clicks. No automated test covers a new-tab open. It's left to AC-61 and AC-52's keyboard pass, if the owner wants it checked.
4. AC-58 describes paths "starting with `/quicknotes/`". The test builds that from `APP_BASE`, because the base-path guard forbids the literal in `e2e/`. The meaning is the same.

**Rollback:** revert the merge commit. That restores the form-only page
and the old tests, including the original AC-33 test, which passes again
because the reverted app doesn't read storage on load. No stored data is
changed or migrated. The empty `quicknotes` database that a fresh load
may now create is harmless to the old app, which opens it the same way
on its first save.

## Explicitly out of scope
- **Any new package** (A1), including a router, a virtualisation library and `@testing-library/user-event`.
- **Chunked or deferred rendering of the list** (R4). If AC-50 or AC-51 can't be met, that's a spec conversation.
- **An automated test for modifier and middle clicks** on note links (spec note 3).
- **Announcing a save that settles while a note is open** (spec risk 2, accepted).
- **A ticking relative time, absolute dates, re-reading the list, cross-tab updates and retry buttons** (spec non-goals).
- **Editing, deleting, search, sort options, a selected-row highlight, a side-by-side layout and modals** (spec non-goals; `edit-note`, `delete-note`, `search-notes`).
- **Any change to `src/storage/**`, `src/notes/**`, the entry point's exports, `@theme` tokens, `index.html`, `vite.config.ts`, `playwright.config.ts` or `package.json`.**
- **Editing the spec or other slugs' artifacts.** The cross-reference notes in `project-foundation` and `create-note` are the owner's housekeeping at ship (spec risk 8).
- **Automated Firefox and WebKit runs.** Safari is covered only by AC-52 and AC-61.

## Approval
<!-- Filled in by a human (Tech Lead) only. -->
- Approved by: AITechie, 2026-10-09
