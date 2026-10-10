# Plan: Search notes

- Status: Approved
- Slug: search-notes
- Spec: [spec.md](./spec.md) (Status: draft, under review. Solo mode: the owner approves the spec and this plan together at one gate.)
- Date: 2026-10-09
- Owner: AITechie

## Decisions applied (not open questions)
Choices that [product/decisions.md](../../product/decisions.md) (Status:
Approved) covers are applied here, citing it, and are not asked again.

| # | Decision | Basis |
|---|---|---|
| A1 | No new dependency, runtime or dev. No search, index or virtualisation library, and no `@testing-library/user-event` (component tests use the repo's `paste`/`typeInto`/`fireEvent` helpers; see spec note S1). | §3.2; spec R27 |
| A2 | Folding uses `String.prototype.normalize` and `toLowerCase` directly, no wrapper. | §3.3; spec R5 |
| A3 | The guards that change are exactly the spec's "Changes to earlier specs" rows, listed by file and test under "Existing tests that change". Nothing else is loosened. | §3.4 |
| A4 | No new colour token. The field copies the Title field classes; "Clear search" copies the `edit-delete-note` secondary button classes. | §2.4; spec R21 |
| A5 | Hidden, not disabled, while loading, empty or failed. | §2.3; spec R2 |
| A6 | Browser clear icons, native Escape, the iOS "Search" key: accepted, not worked around. | §2.6 |
| A7 | AC-34 and AC-35 are manual. Agents never mark them passed. | §4.1 |
| A8 | Release by branch and PR, merged on green CI. The owner appears only as "AITechie". | §4.2, §5.1 |

**Owner questions under §1.2: none.** Nothing here changes the charter,
adds a dependency, cost or network call, or changes what is stored. The
guard changes are exactly the spec's table. Both product choices (how a
query matches; the query in memory only) were decided on 2026-10-09.
Spec problems found while planning are recorded as notes S1-S5 under
Risks; the spec is not edited.

## Plan decisions for the Tech Lead
Choices the spec leaves to the plan. Approving the plan approves them.

