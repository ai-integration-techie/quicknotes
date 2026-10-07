# Plan: Create a note

- Status: Approved
- Slug: create-note
- Spec: [spec.md](./spec.md) (Status: Approved, AITechie, 2026-10-07)
- Date: 2026-10-07
- Owner: AITechie

## Owner decisions confirmed (not assumptions)
The owner (AITechie) accepted all 12 of the spec's open questions as
proposed, in conversation on 2026-10-07, when approving the spec. They are
**confirmed** and this plan builds on them as fixed inputs.

| # | Spec open question | Confirmed answer | Effect on this plan |
|---|---|---|---|
| Q1 | Error styling without a new colour | No red and no `danger` token. Errors are `zinc-900` text, a 2px `zinc-900` border and `aria-invalid`. | `src/index.css` gets no new colour token. `theme.test.ts` (project-foundation AC-25) stays unchanged and must pass. See D5 for how the invalid border is styled. |
| Q2 | "Note saved." has no timer | Accepted. It stays until the next edit or save attempt (R13). | No timers anywhere in the form. The reducer clears the message on `edit` and on `attemptStarted`. |
| Q3 | Enter in Title moves to Note | Accepted (R6). | `keyboard.ts` treats Enter without Ctrl/Meta in Title as "move to Note" and calls `preventDefault()`, so the browser never does an implicit submit. |
| Q4 | Line breaks removed from pasted titles | Accepted. Title stays an `<input type="text">`. | The app passes field values through unchanged. Nothing tries to "fix" what the browser does. |
| Q5 | Both shortcuts on every platform | Accepted. Ctrl+Enter and Cmd+Enter both save everywhere. The hint names the platform's usual one. | `isSaveShortcut` accepts `ctrlKey \|\| metaKey`. `shortcutHint` picks the text from `navigator.platform`. |
| Q6 | Copy | Accepted exactly as in the spec's Copy table. | Every string is a constant or formatter in `src/copy.ts`. Tests import the constants, plus literal checks of the exact spec text in `copy.test.ts`. |
| Q7 | iOS limits (no keyboard on programmatic focus, no `beforeunload`) | Accepted. | No workaround code. Recorded in AC-57's manual notes. |
| Q8 | The 1-second check runs in CI only | Accepted. AC-4 runs against the local preview in headless Chromium. | One e2e test (AC-4). No real-device timing. |
| Q9 | Cross-reference notes at ship | Accepted. At ship the owner adds a one-line pointer to this spec in `project-foundation`, `pages-deploy` and `note-storage`. | This slug's agents don't edit those artifacts. The ship step lists it as a human task. |
| Q10 | Narrowing note-storage R42/AC-56 (not AC-51/AC-53) | Confirmed. | `storage-boundary.test.ts` replaces only the AC-56 test. The AC-51 and AC-53 tests stay byte-for-byte unchanged. |
| Q11 | A8 test notes stay in the live database | Accepted. | AC-58 notes use a clearly named title ("A8 check …"). Nothing clears the database. |
| Q12 | Firefox may show its own persistent-storage prompt | Accepted. QuickNotes adds no copy about it. | AC-49 checks that no rendered text says "persist" or "permission". |

## Plan decisions for the Tech Lead
These are choices the spec leaves to the plan. Approving the plan approves
them.

