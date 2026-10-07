# Plan: Note storage (note model and local repository)

- Status: Approved
- Slug: note-storage
- Spec: [spec.md](./spec.md) (Status: Approved, AITechie, 2026-10-06)
- Date: 2026-10-06
- Owner: AITechie

## Assumptions to confirm at the plan gate
The spec was approved without written answers to its 11 open questions.
This plan treats each proposal in the spec as the accepted default. The
Tech Lead (AITechie) confirms or overrides each row by approving this
plan. If any row changes, the plan goes back to draft (and, where the row
changes a requirement, the spec needs a revision first).

| # | Spec open question | Default this plan builds on | Effect on this plan |
|---|---|---|---|
| A1 | 1. Character counting | Accepted: Unicode code points, `Array.from(s).length` (R4). | `countCharacters` in `src/notes/validation.ts` is exported for later UI slugs. AC-9 and AC-10 test it. |
| A2 | 2. "Empty" means zero characters | Accepted: whitespace-only is content, so `{ title: " ", body: "" }` is valid (R6). | No trimming anywhere. AC-12 checks the `" "` title round-trips. |
| A3 | 3. Persistence on first save only | Accepted: only the first `create`/`update` that passes validation in a launch triggers `persisted()` (+ `persist()` if needed). Reads, deletes and `isPersisted` never do (R30, R31). | One `attempted` flag per repository instance, set at that point. AC-41 to AC-44. |
| A4 | 4. Missing notes reject | Accepted: `get`, `update` and `delete` reject with `NotFoundError` on an unknown id (R13-R15). | `delete` checks for the record inside its read-write transaction. AC-18, AC-22, AC-24. |
| A5 | 5. `update` replaces both fields and always bumps `updatedAt` | Accepted: both fields required; `updatedAt = max(now, prev + 1)` on every successful update (R14). | Shared `nextUpdatedAt` helper used by both implementations. AC-19 to AC-21. |
| A6 | 6. Shared github.io origin | Accepted risk for v1. No custom domain. | Recorded under Risks. No code. |
| A7 | 7. Performance budget | Accepted: 250 ms median for `list()` over 1,000 notes in Vitest with fake-indexeddb (AC-40). | My scratch run of `getAll` + sort over 1,000 such notes took about 3-5 ms per call in Node, so the budget has a large margin and only catches design mistakes. |
| A8 | 8. Restart survival simulated only | Accepted: AC-38 simulates reload/restart/deploy with a new instance over the same factory. No manual browser check in this slug. | No Playwright test. Real-browser behaviour first runs in `create-note`. |
| A9 | 9. `isPersisted()` is a boolean | Accepted: `Promise<boolean>` (R33). | No three-state type. |
| A10 | 10. Names are a contract | Accepted as written: `NoteRepository`, `create/get/update/delete/list/isPersisted`, `NoteStorageError` + `ValidationError`/`NotFoundError`/`StorageUnavailableError`/`QuotaExceededError`, `kind` values `validation`/`not-found`/`unavailable`/`quota-exceeded`, database `quicknotes` v1, store `notes`, keyPath `id`. | These names appear verbatim in the API contract below. |
| A11 | 11. Strict durability is a SHOULD | Accepted: every write transaction passes `{ durability: "strict" }`. Engines that ignore it are fine. | A unit test asserts the option is passed (fake-indexeddb accepts and validates it). |

Plan-level decisions the Tech Lead also confirms here:

| # | Decision | Why |
|---|---|---|
| D1 | **Raw IndexedDB API, not `idb`.** | See "Technical decisions" below. |
| D2 | **`fake-indexeddb@^6.2.5` as the only new package, dev-only.** A fresh `new IDBFactory()` per test, injected. Never the `fake-indexeddb/auto` global polyfill. | See "Technical decisions". |
| D3 | **`navigator.storage` is injected, not patched,** in all but one test file. | R38 already asks for an injectable storage manager. Only AC-35 (the shared accessor with defaults) installs a stub on `navigator`. |
| D4 | **Test-support folder is `src/test/`** (it already holds `setup.ts`). It holds the in-memory implementation, the contract suite and the fakes. | AC-53 asks the plan to name it. Reusing the existing folder adds no new convention. |
| D5 | **Network and boundary rules are enforced by extending the existing tooling tests,** plus one runtime test. `tests/tooling/privacy.test.ts` gains the storage source scans (AC-50, AC-55). A new `tests/tooling/storage-boundary.test.ts` resolves imports (AC-51, AC-53, AC-56) using a resolver added to `tests/tooling/repo.ts`. No ESLint rule change. | Same mechanism and style as the current privacy scan. One enforcement point per rule. |

## Approach
This slug adds a data layer and nothing else. Nothing under `src/App.tsx`,
`src/main.tsx`, `src/components/`, `src/copy.ts`, `src/index.css` or
`index.html` changes, and nothing they reach imports the new code. Vite
only bundles what `main.tsx` reaches, so `dist/` stays the same and
`project-foundation` AC-33 ("no IndexedDB on fresh load",
`e2e/privacy.spec.ts`) can't change.

The code is split into two folders with a hard boundary:

1. **`src/notes/`, the domain (IndexedDB-free, R36).** The `Note` type,
   the `NoteRepository` interface, the error classes, validation
   (including `countCharacters`), list ordering, the `updatedAt` rule and
   the persistence-request policy. Both implementations use these. None
   of these files may mention `indexedDB`, `IDB*` or `fake-indexeddb`
   (AC-51).
