import { useId, type ChangeEvent, type KeyboardEvent, type Ref } from "react";
import type { Field } from "../noteForm/formState";
import { counterValue } from "../noteForm/saveCheck";
import { counterText, noteTooLong, titleTooLong } from "../copy";
import { BODY_MAX_CHARS, TITLE_MAX_CHARS } from "../storage";

type FieldElement = HTMLInputElement | HTMLTextAreaElement;

interface NoteFieldProps {
  readonly kind: Field;
  readonly label: string;
  readonly value: string;
  /** The actual character count when the last save found this field too long. */
  readonly errorCount: number | undefined;
  readonly readOnly: boolean;
  readonly inputRef: Ref<HTMLInputElement> | Ref<HTMLTextAreaElement>;
  readonly onChange: (event: ChangeEvent<FieldElement>) => void;
  readonly onKeyDown: (event: KeyboardEvent<FieldElement>) => void;
}

/**
 * One labelled field with its error and counter (create-note R1, R4, R16,
 * R19). No maxlength and no required: limits are checked only on save.
 */
export default function NoteField({
  kind,
  label,
  value,
  errorCount,
  readOnly,
  inputRef,
  onChange,
  onKeyDown,
}: NoteFieldProps) {
  const controlId = useId();
  const errorId = useId();
  const counterId = useId();

  const limit = kind === "title" ? TITLE_MAX_CHARS : BODY_MAX_CHARS;
  const count = counterValue(value, limit);
  const error =
    errorCount === undefined
      ? null
      : kind === "title"
        ? titleTooLong(errorCount)
        : noteTooLong(errorCount);
  const describedBy =
    [error === null ? null : errorId, count === null ? null : counterId]
      .filter((id) => id !== null)
      .join(" ") || undefined;

  const shared = {
    id: controlId,
    value,
    readOnly,
    onChange,
    onKeyDown,
    "aria-invalid": error === null ? undefined : ("true" as const),
    "aria-describedby": describedBy,
  };

  return (
    <div className="mt-4">
      <label
        htmlFor={controlId}
        className="block text-sm font-medium text-zinc-900"
      >
        {label}
      </label>
      {kind === "title" ? (
        <input
          {...shared}
          ref={inputRef as Ref<HTMLInputElement>}
          type="text"
          className="mt-1 block w-full rounded-md border border-zinc-500 bg-white px-3 py-2 text-base text-zinc-900 aria-invalid:border-2 aria-invalid:border-zinc-900"
        />
      ) : (
        <textarea
          {...shared}
          ref={inputRef as Ref<HTMLTextAreaElement>}
          rows={12}
          className="mt-1 block w-full resize-y rounded-md border border-zinc-500 bg-white px-3 py-2 text-base text-zinc-900 aria-invalid:border-2 aria-invalid:border-zinc-900"
        />
      )}
      {error === null ? null : (
        <p id={errorId} className="mt-1 text-sm break-words text-zinc-900">
          {error}
        </p>
      )}
      {count === null ? null : (
        <p id={counterId} className="mt-1 text-sm break-words text-zinc-600">
          {counterText(count, limit)}
        </p>
      )}
    </div>
  );
}
