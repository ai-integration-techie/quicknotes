import type { MouseEvent } from "react";
import { BACK_TO_NOTES } from "../copy";
import { appUrl } from "../routing/route";

interface BackLinkProps {
  onBack(event: MouseEvent<HTMLAnchorElement>): void;
}

/** "Back to notes" (list-notes R24, plan D8). Its href is the app's own URL. */
export default function BackLink({ onBack }: BackLinkProps) {
  return (
    <a
      href={appUrl(window.location)}
      onClick={onBack}
      className="inline-flex min-h-11 items-center gap-1 text-base text-accent underline"
    >
      {/* The "←" is drawn, not typed: axe can't rate a lone glyph's contrast (AC-44). */}
      <svg
        aria-hidden="true"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13 8H3M7 4L3 8l4 4" />
      </svg>
      {BACK_TO_NOTES}
    </a>
  );
}
