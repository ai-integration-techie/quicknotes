import { afterEach, describe, expect, it, vi } from "vitest";
import { StorageUnavailableError } from "../notes/errors";
import {
  createStubStorage,
  freshFactory,
  installNavigatorStorage,
  openDirect,
  spyOnOpen,
} from "../test/fakes";
import { createIndexedDbNoteRepository } from "./indexedDbNoteRepository";

let uninstall: (() => void) | undefined;

afterEach(() => {
  uninstall?.();
  uninstall = undefined;
  vi.unstubAllGlobals();
});

describe("lazy open and shared repository", () => {
  it("importing and getting the shared repository touches nothing; first list opens once (AC-35)", async () => {
    const factory = freshFactory();
    const open = spyOnOpen(factory);
    const storage = createStubStorage();
    uninstall = installNavigatorStorage(storage);
    vi.stubGlobal("indexedDB", factory);
    vi.resetModules();

    const storageModule = await import("./index");
    const first = storageModule.getNoteRepository();
    const second = storageModule.getNoteRepository();
    expect(second).toBe(first);
    expect(open).not.toHaveBeenCalled();
    expect(storage.persisted).not.toHaveBeenCalled();
    expect(storage.persist).not.toHaveBeenCalled();

    await expect(first.list()).resolves.toEqual([]);
    expect(open).toHaveBeenCalledTimes(1);
    expect(storage.persisted).not.toHaveBeenCalled();
  });

  it("the default getters read the globals at call time", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const repo = createIndexedDbNoteRepository();
    await expect(repo.list()).rejects.toBeInstanceOf(StorageUnavailableError);
    await expect(repo.isPersisted()).resolves.toBe(false);
    vi.stubGlobal("indexedDB", freshFactory());
    await expect(repo.list()).resolves.toEqual([]);
  });

  it("concurrent first calls share one open request (AC-36)", async () => {
    const factory = freshFactory();
    const open = spyOnOpen(factory);
    const repo = createIndexedDbNoteRepository({
      indexedDB: () => factory,
      storage: () => createStubStorage(),
    });
    const results = await Promise.allSettled([
      repo.create({ title: "t", body: "b" }),
      repo.list(),
      repo.get("3f2b8c1e-7a4d-4e2b-9c1f-0a1b2c3d4e5f"),
    ]);
    expect(results.map((r) => r.status)).toEqual([
      "fulfilled",
      "fulfilled",
      "rejected",
    ]);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("versionchange closes the connection; the next list rejects unavailable instead of hanging (AC-39)", async () => {
    const factory = freshFactory();
    const repo = createIndexedDbNoteRepository({
      indexedDB: () => factory,
      storage: () => createStubStorage(),
    });
    await repo.list();
    const blocked = vi.fn();
    const newer = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open("quicknotes", 2);
      request.onblocked = blocked;
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    expect(blocked).not.toHaveBeenCalled();
    expect(newer.version).toBe(2);
    newer.close();
    await expect(repo.list()).rejects.toBeInstanceOf(StorageUnavailableError);
    // The database itself is intact at the newer version.
    const direct = await openDirect(factory);
    expect(direct.version).toBe(2);
    direct.close();
  });
});
