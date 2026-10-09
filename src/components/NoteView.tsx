import { useEffect, useId, useRef, type MouseEvent, type Ref } from "react";
import {
  NOT_FOUND,
  NOT_FOUND_HEADING,
  NOTE_NO_TEXT,
  NOTE_OPENING,
  OPEN_FAILED,
  OPEN_FAILED_HEADING,
  OPEN_UNAVAILABLE,
  UNTITLED_NOTE,
} from "../copy";
import { isBlank } from "../noteList/display";
import { useOpenNote } from "../noteView/useOpenNote";
import type { Note, NoteRepository } from "../storage";
import BackLink from "./BackLink";
import UpdatedLine from "./UpdatedLine";

interface NoteViewProps {
  readonly repository: NoteRepository;
  readonly route: { readonly id: string; readonly valid: boolean };
  onBack(event: MouseEvent<HTMLAnchorElement>): void;
  onGone(id: string): void;
}

type HeadingRef = Ref<HTMLHeadingElement>;

function LoadedNote({
  note,
  openedAt,
  headingRef,
}: {
  readonly note: Note;
  readonly openedAt: number;
  readonly headingRef: HeadingRef;
}) {
  const headingId = useId();
  return (
    <article aria-labelledby={headingId} className="mt-4">
      {isBlank(note.title) ? (
        <h2
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          className="whitespace-pre-wrap break-words text-xl font-semibold text-zinc-600"
        >
          {UNTITLED_NOTE}
        </h2>
      ) : (
        <h2
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          className="whitespace-pre-wrap break-words text-xl font-semibold text-zinc-900"
        >
          {note.title}
        </h2>
      )}
      <UpdatedLine updatedAt={note.updatedAt} now={openedAt} />
      {isBlank(note.body) ? (
        <p className="mt-4 text-base text-zinc-600">{NOTE_NO_TEXT}</p>
      ) : (
        <div
          data-note-body=""
          className="mt-4 whitespace-pre-wrap break-words text-base text-zinc-900"
        >
          {note.body}
        </div>
      )}
    </article>
  );
}

function Problem({
  heading,
  text,
  headingRef,
}: {
  readonly heading: string;
  readonly text: string;
  readonly headingRef: HeadingRef;
}) {
  return (
    <>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="mt-4 text-xl font-semibold text-zinc-900"
      >
        {heading}
      </h2>
      <p className="mt-2 text-base text-zinc-900">{text}</p>
    </>
  );
}

/**
 * The read-only note view (list-notes R17-R23). Keyed by the visit, so each
 * entry into a note route mounts it once and calls `get` once (plan D5).
 */
export default function NoteView({
  repository,
  route,
  onBack,
  onGone,
}: NoteViewProps) {
  const state = useOpenNote(repository, route.id, route.valid, onGone);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // R23: focus the heading once the view settles, then scroll to the top.
  useEffect(() => {
    if (state.status === "loading") return;
    headingRef.current?.focus({ preventScroll: true });
    (document.scrollingElement ?? document.documentElement).scrollTop = 0;
  }, [state.status]);

  return (
    <div className="pt-6 pb-12">
      <BackLink onBack={onBack} />
      {state.status === "loading" && (
        <p className="mt-4 text-base text-zinc-600">{NOTE_OPENING}</p>
      )}
      {state.status === "loaded" && (
        <LoadedNote
          note={state.note}
          openedAt={state.openedAt}
          headingRef={headingRef}
        />
      )}
      {state.status === "not-found" && (
        <Problem
          heading={NOT_FOUND_HEADING}
          text={NOT_FOUND}
          headingRef={headingRef}
        />
      )}
      {state.status === "failed" && (
        <Problem
          heading={OPEN_FAILED_HEADING}
          text={state.reason === "unavailable" ? OPEN_UNAVAILABLE : OPEN_FAILED}
          headingRef={headingRef}
        />
      )}
    </div>
  );
}
