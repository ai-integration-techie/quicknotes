# Review: Note storage (note model and local repository)

- Slug: note-storage
- Spec: [spec.md](./spec.md) (Approved, AITechie, 2026-10-06)
- Plan: [plan.md](./plan.md) (Approved, AITechie, 2026-10-06)
- PR: none yet (all changes uncommitted on `main`)
- Date: 2026-10-06
- Iteration: 1

## Verification run by the reviewer
- `PATH=~/.nvm/versions/node/v24.18.0/bin:$PATH npm run ci` (Node v24.18.0) exited **0**:
  `format:check`, `lint --max-warnings 0` and `tsc -b` were clean. Vitest:
  **29 files, 232/232 passed**. `vite build` succeeded. Playwright:
  **23/23 passed**, including `e2e/privacy.spec.ts › no storage or cookies on fresh load` (project-foundation AC-33).
- `git status` / `git diff --stat HEAD` show **no changes** to `e2e/**`,
  `tests/tooling/licences.test.ts`, `src/App.tsx`, `src/main.tsx`,
  `src/components/**`, `src/copy.ts`, `src/index.css`, `index.html`,
  `vite.config.ts`, `eslint.config.js`, `tsconfig*.json` or `src/test/setup.ts`.
  `tests/tooling/privacy.test.ts` and `tests/tooling/repo.ts` only gain additions. No existing line changed. `R5_EXCEPTIONS` is unchanged.
- `dist/` after the build: a grep for `indexedDB|IndexedDB|fake-indexeddb|NoteStorageError|getAll|durability|quota-exceeded` finds no match in `dist/assets/*.js`. The only `quicknotes` match is the `/quicknotes/` base path in `dist/index.html`. 20 modules were transformed, the same as before this slug.
- `package-lock.json` adds exactly one package entry, `node_modules/fake-indexeddb` 6.2.5, `"dev": true`, `"license": "Apache-2.0"` (this is on the R5 allowlist). `package.json` adds it under `devDependencies` only.
- I checked the AC-10 and AC-15 fixtures byte by byte. `"é"` is `c3 a9` (precomposed) and `"é"` is `65 cc 81` (decomposed). The 👩‍💻 fixture contains a literal ZWJ (`e2 80 8d`). The tests exercise what the spec intends.

## Spec conformance
Each line gives the status, then the test that verifies it. "contract" means the test runs in both `[indexeddb]` and `[in-memory]` (`src/storage/noteRepository.contract.test.ts`).

