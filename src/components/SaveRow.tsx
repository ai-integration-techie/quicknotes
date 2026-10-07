import { useId } from "react";
import { SAVE_BUTTON, SAVE_BUTTON_SAVING } from "../copy";
import { shortcutHint } from "../noteForm/platform";

interface SaveRowProps {
  readonly saving: boolean;
}

/**
 * The submit button and its shortcut hint (create-note R10, R35, R38).
 * While saving it uses aria-disabled, never disabled, so focus stays on it.
 */
export default function SaveRow({ saving }: SaveRowProps) {
  const hintId = useId();
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
      <button
        type="submit"
        aria-disabled={saving ? "true" : undefined}
        aria-keyshortcuts="Control+Enter Meta+Enter"
        aria-describedby={hintId}
        className="min-h-11 rounded-md bg-accent px-4 font-medium text-white"
      >
        {saving ? SAVE_BUTTON_SAVING : SAVE_BUTTON}
      </button>
      <p id={hintId} className="text-sm text-zinc-600">
        {shortcutHint(navigator.platform)}
      </p>
    </div>
  );
}
