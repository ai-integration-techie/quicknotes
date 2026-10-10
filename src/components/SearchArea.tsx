import { useId, type KeyboardEvent, type Ref } from "react";
import { CLEAR_SEARCH, SEARCH_LABEL } from "../copy";

interface SearchAreaProps {
  readonly query: string;
  onChange(value: string): void;
  onClear(): void;
  onEscape(event: KeyboardEvent<HTMLInputElement>): void;
  onFocus(): void;
  readonly inputRef: Ref<HTMLInputElement>;
  /** The polite count, or "" (search-notes R15). */
  readonly status: string;
}

/**
 * The search landmark and its status line (search-notes R1, R15, R21;
 * plan D9, D10). Not in a form, so Enter submits nothing (R12). The
 * status is a sibling of the landmark, not a direct child of the section,
 * so "Your notes" keeps its own status region right below the heading.
 */
export default function SearchArea({
  query,
  onChange,
  onClear,
  onEscape,
  onFocus,
  inputRef,
  status,
}: SearchAreaProps) {
  const inputId = useId();
  return (
    <div className="mt-3">
      <div role="search">
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-zinc-900"
        >
          {SEARCH_LABEL}
        </label>
        <div className="mt-1 flex flex-wrap gap-2">
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            autoComplete="off"
            value={query}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onEscape}
            onFocus={onFocus}
            className="min-h-11 min-w-0 grow basis-48 rounded-md border border-zinc-500 bg-white px-3 py-2 text-base text-zinc-900"
          />
          {query !== "" && (
            <button
              type="button"
              onClick={onClear}
              className="min-h-11 rounded-md border border-zinc-500 bg-white px-4 font-medium text-zinc-900 hover:bg-zinc-100"
            >
              {CLEAR_SEARCH}
            </button>
          )}
        </div>
      </div>
      <div
        role="status"
        data-search-status=""
        className="text-sm text-zinc-600 not-empty:mt-2"
      >
        {status}
      </div>
    </div>
  );
}
