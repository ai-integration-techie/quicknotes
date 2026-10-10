import { useId } from "react";
import {
  DELETE_HEADING,
  DELETE_NOTE,
  DELETE_TEXT,
  DELETING,
  KEEP_NOTE,
  UNTITLED_NOTE,
} from "../copy";
import { isBlank } from "../noteList/display";
import ConfirmDialog from "./ConfirmDialog";

interface DeleteDialogProps {
  readonly title: string;
  readonly pending: boolean;
  onKeep(): void;
  onDelete(): void;
}

/** "Delete this note?" (edit-delete-note R24, R26, R27). */
export default function DeleteDialog({
  title,
  pending,
  onKeep,
  onDelete,
}: DeleteDialogProps) {
  const titleId = useId();
  const textId = useId();
  return (
    <ConfirmDialog
      heading={DELETE_HEADING}
      describedByIds={[titleId, textId]}
      safeLabel={KEEP_NOTE}
      otherLabel={DELETE_NOTE}
      otherBusyLabel={DELETING}
      busy={pending}
      onSafe={onKeep}
      onOther={onDelete}
    >
      {isBlank(title) ? (
        <p
          id={titleId}
          className="mt-2 whitespace-pre-wrap break-words text-base font-medium text-zinc-600"
        >
          {UNTITLED_NOTE}
        </p>
      ) : (
        <p
          id={titleId}
          className="mt-2 whitespace-pre-wrap break-words text-base font-medium text-zinc-900"
        >
          {title}
        </p>
      )}
      <p id={textId} className="mt-2 text-base text-zinc-900">
        {DELETE_TEXT}
      </p>
    </ConfirmDialog>
  );
}