| # | Decision | Why |
|---|---|---|
| D1 | **Tests supply the repository through an optional `repository` prop on `App`.** `main.tsx` keeps rendering `<App />`, and `App` uses `repository ?? getNoteRepository()`. No `vi.mock` of the storage module. | The spec leaves "how it is supplied" to the plan. A prop keeps the real error classes from `src/storage/index.ts` (so `instanceof` works in tests) and needs no module mocking. Calling `getNoteRepository()` during render is allowed: it touches nothing (note-storage R25, spec R26). |
| D2 | **No new dependency, runtime or dev.** `@testing-library/user-event` was considered: `npm view` shows 14.6.7, licence MIT (on the R5 allowlist), no dependencies, and a peer `@testing-library/dom` that is already installed. It isn't needed. | `fireEvent` covers every component AC. The behaviour only a real browser shows (implicit form submit, Tab order, real typing, `beforeunload` dialogs) is covered in Playwright (AC-4, AC-10's e2e companion, AC-36, AC-52). One less package to keep licence-clean. |
| D3 | **Form state is a pure `useReducer` reducer** (`src/noteForm/formState.ts`), and every state change returns a new object. `flushSync` is used at two points: (a) to commit "clear every message" before a new outcome is shown, so a repeated alert is a real DOM change (R22, R34); (b) to commit an outcome before moving focus, so `aria-invalid` and `aria-describedby` are in place when the field gets focus (R16). | The reducer can be unit-tested without React. `flushSync` is React's supported way to commit synchronously inside an event handler. It's needed because React batches updates, so "clear, then set" would otherwise never reach the DOM as an empty region. |
| D4 | **The "one save at a time" guard is a ref** (`savingRef`), set synchronously at the start of an attempt and cleared when it settles, as well as the `phase: "saving"` state that drives the UI. | Two triggers in the same tick (a click and a Ctrl+Enter) would both see stale state before a re-render. The ref makes AC-13's "still 1 call" deterministic. |
| D5 | **The invalid border uses a custom Tailwind variant** (`@custom-variant` and the `not-empty:` compound used below are both present in the installed Tailwind 4.3). `src/index.css` adds `@custom-variant aria-invalid (&[aria-invalid="true"]);`, and fields use the literal classes `aria-invalid:border-2 aria-invalid:border-zinc-900`. | Tailwind 4.3's built-in ARIA variants are only busy, checked, disabled, expanded, hidden, pressed, readonly, required and selected (checked in `node_modules/tailwindcss/dist/lib.js`). An arbitrary `aria-[invalid=true]:` prefix would slip past the AC-25 colour scan in `theme.test.ts`, because that scan's variant pattern is `[a-z0-9-]+:`. A named variant keeps every class a literal `className="…"` token the scan reads. No colour token is added. |
| D6 | **The platform hint is read from `navigator.platform`.** `/^(Mac\|iPhone\|iPad\|iPod)/` selects "Press Cmd+Enter to save."; anything else, including an empty string, selects "Press Ctrl+Enter to save.". | AC-11 names `navigator.platform` as an example. It is deprecated but present in every target browser. iPadOS reports `"MacIntel"`, which correctly gives Cmd. jsdom reports `""`, which gives Ctrl. **E2e tests never assert one fixed hint:** Playwright's `navigator.platform` follows the host OS (CI is `ubuntu-latest`, which gives Ctrl, while a Mac gives Cmd). They match `/^Press (Cmd\|Ctrl)\+Enter to save\.$/` or find the hint through the button's `aria-describedby`. |
| D7 | **A `ValidationError` from `create` is handled exactly like the pre-check, including focus** (R18's "map its issues the same way"): an `empty` issue focuses Title; too-long issues focus the first invalid field. Every other rejection follows R21 and leaves focus alone. If any issue in the list isn't one of `note/empty` or `title\|body/too-long`, the whole rejection shows the generic message, and no field errors. | R18 and R21 can be read as conflicting for this case. Moving focus is what lets a screen reader hear a too-long message that isn't in a live region. The path can't be reached in practice, because the pre-check runs the same rules first. AC-24 checks the messages only. |
| D8 | **"Plain Enter" in Title is any `Enter` without `ctrlKey`/`metaKey` and not composing**, including Shift+Enter and Alt+Enter. It calls `preventDefault()` and focuses Note. | A single-line input submits its form on any Enter. Catching every Enter variant is the only way to guarantee no third save trigger (owner decision 2). |
| D9 | **IME guard:** a key event is "composing" when `nativeEvent.isComposing` is true **or** `keyCode === 229`. | R7 requires `isComposing`. Safari fires the Enter that commits a composition with `isComposing: false` but `keyCode 229`. The extra check only ever suppresses a save or focus move. |
| D10 | **Layout of the code:** visual components stay flat in `src/components/` (the existing convention), and the form's non-visual logic and hooks go in a new `src/noteForm/` folder. Both folders are **UI modules** under R29, so each may import storage only through `src/storage/index.ts` (written `"../storage"`). | Keeps files small (most under 150 lines), and makes the pure logic testable without rendering. The R29 discovery (AC-43) lists files, so it covers the new folder with no fixed list. |

## Approach
The app gets one new screen region: a "New note" section at the top of
`<main>`, followed by the static info text that replaces the old empty
state. Everything is plain React 19 + Tailwind 4 in the existing shell. There
is no router, no new state library and no new dependency.

The form is a **controlled form driven by a pure reducer**. A
`useNoteForm` hook owns the reducer, the field refs, the in-flight guard
and the handlers. The components only render state. A save attempt goes
through the same rules in the same order every time:

1. Ignore it if a save is already in flight (D4).
2. Commit "clear every message" (D3a).
3. Pre-check the current values with `countCharacters`,
   `TITLE_MAX_CHARS` and `BODY_MAX_CHARS` from `src/storage/index.ts` (R8).
   If the check fails, show the problem, move focus (R15, R16) and stop.
4. Otherwise enter the saving state (`Saving…`, `aria-disabled`, read-only
   fields), then `await repository.create({ title, body })` with the field
   values unchanged (R5, R9).
5. On resolve: "Note saved.", clear both fields, back to idle, focus Title
   (R11). On reject: map the error to copy (R18, R20), keep the text, back
   to idle, and leave focus alone (R21; D7 for validation rejections).

The UI reaches storage only through `getNoteRepository()` and only calls
`create` (R27). Nothing touches storage on load or while typing (R26), so
`project-foundation` AC-33 keeps passing untouched (R28). Unsaved text lives
only in React state. A `beforeunload` handler is registered while either
field has text (R25).

Testing follows the spec's layers. **Component** tests render `<App
repository={…} />` in jsdom with the in-memory double or small stubs. **E2e**
tests run in Playwright on the production build under `/quicknotes/`, with
`gotoApp` and a fresh context for every test. **Tooling** tests pin the
storage boundary, the entry point's export list and the other static rules.
The existing tests named in the spec's "Changes to earlier specs" table are
changed deliberately, one assertion at a time (see "Existing tests that
change").

## Architecture

### API contract
There is no server. The contract this slug builds against is the shipped
storage entry point. It is used exactly as shipped and its surface is
pinned by a test (R30, AC-45).

**Entry point:** `src/storage/index.ts`, imported from UI modules as
`"../storage"` (resolves to `src/storage/index.ts`).

| Used by the UI | Signature (unchanged) | How this slug uses it |
|---|---|---|
| `getNoteRepository()` | `() => NoteRepository` (singleton; touches nothing) | Called once per render in `App` when no `repository` prop is given (D1). |
| `NoteRepository.create` | `(input: NoteInput) => Promise<Note>` | The only method called: once per attempt that passes the pre-check, with exactly `{ title, body }` (R9, R27). The resolved `Note` is ignored. |
| `countCharacters` | `(s: string) => number` (code points) | Pre-check (R8) and counter (R19). |
| `TITLE_MAX_CHARS` / `BODY_MAX_CHARS` | `200` / `100_000` | Limits for the pre-check, the counter and the copy formatters. |
| `NoteStorageError` and subclasses | `kind: "validation" \| "not-found" \| "unavailable" \| "quota-exceeded"`; `ValidationError.issues: readonly ValidationIssue[]` | Rejection mapping (below). |
| Types `Note`, `NoteInput`, `NoteRepository`, `ValidationIssue` | type-only | Typing props and the mapping. |

Not called, ever, in this slug: `list`, `get`, `update`, `delete`,
`isPersisted` and `navigator.storage.*` (R26, R27; AC-37 checks it).

**Pinned export surface (R30, AC-45):** value exports are exactly
`getNoteRepository`, `NoteStorageError`, `NotFoundError`,
`QuotaExceededError`, `StorageUnavailableError`, `ValidationError`,
`BODY_MAX_CHARS`, `TITLE_MAX_CHARS` and `countCharacters`. Type exports are
exactly `Clock`, `IdGenerator`, `Note`, `NoteInput`, `NoteRepository`,
`StorageManagerLike`, `NoteStorageErrorKind` and `ValidationIssue`. This
slug doesn't change `src/storage/index.ts`.

**Outcome mapping (R15, R16, R18, R20)**, implemented once in
`src/noteForm/saveProblems.ts` and unit-tested on its own. Each outcome
names the copy (`src/copy.ts`), the region it appears in, and where focus
goes:

| Source | Condition | Shown | Region | Focus |
|---|---|---|---|---|
| Pre-check | `countCharacters(title) === 0 && countCharacters(body) === 0` | `BOTH_EMPTY` "Add a title or some text first." | alert | Title |
| Pre-check | title > 200 and/or body > 100,000 | `titleTooLong(n)` / `noteTooLong(n)` under each field; `aria-invalid="true"` | none (field-level) | first invalid field, Title before Note |
| `create` resolves | — | `NOTE_SAVED` "Note saved." | status | Title |
| `create` rejects | `ValidationError` with exactly `[{field:"note",rule:"empty"}]` | `BOTH_EMPTY` | alert | Title (D7) |
| `create` rejects | `ValidationError` whose issues are all `title`/`body` `too-long` | `titleTooLong(actual)` / `noteTooLong(actual)` | field-level | first invalid field (D7) |
| `create` rejects | `ValidationError` with any other issue | `SAVE_FAILED_GENERIC` | alert | unchanged |
| `create` rejects | `kind === "unavailable"` | `SAVE_FAILED_UNAVAILABLE` | alert | unchanged |
| `create` rejects | `kind === "quota-exceeded"` | `SAVE_FAILED_QUOTA` | alert | unchanged |
| `create` rejects | `kind === "not-found"`, an unknown `kind`, a non-`NoteStorageError` `Error`, or a non-Error value | `SAVE_FAILED_GENERIC` | alert | unchanged |

The mapping never reads `error.message` and never logs anything (R24).
The rejected value is dropped after mapping.

### Data model
N/A. No schema or record change. Saved notes go into note-storage's
`quicknotes` v1 database, `notes` store, unchanged. Unsaved text is
held only in React state: no drafts in IndexedDB, `localStorage`,
`sessionStorage`, cookies, Cache Storage or the URL (R25).

The only new "model" is the in-memory form state (frontend, below).

### Backend
N/A. QuickNotes has no backend (charter). The storage layer from
`note-storage` serves as the app's back end on the device, and this slug
uses it as shipped with no change to `src/notes/` or `src/storage/`.

### Frontend

**Component tree** (all rendered in the first render; no `lazy`, no
`Suspense`, nothing awaits storage, a timer or the network: R2, AC-5):

```
main.tsx (unchanged) → StrictMode → ErrorBoundary (unchanged) → App
App({ repository? })                       src/App.tsx
├─ AppHeader (unchanged)                   <header><h1>QuickNotes</h1>
└─ <main className="mx-auto w-full max-w-3xl px-4 sm:px-6">   (unchanged classes)
   ├─ NoteForm({ repository })             src/components/NoteForm.tsx
   │   <section aria-labelledby={h2Id} className="pt-6">
   │   ├─ <h2 id={h2Id}>New note</h2>
   │   └─ <form noValidate onSubmit>
   │      ├─ NoteField kind="title"        src/components/NoteField.tsx
   │      │   <label for> Title · <input type="text"> · error <p> · counter <p>
   │      ├─ NoteField kind="body"
   │      │   <label for> Note · <textarea rows=12> · error <p> · counter <p>
   │      ├─ SaveRow                       src/components/SaveRow.tsx
   │      │   <button type="submit" aria-keyshortcuts aria-describedby={hintId}>
   │      │   <p id={hintId}> Press Cmd|Ctrl+Enter to save.
   │      └─ FormMessages                  src/components/FormMessages.tsx
   │          <div role="status"> · <div role="alert">
   └─ InfoText                             src/components/InfoText.tsx (replaces EmptyState.tsx)
       <div className="mt-12 text-center break-words"><p>…</p><p>…</p></div>
```

**Form state** (`src/noteForm/formState.ts`, pure, immutable):

```ts
type Field = "title" | "body";
type FieldErrors = Readonly<Partial<Record<Field, number>>>; // actual code-point count
type FormMessage =
  | { readonly kind: "saved" }                       // status region; cleared by any edit or attempt (R13)
  | { readonly kind: "empty" }                       // alert; cleared when either field has ≥1 char (R17)
  | { readonly kind: "failure"; readonly text: string } // alert; cleared only by the next attempt (R22)
  | null;
interface FormState {
  readonly title: string;
  readonly body: string;
  readonly phase: "idle" | "saving";
  readonly fieldErrors: FieldErrors;
  readonly message: FormMessage;
}
type FormAction =
  | { type: "edit"; field: Field; value: string } // ignored while saving
  | { type: "attemptStarted" }                    // clears message + fieldErrors
  | { type: "savingStarted" }
  | { type: "saved" }                             // title/body "" + message saved + idle
  | { type: "problem"; problem: SaveProblem };    // fieldErrors/message + idle; text kept
type SaveProblem = { readonly fieldErrors: FieldErrors; readonly message: FormMessage };
```

`edit` rules (R13, R14, R17): it sets the value; removes that field's
error; removes a `saved` message; removes an `empty` message once
`title !== "" || body !== ""`; never adds anything. A `failure` message
survives edits.

**Hook `useNoteForm(repository)`** (`src/noteForm/useNoteForm.ts`) returns
state, `titleRef`/`bodyRef`, `onChange(field)`, `onKeyDown(field)` and
`onSubmit`. Its core is:

```ts
async function attemptSave(): Promise<void> {
  if (savingRef.current) return;                    // R10, D4
  flushSync(() => dispatch({ type: "attemptStarted" })); // R22: clear first (D3a)
  const title = titleRef.current?.value ?? "";      // the fields' current values (R5)
  const body = bodyRef.current?.value ?? "";
  const input = { title, body };                    // exactly two keys, unchanged (R9)
  const early = checkBeforeSave(input);             // R8
  if (early) return show(early);                    // flushSync + focus (D3b)
  savingRef.current = true;
  flushSync(() => dispatch({ type: "savingStarted" }));
  try {
    await repository.create(input);
    flushSync(() => dispatch({ type: "saved" }));
    titleRef.current?.focus();                      // R11
  } catch (error) {
    show(problemFromRejection(error));              // R18/R20/R21, D7
  } finally {
    savingRef.current = false;
  }
}
```

The values are read from the controlled fields' DOM nodes at the moment
of the attempt, so they are exactly what the user sees. A stale closure
over `state` can't save old text, and refs are only read in handlers,
never during render. `show(problem)` commits with
`flushSync`, then focuses `focusTargetFor(problem)` (Title, Body or
nothing).

**Keyboard** (`src/noteForm/keyboard.ts`, pure predicates over a
minimal `{ key, ctrlKey, metaKey, isComposing, keyCode }` shape):
- `isComposing(e)`: `e.isComposing || e.keyCode === 229` (D9). When it's
  true, the handler does nothing.
- `isSaveShortcut(e)`: `key === "Enter" && (ctrlKey || metaKey)`, on
  either field. The handler calls `preventDefault()` (so the textarea gets
  no line break) and `attemptSave()` (R7).
- `isPlainEnter(e)` on Title only: `key === "Enter" && !ctrlKey &&
  !metaKey`. The handler calls `preventDefault()` and
  `bodyRef.current.focus()` (R6, D8). On Note, plain Enter and Shift+Enter
  keep their default (a line break).
- Tab and Shift+Tab are never handled (no trap).

**Submit:** `<form onSubmit>` calls `event.preventDefault()` and then
`attemptSave()`. That covers a click, a tap, and Enter/Space on the
focused button. Implicit submission from Title can't happen, because
Enter there is always prevented.

**Focus on load (R2, AC-2):** `useEffect(() => titleRef.current?.focus(),
[])` in `useNoteForm`. It's a programmatic focus after mount, so
jsx-a11y's `no-autofocus` stays on and isn't loosened. StrictMode's
double effect only focuses twice.

**Counter (R19)** (`src/noteForm/saveCheck.ts`): `counterValue(value,
limit)` returns `null` below `Math.ceil(limit * 0.9)` (180 / 90,000), or
the count. Fast path: if `value.length < threshold`, return `null` without
counting. A string's code-point count is never greater than its UTF-16
length, so this is exact, and it saves an `Array.from` over a large body
on most keystrokes. `counterText(n, limit)` in `copy.ts` formats it as
`"{n} of {limit} characters"` with `Intl.NumberFormat("en-US")`. The
counter `<p>` has no `role` and no `aria-live`. It is linked through the
field's `aria-describedby`, and has the same classes under and over the
limit.

**`NoteField`** builds `aria-describedby` from the ids (`useId`) of the
error `<p>` and the counter `<p>` that are currently rendered, in that
order. It omits the attribute when neither is rendered. `aria-invalid` is
`"true"` or absent. The control has no `maxLength` and no `required`
(R4), and gets `readOnly={phase === "saving"}` (R10).

**`SaveRow`:** `<button type="submit">` with the text "Save note" or
"Saving…" (U+2026). `aria-disabled="true"` only while saving; it is never
`disabled`, so it stays focusable (R10). It has
`aria-keyshortcuts="Control+Enter Meta+Enter"` and
`aria-describedby={hintId}` (R35). The hint is a `<p>` from
`shortcutHint(navigator.platform)` (D6). The submit handler ignores the
event while saving (D4).

**`FormMessages`:** two `<div>`s that always exist from the first
render, with no `hidden` and no `display: none` (that would break
announcements). `role="status"` shows `NOTE_SAVED` only when
`message.kind === "saved"`. `role="alert"` shows the `empty` or `failure`
text. Only one of them is ever non-empty (R34). Styling is `text-base
text-zinc-900` plus `not-empty:mt-3`, so an empty region takes no space.

**`useUnsavedTextWarning(active)`** (`src/noteForm/useUnsavedTextWarning.ts`):
while `active` (that is, `title !== "" || body !== ""`), an effect adds a
`beforeunload` listener that calls `event.preventDefault()` and sets
`event.returnValue = true` (for older engines). The effect cleanup removes
it, so after a successful save (both fields `""`) no handler is active
(R25). It stores nothing anywhere.

**Design system use (R32, R38):** only zinc, white and `accent` classes
(AC-25 scan). Classes:
- `<h2>`: `text-lg font-semibold text-zinc-900`.
- Labels: `block text-sm font-medium text-zinc-900`.
- Fields: `mt-1 block w-full rounded-md border border-zinc-500 bg-white px-3 py-2 text-base text-zinc-900 aria-invalid:border-2 aria-invalid:border-zinc-900` (D5). The textarea adds `resize-y`.
- Error and counter `<p>`: `mt-1 text-sm break-words`. Errors use `text-zinc-900`, counters `text-zinc-600`.
- Save row: `mt-2 flex flex-wrap items-center gap-x-4 gap-y-2`.
- Button: `min-h-11 rounded-md bg-accent px-4 font-medium text-white` (44px). Hint: `text-sm text-zinc-600`.
- No `transition`/`animate` classes. The focus outline is the existing global `:focus-visible` rule.

**Spec states → rendering:**

| Spec state | Rendered as |
|---|---|
| Loading | Unchanged: blank `zinc-50` until JS runs. The form is in the first render. Focus goes to Title in the mount effect. |
| Idle, empty | `phase: "idle"`, both fields `""`, no errors, `message: null`. Both live regions empty. No `beforeunload` handler. |
| Idle, with text | Values set. Counters where `counterValue` isn't null. No errors from typing (R14). `beforeunload` handler active. |
| Saving | `phase: "saving"`: button "Saving…" with `aria-disabled="true"`, fields `readOnly`, regions empty (cleared at attempt start). |
| Saved | `message.kind === "saved"`, fields `""`, counters gone (values empty), focus Title. No `beforeunload` handler. |
| Error: both empty | `message.kind === "empty"` in the alert region. Focus Title. |
| Error: too long | `fieldErrors.title` / `.body` give the `<p>` under the field, `aria-invalid`, and `aria-describedby` (error id, then counter id). Focus on the first invalid field. Counter still shown. |
| Error: unavailable / quota / other | `message.kind === "failure"` with the mapped text in the alert region. Text kept. Focus unchanged. |
| Render failure, JavaScript off | Unchanged `ErrorBoundary` / `<noscript>`. |

**Copy (`src/copy.ts`):** the new constants are `NEW_NOTE_HEADING`,
`TITLE_LABEL`, `NOTE_LABEL`, `SAVE_BUTTON`, `SAVE_BUTTON_SAVING`,
`HINT_APPLE`, `HINT_OTHER`, `NOTE_SAVED`, `BOTH_EMPTY`,
`SAVE_FAILED_UNAVAILABLE`, `SAVE_FAILED_QUOTA`, `SAVE_FAILED_GENERIC`,
`INFO_PRIMARY` and `INFO_SECONDARY`. The new formatters are
`counterText(n, limit)`, `titleTooLong(n)` and `noteTooLong(n)`. All of
them are exact spec strings. `EMPTY_STATE_PRIMARY` and
`EMPTY_STATE_SECONDARY` are removed, because their copy no longer exists.
`APP_NAME`, `ERROR_FALLBACK` and `NOSCRIPT_MESSAGE` are unchanged.

## Files / components touched
New, production (UI modules under R29):
- `src/components/NoteForm.tsx`: the section, `<h2>`, `<form>` and composition.
- `src/components/NoteField.tsx`: label, input/textarea, error, counter and ARIA wiring.
- `src/components/SaveRow.tsx`: the button and hint.
- `src/components/FormMessages.tsx`: the status and alert regions.
- `src/components/InfoText.tsx`: the static info text (replaces `EmptyState.tsx`).
- `src/noteForm/formState.ts`: types, `initialFormState`, `formReducer`.
- `src/noteForm/saveCheck.ts`: `checkBeforeSave`, `counterValue`, `COUNTER_FROM`.
- `src/noteForm/saveProblems.ts`: `problemFromRejection`, `focusTargetFor`.
- `src/noteForm/keyboard.ts`: `isComposing`, `isSaveShortcut`, `isPlainEnter`.
- `src/noteForm/platform.ts`: `shortcutHint(platform)`.
- `src/noteForm/useNoteForm.ts`: reducer wiring, refs, the in-flight guard, handlers and focus on mount.
- `src/noteForm/useUnsavedTextWarning.ts`: the `beforeunload` effect.

Changed, production:
- `src/App.tsx`: optional `repository` prop; renders `NoteForm` and `InfoText`.
- `src/copy.ts`: new copy and formatters; `EMPTY_STATE_*` removed.
- `src/index.css`: one `@custom-variant aria-invalid (&[aria-invalid="true"]);` line (D5). No `@theme` change.

Deleted: `src/components/EmptyState.tsx`.

Unchanged on purpose: `src/main.tsx`, `index.html`, `src/components/AppHeader.tsx`,
`src/components/ErrorBoundary.tsx`, everything in `src/notes/` and
`src/storage/`, `package.json` dependencies, `vite.config.ts`,
`playwright.config.ts`, `eslint.config.js`.

New, test support (`src/test/`, not reachable from production, AC-53):
- `src/test/repositoryDoubles.ts`: `createSpyRepository()` (every method a `vi.fn`; `create` resolves a `Note`), `createStubRepository({ create })`, `deferred<T>()`, `rejectingWith(value)`.
- `src/test/renderApp.tsx`: `renderApp(repository)` returns `{ title, note, saveButton, status, alert, form }` locators via RTL roles; plus `paste(field, text)` (one `fireEvent.change`) and `typeInto(field, text)`.

New tests: see "Test strategy". Changed tests: see "Existing tests that
change".

Tooling helpers: `tests/tooling/repo.ts` gains `uiModules()` (R29
discovery) and `exportSurface(text)` (TypeScript-compiler read of value
and type exports). Existing helpers are unchanged.

## Steps
Each step is reviewable on its own and leaves `npm run ci` green, except
steps 5 and 6, which must land in the same commit (the e2e copy checks and
the new UI change together).

1. **[API][TEST] Pin the contract before building on it.**
   - `tests/tooling/repo.ts`: add `uiModules()` and `exportSurface()`.
   - `tests/tooling/storage-boundary.test.ts`: replace the AC-56 test with the R29 per-module check (AC-43, but without the "some UI module imports storage" assertion yet). Add AC-44, AC-45 and AC-46 with negative fixtures. Leave the AC-51 and AC-53 tests byte-identical.
   - `tests/tooling/privacy.test.ts`: add the UI-source scan (R31).
   - New `tests/tooling/e2e-isolation.test.ts` (AC-42) and `tests/tooling/render-path.test.ts` (AC-5).
   - `tests/tooling/package-contract.test.ts`: add AC-48.
   - All green against today's code. No `src/` change.
2. **[DATA] N/A.** No schema, record or persisted-state change.
3. **[FE] Copy and pure form logic, test-first.**
   - `src/copy.ts`: add the new constants and formatters. Keep `EMPTY_STATE_*` for now, so the shell still compiles.
   - Add `src/noteForm/formState.ts`, `saveCheck.ts`, `saveProblems.ts`, `keyboard.ts` and `platform.ts`, with unit tests `src/copy.test.ts` and `src/noteForm/*.test.ts`.
   - Add `"../storage"` imports in `saveCheck.ts`/`saveProblems.ts`. The AC-43 per-module check (step 1) already allows them.
4. **[FE] Components and hooks**, test support first.
   - Add `src/test/repositoryDoubles.ts` and `src/test/renderApp.tsx`.
   - Add `useNoteForm.ts`, `useUnsavedTextWarning.ts`, `NoteField.tsx`, `SaveRow.tsx`, `FormMessages.tsx`, `NoteForm.tsx`, `InfoText.tsx`, and the `@custom-variant` line in `src/index.css`.
   - These aren't mounted in `App` yet, so the e2e suite is unaffected.
5. **[FE] Wire the screen and change the shell's component tests.**
   - `App.tsx` renders `NoteForm` and `InfoText`, and takes the optional `repository` prop.
   - Delete `EmptyState.tsx` and remove `EMPTY_STATE_*` from `copy.ts`.
   - Rewrite `src/App.test.tsx` as listed in "Existing tests that change".
   - Add the component suites `src/components/NoteForm.*.test.tsx`.
   - In `storage-boundary.test.ts`, add AC-43's "at least one UI module imports `src/storage/index.ts`" assertion.
6. **[TEST] Change the existing e2e tests deliberately** (same commit as step 5): `e2e/base-path.spec.ts`, `e2e/a11y.spec.ts` and `e2e/layout.spec.ts`, exactly as listed below. `e2e/privacy.spec.ts` is not touched.
7. **[TEST] New e2e coverage:**
   - Helpers `e2e/form.ts` (locators and state setups) and `e2e/storageFaults.ts` (`blockIndexedDb`: an init script that makes `IDBFactory.prototype.open` throw `new DOMException("blocked", "SecurityError")`; `hangIndexedDb`: an init script whose `open` returns a never-firing `EventTarget`).
   - Specs `e2e/create-note.spec.ts` and `e2e/save-note.spec.ts`.
8. **[TEST] Gate and hand-off.**
   - Run `npm run ci` locally with Node 24.18.0 (Vitest, lint, typecheck, build, Playwright).
   - Confirm `git diff main -- e2e/privacy.spec.ts` is empty (AC-38), and that the AC-51/AC-53 test bodies in `storage-boundary.test.ts` are unchanged (AC-46).
   - Record the manual AC-57 in `review.md`. AC-58 and the Q9 cross-reference notes are owner tasks at ship.

## Test strategy
Layers: **unit-FE** = Vitest + RTL in jsdom (`npm test`); **e2e/UI** =
Playwright, Chromium, production build under `/quicknotes/`, `gotoApp`,
the per-test `page` fixture (a fresh context per test) or a context the
test creates and closes (R28); **tooling** = Vitest under `tests/tooling/`
(listed as "contract" where it pins the storage boundary); **manual** =
`review.md` or ship.

Component tests render `<App repository={…} />` through `renderApp` and
use the copy constants from `src/copy.ts`. `copy.test.ts` separately
asserts every constant equals the spec's literal text, so a typo can't hide
behind a shared constant.

| Acceptance criterion | Layer | Test |
|---|---|---|
| AC-1 | unit-FE | `src/App.test.tsx` › "main holds the New note form: h2, Title input, Note textarea, Save note submit, in DOM order (AC-1)". Checks DOM order with `compareDocumentPosition`; exactly 2 `textbox`, 1 `button`, 0 `link`/`searchbox`/`checkbox`; one h1 "QuickNotes" inside `banner`; `tagName`s `INPUT` (type text) and `TEXTAREA`; `type="submit"`. |
| AC-2 | unit-FE | `src/App.test.tsx` › "focus is in Title after the first render, with no interaction (AC-2)" |
| AC-3 | unit-FE | `src/App.test.tsx` › "fields have no maxlength or required; form is noValidate (AC-3)" |
| AC-4 | e2e/UI | `e2e/create-note.spec.ts` › "Title is focused within 1000 ms of navigation start and takes typing without a click (AC-4)". Uses `page.waitForFunction(…, { polling: "raf" })`, which returns `performance.now()` once `document.activeElement` is the input labelled "Title"; then `page.keyboard.type("Hello")`. |
| AC-5 | tooling | `tests/tooling/render-path.test.ts` › "the render path has no React.lazy, lazy( or <Suspense (AC-5)". Scans the `.ts`/`.tsx` files in `importClosure(["src/main.tsx"])` under `src/`. Plus "the render-path pattern catches each fixture". |
| AC-6 | unit-FE + e2e/UI | `src/App.test.tsx` › "main shows the new info text and neither old empty-state text; unchanged after a save (AC-6)". e2e: `e2e/base-path.spec.ts` › "shell loads under /quicknotes/ with every JS/CSS 200 from the sub-path" (changed text, see below). |
| AC-7 | unit-FE | `src/components/NoteForm.save.test.tsx` › "saves typed title and pasted multi-line note with one create({ title, body }) call (AC-7)". In-memory repository with `vi.spyOn(repo, "create")`; asserts `Object.keys(arg)` is exactly `["title","body"]` (sorted) and `list()` holds one matching note. |
| AC-8 | unit-FE | `NoteForm.save.test.tsx` › `it.each` "passes pasted text through unchanged: %s (AC-8)" over the 3 pairs (with `toBe` identity on the strings) |
| AC-9 | unit-FE | `src/components/NoteForm.keyboard.test.tsx` › `it.each` "Ctrl/Cmd+Enter in Title/Note saves once (AC-9)" (4 cases); "Ctrl+Enter while composing does not save (AC-9)" |
| AC-10 | unit-FE (+ e2e companion) | `NoteForm.keyboard.test.tsx` › "plain Enter in Title moves focus to Note and doesn't save or submit (AC-10)". `fireEvent.keyDown` returns `false` (default prevented); a `submit` listener on the form isn't called; `create` isn't called. Also "Enter and Shift+Enter in Note don't save (AC-10)". The companion e2e `e2e/create-note.spec.ts` › "real Enter in Title moves to Note without saving" proves there is no implicit submit in a real browser. |
| AC-11 | unit-FE | `NoteForm.keyboard.test.tsx` › `it.each` "shows the %s hint for navigator.platform %s, with aria-keyshortcuts and description (AC-11)" (`"MacIntel"` → Cmd, `"Win32"` → Ctrl). The platform is stubbed with `Object.defineProperty(navigator, "platform", { configurable: true, value })` and restored after. It asserts `toHaveAccessibleName("Save note")` and `toHaveAccessibleDescription(hint)`. Plus `src/noteForm/platform.test.ts` (iPhone, iPad, `""`, `"Linux x86_64"`). |
| AC-12 | unit-FE | `NoteForm.save.test.tsx` › "a resolved save shows Note saved., clears both fields, focuses Title and resets the button (AC-12)" |
| AC-13 | unit-FE | `NoteForm.save.test.tsx` › "while create is pending: Saving…, aria-disabled not disabled, read-only fields, repeat attempts ignored (AC-13)" (`deferred()` create; second click plus Ctrl+Enter; then resolve) |
| AC-14 | unit-FE | `NoteForm.save.test.tsx` › "Note saved. clears on the next edit (AC-14)" and "Note saved. clears on the next save attempt, which then shows the both-empty alert (AC-14)" |
| AC-15 | unit-FE | `src/components/NoteForm.failures.test.tsx` › `it.each` "never shows Note saved. and keeps the text when create rejects with %s (AC-15)" (5 rejections). A `MutationObserver` on the status region records that its text was never "Note saved.". |
| AC-16 | unit-FE | `src/components/NoteForm.validation.test.tsx` › "Save with both fields empty shows the both-empty alert, focuses Title, stores nothing (AC-16)" and "the same via Ctrl+Enter from Note (AC-16)" |
| AC-17 | unit-FE | `NoteForm.validation.test.tsx` › "a single-space title with an empty note is saved as-is (AC-17)" |
| AC-18 | unit-FE | `NoteForm.validation.test.tsx` › "201-character title: message under Title, aria-invalid, described-by, focus, nothing stored, text kept (AC-18)" |
| AC-19 | unit-FE | `NoteForm.validation.test.tsx` › "100,001-character note: message under Note, aria-invalid, focus in Note (AC-19)". "Under Note" is asserted as the message element following the textarea and inside the Note field's wrapper. |
| AC-20 | unit-FE | `NoteForm.validation.test.tsx` › "both fields too long: both messages, both invalid, focus in Title (AC-20)" |
| AC-21 | unit-FE | `NoteForm.validation.test.tsx` › "200 emoji title saves; 201 emoji title reports 201 characters (AC-21)" |
| AC-22 | unit-FE | `NoteForm.validation.test.tsx` › "typing 250 characters shows no error, aria-invalid or alert before a save (AC-22)" |
| AC-23 | unit-FE | `NoteForm.validation.test.tsx` › "editing an invalid Title removes its message and aria-invalid (AC-23)" and "typing in Note clears the both-empty alert (AC-23)" |
| AC-24 | unit-FE | `NoteForm.failures.test.tsx` › `it.each` "maps a ValidationError rejection with %j to its message (AC-24)" (3 cases). Plus `src/noteForm/saveProblems.test.ts` for mixed and unknown issue lists (D7). |
| AC-25 | unit-FE | `src/components/NoteForm.counter.test.tsx` › "Title counter appears at 180, shows 200 and 205 with the same classes, hides at 179, is described-by and not live (AC-25)". Walks ancestors to check for `aria-live`/`role`. |
| AC-26 | unit-FE | `NoteForm.counter.test.tsx` › "Note counter appears at 90,000 and reads 100,001 of 100,000 (AC-26)" |
| AC-27 | unit-FE | `NoteForm.counter.test.tsx` › "180 emoji count as 180 characters (AC-27)". Also `src/noteForm/saveCheck.test.ts` › the counter fast path at the 179/180 and 89,999/90,000 boundaries, with surrogate pairs. |
| AC-28 | e2e/UI | `e2e/create-note.spec.ts` › "250 inserted characters are kept, the counter reads 250 of 200, no error shows (AC-28)" |
| AC-29 | unit-FE | `NoteForm.failures.test.tsx` › "unavailable: exact copy, text kept and editable, button reset, focus stays on Save note (AC-29)". The test focuses the button before `fireEvent.click`, as a real click does. Also "unavailable via Ctrl+Enter from Note keeps focus in Note (AC-29)". |
| AC-30 | unit-FE | `NoteForm.failures.test.tsx` › "quota exceeded shows the Storage full copy (AC-30)" |
| AC-31 | unit-FE | `NoteForm.failures.test.tsx` › `it.each` "%s shows the generic copy and never the raw message (AC-31)" (`NotFoundError`, `new Error("boom")`, `"boom"`) |
| AC-32 | unit-FE | `NoteForm.failures.test.tsx` › "a retry that succeeds clears the alert and saves (AC-32)" and "a repeated failure empties the alert before showing it again (AC-32)". A `MutationObserver` on the alert region records the text sequence `[msg, "", msg]`. |
| AC-33 | unit-FE | `NoteForm.failures.test.tsx` › "a failed save leaves no web storage, cookies or console output containing the note (AC-33)" (spies on `console.log/info/warn/error/debug`) |
| AC-34 | e2e/UI | `e2e/save-note.spec.ts` › "IndexedDB open throwing SecurityError shows the unavailable copy and keeps the title (AC-34)" (`blockIndexedDb`) |
| AC-35 | unit-FE | `src/components/NoteForm.unload.test.tsx` › "beforeunload is prevented only while a field has text, and not after a save (AC-35)". Dispatches `new Event("beforeunload", { cancelable: true })`. Plus `src/noteForm/useUnsavedTextWarning.test.tsx` (the listener is removed on cleanup). |
| AC-36 | e2e/UI | `e2e/create-note.spec.ts` › "closing with unsaved text raises the beforeunload dialog (AC-36)" and "closing with nothing typed raises no dialog (AC-36)" |
| AC-37 | unit-FE | `NoteForm.save.test.tsx` › "rendering and typing call no repository method; a valid save calls only create, once (AC-37)" (`createSpyRepository()`). No test in the slug calls `list`/`get`/`update`/`delete`/`isPersisted` *through the UI*. AC-7/AC-16/AC-18/AC-19 call `list()` themselves on the in-memory double to inspect it, which the spec's wording allows. |
| AC-38 | e2e/UI | `e2e/privacy.spec.ts` › "no storage or cookies on fresh load", **unchanged**. Step 8 confirms the file has no diff. |
| AC-39 | e2e/UI | `e2e/save-note.spec.ts` › "typing without saving stores nothing and leaves the URL unchanged (AC-39)" |
| AC-40 | e2e/UI | `e2e/save-note.spec.ts` › "a saved note is the only record in quicknotes/notes (AC-40) and survives a reload unchanged (AC-41)". One test, because AC-41 needs AC-40's context; there are two `test.step`s named for each AC. The page reads the store with `indexedDB.open("quicknotes")` + `getAll()` and closes the connection. |
| AC-41 | e2e/UI | As AC-40, step "reload keeps id, title, body, createdAt, updatedAt; form empty, focus in Title (AC-41)" |
| AC-42 | tooling | `tests/tooling/e2e-isolation.test.ts` › "no e2e file or the Playwright config uses launchPersistentContext or storageState (AC-42)" and "the isolation check flags each fixture" |
| AC-43 | contract | `tests/tooling/storage-boundary.test.ts` › "UI modules import storage only through src/storage/index.ts (AC-43)". The direct imports of every `uiModules()` file resolve under `src/notes|storage|test/` only to `src/storage/index.ts`; no `idb`/`fake-indexeddb` (or subpath); at least one UI module imports `src/storage/index.ts`. |
| AC-44 | contract | `storage-boundary.test.ts` › "the UI import rule rejects storage internals and test support, and allows ../storage (AC-44)". Uses fixture text at a virtual `src/components/Fixture.tsx`, run through `parseImports` + `resolveImport`. |
| AC-45 | contract | `storage-boundary.test.ts` › "src/storage/index.ts exports exactly the R30 value and type names (AC-45)" and "the export pin fails for an added factory or test re-export (AC-45)" (`exportSurface` via `ts.createSourceFile`; `export type {…}` and inline `type X` specifiers count as type exports; `export *` fails) |
| AC-46 | contract | `storage-boundary.test.ts` › "UI module source never names IndexedDB or other browser storage (AC-46)" and "the UI source pattern catches each fixture (AC-46)". The AC-51 and AC-53 tests are unchanged and pass. |
| AC-47 | e2e/UI | `e2e/save-note.spec.ts` › "saving a note sends no request (AC-47)". `e2e/privacy.spec.ts` › "all requests are same-origin" (project-foundation AC-31) is unchanged. |
| AC-48 | tooling | `tests/tooling/package-contract.test.ts` › "runtime dependencies are exactly react and react-dom (AC-48)". `tests/tooling/licences.test.ts` is unchanged and passes. |
| AC-49 | unit-FE | `NoteForm.failures.test.tsx` › "no saved or failure state mentions persist or permission (AC-49)" |
| AC-50 | unit-FE | `src/App.test.tsx` › "the form has exactly one empty status region and one empty alert region on first render (AC-50)" |
| AC-51 | e2e/UI | `e2e/a11y.spec.ts` › `for` over 6 states, "<state>: no WCAG 2.1 A/AA axe violations, contrast evaluated (AC-51)" (idle empty; 180-char title; title too long; both empty; saved; storage unavailable). Plus "axe detects a contrast failure" (changed target, see below). |
| AC-52 | e2e/UI | `e2e/layout.spec.ts` › "Tab order is Title, Note, Save note, each with the 2px accent outline (AC-52)" |
| AC-53 | e2e/UI | `e2e/layout.spec.ts` › "no overflow, form centred, controls inside the viewport at WxH (AC-53)" × 4 viewports |
| AC-54 | e2e/UI | `e2e/layout.spec.ts` › "reflows at 320px with 200% root font, in the title-too-long state (AC-54)" |
| AC-55 | e2e/UI | `e2e/layout.spec.ts` › "survives WCAG 1.4.12 text spacing at 360px, in the title-too-long state (AC-55)" |
| AC-56 | e2e/UI + tooling | `e2e/layout.spec.ts` › "no animations or transitions" (unchanged, idle) and "no animations or transitions while saving (AC-56)" (`hangIndexedDb`). Tooling: `tests/tooling/theme.test.ts` unchanged and passing. |
| AC-57 | manual | `review.md`: VoiceOver on macOS Safari and iOS Safari, plus a keyboard-only Chrome pass; each of the 6 listed checks recorded. |
| AC-58 | manual | At ship: the A8 survival check in desktop Chrome and desktop Safari (reload, browser restart, new deploy), recorded per browser and step. |

Supporting unit tests (beyond the AC rows): `src/copy.test.ts` (exact
strings, `counterText(90000, 100000)` → "90,000 of 100,000 characters");
`src/noteForm/formState.test.ts` (every action, immutability: the input
state is deep-frozen and unchanged, plus the `edit` clearing rules);
`saveCheck.test.ts`; `saveProblems.test.ts`; `keyboard.test.ts`;
`platform.test.ts`. The aim is 80%+ line coverage of `src/noteForm/` and
the new components.

### Existing tests that change
Each change is the one the spec's "Changes to earlier specs" table
requires. Nothing is loosened beyond it: every assertion that still applies
is kept as it is.

| Earlier item | File › test | Exact change |
|---|---|---|
| project-foundation AC-19 (R20, copy rows) | `src/App.test.tsx` › "renders banner with the only h1 and the empty state in main" | Lines 10-14 (the banner contains h1 `APP_NAME`; exactly one h1) are kept verbatim. Lines 16-18 (`getByText(EMPTY_STATE_PRIMARY/SECONDARY)` in `main`) are replaced by: `main` contains `INFO_PRIMARY` and `INFO_SECONDARY`, and `queryByText("No notes yet")` / `queryByText("Your notes will show up here.")` are null (literals, because the constants are deleted). The import on line 4 changes to `INFO_PRIMARY, INFO_SECONDARY`. Renamed "renders banner with the only h1 and the info text in main (AC-6)". |
| project-foundation AC-20 | `src/App.test.tsx` › "has no interactive controls" | Replaced by the AC-1 test. `link`, `searchbox` and `checkbox` still assert `toHaveLength(0)`. `textbox` changes from 0 to exactly 2, and `button` from 0 to exactly 1. |
| pages-deploy R16 / AC-16 | `e2e/base-path.spec.ts` › "shell loads under /quicknotes/ with every JS/CSS 200 from the sub-path" | Line 62 only: `getByText("No notes yet", { exact: true })` becomes `getByText("Your notes are saved on this device", { exact: true })`. The h1 check, the JS/CSS presence checks, the 200 statuses and the `/quicknotes/` prefixes are unchanged. |
| project-foundation a11y "axe detects a contrast failure" | `e2e/a11y.spec.ts` › "axe detects a contrast failure" | Line 31: the target changes from `getByText("Your notes will show up here.")` to `getByText("They stay in this browser and are never sent anywhere.")`. The `#d4d4d8` recolour and the `toContain("color-contrast")` assertion are unchanged. |
| project-foundation shell axe test (now AC-51's idle state) | `e2e/a11y.spec.ts` › "shell has no WCAG 2.1 A/AA axe violations" | Becomes the "idle empty" case of AC-51's state loop. Its three assertions (no violations; `color-contrast` not incomplete; ≥3 contrast passes) are kept as they are and applied to every state. It also waits for Title to be focused before running axe. |
| project-foundation AC-27 | `e2e/layout.spec.ts` › "no overflow and centred at WxH" | `TEXTS` (line 4) becomes "QuickNotes", "New note", "Your notes are saved on this device" and "They stay in this browser and are never sent anywhere.". The visible/inside-viewport loop also covers the labels "Title" and "Note", both fields, the "Save note" button and the hint (regex, D6). The centre check's selector changes from `main > div` to `main form`; the 2px tolerance and `clientWidth` are unchanged. New: the button's `boundingBox().height >= 44`. `hasHorizontalOverflow` is unchanged. |
| project-foundation AC-28 | `e2e/layout.spec.ts` › "reflows at 320px with 200% root font" | Before scaling, sets up the title-too-long state (205 characters plus Save). Overflow assertion unchanged. The visible list becomes the shell texts plus labels, fields, button, hint, the title error and the "205 of 200 characters" counter. |
| project-foundation AC-29 | `e2e/layout.spec.ts` › "survives WCAG 1.4.12 text spacing at 360px" | Sets up the title-too-long state first. `TEXT_SPACING_CSS` is unchanged. The clip selector changes from `"h1, main p"` to `"h1, h2, label, main p, button, [role=status], [role=alert]"`. Errors, counters and the hint are `<p>` inside `main`, so they're covered. Fields aren't checked, because they scroll by design. |
| project-foundation AC-26 | `e2e/layout.spec.ts` › "keyboard focus shows 2px accent outline" | The injected "Focus probe" button is removed. Replaced by the AC-52 test, which checks Title (focused on load), Tab to Note, Tab to "Save note", and Shift+Tab back to Title, with the same three outline assertions on each control (`outlineStyle !== "none"`, width ≥ 2, `rgb(29, 78, 216)`). |
| project-foundation AC-30 / spec AC-56 | `e2e/layout.spec.ts` › "no animations or transitions" | Unchanged (the form is rendered by the time the h1 is visible). A new sibling test covers the saving state. |
| note-storage R42 / AC-56 | `tests/tooling/storage-boundary.test.ts` › "the live UI doesn't reach any storage module (AC-56)" | The fixed `UI_FILES` list (lines 18-25) is replaced by `uiModules()` (R29 discovery). The three closure sanity checks (`src/main.tsx`, `src/App.tsx`, `src/index.css` reached from `index.html`) are kept. The closure-wide "nothing under `src/notes/`, `src/storage/` or `src/test/`" assertion is replaced by the per-module direct-import rule (AC-43). The closure-wide `packages(closure, ["idb","fake-indexeddb"])` is empty assertion is **kept**. It still holds, because storage uses raw IndexedDB. The test is renamed with "(create-note AC-43; narrows note-storage AC-56)". |
| note-storage AC-51, AC-53; parser, resolver, self-test | `storage-boundary.test.ts`, the other five tests | Unchanged (AC-46 requires it). New tests are added next to them. |
| — (additive) | `tests/tooling/privacy.test.ts` | A new `describe("UI privacy")` applies the existing `STORAGE_NETWORK_PATTERNS` (network plus other storage) to `uiModules()`. This is the R31 "privacy scan" half, and it also backs R39 statically. Existing tests are unchanged. |
| — (additive) | `tests/tooling/package-contract.test.ts` | Adds the AC-48 test. Existing tests are unchanged. |
| project-foundation AC-33 | `e2e/privacy.spec.ts` › "no storage or cookies on fresh load" | **No change** (AC-38, R28). |
| project-foundation AC-35 | manual (`project-foundation/review.md`) | No test file. Superseded by AC-57's manual pass in this slug's `review.md`. |
| project-foundation Keyboard ("Tab moves no focus") | no dedicated test existed | Covered by AC-52 (new Tab order). |

Not changed: `e2e/document.spec.ts`, `tests/tooling/theme.test.ts`,
`tests/tooling/licences.test.ts`, `tests/tooling/eslint-config.test.ts`,
`src/components/ErrorBoundary.test.tsx`, and all of `src/notes/**` and
`src/storage/**` tests.

## Risks & rollback
| Risk | Detection | Mitigation |
|---|---|---|
| A repeated **both-empty** alert (synchronous path) may not be re-announced by every screen reader. The clear and the re-set are two DOM mutations in the same task (D3a). The storage path has a real `await` between them. | AC-57 manual pass. AC-32 covers the storage path in jsdom. | Accepted for v1. The spec's manual check covers the storage repeat. If VoiceOver drops the repeat, the follow-up is to yield one frame (`requestAnimationFrame`) between clear and set, as a plan change. |
| `navigator.platform` in Playwright follows the host OS, so the hint differs locally (Mac: Cmd) and in CI (Linux: Ctrl). | A flaky e2e text match. | E2e tests match `/^Press (Cmd\|Ctrl)\+Enter to save\.$/` or follow `aria-describedby` (D6). The exact platform mapping is tested in jsdom (AC-11). |
| AC-4's 1,000 ms could flake on a slow CI runner. | CI failure on AC-4 only. | Today's shell loads far inside the budget. Playwright retries once in CI. The form adds no async work before first render. If it flakes repeatedly, investigate; don't raise the limit without a spec change. |
| eslint-plugin-react-hooks 7 (React Compiler rules) may flag reading `stateRef.current` or `flushSync` usage. | `npm run lint`. | Refs are read only in event handlers and effects, never during render. If a rule still objects, restructure; don't disable it. |
| A UI comment that mentions `indexedDB`, `localStorage` etc. fails AC-46. A comment in `e2e/` that mentions `storageState` fails AC-42. | Tooling tests. | Intended. Write comments without those tokens (for example "browser storage"). |
| `hangIndexedDb` relies on `connection.ts` using only `addEventListener` on the open request. | AC-56 saving-state test hangs or errors. | The helper returns an `EventTarget`, which supports that API. If storage internals change, the helper is updated with them (it's test-only). |
| Large values (100,001 characters) slow jsdom tests. | Suite time. | One `fireEvent.change` per paste. The counter's fast path avoids repeated `Array.from` below the threshold. |
| Stored test data leaking into project-foundation AC-33's fresh context. | AC-38 fails. | Every saving test uses the per-test `page` (a fresh context) or its own closed context. AC-42 forbids `storageState`/`launchPersistentContext`. |

**Rollback:** the change is UI-only and additive to storage. Reverting the
merge commit restores the empty-state shell and the old tests together.
Notes saved in users' browsers stay in `quicknotes`/`notes`. Nothing reads
them in the reverted app, and `list-notes` will show them later, so a
rollback loses no data. No migration is involved.

## Explicitly out of scope
- **`@testing-library/user-event`** or any other new package (D2). Real-keyboard behaviour is covered in Playwright instead.
- **A frame delay between clearing and re-setting a synchronous alert** (first risk row). Accepted for v1.
- **`navigator.userAgentData`-based platform detection** (D6). `navigator.platform` is enough for a hint.
- **Debouncing or virtualising the counter.** The fast path is enough at these limits.
- **Pre-check duplicating note-storage validation.** This is deliberate (R8). The repository still validates, and its rejection is mapped (R18, D7).
- **The `repository` prop being test-only in practice.** Production always uses the default (D1).
- **Any change to `src/notes/`, `src/storage/`, the entry point's exports, `@theme` colour tokens, `eslint.config.js`, `playwright.config.ts` or `index.html`.**
- **Automated Firefox/WebKit runs, real-device timing, and a device-restart check** (spec non-goals; Q7, Q8, AC-58).
- **Listing, editing or deleting notes, drafts/autosave, a skip link and cross-tab notices** (spec non-goals).
- **Edits to the approved spec or to other slugs' artifacts.** The Q9 cross-reference notes are the owner's task at ship.

## Approval
<!-- Filled in by a human (Tech Lead) only. -->
- Approved by: AITechie , 2026-10-07