- AC-1: **met**. contract `create › returns exactly the five fields with a v4 id and clock times`.
- AC-2: **met**. `indexedDbNoteRepository.test.ts › default id generator gives 1,000 distinct v4 ids`.
- AC-3: **met**. contract `ignores id, createdAt, updatedAt and unknown keys in input`.
- AC-4: **met**. `indexedDbNoteRepository.test.ts › create never overwrites` (`store.add` gives ConstraintError, which maps to `StorageUnavailableError`, and the first note is unchanged).
- AC-5: **met**. contract `returned notes are copies` (mutates both a create result and a list result).
- AC-6: **met**. contract `accepts title of 200 and body of 100,000`.
- AC-7: **met**. contract `title of 201 rejects with one too-long issue and writes nothing` (exact issue list, then `list()` gives `[]`).
- AC-8: **met**. contract `body of 100,001 rejects with too-long issue`.
- AC-9: **met**. contract `counts emoji as one code point` (asserts 400 code units, 200 accepted, 201 rejected with `actual: 201`).
- AC-10: **met**. `src/notes/validation.test.ts › countCharacters counts code points` (all 9 inputs).
- AC-11: **met**. contract `both empty rejects with note/empty and writes nothing`.
- AC-12: **met**. contract `one empty field or whitespace-only title is accepted and kept`.
- AC-13: **met**. contract, 5 cases `non-string input rejects not-a-string: …`.
- AC-14: **met**. contract `reports every broken rule` (exact two-issue list).
- AC-15: **met**. contract, 4 cases `round-trips text exactly, also through a new instance` (`===` before and after `reopen`).
- AC-16: **met**. `indexedDbNoteRepository.test.ts › invalid create never opens the database or requests persistence`.
- AC-17: **met**. contract `get › returns a note deep-equal to create's result`.
- AC-18: **met**. contract `get › unknown or empty id is not-found; non-string id is a validation error`.
- AC-19: **met**. contract `update › replaces fields, keeps id and createdAt, sets updatedAt to now`.
- AC-20: **met**. contract `update › updatedAt always moves forward` (1001, 1002, then clock 500 gives 1003).
- AC-21: **met**. contract `update › invalid input rejects and leaves the note unchanged` (the clock is moved first, so a stray write would show).
- AC-22: **met**. contract `update › missing id rejects not-found and doesn't create`.
- AC-23: **met**. contract `update › ignores id and createdAt in input`.
- AC-24: **met**. contract `delete › removes the note; second delete is not-found`.
- AC-25: **met**. `indexedDbNoteRepository.test.ts › delete removes the record from the notes store` (direct `count()` 0, `get` undefined, `getAll` `[]`).
- AC-26: **met**. contract `list › sorts by updatedAt descending`.
- AC-27: **met**. contract `list › breaks updatedAt ties by id ascending`.
- AC-28: **met**. contract `list › empty store gives []`.
- AC-29: **met**. `failures.test.ts`, 3 cases (create, update, delete) using `abortAfterWrite`. Each rejects with `StorageUnavailableError`, and an unwrapped repository then lists only the original note with its old values.
- AC-30: **met**. `failures.test.ts`, 5 cases (a) to (e), each through both `list()` and `create()`. They assert `kind`, `instanceof NoteStorageError` and `cause.name` where a cause exists. `connection.test.ts` repeats this at the connection level with `cause` identity.
- AC-31: **met**. `failures.test.ts`: create via `abortWith`, and update via `requestError` on `put`. Both assert `QuotaExceededError`, `kind` and `cause.name`, and that nothing changed. (See finding F5 on how strong the update half is.)
- AC-32: **met**. `failures.test.ts › a failed open is not cached` (`open` called twice). Also covered in `connection.test.ts`.
- AC-33-NS: **met**, with one part vacuous in this environment. `failures.test.ts › no fallback storage` spies on `Storage.prototype.setItem` and the `document.cookie` setter, and checks lengths and emptiness after both the unavailable path and a full cycle. jsdom has no `caches`, so that branch never runs. The spec says "(where present)", so this is allowed, but see F6.
- AC-34: **met**. `failures.test.ts › errors and console never contain note text` covers the validation path, the create quota path and the update quota path. It checks `message`, `JSON.stringify` of the own properties and `String(error)`, with console spies active for the whole test.
- AC-35: **met**. `lifecycle.test.ts` uses `vi.resetModules()`, stubbed globals and a dynamic import of `./index`. The accessor is called twice, no open or persist call follows, and `list()` then opens exactly once.
- AC-36: **met**. `lifecycle.test.ts › concurrent first calls share one open request`.
- AC-37: **met**. `indexedDbNoteRepository.test.ts › database is quicknotes v1 with exactly the notes store keyed by id; reopening keeps notes`.
- AC-38: **met (simulation only)**. `indexedDbNoteRepository.test.ts › a new instance over the same factory after close lists identical notes`. Real browser, OS and device restart survival is **not** proven. See "Pending manual items / accepted risks".
- AC-39: **met**. `lifecycle.test.ts › versionchange closes the connection…`: the v2 open sees no `blocked`, and the next `list()` rejects `StorageUnavailableError`. `connection.test.ts` also asserts `close()` was called and that `cause.name` is `VersionError`.
- AC-40: **met** (in-process budget, accepted as A7). `performance.test.ts` seeds 1,000 notes with 60-character titles and 2,000-character bodies, warms up once and times 5 calls. Each call is checked for the R17 order and exactly one `readonly` `IDBDatabase.prototype.transaction` call. The median must be under 250 ms. This is not a real-device measurement, which the spec accepts (open question 7).
- AC-41: **met**. `persistence.test.ts › first create calls persisted then persist once per launch`. `persisted` is asserted synchronously inside the first `create`. `persist` is asserted after that create and a task flush, and before the second create. The call is fire-and-forget by design (R32).
- AC-42: **met**. `persistence.test.ts › already persisted: persist is never called`.
- AC-43: **met**. `persistence.test.ts › a new launch asks again` (via update and via create).
- AC-44: **met**. `persistence.test.ts › reads, delete, isPersisted and invalid creates never call persist` (`persisted` is called once, by `isPersisted`).
- AC-45: **met**. `persistence.test.ts`, 3 cases: pending, reject and sync throw. A pending `persist()` would hang the test past its timeout if the save waited. Vitest fails the run on any unhandled rejection.
- AC-46: **met**. `persistence.test.ts › missing navigator.storage or missing persist doesn't affect saves`.
- AC-47: **met**. `persistence.test.ts`, 5 cases (true, false, reject, throw, none). Each asserts the boolean, that `open` was never called and that `persist` was never called.
- AC-48: **met**. `twoTabs.test.ts › last committed update wins across two instances`.
- AC-49: **met**. `twoTabs.test.ts › update after delete in another tab is not-found and doesn't recreate`.
- AC-50: **met**. `tests/tooling/privacy.test.ts › storage privacy › no cross-tab channels in storage source`, plus self-tests on fixtures.
- AC-51: **met**. `tests/tooling/storage-boundary.test.ts › domain modules don't reference or import IndexedDB` (regex and import closure). I also confirmed by grep that `src/notes/*.ts` (non-test) has no `indexedDB`, `IDB`, `console` or `localStorage`.
- AC-52: **met**. `noteRepository.contract.test.ts` registers the suite for both harnesses, and a guard asserts equal, non-zero test counts. Every contract-marked AC (1, 3, 5-9, 11-15, 17-24, 26-28) is in `src/test/noteRepositoryContract.ts`.
- AC-53: **met**. `storage-boundary.test.ts › no production module reaches the in-memory implementation or test support` (transitive closure over every non-test file under `src/` outside `src/test/`). Grep confirms `src/storage/*.ts` and `src/notes/*.ts` (non-test) never import `src/test/` or `fake-indexeddb`.
- AC-54: **met**. `src/storage/network.test.ts › a full cycle makes no network call`.
- AC-55: **met**. `privacy.test.ts › storage privacy › no network or other storage APIs in storage source`, plus a self-test for each pattern and a negative test for local `import()`.
- AC-56: **met**. `storage-boundary.test.ts › the live UI doesn't reach any storage module` (the closure from `index.html` reaches `main.tsx`, `App.tsx` and `index.css`, and none of `src/notes`, `src/storage` or `src/test`). No existing test file or e2e file was changed (see the git check above). AC-33's e2e passed in my run.
- AC-57: **met locally**. My `npm run ci` exited 0 on Node 24.18.0 with `privacy.test.ts` over the new files and `licences.test.ts` with `R5_EXCEPTIONS` unchanged. The plan also maps this criterion to the GitHub Actions `CI` workflow. That run can't happen until the change is pushed, so it is **pending, to confirm at ship**.

