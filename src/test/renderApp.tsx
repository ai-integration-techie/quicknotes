/**
 * Renders the app with a test repository and finds the form's parts by
 * role (create-note plan D1). Test support only.
 */
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import App from "../App";
import { NOTE_LABEL, SAVE_BUTTON, TITLE_LABEL } from "../copy";
import type { NoteRepository } from "../storage";

export interface RenderedApp {
  readonly form: HTMLFormElement;
  readonly title: HTMLInputElement;
  readonly note: HTMLTextAreaElement;
  readonly saveButton: HTMLButtonElement;
  readonly status: HTMLElement;
  readonly alert: HTMLElement;
}

export function renderApp(repository: NoteRepository): RenderedApp {
  render(<App repository={repository} />);
  const main = screen.getByRole("main");
  const form = main.querySelector("form");
  if (!form) throw new Error("renderApp: no <form> in main");
  return {
    form,
    title: screen.getByRole("textbox", {
      name: TITLE_LABEL,
    }) as HTMLInputElement,
    note: screen.getByRole("textbox", {
      name: NOTE_LABEL,
    }) as HTMLTextAreaElement,
    saveButton: screen.getByRole("button", {
      name: SAVE_BUTTON,
    }) as HTMLButtonElement,
    status: within(form).getByRole("status"),
    alert: within(form).getByRole("alert"),
  };
}

/** "Paste": sets the field's whole value in one change event. */
export function paste(field: HTMLElement, text: string): void {
  fireEvent.change(field, { target: { value: text } });
}

/** "Type": appends `text` to the field's current value in one change event. */
export function typeInto(
  field: HTMLInputElement | HTMLTextAreaElement,
  text: string,
): void {
  fireEvent.change(field, { target: { value: field.value + text } });
}

/** Lets a pending save settle (microtasks plus one macrotask). */
export async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** Clicks "Save note" (focusing it first, as a real click does) and settles. */
export async function clickSave(app: RenderedApp): Promise<void> {
  app.saveButton.focus();
  fireEvent.click(app.saveButton);
  await settle();
}

/** Presses Ctrl+Enter in `field` and settles. */
export async function pressSaveShortcut(
  field: HTMLElement,
  modifier: "ctrlKey" | "metaKey" = "ctrlKey",
): Promise<void> {
  field.focus();
  fireEvent.keyDown(field, { key: "Enter", code: "Enter", [modifier]: true });
  await settle();
}