| # | Decision | Why |
|---|---|---|
| D1 | **Pure match module** `src/noteSearch/match.ts`: `fold(s)`, `isBlankQuery(q)`, `queryWords(q)` (trimmed, split on `/\s+/u`, **de-duplicated**), `matchNotes(query, notes): readonly Note[]` and `primeFolds(notes): void`. Blank query → returns the `notes` argument itself (no copy, no mutation). Folded `{ title, body }` is cached in a module-level `WeakMap<Note, Folded>`; notes are immutable objects, and an edit produces a new object, so the cache can't go stale (R8). Imports: `import type { Note } from "../storage"` only. | R5-R9. De-duplicating words keeps a pasted 2,000-character query to a few dozen distinct `includes` per note (R26). |
| D2 | **The query lives in a component that exists only while there are notes.** New `SearchableNotes` (rendered by `NotesSection`'s `Body` only when `phase === "loaded"` and `notes.length > 0`) owns `query` and the status text in `useState`. When the list empties it unmounts, so the query resets without any reset code; when a note is saved it mounts again, empty (R2, AC-4). `NotesSection` stays mounted inside App's `<div hidden={inNote}>`, so the query survives the note view (R17) and is gone on reload (R16). Nothing touches the URL, history or storage. | Memory only by construction. |
| D3 | **Keep every item mounted; hide non-matches.** `matches = useMemo(() => matchNotes(query, notes), [query, notes])`; `shown = blank ? null : new Set(matches.map(n => n.id))`. `NoteList` gets `shown: ReadonlySet<string> \| null` and passes `hidden={shown !== null && !shown.has(note.id)}` to the memoised `NoteListItem`, which puts it on its `<li>` (`hidden` attribute → `display:none !important` via Tailwind preflight; out of the a11y tree and Tab order). With no matches the `<ul>` itself gets `hidden` and the no-match block shows. Only items whose `hidden` flips re-render; nothing is created or destroyed per keystroke, so "Clear search" over 1,000 notes is 990 attribute flips plus layout. Filtering runs synchronously in the `onChange` render (no `useDeferredValue`, no debounce), so the first frame after `input` is correct. | R11, R25; spec risk 2. |
| D4 | **Dividers that survive hidden items.** `divide-y divide-zinc-200` on the `<ul>` gives the last *DOM* child no border, which leaves a stray bottom border when the last items are hidden. Replace it with `[&>li:not([hidden])~li]:border-t [&>li]:border-zinc-200` (a top border on every item after a shown item). With nothing hidden this renders identically to today. | list-notes look unchanged (R11 "exactly the item"). |
| D5 | **Fold cache warm-up:** the searchbox's `onFocus` calls `primeFolds(notes)` (folds any note not yet cached). This takes the one-off ~2 M-character fold off the first measured keystroke. `matchNotes` still folds lazily, so correctness never depends on focus. Nothing is folded at load (list-notes R34 load budget untouched). | R25. |
| D6 | **Debounced polite count.** `SEARCH_STATUS_DELAY_MS = 500` in `src/noteSearch/searchStatus.ts`, with `searchStatusText(n)` in `src/copy.ts` ("No notes match" / "1 note matches" / `${formatCount(n)} notes match`). `SearchableNotes` effect, deps `[blank, query, matches]`: if not blank, `setTimeout(() => setStatus(searchStatusText(matches.length)), DELAY)` with cleanup `clearTimeout`. The status is emptied **in the event handlers** (change to a blank value, Clear, Escape), not in the effect, so there's no set-state-in-effect and no stale text flashes when typing restarts. `listShown()` (back from a note) keeps `state.notes` identity, so `matches` is stable and the status text stays (AC-15); a save/edit/delete gives a new `notes` array, restarting the wait (R19, States "list changed"). | R15, AC-14, AC-17. |
| D7 | **Clear and Escape.** "Clear search" `onClick`: `setQuery("")`, `setStatus("")`, `inputRef.current.focus()` (the button then unmounts; focus already left it). Input `onKeyDown`: `Escape` with value `!== ""` → `preventDefault()`, same clear, focus stays; with `""` → nothing. Enter is not handled; the field is not in a `<form>`, so nothing submits. The browser's own clear icon fires `input` → `onChange` (R12). IME: `onChange` as React delivers it (R12's MAY-wait is not used). | R12, R13. |
| D8 | **Focus after back.** `NoteList.focusNote(id)` returns `false` when the link's `<li>` is `hidden` (`link.closest("li")?.hidden`), so App's existing return effect (`focusNote` else `focusHeading`) gives R17 with no App change. This holds for `edit-delete-note`'s Discard/Back paths that use the same handle. | R17; list-notes R24 as revised. |
| D9 | **Search status position and test hook.** Markup: `<div className="mt-3">` → `<div role="search">` (label + field row) then `<div role="status" data-search-status="" className="text-sm text-zinc-600 not-empty:mt-2">`. It sits after the section's message regions (`edit-delete-note`'s status, then the list-notes alert) and before the list. Tests select it by `[data-search-status]`; `edit-delete-note`'s "Note deleted." region is selected by position (`h2 + [role=status]`), per the spec's AC-38 row. `<div role="search">`, not `<search>`, because jsdom's role mapping for `<search>` isn't reliable. | R1, R15; spec changes table. |
| D10 | **Search area markup and classes** (literal strings, list-notes D15): label `block text-sm font-medium text-zinc-900`; row `mt-1 flex flex-wrap gap-2`; input `type="search" autoComplete="off"`, `min-h-11 min-w-0 grow basis-48 rounded-md border border-zinc-500 bg-white px-3 py-2 text-base text-zinc-900`; button `type="button"` `min-h-11 rounded-md border border-zinc-500 bg-white px-4 font-medium text-zinc-900 hover:bg-zinc-100`. `basis-48` (12rem) makes the button wrap below at 320px/200% text and stay on the row at 360px. No-match block: `<div className="mt-3">` with `<p className="text-lg font-medium text-zinc-900">` and `<p className="text-base text-zinc-600">`, not in a live region. | R21, R22, Screens. |
| D11 | **Component-test timers.** `settle()` uses `setTimeout(0)`, so tests render and settle with real timers, then `vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })` and advance with `act(() => vi.advanceTimersByTime(ms))`; `vi.useRealTimers()` in `afterEach`. | AC-14, AC-15. |
| D12 | **Search seed generator** (R25, named here): `mulberry32(0x5ea2c4)` in `e2e/search.ts`, picking from a fixed list of 48 lower-case ASCII filler words (none contains "caf", "market" or "zq"; a test asserts this). Note `i` (0-999): `updatedAt = BASE + (1000 - i) * 10` (item i sorts at position i, as `notes-performance.spec.ts`); title = words joined by spaces, cut/padded with `"t"` to exactly 60; body likewise to exactly 2,000. Markers: `i % 50 === 3` → title starts `"MARKET "`; `i % 100 === 7` → body chars 1,501-1,506 are `" Café "` (precomposed U+00E9) — counts are asserted on the seed in Node before use. A **reference matcher** in `e2e/search.ts` re-implements R5-R7 independently (no import from `src/`). | R25, AC-27-29. |
| D13 | **Perf harness.** `e2e/search.ts` `measureSteps(page, steps)`: an `evaluate`'d script records the `timeStamp` of the triggering `input` / `click` / `keydown` (capture listener on the search area), then polls on each `requestAnimationFrame` the shown hrefs (`section[aria-labelledby=notes-heading] ul:not([hidden]) > li:not([hidden]) > a`, or the no-match text visible) until they equal the expected id list; elapsed = rAF `performance.now()` − event `timeStamp`. Steps run one at a time (Playwright `press` / `click`, waiting for each result). Per spec risk 3, the 26-step script is run **3 times** in the same page (it ends back at the full list) and each step's **median** must be under 100 ms; the budgets themselves are unchanged. | AC-27; spec risk 3. |

