/**
 * The "Your notes" list state as a pure reducer (list-notes plan D3). Every
 * action returns a new object; the input state is never changed. `now` is
 * passed in by the caller (read in effects and handlers, never in render).
 */
import type { Note } from "../storage";
import type { FailureReason } from "./loadProblems";

export type ListState =
  | {
      readonly phase: "loading";
      /** Notes saved while loading, newest first (R14). */
      readonly savedFirst: readonly Note[];
      /** Ids found missing while loading (R21). */
      readonly gone: ReadonlySet<string>;
    }
  | {
      readonly phase: "loaded";
      readonly notes: readonly Note[];
      /** When the list view last rendered (R8). */
      readonly now: number;
    }
  | { readonly phase: "failed"; readonly reason: FailureReason };

export type ListAction =
  | {
      readonly type: "listResolved";
      readonly notes: readonly Note[];
      readonly now: number;
    }
  | { readonly type: "listRejected"; readonly reason: FailureReason }
  | { readonly type: "noteSaved"; readonly note: Note; readonly now: number }
  | { readonly type: "noteGone"; readonly id: string }
  | { readonly type: "listShown"; readonly now: number };

export const initialListState: ListState = Object.freeze({
  phase: "loading",
  savedFirst: Object.freeze([]),
  gone: new Set<string>(),
});

function resolved(
  state: Extract<ListState, { phase: "loading" }>,
  notes: readonly Note[],
  now: number,
): ListState {
  const savedIds = new Set(state.savedFirst.map((note) => note.id));
  const rest = notes.filter(
    (note) => !savedIds.has(note.id) && !state.gone.has(note.id),
  );
  return { phase: "loaded", notes: [...state.savedFirst, ...rest], now };
}

function saved(state: ListState, note: Note, now: number): ListState {
  switch (state.phase) {
    case "loading":
      return {
        ...state,
        savedFirst: [
          note,
          ...state.savedFirst.filter((other) => other.id !== note.id),
        ],
      };
    case "loaded":
      return {
        phase: "loaded",
        notes: [note, ...state.notes.filter((other) => other.id !== note.id)],
        now,
      };
    case "failed":
      return state; // R13
  }
}

function gone(state: ListState, id: string): ListState {
  switch (state.phase) {
    case "loading":
      return {
        ...state,
        savedFirst: state.savedFirst.filter((note) => note.id !== id),
        gone: new Set([...state.gone, id]),
      };
    case "loaded":
      return { ...state, notes: state.notes.filter((note) => note.id !== id) };
    case "failed":
      return state;
  }
}

export function listReducer(state: ListState, action: ListAction): ListState {
  switch (action.type) {
    case "listResolved":
      return state.phase === "loading"
        ? resolved(state, action.notes, action.now)
        : state;
    case "listRejected":
      return state.phase === "loading"
        ? { phase: "failed", reason: action.reason }
        : state;
    case "noteSaved":
      return saved(state, action.note, action.now);
    case "noteGone":
      return gone(state, action.id);
    case "listShown":
      return state.phase === "loaded" ? { ...state, now: action.now } : state;
  }
}
