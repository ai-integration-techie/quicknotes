/**
 * Helpers for the search-notes component tests (plan, Files). Test support
 * only.
 */
import { act, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import { CLEAR_SEARCH, SEARCH_LABEL } from "../copy";
import type { Note, NoteRepository } from "../storage";
import { typeInto } from "./renderApp";
import {
  inMemoryWith,
  noteLinkNames,
  notesSection,
  renderAt,
} from "./renderNotes";
import { spyOn, type SpyRepository } from "./repositoryDoubles";

/** The spec's default notes, created oldest first so `list()` gives C, B, A. */
export const A_INPUT = { title: "Groceries", body: "Shopping for the party" };
export const B_INPUT = { title: "Ideas", body: "café plans" };
export const C_INPUT = { title: "Shopping list", body: "milk" };

export interface SearchFixture {
  /** A spy over the in-memory double. */
  readonly repository: SpyRepository;
  /** The in-memory double itself, for changes behind the app's back. */
  readonly inner: NoteRepository;
  readonly A: Note;
  readonly B: Note;
  readonly C: Note;
}

/** The in-memory double holding C, B, A (newest first), and the app rendered at the list. */
export async function searchWithCBA(): Promise<SearchFixture> {
  const { repository: inner, notes } = await inMemoryWith(
    A_INPUT,
    B_INPUT,
    C_INPUT,
  );
  const repository = spyOn(inner);
  await renderAt("", repository);
  const [A, B, C] = notes as [Note, Note, Note];
  return { repository, inner, A, B, C };
}

/** The "Search notes" searchbox (found even while the list view is hidden). */
export function searchbox(): HTMLInputElement {
  return screen.getByRole("searchbox", {
    name: SEARCH_LABEL,
    hidden: true,
  }) as HTMLInputElement;
}

export function querySearchbox(): HTMLInputElement | null {
  return screen.queryByRole("searchbox", {
    hidden: true,
  }) as HTMLInputElement | null;
}

export function clearButton(): HTMLButtonElement {
  return screen.getByRole("button", {
    name: CLEAR_SEARCH,
  }) as HTMLButtonElement;
}

export function queryClearButton(): HTMLButtonElement | null {
  return screen.queryByRole("button", {
    name: CLEAR_SEARCH,
  }) as HTMLButtonElement | null;
}

/** The search status region (plan D9), or null while it isn't rendered. */
export function querySearchStatus(): HTMLElement | null {
  return notesSection().querySelector<HTMLElement>("[data-search-status]");
}

export function searchStatus(): HTMLElement {
  const region = querySearchStatus();
  if (!region) throw new Error("searchStatus: no search status region");
  return region;
}

/** "Searched for X": types `text` into the searchbox one character at a time. */
export function typeQuery(text: string): void {
  const field = searchbox();
  for (const character of text) typeInto(field, character);
}

/** The names of the note links shown (hidden ones are skipped). */
export const shownLinkNames = noteLinkNames;

/** The section's list, if one is exposed to assistive technology. */
export function queryShownList(): HTMLElement | null {
  return within(notesSection()).queryByRole("list");
}

/** D11: fake only the timers the search status uses. */
export function fakeStatusTimers(): void {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
}

/** Advances the fake timers by `ms` inside `act`. */
export function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}
