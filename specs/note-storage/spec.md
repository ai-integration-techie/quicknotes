# Spec: Note storage (note model and local repository)

- Status: Approved
- Slug: note-storage
- Intent: [intent.md](./intent.md)
- Jira: none
- Owner: AITechie
- Reviewers: AITechie (Product Owner, Tech Lead)
- Date: 2026-10-06

<!-- Status values: draft -> approved -> superseded.
     Do not move to "approved" without a human sign-off in the Approval
     section below. A spec with open questions cannot be approved. -->

## Summary
This slug defines what a QuickNotes note is (id, title, body, createdAt,
updatedAt) and a `NoteRepository` interface with create, get, update,
delete, list and isPersisted. The interface has no IndexedDB dependency.
Behind it sit an IndexedDB implementation for the app and an in-memory
implementation for tests only. Storage opens lazily on first use. The
browser is asked for persistent storage at the first save of each
launch, never on page load. Every failure is a typed error, with no
fallback, and nothing goes over the network. This slug is the data layer
only. The live app looks and behaves exactly as it does today, and
`project-foundation` AC-33 ("no IndexedDB on fresh load") stays
unchanged and keeps passing.

## User stories
- US-1: As the developer building `create-note`, `list-notes`, `edit-note`, `delete-note` and `search-notes`, I want one repository API to create, get, update, delete and list notes, so that no UI feature invents its own storage.
- US-2: As the user (AITechie), I want each note saved exactly as I typed it and still there after a reload, a browser or device restart and a new deploy, so that I can trust QuickNotes as my daily note tool.
- US-3: As the user, I want notes that break the field rules to be rejected clearly, with nothing saved, so that I never end up with a half-saved or silently changed note.
- US-4: As the developer, I want every storage failure to come back as a typed error I can tell apart, with no fallback and no false success, so that the UI can always tell the user the truth about a save.
- US-5: As the user, I want the app to ask the browser to protect my notes from eviction the first time I save in each launch (until it's granted), and never on page load, so that my notes are protected without a prompt just for opening the app.
- US-6: As a later UI slug, I want to know whether storage is persistent, so that I can decide whether to show a notice.
- US-7: As the user with QuickNotes open in two tabs, I want the last save to win and a deleted note to stay deleted, so that behaviour across tabs is predictable.
- US-8: As the developer, I want storage behind an interface that doesn't depend on IndexedDB, with an in-memory test double that passes the same tests, so that UI features can be tested without a browser database and sync stays possible later.
- US-9: As the user, I want my notes never to leave the device, so that the charter's privacy promise holds.
- US-10: As the developer of `search-notes`, I want listing 1,000 notes to be fast, so that search can meet the charter's under-100 ms target over 1,000 notes.
- US-11: As the user, I want the live app to look and load exactly as it does today, so that this slug adds no visible change or risk.

## Requirements

### Note model
- R1: A `Note` MUST have exactly these fields, and no others are stored or returned:
  - `id`: string, a version 4 UUID in canonical lowercase form (36 characters, for example `3f2b8c1e-7a4d-4e2b-9c1f-0a1b2c3d4e5f`).
  - `title`: string.
  - `body`: string (plain text).
  - `createdAt`: number, an integer count of milliseconds since the Unix epoch (UTC).
  - `updatedAt`: number, same format as `createdAt`.
- R2: The repository MUST generate `id` itself (from `crypto.randomUUID()`, or an injected generator in tests). A caller can never choose or change a note's `id`. `id` and `createdAt` MUST never change after create.
- R3: Notes returned by the repository MUST be plain data objects. Changing a returned object MUST NOT change what a later `get` or `list` returns.

### Field rules and validation
- R4: **Character counting.** A "character" in this spec is one Unicode code point: the length of a string is `Array.from(s).length` (the same as iterating it with `for...of`). So:
  - `"a"` = 1, `"é"` (precomposed U+00E9) = 1, `"é"` (e + combining acute) = 2.
  - `"😀"` (U+1F600, one code point, two UTF-16 code units) = 1.
  - `"👩‍💻"` (woman, zero-width joiner, laptop) = 3.
  - `"\r\n"` = 2, `"\n"` = 1, a tab = 1.
  - A lone surrogate (for example `"\uD800"`) = 1.
- R5: `title` MUST be at most 200 characters. `body` MUST be at most 100,000 characters. A title of exactly 200 and a body of exactly 100,000 MUST be accepted.
- R6: A string is "empty" only when it has 0 characters. Whitespace is content: a title of `" "` is not empty. `title` and `body` MAY each be empty, but a note with both empty MUST be rejected.
- R7: `title` and `body` MUST both be present and of type `string`. Any other type (including `undefined`, `null`, numbers and `String` objects) MUST be rejected.
- R8: Text MUST be stored and read back exactly as given, so that the value read back is `===` to the value saved. In particular there MUST be no trimming, no Unicode normalisation (NFC/NFD), no line-ending conversion, and no escaping or sanitising. This includes line breaks, leading and trailing whitespace, tabs, emoji, right-to-left and other non-Latin scripts, control characters and lone surrogates.
- R9: Validation MUST run before any storage access. A note that fails validation MUST cause no write, MUST NOT open the database, and MUST NOT trigger the persistence request (R27).
- R10: A `ValidationError` MUST report every rule the input breaks, not just the first, as a list of issues. Each issue has:
  - `field`: `"title"`, `"body"`, `"note"` (for "both empty") or `"id"` (R16).
  - `rule`: `"not-a-string"`, `"too-long"` or `"empty"`.
  - for `too-long`, `limit` (200 or 100000) and `actual` (the counted length).
- R11: Create and update read only `title` and `body` from the input object. Any other property (for example `id`, `createdAt`, `updatedAt`, or an unknown key) MUST be ignored and MUST NOT be stored.

### Repository operations
- R12: `create(input: { title, body })` MUST validate the input, generate the `id`, set `createdAt` and `updatedAt` to the same current time, write the note as an insert that never overwrites an existing record, and resolve with the stored `Note` after the write has committed.
- R13: `get(id)` MUST resolve with the stored note, or reject with `NotFoundError` if no note has that `id`.
- R14: `update(id, input: { title, body })` replaces both editable fields. Both fields are required, and the same field rules apply.
  - It MUST read and write in a single read-write transaction.
  - It MUST reject with `NotFoundError` if no note has that `id`. A missing note MUST NOT be recreated.
  - It MUST keep `id` and `createdAt` unchanged.
  - It MUST set `updatedAt` to `max(now, previous updatedAt + 1)`, so `updatedAt` always moves forward, even if two saves happen in the same millisecond or the clock goes backwards.
  - Every successful update moves `updatedAt` forward, even if the title and body are unchanged. Skipping no-op saves is the caller's choice.
  - It MUST resolve with the stored `Note` after the write has committed.
- R15: `delete(id)` MUST remove the record from storage, with no tombstone, soft-delete flag or trash. It MUST reject with `NotFoundError` if no note has that `id`. After it resolves, `get(id)` rejects with `NotFoundError` and `list()` doesn't include the note.
- R16: `get`, `update` and `delete` MUST reject with `ValidationError` (`field: "id"`, `rule: "not-a-string"`) when `id` isn't a string. Any string that matches no note gives `NotFoundError`.
- R17: `list()` MUST resolve with every stored note, sorted by `updatedAt` descending, with ties broken by `id` ascending (plain string comparison). With no notes, it resolves with an empty array.
- R18: Each write (`create`, `update`, `delete`) MUST resolve only after its IndexedDB transaction has completed (the `complete` event). If the transaction errors or aborts, the promise MUST reject, and none of that operation's changes may be visible to later reads. The repository MUST never resolve a write that didn't commit.
- R19: Write transactions SHOULD request `durability: "strict"` where the browser supports it, so a committed save survives an OS crash or power loss right after it.

### Errors
- R20: Every rejection from the repository MUST be an instance of `NoteStorageError` with a `kind` property that is exactly one of:

  | Class | `kind` | When |
  |---|---|---|
  | `ValidationError` | `"validation"` | R5-R7, R16 |
  | `NotFoundError` | `"not-found"` | R13-R15 |
  | `StorageUnavailableError` | `"unavailable"` | R21 |
  | `QuotaExceededError` | `"quota-exceeded"` | R22 |

  The repository MUST NOT reject with any other type, and MUST NOT swallow a failure.
- R21: `StorageUnavailableError` MUST be used when:
  - the `indexedDB` global is missing, or reading it throws;
  - `indexedDB.open()` throws;
  - the open request fails (for example `SecurityError`, `InvalidStateError`, `VersionError` or `UnknownError`, as in some private-browsing modes);
  - the open request fires `blocked`;
  - a transaction fails or aborts for any reason other than quota.

  The original error MUST be kept on the standard `cause` property.
- R22: `QuotaExceededError` MUST be used when a request or transaction fails or aborts with a `DOMException` whose `name` is `"QuotaExceededError"`. Nothing from that operation is written. The original error MUST be kept on `cause`.
- R23: **No fallback.** When IndexedDB is unavailable or full, the live code MUST NOT store notes anywhere else: no in-memory store, `sessionStorage`, `localStorage`, cookies or Cache Storage. A failed open MUST NOT be cached: the next operation tries to open IndexedDB again.
- R24: Error messages and error properties MUST NOT contain any note's title or body text. Validation issues carry only the field, rule, limit and count (R10). The storage code MUST NOT write note content to the console.

### Lazy open and database layout
- R25: Importing the storage modules, and creating or getting the repository instance, MUST NOT call `indexedDB.open`, `navigator.storage.persisted` or `navigator.storage.persist`. The database MUST be opened at the first `create`, `get`, `update`, `delete` or `list` call that passes validation.
- R26: Operations started while the database is opening MUST share that one open request. A tab MUST open at most one connection at a time.
- R27: The database MUST be named `quicknotes`, at version `1`, with one object store `notes` whose `keyPath` is `id`. The upgrade handler MUST create the store only if it doesn't exist. Any later change to the stored shape MUST raise the version and migrate existing notes so they stay readable. That is a constraint on later slugs.
- R28: On a `versionchange` event (another tab opening a newer version), the connection MUST close, so the other tab isn't blocked. The next operation then reopens. If the database is now at a newer version, that reopen fails with `StorageUnavailableError` (R21) instead of hanging.

### Persistent storage
- R29: The app MUST use one repository instance per page load (a launch). The storage module MUST provide a shared accessor that creates it lazily, without touching IndexedDB or `navigator.storage` (R25).
- R30: At the first `create` or `update` in a launch that passes validation, the repository MUST call `navigator.storage.persisted()`. If that doesn't resolve to `true`, it MUST call `navigator.storage.persist()` once. Each launch makes at most one `persisted()` + `persist()` attempt, whatever the result. A new launch tries again, so once permission is granted, `persisted()` returns `true` and `persist()` is never called again. No flag is stored anywhere (R41). `persisted()` is the only record.
- R31: `persisted()` and `persist()` MUST NOT be called on page load, or by `get`, `list`, `delete` or `isPersisted`, or by a `create` or `update` that fails validation.
- R32: The save MUST NOT wait for the persistence request. A save's result and timing are the same whether `persist()` resolves `true`, `false`, never resolves (for example a pending browser prompt), rejects or throws. If `navigator.storage`, `persisted` or `persist` is missing, the request is skipped and saves work normally. Persistence outcomes never produce a repository error.

### Persistence reporting
- R33: `isPersisted()` MUST resolve `true` exactly when `navigator.storage.persisted()` resolves `true`. It resolves `false` when the API is missing, throws or rejects. It MUST never reject, never call `persist()` and never open the database.

### Two tabs
- R34: When two tabs write the same note, the transaction that commits last MUST win in full. There is no revision check, conflict detection or merge. An `update` on a note that another tab has deleted MUST reject with `NotFoundError` and MUST NOT recreate it.
- R35: The storage layer MUST NOT send cross-tab notifications (no `BroadcastChannel`, `storage` events or `SharedWorker`). Other tabs may show old data until they reload.

### Boundary and test double
- R36: The `Note` type, the `NoteRepository` interface, validation and the error classes MUST live in modules that don't reference IndexedDB: no `indexedDB`, no `IDB*` types and no imports from the IndexedDB implementation or any IndexedDB wrapper library. Only the IndexedDB implementation module(s) may reference IndexedDB.
- R37: There MUST be an in-memory `NoteRepository` implementation for tests. It MUST pass the same contract test suite as the IndexedDB implementation, for every requirement that isn't specific to IndexedDB. No module under `src/` that isn't a test or test support may import it, so it never reaches the live app or `dist/` (R23).
- R38: The IndexedDB implementation MUST allow tests to supply the IndexedDB factory, the `navigator.storage`-like object, the clock and the id generator. By default it uses the browser globals, read lazily (R25).

### Performance
- R39: `list()` MUST read all notes in a single read-only transaction with one bulk read (for example `getAll`). It MUST NOT use one transaction per note. Sorting happens in memory.
- R40: With 1,000 stored notes, `list()` MUST meet the budget in AC-40.

### Privacy and the live app
- R41: The storage code MUST make no network request. It MUST NOT call or reference `fetch`, `XMLHttpRequest`, `navigator.sendBeacon`, `WebSocket`, `EventSource` or a remote `import()`. It MUST NOT use any browser storage other than the IndexedDB database `quicknotes` (no `localStorage`, `sessionStorage`, cookies or Cache Storage). Any runtime dependency it adds MUST make no network requests.
- R42: This slug MUST NOT change the live app's behaviour or appearance:
  - No rendered component, `main.tsx`, `index.html`, `src/copy.ts` or `src/index.css` imports or calls the repository.
  - The shell renders exactly as before.
  - `project-foundation` AC-33, and every other existing test, passes with no change to its expectations.
- R43: New code MUST follow the existing gate: TypeScript `strict`, `.ts` source (`project-foundation` R2), lint with zero warnings, Prettier, and the existing `tests/tooling/privacy.test.ts` source scan over `src/`. Any new npm package, runtime or dev, MUST meet `project-foundation` R5's licence rule. The licence test's exception list MUST NOT grow.

## User experience
**User experience: none in this slug.** It adds no screen, button, message,
notice, loading state or copy. The live app at
`https://ai-integration-techie.github.io/quicknotes/` looks and behaves
exactly as it does today (R42). No UI calls the repository yet, so no user
can trigger a save, a validation error or the persistence request.

The repository's API (R12-R17, R33) and its typed errors (R20-R22) are
the developer-facing surface. The error `kind` values are the contract
that later UI slugs (`create-note`, `edit-note`, `delete-note`,
`list-notes`) map to their own user-facing copy, states and accessibility
behaviour. This spec sets no user-facing copy. In particular:
- Showing validation messages, character counts and limit warnings belongs to `create-note` and `edit-note`. They MUST count characters as in R4. HTML `maxlength` counts UTF-16 code units, so it is not enough on its own.
- What the user sees when storage is unavailable or full belongs to the first UI slug that saves (`create-note`).
- Whether to show a "storage isn't persistent" notice belongs to a later UI slug (owner decision 7).
- In some browsers (for example Firefox), `persist()` may show a browser permission prompt. That first happens when a UI slug first saves a note, not in this slug.

## Acceptance criteria
All criteria run in Vitest (`npm test`). Terms:
- **A fresh IndexedDB:** a new, empty in-process IndexedDB factory (for example from `fake-indexeddb`; the plan picks the library).
- **A stub storage manager:** an object with spied `persisted()` and `persist()` methods.
- **A fixed clock:** an injected clock the test controls.
- **A launch:** one repository instance.
- **A contract test:** a test in the shared suite that runs against both the IndexedDB implementation and the in-memory implementation (R37).

Unless a criterion says otherwise, the repository uses a fresh IndexedDB, a stub storage manager whose `persisted()` resolves `false` and whose `persist()` resolves `false`, and a fixed clock.

### Model and create
- AC-1 (US-1, R1, R2, R12; contract): Given the clock at `1760000000000`, when `create({ title: "Shopping", body: "Milk" })` resolves, then the result has exactly the keys `id`, `title`, `body`, `createdAt` and `updatedAt`. `id` matches `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/`. `title` is `"Shopping"` and `body` is `"Milk"`. `createdAt` and `updatedAt` both equal `1760000000000`.
- AC-2 (US-1, R2): Given the IndexedDB implementation with the default id generator, when 1,000 notes are created, then all 1,000 ids are distinct and match the AC-1 pattern.
- AC-3 (US-1, R11; contract): Given `create({ title: "T", body: "B", id: "x", createdAt: 1, updatedAt: 2, extra: true })`, when it resolves and the note is fetched with `get`, then `id` is not `"x"`, `createdAt` and `updatedAt` equal the clock time, and the stored object has no `extra` key.
- AC-4 (US-1, R12): Given an injected id generator that returns `"00000000-0000-4000-8000-000000000001"` twice, when `create` is called twice, then the first resolves, the second rejects with `StorageUnavailableError`, and `get` on that id returns the first note's title and body unchanged.
- AC-5 (US-1, R3; contract): Given a created note, when the test sets `title` to `"changed"` on the returned object, then `get(id)` and `list()` still return the original title.

### Field rules
- AC-6 (US-3, R4, R5; contract): Given a title of 200 `"a"` characters and a body of 100,000 `"a"` characters, when `create` is called, then it resolves.
- AC-7 (US-3, R5, R9, R10; contract): Given a title of 201 `"a"` characters and the body `"x"`, when `create` is called, then it rejects with `ValidationError`, `kind` `"validation"`, with exactly one issue `{ field: "title", rule: "too-long", limit: 200, actual: 201 }`. `list()` then resolves `[]`.
- AC-8 (US-3, R5, R10; contract): Given the title `"x"` and a body of 100,001 `"a"` characters, when `create` is called, then it rejects with `ValidationError` with the issue `{ field: "body", rule: "too-long", limit: 100000, actual: 100001 }`.
- AC-9 (US-3, R4; contract): Given a title made of 200 `"😀"` (400 UTF-16 code units), when `create` is called, then it resolves. Given 201 `"😀"`, it rejects with `actual: 201`.
- AC-10 (US-3, R4): Given the exported character-count function, when it is called on `"a"`, `"é"` (U+00E9), `"é"`, `"😀"`, `"👩‍💻"`, `"\r\n"`, `"\t"`, `"\uD800"` and `""`, then it returns 1, 1, 2, 1, 3, 2, 1, 1 and 0 respectively.
- AC-11 (US-3, R6, R9; contract): Given `{ title: "", body: "" }`, when `create` is called, then it rejects with `ValidationError` with the issue `{ field: "note", rule: "empty" }`. `list()` then resolves `[]`.
- AC-12 (US-3, R6; contract): Given `{ title: "", body: "b" }`, `{ title: "t", body: "" }` and `{ title: " ", body: "" }`, when `create` is called for each, then all three resolve, and the third note's title reads back as `" "`.
- AC-13 (US-3, R7, R10; contract): Given each of `{ title: undefined, body: "b" }`, `{ title: null, body: "b" }`, `{ title: 5, body: "b" }`, `{ title: new String("t"), body: "b" }` and `{ title: "t" }` (body missing), when `create` is called, then each rejects with `ValidationError` that has an issue with `rule: "not-a-string"` for the bad field.
- AC-14 (US-3, R10; contract): Given `{ title: 5, body: <100,001 "a"> }`, when `create` is called, then it rejects with a `ValidationError` that has two issues, one for `title` (`not-a-string`) and one for `body` (`too-long`).
- AC-15 (US-2, R8; contract): Given these title/body pairs, when each is created, then `get(id)` returns a title and body `===` to the input, and so does a new repository instance over the same IndexedDB:
  - `"  lead and trail  "` / `"line1\nline2\r\nline3\n\n"`
  - `"\ttab"` / `"é vs é"` (no normalisation)
  - `"👩‍💻 🇮🇳"` / `"日本語 العربية עברית हिन्दी"`
  - `"<b>not html</b>"` / `"\u0000\u0007\uD800"`
- AC-16 (US-3, R9): Given a spied IndexedDB factory and a stub storage manager, when `create({ title: "", body: "" })` and `create({ title: <201 chars>, body: "x" })` reject, then `open` has not been called, and neither `persisted` nor `persist` has been called.

### Get, update, delete, list
- AC-17 (US-1, R13; contract): Given a created note, when `get(id)` is called, then it resolves with an object deep-equal to the one `create` returned.
- AC-18 (US-1, R13, R16; contract): Given no notes, when `get("3f2b8c1e-7a4d-4e2b-9c1f-0a1b2c3d4e5f")` and `get("")` are called, then both reject with `NotFoundError`, `kind` `"not-found"`. When `get(42)` is called, it rejects with `ValidationError` with the issue `{ field: "id", rule: "not-a-string" }`.
- AC-19 (US-1, R14; contract): Given a note created at clock `1000`, and the clock moved to `5000`, when `update(id, { title: "New", body: "Body" })` resolves, then the result has the same `id`, `createdAt` `1000`, `updatedAt` `5000`, title `"New"` and body `"Body"`. `get(id)` returns the same values.
- AC-20 (US-1, R14; contract): Given a note created at clock `1000` with the clock left at `1000`, when it is updated twice with the same title and body, then `updatedAt` is `1001`, then `1002`. Given the clock then set back to `500`, a third update gives `updatedAt` `1003`.
- AC-21 (US-3, R14, R9; contract): Given a note `{ title: "A", body: "B" }`, when `update(id, { title: "", body: "" })` and `update(id, { title: "A" })` are called, then both reject with `ValidationError`, and `get(id)` still returns title `"A"`, body `"B"` and the original `updatedAt`.
- AC-22 (US-1, R14; contract): Given no note with id `X`, when `update(X, { title: "t", body: "b" })` is called, then it rejects with `NotFoundError`, and `list()` resolves `[]`.
- AC-23 (US-1, R11, R14; contract): Given a created note, when `update(id, { title: "t", body: "b", id: "other", createdAt: 1 })` resolves, then `id` and `createdAt` are unchanged, and no note with id `"other"` exists.
- AC-24 (US-1, R15; contract): Given notes A and B, when `delete(A.id)` resolves, then `get(A.id)` rejects with `NotFoundError` and `list()` returns only B. A second `delete(A.id)` rejects with `NotFoundError`.
- AC-25 (US-1, R15): Given a note deleted through the IndexedDB implementation, when the test reads the `notes` object store directly (`count()` and `get(id)`), then the count is 0 and `get` returns `undefined`. No record anywhere has a deleted, trash or tombstone flag.
- AC-26 (US-1, R17; contract): Given notes created at clocks `1000` (A), `3000` (B) and `2000` (C), and then A updated at clock `4000`, when `list()` is called, then the ids are in the order A, B, C.
- AC-27 (US-1, R17; contract): Given two notes with the same `updatedAt` and the ids `"0000...0002"` and `"0000...0001"` (from an injected generator), when `list()` is called, then `"0000...0001"` comes first.
- AC-28 (US-1, R17; contract): Given no notes, when `list()` is called, then it resolves with `[]`.

### Commit, errors and no fallback
- AC-29 (US-4, R18): Given an IndexedDB factory wrapped so that the write transaction aborts after its `put`/`add` request succeeds, when `create` is called, then it rejects with `StorageUnavailableError`, and `list()` on a repository over an unwrapped factory resolves `[]`. The same holds for `update` (the note keeps its old values) and `delete` (the note is still there).
- AC-30 (US-4, R20, R21): Given each of these, when `list()` and `create({ title: "t", body: "b" })` are called, then each rejects with `StorageUnavailableError` (`kind` `"unavailable"`, `instanceof NoteStorageError`), with the original error as `cause` where one exists:
  - (a) no `indexedDB` global;
  - (b) reading the `indexedDB` global throws a `SecurityError`;
  - (c) `open()` throws an `InvalidStateError` synchronously;
  - (d) the open request fires `error` with a `SecurityError`;
  - (e) the open request fires `blocked` and never succeeds.
- AC-31 (US-4, R22): Given a factory wrapped so that the `create` write transaction aborts with a `DOMException` named `"QuotaExceededError"`, when `create` is called, then it rejects with `QuotaExceededError` (`kind` `"quota-exceeded"`, with `cause.name` `"QuotaExceededError"`), and `list()` resolves without the note. The same holds when the error is raised on the `put` request of an `update`, and the note keeps its old values.
- AC-32 (US-4, R23): Given a factory whose first `open()` fails and whose second `open()` succeeds, when `list()` is called twice, then the first rejects with `StorageUnavailableError` and the second resolves `[]`, and `open` was called twice.
- AC-33-NS (US-4, R23, R41): Given `localStorage`, `sessionStorage`, `document.cookie` and `caches` (where present) spied or inspected, when IndexedDB is unavailable (AC-30 (a)) and `create` rejects, and when a full create, get, update, list and delete cycle runs on a working factory, then nothing is written to any of them. (This criterion is named AC-33-NS to avoid confusion with `project-foundation` AC-33.)
- AC-34 (US-4, US-9, R24): Given a title `"SECRET-TITLE"` padded to 201 characters, and a body `"SECRET-BODY"` padded to 100,001 characters, when `create` rejects, and when a quota failure (AC-31) is triggered for a note with that title and body, then neither `error.message`, `JSON.stringify` of the error's own properties nor `String(error)` contains `"SECRET"`. A `console` spy records no call containing `"SECRET"` during the whole test.

### Lazy open and database layout
- AC-35 (US-11, R25, R29): Given a spied IndexedDB factory and a stub storage manager, when the storage modules are imported and the shared repository accessor is called twice, then the same instance is returned, and `open`, `persisted` and `persist` have not been called. After `list()`, `open` has been called exactly once.
- AC-36 (US-1, R26): Given a spied factory, when `create`, `list` and `get` are started at the same time on a new repository, then all settle, and `open` was called exactly once.
- AC-37 (US-2, R27): Given a note created through the IndexedDB implementation, when the test opens the database directly, then its name is `quicknotes`, its version is `1`, `objectStoreNames` is exactly `["notes"]`, and the store's `keyPath` is `"id"`. Opening the repository a second time over the same factory doesn't throw and keeps the note.
- AC-38 (US-2, R8, R27): Given notes created by one repository instance, and that instance's connection closed, when a new instance over the same IndexedDB factory calls `list()` (simulating a reload, a browser restart or a new deploy), then it returns every note with identical fields.
- AC-39 (US-7, R28): Given a repository with an open connection, when a second connection opens `quicknotes` at version `2` on the same factory, then that open succeeds without `blocked`, and the repository's next `list()` rejects with `StorageUnavailableError` (it can't open a newer version) instead of hanging.

