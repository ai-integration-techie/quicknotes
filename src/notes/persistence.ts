/**
 * The persistent-storage policy (note-storage R30-R33). At most one
 * persisted() + persist() attempt per repository instance (one launch),
 * fire-and-forget: a save never waits for it and it never produces an error.
 */
import type { StorageManagerLike } from "./note";

export interface PersistencePolicy {
  /** Starts the launch's single request, if not made yet. Returns at once. */
  requestOnce(): void;
  /** True only when persisted() resolves true. Never rejects, never persists. */
  isPersisted(): Promise<boolean>;
}

export function createPersistencePolicy(
  getStorage: () => StorageManagerLike | undefined,
): PersistencePolicy {
  let attempted = false;

  async function request(): Promise<void> {
    try {
      const storage = getStorage();
      if (!storage?.persisted) return;
      if ((await storage.persisted()) !== true) await storage.persist?.();
    } catch {
      // R32: persistence outcomes never reach the save.
    }
  }

  return {
    requestOnce() {
      if (attempted) return;
      attempted = true;
      void request();
    },
    async isPersisted() {
      try {
        const storage = getStorage();
        if (!storage?.persisted) return false;
        return (await storage.persisted()) === true;
      } catch {
        return false;
      }
    },
  };
}
