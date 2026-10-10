import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { flushSync } from "react-dom";
import AppHeader from "./components/AppHeader";
import InfoText from "./components/InfoText";
import NoteForm from "./components/NoteForm";
import NotesSection, {
  type NotesSectionHandle,
} from "./components/NotesSection";
import NoteView from "./components/NoteView";
import SkipLink from "./components/SkipLink";
import { ALREADY_DELETED, NOTE_DELETED } from "./copy";
import { ModalLayer } from "./dialog/ModalLayer";
import type { DeleteOutcome } from "./noteEdit/deleteOutcome";
import { useNoteList } from "./noteList/useNoteList";
import { isPlainClick } from "./routing/plainClick";
import { useHashNavigation } from "./routing/useHashNavigation";
import { getNoteRepository, type NoteRepository } from "./storage";

export interface AppProps {
  /** Tests supply a repository (create-note plan D1); the app uses the shared one. */
  readonly repository?: NoteRepository;
}

/** The "Your notes" status text and the list visit it belongs to (edit-delete-note R35, D10). */
interface NotesStatus {
  readonly text: string;
  readonly visit: number;
}

export default function App({ repository }: AppProps) {
  // Getting the repository touches no storage (note-storage R25).
  const notes = repository ?? getNoteRepository();
  const {
    route,
    visit,
    returnedFromId,
    held,
    backToList,
    setGuard,
    releaseHeld,
    restoreHeld,
  } = useHashNavigation();
  const { state, noteSaved, noteGone, listShown } = useNoteList(notes);
  const notesRef = useRef<NotesSectionHandle>(null);
  const inNote = route.kind === "note";
  // edit-delete-note D1: the app root (inert under a dialog) and the dialog host.
  const [appRoot, setAppRoot] = useState<HTMLDivElement | null>(null);
  const [dialogHost, setDialogHost] = useState<HTMLDivElement | null>(null);
  // R35: shown only while the list visit it was set for is current, so
  // opening a note clears it.
  const [notesStatus, setNotesStatus] = useState<NotesStatus | null>(null);
  /** Status text to set when the list shows after this view's delete (R28). */
  const pendingReturnRef = useRef<string | null>(null);
  /** Status text to set the next time the list shows, without moving focus (R31). */
  const queuedStatusRef = useRef<string | null>(null);
  const latest = useRef({ visit, inNote, notesStatus });
  useLayoutEffect(() => {
    latest.current = { visit, inNote, notesStatus };
  });

  // R24, R8: back on the list, refresh "now" and focus the note just left.
  // After a delete (edit-delete-note R28), focus "Your notes" and say so.
  useEffect(() => {
    if (inNote || returnedFromId === null) return;
    listShown();
    const section = notesRef.current;
    const deleted = pendingReturnRef.current;
    const queued = queuedStatusRef.current;
    pendingReturnRef.current = null;
    queuedStatusRef.current = null;
    if (deleted !== null) {
      section?.focusHeading();
    } else if (section && !section.focusNote(returnedFromId)) {
      section.focusHeading();
    }
    const text = deleted ?? queued;
    if (text !== null) setNotesStatus({ text, visit });
  }, [visit, inNote, returnedFromId, listShown]);

  const clearNotesStatus = useCallback(() => setNotesStatus(null), []);

  /** D9: called when a delete settles, even after its view has unmounted. */
  const onDeleteSettled = useCallback(
    (id: string, outcome: DeleteOutcome, deleteVisit: number) => {
      if (outcome.kind === "failed") return; // the view reports it (R30)
      const text = outcome.kind === "deleted" ? NOTE_DELETED : ALREADY_DELETED;
      noteGone(id); // R33
      const now = latest.current;
      if (deleteVisit === now.visit) {
        pendingReturnRef.current = text;
        backToList(); // R28: the list-notes R24 rule
      } else if (!now.inNote) {
        // R31: the list already shows; set the text, move nothing.
        if (now.notesStatus?.text === text) {
          flushSync(() => setNotesStatus(null)); // clear first to repeat it
        }
        setNotesStatus({ text, visit: now.visit });
      } else {
        queuedStatusRef.current = text;
      }
    },
    [noteGone, backToList],
  );

  function onBack(event: MouseEvent<HTMLAnchorElement>): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    backToList();
  }

  const status =
    notesStatus !== null && notesStatus.visit === visit && !inNote
      ? notesStatus.text
      : null;

  return (
    <ModalLayer host={dialogHost} appRoot={appRoot}>
      <div ref={setAppRoot} className="min-h-screen">
        {!inNote && (
          <SkipLink onActivate={() => notesRef.current?.focusHeading()} />
        )}
        <AppHeader />
        <main className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          {/* R17, R26: hidden at a note route, but the form stays mounted. */}
          <div hidden={inNote}>
            <NoteForm
              repository={notes}
              active={!inNote}
              onSaved={noteSaved}
              onAttempt={clearNotesStatus}
            />
            <InfoText />
            <NotesSection ref={notesRef} state={state} status={status} />
          </div>
          {route.kind === "note" && (
            <NoteView
              key={visit}
              repository={notes}
              route={route}
              visit={visit}
              nav={{ held, setGuard, releaseHeld, restoreHeld, backToList }}
              onBack={onBack}
              onGone={noteGone}
              onUpdated={noteSaved}
              onDeleteSettled={onDeleteSettled}
            />
          )}
        </main>
      </div>
      <div ref={setDialogHost} data-dialog-host="" />
    </ModalLayer>
  );
}