R19 (SHOULD), R14 single transaction and R26 blocked-then-success also have the extra tests the plan lists: `write transactions request strict durability`, `update reads and writes in one readwrite transaction` and `connection.test.ts › a blocked open that later succeeds is closed`.

### Pending manual items / accepted risks (not marked passed)
- **A8 / spec open question 8:** surviving a real browser restart, OS or device restart and a new deploy is only **simulated** (AC-38, AC-15 reopen). Real `persist()` prompts, eviction and Safari or Firefox IndexedDB quirks are not exercised. The plan accepted this, and the first real-browser check moves to `create-note`, whose plan should include a manual check in a separate browser profile.
- **A7:** AC-40's 250 ms budget runs on fake-indexeddb in Node, not on a device. The real under-100 ms check stays with `search-notes`.
- **A6:** the shared `ai-integration-techie.github.io` origin is an accepted v1 risk. There is no code for it.
- **Real quota behaviour:** the quota classification is only tested with injected `DOMException`s (fake-indexeddb has no quota). It goes by `name` only, which matches how the spec defines quota errors.
- **AC-57 on GitHub Actions:** pending until push.

## UX conformance
- N/A. The spec's User experience is "none in this slug". The shell is unchanged: no UI file changed, the AC-56 closure check passes and the Playwright suite (23/23) passes unchanged.

