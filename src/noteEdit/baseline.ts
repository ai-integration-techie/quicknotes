/**
 * The values the edit fields hold right after they are filled
 * (edit-delete-note R5, plan D5). These are the HTML value-sanitisation
 * rules: a text input drops line breaks, and a textarea's API value
 * normalises CRLF and CR to LF. For every note made in the app both are
 * the identity.
 */
import type { Note } from "../storage";

export interface Baseline {
  readonly title: string;
  readonly body: string;
}

export function baselineOf(note: Pick<Note, "title" | "body">): Baseline {
  return {
    title: note.title.replace(/[\r\n]/gu, ""),
    body: note.body.replace(/\r\n?/gu, "\n"),
  };
}

/** R17: an edit has unsaved changes when either field differs from its baseline. */
export function differsFrom(baseline: Baseline, values: Baseline): boolean {
  return values.title !== baseline.title || values.body !== baseline.body;
}
