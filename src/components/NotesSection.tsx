import { useImperativeHandle, useRef, type Ref } from "react";
import {
  LIST_FAILED,
  LIST_UNAVAILABLE,
  NOTES_EMPTY_PRIMARY,
  NOTES_EMPTY_SECONDARY,
  NOTES_HEADING,
  NOTES_LOADING,
} from "../copy";
import type { ListState } from "../noteList/listState";
import NoteList, { type NoteListHandle } from "./NoteList";

export const NOTES_HEADING_ID = "notes-heading";

export interface NotesSectionHandle {
  focusNote(id: string): boolean;
  focusHeading(): void;
}

interface NotesSectionProps {
  readonly state: ListState;
  /** "Note deleted." or the "Already deleted" copy (edit-delete-note R35). */
  readonly status?: string | null;
  readonly ref?: Ref<NotesSectionHandle>;
}

function failureText(state: ListState): string {
  if (state.phase !== "failed") return "";
  return state.reason === "unavailable" ? LIST_UNAVAILABLE : LIST_FAILED;
}

function Body({
  state,
  listRef,
}: {
  readonly state: ListState;
  readonly listRef: Ref<NoteListHandle>;
}) {
  if (state.phase === "loading") {
    return <p className="mt-3 text-base text-zinc-600">{NOTES_LOADING}</p>;
  }
  if (state.phase === "failed") return null;
  if (state.notes.length === 0) {
    return (
      <div className="mt-3">
        <p className="text-lg font-medium text-zinc-900">
          {NOTES_EMPTY_PRIMARY}
        </p>
        <p className="text-base text-zinc-600">{NOTES_EMPTY_SECONDARY}</p>
      </div>
    );
  }
  return <NoteList ref={listRef} notes={state.notes} now={state.now} />;
}

/**
 * "Your notes" (list-notes R1, R4, R10-R13, R29). The alert region exists,
 * empty, from the first render and is used only for a load failure. The
 * status region (edit-delete-note R35) is used only after a delete.
 */
export default function NotesSection({
  state,
  status = null,
  ref,
}: NotesSectionProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<NoteListHandle>(null);

  useImperativeHandle(
    ref,
    () => ({
      focusNote: (id) => listRef.current?.focusNote(id) ?? false,
      focusHeading: () => headingRef.current?.focus(),
    }),
    [],
  );

  return (
    <section
      aria-labelledby={NOTES_HEADING_ID}
      aria-busy={state.phase === "loading" ? "true" : undefined}
      className="mt-12 pb-12"
    >
      <h2
        id={NOTES_HEADING_ID}
        ref={headingRef}
        tabIndex={-1}
        className="text-lg font-semibold text-zinc-900"
      >
        {NOTES_HEADING}
      </h2>
      <div role="status" className="text-base text-zinc-900 not-empty:mt-3">
        {status}
      </div>
      <div role="alert" className="text-base text-zinc-900 not-empty:mt-3">
        {failureText(state)}
      </div>
      <Body state={state} listRef={listRef} />
    </section>
  );
}
