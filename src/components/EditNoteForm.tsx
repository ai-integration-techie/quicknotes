import { useId, useLayoutEffect, type RefObject } from "react";
import {
  CANCEL_BUTTON,
  EDIT_HEADING,
  NOTE_LABEL,
  SAVE_BUTTON_SAVING,
  SAVE_CHANGES,
  TITLE_LABEL,
} from "../copy";
import type { Baseline } from "../noteEdit/baseline";
import { useEditNote, type EditOutcomes } from "../noteEdit/useEditNote";
import type { NoteRepository } from "../storage";
import FormMessages from "./FormMessages";
import NoteField from "./NoteField";
import SaveRow from "./SaveRow";

interface EditNoteFormProps extends EditOutcomes {
  readonly repository: NoteRepository;
  readonly noteId: string;
  readonly baseline: Baseline;
  /** Kept equal to "the edit has unsaved changes" (R17), for the view's handlers. */
  readonly dirtyRef: RefObject<boolean>;
  readonly formRef: RefObject<HTMLFormElement | null>;
  readonly cancelRef: RefObject<HTMLButtonElement | null>;
  onCancel(): void;
}

/**
 * The "Edit note" section (edit-delete-note R4-R9): the create-note
 * fields, counters, messages and shortcut, prefilled with the note.
 */
export default function EditNoteForm({
  repository,
  noteId,
  baseline,
  dirtyRef,
  formRef,
  cancelRef,
  onCancel,
  ...outcomes
}: EditNoteFormProps) {
  const headingId = useId();
  const { state, dirty, titleRef, bodyRef, onChange, onKeyDown, onSubmit } =
    useEditNote(repository, noteId, baseline, outcomes);
  const saving = state.phase === "saving";
  useLayoutEffect(() => {
    dirtyRef.current = dirty;
  });

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="mt-4 text-lg font-semibold text-zinc-900">
        {EDIT_HEADING}
      </h2>
      <form ref={formRef} noValidate onSubmit={onSubmit}>
        <NoteField
          kind="title"
          label={TITLE_LABEL}
          value={state.title}
          errorCount={state.fieldErrors.title}
          readOnly={saving}
          inputRef={titleRef}
          onChange={onChange("title")}
          onKeyDown={onKeyDown("title")}
        />
        <NoteField
          kind="body"
          label={NOTE_LABEL}
          value={state.body}
          errorCount={state.fieldErrors.body}
          readOnly={saving}
          inputRef={bodyRef}
          onChange={onChange("body")}
          onKeyDown={onKeyDown("body")}
        />
        <SaveRow
          saving={saving}
          label={SAVE_CHANGES}
          savingLabel={SAVE_BUTTON_SAVING}
          secondary={
            <button
              ref={cancelRef}
              type="button"
              aria-disabled={saving ? "true" : undefined}
              onClick={onCancel}
              className="min-h-11 rounded-md border border-zinc-500 bg-white px-4 font-medium text-zinc-900 hover:bg-zinc-100"
            >
              {CANCEL_BUTTON}
            </button>
          }
        />
        <FormMessages message={state.message} />
      </form>
    </section>
  );
}
