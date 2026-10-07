/**
 * Maps a rejected save to what the form shows (create-note R18, R20, D7).
 * It never reads the error's message and never logs anything (R24).
 */
import {
  NoteStorageError,
  ValidationError,
  type ValidationIssue,
} from "../storage";
import {
  SAVE_FAILED_GENERIC,
  SAVE_FAILED_QUOTA,
  SAVE_FAILED_UNAVAILABLE,
} from "../copy";
import type { Field, FieldErrors, SaveProblem } from "./formState";

function failure(text: string): SaveProblem {
  return { fieldErrors: {}, message: { kind: "failure", text } };
}

function isEmptyIssue(issue: ValidationIssue): boolean {
  return issue.field === "note" && issue.rule === "empty";
}

function tooLongCount(issue: ValidationIssue): [Field, number] | null {
  return issue.rule === "too-long" &&
    (issue.field === "title" || issue.field === "body")
    ? [issue.field, issue.actual]
    : null;
}

/** R18 / D7: map a validation rejection exactly like the pre-check. */
function fromValidation(issues: readonly ValidationIssue[]): SaveProblem {
  if (issues.length === 1 && issues[0] && isEmptyIssue(issues[0])) {
    return { fieldErrors: {}, message: { kind: "empty" } };
  }
  const counts = issues.map(tooLongCount);
  if (issues.length === 0 || counts.some((entry) => entry === null)) {
    return failure(SAVE_FAILED_GENERIC);
  }
  const fieldErrors: FieldErrors = Object.fromEntries(
    counts as [Field, number][],
  );
  return { fieldErrors, message: null };
}

/** R20: the problem a rejected `create` shows. */
export function problemFromRejection(error: unknown): SaveProblem {
  if (!(error instanceof NoteStorageError)) return failure(SAVE_FAILED_GENERIC);
  if (error instanceof ValidationError) return fromValidation(error.issues);
  switch (error.kind) {
    case "unavailable":
      return failure(SAVE_FAILED_UNAVAILABLE);
    case "quota-exceeded":
      return failure(SAVE_FAILED_QUOTA);
    default:
      return failure(SAVE_FAILED_GENERIC);
  }
}

/**
 * Where focus goes after a problem (R15, R16, R21): Title for the
 * both-empty message, the first invalid field (Title before Note) for
 * too-long errors, and nowhere (unchanged) for storage failures.
 */
export function focusTargetFor(problem: SaveProblem): Field | null {
  if (problem.message?.kind === "empty") return "title";
  if (problem.fieldErrors.title !== undefined) return "title";
  if (problem.fieldErrors.body !== undefined) return "body";
  return null;
}
