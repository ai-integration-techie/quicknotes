/**
 * Reads the list once per page load, after the first commit, and keeps it
 * in the pure reducer (list-notes R2, R3, R14; plan D3, D4).
 */
import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Note, NoteRepository } from "../storage";
import { initialListState, listReducer, type ListState } from "./listState";
import { listFailureReason } from "./loadProblems";

export interface NoteList {
  readonly state: ListState;
  noteSaved(note: Note): void;
  noteGone(id: string): void;
  listShown(): void;
}

export function useNoteList(repository: NoteRepository): NoteList {
  const [state, dispatch] = useReducer(listReducer, initialListState);
  // D4: one list() even when StrictMode runs the effect twice.
  const promiseRef = useRef<Promise<Note[]> | null>(null);

  useEffect(() => {
    promiseRef.current ??= repository.list();
    let mounted = true;
    promiseRef.current.then(
      (notes) => {
        if (mounted) dispatch({ type: "listResolved", notes, now: Date.now() });
      },
      (error: unknown) => {
        if (mounted)
          dispatch({ type: "listRejected", reason: listFailureReason(error) });
      },
    );
    return () => {
      mounted = false;
    };
  }, [repository]);

  const noteSaved = useCallback((note: Note) => {
    dispatch({ type: "noteSaved", note, now: Date.now() });
  }, []);
  const noteGone = useCallback((id: string) => {
    dispatch({ type: "noteGone", id });
  }, []);
  const listShown = useCallback(() => {
    dispatch({ type: "listShown", now: Date.now() });
  }, []);

  return { state, noteSaved, noteGone, listShown };
}
