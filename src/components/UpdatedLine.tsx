import { UPDATED_PREFIX } from "../copy";
import { relativeTime } from "../noteList/relativeTime";

interface UpdatedLineProps {
  readonly id?: string;
  readonly updatedAt: number;
  /** When the view last rendered; read in an effect or handler (R8). */
  readonly now: number;
}

/** "Updated <time>5 minutes ago</time>" (list-notes R8). */
export default function UpdatedLine({ id, updatedAt, now }: UpdatedLineProps) {
  return (
    <span id={id} className="block text-sm text-zinc-600">
      {UPDATED_PREFIX}
      <time dateTime={new Date(updatedAt).toISOString()}>
        {relativeTime(updatedAt, now)}
      </time>
    </span>
  );
}
