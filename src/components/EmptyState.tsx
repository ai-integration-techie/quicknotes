import { EMPTY_STATE_PRIMARY, EMPTY_STATE_SECONDARY } from "../copy";

export default function EmptyState() {
  return (
    <div className="pt-16 text-center break-words">
      <p className="text-lg font-medium text-zinc-900">{EMPTY_STATE_PRIMARY}</p>
      <p className="text-base text-zinc-300">{EMPTY_STATE_SECONDARY}</p>
    </div>
  );
}
