/**
 * The in-memory NoteRepository test double (note-storage R37). It shares
 * the domain modules with the browser implementation and passes the same
 * contract suite. Test support only: never reachable from the live app
 * (R23, AC-53).
 */
import { NotFoundError, StorageUnavailableError } from "../notes/errors";
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

export interface InMemoryNoteRepositoryOptions {
  now?: Clock;
  newId?: IdGenerator;
  storage?: () => StorageManagerLike | undefined;
  /** Share one map between instances to model "a new launch over the same storage". */
  records?: Map<string, Note>;
}

export function createInMemoryNoteRepository(
  options: InMemoryNoteRepositoryOptions = {},
): NoteRepository {
  const now = options.now ?? (() => Date.now());
  const newId = options.newId ?? (() => crypto.randomUUID());
  const records = options.records ?? new Map<string, Note>();
  const persistence = createPersistencePolicy(
    options.storage ?? (() => undefined),
  );

  function find(id: string): Note {
    const record = records.get(id);
    if (record === undefined) throw new NotFoundError();
    return record;
  }

  return {
    async create(input) {
      const { title, body } = validateNoteInput(input);
      persistence.requestOnce();
      const time = now();
      const note: Note = {
        id: newId(),
        title,
        body,
        createdAt: time,
        updatedAt: time,
      };
      // Like an IndexedDB `add`: never overwrite an existing record.
      if (records.has(note.id)) throw new StorageUnavailableError();
      records.set(note.id, toNote(note));
      return toNote(note);
    },

    async get(id) {
      return toNote(find(validateId(id)));
    },

    async update(id, input) {
      const valid = validateUpdate(id, input);
      persistence.requestOnce();
      const previous = find(valid.id);
      const next: Note = {
        id: previous.id,
        title: valid.input.title,
        body: valid.input.body,
        createdAt: previous.createdAt,
        updatedAt: nextUpdatedAt(now(), previous.updatedAt),
      };
      records.set(next.id, toNote(next));
      return toNote(next);
    },

    async delete(id) {
      const key = validateId(id);
      find(key);
      records.delete(key);
    },

    async list() {
      return sortForList([...records.values()]);
    },

    isPersisted() {
      return persistence.isPersisted();
    },
  };
}
