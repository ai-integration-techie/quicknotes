import { describe, expect, it } from "vitest";
import type { StorageManagerLike } from "../notes/note";
import {
  type StubStorage,
  createFixedClock,
  createStubStorage,
  flushTasks,
  freshFactory,
  spyOnOpen,
} from "../test/fakes";
import { createIndexedDbNoteRepository } from "./indexedDbNoteRepository";

function launch(factory: IDBFactory, storage: StorageManagerLike | undefined) {
  return createIndexedDbNoteRepository({
    indexedDB: () => factory,
    storage: () => storage,
    now: createFixedClock(1000),
  });
}

describe("persistent storage request", () => {
  it("first create calls persisted then persist once per launch (AC-41)", async () => {
    const storage = createStubStorage();
    const repo = launch(freshFactory(), storage);
    const first = repo.create({ title: "1", body: "" });
    expect(storage.persisted).toHaveBeenCalledTimes(1);
    const note = await first;
    await flushTasks();
    expect(storage.persist).toHaveBeenCalledTimes(1);
    await repo.create({ title: "2", body: "" });
    await repo.update(note.id, { title: "1b", body: "" });
    await flushTasks();
    expect(storage.persisted).toHaveBeenCalledTimes(1);
    expect(storage.persist).toHaveBeenCalledTimes(1);
  });

  it("already persisted: persist is never called (AC-42)", async () => {
    const storage = createStubStorage({ persisted: "true" });
    await launch(freshFactory(), storage).create({ title: "t", body: "" });
    await flushTasks();
    expect(storage.persisted).toHaveBeenCalledTimes(1);
    expect(storage.persist).not.toHaveBeenCalled();
  });

  it("a new launch asks again (AC-43)", async () => {
    const factory = freshFactory();
    const storage = createStubStorage();
    const note = await launch(factory, storage).create({
      title: "t",
      body: "",
    });
    await flushTasks();
    expect(storage.persist).toHaveBeenCalledTimes(1);

    await launch(factory, storage).update(note.id, { title: "u", body: "" });
    await flushTasks();
    expect(storage.persisted).toHaveBeenCalledTimes(2);
    expect(storage.persist).toHaveBeenCalledTimes(2);

    await launch(factory, storage).create({ title: "v", body: "" });
    await flushTasks();
    expect(storage.persisted).toHaveBeenCalledTimes(3);
    expect(storage.persist).toHaveBeenCalledTimes(3);
  });

  it("reads, delete, isPersisted and invalid creates never call persist (AC-44)", async () => {
    const factory = freshFactory();
    const seedStorage = createStubStorage();
    const a = await launch(factory, seedStorage).create({
      title: "a",
      body: "",
    });
    const b = await launch(factory, seedStorage).create({
      title: "b",
      body: "",
    });

    const storage = createStubStorage();
    const repo = launch(factory, storage);
    await repo.list();
    await repo.get(a.id);
    await repo.delete(b.id);
    await repo.isPersisted();
    await expect(repo.create({ title: "", body: "" })).rejects.toThrow();
    await flushTasks();
    expect(storage.persist).not.toHaveBeenCalled();
    expect(storage.persisted).toHaveBeenCalledTimes(1);

    await repo.create({ title: "valid", body: "" });
    await flushTasks();
    expect(storage.persist).toHaveBeenCalledTimes(1);
  });

  const failing: ["pending" | "reject" | "throw", string][] = [
    ["pending", "never resolves"],
    ["reject", "rejects"],
    ["throw", "throws synchronously"],
  ];
  for (const [persist, label] of failing) {
    it(`save never waits for or fails on persist: persist ${label} (AC-45)`, async () => {
      const storage: StubStorage = createStubStorage({ persist });
      const repo = launch(freshFactory(), storage);
      const note = await repo.create({ title: "t", body: "b" });
      expect(note).toMatchObject({ title: "t", body: "b" });
      await flushTasks();
      expect(storage.persist).toHaveBeenCalledTimes(1);
      await expect(
        repo.update(note.id, { title: "u", body: "b" }),
      ).resolves.toBeDefined();
      await flushTasks();
    });
  }

  it("missing navigator.storage or missing persist doesn't affect saves (AC-46)", async () => {
    await expect(
      launch(freshFactory(), undefined).create({ title: "t", body: "" }),
    ).resolves.toBeDefined();
    const noPersist = createStubStorage({ persist: "missing" });
    await expect(
      launch(freshFactory(), noPersist).create({ title: "t", body: "" }),
    ).resolves.toBeDefined();
    await flushTasks();
    expect(noPersist.persisted).toHaveBeenCalledTimes(1);
  });

  const reports: [string, StubStorage | undefined, boolean][] = [
    ["persisted resolves true", createStubStorage({ persisted: "true" }), true],
    [
      "persisted resolves false",
      createStubStorage({ persisted: "false" }),
      false,
    ],
    ["persisted rejects", createStubStorage({ persisted: "reject" }), false],
    ["persisted throws", createStubStorage({ persisted: "throw" }), false],
    ["no storage manager", undefined, false],
  ];
  for (const [label, storage, expected] of reports) {
    it(`isPersisted maps every outcome to a boolean and never opens or persists: ${label} (AC-47)`, async () => {
      const factory = freshFactory();
      const open = spyOnOpen(factory);
      const repo = launch(factory, storage);
      await expect(repo.isPersisted()).resolves.toBe(expected);
      expect(open).not.toHaveBeenCalled();
      if (storage?.persist) expect(storage.persist).not.toHaveBeenCalled();
    });
  }
});
