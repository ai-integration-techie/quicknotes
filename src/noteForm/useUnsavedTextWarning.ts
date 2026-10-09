import { useEffect } from "react";

function warnBeforeLeaving(event: BeforeUnloadEvent): void {
  event.preventDefault();
  // Older engines show the warning only when returnValue is set.
  event.returnValue = true;
}

/**
 * create-note R25: while `active` (a field has text), ask the browser to
 * show its own "Leave site?" warning. Nothing is stored anywhere.
 */
export function useUnsavedTextWarning(active: boolean): void {
  useEffect(() => {
    if (!active) return undefined;
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeLeaving);
    };
  }, [active]);
}