### Performance
- AC-40 (US-10, R39, R40): Given the IndexedDB implementation over a fresh IndexedDB seeded with 1,000 notes (each with a 60-character title and a 2,000-character body), when `list()` is run once to warm up and then 5 more times, then:
  - Each call returns 1,000 notes in the R17 order.
  - Each call opens exactly one transaction, in `readonly` mode (measured by spying on `IDBDatabase.prototype.transaction`).
  - The median duration of the 5 timed calls is under 250 ms.

### Persistent storage and reporting
- AC-41 (US-5, R30): Given a launch where `persisted()` resolves `false`, when `create` resolves twice and `update` resolves once, then `persisted` was called exactly once and `persist` exactly once, both during the first `create`.
- AC-42 (US-5, R30): Given a launch where `persisted()` resolves `true`, when `create` is called, then `persisted` was called once and `persist` was never called.
- AC-43 (US-5, R30): Given launch 1, where `persist()` resolved `false`, and then a new launch (new instance) over the same IndexedDB, when that launch's first `create` or `update` resolves, then `persisted` and `persist` are each called once more in that launch.
- AC-44 (US-5, R31): Given a new launch, when `list`, `get` (on an existing id), `delete` and `isPersisted` are called, and `create` is called with an invalid note, then `persist` has not been called and `persisted` has been called only by `isPersisted`. After a valid `create`, `persist` has been called once.
- AC-45 (US-5, R32): Given a `persist()` that never resolves, when `create` is called, then `create` resolves with the note (the test fails on its default timeout otherwise). Given a `persist()` that rejects, and a `persist()` that throws synchronously, `create` resolves and no unhandled rejection is reported.
- AC-46 (US-5, R32): Given no `navigator.storage` at all, and given a storage manager without `persist`, when `create` is called, then it resolves.
- AC-47 (US-6, R33): Given stub storage managers whose `persisted()` resolves `true`, resolves `false`, rejects or throws, and given no storage manager, when `isPersisted()` is called, then it resolves `true`, `false`, `false`, `false` and `false` respectively. It never rejects, `persist` is never called, and the spied factory's `open` is never called.