2. **`src/storage/`, the IndexedDB implementation.** The schema and
   upgrade, a lazily opened shared connection, transaction-to-promise
   helpers with the error mapping (R18, R21, R22), the repository itself,
   and `src/storage/index.ts`, the shared accessor `getNoteRepository()`
   that later UI slugs import.

Every dependency the IndexedDB repository needs (factory, storage manager,
clock, id generator) is injected through an options object whose
defaults read the browser globals lazily, at call time, never at import
or construction time (R25, R38). Tests pass a fresh fake-indexeddb
`IDBFactory`, a stub storage manager, a fixed clock and, where needed, a
sequential id generator.

The **in-memory implementation** (`src/test/inMemoryNoteRepository.ts`)
uses the same domain modules over a `Map`. A **shared contract suite**
(`src/test/noteRepositoryContract.ts`) holds every criterion the spec
marks "contract". One test file runs it once against each implementation
(AC-52).

I checked the risky behaviours in a scratch install of fake-indexeddb
6.2.5 under the repo's Vitest 5.0.3 jsdom environment (outside the repo):
- `durability: "strict"` is accepted (and invalid values are rejected).
- Lone surrogates and `"é"` vs `"é"` round-trip unchanged.
- `abort()` after a successful `add` leaves nothing written.
- An open connection gets `versionchange` when another opens v2. If it
  closes, the v2 open succeeds without `blocked`, and a later v1 open
  fails with `VersionError`. That is AC-39's path.
- `crypto.randomUUID` and `structuredClone` exist in the jsdom
  environment. `indexedDB` and `navigator.storage` are **absent** there,
  so the default getters in tests already model "no IndexedDB".
- `vi.spyOn(IDBDatabase.prototype, "transaction")` (the `IDBDatabase`
  exported by `fake-indexeddb`) records calls. But **the upgrade itself
  calls `transaction(..., "versionchange")`**, so AC-40 counts calls per
  `list()` only after the warm-up call has opened the connection.

### Technical decisions

**D1: raw IndexedDB vs `idb`.** `idb@8.0.4` (ISC, no dependencies,
checked with `npm view`) would be licence-compliant. I'm still choosing
the raw API:
- The surface is small: one `open`, plus `add`, `put`, `get`, `count`,
  `delete` and `getAll` on one store. The promise helpers are about 60
  lines.
- The hard parts of this spec are things `idb` doesn't do for us:
  reject on `blocked` and close a connection that succeeds late; close on
  `versionchange` and drop the cached connection; never cache a failed
  open; and classify `tx.error` into quota vs unavailable. With `idb` we
  would write all of that anyway, through its `blocked`/`blocking`/
  `terminated` callbacks and `tx.done`.
- It adds no runtime dependency. R41's "any runtime dependency makes no
  network request" holds trivially, and the bundle a later slug ships
  doesn't grow.
- The test seams stay simple. The fault-injection wrappers (AC-29, AC-31)
  and the `IDBDatabase.prototype.transaction` spy (AC-40) work on plain
  IndexedDB objects, not `idb`'s Proxy wrappers.
- Trade-off accepted: we own about 60 lines of promise plumbing. The
  contract suite plus the failure tests cover it.

**D2: `fake-indexeddb`.** Version `6.2.5` (latest on npm), licence
`Apache-2.0` (on the R5 OSI allowlist), no dependencies, `engines.node
>=18`, ESM with bundled types. Adding it adds exactly one entry to
`package-lock.json`, so `tests/tooling/licences.test.ts` passes with
`R5_EXCEPTIONS` unchanged. It is the de facto in-process IndexedDB for
Node, and it implements versioning, `blocked`/`versionchange`,
`getAll`, abort rollback and `durability`. Alternatives rejected:
- Running IndexedDB tests in Playwright: the spec excludes real-browser
  storage tests, and they risk AC-33's fresh context.
- Vitest browser mode: a new provider and dependency, and slower.
- A hand-written IndexedDB mock: it would test our assumptions, not the
  IndexedDB semantics.

It is imported only from `src/test/**` and `*.test.ts` files. A tooling
test (AC-53) fails if any production module reaches it.

**D3: faking `navigator.storage`.** `src/test/fakes.ts` exports
`createStubStorage({ persisted, persist })`. It returns an object whose
`persisted` and `persist` are `vi.fn`s, with presets for "resolves
true/false", "never resolves", "rejects", "throws synchronously" and
"method missing". Tests pass it through the `storage` option. AC-35 is
the one test that uses defaults: it installs the stub with
`Object.defineProperty(navigator, "storage", { configurable: true, value })`,
because jsdom's `navigator` has no `storage`. It stubs `indexedDB` with
`vi.stubGlobal`, and its `afterEach` deletes the property and calls
`vi.unstubAllGlobals()`. `restoreMocks: true` in `vite.config.ts`
already restores `vi.spyOn` spies.

**D5: how the rules are enforced.**
- **No network (R41).**
  - Static (AC-55): `privacy.test.ts` scans every non-test file under
    `src/notes/` and `src/storage/` for `fetch(`, `XMLHttpRequest`,
    `sendBeacon`, `WebSocket`, `EventSource`, `localStorage`,
    `sessionStorage`, `document.cookie`, `caches.` and
    `import(` followed by a quoted `http`/`//` URL.
  - Cross-tab (AC-50): the same scan checks for `BroadcastChannel`,
    `addEventListener("storage"` and `SharedWorker`.
  - Runtime (AC-54): `src/storage/network.test.ts` replaces `fetch`,
    `XMLHttpRequest`, `WebSocket` and `EventSource` (via
    `vi.stubGlobal`) and `navigator.sendBeacon` (via `defineProperty`)
    with functions that throw. It then runs a full cycle.
  - The existing `SOURCE_MARKERS`/`EXTERNAL_ASSET` scan already covers
    the new `src/` files without change.
