import {
  useEffect,
  useId,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";
import {
  CHANGES_SAVED,
  DELETE_BUTTON,
  EDIT_BUTTON,
  NO_CHANGES,
  NOTE_NO_TEXT,
  UNTITLED_NOTE,
} from "../copy";
import {
  DELETED,
  deleteFailureText,
  deleteOutcomeFor,
  type DeleteOutcome,
} from "../noteEdit/deleteOutcome";
import { readingSession, sessionReducer } from "../noteEdit/noteSession";
import { isBlank } from "../noteList/display";
import { isPlainClick } from "../routing/plainClick";
import type { Navigation } from "../routing/useHashNavigation";
import type { Note, NoteRepository } from "../storage";
import BackLink from "./BackLink";
import DeleteDialog from "./DeleteDialog";
import DiscardDialog from "./DiscardDialog";
import EditNoteForm from "./EditNoteForm";
import UpdatedLine from "./UpdatedLine";

/** The navigation the loaded view uses (edit-delete-note plan D7, D8). */
export type NoteNav = Pick<
  Navigation,
  "held" | "setGuard" | "releaseHeld" | "restoreHeld" | "backToList"
>;

export interface LoadedNoteProps {
  readonly note: Note;
  readonly openedAt: number;
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
  readonly repository: NoteRepository;
  readonly visit: number;
  readonly nav: NoteNav;
  onBack(event: MouseEvent<HTMLAnchorElement>): void;
  onGone(id: string): void;
  onUpdated(note: Note): void;
  onDeleteSettled(id: string, outcome: DeleteOutcome, visit: number): void;
  /** R15: Cancel after "Changes not found" shows the not-found state. */
  onGoneAfterEdit(): void;
}

const SECONDARY_BUTTON =
  "min-h-11 rounded-md border border-zinc-500 bg-white px-4 font-medium text-zinc-900 hover:bg-zinc-100";

function NoteArticle({
  note,
  now,
  headingRef,
}: {
  readonly note: Note;
  readonly now: number;
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
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
      <UpdatedLine updatedAt={note.updatedAt} now={now} />
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

/**
 * The loaded note view (list-notes R19) with this slug's reading-mode
 * actions, edit mode and both dialogs (edit-delete-note R1-R31).
 */
export default function LoadedNote({
  note: openedNote,
  openedAt,
  headingRef,
  repository,
  visit,
  nav,
  onBack,
  onGone,
  onUpdated,
  onDeleteSettled,
  onGoneAfterEdit,
}: LoadedNoteProps) {
  const [session, dispatch] = useReducer(sessionReducer, null, () =>
    readingSession(openedNote, openedAt),
  );
  // R3: the view's message area, kept mounted in both modes.
  const [viewStatus, setViewStatus] = useState<string | null>(null);
  const [viewAlert, setViewAlert] = useState<string | null>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const dirtyRef = useRef(false);
  const leavingRef = useRef(false);
  const deletingRef = useRef(false);
  const mountedRef = useRef(false);

  const editing = session.mode === "editing";
  const saving = editing && session.saving;
  const noteGone = editing && session.noteGone;
  const note = session.mode === "gone" ? openedNote : session.note;
  const { held, setGuard, releaseHeld, restoreHeld, backToList } = nav;

  const latest = useRef({ saving, held });
  useLayoutEffect(() => {
    latest.current = { saving, held };
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // D8: while editing, hold route changes when there are unsaved changes or a save is pending.
  useLayoutEffect(() => {
    if (!editing) return undefined;
    setGuard(
      () => !leavingRef.current && (latest.current.saving || dirtyRef.current),
    );
    return () => setGuard(null);
  }, [editing, setGuard]);

  function clearViewMessages(): void {
    setViewStatus(null);
    setViewAlert(null);
  }

  // Reading mode -------------------------------------------------------

  function onEdit(): void {
    dirtyRef.current = false;
    clearViewMessages();
    dispatch({ type: "edit" });
  }

  function onDelete(): void {
    clearViewMessages();
    dispatch({ type: "askDelete" });
  }

  function onKeepNote(): void {
    flushSync(() => dispatch({ type: "keepNote" }));
    deleteRef.current?.focus(); // R26
  }

  function settleDelete(id: string, outcome: DeleteOutcome): void {
    deletingRef.current = false;
    if (outcome.kind === "failed") {
      if (!mountedRef.current) return; // R31: a failure then changes nothing
      flushSync(() => {
        dispatch({ type: "deleteFailed" });
        setViewAlert(deleteFailureText(outcome.reason));
      });
      deleteRef.current?.focus(); // R30
      return;
    }
    if (mountedRef.current)
      flushSync(() => dispatch({ type: "deleteSettled" }));
    onDeleteSettled(id, outcome, visit); // R28, R29, R31
  }

  function onConfirmDelete(): void {
    if (deletingRef.current) return;
    deletingRef.current = true;
    const id = note.id;
    flushSync(() => dispatch({ type: "deleteStarted" }));
    repository.delete(id).then(
      () => settleDelete(id, DELETED),
      (error: unknown) => settleDelete(id, deleteOutcomeFor(error)),
    );
  }

  // Edit mode ------------------------------------------------------------

  function showReading(
    action: { type: "noChange" } | { type: "saved"; note: Note; now: number },
    text: string,
    saved?: Note,
  ): void {
    flushSync(() => {
      if (saved) onUpdated(saved); // R32
      dispatch(action);
      setViewStatus(text);
    });
    headingRef.current?.focus(); // R10, R13
  }

  const outcomes = {
    onSaveStarted: () => dispatch({ type: "saveStarted" }),
    onNoChange: () => showReading({ type: "noChange" }, NO_CHANGES),
    onSaved: (saved: Note) => {
      if (latest.current.held) {
        // R12: a route change waited for this save; nothing is unsaved now.
        onUpdated(saved);
        leavingRef.current = true;
        releaseHeld();
        return;
      }
      showReading(
        { type: "saved", note: saved, now: Date.now() },
        CHANGES_SAVED,
        saved,
      );
    },
    onSaveFailed: (notFound: boolean) => {
      if (!notFound) {
        dispatch({ type: "saveFailed" });
        return;
      }
      dispatch({ type: "notFound" }); // R15: never recreated
      onGone(note.id);
    },
  };

  /** Back to reading mode with the note as it was, focus on "Edit" (R18). */
  function leaveToReading(type: "cancel" | "discard"): void {
    if (noteGone) {
      onGoneAfterEdit(); // R15
      return;
    }
    flushSync(() => dispatch({ type }));
    editRef.current?.focus();
  }

  function onCancel(): void {
    if (saving) return; // R12
    if (dirtyRef.current) {
      dispatch({ type: "askDiscard", reason: "cancel" });
      return;
    }
    leaveToReading("cancel");
  }

  function onEditBack(event: MouseEvent<HTMLAnchorElement>): void {
    if (saving) {
      event.preventDefault(); // R12
      return;
    }
    if (!dirtyRef.current) {
      onBack(event); // R19: as list-notes R24
      return;
    }
    if (!isPlainClick(event)) return;
    event.preventDefault();
    dispatch({ type: "askDiscard", reason: "back" });
  }

  // R20: a held route change shows the discard dialog (unless a save is pending).
  const discardReason = held ? "route" : editing ? session.discard : null;
  const showDiscard = editing && !saving && discardReason !== null;

  function onKeepEditing(previous: Element | null): void {
    const reason = discardReason;
    if (latest.current.held) restoreHeld();
    flushSync(() => dispatch({ type: "keepEditing" }));
    const form = formRef.current;
    const usable =
      previous instanceof HTMLElement &&
      previous.isConnected &&
      (reason !== "route" || (form?.contains(previous) ?? false));
    const title = form?.querySelector("input");
    (usable ? previous : title)?.focus(); // R23
  }

  function onDiscard(): void {
    const reason = discardReason;
    if (reason === "route") {
      leavingRef.current = true;
      releaseHeld();
    } else if (reason === "back") {
      leavingRef.current = true;
      backToList();
    } else {
      leaveToReading("discard");
    }
  }

  if (session.mode === "gone") return null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <BackLink
          onBack={editing ? onEditBack : onBack}
          ariaDisabled={saving}
        />
        {!editing && (
          <div className="flex flex-wrap gap-2">
            <button
              ref={editRef}
              type="button"
              onClick={onEdit}
              className={SECONDARY_BUTTON}
            >
              {EDIT_BUTTON}
            </button>
            <button
              ref={deleteRef}
              type="button"
              onClick={onDelete}
              className={SECONDARY_BUTTON}
            >
              {DELETE_BUTTON}
            </button>
          </div>
        )}
      </div>
      <div role="status" className="text-base text-zinc-900 not-empty:mt-3">
        {viewStatus}
      </div>
      <div role="alert" className="text-base text-zinc-900 not-empty:mt-3">
        {viewAlert}
      </div>
      {session.mode === "editing" ? (
        <EditNoteForm
          repository={repository}
          noteId={note.id}
          baseline={session.baseline}
          dirtyRef={dirtyRef}
          formRef={formRef}
          cancelRef={cancelRef}
          onCancel={onCancel}
          {...outcomes}
        />
      ) : (
        <NoteArticle note={note} now={session.now} headingRef={headingRef} />
      )}
      {session.mode === "reading" && session.deleting && (
        <DeleteDialog
          title={note.title}
          pending={session.deleting.pending}
          onKeep={onKeepNote}
          onDelete={onConfirmDelete}
        />
      )}
      {showDiscard && (
        <DiscardDialog onKeep={onKeepEditing} onDiscard={onDiscard} />
      )}
    </>
  );
}
