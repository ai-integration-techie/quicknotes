/**
 * Display rules for note text (list-notes R6, R7; plan D11). Display only:
 * the stored text is never changed.
 */
import { PREVIEW_ELLIPSIS } from "../copy";
import { countCharacters } from "../storage";

/** The preview keeps at most this many code points (R7). */
export const PREVIEW_MAX_CHARS = 100;

/** R6: blank means nothing but whitespace, including "". */
export function isBlank(text: string): boolean {
  return /^\s*$/u.test(text);
}

/**
 * R7: whitespace runs collapsed to one space and trimmed; over 100 code
 * points, the first 100 (end-trimmed) plus "…". `null` for a blank body.
 */
export function previewText(body: string): string | null {
  if (isBlank(body)) return null;
  const collapsed = body.replace(/\s+/gu, " ").trim();
  if (countCharacters(collapsed) <= PREVIEW_MAX_CHARS) return collapsed;
  const kept = Array.from(collapsed)
    .slice(0, PREVIEW_MAX_CHARS)
    .join("")
    .trimEnd();
  return kept + PREVIEW_ELLIPSIS;
}