- **The UI doesn't import storage (R42, AC-56).** `tests/tooling/repo.ts`
  gets `importsOf(file)` and `importClosure(entries)`.
  - `.ts`/`.tsx` imports (static, `export from`, dynamic) are parsed with
    `ts.preProcessFile`. `typescript` is already a dev dependency, used
    by `typecheck.test.ts`.
  - `.css` uses an `@import` regex, and `index.html` a `src=` regex.
  - Relative specifiers resolve to `.ts`, `.tsx`, `/index.ts` or
    `/index.tsx`. Bare specifiers stay package names.
  - `storage-boundary.test.ts` takes the closure from `index.html` plus
    every listed UI file. It asserts that the closure contains nothing
    under `src/notes/`, `src/storage/` or `src/test/`, and no `idb` or
    `fake-indexeddb`.
  - Self-tests with fixture strings prove that the resolver catches an
    import, in the style of the existing "external-asset check catches a
    CDN script" test.

## Architecture

### API contract
There is no network API (charter: no backend). The contract is the
TypeScript module surface that later UI slugs build against. Changing it
during implementation means updating this plan first.

**`src/notes/note.ts`** (types only):
```ts
export interface Note {
  readonly id: string;        // UUID v4, lowercase canonical
  readonly title: string;     // ≤ 200 code points
  readonly body: string;      // ≤ 100,000 code points
  readonly createdAt: number; // integer ms since epoch (UTC)
  readonly updatedAt: number; // integer ms since epoch (UTC)
}
export interface NoteInput { readonly title: string; readonly body: string }

export interface NoteRepository {
  create(input: NoteInput): Promise<Note>;
  get(id: string): Promise<Note>;
  update(id: string, input: NoteInput): Promise<Note>;
  delete(id: string): Promise<void>;
  list(): Promise<Note[]>;          // new array, updatedAt desc, id asc
  isPersisted(): Promise<boolean>;  // never rejects
}

export type Clock = () => number;
export type IdGenerator = () => string;
export interface StorageManagerLike {
  persisted?: () => Promise<boolean>;
  persist?: () => Promise<boolean>;
}
```
The signatures are typed, but every method validates at runtime, because
JavaScript callers and casts can pass anything (R7, R16). Returned notes
are fresh plain objects, never frozen. AC-5 assigns to one, and a frozen
object would throw in strict mode. `readonly` keeps TypeScript callers
from mutating them.

**`src/notes/errors.ts`:**
```ts
export type NoteStorageErrorKind = "validation" | "not-found" | "unavailable" | "quota-exceeded";
export abstract class NoteStorageError extends Error { abstract readonly kind: NoteStorageErrorKind }
export class ValidationError extends NoteStorageError        // kind "validation", issues: readonly ValidationIssue[]
export class NotFoundError extends NoteStorageError          // kind "not-found"
export class StorageUnavailableError extends NoteStorageError // kind "unavailable", cause?: unknown
export class QuotaExceededError extends NoteStorageError     // kind "quota-exceeded", cause: unknown

export type ValidationIssue =
  | { field: "title" | "body"; rule: "not-a-string" }
  | { field: "title" | "body"; rule: "too-long"; limit: 200 | 100000; actual: number }
  | { field: "note"; rule: "empty" }
  | { field: "id"; rule: "not-a-string" };
```
- `cause` uses ES2022 `ErrorOptions` (`lib: es2022` is already set).
  `name` equals the class name.
- Messages are fixed templates built only from field, rule, limit and
  count, for example `"Note failed validation: title too-long (201/200)"`
  or `"Note not found"`. No message includes the id, title or body (R24).
- `kind` is an own property, so `error.kind` is checkable after
  `JSON.stringify`.
- `NotFoundError` and `QuotaExceededError` shadow DOMException *names*,
  not globals, so there is no conflict. Classification code compares
  `error.name` strings, never `instanceof DOMException`, because
  fake-indexeddb and jsdom may use different `DOMException` realms.

**`src/notes/validation.ts`:** exports `TITLE_MAX_CHARS = 200`,
`BODY_MAX_CHARS = 100_000`, `countCharacters(s: string): number`,
`validateNoteInput(input: unknown): NoteInput` (throws `ValidationError`
with all issues) and `validateId(id: unknown): string`.
- `validateNoteInput` reads only `title` and `body`, and returns a new
  `{ title, body }` object (R11).
- It checks `typeof === "string"`, so `String` objects fail (R7).
- `update(id, input)` merges the id issues and input issues into one
  `ValidationError`.

**`src/storage/index.ts`** (the public entry for UI slugs):
`getNoteRepository(): NoteRepository`. It creates
`createIndexedDbNoteRepository()` with defaults on the first call and
returns the same instance on later calls (R29). It touches neither
IndexedDB nor `navigator.storage`. It re-exports the types, error
classes and `countCharacters` from `src/notes/`, so UI code has a single
import path.

**`src/storage/indexedDbNoteRepository.ts`:**
```ts
export interface IndexedDbNoteRepositoryOptions {
  indexedDB?: () => IDBFactory | undefined;           // default: () => globalThis.indexedDB (read per open; may throw)
  storage?: () => StorageManagerLike | undefined;      // default: () => globalThis.navigator?.storage
  now?: Clock;                                         // default: Date.now
  newId?: IdGenerator;                                 // default: () => crypto.randomUUID()
}
export function createIndexedDbNoteRepository(options?: IndexedDbNoteRepositoryOptions): NoteRepository;
```

