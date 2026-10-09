/**
 * Maps a `list()` or `get()` rejection to what the UI says (list-notes R12,
 * R21, R22; plan D12). The error's message is never read, shown or logged
 * (R41), and a rejection that isn't an Error at all maps to "other".
 */
import { NoteStorageError } from "../storage";

export type FailureReason = "unavailable" | "other";
export type OpenOutcome = "not-found" | FailureReason;

function kindOf(error: unknown): string | null {
  return error instanceof NoteStorageError ? error.kind : null;
}

/** R12: "unavailable" only for a NoteStorageError of that kind. */
export function listFailureReason(error: unknown): FailureReason {
  return kindOf(error) === "unavailable" ? "unavailable" : "other";
}

/** R21, R22: not found, unavailable, or anything else. */
export function openOutcome(error: unknown): OpenOutcome {
  const kind = kindOf(error);
  if (kind === "not-found") return "not-found";
  if (kind === "unavailable") return "unavailable";
  return "other";
}
