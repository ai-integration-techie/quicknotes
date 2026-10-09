import type { MouseEvent } from "react";

/**
 * A plain primary activation (a click, a tap, or Enter on a link) with no
 * modifier key. Anything else keeps the browser's default, for example
 * opening the link in a new tab (list-notes R16, plan D7, D8).
 */
export function isPlainClick(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}
