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
  /**
   * The ids of the notes to show, or null for every note (search-notes
   * R11, plan D3). Other items stay mounted but hidden.
   */
  readonly shown?: ReadonlySet<string> | null;
  readonly ref?: Ref<NoteListHandle>;
}

/**
 * Every note at once, in list() order (list-notes R4); under a search,
 * only the shown ones (search-notes R11). Tailwind's reset removes list
 * markers, and Safari then drops list semantics, so the role is explicit
 * (plan D10; eslint.config.js allows exactly ul: list here). Dividers go
 * on top of each item after a shown one, so hidden items leave no stray
 * border (search-notes plan D4).
 */
export default function NoteList({
  notes,
  now,
  shown = null,
  ref,
}: NoteListProps) {
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
        // search-notes R17 (D8): a note hidden by the search isn't "in the list".
        if (!link || link.closest("li")?.hidden) return false;
        link.focus(); // the default focus scroll brings it into view (R24)
        return true;
      },
    }),
    [],
  );

  return (
    <ul
      role="list"
      hidden={shown !== null && shown.size === 0}
      className="mt-3 rounded-md border border-zinc-300 bg-white [&>li]:border-zinc-200 [&>li:not([hidden])~li]:border-t"
    >
      {notes.map((note) => (
        <li key={note.id} hidden={shown !== null && !shown.has(note.id)}>
          <NoteListItem note={note} now={now} onLink={onLink} />
        </li>
      ))}
    </ul>
  );
}
