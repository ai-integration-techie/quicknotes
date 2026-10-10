import { useEffect, useRef, useState, type MouseEvent, type Ref } from "react";
import {
  NOT_FOUND,
  NOT_FOUND_HEADING,
  NOTE_OPENING,
  OPEN_FAILED,
  OPEN_FAILED_HEADING,
  OPEN_UNAVAILABLE,
} from "../copy";
import type { DeleteOutcome } from "../noteEdit/deleteOutcome";
import { useOpenNote } from "../noteView/useOpenNote";
import type { Note, NoteRepository } from "../storage";
import BackLink from "./BackLink";
import LoadedNote, { type NoteNav } from "./LoadedNote";

interface NoteViewProps {
  readonly repository: NoteRepository;
  readonly route: { readonly id: string; readonly valid: boolean };
  /** This entry's visit number (edit-delete-note plan D9). */
  readonly visit: number;
  readonly nav: NoteNav;
  onBack(event: MouseEvent<HTMLAnchorElement>): void;
  onGone(id: string): void;
  /** `update` resolved with this note (edit-delete-note R32). */
  onUpdated(note: Note): void;
  /** A delete settled; safe to call after this view unmounted (R31). */
  onDeleteSettled(id: string, outcome: DeleteOutcome, visit: number): void;
}

type HeadingRef = Ref<HTMLHeadingElement>;

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
 * The note view (list-notes R17-R23; edit-delete-note R1-R31). Keyed by
 * the visit, so each entry into a note route mounts it once and calls
 * `get` once (list-notes plan D5).
 */
export default function NoteView({
  repository,
  route,
  visit,
  nav,
  onBack,
  onGone,
  onUpdated,
  onDeleteSettled,
}: NoteViewProps) {
  const state = useOpenNote(repository, route.id, route.valid, onGone);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // edit-delete-note R15: found deleted by a save, then the edit was left.
  const [goneAfterEdit, setGoneAfterEdit] = useState(false);
  const status = goneAfterEdit ? "not-found" : state.status;

  // R23: focus the heading once the view settles, then scroll to the top.
  useEffect(() => {
    if (status === "loading") return;
    headingRef.current?.focus({ preventScroll: true });
    (document.scrollingElement ?? document.documentElement).scrollTop = 0;
  }, [status]);

  return (
    <div className="pt-6 pb-12">
      {state.status === "loaded" && !goneAfterEdit ? (
        <LoadedNote
          note={state.note}
          openedAt={state.openedAt}
          headingRef={headingRef}
          repository={repository}
          visit={visit}
          nav={nav}
          onBack={onBack}
          onGone={onGone}
          onUpdated={onUpdated}
          onDeleteSettled={onDeleteSettled}
          onGoneAfterEdit={() => setGoneAfterEdit(true)}
        />
      ) : (
        <BackLink onBack={onBack} />
      )}
      {status === "loading" && (
        <p className="mt-4 text-base text-zinc-600">{NOTE_OPENING}</p>
      )}
      {status === "not-found" && (
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
