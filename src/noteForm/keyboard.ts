/**
 * Keyboard predicates for the form (create-note R6, R7, D8, D9). Pure
 * functions over the few key-event fields they need.
 */
export interface KeyLike {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly isComposing?: boolean;
  readonly keyCode?: number;
}

/** The keyCode browsers report for keys handled by an input method. */
const IME_KEY_CODE = 229;

/** D9: an IME composition is in progress (Safari reports keyCode 229). */
export function isComposing(event: KeyLike): boolean {
  return event.isComposing === true || event.keyCode === IME_KEY_CODE;
}

/** R7, Q5: Ctrl+Enter or Cmd+Enter saves, on every platform. */
export function isSaveShortcut(event: KeyLike): boolean {
  return event.key === "Enter" && (event.ctrlKey || event.metaKey);
}

/** R6, D8: any other Enter (Shift and Alt included) in Title moves to Note. */
export function isPlainEnter(event: KeyLike): boolean {
  return event.key === "Enter" && !event.ctrlKey && !event.metaKey;
}
