/**
 * Helpers for the edit-delete-note component tests (plan, Files). Test
 * support only.
 */
import { act, fireEvent, screen, within } from "@testing-library/react";
import {
  CANCEL_BUTTON,
  DELETE_BUTTON,
  DELETE_NOTE,
  DISCARD_CHANGES,
  EDIT_BUTTON,
  KEEP_EDITING,
  KEEP_NOTE,
  NOTE_LABEL,
  SAVE_CHANGES,
  TITLE_LABEL,
} from "../copy";
import type { Note, NoteRepository } from "../storage";
import { createInMemoryNoteRepository } from "./inMemoryNoteRepository";
import { settle } from "./renderApp";
import { activate, noteLink, notesSection, renderAt } from "./renderNotes";
import { spyOn, type SpyRepository } from "./repositoryDoubles";

/** The spec's default notes: A (older), then B. */
export const A_INPUT = { title: "Shopping", body: "Milk\n\n  Eggs\tx" };
export const B_INPUT = { title: "Other", body: "b" };

export interface EditFixture {
  readonly repository: SpyRepository;
  readonly A: Note;
  readonly B: Note;
}

/**
 * A spy over the in-memory double holding A then B, created with the real
 * clock (so "Updated just now" reads right under `vi.setSystemTime`), then
 * the app rendered at the list.
 */
export async function renderWithAB(
  inputs: readonly { title: string; body: string }[] = [A_INPUT, B_INPUT],
): Promise<EditFixture & { notes: Note[] }> {
  // The real clock, made strictly increasing so A is older than B.
  let last = 0;
  const inner = createInMemoryNoteRepository({
    now: () => (last = Math.max(Date.now(), last + 1)),
  });
  const notes: Note[] = [];
  for (const input of inputs) notes.push(await inner.create(input));
  const repository = spyOn(inner);
  await renderAt("", repository);
  return {
    repository,
    A: notes[0] as Note,
    B: notes[1] as Note,
    notes,
  };
}

/** Clicks `element` (focusing it first, as a real click does) and settles. */
export async function click(element: HTMLElement): Promise<void> {
  element.focus();
  fireEvent.click(element);
  await settle();
}

/** Presses `key` on the focused element and settles. */
export async function press(
  key: string,
  init: Partial<KeyboardEventInit> = {},
): Promise<void> {
  fireEvent.keyDown(document.activeElement ?? document.body, { key, ...init });
  await settle();
}

export function button(name: string): HTMLButtonElement {
  return screen.getByRole("button", { name }) as HTMLButtonElement;
}

export function queryButton(name: string): HTMLButtonElement | null {
  return screen.queryByRole("button", { name }) as HTMLButtonElement | null;
}

/** "Opened A": the list loaded and A's link activated. */
export async function openNote(title: string): Promise<void> {
  await activate(noteLink(title));
}

/** "Edit A": opened A, then "Edit" activated. */
export async function editNote(title: string): Promise<void> {
  await openNote(title);
  await click(button(EDIT_BUTTON));
}

export function titleField(): HTMLInputElement {
  return screen.getByRole("textbox", { name: TITLE_LABEL }) as HTMLInputElement;
}

export function noteField(): HTMLTextAreaElement {
  return screen.getByRole("textbox", {
    name: NOTE_LABEL,
  }) as HTMLTextAreaElement;
}

export function editForm(): HTMLFormElement {
  const form = titleField().closest("form");
  if (!form) throw new Error("editForm: no edit form");
  return form;
}

/** The edit form's status and alert regions. */
export function formRegions(): { status: HTMLElement; alert: HTMLElement } {
  const form = editForm();
  return {
    status: within(form).getByRole("status"),
    alert: within(form).getByRole("alert"),
  };
}

export const saveChanges = (): Promise<void> => click(button(SAVE_CHANGES));
export const cancel = (): Promise<void> => click(button(CANCEL_BUTTON));
export const keepEditing = (): Promise<void> => click(button(KEEP_EDITING));
export const discardChanges = (): Promise<void> =>
  click(button(DISCARD_CHANGES));
export const keepNote = (): Promise<void> => click(button(KEEP_NOTE));

/** Opens the delete dialog and confirms it. */
export async function deleteOpenedNote(): Promise<void> {
  await click(button(DELETE_BUTTON));
  await click(button(DELETE_NOTE));
  await waitForHashChange();
}

/** The open dialog, or null. */
export function dialog(): HTMLElement | null {
  return screen.queryByRole("alertdialog");
}

/** The note view's own status and alert regions (outside any form, R3). */
export function viewRegions(): { status: HTMLElement[]; alert: HTMLElement[] } {
  const main = screen.getByRole("main");
  const outside = (element: HTMLElement) =>
    !element.closest("form") && !element.closest("[hidden]");
  return {
    status: within(main).queryAllByRole("status").filter(outside),
    alert: within(main).queryAllByRole("alert").filter(outside),
  };
}

/** The "Your notes" status region (R35), found even while hidden. */
export function notesStatus(): HTMLElement {
  const region = notesSection().querySelector<HTMLElement>('[role="status"]');
  if (!region) throw new Error("notesStatus: no status region");
  return region;
}

/** Waits for the next hashchange (or a short time) and settles. */
export async function waitForHashChange(): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer);
        window.removeEventListener("hashchange", done);
        resolve();
      };
      const timer = setTimeout(done, 100);
      window.addEventListener("hashchange", done);
    });
  });
  await settle();
}

/** The browser's Back button: `history.back()`, then its hashchange (plan S1). */
export async function historyBack(): Promise<void> {
  history.back();
  await waitForHashChange();
}

/** Records every text the element shows, through a MutationObserver. */
export function textSequence(element: HTMLElement): {
  readonly texts: string[];
  stop(): void;
} {
  const texts: string[] = [];
  const observer = new MutationObserver(() => {
    texts.push(element.textContent ?? "");
  });
  observer.observe(element, {
    childList: true,
    characterData: true,
    subtree: true,
  });
  return { texts, stop: () => observer.disconnect() };
}

export type { NoteRepository };
