/**
 * The lazily opened, shared database connection (note-storage R21, R23,
 * R25, R26, R28).
 * - Nothing opens until the first `open()` call.
 * - Concurrent callers share one open request; a tab holds at most one connection.
 * - A failed open is never cached: the next call opens again.
 * - On `versionchange` the connection closes so another tab isn't blocked.
 */
import { StorageUnavailableError } from "../notes/errors";
import { DB_NAME, DB_VERSION, upgrade } from "./schema";

export interface Connection {
  open(): Promise<IDBDatabase>;
}

export type FactoryGetter = () => IDBFactory | undefined;

function unavailable(cause: unknown): StorageUnavailableError {
  return new StorageUnavailableError({ cause });
}

function startOpen(getFactory: FactoryGetter): IDBOpenDBRequest {
  let factory: IDBFactory | undefined;
  try {
    factory = getFactory();
  } catch (error) {
    throw unavailable(error);
  }
  if (!factory) throw new StorageUnavailableError();
  try {
    return factory.open(DB_NAME, DB_VERSION);
  } catch (error) {
    throw unavailable(error);
  }
}

function openDatabase(
  getFactory: FactoryGetter,
  onOpen: (db: IDBDatabase) => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = startOpen(getFactory);
    let settled = false;

    request.addEventListener("upgradeneeded", () => {
      try {
        upgrade(request.result);
      } catch {
        request.transaction?.abort();
      }
    });
    request.addEventListener("success", () => {
      const db = request.result;
      if (settled) {
        // Succeeded after we gave up (blocked): never hold a second connection.
        db.close();
        return;
      }
      settled = true;
      onOpen(db);
      resolve(db);
    });
    request.addEventListener("error", () => {
      if (settled) return;
      settled = true;
      reject(unavailable(request.error));
    });
    request.addEventListener("blocked", () => {
      if (settled) return;
      settled = true;
      reject(new StorageUnavailableError());
    });
  });
}

export function createConnection(getFactory: FactoryGetter): Connection {
  let current: Promise<IDBDatabase> | undefined;

  function forget(pending: Promise<IDBDatabase>): void {
    if (current === pending) current = undefined;
  }

  return {
    open() {
      if (current) return current;
      const pending: Promise<IDBDatabase> = openDatabase(getFactory, (db) => {
        db.addEventListener("versionchange", () => {
          db.close();
          forget(pending);
        });
        db.addEventListener("close", () => forget(pending));
      });
      current = pending;
      pending.catch(() => forget(pending));
      return pending;
    },
  };
}