## Approach
UI only. Search filters the list `useNoteList` already holds; storage,
the `ListState` reducer, routing and App's return effect are reused
unchanged. A pure, React-free match module (D1) folds and matches.
`NotesSection` renders a new `SearchableNotes` only when the loaded list
has notes (D2); it owns the query and the debounced count (D6), renders
the search area (`SearchArea`), the list (all items mounted, non-matches
`hidden`, D3) and the no-match block. Because the query is plain React
state in a component that stays mounted while the note view shows, it
survives opening a note and is gone after a reload, with nothing written
anywhere. Focus on return reuses App's `focusNote`/`focusHeading` with
`focusNote` refusing hidden items (D8).

`edit-delete-note` is expected to merge first. It changes the list only
through `noteSaved`/`noteGone` (new `notes` arrays), which `matches`
recomputes from (R19), adds a status region above the alert (D9), and
returns to the list through the same App effect (D8). Nothing in this
plan depends on its internals; the build re-checks names after it
merges (Risk R1).

## Architecture

### API contract
No server API. The contracts are the repository calls, the URL, and
props between modules. Changing them means updating this plan first.

**1. UI → repository:** none added. `list()` stays once per page load;
searching calls no method (R20). The match module imports only the
`Note` type.

**2. URL, history, storage:** nothing. No `location`, `history`,
`document.title`, Web Storage, cookie, Cache Storage or IndexedDB access
from search code (R16, R28). No logging.

