import type { MouseEvent } from "react";
import { SKIP_TO_NOTES } from "../copy";
import { isPlainClick } from "../routing/plainClick";

interface SkipLinkProps {
  onActivate(): void;
}

/**
 * "Skip to your notes" (list-notes R28, plan D7): off-screen until focused,
 * then at the top left, in the page flow. (Overlaying the header would hide
 * the h1's background from axe and leave its contrast unchecked, AC-44.)
 * It moves focus without changing the URL or history.
 */
export default function SkipLink({ onActivate }: SkipLinkProps) {
  function onClick(event: MouseEvent<HTMLAnchorElement>): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    onActivate();
  }

  return (
    <a
      href="#notes-heading"
      onClick={onClick}
      className="absolute left-2 -top-24 z-10 inline-flex min-h-11 items-center bg-white px-3 py-2 text-accent underline focus:static focus:m-2"
    >
      {SKIP_TO_NOTES}
    </a>
  );
}
