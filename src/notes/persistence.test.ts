import { describe, expect, it, vi } from "vitest";
import { createStubStorage, flushTasks } from "../test/fakes";
import { createPersistencePolicy } from "./persistence";

describe("persistence policy", () => {
  it("requestOnce asks persisted, then persist, at most once", async () => {
    const storage = createStubStorage();
    const policy = createPersistencePolicy(() => storage);
    policy.requestOnce();
    policy.requestOnce();
    await flushTasks();
    policy.requestOnce();
    await flushTasks();
    expect(storage.persisted).toHaveBeenCalledTimes(1);
    expect(storage.persist).toHaveBeenCalledTimes(1);
  });

  it("does not call persist when already persisted", async () => {
    const storage = createStubStorage({ persisted: "true" });
    const policy = createPersistencePolicy(() => storage);
    policy.requestOnce();
    await flushTasks();
    expect(storage.persist).not.toHaveBeenCalled();
  });

  it("never throws, whatever the storage manager does", async () => {
    const throwingGetter = createPersistencePolicy(() => {
      throw new Error("no access");
    });
    expect(() => throwingGetter.requestOnce()).not.toThrow();
    await expect(throwingGetter.isPersisted()).resolves.toBe(false);
    for (const persist of ["reject", "throw", "pending"] as const) {
      const policy = createPersistencePolicy(() =>
        createStubStorage({ persist }),
      );
      expect(() => policy.requestOnce()).not.toThrow();
    }
    await flushTasks();
  });

  it("does nothing until asked", () => {
    const getStorage = vi.fn(() => createStubStorage());
    createPersistencePolicy(getStorage);
    expect(getStorage).not.toHaveBeenCalled();
  });

  it("isPersisted is true only for a true result", async () => {
    const results = await Promise.all(
      (["true", "false", "reject", "throw", "missing"] as const).map(
        (persisted) =>
          createPersistencePolicy(() =>
            createStubStorage({ persisted }),
          ).isPersisted(),
      ),
    );
    expect(results).toEqual([true, false, false, false, false]);
    await expect(
      createPersistencePolicy(() => undefined).isPersisted(),
    ).resolves.toBe(false);
  });
});