**`src/test/inMemoryNoteRepository.ts`** (test only):
`createInMemoryNoteRepository(options?: { now?; newId?; storage?; records?: Map<string, Note> })`.
- Passing the same `records` map to a second instance models "a new
  instance over the same storage" for AC-15.
- It copies on write and on read (R3), and rejects a duplicate id with
  `StorageUnavailableError`, as the IndexedDB `add` does.

**Errors by operation:**

| Operation | validation | not-found | unavailable | quota-exceeded |
|---|---|---|---|---|
| `create` | input | never | open/tx failure, duplicate id | tx/request quota |
| `get` | id | missing id | open/tx failure | n/a |
| `update` | id + input | missing id (incl. deleted in another tab) | open/tx failure | tx/request quota |
| `delete` | id | missing id | open/tx failure | tx quota |
| `list` | never | never | open/tx failure | n/a |
| `isPersisted` | never rejects | | | |

Auth: N/A. Single local user, no accounts (charter).

### Data model
- **Database:** `quicknotes`, version `1`, one object store `notes`,
  `keyPath: "id"`, no indexes (R27). The upgrade handler creates the
  store only if `!db.objectStoreNames.contains("notes")`. These names
  are defined once, in `src/storage/schema.ts`.
- **Record:** exactly `{ id, title, body, createdAt, updatedAt }`. The
  record is built field by field from validated input, never by
  spreading caller input (R11). Reads project back to these five fields,
  so a stray property could never leak out (R1).
- **No indexes.** `list()` sorts in memory (R39). `search-notes` may add
  an index later, with a version bump and an upgrade (R27 constraint).
- **Retention:** `delete` really removes the record. There is no
  tombstone (R15).
- **Migrations:** none in v1. Any later shape change bumps the version
  and migrates in `upgradeneeded`.
- **Fallback:** none. Nothing is written to `localStorage`,
  `sessionStorage`, cookies or Cache Storage (R23).

### Backend
There is no server. The "backend" is the in-browser data layer.

**`src/notes/` (domain, IndexedDB-free):**
- `note.ts`, `errors.ts`, `validation.ts`: as in the API contract.
- `ordering.ts`:
  - `compareForList(a, b)`: `updatedAt` desc, then `id` asc by plain
    `<` comparison, not `localeCompare`.
  - `nextUpdatedAt(now, previous) = Math.max(now, previous + 1)`.
- `persistence.ts`: `createPersistencePolicy(getStorage)` returns
  `{ requestOnce(): void; isPersisted(): Promise<boolean> }`.
  - `requestOnce` returns immediately if a request was already made.
    Otherwise it sets `attempted = true` synchronously, then
    fire-and-forgets
    `void (async () => { try { const s = getStorage(); if (!s?.persisted) return; if ((await s.persisted()) !== true) await s.persist?.(); } catch { /* R32: never surfaces */ } })()`.
    A synchronous throw, a rejection or a pending `persist()` therefore
    never reaches the save, and no unhandled rejection can occur.
  - `isPersisted` uses try/await/catch and returns `false` on anything
    other than `true` (R33).

**`src/storage/` (IndexedDB):**
- `schema.ts`: `DB_NAME`, `DB_VERSION`, `STORE`, `upgrade(db)`.
- `connection.ts`: `createConnection(getFactory)` returns
  `{ open(): Promise<IDBDatabase> }`.
  - **Lazy, shared (R25, R26):** it caches the *in-flight or open*
    promise. Concurrent callers share one `open` request.
  - **No failure caching (R23):** on any rejection the cache is cleared,
    so the next call retries `open`.
  - **Error mapping (R21):**
    - The getter returning `undefined`, or throwing, gives
      `StorageUnavailableError`, with the thrown value as `cause`.
    - `open()` throwing synchronously gives the same.
    - The request `error` event gives the same, with `request.error` as
      `cause`.
    - A `blocked` event rejects immediately. If `success` fires later,
      that connection is closed at once, so a tab never holds two
      connections.
  - **`versionchange` (R28):** the listener calls `db.close()` and
    clears the cache. A `close` event (the browser force-closing) also
    clears it.
  - Listeners are attached with `addEventListener`. That works on real
    IndexedDB, on fake-indexeddb and on the `EventTarget`-based stub
    requests used in AC-30 (c)-(e).
- `transactions.ts`:
  - `runWrite(db, work)` opens
    `db.transaction("notes", "readwrite", { durability: "strict" })`.
    It runs `work(store, tx)` and resolves on `complete` only (R18).
    On `abort`/`error` it rejects with `toStorageError(tx.error)`, read
    from its own `tx` reference.
  - `runRead(db, work)` does the same with an explicit `"readonly"`.
  - `toStorageError(e)` returns `QuotaExceededError` when
    `e?.name === "QuotaExceededError"`, and `StorageUnavailableError`
    otherwise, both with `cause: e`. It never inspects or copies a
    record.
  - A `NotFoundError` decided inside a transaction is held aside and
    rejected after `complete`. The transaction commits with no writes
    rather than aborting, so the not-found path never looks like a
    storage failure.
