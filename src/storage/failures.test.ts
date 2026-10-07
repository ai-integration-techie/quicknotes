import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NoteStorageError,
  QuotaExceededError,
  StorageUnavailableError,
} from "../notes/errors";
import type { Note, NoteRepository } from "../notes/note";
import {
  abortAfterWrite,
  abortWith,
  factoryWhoseOpenBlocks,
  factoryWhoseOpenErrors,
  factoryWhoseOpenThrows,
  failFirstOpen,
  requestError,
  type WriteOp,
} from "../test/faultyIndexedDb";
import {
  createFixedClock,
  createStubStorage,
  freshFactory,
} from "../test/fakes";
import {
  type IndexedDbNoteRepositoryOptions,
  createIndexedDbNoteRepository,
} from "./indexedDbNoteRepository";

function repoOver(
  getFactory: IndexedDbNoteRepositoryOptions["indexedDB"],
): NoteRepository {
  const storage = createStubStorage();
  return createIndexedDbNoteRepository({
    indexedDB: getFactory,
    storage: () => storage,
    now: createFixedClock(1000),
  });
}

async function rejection(promise: Promise<unknown>): Promise<NoteStorageError> {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(NoteStorageError);
  return error as NoteStorageError;
}

const quota = () => new DOMException("over quota", "QuotaExceededError");

