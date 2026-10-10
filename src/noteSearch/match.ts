/**
 * Search matching (search-notes R5-R9, plan D1). Pure and React-free: it
 * imports only the `Note` type, reads its inputs and never changes them.
 */
import type { Note } from "../storage";

interface Folded {
  readonly title: string;
  readonly body: string;
}

/** The Combining Diacritical Marks block, U+0300 to U+036F (R5). */
const COMBINING_MARKS = /[̀-ͯ]/gu;
const BLANK = /^\s*$/u;
const WHITESPACE = /\s+/u;

/**
 * Notes are immutable and an edit makes a new object, so a folded copy
 * keyed by the note object can never go stale (R8).
 */
const foldCache = new WeakMap<Note, Folded>();

/** Decompose, drop combining accents, lower-case, recompose (R5). */
export function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .normalize("NFC");
}

/** A query is blank when it is only whitespace, or empty (R6). */
export function isBlankQuery(query: string): boolean {
  return BLANK.test(query);
}

/** The distinct words of a query, in order; none for a blank query (R6). */
export function queryWords(query: string): string[] {
  if (isBlankQuery(query)) return [];
  return [...new Set(query.trim().split(WHITESPACE))];
}

function folded(note: Note): Folded {
  const cached = foldCache.get(note);
  if (cached) return cached;
  const fresh = { title: fold(note.title), body: fold(note.body) };
  foldCache.set(note, fresh);
  return fresh;
}

/** Folds any note not folded yet, so the first keystroke doesn't pay for it (D5). */
export function primeFolds(notes: readonly Note[]): void {
  for (const note of notes) folded(note);
}

/**
 * The notes that contain every word of the query in their title or body,
 * in the given order (R7). A blank query returns `notes` itself (R10).
 */
export function matchNotes(
  query: string,
  notes: readonly Note[],
): readonly Note[] {
  const words = queryWords(query).map(fold);
  if (words.length === 0) return notes;
  return notes.filter((note) => {
    const { title, body } = folded(note);
    return words.every((word) => title.includes(word) || body.includes(word));
  });
}
