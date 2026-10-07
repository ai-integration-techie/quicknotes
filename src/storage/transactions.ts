/**
 * Transaction-to-promise helpers (note-storage R18, R19, R21, R22).
 * A call resolves only on the transaction's `complete` event; an error or
 * abort rejects with a typed error. `work` returns a settle function that
 * runs after commit, so a not-found decided inside a transaction rejects
 * only after a clean, write-free commit.
 */
import {
  type NoteStorageError,
  QuotaExceededError,
  StorageUnavailableError,
} from "../notes/errors";
import { STORE } from "./schema";

export type Settle<T> = () => T;
export type Work<T> = (store: IDBObjectStore) => Settle<T>;

/** Quota failures by DOMException name; everything else is "unavailable". */
export function toStorageError(error: unknown): NoteStorageError {
  const name =
    typeof error === "object" && error !== null
      ? (error as { name?: unknown }).name
      : undefined;
  return name === "QuotaExceededError"
    ? new QuotaExceededError({ cause: error })
    : new StorageUnavailableError({ cause: error });
}

function run<T>(open: () => IDBTransaction, work: Work<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    let tx: IDBTransaction | undefined;
    let settle: Settle<T>;
    try {
      tx = open();
      settle = work(tx.objectStore(STORE));
    } catch (error) {
      try {
        tx?.abort();
      } catch {
        // The transaction may already be finished; the error below is the one to report.
      }
      reject(toStorageError(error));
      return;
    }
    const transaction = tx;
    transaction.addEventListener("complete", () => {
      try {
        resolve(settle());
      } catch (error) {
        reject(error);
      }
    });
    // An unhandled request error always aborts the transaction, and
    // `transaction.error` is only set by then, so `abort` is the one signal.
    transaction.addEventListener("abort", () => {
      reject(toStorageError(transaction.error));
    });
  });
}

/** One read-write transaction with strict durability where supported. */
export function runWrite<T>(db: IDBDatabase, work: Work<T>): Promise<T> {
  return run(
    () => db.transaction(STORE, "readwrite", { durability: "strict" }),
    work,
  );
}

/** One read-only transaction. */
export function runRead<T>(db: IDBDatabase, work: Work<T>): Promise<T> {
  return run(() => db.transaction(STORE, "readonly"), work);
}
