import { describe, expect, it, vi } from "vitest";
import { StorageUnavailableError } from "../notes/errors";
import {
  factoryBlockedThenSucceeds,
  factoryWhoseOpenBlocks,
  factoryWhoseOpenErrors,
  factoryWhoseOpenThrows,
  failFirstOpen,
} from "../test/faultyIndexedDb";
import { flushTasks, freshFactory, openDirect, spyOnOpen } from "../test/fakes";
import { createConnection } from "./connection";

async function unavailable(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(StorageUnavailableError);
  return error as StorageUnavailableError;
}

describe("connection", () => {
  it("does not open until asked, then shares one open request", async () => {
    const factory = freshFactory();
    const open = spyOnOpen(factory);
    const connection = createConnection(() => factory);
    expect(open).not.toHaveBeenCalled();
    const [a, b] = await Promise.all([connection.open(), connection.open()]);
    expect(a).toBe(b);
    expect(await connection.open()).toBe(a);
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith("quicknotes", 1);
  });

  it("maps every open failure to StorageUnavailableError with its cause (AC-30)", async () => {
    const security = new DOMException("denied", "SecurityError");
    const invalid = new DOMException("bad state", "InvalidStateError");
    expect(
      (await unavailable(createConnection(() => undefined).open())).cause,
    ).toBeUndefined();
    const getterThrows = createConnection(() => {
      throw security;
    });
    expect((await unavailable(getterThrows.open())).cause).toBe(security);
    const throws = createConnection(() => factoryWhoseOpenThrows(invalid));
    expect((await unavailable(throws.open())).cause).toBe(invalid);
    const errors = createConnection(() => factoryWhoseOpenErrors(security));
    expect((await unavailable(errors.open())).cause).toBe(security);
    await unavailable(createConnection(() => factoryWhoseOpenBlocks()).open());
  });

  it("does not cache a failed open (AC-32)", async () => {
    const factory = failFirstOpen(freshFactory());
    const connection = createConnection(() => factory);
    await unavailable(connection.open());
    await expect(connection.open()).resolves.toBeDefined();
    expect(factory.open).toHaveBeenCalledTimes(2);
  });

  it("closes on versionchange and reopens next time, failing on a newer version (AC-39)", async () => {
    const factory = freshFactory();
    const connection = createConnection(() => factory);
    const first = await connection.open();
    const close = vi.spyOn(first, "close");
    const newer = await openDirect(factory, "quicknotes", 2);
    expect(close).toHaveBeenCalled();
    newer.close();
    const error = await unavailable(connection.open());
    expect((error.cause as DOMException).name).toBe("VersionError");
  });

  it("a blocked open that later succeeds is closed (R26)", async () => {
    const late = {
      close: vi.fn(),
      addEventListener: vi.fn(),
    };
    const connection = createConnection(() => factoryBlockedThenSucceeds(late));
    await unavailable(connection.open());
    await new Promise((resolve) => setTimeout(resolve, 20));
    await flushTasks();
    expect(late.close).toHaveBeenCalledTimes(1);
  });
});
