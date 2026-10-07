/** List order and the updatedAt rule (note-storage R14, R17). */
import type { Note } from "./note";

/** updatedAt descending, then id ascending by plain string comparison. */
export function compareForList(a: Note, b: Note): number {
  if (a.updatedAt !== b.updatedAt) return b.updatedAt - a.updatedAt;
  if (a.id < b.id) return -1;
  return a.id > b.id ? 1 : 0;
}

/** updatedAt always moves forward, even within one millisecond or when the clock goes back. */
export function nextUpdatedAt(now: number, previous: number): number {
  return Math.max(now, previous + 1);
}

/** A fresh plain note holding exactly the five model fields (R1, R3). */
export function toNote(record: Note): Note {
  return {
    id: record.id,
    title: record.title,
    body: record.body,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/** A new array of fresh notes in list order. */
export function sortForList(records: readonly Note[]): Note[] {
  return records.map(toNote).sort(compareForList);
}
