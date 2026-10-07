/**
 * The browser NoteRepository (note-storage R12-R19, R25, R30-R33, R38).
 * Every dependency is injectable; the defaults read the browser globals
 * lazily, at call time, never at import or construction time.
 */
import {
  NoteStorageError,
  NotFoundError,
  StorageUnavailableError,
} from "../notes/errors";
import type {
  Clock,
  IdGenerator,
  Note,
  NoteRepository,
  StorageManagerLike,
} from "../notes/note";
import { nextUpdatedAt, sortForList, toNote } from "../notes/ordering";
import { createPersistencePolicy } from "../notes/persistence";
import {
  validateId,
  validateNoteInput,
  validateUpdate,
} from "../notes/validation";
import { createConnection } from "./connection";
import { runRead, runWrite } from "./transactions";

export interface IndexedDbNoteRepositoryOptions {
  /** Default: `() => globalThis.indexedDB`, read on each open; may throw. */
  indexedDB?: () => IDBFactory | undefined;
  /** Default: `() => globalThis.navigator?.storage`. */
  storage?: () => StorageManagerLike | undefined;
  /** Default: `Date.now`. */
  now?: Clock;
  /** Default: `crypto.randomUUID()`. */
  newId?: IdGenerator;
}

/** R20: the repository only ever rejects with a NoteStorageError. */
async function guarded<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof NoteStorageError) throw error;
    throw new StorageUnavailableError({ cause: error });
  }
}

export function createIndexedDbNoteRepository(
  options: IndexedDbNoteRepositoryOptions = {},
): NoteRepository {
  const getFactory = options.indexedDB ?? (() => globalThis.indexedDB);
  const getStorage = options.storage ?? (() => globalThis.navigator?.storage);
  const now = options.now ?? (() => Date.now());
  const newId = options.newId ?? (() => crypto.randomUUID());
  const connection = createConnection(getFactory);
  const persistence = createPersistencePolicy(getStorage);

  return {
    create(input) {
      return guarded(async () => {
        const { title, body } = validateNoteInput(input);
        persistence.requestOnce();
        const db = await connection.open();
        const time = now();
        const note: Note = {
          id: newId(),
          title,
          body,
          createdAt: time,
          updatedAt: time,
        };
        return runWrite(db, (store) => {
          store.add(note);
          return () => toNote(note);
        });
      });
    },

    get(id) {
      return guarded(async () => {
        const key = validateId(id);
        const db = await connection.open();
        return runRead(db, (store) => {
          const request = store.get(key);
          return () => {
            const record = request.result as Note | undefined;
            if (record === undefined) throw new NotFoundError();
            return toNote(record);
          };
        });
      });
    },

    update(id, input) {
      return guarded(async () => {
        const valid = validateUpdate(id, input);
        persistence.requestOnce();
        const db = await connection.open();
        return runWrite(db, (store) => {
          let next: Note | undefined;
          const request = store.get(valid.id);
          request.addEventListener("success", () => {
            const previous = request.result as Note | undefined;
            if (previous === undefined) return;
            next = {
              id: previous.id,
              title: valid.input.title,
              body: valid.input.body,
              createdAt: previous.createdAt,
              updatedAt: nextUpdatedAt(now(), previous.updatedAt),
            };
            store.put(next);
          });
          return () => {
            if (next === undefined) throw new NotFoundError();
            return toNote(next);
          };
        });
      });
    },

    delete(id) {
      return guarded(async () => {
        const key = validateId(id);
        const db = await connection.open();
        return runWrite(db, (store) => {
          let found = false;
          const request = store.count(key);
          request.addEventListener("success", () => {
            found = request.result > 0;
            if (found) store.delete(key);
          });
          return () => {
            if (!found) throw new NotFoundError();
          };
        });
      });
    },

    list() {
      return guarded(async () => {
        const db = await connection.open();
        return runRead(db, (store) => {
          const request = store.getAll();
          return () => sortForList(request.result as Note[]);
        });
      });
    },

    isPersisted() {
      return persistence.isPersisted();
    },
  };
}
