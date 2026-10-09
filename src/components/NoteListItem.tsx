import { memo, useId } from "react";
import { UNTITLED_NOTE } from "../copy";
import { isBlank, previewText } from "../noteList/display";
import { noteHref } from "../routing/route";
import type { Note } from "../storage";
import UpdatedLine from "./UpdatedLine";

interface NoteListItemProps {
  readonly note: Note;
  readonly now: number;
  onLink(id: string, link: HTMLAnchorElement | null): void;
}

/**
 * One note in "Your notes" (list-notes R5-R8, plan D9). The whole item is
 * one link: its name is the title line, its description the preview and
 * the updated line. The app adds no click handler, so the browser follows
 * the link and adds the history entry (R16).
 */
function NoteListItem({ note, now, onLink }: NoteListItemProps) {
  const titleId = useId();
  const previewId = useId();
  const updatedId = useId();
  const preview = previewText(note.body);
  const describedBy =
    preview === null ? updatedId : `${previewId} ${updatedId}`;

  return (
    <li>
      <a
        ref={(link) => onLink(note.id, link)}
        href={noteHref(note.id)}
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        className="block min-h-11 px-4 py-3 hover:bg-zinc-100"
      >
        {isBlank(note.title) ? (
          <span
            id={titleId}
            className="block break-words text-base font-medium text-zinc-600"
          >
            {UNTITLED_NOTE}
          </span>
        ) : (
          <span
            id={titleId}
            className="block break-words text-base font-medium text-zinc-900"
          >
            {note.title}
          </span>
        )}
        {preview !== null && (
          <span
            id={previewId}
            className="block break-words text-sm text-zinc-600"
          >
            {preview}
          </span>
        )}
        <UpdatedLine id={updatedId} updatedAt={note.updatedAt} now={now} />
      </a>
    </li>
  );
}

export default memo(NoteListItem);
