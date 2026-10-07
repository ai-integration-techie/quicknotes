/**
 * Typed repository errors (note-storage R20-R22, R24). Messages are fixed
 * templates built only from field, rule, limit and count, never from note
 * text or ids.
 */

export type NoteStorageErrorKind =
  "validation" | "not-found" | "unavailable" | "quota-exceeded";

export type ValidationIssue =
  | { readonly field: "title" | "body"; readonly rule: "not-a-string" }
  | {
      readonly field: "title" | "body";
      readonly rule: "too-long";
      readonly limit: 200 | 100000;
      readonly actual: number;
    }
  | { readonly field: "note"; readonly rule: "empty" }
  | { readonly field: "id"; readonly rule: "not-a-string" };

interface CauseOptions {
  readonly cause?: unknown;
}

/** Base class of every rejection the repository produces. */
export abstract class NoteStorageError extends Error {
  abstract readonly kind: NoteStorageErrorKind;
}

function describeIssue(issue: ValidationIssue): string {
  const base = `${issue.field} ${issue.rule}`;
  return issue.rule === "too-long"
    ? `${base} (${issue.actual}/${issue.limit})`
    : base;
}

export class ValidationError extends NoteStorageError {
  readonly kind = "validation" as const;
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[]) {
    super(`Note failed validation: ${issues.map(describeIssue).join(", ")}`);
    this.name = "ValidationError";
    this.issues = issues.map((issue) => ({ ...issue }));
  }
}

export class NotFoundError extends NoteStorageError {
  readonly kind = "not-found" as const;

  constructor() {
    super("Note not found");
    this.name = "NotFoundError";
  }
}

export class StorageUnavailableError extends NoteStorageError {
  readonly kind = "unavailable" as const;

  constructor(options: CauseOptions = {}) {
    super(
      "Note storage is unavailable",
      "cause" in options ? { cause: options.cause } : undefined,
    );
    this.name = "StorageUnavailableError";
  }
}

export class QuotaExceededError extends NoteStorageError {
  readonly kind = "quota-exceeded" as const;

  constructor(options: CauseOptions = {}) {
    super(
      "Note storage is full",
      "cause" in options ? { cause: options.cause } : undefined,
    );
    this.name = "QuotaExceededError";
  }
}
