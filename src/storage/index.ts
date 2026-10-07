/**
 * The public storage entry point for UI code (note-storage R29). Importing
 * this module or calling `getNoteRepository()` touches neither the
 * database nor `navigator.storage` (R25); the database opens at the first
 * repository call.
 */
import type { NoteRepository } from "../notes/note";
import { createIndexedDbNoteRepository } from "./indexedDbNoteRepository";

let shared: NoteRepository | undefined;

/** The one repository instance for this page load (a launch). */
export function getNoteRepository(): NoteRepository {
  shared ??= createIndexedDbNoteRepository();
  return shared;
}

export type {
  Clock,
  IdGenerator,
  Note,
  NoteInput,
  NoteRepository,
  StorageManagerLike,
} from "../notes/note";
export {
  NoteStorageError,
  NotFoundError,
  QuotaExceededError,
  StorageUnavailableError,
  ValidationError,
  type NoteStorageErrorKind,
  type ValidationIssue,
} from "../notes/errors";
export {
  BODY_MAX_CHARS,
  TITLE_MAX_CHARS,
  countCharacters,
} from "../notes/validation";
