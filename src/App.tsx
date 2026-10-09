import AppHeader from "./components/AppHeader";
import InfoText from "./components/InfoText";
import NoteForm from "./components/NoteForm";
import { getNoteRepository, type NoteRepository } from "./storage";

export interface AppProps {
  /** Tests supply a repository (create-note plan D1); the app uses the shared one. */
  readonly repository?: NoteRepository;
}

export default function App({ repository }: AppProps) {
  // Getting the repository touches no storage (note-storage R25).
  const notes = repository ?? getNoteRepository();
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <NoteForm repository={notes} />
        <InfoText />
      </main>
    </div>
  );
}
