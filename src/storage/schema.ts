/**
 * Database layout (note-storage R27). These names are a contract: any later
 * change to the stored shape MUST raise DB_VERSION and migrate existing
 * notes in `upgrade` so they stay readable.
 */
export const DB_NAME = "quicknotes";
export const DB_VERSION = 1;
export const STORE = "notes";

/** Creates the notes store only if it doesn't exist yet. */
export function upgrade(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(STORE)) {
    db.createObjectStore(STORE, { keyPath: "id" });
  }
}
