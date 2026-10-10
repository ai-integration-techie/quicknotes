import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  DELETE_BUTTON,
  DELETE_NOTE,
  EDIT_BUTTON,
  LIST_UNAVAILABLE,
  NOTE_DELETED,
} from "../copy";
import { StorageUnavailableError, type Note } from "../storage";
import { paste, settle } from "../test/renderApp";
import {
  button,
  click,
  deleteOpenedNote,
  editNote,
  notesStatus,
  openNote,
  renderWithAB,
  saveChanges,
  titleField,
} from "../test/renderEdit";
import {
  activate,
  backLink,
  makeNote,
  noteLinkNames,
  notesSection,
  renderAt,
} from "../test/renderNotes";
import { createStubRepository, deferred } from "../test/repositoryDoubles";

const A = makeNote(1, { title: "A", body: "a" });
const B = makeNote(2, { title: "B", body: "b" });

describe("The list stays true", () => {
  it("edits and deletes made while list() is pending are merged into its result (AC-43)", async () => {
    const list = deferred<Note[]>();
    const N = { ...A, title: "New A", updatedAt: 9 };
    await renderAt(
      `#note/${A.id}`,
      createStubRepository({
        list: () => list.promise,
        get: () => Promise.resolve(A),
        update: () => Promise.resolve(N),
      }),
    );
    await click(button(EDIT_BUTTON));
    paste(titleField(), "New A");
    await saveChanges();
    list.resolve([B, A]);
    await settle();
    await activate(backLink());
    expect(noteLinkNames()).toEqual(["New A", "B"]);
    document.body.innerHTML = "";
    history.replaceState(null, "", "/");

    const list2 = deferred<Note[]>();
    await renderAt(
      `#note/${A.id}`,
      createStubRepository({
        list: () => list2.promise,
        get: () => Promise.resolve(A),
        delete: () => Promise.resolve(),
      }),
    );
    await click(button(DELETE_BUTTON));
    await click(button(DELETE_NOTE));
    list2.resolve([A, B]);
    await settle();
    expect(noteLinkNames()).toEqual(["B"]);
  });

  it("with the list failed, edit and delete leave the failure shown and still set Note deleted. (AC-44)", async () => {
    await renderAt(
      `#note/${A.id}`,
      createStubRepository({
        list: () => Promise.reject(new StorageUnavailableError()),
        get: (id) => Promise.resolve(id === A.id ? A : B),
        update: (_id, input) =>
          Promise.resolve({ ...A, ...input, updatedAt: 5 }),
        delete: () => Promise.resolve(),
      }),
    );
    await click(button(EDIT_BUTTON));
    paste(titleField(), "Edited");
    await saveChanges();
    location.hash = `#note/${B.id}`;
    await settle();
    await settle();
    await click(button(DELETE_BUTTON));
    await click(button(DELETE_NOTE));
    await settle();
    const section = notesSection();
    expect(within(section).getByRole("alert").textContent).toBe(
      LIST_UNAVAILABLE,
    );
    expect(within(section).queryAllByRole("listitem")).toHaveLength(0);
    expect(notesStatus().textContent).toBe(NOTE_DELETED);
  });

  it("editing and deleting leave the hidden New note form untouched (AC-45)", async () => {
    await renderWithAB();
    const newTitle = screen.getByRole("textbox", {
      name: "Title",
    }) as HTMLInputElement;
    const newNote = screen.getByRole("textbox", {
      name: "Note",
    }) as HTMLTextAreaElement;
    const typed = "t".repeat(181);
    paste(newTitle, typed);
    paste(newNote, "draft");
    await editNote("Shopping");
    paste(titleField(), "Shopping 2");
    await saveChanges();
    await activate(backLink());
    await openNote("Other");
    await deleteOpenedNote();
    expect(newTitle.value).toBe(typed);
    expect(newNote.value).toBe("draft");
    expect(screen.getByText("181 of 200 characters")).toBeVisible();
  });
});
