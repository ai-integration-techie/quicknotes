import { useCallback, useImperativeHandle, useRef, type Ref } from "react";
import type { Note } from "../storage";
import NoteListItem from "./NoteListItem";

export interface NoteListHandle {
  /** Focuses the note's link; false when the note isn't in the list. */
  focusNote(id: string): boolean;
}

interface NoteListProps {
  readonly notes: readonly Note[];
  readonly now: number;
  readonly ref?: Ref<NoteListHandle>;
}

/**
 * Every note at once, in list() order (list-notes R4). Tailwind's reset
 * removes list markers, and Safari then drops list semantics, so the role
 * is explicit (plan D10; eslint.config.js allows exactly ul: list here).
 */
export default function NoteList({ notes, now, ref }: NoteListProps) {
  const links = useRef(new Map<string, HTMLAnchorElement>());
  const onLink = useCallback((id: string, link: HTMLAnchorElement | null) => {
    if (link) links.current.set(id, link);
    else links.current.delete(id);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      focusNote(id) {
        const link = links.current.get(id);
        if (!link) return false;
        link.focus(); // the default focus scroll brings it into view (R24)
        return true;
      },
    }),
    [],
  );

  return (
    <ul
      role="list"
      className="mt-3 rounded-md border border-zinc-300 bg-white divide-y divide-zinc-200"
    >
      {notes.map((note) => (
        <NoteListItem key={note.id} note={note} now={now} onLink={onLink} />
      ))}
    </ul>
  );
}
