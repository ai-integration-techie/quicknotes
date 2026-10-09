import { useId } from "react";
import { NEW_NOTE_HEADING, NOTE_LABEL, TITLE_LABEL } from "../copy";
import { useNoteForm } from "../noteForm/useNoteForm";
import type { NoteRepository } from "../storage";
import FormMessages from "./FormMessages";
import NoteField from "./NoteField";
import SaveRow from "./SaveRow";

interface NoteFormProps {
  readonly repository: NoteRepository;
}

/** The "New note" section (create-note R1-R4, R34). */
export default function NoteForm({ repository }: NoteFormProps) {
  const headingId = useId();
  const { state, titleRef, bodyRef, onChange, onKeyDown, onSubmit } =
    useNoteForm(repository);
  const saving = state.phase === "saving";

  return (
    <section aria-labelledby={headingId} className="pt-6">
      <h2 id={headingId} className="text-lg font-semibold text-zinc-900">
        {NEW_NOTE_HEADING}
      </h2>
      <form noValidate onSubmit={onSubmit}>
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
        <SaveRow saving={saving} />
        <FormMessages message={state.message} />
      </form>
    </section>
  );
}