- `indexedDbNoteRepository.ts` composes these. Each method follows the
  same pattern: `validate`, then (create/update only)
  `persistence.requestOnce()`, then `connection.open()`, then
  `runWrite`/`runRead`. Validation is synchronous and runs first. The
  method is `async`, so a validation throw becomes a rejection before any
  open or persistence call (R9).
  - `create`: `store.add(record)`. A duplicate id raises
    `ConstraintError`, which aborts the transaction and rejects with
    `StorageUnavailableError` (AC-4).
  - `get`: `store.get(id)`. `undefined` gives `NotFoundError`.
  - `update`: in one readwrite transaction (R14), `store.get(id)`. If it
    is missing, the transaction ends with no writes and the call rejects
    with `NotFoundError`. Otherwise it calls `store.put({ id, title,
    body, createdAt: prev.createdAt, updatedAt: nextUpdatedAt(now(),
    prev.updatedAt) })`.
  - `delete`: in one readwrite transaction, `store.count(id)`. If it is
    0, the call rejects with `NotFoundError`. Otherwise it calls
    `store.delete(id)`.
  - `list`: one readonly transaction and one `store.getAll()`, then
    project and `sort(compareForList)` on the copy (R39).
  - `isPersisted`: delegates to the policy and never opens the database.
  - Nothing logs. There is no `console.*` anywhere in `src/notes/` or
    `src/storage/` (R24).

Integrations and background jobs: none.

### Frontend
N/A. The spec's User experience is "none in this slug" (R42). No screen,
component, state or copy is added or changed. `App.tsx`, `main.tsx`,
`src/components/**`, `src/copy.ts`, `src/index.css` and `index.html` are
untouched, and AC-56 proves they don't reach the storage modules. The
empty/loading/error/success rendering of storage states belongs to
`create-note`, `list-notes`, `edit-note` and `delete-note`. They map the
error `kind` values above to their own copy.

## Files / components touched
New, domain (`src/notes/`):
- `src/notes/note.ts`, `errors.ts`, `validation.ts`, `ordering.ts`, `persistence.ts`
- `src/notes/validation.test.ts`, `ordering.test.ts`, `persistence.test.ts`, `errors.test.ts`

New, IndexedDB (`src/storage/`):
- `src/storage/schema.ts`, `connection.ts`, `transactions.ts`, `indexedDbNoteRepository.ts`, `index.ts`
- `src/storage/noteRepository.contract.test.ts` (runs the contract suite against both implementations)
- `src/storage/indexedDbNoteRepository.test.ts` (IndexedDB-specific behaviour)
- `src/storage/failures.test.ts`, `lifecycle.test.ts`, `persistence.test.ts`, `performance.test.ts`, `twoTabs.test.ts`, `network.test.ts`

New, test support (`src/test/`, the folder named for AC-53):
- `src/test/inMemoryNoteRepository.ts`
- `src/test/noteRepositoryContract.ts`: `describeNoteRepositoryContract(name, makeHarness)`. A harness gives `{ repo(opts), reopen(opts) }`.
- `src/test/fakes.ts`: `createFixedClock(start)` with `.set(ms)`, `sequentialIds(...ids)`, `createStubStorage(...)`, `installNavigatorStorage(stub)`, `freshFactory()` (`new IDBFactory()` from `fake-indexeddb`), `spyOnOpen(factory)`
- `src/test/faultyIndexedDb.ts`: Proxy-based fault injection over a real fake-indexeddb factory, with no private APIs.
  - `abortAfterWrite(op)`: the real request succeeds, then the real `tx.abort()` is called.
  - `abortWith(op, domException)`: like `abortAfterWrite`, and the proxied transaction's `error` reports the given exception.
  - `requestError(op, domException)`: the real `put`/`add` is replaced by a synthetic failed request, then the transaction is aborted with that error, as a browser does when an unhandled request error aborts the transaction.
  - Stub factories for AC-30 (c) open throws, (d) open request fires `error`, and (e) open request fires `blocked` only. These are built on `EventTarget`.
  - `failFirstOpen(factory)` for AC-32.
  - Other methods are forwarded, bound to the real target.

Changed:
- `package.json` / `package-lock.json`: `devDependencies` gains `"fake-indexeddb": "^6.2.5"`. No runtime dependency.
- `tests/tooling/repo.ts`: adds `importsOf`, `importClosure` and `storageSourceFiles()` (non-test files under `src/notes/` and `src/storage/`). `R5_EXCEPTIONS` is unchanged.
- `tests/tooling/privacy.test.ts`: a new `describe("storage privacy")` with AC-50 and AC-55 scans plus pattern self-tests. The existing tests are unchanged.
- `README.md`: one line under "Layout" naming `src/notes/` and `src/storage/` and the "UI imports only `src/storage/index.ts`" rule. Optional, no test asserts it.

New tooling test:
- `tests/tooling/storage-boundary.test.ts` (AC-51, AC-53, AC-56)

Not touched: `vite.config.ts`, `eslint.config.js`, `tsconfig*.json`,
`src/test/setup.ts`, `e2e/**`, `index.html`, every existing `src/` file,
`tests/tooling/licences.test.ts`, and other slugs' artifacts.

## Steps
Contract first, and each step is reviewable on its own. Write each test
before its code (TDD per the repo rules). Every step ends with `npm test`,
`npm run lint`, `npm run typecheck` and `npm run format:check` green.

1. [TEST] **Add the test IndexedDB.** Run
   `npm install -D fake-indexeddb@^6.2.5` with Node 24 and the default
   registry. Confirm that `package-lock.json` gains only
   `node_modules/fake-indexeddb` (Apache-2.0) and that
   `tests/tooling/licences.test.ts` passes unchanged.
2. [API] **The domain contract.** Add `src/notes/note.ts` and
   `src/notes/errors.ts` exactly as in the API contract. Add
   `errors.test.ts` (kinds, `instanceof NoteStorageError`, `cause`,
   `name`, fixed messages).
