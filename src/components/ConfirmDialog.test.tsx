import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DELETE_BUTTON,
  DELETE_HEADING,
  DELETE_NOTE,
  DELETE_TEXT,
  DISCARD_CHANGES,
  DISCARD_HEADING,
  DISCARD_TEXT,
  KEEP_EDITING,
  KEEP_NOTE,
} from "../copy";
import { typeInto } from "../test/renderApp";
import {
  button,
  cancel,
  click,
  dialog,
  editNote,
  keepNote,
  noteField,
  openNote,
  press,
  renderWithAB,
} from "../test/renderEdit";

afterEach(() => {
  vi.restoreAllMocks();
});

function appRoot(): HTMLElement {
  const root = screen.getByRole("banner").parentElement;
  if (!root) throw new Error("appRoot: no root");
  return root;
}

describe("Confirmation dialogs", () => {
  it("Delete opens a modal alertdialog with name, description, Keep note focused, no delete and no window dialogs (AC-29)", async () => {
    const spies = (["confirm", "alert", "prompt"] as const).map((name) =>
      vi.spyOn(window, name).mockImplementation(() => {
        throw new Error(`${name} must not be called`);
      }),
    );
    const { repository } = await renderWithAB();
    await openNote("Shopping");
    await click(button(DELETE_BUTTON));
    const box = dialog() as HTMLElement;
    expect(box).toHaveAttribute("aria-modal", "true");
    expect(box).toHaveAccessibleName(DELETE_HEADING);
    expect(box).toHaveAccessibleDescription(`Shopping ${DELETE_TEXT}`);
    expect(
      within(box)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual([KEEP_NOTE, DELETE_NOTE]);
    expect(document.activeElement).toBe(button(KEEP_NOTE));
    expect(repository.delete).not.toHaveBeenCalled();
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  it("Escape and Keep note close the delete dialog, focus Delete, delete nothing (AC-30)", async () => {
    const { repository } = await renderWithAB();
    await openNote("Shopping");
    await click(button(DELETE_BUTTON));
    await press("Escape");
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(button(DELETE_BUTTON));
    await click(button(DELETE_BUTTON));
    await keepNote();
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(button(DELETE_BUTTON));
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("delete dialog title line: Untitled note for blank, exact spaces, full 200 characters (AC-31)", async () => {
    const long = "w".repeat(200);
    const { notes } = await renderWithAB([
      { title: "", body: "empty title" },
      { title: "\t", body: "tab title" },
      { title: "  lead  ", body: "spaces" },
      { title: long, body: "long" },
    ]);
    const expected = ["Untitled note", "Untitled note", "  lead  ", long];
    for (const [index, note] of notes.entries()) {
      location.hash = `#note/${note.id}`;
      await new Promise((resolve) => setTimeout(resolve, 0));
      await click(await screen.findByRole("button", { name: DELETE_BUTTON }));
      const box = dialog() as HTMLElement;
      const titleLine = box.querySelector("p");
      expect(titleLine?.textContent === expected[index]).toBe(true);
      if (index < 2) expect(titleLine?.className).toContain("text-zinc-600");
      await keepNote();
    }
  });

  it("discard dialog role, name, description, button order and Escape (AC-32)", async () => {
    await renderWithAB();
    await editNote("Shopping");
    typeInto(noteField(), "!");
    await cancel();
    const box = dialog() as HTMLElement;
    expect(box).toHaveAttribute("aria-modal", "true");
    expect(box).toHaveAccessibleName(DISCARD_HEADING);
    expect(box).toHaveAccessibleDescription(DISCARD_TEXT);
    expect(
      within(box)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual([KEEP_EDITING, DISCARD_CHANGES]);
    await press("Escape");
    expect(dialog()).toBeNull();
    expect(noteField().value).toBe("Milk\n\n  Eggs\tx!");
  });

  it("Tab and Shift+Tab cycle between the two buttons; the app root is inert while open (R23)", async () => {
    await renderWithAB();
    await openNote("Shopping");
    expect(appRoot().hasAttribute("inert")).toBe(false);
    await click(button(DELETE_BUTTON));
    expect(appRoot().hasAttribute("inert")).toBe(true);
    expect(appRoot().contains(dialog())).toBe(false);
    const keep = button(KEEP_NOTE);
    const del = button(DELETE_NOTE);
    const seen: (Element | null)[] = [];
    for (const shiftKey of [false, false, false, true, true, true]) {
      await press("Tab", { shiftKey });
      seen.push(document.activeElement);
    }
    expect(seen).toEqual([del, keep, del, keep, del, keep]);
    // From outside the dialog, Tab goes to the safe button.
    keep.blur();
    expect(document.activeElement).toBe(document.body);
    await press("Tab");
    expect(document.activeElement).toBe(keep);
    await keepNote();
    expect(appRoot().hasAttribute("inert")).toBe(false);
  });

  it("a mousedown on the backdrop is cancelled, so focus stays in the dialog", async () => {
    await renderWithAB();
    await openNote("Shopping");
    await click(button(DELETE_BUTTON));
    const backdrop = (dialog() as HTMLElement).parentElement as HTMLElement;
    const event = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
    });
    backdrop.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    backdrop.click();
    expect(dialog()).not.toBeNull();
    expect(document.activeElement).toBe(button(KEEP_NOTE));
  });
});