**3. Module and component contracts**
- `src/noteSearch/match.ts`: `fold(s: string): string`; `isBlankQuery(q: string): boolean`; `queryWords(q: string): string[]`; `matchNotes(query: string, notes: readonly Note[]): readonly Note[]`; `primeFolds(notes: readonly Note[]): void`.
- `src/noteSearch/searchStatus.ts`: `SEARCH_STATUS_DELAY_MS = 500`.
- `src/copy.ts` (additive): `SEARCH_LABEL`, `CLEAR_SEARCH`, `NO_MATCHES_PRIMARY`, `NO_MATCHES_SECONDARY`, `searchStatusText(n: number): string`.
- `NoteList` props (additive): `shown?: ReadonlySet<string> | null` (default `null` = all). Handle unchanged in shape; `focusNote` returns `false` for a hidden item.
- `NoteListItem` props (additive): `hidden: boolean`.
- `SearchArea` props: `{ query: string; onChange(value: string): void; onClear(): void; onEscape(e: KeyboardEvent): void; onFocus(): void; inputRef: Ref<HTMLInputElement>; status: string }`.
- `SearchableNotes` props: `{ notes: readonly Note[]; now: number; listRef: Ref<NoteListHandle> }`.
- `NotesSection`: props and handle unchanged by this slug (`edit-delete-note`'s `status` prop is kept as merged).

### Data model
N/A — no schema, record or retention change. In-memory only: `query:
string` and `status: string` in `SearchableNotes`; the fold cache
`WeakMap<Note, { title: string; body: string }>` (garbage-collected with
the notes). Nothing persists.

### Backend
N/A — QuickNotes has no backend; the storage layer is used as shipped.

### Frontend
**Screens and components (spec "Screens / views")**

| Spec screen / part | Component | Notes |
|---|---|---|
| "Your notes" heading and message regions | `NotesSection` (unchanged markup) | h2, then `edit-delete-note`'s status (once merged), then the alert. |
| Search area | `src/components/SearchArea.tsx` | D9, D10. Label, field row (searchbox + "Clear search" only while `query !== ""`), status line after the `role="search"` div. |
| The list | `NoteList` / `NoteListItem` (extended) | D3, D4, D8. |
| No matches | inside `SearchableNotes` | D10; rendered only when not blank and `matches.length === 0`. |
| Loading / empty / failed | `NotesSection` `Body` (unchanged) | `SearchableNotes` isn't rendered, so no search area (R2). |
| Note view | unchanged | The search area hides with the list view and keeps its value. |

**How each spec state renders**

| State | Rendering | Focus |
|---|---|---|
| List: loading / empty / load failed | Exactly as list-notes; no `SearchableNotes`. | unchanged |
| Search: no query | Area with empty field, no button, empty status; full list (`shown = null`). | unchanged (Title on load; field never self-focuses, R3) |
| Search: typing / results | Each `onChange` re-renders synchronously with `hidden` flips; status keeps its text until 500 ms after the last change. | the field |
| Search: no matches | `<ul hidden>`; no-match block; status "No notes match" after 500 ms. | the field |
| Search: cleared | Field `""`, button gone, status emptied at once, full list. | the field (D7) |
| Back from a note | Same `SearchableNotes` instance: query, `hidden` flags, status untouched. App effect → `focusNote` (false if hidden) → heading. | D8 |
| List changed while searching | New `notes` → `matches` recomputed, status wait restarts. | per the action |
| Last note gone | `SearchableNotes` unmounts → list-notes empty state; query gone. | per the action |
| Reload / new tab | Fresh state: empty field. | Title |

## Files / components touched
Names checked against `main` at `abe2bca` (list-notes shipped). **After
`edit-delete-note` merges, the build re-checks every name here**
(`NotesSection` props, `NoteList`, App's return effect, the delete status
region, `src/test/renderEdit.tsx`) before step 4 (Risk R1).

New (production):
- `src/noteSearch/match.ts`, `src/noteSearch/searchStatus.ts`
- `src/components/SearchArea.tsx`, `src/components/SearchableNotes.tsx`

Changed (production):
- `src/components/NotesSection.tsx`: `Body` renders `SearchableNotes` instead of `NoteList` for a non-empty loaded list.
- `src/components/NoteList.tsx`: `shown` prop, `hidden` on the `<ul>` when nothing is shown, D4 classes, `focusNote` hidden check.
- `src/components/NoteListItem.tsx`: `hidden` prop on `<li>`.
- `src/copy.ts`: search copy and `searchStatusText`.

New (tests and support):
- unit: `src/noteSearch/match.test.ts`
- tooling: `tests/tooling/search-module.test.ts` (AC-8 import check)
- component: `src/components/Search.field.test.tsx`, `Search.filter.test.tsx`, `Search.status.test.tsx`, `Search.return.test.tsx`, `Search.listChanges.test.tsx`, `Search.privacy.test.tsx`
- `src/test/renderSearch.tsx`: `searchWithCBA()` (in-memory double via `inMemoryWith(A, B, C)` so `list()` gives C, B, A), `searchbox()`, `clearButton()`, `searchStatus()` (`[data-search-status]`), `typeQuery(text)` (one `typeInto` per character), `shownLinkNames()` (alias of `noteLinkNames`, which already skips hidden links).
- e2e: `e2e/search.ts` (seed generator and reference matcher D12, `measureSteps` D13, `searchbox(page)`, `clearSearch(page)`, `searchStatus(page)`, `shownNoteLinks(page)` = the D13 selector, plus local copies of `expectAccentOutline`, `animatedElements` and the text-spacing CSS, as the existing layout specs each keep their own), `e2e/search-notes.spec.ts`, `e2e/search-layout.spec.ts`, `e2e/search-a11y.spec.ts`, `e2e/search-performance.spec.ts`, `e2e/search-privacy.spec.ts`.

Not touched: `src/storage/**`, `src/notes/**`, `src/noteList/listState.ts`, `useNoteList.ts`, `src/routing/**`, `src/App.tsx`, `src/components/SkipLink.tsx`, `NoteForm` and `src/noteForm/**`, `index.html`, `src/index.css`, `package.json`, `package-lock.json`, `eslint.config.js`, `playwright.config.ts`, `vite.config.ts`, `e2e/notes.ts`, `e2e/app.ts`.

### Existing tests that change (spec "Changes to earlier specs")
| Earlier item | File › test | Change |
|---|---|---|
| list-notes AC-1 (and create-note AC-1 as revised) | `src/components/NotesSection.load.test.tsx` › "main holds New note, the info lines and Your notes in order… (AC-1)" | `queryAllByRole("searchbox")` length 0 → exactly 1, named "Search notes", inside the section; still no checkbox; no "Clear search". |
| create-note AC-1 | `src/App.test.tsx` › "main holds the New note form… (AC-1)" | No assertion change: it runs with `list()` pending, when there is still no searchbox (R2). Only the comment gains "(search-notes: none while loading)". |
| list-notes AC-43 | `NotesSection.load.test.tsx` › "no live region in Your notes gets text except on a load failure (AC-43)" | `silent()` from `toEqual([""])` to "every region's text is `""`" (the search status is a second empty region once the list has notes). If `edit-delete-note` already changed this test, adjust its version the same way. |
| list-notes AC-17 / edit-delete-note AC-38 | `NotesSection.load.test.tsx` › "…exactly one empty alert region from the first render… (AC-17)"; edit-delete-note's AC-38 test and `renderEdit.tsx` `notesStatus()` | AC-17 unchanged (list pending). If `notesStatus()` selects "the only status" in the section, change it to `h2 + [role=status]` (D9). |
| list-notes AC-42 | `e2e/notes-layout.spec.ts` › "skip link: … Enter then Tab reaches the note (AC-42)" | After Enter, Tab focuses "Search notes"; one more Tab focuses the note link. |
| list-notes keyboard order | `e2e/notes-layout.spec.ts` (Tab loop to "Normal"), `e2e/open-note.spec.ts` › "a note opens with Enter…" (AC-35) | No change: their bounded Tab loops (12 and 10 presses) absorb the one extra stop. |

Every other existing test passes unchanged (spec "not changed" list);
`storage-boundary`, `licences` and `e2e-isolation` tooling tests are not
edited (AC-32, AC-33).

## Steps
Each step is reviewable on its own and leaves `npm run ci` green.

1. **[API] Contracts first.** `src/copy.ts` constants and `searchStatusText` (+ `copy.test.ts` cases: 0, 1, 2, 1,000 → "1,000 notes match"); `searchStatus.ts`; `match.ts` signatures with `NoteList`/`NoteListItem` prop types.
2. **[DATA] N/A** — no schema or stored-shape change.
3. **[BE] N/A** — no backend; storage used as shipped.
4. **[FE] Match module, test first.** `match.test.ts` (AC-5 table, AC-8 frozen inputs, throw-free inputs, de-dup, cache returns correct results for a new note object) then `match.ts`; `tests/tooling/search-module.test.ts`.
5. **[FE] List hiding.** `NoteListItem` `hidden`, `NoteList` `shown` + D4 dividers + `focusNote` check. Existing `NoteList.*` and `NotesSection.*` tests pass unchanged (nothing hidden yet).
6. **[FE] Search UI.** `SearchArea`, `SearchableNotes`, `NotesSection` wiring; `src/test/renderSearch.tsx` and the six component test files; the `NotesSection.load.test.tsx` AC-1 and AC-43 changes in the same commit. Run `npm run lint` (jsx-a11y stays as is; no new exception).
7. **[TEST] E2e.** `e2e/search.ts` (with a Node-side assertion of the seed's marker counts), then the five spec files, each storing test on the per-test `page` fixture or a context it creates and closes in `finally` (R31); the `notes-layout.spec.ts` AC-42 change.
8. **[TEST] AC-21 with edit-delete-note.** Once `edit-delete-note` is on `main`: re-check names (Risk R1), add `Search.listChanges.test.tsx` › AC-21 using its helpers (`openNote`, `editNote`, the delete dialog), adjusted to its approved spec.
9. **[TEST] Gate.** `PATH=~/.nvm/versions/node/v24.18.0/bin:$PATH npm run ci`; confirm `git diff main -- src/storage src/notes package.json package-lock.json tests/tooling/storage-boundary.test.ts tests/tooling/licences.test.ts tests/tooling/e2e-isolation.test.ts eslint.config.js playwright.config.ts` is empty. AC-34 recorded in `review.md` by a human; AC-35 at ship.

## Test strategy
Layers: **unit-FE** = Vitest on `match.ts`. **component** = Vitest + RTL
in jsdom, `<App repository={…} />` with C, B, A in the in-memory double
(or a spy/stub), fake timers per D11. **e2e** = Playwright, Chromium,
production build via `gotoApp`, per-test context. **tooling** =
`tests/tooling/`. **manual** = review or ship.

| Acceptance criterion | Layer | Test |
|---|---|---|
| AC-1 | component | `Search.field.test.tsx` › "one Search notes searchbox in Your notes inside role=search: type, autocomplete, no maxlength/required/pattern/placeholder, visible label, not in a form; order h2 → searchbox → list; no Clear search or checkbox; h2s unchanged; Title focused; New note unchanged (AC-1)" |
| AC-2 | component | `Search.field.test.tsx` › "no searchbox or search landmark while loading, empty or failed; list-notes content unchanged (AC-2)" |
| AC-3 | component | `Search.field.test.tsx` › "the searchbox appearing never takes focus from Title or changes its value (AC-3)" |
| AC-4 | component | `Search.field.test.tsx` › "last note found gone removes the search and resets the query; saving brings it back empty (AC-4)" |
| AC-5 | unit-FE | `match.test.ts` › "the AC-5 table, row by row (AC-5)"; "no call throws for regex characters, lone surrogates and 10,000 characters (AC-5)" |
| AC-6 | component | `Search.filter.test.tsx` › "blank queries show C, B, A with an empty status and no no-match text (AC-6)" |
| AC-7 | component | `Search.filter.test.tsx` › "display stand-ins (Untitled note, …, Updated, ago) are never matched (AC-7)" |
| AC-8 | unit-FE + tooling | `match.test.ts` › "returns the same objects in order, leaves frozen input unchanged, returns the input for a blank query (AC-8)"; `search-module.test.ts` › "match.ts imports only a type from src/storage/index.ts (AC-8)" |
| AC-9 | component | `Search.filter.test.tsx` › "filters per character; list has 2 listitems; hidden note not found; Tab: Clear search → C → A (AC-9)" (Tab order via DOM order of focusable, non-hidden elements, as `SkipLink.test.tsx` does) |
| AC-10 | component | `Search.filter.test.tsx` › "a result's link outerHTML equals its unfiltered link (AC-10)" |
| AC-11 | component | `Search.filter.test.tsx` › "paste filters; Enter changes nothing and calls no repository method (AC-11)" (see S1) |
| AC-12 | component | `Search.filter.test.tsx` › "Clear search, Escape (defaultPrevented) and Backspace restore the list; Escape on empty does nothing (AC-12)" |
| AC-13 | component | `Search.filter.test.tsx` › "zebra shows the no-match texts, no list, not live; cleared afterwards (AC-13)" |
| AC-14 | component | `Search.status.test.tsx` › "count after 500 ms, restarted by each change, copy for 1 / n / none / 1,000, emptied at once on clear (AC-14)" |
| AC-15 | component | `Search.return.test.tsx` › "Back to notes and hashchange keep query, results, status; focus on the opened link; hidden field keeps its value (AC-15)" |
| AC-16 | component | `Search.return.test.tsx` › "back after the opened note is found gone: A only, heading focused (AC-16)" |
| AC-17 | component | `Search.status.test.tsx` › "with a blank query the search status never has text; the alert only on load failure (AC-17)" |
| AC-18 | e2e | `search-notes.spec.ts` › "query never in URL, history state, title or storage; kept across open and Back; gone after reload and in a second page (AC-18)" |
| AC-19 | component | `Search.return.test.tsx` › "typing a query doesn't arm Leave site? (AC-19)" |
| AC-20 | component | `Search.listChanges.test.tsx` › "saves while searching appear only if they match; query kept; one list() (AC-20)" |
| AC-21 | component | `Search.listChanges.test.tsx` › "edits and deletes while searching update the results; one list() (AC-21)" — step 8, after edit-delete-note merges |
| AC-22 | component | `Search.listChanges.test.tsx` › "typing, clearing and Escape call no repository method (AC-22)" |
| AC-23 | e2e | `search-notes.spec.ts` › "skip link then Tab reaches Search notes, then Clear search, then the note; Save note → Search notes → note (AC-23)" |
| AC-24 | e2e + tooling | `search-layout.spec.ts` › "field and Clear search: accent outline, 44px, 16px text; no animations in results and no-match (AC-24)"; existing `tests/tooling/theme.test.ts` (one non-zinc token) |
| AC-25 | e2e | `search-layout.spec.ts` › "no horizontal scroll at 360-1920 with a, a 2,000-char query and zebra; 320px at 200% and text spacing unclipped (AC-25)" |
| AC-26 | e2e | `search-a11y.spec.ts` › "axe: no query, results + status, no matches + status, Clear search focused, 360px results (AC-26)" |
| AC-27 | e2e | `search-performance.spec.ts` › "26-step script, each step's median under 100 ms on the search seed (AC-27)" (D12, D13) |
| AC-28 | e2e | `search-performance.spec.ts` › "keyboard.type with no delay: exact value, no-match within 100 ms, no long task over 100 ms (AC-28)" |
| AC-29 | e2e | `search-performance.spec.ts` › "pasting note 500's body shows it within 300 ms, no long task over 300 ms (AC-29)" |
| AC-30 | e2e | `search-privacy.spec.ts` › "searching makes no request, no persist call, no storage write (AC-30)" (reuses `trackPersistenceCalls`, `readStoredNotes`) |
| AC-31 | component | `Search.privacy.test.tsx` › "no console call contains the query or note text (AC-31)" |
| AC-32 | tooling | existing `package-contract.test.ts`, `licences.test.ts`, `storage-boundary.test.ts`, unchanged |
| AC-33 | tooling + review | existing `e2e-isolation.test.ts` unchanged; review checks every new storing e2e test uses `page` or a closed own context |
| AC-34 | manual | VoiceOver macOS/iOS Safari + keyboard-only Chrome, recorded in `review.md` by a human |
| AC-35 | manual | Ship check on the live URL in desktop Chrome and Safari, recorded at ship |

## Risks & rollback
- **R1 — edit-delete-note lands first (schedule).** Its plan adds a `status` prop and region to `NotesSection`, App-level delete handling, `renderEdit.tsx` helpers, and may edit the same AC-43 test. Detect: step 8 starts with a name re-check against `main`; if its approved spec differs from the draft this spec cites, update this plan (and the spec's changes table) before building. Search code itself only depends on `noteSaved`/`noteGone` producing new arrays and on App's `focusNote` call.
- **R2 — perf in CI (spec risk 3).** Layout of ~1,000 shown items after "Clear search" is the slowest step. Mitigations: items stay mounted (D3), fold cache primed on focus (D5), word de-dup (D1). Detect: AC-27 per-step timings in the report. If still flaky, the next lever is `content-visibility: auto` on `<li>` (no spec change); budgets change only by a spec revision.
- **R3 — hidden items still in the DOM.** `hidden` relies on preflight's `display:none !important`; a future class with `display` on `<li>` would leak hidden items. AC-9 (a11y tree) and AC-27 (visible links) catch it.
- **R4 — divider class change (D4).** An arbitrary variant replaces `divide-y`. Detect: existing `notes-layout` checks and a visual check in review; `theme.test.ts` colour scan sees only `zinc-200`.
- **R5 — fold cost on huge notes (spec risk 1).** 100,000-character notes fold once each (cached), but substring scans grow linearly. Accepted by the spec.
- **Rollback:** the feature is additive in four production files plus two new components; revert the PR. No data, schema or storage change, so nothing to migrate back.

### Spec notes found while planning (spec not edited)
- **S1 — AC-11 says `user.paste`.** `@testing-library/user-event` isn't installed, and adding it isn't needed (§3.2). The test uses the repo's `paste()` (one change event with the whole value), which exercises the same R12 path. Recommended wording: "pasted (one input event setting the whole value)".
- **S2 — AC-9 Tab order in jsdom.** jsdom has no real Tab; the test checks the order of focusable, non-hidden elements after the searchbox, as `SkipLink.test.tsx` does. Real Tab is covered by AC-23 (e2e).
- **S3 — AC-27 "26 steps" and retries.** The spec doesn't say how a repeated measurement is judged. D13 takes the per-step median of 3 runs; the owner approves that by approving this plan.
- **S4 — AC-14 phrasing.** "the status is still its previous value (empty)" after typing "s" into an empty field: the status is empty because the field was blank; the test asserts `""`.
- **S5 — AC-21 and AC-38 depend on a draft.** Both refer to `edit-delete-note`'s draft of 2026-10-09; spec risk 9 already requires a re-check, mirrored here as R1 and step 8.

## Explicitly out of scope
- Rendering only the matching notes (unmount/mount per keystroke): rejected for the clear-to-1,000 cost (D3).
- Deferred rendering (`useDeferredValue`, workers, debounced filtering): not needed at this size; would make the first correct frame later.
- A precomputed index or eager folding at load (list-notes R34 load budget).
- Highlighting, snippets, ranking, a shortcut, persisted or URL queries (spec non-goals).
- Hiding the browser's own search clear icon.
- Firefox/WebKit automated runs; Safari is covered manually (AC-34, AC-35).

## Approval
- Approved by: AITechie, 2026-10-09
