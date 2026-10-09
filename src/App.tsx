import { useEffect, useRef, type MouseEvent } from "react";
import AppHeader from "./components/AppHeader";
import InfoText from "./components/InfoText";
import NoteForm from "./components/NoteForm";
import NotesSection, {
  type NotesSectionHandle,
} from "./components/NotesSection";
import NoteView from "./components/NoteView";
import SkipLink from "./components/SkipLink";
import { useNoteList } from "./noteList/useNoteList";
import { isPlainClick } from "./routing/plainClick";
import { useHashNavigation } from "./routing/useHashNavigation";
import { getNoteRepository, type NoteRepository } from "./storage";

export interface AppProps {
  /** Tests supply a repository (create-note plan D1); the app uses the shared one. */
  readonly repository?: NoteRepository;
}

export default function App({ repository }: AppProps) {
  // Getting the repository touches no storage (note-storage R25).
  const notes = repository ?? getNoteRepository();
  const { route, visit, returnedFromId, backToList } = useHashNavigation();
  const { state, noteSaved, noteGone, listShown } = useNoteList(notes);
  const notesRef = useRef<NotesSectionHandle>(null);
  const inNote = route.kind === "note";

  // R24, R8: back on the list, refresh "now" and focus the note just left.
  useEffect(() => {
    if (inNote || returnedFromId === null) return;
    listShown();
    const section = notesRef.current;
    if (section && !section.focusNote(returnedFromId)) section.focusHeading();
  }, [visit, inNote, returnedFromId, listShown]);

  function onBack(event: MouseEvent<HTMLAnchorElement>): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    backToList();
  }

  return (
    <div className="min-h-screen">
      {!inNote && (
        <SkipLink onActivate={() => notesRef.current?.focusHeading()} />
      )}
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        {/* R17, R26: hidden at a note route, but the form stays mounted. */}
        <div hidden={inNote}>
          <NoteForm repository={notes} active={!inNote} onSaved={noteSaved} />
          <InfoText />
          <NotesSection ref={notesRef} state={state} />
        </div>
        {route.kind === "note" && (
          <NoteView
            key={visit}
            repository={notes}
            route={route}
            onBack={onBack}
            onGone={noteGone}
          />
        )}
      </main>
    </div>
  );
}