3. [BE] **Pure domain logic.** Add `validation.ts` (`countCharacters`,
   limits, `validateNoteInput`, `validateId`), `ordering.ts` and
   `persistence.ts`, each with unit tests. AC-10 lands here.
4. [TEST] **The contract suite and the in-memory double.** Add
   `src/test/fakes.ts`, `src/test/noteRepositoryContract.ts` (all
   "contract" ACs) and `src/test/inMemoryNoteRepository.ts`. Add
   `noteRepository.contract.test.ts`, which runs only the in-memory
   harness for now and is green.
5. [DATA] **Schema and connection.** Add `src/storage/schema.ts` and
   `connection.ts`, with the lazy shared open, the R21 mapping,
   `blocked`, `versionchange`, `close` and no failure caching. Test them
   through a minimal `list()` in step 6. `connection.ts` gets its own
   unit tests for AC-30, AC-32 and AC-39 at this step.
6. [BE] **The IndexedDB repository.** Add `transactions.ts` and
   `indexedDbNoteRepository.ts`. Add the IndexedDB harness to
   `noteRepository.contract.test.ts`, so both runs are green (AC-52).
   Add `indexedDbNoteRepository.test.ts` (AC-2, AC-4, AC-16, AC-25,
   AC-37, AC-38, plus the durability option check).
7. [BE] **Failure paths.** Add `src/test/faultyIndexedDb.ts` and
   `failures.test.ts` (AC-29, AC-30, AC-31, AC-32, AC-33-NS, AC-34).
8. [BE] **Persistence wiring.** Call `requestOnce()` from create/update
   after validation. Add `src/storage/persistence.test.ts` (AC-41 to
   AC-47).
9. [API] **The shared accessor.** Add `src/storage/index.ts`
   (`getNoteRepository` + re-exports). Add `lifecycle.test.ts` (AC-35,
   AC-36, AC-39 at the repository level).
10. [TEST] **Cross-cutting runtime tests.** Add `performance.test.ts`
    (AC-40), `twoTabs.test.ts` (AC-48, AC-49) and `network.test.ts`
    (AC-54).
11. [TEST] **Tooling enforcement.** Add the resolver helpers to
    `tests/tooling/repo.ts`, the `storage privacy` block in
    `privacy.test.ts` (AC-50, AC-55), and `storage-boundary.test.ts`
    (AC-51, AC-53, AC-56). Each comes with self-tests on fixture strings
    proving it catches a violation.
12. [TEST] **The full gate.** Run `npm run ci` on a clean checkout
    (AC-57). Confirm with `git diff --stat main -- e2e tests/tooling
    src/App.tsx src/main.tsx src/components src/copy.ts src/index.css
    index.html` that the only tooling changes are the additions above,
    and that no existing expectation changed (AC-56). Optionally add the
    README layout line.

## Test strategy
Layers:
- **unit-BE:** domain or IndexedDB module tests.
- **contract:** the shared suite, run against both implementations by
  `src/storage/noteRepository.contract.test.ts`. Each contract row runs
  twice: `[indexeddb]` and `[in-memory]`.
- **integration:** IndexedDB repository over fake-indexeddb, with fault
  injection or multiple instances.
- **tooling:** static repo checks under `tests/tooling/`.

Defaults per the spec: a fresh factory, a stub storage manager resolving
`false`/`false`, and a fixed clock.

