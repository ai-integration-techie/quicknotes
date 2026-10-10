import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useDialogHost } from "../dialog/ModalLayer";

export interface ConfirmDialogProps {
  readonly heading: string;
  /** The body paragraphs; their ids are `describedByIds`. */
  readonly children: ReactNode;
  readonly describedByIds: readonly string[];
  readonly safeLabel: string;
  readonly otherLabel: string;
  /** The other button's label while `busy` (for example "Deleting…"). */
  readonly otherBusyLabel?: string;
  /** While busy both buttons are aria-disabled and Escape is ignored (R27). */
  readonly busy: boolean;
  /** The safe choice (its button or Escape), with the element focused before the dialog opened. */
  onSafe(previouslyFocused: Element | null): void;
  onOther(): void;
}

/**
 * The modal confirmation pattern (edit-delete-note R23, plan D1, D2): a
 * custom `role="alertdialog"` in a portal, with the app root inert while
 * it is open. Focus starts on the safe button, Tab and Shift+Tab cycle
 * between the two buttons, Escape is the safe choice, and a click outside
 * does nothing. Keyboard and mouse listeners are attached with
 * `addEventListener`, so no element with a role has handler props.
 */
export default function ConfirmDialog({
  heading,
  children,
  describedByIds,
  safeLabel,
  otherLabel,
  otherBusyLabel,
  busy,
  onSafe,
  onOther,
}: ConfirmDialogProps) {
  const { host, appRoot } = useDialogHost();
  const headingId = useId();
  const backdropRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const safeRef = useRef<HTMLButtonElement>(null);
  const otherRef = useRef<HTMLButtonElement>(null);
  const previousRef = useRef<Element | null>(null);
  const latest = useRef({ busy, onSafe });
  useLayoutEffect(() => {
    latest.current = { busy, onSafe };
  });

  // Opening: remember focus, make the page inert, focus the safe button.
  // Closing: the page is usable again, and if focus was lost with the
  // dialog it goes back where it was (the caller may then move it).
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!appRoot || !box) return undefined;
    const previous = document.activeElement;
    previousRef.current = previous;
    appRoot.setAttribute("inert", "");
    safeRef.current?.focus();
    return () => {
      appRoot.removeAttribute("inert");
      const active = document.activeElement;
      const lost =
        active === null || active === document.body || box.contains(active);
      if (lost && previous instanceof HTMLElement && previous.isConnected) {
        previous.focus();
      }
    };
  }, [appRoot, host]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Tab") {
        event.preventDefault();
        const next =
          document.activeElement === safeRef.current
            ? otherRef.current
            : safeRef.current;
        next?.focus();
      } else if (event.key === "Escape") {
        event.preventDefault();
        if (!latest.current.busy) latest.current.onSafe(previousRef.current);
      }
    }
    const backdrop = backdropRef.current;
    function onBackdropMouseDown(event: MouseEvent): void {
      // A click outside the dialog does nothing, not even move focus.
      if (event.target === backdrop) event.preventDefault();
    }
    document.addEventListener("keydown", onKeyDown);
    backdrop?.addEventListener("mousedown", onBackdropMouseDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      backdrop?.removeEventListener("mousedown", onBackdropMouseDown);
    };
  }, [host]);

  if (!host) return null;
  return createPortal(
    <div
      ref={backdropRef}
      data-dialog-backdrop=""
      className="fixed inset-0 z-20 overflow-y-auto bg-zinc-900/50 px-4 pt-[15vh]"
    >
      <div
        ref={boxRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={describedByIds.join(" ")}
        className="mx-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-md border border-zinc-300 bg-white p-6"
      >
        <h2 id={headingId} className="text-lg font-semibold text-zinc-900">
          {heading}
        </h2>
        {children}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            ref={safeRef}
            type="button"
            aria-disabled={busy ? "true" : undefined}
            onClick={() => {
              if (!busy) onSafe(previousRef.current);
            }}
            className="min-h-11 rounded-md bg-accent px-4 font-medium text-white"
          >
            {safeLabel}
          </button>
          <button
            ref={otherRef}
            type="button"
            aria-disabled={busy ? "true" : undefined}
            onClick={() => {
              if (!busy) onOther();
            }}
            className="min-h-11 rounded-md border border-zinc-500 bg-white px-4 font-medium text-zinc-900 hover:bg-zinc-100"
          >
            {busy && otherBusyLabel !== undefined ? otherBusyLabel : otherLabel}
          </button>
        </div>
      </div>
    </div>,
    host,
  );
}