## API contract conformance
Checked against the plan's "API contract":
- `src/notes/note.ts`: `Note`, `NoteInput`, `NoteRepository`, `Clock`, `IdGenerator` and `StorageManagerLike` match the plan exactly.
- `src/notes/errors.ts`: the class names, `kind` values (own properties), `name` equal to the class name, `ValidationIssue` union, fixed message templates and `cause` through ES2022 `ErrorOptions` all match. One small difference: `StorageUnavailableError` and `QuotaExceededError` take `{ cause? }`, and `cause` is set only when a cause was passed. That fits "with the original error as `cause` where one exists".
- `src/notes/validation.ts`: `TITLE_MAX_CHARS`, `BODY_MAX_CHARS`, `countCharacters`, `validateNoteInput` and `validateId` match. There is one **additional export, `validateUpdate`**, which carries out the plan's sentence "`update(id, input)` merges the id issues and input issues into one `ValidationError`". `src/notes/ordering.ts` also exports `toNote` and `sortForList` on top of `compareForList` and `nextUpdatedAt`. These are internal helpers that both implementations share, and `src/storage/index.ts` doesn't re-export them, so the public surface for UI slugs is unchanged. They are additions, not breaking changes (see F7).
- `src/storage/indexedDbNoteRepository.ts`: `IndexedDbNoteRepositoryOptions` and `createIndexedDbNoteRepository` match. Defaults are read lazily: `globalThis.indexedDB` on each open, and `navigator?.storage` on each request.
- `src/storage/index.ts`: `getNoteRepository()` is a lazy singleton and re-exports the types, error classes and `countCharacters` (plus the two limit constants). This matches.
- `src/test/inMemoryNoteRepository.ts`: matches (`records` map sharing, copy on read and write, duplicate id rejected as `StorageUnavailableError`).
- Errors by operation table: matches the code paths. `list` and `get` can only produce validation, not-found or unavailable. Writes can also produce quota.
- Data model: `quicknotes` v1, store `notes`, `keyPath: "id"`, no indexes, and the upgrade creates the store only if it is missing. Records are built field by field. Reads go through `toNote`, which projects to exactly five fields. This matches.
- Auth: N/A (no backend).

## Findings
None blocking. The checklist below covers the specific areas I was asked to examine.

**Connection (`src/storage/connection.ts`): sound.**
- Lazy: nothing runs until `open()`, and the factory getter is called inside `startOpen`.
- Shared promise: `current` caches the in-flight or open promise, and concurrent callers get the same one.
- No cached failure: `pending.catch(() => forget(pending))` clears the cache, and the identity check `current === pending` stops a stale rejection from clearing a newer promise.
- `startOpen` throwing inside the Promise executor becomes a rejection, so a getter that throws, a missing factory or a sync `open()` throw all reject with `StorageUnavailableError` and never throw synchronously.
- `blocked` rejects once, guarded by `settled`, and a late `success` closes that connection.
- `versionchange` calls `db.close()` and forgets the cache. A `close` event (forced close) also forgets it.
- An upgrade that throws aborts the versionchange transaction, and the request's `error` then rejects with unavailable.

**Transactions (`src/storage/transactions.ts`): sound.**
- Writes resolve only on `complete`.
- `abort` is the one failure signal. A request error that isn't handled always aborts the transaction, so rejecting on `abort` with `transaction.error` covers request errors as well as explicit aborts. Not listening to `error` means a transaction can't settle twice.
- Synchronous failures in `db.transaction`, `objectStore` or `work` abort the transaction and reject through `toStorageError`.
- `settle()` runs after `complete`, so a not-found result is decided on a clean commit with no writes, as the plan says.
- Quota and unavailable are classified by `name` only, with `cause` kept, so the different `DOMException` realms in tests and browsers don't matter.

**Other checks.**
- Errors never contain note text. Messages are fixed templates. `ValidationIssue` holds only field, rule, limit and actual. The `cause` values are engine `DOMException`s that never carry note strings. AC-34 checks this.
- `persist()` is called only for a valid `create` or `update`. `requestOnce()` runs after validation, and the method is `async`, so a validation throw turns into a rejection first. The `attempted` flag is per instance, which means per launch. `get`, `list`, `delete` and `isPersisted` never call `requestOnce`. Nothing persistence-related runs on import or construction (AC-35).
- Validation:
  - Characters are counted as code points with `Array.from`.
  - Type checks use `typeof === "string"`, so `String` objects are rejected.
  - "Empty" is `=== ""`, with no trimming.
  - All issues are collected.
  - Only `title` and `body` are read.
- `updatedAt`: `Math.max(now, prev + 1)`. It is computed inside the update's read-write transaction from the record just read, so it stays monotonic across tabs too.
- Boundary: `src/notes` has no IndexedDB or console reference. Production code can't reach `src/test/`. The UI closure stays free of storage code. `dist/` has no storage code.
- Network: none, statically or at runtime.
- `fake-indexeddb` is dev-only, Apache-2.0, and the licence exceptions are unchanged.

