import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from "react";
import {
  NO_MATCHES_PRIMARY,
  NO_MATCHES_SECONDARY,
  searchStatusText,
} from "../copy";
import { isBlankQuery, matchNotes, primeFolds } from "../noteSearch/match";
import { SEARCH_STATUS_DELAY_MS } from "../noteSearch/searchStatus";
import type { Note } from "../storage";
import NoteList, { type NoteListHandle } from "./NoteList";
import SearchArea from "./SearchArea";

interface SearchableNotesProps {
  /** The loaded list, never empty (search-notes R1, R2). */
  readonly notes: readonly Note[];
  readonly now: number;
  readonly listRef: Ref<NoteListHandle>;
}

/**
 * The search area over a loaded, non-empty list (search-notes plan D2).
 * The query is plain state here: it lives only in memory, survives the
 * note view (this stays mounted, hidden) and is gone when the list empties
 * (this unmounts) or the page reloads (R2, R16, R17). Every item stays
 * mounted; non-matches are hidden (D3). The count is announced
 * `SEARCH_STATUS_DELAY_MS` after the last change (R15, D6).
 */
export default function SearchableNotes({
  notes,
  now,
  listRef,
}: SearchableNotesProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const blank = isBlankQuery(query);
  const matches = useMemo(() => matchNotes(query, notes), [query, notes]);
  const shown = useMemo(
    () => (blank ? null : new Set(matches.map((note) => note.id))),
    [blank, matches],
  );

  // R15: restarted by every change to the query or to the shown list.
  useEffect(() => {
    if (blank) return;
    const timer = setTimeout(
      () => setStatus(searchStatusText(matches.length)),
      SEARCH_STATUS_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [blank, query, matches]);

  function change(value: string): void {
    setQuery(value);
    if (isBlankQuery(value)) setStatus(""); // R15: emptied at once
  }

  function clear(): void {
    change("");
    inputRef.current?.focus(); // R13
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== "Escape" || event.currentTarget.value === "") return;
    event.preventDefault(); // R13
    change("");
  }

  return (
    <>
      <SearchArea
        query={query}
        onChange={change}
        onClear={clear}
        onEscape={onKeyDown}
        onFocus={() => primeFolds(notes)}
        inputRef={inputRef}
        status={status}
      />
      <NoteList ref={listRef} notes={notes} now={now} shown={shown} />
      {shown !== null && shown.size === 0 && (
        <div className="mt-3">
          <p className="text-lg font-medium text-zinc-900">
            {NO_MATCHES_PRIMARY}
          </p>
          <p className="text-base text-zinc-600">{NO_MATCHES_SECONDARY}</p>
        </div>
      )}
    </>
  );
}
