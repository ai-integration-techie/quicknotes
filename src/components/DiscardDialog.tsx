import { useId } from "react";
import {
  DISCARD_CHANGES,
  DISCARD_HEADING,
  DISCARD_TEXT,
  KEEP_EDITING,
} from "../copy";
import ConfirmDialog from "./ConfirmDialog";

interface DiscardDialogProps {
  onKeep(previouslyFocused: Element | null): void;
  onDiscard(): void;
}

/** "Discard your changes?" (edit-delete-note R25). */
export default function DiscardDialog({
  onKeep,
  onDiscard,
}: DiscardDialogProps) {
  const textId = useId();
  return (
    <ConfirmDialog
      heading={DISCARD_HEADING}
      describedByIds={[textId]}
      safeLabel={KEEP_EDITING}
      otherLabel={DISCARD_CHANGES}
      busy={false}
      onSafe={onKeep}
      onOther={onDiscard}
    >
      <p id={textId} className="mt-2 text-base text-zinc-900">
        {DISCARD_TEXT}
      </p>
    </ConfirmDialog>
  );
}
