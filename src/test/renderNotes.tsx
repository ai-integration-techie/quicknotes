/**
 * Helpers for the list-notes component tests (plan D13). Test support only.
 */
import {
  act,
  fireEvent,
  render,
  screen,
  within,
  type RenderResult,
} from "@testing-library/react";
import App from "../App";
import { NOTES_HEADING } from "../copy";
import type { Note, NoteRepository } from "../storage";
import { fixedId } from "./fakes";
import { createInMemoryNoteRepository } from "./inMemoryNoteRepository";
import { settle } from "./renderApp";

/** Sets the route (D13c), renders the app and lets the first effects run. */
export async function renderAt(
  hash: string,
  repository: NoteRepository,
): Promise<RenderResult> {
  history.replaceState(null, "", `/${hash}`);
  const result = render(<App repository={repository} />);
  await settle();
  return result;
}

/** The "Your notes" section (found even while it is hidden). */
export function notesSection(): HTMLElement {
  const heading = document.getElementById("notes-heading");
  const section = heading?.closest("section");
  if (!heading || !section || heading.textContent !== NOTES_HEADING) {
    throw new Error("notesSection: no Your notes section");
  }
  return section;
}

/** The note links in "Your notes", in DOM order. */
export function noteLinks(): HTMLAnchorElement[] {
  return within(notesSection()).queryAllByRole("link") as HTMLAnchorElement[];
}

/** The accessible names of the note links, in DOM order. */
export function noteLinkNames(): string[] {
  return noteLinks().map((link) => {
    const id = link.getAttribute("aria-labelledby") ?? "";
    return document.getElementById(id)?.textContent ?? "";
  });
}

/** The link for the note titled `title`. */
export function noteLink(title: string): HTMLAnchorElement {
  return within(notesSection()).getByRole("link", {
    name: title,
  }) as HTMLAnchorElement;
}

/** How long `activate` waits for a hashchange that may never come. */
const NO_HASHCHANGE_MS = 100;

/** Resolves on the next hashchange, or after `NO_HASHCHANGE_MS`. */
function nextHashChange(): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      window.removeEventListener("hashchange", done);
      resolve();
    };
    const timer = setTimeout(done, NO_HASHCHANGE_MS);
    window.addEventListener("hashchange", done);
  });
}

/**
 * "Activating a link" (D13d): a click, which jsdom follows. jsdom fires
 * `hashchange` (from a fragment link or `history.back()`) in a later task,
 * so this waits for it (or a short time when the activation doesn't
 * navigate, as with the skip link or a replaced entry), then settles.
 */
export async function activate(link: HTMLElement): Promise<void> {
  const changed = nextHashChange();
  link.focus();
  fireEvent.click(link);
  await act(async () => {
    await changed;
  });
  await settle();
}

/** Sets `location.hash` (as browser Back or a typed URL would) and waits for its hashchange. */
export async function goToHash(hash: string): Promise<void> {
  const changed = nextHashChange();
  location.hash = hash;
  await act(async () => {
    await changed;
  });
  await settle();
}

/** The "Back to notes" link of the note view. */
export function backLink(): HTMLAnchorElement {
  return screen.getByRole("link", {
    name: "Back to notes",
  }) as HTMLAnchorElement;
}

/** A note with `fixedId(n)`, updated at `n` unless overridden. */
export function makeNote(n: number, overrides: Partial<Note> = {}): Note {
  return {
    id: fixedId(n),
    title: `Note ${n}`,
    body: `Body ${n}`,
    createdAt: n,
    updatedAt: n,
    ...overrides,
  };
}

/** An in-memory repository holding `inputs`, created in order at clocks 1000, 2000, … */
export async function inMemoryWith(
  ...inputs: { title: string; body: string }[]
): Promise<{ repository: NoteRepository; notes: Note[] }> {
  let time = 0;
  const repository = createInMemoryNoteRepository({ now: () => time });
  const notes: Note[] = [];
  for (const input of inputs) {
    time += 1000;
    notes.push(await repository.create(input));
  }
  return { repository, notes };
}

/** Text of each "Updated …" line in "Your notes", in DOM order. */
export function updatedLines(): string[] {
  return [...notesSection().querySelectorAll("time")].map(
    (time) => time.parentElement?.textContent ?? "",
  );
}