### Two tabs
- AC-48 (US-7, R34): Given two repository instances, tab A and tab B, over the same IndexedDB factory, and a note both have read, when A runs `update(id, { title: "A", body: "a" })` and then B runs `update(id, { title: "B", body: "b" })`, then both resolve, and `get(id)` from either tab returns title `"B"` and body `"b"`.
- AC-49 (US-7, R34): Given tabs A and B over the same factory, when A deletes a note and then B calls `update` on it, then B's update rejects with `NotFoundError`, and `list()` in both tabs doesn't include the note.
- AC-50 (US-7, R35): Given the storage source files, when they are searched, then they contain no `BroadcastChannel`, `addEventListener("storage"` or `SharedWorker`.

### Boundary and test double
- AC-51 (US-8, R36): Given the modules that define `Note`, `NoteRepository`, validation and the errors, when their source is searched, then none matches `/indexedDB|IDB[A-Z]|fake-indexeddb/` or imports the IndexedDB implementation module or an IndexedDB wrapper library.
- AC-52 (US-8, R37): Given the contract suite, when `npm test` runs, then every criterion marked "contract" above runs once against the IndexedDB implementation and once against the in-memory implementation, and passes for both.
- AC-53 (US-8, R37, R23): Given every non-test module under `src/` (excluding `*.test.ts(x)` and the test-support folder the plan names), when imports are resolved, then none imports the in-memory implementation.

