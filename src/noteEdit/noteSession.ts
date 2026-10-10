/**
 * The loaded note view as a small state machine (edit-delete-note plan,
 * Data model). Every action returns a new object; the input is never
 * changed. `now` is the updated line's "now", passed in by the caller.
 */
import type { Note } from "../storage";
import { baselineOf, type Baseline } from "./baseline";

export type DiscardReason = "cancel" | "back";

export type NoteSession =
  | {
      readonly mode: "reading";
      readonly note: Note;
      readonly now: number;
      /** The delete dialog (R24, R26, R27), or null. */
      readonly deleting: { readonly pending: boolean } | null;
    }
  | {
      readonly mode: "editing";
      readonly note: Note;
      readonly now: number;
      readonly baseline: Baseline;
      readonly saving: boolean;
      /** A save found the note deleted elsewhere (R15). */
      readonly noteGone: boolean;
      /** The discard dialog opened by Cancel or "Back to notes", or null. */
      readonly discard: DiscardReason | null;
    }
  /** R15: Cancel after "Changes not found" shows the not-found state. */
  | { readonly mode: "gone" };

export type SessionAction =
  | { readonly type: "edit" }
  | { readonly type: "cancel" }
  | { readonly type: "askDiscard"; readonly reason: DiscardReason }
  | { readonly type: "keepEditing" }
  | { readonly type: "discard" }
  | { readonly type: "saveStarted" }
  | { readonly type: "saved"; readonly note: Note; readonly now: number }
  | { readonly type: "saveFailed" }
  | { readonly type: "noChange" }
  | { readonly type: "notFound" }
  | { readonly type: "askDelete" }
  | { readonly type: "keepNote" }
  | { readonly type: "deleteStarted" }
  | { readonly type: "deleteFailed" }
  /** The delete settled and the view moves on: the dialog closes (R28). */
  | { readonly type: "deleteSettled" };

export function readingSession(note: Note, now: number): NoteSession {
  return { mode: "reading", note, now, deleting: null };
}

/** Leaving an edit without saving: the note as it was, or not found (R15, R18). */
function leaveEdit(state: Extract<NoteSession, { mode: "editing" }>) {
  return state.noteGone
    ? ({ mode: "gone" } as const)
    : readingSession(state.note, state.now);
}

function reading(
  state: Extract<NoteSession, { mode: "reading" }>,
  action: SessionAction,
): NoteSession {
  const pending = state.deleting?.pending === true;
  switch (action.type) {
    case "edit":
      if (state.deleting) return state;
      return {
        mode: "editing",
        note: state.note,
        now: state.now,
        baseline: baselineOf(state.note),
        saving: false,
        noteGone: false,
        discard: null,
      };
    case "askDelete":
      return state.deleting
        ? state
        : { ...state, deleting: { pending: false } };
    case "keepNote":
      return pending ? state : { ...state, deleting: null };
    case "deleteStarted":
      return state.deleting ? { ...state, deleting: { pending: true } } : state;
    case "deleteFailed":
    case "deleteSettled":
      return { ...state, deleting: null };
    default:
      return state;
  }
}

function editing(
  state: Extract<NoteSession, { mode: "editing" }>,
  action: SessionAction,
): NoteSession {
  switch (action.type) {
    case "cancel":
    case "discard":
      return state.saving ? state : leaveEdit(state);
    case "askDiscard":
      return state.saving ? state : { ...state, discard: action.reason };
    case "keepEditing":
      return { ...state, discard: null };
    case "saveStarted":
      return { ...state, saving: true, discard: null };
    case "saved":
      return readingSession(action.note, action.now);
    case "saveFailed":
      return { ...state, saving: false };
    case "noChange":
      return readingSession(state.note, state.now);
    case "notFound":
      return { ...state, saving: false, noteGone: true };
    default:
      return state;
  }
}

export function sessionReducer(
  state: NoteSession,
  action: SessionAction,
): NoteSession {
  switch (state.mode) {
    case "reading":
      return reading(state, action);
    case "editing":
      return editing(state, action);
    case "gone":
      return state;
  }
}
