import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DELETE_BUTTON, EDIT_BUTTON } from "../copy";
import { NotFoundError, StorageUnavailableError, type Note } from "../storage";
import { settle } from "../test/renderApp";
import {
  button,
  click,
  editNote,
  openNote,
  queryButton,
  renderWithAB,
  viewRegions,
} from "../test/renderEdit";
import {
  backLink,
  makeNote,
  notesSection,
  renderAt,
} from "../test/renderNotes";
import { createStubRepository } from "../test/repositoryDoubles";

function precedes(a: Node, b: Node): boolean {
  return (
    (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
  );
}

const A = makeNote(1, { title: "Shopping", body: "Milk\n\n  Eggs\tx" });

describe("Note view: reading-mode actions", () => {
  it("reading mode has one link and exactly Edit and Delete, in order, before the article; Tab order link → Edit → Delete (AC-1)", async () => {
    await renderWithAB();
    await openNote("Shopping");
    const main = screen.getByRole("main");
    const links = within(main).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Back to notes"]);
    const buttons = within(main).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["Edit", "Delete"]);
    expect(buttons.every((b) => b.getAttribute("type") === "button")).toBe(
      true,
    );
    const article = main.querySelector("article") as HTMLElement;
    expect(precedes(links[0] as Node, buttons[0] as Node)).toBe(true);
    expect(precedes(buttons[0] as Node, buttons[1] as Node)).toBe(true);
    expect(precedes(buttons[1] as Node, article)).toBe(true);
    expect(within(main).queryAllByRole("textbox")).toHaveLength(0);
    const editable = [...main.querySelectorAll("[contenteditable]")].filter(
      (element) => !element.closest("[hidden]"),
    );
    expect(editable).toHaveLength(0);
    // Tab order is DOM order: no positive tabindex on the row's controls.
    for (const control of [...links, ...buttons]) {
      expect(control.tabIndex).toBe(0);
    }
  });

  it.each<[string, () => Promise<Note>]>([
    ["get pending", () => new Promise<Note>(() => {})],
    ["get not found", () => Promise.reject(new NotFoundError())],
    ["get unavailable", () => Promise.reject(new StorageUnavailableError())],
  ])(
    "no Edit or Delete while loading, not found or open failed, or in the list; list items keep one link and no button (AC-2): %s",
    async (_name, get) => {
      await renderAt(
        "",
        createStubRepository({ list: () => Promise.resolve([A]), get }),
      );
      for (const item of within(notesSection()).getAllByRole("listitem")) {
        expect(within(item).getAllByRole("link")).toHaveLength(1);
        expect(within(item).queryAllByRole("button")).toHaveLength(0);
      }
      expect(queryButton(EDIT_BUTTON)).toBeNull();
      expect(queryButton(DELETE_BUTTON)).toBeNull();
      location.hash = `#note/${A.id}`;
      await settle();
      await settle();
      expect(backLink()).toBeInTheDocument();
      expect(queryButton(EDIT_BUTTON)).toBeNull();
      expect(queryButton(DELETE_BUTTON)).toBeNull();
    },
  );

  it("the view has one empty status and one empty alert region that are the same nodes in edit mode (AC-3)", async () => {
    await renderWithAB();
    await openNote("Shopping");
    const before = viewRegions();
    expect(before.status).toHaveLength(1);
    expect(before.alert).toHaveLength(1);
    expect(before.status[0]?.textContent).toBe("");
    expect(before.alert[0]?.textContent).toBe("");
    await click(button(EDIT_BUTTON));
    const after = viewRegions();
    expect(after.status).toHaveLength(1);
    expect(after.alert).toHaveLength(1);
    expect(after.status[0]).toBe(before.status[0]);
    expect(after.alert[0]).toBe(before.alert[0]);
    expect(after.status[0]?.textContent).toBe("");
    expect(after.alert[0]?.textContent).toBe("");
  });

  it("edit mode keeps the view regions below the action row", async () => {
    await renderWithAB();
    await editNote("Shopping");
    const regions = viewRegions();
    expect(precedes(backLink(), regions.status[0] as Node)).toBe(true);
  });
});
