/**
 * Reads one note with `get(id)`, once per entry into a note route (list-notes
 * R18, R20-R22; plan D4, D5). A malformed id never calls `get`.
 */
import { useEffect, useRef, useState } from "react";
import type { FailureReason } from "../noteList/loadProblems";
import { openOutcome } from "../noteList/loadProblems";
import type { Note, NoteRepository } from "../storage";

export type OpenState =
  | { readonly status: "loading" }
  | {
      readonly status: "loaded";
      readonly note: Note;
      /** When get resolved: the updated line's "now" (R19 uses R8). */
      readonly openedAt: number;
    }
  | { readonly status: "not-found" }
  | { readonly status: "failed"; readonly reason: FailureReason };

export function useOpenNote(
  repository: NoteRepository,
  id: string,
  valid: boolean,
  onGone: (id: string) => void,
): OpenState {
  const [state, setState] = useState<OpenState>(() =>
    valid ? { status: "loading" } : { status: "not-found" },
  );
  // D4: one get() even when StrictMode runs the effect twice.
  const promiseRef = useRef<Promise<Note> | null>(null);

  useEffect(() => {
    if (!valid) return undefined;
    promiseRef.current ??= repository.get(id);
    let mounted = true;
    promiseRef.current.then(
      (note) => {
        if (mounted) setState({ status: "loaded", note, openedAt: Date.now() });
      },
      (error: unknown) => {
        if (!mounted) return;
        const outcome = openOutcome(error);
        if (outcome === "not-found") {
          setState({ status: "not-found" });
          onGone(id); // R21: it is known to be gone
        } else {
          setState({ status: "failed", reason: outcome });
        }
      },
    );
    return () => {
      mounted = false;
    };
  }, [repository, id, valid, onGone]);

  return state;
}
