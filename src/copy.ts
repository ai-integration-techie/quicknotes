/**
 * User-facing copy, kept in one place so components and tests share the
 * exact text from the specs' copy tables (project-foundation, create-note).
 * The <title> and <noscript> text live in index.html and are checked by e2e.
 */
export const APP_NAME = "QuickNotes";
export const ERROR_FALLBACK =
  "Something went wrong. Reload the page to try again.";
export const NOSCRIPT_MESSAGE =
  "QuickNotes needs JavaScript to run. Please turn it on and reload the page.";

// create-note: the "New note" form.
export const NEW_NOTE_HEADING = "New note";
export const TITLE_LABEL = "Title";
export const NOTE_LABEL = "Note";
export const SAVE_BUTTON = "Save note";
export const SAVE_BUTTON_SAVING = "Saving…";
export const HINT_APPLE = "Press Cmd+Enter to save.";
export const HINT_OTHER = "Press Ctrl+Enter to save.";
export const NOTE_SAVED = "Note saved.";
export const BOTH_EMPTY = "Add a title or some text first.";
export const SAVE_FAILED_UNAVAILABLE =
  "Your note wasn't saved. This browser isn't letting QuickNotes store notes right now, which can happen in private browsing. Your text is still here.";
export const SAVE_FAILED_QUOTA =
  "Your note wasn't saved because there's no storage space left for QuickNotes on this device. Free up some space, then try again. Your text is still here.";
export const SAVE_FAILED_GENERIC =
  "Your note wasn't saved because something went wrong. Your text is still here, so you can try again.";
export const INFO_PRIMARY = "Your notes are saved on this device";
export const INFO_SECONDARY =
  "They stay in this browser and are never sent anywhere.";

const numberFormat = new Intl.NumberFormat("en-US");

/** `n` with en-US thousands separators, for example `100,001`. */
function formatCount(n: number): string {
  return numberFormat.format(n);
}

/** The near-limit counter: "{n} of {limit} characters" (R19). */
export function counterText(n: number, limit: number): string {
  return `${formatCount(n)} of ${formatCount(limit)} characters`;
}

/** The title-too-long message (R16). */
export function titleTooLong(n: number): string {
  return `The title is too long. It has ${formatCount(n)} characters and the limit is 200.`;
}

/** The note-too-long message (R16). */
export function noteTooLong(n: number): string {
  return `The note is too long. It has ${formatCount(n)} characters and the limit is 100,000.`;
}
