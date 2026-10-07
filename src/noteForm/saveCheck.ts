/**
 * The pre-save check and the near-limit counter (create-note R8, R19),
 * using the storage entry point's own rules.
 */
import {
  BODY_MAX_CHARS,
  TITLE_MAX_CHARS,
  countCharacters,
  type NoteInput,
} from "../storage";
import type { FieldErrors, SaveProblem } from "./formState";

/** The counter shows from 90% of a limit: 180 for Title, 90,000 for Note. */
export function counterFrom(limit: number): number {
  return Math.ceil(limit * 0.9);
}

export const COUNTER_FROM = Object.freeze({
  title: counterFrom(TITLE_MAX_CHARS),
  body: counterFrom(BODY_MAX_CHARS),
});

/**
 * The code-point count to show under a field, or `null` below 90% of
 * `limit`. A code-point count is never above the UTF-16 length, so a
 * shorter string can skip counting.
 */
export function counterValue(value: string, limit: number): number | null {
  const threshold = counterFrom(limit);
  if (value.length < threshold) return null;
  const count = countCharacters(value);
  return count >= threshold ? count : null;
}

/** R8: the problem that blocks this save, or `null` when it may go ahead. */
export function checkBeforeSave(input: NoteInput): SaveProblem | null {
  const title = countCharacters(input.title);
  const body = countCharacters(input.body);
  if (title === 0 && body === 0) {
    return { fieldErrors: {}, message: { kind: "empty" } };
  }
  const fieldErrors: FieldErrors = {
    ...(title > TITLE_MAX_CHARS ? { title } : {}),
    ...(body > BODY_MAX_CHARS ? { body } : {}),
  };
  return Object.keys(fieldErrors).length > 0
    ? { fieldErrors, message: null }
    : null;
}