**The build agent's extras:**
- **E1. `src/storage/connection.test.ts`: not a problem.** Plan step 5 explicitly asks for "`connection.ts` gets its own unit tests for AC-30, AC-32 and AC-39 at this step". It is only missing from the plan's "Files touched" list. It adds the useful `blocked`-then-`success` close test and asserts `cause` identity.
- **E2. The `guarded()` wrapper: not a problem, and it is good for R20.** It makes sure every rejection from the IndexedDB repository is a `NoteStorageError`. A non-storage throw, for example from `crypto.randomUUID` missing outside a secure context, a throwing injected clock or id generator, or a bug, becomes `StorageUnavailableError` with the original error on `cause`. The trade-off is that a programming bug looks like "unavailable" to the UI. That is acceptable because the cause is kept and R20 forbids other rejection types.
- **E3. `validateUpdate`: not a problem.** It is the plan's "merges the id and input issues" rule (R10, all issues reported). It reuses `idIssues` and `inputIssues`, so the rules aren't duplicated. A unit test covers it.

**Non-blocking findings and weak tests:**
- **F1 (correctness, minor). Two pending open requests after `blocked`.** When an open is `blocked`, the promise rejects and the cache clears, but the IDB request is still pending. A retry right away issues a second `open()`. If both later succeed, the first is closed at once, so the tab never *holds* two connections (R26 holds), but it can briefly have two *pending requests*. This is only reachable when a v1 open is blocked by an older-version connection, which can't happen at v1. Note it for the first version bump.
- **F2 (minor). An operation racing a `versionchange` close** gets `StorageUnavailableError` from `db.transaction()` (InvalidStateError) instead of reopening. The next call reopens. This matches R28 ("the next operation then reopens"). Note it for UI slugs: a single save can fail with "unavailable" during another tab's upgrade.
- **F3 (minor, R24 edge).** `cause` is the engine's error object. Engine messages for ConstraintError, AbortError and QuotaExceededError carry no record content in Chromium, Firefox, WebKit or fake-indexeddb, so R24 holds. A later slug that logs `error.cause` should still not log the input next to it.
- **F4 (simplification, optional).** `validateNoteInput` and `validateUpdate` each call `readField` twice. A tiny `readInput(input)` helper would remove the repetition. This is cosmetic.
- **F5 (weak test, plan-accepted).** AC-31's update half uses `requestError`, which never calls the real `put`, so "the note keeps its old values" can't fail through the engine. The real put is skipped either way. It does still prove the quota classification on the request-error path, and AC-29 (update) separately proves engine rollback after a real `put`. Together they cover the requirement. Not blocking.
- **F6 (weak test, spec-permitted).** AC-33-NS's `caches` branch never runs under jsdom, so Cache Storage is covered only by the static AC-55 scan for `caches.`. That is fine given the spec's "(where present)" wording.
- **F7 (artifact sync, minor).** The plan's API contract says "Changing it during implementation means updating this plan first". The extra exports (`validateUpdate`, `toNote`, `sortForList`) and the extra test-support helpers (`fixedId`, `flushTasks`, `openDirect`, `requestResult`, `factoryBlockedThenSucceeds`) are internal additions that don't change the public `src/storage/index.ts` surface. I don't treat them as a contract change. A one-line note in the plan at ship would keep it exact, at the Tech Lead's discretion.
- **F8 (housekeeping, not code).** The working tree also has `factory/runs/pages-deploy/run.yaml` (ship marked done) and `factory/BOARD.md` changes from the orchestrator. Whoever commits should decide whether these go in the note-storage commit or their own.

Mutation reasoning, to show the tests are not hollow:
- Resolving a write on request `success` instead of `complete` fails AC-29.
- Caching a failed open fails AC-32.
- Dropping the `versionchange` close hangs AC-39 until timeout, which fails it.
- Awaiting `persist()` hangs AC-45 "pending".
- Requesting persistence before validation fails AC-16 and AC-44.
- Counting with `s.length` fails AC-9.
- `updatedAt = now` fails AC-20.
- Mapping quota to unavailable fails AC-31.
- One transaction per note fails AC-40's transaction count.
- Importing storage from the UI fails AC-56.

## Decision
**approve**

Blocking: none.

Before or at ship (not blocking):
- Confirm AC-57 on the GitHub Actions `CI` workflow after push.
- Carry A8 into `create-note`'s plan as a manual real-browser persistence check in a separate profile.
- Optionally do F7 (a plan note on internal helper exports) and F8 (decide where the factory ledger changes are committed).

## Sign-off
- Reviewed by: <name>, <date>