### Privacy and live app
- AC-54 (US-9, R41): Given `fetch`, `XMLHttpRequest`, `navigator.sendBeacon`, `WebSocket` and `EventSource` replaced with spies that fail the test when called, when a full create, get, update, list, isPersisted and delete cycle runs on the IndexedDB implementation, then none of the spies is called.
- AC-55 (US-9, R41): Given the storage source files, when they are searched, then none contains `fetch(`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`, `localStorage`, `sessionStorage`, `document.cookie`, `caches.` or an `import(` with a URL.
- AC-56 (US-11, R42): Given `src/App.tsx`, `src/main.tsx`, `src/components/**`, `src/copy.ts`, `src/index.css` and `index.html`, when their imports are resolved, then none imports any storage module. The existing `project-foundation` and `pages-deploy` unit and tooling tests pass with no change to their expectations. `project-foundation` AC-33's e2e test (run by `npm run test:a11y` in `npm run ci`) is unchanged and passes.
- AC-57 (US-11, R43): Given the clean repo, when `npm run ci` runs, then it exits 0, including `tests/tooling/privacy.test.ts` over the new `src/` files and `tests/tooling/licences.test.ts` with its exception list unchanged.

## Constraints
- **Charter:** IndexedDB in the browser, no server, no sync, no remote storage. Everything except the UI sits behind interfaces that don't depend on IndexedDB. Notes never leave the device. $0. No export or backup in v1.
- **Owner decisions (intent, 2026-10-07):** 1 (data-loss risk accepted for v1), 2 (persistence requested at the first save of each launch until granted, never on load), 3 (field rules), 4 (real delete), 5 (typed errors, no fallback), 6 (last save wins), 7 (persistence exposed, not shown), 8 (lazy open, AC-33 unchanged), 9 (technical choices to spec and plan).
- **Settled here (from decision 9):**
  - The id is a UUID v4 from `crypto.randomUUID()`. It needs a secure context, which GitHub Pages (HTTPS) and `localhost` provide.
  - Times are integer milliseconds since the epoch.
  - The database is `quicknotes` v1 with store `notes`, keyed by `id`.
  - `list` returns notes already sorted.
  - Characters are counted as code points.
- **Left to the plan:** raw IndexedDB or a wrapper such as `idb`; the test library (for example `fake-indexeddb`); file and folder layout; exact TypeScript signatures beyond the names in this spec; how tests supply dependencies (R38). Any new package must pass `project-foundation` R5 (OSI licence) and make no network calls.
- **Tests:** every acceptance criterion runs in Vitest under `npm test`. jsdom has no IndexedDB, so the IndexedDB tests use an in-process implementation. No new Playwright test may create an IndexedDB database in the context that `project-foundation` AC-33 checks.
- **Browsers:** inherited from `project-foundation` (last 2 versions of Chrome, Edge, Firefox, Safari and iOS Safari). `crypto.randomUUID`, `navigator.storage.persist/persisted` and IndexedDB `getAll` work in all of them. The `durability` option (R19) is a SHOULD because not every engine honours it.
- **Immutability:** returned notes are new objects (R3). The repository never hands out references to its internal state.

## Non-goals
- Any UI: no create, list, open, edit, delete or search screens, and no on-screen storage, persistence, eviction or error messages. These belong to `create-note`, `list-notes`, `edit-note`, `delete-note`, `search-notes` and later UI slugs.
- Search, filtering, a full-text index or query APIs (`search-notes`). `list()` is the only read-all operation.
- Pagination or partial loading for `list`.
- Undo for delete, a trash, soft delete or tombstones (decided in `delete-note`).
- Any fallback storage for the live app (in-memory, `sessionStorage`, `localStorage`), and an in-memory implementation reachable from production code.
- Cross-tab sync, change notifications, conflict detection or merging.
- Theme preference storage (`theme-mode`). Service worker, manifest or offline caching (`pwa-offline`).
- Export, import, backup or restore (charter, decision 1).
- Sync, accounts or any server, backend or third-party network call.
- Fields beyond `id`, `title`, `body`, `createdAt` and `updatedAt` (no tags, folders, pinning, archive, rich text or attachments). No per-record schema version field: the database version (R27) handles migrations.
- Data migrations: there is nothing to migrate from in v1.
- Encrypting notes at rest.
- Real-browser (Playwright) storage tests in this slug.

## Open questions / risks
The approver must accept or change each item before this spec can be
approved.

1. **Character counting (decision, needs acceptance).** R4 counts Unicode code points. It is simple and deterministic, doesn't depend on the browser's ICU version, and counts a single emoji such as 😀 as 1. The trade-off is that joined emoji (👩‍💻 = 3, flags = 2) and decomposed accents count as more than one. The alternatives are UTF-16 code units (`s.length`, which counts 😀 as 2 and matches HTML `maxlength`) or grapheme clusters (`Intl.Segmenter`, which matches what the user sees but can differ between browser versions and is slower over 100,000 characters). Accept code points, or choose another.
2. **"Empty" means zero characters (confirm).** Following "stored exactly as typed, no trimming" (decision 3), R6 treats a whitespace-only title such as `" "` as not empty. So a note with title `" "` and an empty body is valid. Accept, or say whitespace-only counts as empty for the "not both empty" rule only (the text would still be stored untrimmed).
3. **Persistence on first save only, not first read (confirm the intent's reading).** R30 and R31 request persistence only at the first `create` or `update` that passes validation in a launch. Reads and deletes never trigger it. This follows the stricter reading the intent records for decisions 2 and 8. Confirm, or say that the first read should trigger it too.
4. **Missing notes reject (decision, needs acceptance).** `get`, `update` and `delete` on a missing id reject with `NotFoundError` (R13-R15). The alternative is for `get` to resolve `undefined` and for `delete` to succeed silently (idempotent). That might suit `delete-note`'s undo or a double delete across two tabs. Accept, or choose the alternatives.
5. **`update` replaces both fields and always moves `updatedAt` forward (decision, needs acceptance).** R14 requires both `title` and `body` on every update, so "last save wins" (decision 6) is exact, with no field-level merge. It moves `updatedAt` forward even when nothing changed, which reorders the list. `edit-note` should skip saves that change nothing. Accept, or allow partial updates.
6. **Shared github.io origin (risk).** IndexedDB, persistent-storage grants, quota and "Clear site data" apply to the whole origin `https://ai-integration-techie.github.io`, not to the `/quicknotes/` path. Any other GitHub Pages site under that account can read, change or delete the `quicknotes` database, and shares the quota and eviction fate. Accept for v1 (only AITechie publishes under that account), or plan a custom domain later. A custom domain is excluded by `pages-deploy`, and moving to one later would strand existing notes on the old origin, because there is no export.
7. **Performance budget (decision, needs acceptance).** AC-40's 250 ms median uses an in-process IndexedDB under Vitest, which is not a real browser. It guards against design mistakes (one transaction per note, N+1 reads), not real-device speed. The real under-100 ms check over 1,000 notes stays with `search-notes`. Accept the number, or set another.
8. **Real-browser persistence isn't proven in this slug (risk).** Surviving a browser restart, a device restart and a new deploy (US-2) is proven only by simulation (AC-38: a new instance over the same database). Actual browser behaviour, including `persist()` prompts and eviction, is first exercised when `create-note` ships. Accept, or add a manual check at review (in a separate browser profile, so AC-33's fresh-context check isn't affected).
9. **`isPersisted()` is a boolean (minor).** It returns `false` both when the browser denied persistence and when the API is missing. If a later UI needs to tell these apart, it would need a three-state result. Accept the boolean (as decision 7 describes), or ask for `"persisted" | "not-persisted" | "unsupported"`.
10. **Names are a contract (minor).** Later slugs will depend on the class names and `kind` strings in R20, the method names in R12-R17 and R33, and the database, store and key names in R27. The database names can't change later without a migration. Confirm them now.
11. **Write durability (minor).** R19 asks for `durability: "strict"`, which can make each save a few milliseconds slower in Chromium. It is a SHOULD because not every engine honours it. Accept.

## Approval
<!-- Who approved this spec, and when. A spec is not approved until a
     human signs off here — this is the primary judgment gate in the
     framework; do not skip it. -->
- Approved by: AITechie, 2026-10-06