| Acceptance criterion | Layer | Test |
|---|---|---|
| AC-1 | contract | `noteRepositoryContract › create › returns exactly the five fields with a v4 id and clock times` |
| AC-2 | unit-BE | `indexedDbNoteRepository.test.ts › default id generator gives 1,000 distinct v4 ids` |
| AC-3 | contract | `noteRepositoryContract › create › ignores id, createdAt, updatedAt and unknown keys in input` |
| AC-4 | integration | `indexedDbNoteRepository.test.ts › create never overwrites: duplicate generated id rejects StorageUnavailableError` |
| AC-5 | contract | `noteRepositoryContract › returned notes are copies: mutating one doesn't change get/list` |
| AC-6 | contract | `noteRepositoryContract › field rules › accepts title of 200 and body of 100,000` |
| AC-7 | contract | `noteRepositoryContract › field rules › title of 201 rejects with one too-long issue and writes nothing` |
| AC-8 | contract | `noteRepositoryContract › field rules › body of 100,001 rejects with too-long issue` |
| AC-9 | contract | `noteRepositoryContract › field rules › counts emoji as one code point (200 ok, 201 rejects)` |
| AC-10 | unit-BE | `src/notes/validation.test.ts › countCharacters counts code points` (the table of 9 inputs) |
| AC-11 | contract | `noteRepositoryContract › field rules › both empty rejects with note/empty and writes nothing` |
| AC-12 | contract | `noteRepositoryContract › field rules › one empty field or whitespace-only title is accepted and kept` |
| AC-13 | contract | `noteRepositoryContract › field rules › non-string title/body (undefined, null, number, String object, missing) rejects not-a-string` (`it.each`) |
| AC-14 | contract | `noteRepositoryContract › field rules › reports every broken rule, not just the first` |
| AC-15 | contract | `noteRepositoryContract › round-trips text exactly, also through a new instance over the same store` (`it.each` over 4 pairs; uses `harness.reopen`) |
| AC-16 | integration | `indexedDbNoteRepository.test.ts › invalid create never opens the database or requests persistence` |
| AC-17 | contract | `noteRepositoryContract › get › returns a note deep-equal to create's result` |
| AC-18 | contract | `noteRepositoryContract › get › unknown or empty id is not-found; non-string id is a validation error` |
| AC-19 | contract | `noteRepositoryContract › update › replaces fields, keeps id and createdAt, sets updatedAt to now` |
| AC-20 | contract | `noteRepositoryContract › update › updatedAt always moves forward (same ms, clock backwards)` |
| AC-21 | contract | `noteRepositoryContract › update › invalid input rejects and leaves the note unchanged` |
| AC-22 | contract | `noteRepositoryContract › update › missing id rejects not-found and doesn't create` |
| AC-23 | contract | `noteRepositoryContract › update › ignores id and createdAt in input` |
| AC-24 | contract | `noteRepositoryContract › delete › removes the note; second delete is not-found` |
| AC-25 | integration | `indexedDbNoteRepository.test.ts › delete removes the record from the notes store (count 0, no tombstone)` |
| AC-26 | contract | `noteRepositoryContract › list › sorts by updatedAt descending` |
| AC-27 | contract | `noteRepositoryContract › list › breaks updatedAt ties by id ascending` |
| AC-28 | contract | `noteRepositoryContract › list › empty store gives []` |
| AC-29 | integration | `failures.test.ts › a write that aborts after its request succeeds rejects and leaves nothing changed` (`it.each` create/update/delete via `abortAfterWrite`) |
| AC-30 | integration | `failures.test.ts › unavailable IndexedDB rejects list and create with StorageUnavailableError` (`it.each` (a)-(e); asserts `kind`, `instanceof NoteStorageError` and `cause`) |
| AC-31 | integration | `failures.test.ts › quota errors map to QuotaExceededError and write nothing` (create via `abortWith`, update via `requestError`; asserts `cause.name`) |
| AC-32 | integration | `failures.test.ts › a failed open is not cached; the next call reopens` |
| AC-33-NS | integration | `failures.test.ts › no fallback storage: localStorage, sessionStorage, cookies and caches untouched` (spies on `Storage.prototype.setItem` and the `document.cookie` setter; length/emptiness before and after; `caches` checked only if present) |
| AC-34 | integration | `failures.test.ts › errors and console never contain note text` (validation and quota paths; spies on `console.log/info/warn/error/debug` for the whole test) |
| AC-35 | integration | `lifecycle.test.ts › importing and getting the shared repository touches nothing; first list opens once` (`vi.resetModules()` then dynamic import of `src/storage/index.ts`, with stubbed globals) |
| AC-36 | integration | `lifecycle.test.ts › concurrent first calls share one open request` |
| AC-37 | integration | `indexedDbNoteRepository.test.ts › database is quicknotes v1 with exactly the notes store keyed by id; reopening keeps notes` |
| AC-38 | integration | `indexedDbNoteRepository.test.ts › a new instance over the same factory after close lists identical notes` |
| AC-39 | integration | `lifecycle.test.ts › versionchange closes the connection; the next list rejects unavailable instead of hanging` |
| AC-40 | integration | `performance.test.ts › list over 1,000 notes uses one readonly transaction and a median under 250 ms`. The spy is `vi.spyOn(IDBDatabase.prototype, "transaction")` from `fake-indexeddb`, cleared after the warm-up call and before each timed call, asserting exactly one call with mode `"readonly"` per call. This excludes the upgrade's internal `versionchange` transaction. |
| AC-41 | integration | `src/storage/persistence.test.ts › first create calls persisted then persist once per launch` |
| AC-42 | integration | `src/storage/persistence.test.ts › already persisted: persist is never called` |
| AC-43 | integration | `src/storage/persistence.test.ts › a new launch asks again` |
| AC-44 | integration | `src/storage/persistence.test.ts › reads, delete, isPersisted and invalid creates never call persist` |
| AC-45 | integration | `src/storage/persistence.test.ts › save never waits for or fails on persist (pending, rejecting, throwing)`. Vitest fails the run on an unhandled rejection. The test also flushes microtasks before it ends. |
| AC-46 | integration | `src/storage/persistence.test.ts › missing navigator.storage or missing persist doesn't affect saves` |
| AC-47 | integration | `src/storage/persistence.test.ts › isPersisted maps every outcome to a boolean and never opens or persists` (`it.each` over 5 cases) |
| AC-48 | integration | `twoTabs.test.ts › last committed update wins across two instances` |
| AC-49 | integration | `twoTabs.test.ts › update after delete in another tab is not-found and doesn't recreate` |
| AC-50 | tooling | `tests/tooling/privacy.test.ts › storage privacy › no cross-tab channels in storage source` |
| AC-51 | tooling | `tests/tooling/storage-boundary.test.ts › domain modules don't reference or import IndexedDB` (regex `/indexedDB\|IDB[A-Z]\|fake-indexeddb/` over `src/notes/*.ts` non-test, plus a closure check: no `src/storage/**`, `idb` or `fake-indexeddb`) |
| AC-52 | contract | `src/storage/noteRepository.contract.test.ts` runs `describeNoteRepositoryContract` for `[indexeddb]` and `[in-memory]`. A guard test asserts both harnesses registered the same number of tests. |
| AC-53 | tooling | `tests/tooling/storage-boundary.test.ts › no production module reaches the in-memory implementation or test support` (every non-`*.test.ts(x)` file under `src/` outside `src/test/`; transitive closure) |
| AC-54 | integration | `src/storage/network.test.ts › a full cycle makes no network call` |
| AC-55 | tooling | `tests/tooling/privacy.test.ts › storage privacy › no network or other storage APIs in storage source` (plus a self-test that each pattern catches a fixture) |
| AC-56 | tooling + CI | `tests/tooling/storage-boundary.test.ts › the live UI doesn't reach any storage module` (closure from `index.html`, `src/App.tsx`, `src/main.tsx`, `src/components/**`, `src/copy.ts`, `src/index.css`). Existing unit/tooling tests and `e2e/privacy.spec.ts` "no storage or cookies on fresh load" pass unchanged under `npm run ci`, and the diff review in step 12 confirms none of them was edited. |
| AC-57 | CI (manual run + GitHub Actions) | `npm run ci` exits 0 locally on Node 24.18.0 and in the `CI` workflow, including `privacy.test.ts` over the new files and `licences.test.ts` with `R5_EXCEPTIONS` unchanged. |

