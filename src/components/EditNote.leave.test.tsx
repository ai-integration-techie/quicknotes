import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DISCARD_HEADING, EDIT_BUTTON, KEEP_EDITING } from "../copy";
import { StorageUnavailableError, type Note } from "../storage";
import { paste, settle, typeInto } from "../test/renderApp";
import {
  button,
  cancel,
  click,
  dialog,
  discardChanges,
  editNote,
  historyBack,
  keepEditing,
  noteField,
  openNote,
  press,
  renderWithAB,
  saveChanges,
  titleField,
  waitForHashChange,
} from "../test/renderEdit";
import {
  activate,
  backLink,
  goToHash,
  noteLink,
  noteLinkNames,
} from "../test/renderNotes";
import { deferred } from "../test/repositoryDoubles";

function counts(
  repository: Awaited<ReturnType<typeof renderWithAB>>["repository"],
) {
  return {
    create: repository.create.mock.calls.length,
    get: repository.get.mock.calls.length,
    update: repository.update.mock.calls.length,
    delete: repository.delete.mock.calls.length,
  };
}

function expectListView(): void {
  expect(screen.queryByRole("heading", { name: "Edit note" })).toBeNull();
  expect(screen.getByRole("heading", { name: "Your notes" })).toBeVisible();
}

describe("Edit mode: leaving", () => {
  it("a route change during a save waits; success shows the list with A first and focused; failure opens the discard dialog (AC-14)", async () => {
    const pending = deferred<Note>();
    const { repository, A } = await renderWithAB();
    repository.update.mockImplementation(() => pending.promise);
    await editNote("Shopping");
    paste(titleField(), "Shopping list");
    await saveChanges();
    await goToHash("");
    expect(titleField().value).toBe("Shopping list");
    expect(dialog()).toBeNull();
    pending.resolve({
      ...A,
      title: "Shopping list",
      updatedAt: Date.now() + 5,
    });
    await settle();
    expectListView();
    expect(noteLinkNames()[0]).toBe("Shopping list");
    expect(document.activeElement).toBe(noteLink("Shopping list"));
    expect(dialog()).toBeNull();
  });

  it("a route change during a failing save opens the discard dialog over the edit form (AC-14)", async () => {
    const pending = deferred<Note>();
    const { repository } = await renderWithAB();
    repository.update.mockImplementation(() => pending.promise);
    await editNote("Shopping");
    paste(titleField(), "Typed");
    await saveChanges();
    await goToHash("");
    expect(dialog()).toBeNull();
    pending.reject(new StorageUnavailableError());
    await settle();
    expect(dialog()).toHaveAccessibleName(DISCARD_HEADING);
    expect(titleField().value).toBe("Typed");
  });

  it("Cancel: no change returns to reading mode; with changes asks; Keep editing keeps text; Discard restores the note (AC-21)", async () => {
    const { repository } = await renderWithAB();
    await editNote("Shopping");
    const before = counts(repository);
    await cancel();
    expect(document.activeElement).toBe(button(EDIT_BUTTON));
    expect(dialog()).toBeNull();
    expect(counts(repository)).toEqual(before);

    await click(button(EDIT_BUTTON));
    typeInto(titleField(), "x");
    paste(titleField(), "Shopping");
    await cancel();
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(button(EDIT_BUTTON));

    await click(button(EDIT_BUTTON));
    typeInto(noteField(), " typed");
    await cancel();
    const open = dialog();
    expect(open).toHaveAccessibleName(DISCARD_HEADING);
    expect(document.activeElement).toBe(button(KEEP_EDITING));
    await keepEditing();
    expect(dialog()).toBeNull();
    expect(noteField().value).toBe("Milk\n\n  Eggs\tx typed");
    expect(document.activeElement).toBe(button("Cancel"));

    await cancel();
    await discardChanges();
    expect(
      screen.getByRole("heading", { level: 2, name: "Shopping" }),
    ).toBeInTheDocument();
    expect(
      document.querySelector("[data-note-body]")?.textContent ===
        "Milk\n\n  Eggs\tx",
    ).toBe(true);
    expect(document.activeElement).toBe(button(EDIT_BUTTON));
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("Back to notes with changes asks without navigating; Discard shows the list with A focused; no changes goes straight back (AC-22)", async () => {
    const { A } = await renderWithAB();
    await editNote("Shopping");
    typeInto(titleField(), "!");
    await click(backLink());
    expect(dialog()).toHaveAccessibleName(DISCARD_HEADING);
    expect(location.hash).toBe(`#note/${A.id}`);
    await discardChanges();
    await waitForHashChange();
    expectListView();
    expect(location.hash).toBe("");
    expect(document.activeElement).toBe(noteLink("Shopping"));

    await editNote("Shopping");
    await activate(backLink());
    expect(dialog()).toBeNull();
    expectListView();
    expect(document.activeElement).toBe(noteLink("Shopping"));
  });

  it("Back-button route change with changes holds the edit; Keep editing restores the note URL without new history or get; Discard shows the list (AC-23)", async () => {
    const { repository, A } = await renderWithAB();
    await editNote("Shopping");
    typeInto(noteField(), " typed");
    noteField().focus();
    const length = history.length;
    const gets = repository.get.mock.calls.length;

    await historyBack();
    expect(dialog()).toHaveAccessibleName(DISCARD_HEADING);
    expect(noteField().value).toBe("Milk\n\n  Eggs\tx typed");

    await keepEditing();
    await waitForHashChange();
    expect(dialog()).toBeNull();
    expect(location.hash).toBe(`#note/${A.id}`);
    expect(history.length).toBeLessThanOrEqual(length);
    expect(repository.get.mock.calls.length).toBe(gets);
    expect(noteField().value).toBe("Milk\n\n  Eggs\tx typed");
    expect(document.activeElement).toBe(noteField());

    await historyBack();
    expect(dialog()).not.toBeNull();
    await discardChanges();
    expectListView();
    expect(document.activeElement).toBe(noteLink("Shopping"));

    await editNote("Shopping");
    await historyBack();
    expect(dialog()).toBeNull();
    expectListView();
  });

  it("Escape answers the route dialog as Keep editing", async () => {
    const { A } = await renderWithAB();
    await editNote("Shopping");
    typeInto(titleField(), "!");
    await historyBack();
    await press("Escape");
    await waitForHashChange();
    expect(dialog()).toBeNull();
    expect(location.hash).toBe(`#note/${A.id}`);
    expect(document.activeElement).toBe(titleField());
  });

  it("returning to the note while the dialog is open closes it; another route becomes the destination (AC-24)", async () => {
    const { A, B } = await renderWithAB();
    await editNote("Shopping");
    typeInto(titleField(), "!");
    await goToHash("");
    expect(dialog()).not.toBeNull();
    await goToHash(`#note/${A.id}`);
    expect(dialog()).toBeNull();
    expect(titleField().value).toBe("Shopping!");

    await goToHash("");
    expect(dialog()).not.toBeNull();
    await goToHash(`#note/${B.id}`);
    expect(screen.getAllByRole("alertdialog")).toHaveLength(1);
    await discardChanges();
    expect(
      screen.getByRole("heading", { level: 2, name: "Other" }),
    ).toBeInTheDocument();
  });

  it("beforeunload is prevented only while the edit or the New note form has unsaved text (AC-26)", async () => {
    const prevented = () => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    const { A, repository } = await renderWithAB();
    repository.update.mockImplementation((_id, input) =>
      Promise.resolve({ ...A, ...input, updatedAt: Date.now() + 1 }),
    );
    await editNote("Shopping");
    expect(prevented()).toBe(false);
    typeInto(titleField(), "!");
    expect(prevented()).toBe(true);
    await saveChanges();
    expect(prevented()).toBe(false);

    await click(button(EDIT_BUTTON));
    typeInto(titleField(), "?");
    expect(prevented()).toBe(true);
    paste(titleField(), "Shopping!");
    expect(prevented()).toBe(false);

    typeInto(titleField(), "?");
    await cancel();
    await discardChanges();
    expect(prevented()).toBe(false);

    await activate(backLink());
    const newNote = screen.getByRole("textbox", { name: "Title" });
    paste(newNote, "draft");
    await openNote("Shopping!");
    await click(button(EDIT_BUTTON));
    expect(
      within(screen.getByRole("main")).getAllByRole("textbox"),
    ).toHaveLength(2);
    expect(prevented()).toBe(true);
  });
});
