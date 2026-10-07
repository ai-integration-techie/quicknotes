/**
 * Field rules (note-storage R4-R11, R16). Validation is synchronous and runs
 * before any storage access (R9). Text is never trimmed, normalised or
 * otherwise changed (R8).
 */
import { ValidationError, type ValidationIssue } from "./errors";
import type { NoteInput } from "./note";

export const TITLE_MAX_CHARS = 200;
export const BODY_MAX_CHARS = 100_000;

/** Length in Unicode code points, as `Array.from(s).length` (R4). */
export function countCharacters(s: string): number {
  return Array.from(s).length;
}

function fieldIssues(
  field: "title" | "body",
  value: unknown,
  limit: typeof TITLE_MAX_CHARS | typeof BODY_MAX_CHARS,
): ValidationIssue[] {
  if (typeof value !== "string") return [{ field, rule: "not-a-string" }];
  const actual = countCharacters(value);
  return actual > limit ? [{ field, rule: "too-long", limit, actual }] : [];
}

function readField(input: unknown, key: "title" | "body"): unknown {
  return typeof input === "object" && input !== null
    ? (input as Record<string, unknown>)[key]
    : undefined;
}

function inputIssues(title: unknown, body: unknown): ValidationIssue[] {
  const issues = [
    ...fieldIssues("title", title, TITLE_MAX_CHARS),
    ...fieldIssues("body", body, BODY_MAX_CHARS),
  ];
  if (title === "" && body === "")
    issues.push({ field: "note", rule: "empty" });
  return issues;
}

function idIssues(id: unknown): ValidationIssue[] {
  return typeof id === "string" ? [] : [{ field: "id", rule: "not-a-string" }];
}

/** Returns a new `{ title, body }`, ignoring every other property (R11). */
export function validateNoteInput(input: unknown): NoteInput {
  const title = readField(input, "title");
  const body = readField(input, "body");
  const issues = inputIssues(title, body);
  if (issues.length > 0) throw new ValidationError(issues);
  return { title: title as string, body: body as string };
}

export function validateId(id: unknown): string {
  const issues = idIssues(id);
  if (issues.length > 0) throw new ValidationError(issues);
  return id as string;
}

/** Validates an update's id and input together, reporting every issue (R10). */
export function validateUpdate(
  id: unknown,
  input: unknown,
): { readonly id: string; readonly input: NoteInput } {
  const title = readField(input, "title");
  const body = readField(input, "body");
  const issues = [...idIssues(id), ...inputIssues(title, body)];
  if (issues.length > 0) throw new ValidationError(issues);
  return {
    id: id as string,
    input: { title: title as string, body: body as string },
  };
}
