import { useId, type ReactNode } from "react";
import { SAVE_BUTTON, SAVE_BUTTON_SAVING } from "../copy";
import { shortcutHint } from "../noteForm/platform";

interface SaveRowProps {
  readonly saving: boolean;
  /** The idle label (edit-delete-note D4); "Save note" by default. */
  readonly label?: string;
  /** The label while saving; "Saving…" by default. */
  readonly savingLabel?: string;
  /** Rendered between the button and the hint, for example "Cancel". */
  readonly secondary?: ReactNode;
}

/**
 * The submit button and its shortcut hint (create-note R10, R35, R38).
 * While saving it uses aria-disabled, never disabled, so focus stays on it.
 */
export default function SaveRow({
  saving,
  label = SAVE_BUTTON,
  savingLabel = SAVE_BUTTON_SAVING,
  secondary,
}: SaveRowProps) {
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
        {saving ? savingLabel : label}
      </button>
      {secondary}
      <p id={hintId} className="text-sm text-zinc-600">
        {shortcutHint(navigator.platform)}
      </p>
    </div>
  );
}
