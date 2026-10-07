/**
 * The note model and the repository contract (note-storage R1, R12-R17, R33).
 * This module, like everything in src/notes/, is storage-engine free (R36).
 */

/** A stored note. Returned notes are fresh plain objects (R3). */
export interface Note {
  /** UUID v4, canonical lowercase form. */
  readonly id: string;
  /** At most 200 code points. */
  readonly title: string;
  /** At most 100,000 code points. */
  readonly body: string;
  /** Integer milliseconds since the Unix epoch (UTC). */
  readonly createdAt: number;
  /** Integer milliseconds since the Unix epoch (UTC). */
  readonly updatedAt: number;
}

/** The editable fields. Create and update read only these two (R11). */
export interface NoteInput {
  readonly title: string;
  readonly body: string;
}

export interface NoteRepository {
  create(input: NoteInput): Promise<Note>;
  get(id: string): Promise<Note>;
  update(id: string, input: NoteInput): Promise<Note>;
  delete(id: string): Promise<void>;
  /** A new array, sorted by updatedAt descending, then id ascending. */
  list(): Promise<Note[]>;
  /** Never rejects. */
  isPersisted(): Promise<boolean>;
}

export type Clock = () => number;
export type IdGenerator = () => string;

/** The part of the browser's StorageManager this layer uses. */
export interface StorageManagerLike {
  persisted?: () => Promise<boolean>;
  persist?: () => Promise<boolean>;
}
