import { IDBDatabase } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import { StorageUnavailableError } from "../notes/errors";
import {
  createFixedClock,
  createStubStorage,
  fixedId,
  freshFactory,
  openDirect,
  requestResult,
  sequentialIds,
  spyOnOpen,
} from "../test/fakes";
import {
  type IndexedDbNoteRepositoryOptions,
  createIndexedDbNoteRepository,
} from "./indexedDbNoteRepository";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function setup(options: IndexedDbNoteRepositoryOptions = {}) {
  const factory = freshFactory();
  const storage = createStubStorage();
  const make = (extra: IndexedDbNoteRepositoryOptions = {}) =>
    createIndexedDbNoteRepository({
      indexedDB: () => factory,
      storage: () => storage,
      now: createFixedClock(1000),
      ...options,
      ...extra,
    });
  return { factory, storage, repo: make(), make };
}

describe("IndexedDB note repository", () => {
  it("default id generator gives 1,000 distinct v4 ids (AC-2)", async () => {
    const { repo } = setup();
    const notes = await Promise.all(
      Array.from({ length: 1000 }, (_, i) =>
        repo.create({ title: `n${i}`, body: "" }),
      ),
    );
    const ids = notes.map((note) => note.id);
    expect(new Set(ids).size).toBe(1000);
    expect(ids.every((id) => UUID_V4.test(id))).toBe(true);
  });

  it("create never overwrites: duplicate generated id rejects StorageUnavailableError (AC-4)", async () => {
    const id = "00000000-0000-4000-8000-000000000001";
    const { repo } = setup({ newId: sequentialIds(id, id) });
    await repo.create({ title: "first", body: "one" });
    const error = await repo
      .create({ title: "second", body: "two" })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(StorageUnavailableError);
    expect(await repo.get(id)).toMatchObject({ title: "first", body: "one" });
  });

  it("invalid create never opens the database or requests persistence (AC-16)", async () => {
    const { factory, storage, repo } = setup();
    const open = spyOnOpen(factory);
    await expect(repo.create({ title: "", body: "" })).rejects.toThrow();
    await expect(
      repo.create({ title: "a".repeat(201), body: "x" }),
    ).rejects.toThrow();
    expect(open).not.toHaveBeenCalled();
    expect(storage.persisted).not.toHaveBeenCalled();
    expect(storage.persist).not.toHaveBeenCalled();
  });

  it("delete removes the record from the notes store (count 0, no tombstone) (AC-25)", async () => {
    const { factory, repo } = setup();
    const note = await repo.create({ title: "gone", body: "" });
    await repo.delete(note.id);
    const db = await openDirect(factory);
    try {
      const store = db.transaction("notes", "readonly").objectStore("notes");
      const count = requestResult(store.count());
      const record = requestResult(store.get(note.id));
      const all = requestResult(store.getAll());
      expect(await count).toBe(0);
      expect(await record).toBeUndefined();
      expect(await all).toEqual([]);
    } finally {
      db.close();
    }
  });

  it("database is quicknotes v1 with exactly the notes store keyed by id; reopening keeps notes (AC-37)", async () => {
    const { factory, repo, make } = setup();
    const note = await repo.create({ title: "kept", body: "" });
    const db = await openDirect(factory);
    try {
      expect(db.name).toBe("quicknotes");
      expect(db.version).toBe(1);
      expect([...db.objectStoreNames]).toEqual(["notes"]);
      const store = db.transaction("notes", "readonly").objectStore("notes");
      expect(store.keyPath).toBe("id");
    } finally {
      db.close();
    }
    await expect(make().list()).resolves.toEqual([note]);
  });

  it("a new instance over the same factory after close lists identical notes (AC-38)", async () => {
    const { factory, make } = setup();
    const open = spyOnOpen(factory);
    const clock = createFixedClock(1000);
    const first = make({ now: clock });
    const a = await first.create({ title: "a", body: "1" });
    clock.set(2000);
    const b = await first.create({ title: "b", body: "2\r\n" });
    const request = open.mock.results[0]?.value as IDBOpenDBRequest;
    request.result.close();
    expect(await make().list()).toEqual([b, a]);
  });

  it("write transactions request strict durability (R19)", async () => {
    const { repo } = setup();
    const note = await repo.create({ title: "t", body: "b" });
    const transaction = vi.spyOn(IDBDatabase.prototype, "transaction");
    await repo.update(note.id, { title: "u", body: "b" });
    await repo.delete(note.id);
    expect(transaction.mock.calls).toEqual([
      ["notes", "readwrite", { durability: "strict" }],
      ["notes", "readwrite", { durability: "strict" }],
    ]);
  });

  it("update reads and writes in one readwrite transaction (R14)", async () => {
    const { repo } = setup();
    const note = await repo.create({ title: "t", body: "b" });
    const transaction = vi.spyOn(IDBDatabase.prototype, "transaction");
    await repo.update(note.id, { title: "u", body: "b" });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(transaction.mock.calls[0]?.[1]).toBe("readwrite");
  });

  it("get and list use one readonly transaction each", async () => {
    const { repo } = setup({ newId: sequentialIds(fixedId(1)) });
    await repo.create({ title: "t", body: "b" });
    const transaction = vi.spyOn(IDBDatabase.prototype, "transaction");
    await repo.get(fixedId(1));
    await repo.list();
    expect(transaction.mock.calls.map((call) => call[1])).toEqual([
      "readonly",
      "readonly",
    ]);
  });
});
