/**
 * Maps the result of `delete(id)` to what the app does (edit-delete-note
 * R28-R30, plan D9). It never reads the error's message (R16).
 */
import { DELETE_FAILED, DELETE_UNAVAILABLE } from "../copy";
import { NoteStorageError } from "../storage";

export type DeleteOutcome =
  | { readonly kind: "deleted" }
  | { readonly kind: "already-deleted" }
  | { readonly kind: "failed"; readonly reason: "unavailable" | "other" };

export const DELETED: DeleteOutcome = Object.freeze({ kind: "deleted" });

/** The outcome of a rejected `delete`. */
export function deleteOutcomeFor(error: unknown): DeleteOutcome {
  const kind = error instanceof NoteStorageError ? error.kind : null;
  if (kind === "not-found") return { kind: "already-deleted" };
  return {
    kind: "failed",
    reason: kind === "unavailable" ? "unavailable" : "other",
  };
}

/** R30: the view's alert text for a failed delete. */
export function deleteFailureText(reason: "unavailable" | "other"): string {
  return reason === "unavailable" ? DELETE_UNAVAILABLE : DELETE_FAILED;
}