Additional tests that aren't mapped to an AC:
- R19: `indexedDbNoteRepository.test.ts › write transactions request strict durability`.
- R14 single transaction: `update reads and writes in one readwrite transaction` (prototype spy).
- R26: `lifecycle.test.ts › a blocked open that later succeeds is closed`.

Coverage is not measured: no coverage tool is installed (see Out of
scope). Every exported function in `src/notes/` and `src/storage/` is
exercised by the tests above.

## Risks & rollback
| Risk | Likelihood / impact | Detection | Mitigation |
|---|---|---|---|
| fake-indexeddb differs from real browsers (Safari quirks, real quota, `durability`, `persist()` prompts). | Medium / medium. Tests green, a browser fails later. | First real use in `create-note`. | Accepted (A8). The code uses only widely supported IDB 2.0 calls (`getAll`, `count`, `add`, `put`, `delete`). Errors are classified by `name`. `create-note`'s plan should include a manual check in a separate browser profile. |
| `DOMException` realm mismatch between jsdom and fake-indexeddb. | Medium / low. | Failure tests (AC-31). | Classify by `error.name` only, never `instanceof DOMException`. |
| The fault-injection Proxies depend on the repository reading `tx.error` from its own transaction reference. | Low / low (test-only). | AC-29/31 fail loudly. | Documented in `faultyIndexedDb.ts` and in this plan. If the implementation must change, update this plan first. |
| A late `success` after `blocked` leaves a second connection open. | Low / medium (blocks other tabs' upgrades). | `lifecycle.test.ts` blocked-then-success test. | Close any connection that arrives after its open promise settled. |
| Fire-and-forget persistence produces an unhandled rejection. | Low / low. | AC-45; Vitest fails on unhandled rejections. | The async IIFE wraps everything in try/catch. |
| The privacy scan gives false positives from comments (for example the words "sentry" or "plausible" via `SOURCE_MARKERS`, or a comment containing `caches.` or `fetch(`). | Medium / low (CI red). | `npm test`. | Word comments carefully in `src/notes/` and `src/storage/`. Don't loosen the scans. |
| Someone wires a UI component to storage early, changing AC-33's fresh-load result. | Low / high (breaks project-foundation AC-33). | AC-56 tooling test; e2e AC-33 in `npm run ci`. | The closure check fails before the e2e runs. |
| The shared `ai-integration-techie.github.io` origin lets another Pages site read or erase the `quicknotes` database. | Low / high. | None (nothing technical can detect it). | Accepted for v1 (A6). Only AITechie publishes under the account. Revisit before any custom domain. |
| Future shape changes strand notes. | Later slugs / high. | Review of any slug touching `schema.ts`. | R27 constraint: bump `DB_VERSION` and migrate in `upgrade`. `schema.ts` holds a comment pointing at R27. |
| Dependency risk: the fake-indexeddb licence changes on upgrade. | Low / low. | `licences.test.ts` on every CI run. | The lockfile pins it. Dev-only, never in `dist/`. |

**Rollback:** the change is additive and unreachable from the live app.
Reverting the merge commit removes `src/notes/`, `src/storage/`, the new
`src/test/*` files, the tooling additions and `fake-indexeddb`. The live
site never opens the database in this slug, so no user data exists and
no migration or cleanup is needed. If CI goes red after merge,
`git revert <merge-sha>` restores the previous state exactly.

## Explicitly out of scope
- **The `idb` wrapper** (D1). We accept owning the small promise layer.
- **Any UI, copy or user-visible state**, including validation messages,
  persistence notices and storage-failure screens (R42). These are the
  later UI slugs' job.
- **Real-browser (Playwright) storage tests, and a manual browser check
  in this slug** (A8). No new e2e file. `e2e/**` is untouched.
- **An ESLint `no-restricted-imports` rule** for the UI/storage
  boundary. The tooling test is the single enforcement point (D5).
  Adding a lint rule would also mean editing `eslint.config.js` and its
  test.
- **Coverage measurement** (`@vitest/coverage-v8`). It would be a new
  dependency and gate change, not asked for by the spec. The AC-to-test
  mapping is the completeness check.
- **Vitest browser mode** and any change to `vite.config.ts` test
  settings. The jsdom environment works for every test here.
- **Indexes, search, pagination, cross-tab notifications, tombstones,
  export/backup, encryption and a schema-version field per record**
  (spec non-goals).
- **Any fallback store in production code.** The in-memory
  implementation exists only under `src/test/` (AC-53).
- **Three-state persistence reporting** (A9). A later slug would need a
  spec revision.
- **Edits to the approved spec or to other slugs' artifacts.**

## Approval
<!-- Filled in by a human (Tech Lead) only. -->
- Approved by: AITechie, 2026-10-06