describe("failure paths", () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  const writes: [
    WriteOp,
    (repo: NoteRepository, note: Note) => Promise<unknown>,
  ][] = [
    ["create", (repo) => repo.create({ title: "new", body: "n" })],
    [
      "update",
      (repo, note) => repo.update(note.id, { title: "changed", body: "c" }),
    ],
    ["delete", (repo, note) => repo.delete(note.id)],
  ];
  for (const [op, write] of writes) {
    it(`a ${op} that aborts after its request succeeds rejects and leaves nothing changed (AC-29)`, async () => {
      const factory = freshFactory();
      const clean = repoOver(() => factory);
      const existing = await clean.create({ title: "old", body: "o" });
      const faulty = repoOver(() => abortAfterWrite(factory, op));
      const error = await rejection(write(faulty, existing));
      expect(error).toBeInstanceOf(StorageUnavailableError);
      expect(await repoOver(() => factory).list()).toEqual([existing]);
    });
  }

  const unavailableCases: [
    string,
    () => IndexedDbNoteRepositoryOptions["indexedDB"],
    string | null,
  ][] = [
    ["(a) no indexedDB global", () => () => undefined, null],
    [
      "(b) reading the global throws SecurityError",
      () => () => {
        throw new DOMException("denied", "SecurityError");
      },
      "SecurityError",
    ],
    [
      "(c) open() throws InvalidStateError",
      () => {
        const factory = factoryWhoseOpenThrows(
          new DOMException("bad", "InvalidStateError"),
        );
        return () => factory;
      },
      "InvalidStateError",
    ],
    [
      "(d) the open request fires error with SecurityError",
      () => {
        const factory = factoryWhoseOpenErrors(
          new DOMException("denied", "SecurityError"),
        );
        return () => factory;
      },
      "SecurityError",
    ],
    [
      "(e) the open request fires blocked and never succeeds",
      () => {
        const factory = factoryWhoseOpenBlocks();
        return () => factory;
      },
      null,
    ],
  ];
  for (const [label, makeGetter, causeName] of unavailableCases) {
    it(`unavailable IndexedDB rejects list and create: ${label} (AC-30)`, async () => {
      const repo = repoOver(makeGetter());
      for (const call of [
        () => repo.list(),
        () => repo.create({ title: "t", body: "b" }),
      ]) {
        const error = await rejection(call());
        expect(error).toBeInstanceOf(StorageUnavailableError);
        expect(error.kind).toBe("unavailable");
        if (causeName === null) {
          expect(error.cause).toBeUndefined();
        } else {
          expect((error.cause as DOMException).name).toBe(causeName);
        }
      }
    });
  }

  it("quota errors map to QuotaExceededError and write nothing on create (AC-31)", async () => {
    const factory = freshFactory();
    const faulty = repoOver(() => abortWith(factory, "create", quota()));
    const error = await rejection(faulty.create({ title: "t", body: "b" }));
    expect(error).toBeInstanceOf(QuotaExceededError);
    expect(error.kind).toBe("quota-exceeded");
    expect((error.cause as DOMException).name).toBe("QuotaExceededError");
    expect(await repoOver(() => factory).list()).toEqual([]);
  });

  it("a quota error on an update's put request maps to QuotaExceededError and keeps old values (AC-31)", async () => {
    const factory = freshFactory();
    const existing = await repoOver(() => factory).create({
      title: "old",
      body: "o",
    });
    const faulty = repoOver(() => requestError(factory, "update", quota()));
    const error = await rejection(
      faulty.update(existing.id, { title: "new", body: "n" }),
    );
    expect(error).toBeInstanceOf(QuotaExceededError);
    expect((error.cause as DOMException).name).toBe("QuotaExceededError");
    expect(await repoOver(() => factory).get(existing.id)).toEqual(existing);
  });

  it("a failed open is not cached; the next call reopens (AC-32)", async () => {
    const factory = failFirstOpen(freshFactory());
    const repo = repoOver(() => factory);
    expect(await rejection(repo.list())).toBeInstanceOf(
      StorageUnavailableError,
    );
    await expect(repo.list()).resolves.toEqual([]);
    expect(factory.open).toHaveBeenCalledTimes(2);
  });

  it("no fallback storage: localStorage, sessionStorage, cookies and caches untouched (AC-33-NS)", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const cookie = vi.spyOn(Document.prototype, "cookie", "set");
    const cachesBefore = "caches" in globalThis ? await caches.keys() : [];

    const unavailable = repoOver(() => undefined);
    await rejection(unavailable.create({ title: "t", body: "b" }));

    const repo = repoOver(() => freshFactory());
    const note = await repo.create({ title: "t", body: "b" });
    await repo.get(note.id);
    await repo.update(note.id, { title: "u", body: "b" });
    await repo.list();
    await repo.delete(note.id);

    expect(setItem).not.toHaveBeenCalled();
    expect(cookie).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(document.cookie).toBe("");
    if ("caches" in globalThis) {
      expect(await caches.keys()).toEqual(cachesBefore);
    }
  });

  it("errors and console never contain note text (AC-34)", async () => {
    const methods = ["log", "info", "warn", "error", "debug"] as const;
    const spies = methods.map((method) => vi.spyOn(console, method));
    const title = "SECRET-TITLE".padEnd(201, "t");
    const body = "SECRET-BODY".padEnd(100_001, "b");

    const errors: NoteStorageError[] = [];
    errors.push(
      await rejection(repoOver(() => freshFactory()).create({ title, body })),
    );
    const factory = freshFactory();
    const okTitle = title.slice(0, 200);
    const okBody = body.slice(0, 100_000);
    errors.push(
      await rejection(
        repoOver(() => abortWith(factory, "create", quota())).create({
          title: okTitle,
          body: okBody,
        }),
      ),
    );
    const existing = await repoOver(() => factory).create({
      title: "plain",
      body: "p",
    });
    errors.push(
      await rejection(
        repoOver(() => requestError(factory, "update", quota())).update(
          existing.id,
          {
            title: okTitle,
            body: okBody,
          },
        ),
      ),
    );

    expect(errors.map((e) => e.kind)).toEqual([
      "validation",
      "quota-exceeded",
      "quota-exceeded",
    ]);
    for (const error of errors) {
      const own = Object.fromEntries(
        Object.getOwnPropertyNames(error).map((key) => [
          key,
          (error as unknown as Record<string, unknown>)[key],
        ]),
      );
      expect(error.message).not.toContain("SECRET");
      expect(JSON.stringify(own)).not.toContain("SECRET");
      expect(String(error)).not.toContain("SECRET");
    }
    for (const spy of spies) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain("SECRET");
    }
  });
});
