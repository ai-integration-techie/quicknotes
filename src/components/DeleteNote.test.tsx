import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../App";
import {
  ALREADY_DELETED,
  DELETE_BUTTON,
  DELETE_FAILED,
  DELETE_NOTE,
  DELETE_UNAVAILABLE,
  DELETING,
  KEEP_NOTE,
  NOTE_DELETED,
  NOTES_EMPTY_PRIMARY,
  NOTES_HEADING,
} from "../copy";
import {
  NotFoundError,
  QuotaExceededError,
  StorageUnavailableError,
  type Note,
} from "../storage";
import { clickSave, paste, renderApp, settle } from "../test/renderApp";
import {
  button,
  click,
  deleteOpenedNote,
  dialog,
  openNote,
  press,
  renderWithAB,
  textSequence,
  viewRegions,
  notesStatus,
} from "../test/renderEdit";
import {
  activate,
  backLink,
  goToHash,
  makeNote,
  noteLinkNames,
  notesSection,
} from "../test/renderNotes";
import { createStubRepository, deferred } from "../test/repositoryDoubles";

function yourNotesHeading(): HTMLElement {
  return screen.getByRole("heading", { level: 2, name: NOTES_HEADING });
}

describe("Deleting a note", () => {
  it("confirmed delete calls delete once, shows the list without A, focuses Your notes, says Note deleted., no extra list or get (AC-34)", async () => {
    const { repository, A } = await renderWithAB();
    await openNote("Shopping");
    const gets = repository.get.mock.calls.length;
    await deleteOpenedNote();
    expect(repository.delete).toHaveBeenCalledTimes(1);
    expect(repository.delete).toHaveBeenCalledWith(A.id);
    expect(noteLinkNames()).toEqual(["Other"]);
    expect(location.hash).toBe("");
    expect(document.activeElement).toBe(yourNotesHeading());
    expect(notesStatus().textContent).toBe(NOTE_DELETED);
    expect(repository.list).toHaveBeenCalledTimes(1);
    expect(repository.get.mock.calls.length).toBe(gets);
    expect(dialog()).toBeNull();
  });

  it("while deleting: Deleting…, aria-disabled, Escape and repeat clicks ignored (AC-35)", async () => {
    const pending = deferred<void>();
    const { repository } = await renderWithAB();
    repository.delete.mockImplementation(() => pending.promise);
    await openNote("Shopping");
    await click(button(DELETE_BUTTON));
    await click(button(DELETE_NOTE));
    const deleting = button(DELETING);
    expect(deleting).toHaveAttribute("aria-disabled", "true");
    expect(deleting).not.toBeDisabled();
    expect(button(KEEP_NOTE)).toHaveAttribute("aria-disabled", "true");
    await press("Escape");
    await click(deleting);
    await click(button(KEEP_NOTE));
    expect(dialog()).not.toBeNull();
    expect(repository.delete).toHaveBeenCalledTimes(1);
  });

  it("deleting the last note shows No notes yet with the status and heading focus (AC-36)", async () => {
    await renderWithAB([{ title: "Shopping", body: "x" }]);
    await openNote("Shopping");
    await deleteOpenedNote();
    expect(screen.getByText(NOTES_EMPTY_PRIMARY)).toBeVisible();
    expect(notesStatus().textContent).toBe(NOTE_DELETED);
    expect(document.activeElement).toBe(yourNotesHeading());
  });

  it("Your notes has one status and one alert region from the first render; status only after a delete, cleared on open and New note save attempt, repeated via empty (AC-38)", async () => {
    const list = deferred<Note[]>();
    const first = renderApp(createStubRepository({ list: () => list.promise }));
    const section = notesSection();
    const statuses = section.querySelectorAll('[role="status"]');
    expect(statuses).toHaveLength(1);
    expect(section.querySelectorAll('[role="alert"]')).toHaveLength(1);
    expect(statuses[0]?.textContent).toBe("");
    expect(section.querySelector('[role="alert"]')?.textContent).toBe("");
    list.resolve([makeNote(9)]);
    await settle();
    expect(notesStatus().textContent).toBe("");
    paste(first.title, "Saved");
    await clickSave(first);
    expect(notesStatus().textContent).toBe("");
    document.body.innerHTML = "";

    const empty = render(
      <App
        repository={createStubRepository({ list: () => Promise.resolve([]) })}
      />,
    );
    await settle();
    expect(notesStatus().textContent).toBe("");
    empty.unmount();

    await renderWithAB([
      { title: "One", body: "1" },
      { title: "Two", body: "2" },
      { title: "Three", body: "3" },
    ]);
    await openNote("One");
    await deleteOpenedNote();
    expect(notesStatus().textContent).toBe(NOTE_DELETED);
    const region = notesStatus();
    const sequence = textSequence(region);
    await openNote("Two");
    await activate(backLink());
    expect(notesStatus().textContent).toBe("");
    await openNote("Two");
    await deleteOpenedNote();
    sequence.stop();
    expect(notesStatus()).toBe(region);
    expect(sequence.texts).toEqual(["", NOTE_DELETED]);

    const app = screen.getByRole("textbox", { name: "Title" });
    paste(app, "x");
    await click(screen.getByRole("button", { name: "Save note" }));
    expect(notesStatus().textContent).toBe("");
  });

  it("NotFoundError on delete returns to the list with the Already deleted copy (AC-39)", async () => {
    const { repository } = await renderWithAB();
    repository.delete.mockImplementation(() =>
      Promise.reject(new NotFoundError()),
    );
    await openNote("Shopping");
    await deleteOpenedNote();
    expect(noteLinkNames()).toEqual(["Other"]);
    expect(notesStatus().textContent).toBe(ALREADY_DELETED);
    expect(document.activeElement).toBe(yourNotesHeading());
  });

  it.each<[string, unknown, string]>([
    ["unavailable", new StorageUnavailableError(), DELETE_UNAVAILABLE],
    ["quota", new QuotaExceededError(), DELETE_FAILED],
    ["Error", new Error("boom"), DELETE_FAILED],
    ["non-Error", "boom", DELETE_FAILED],
  ])(
    "delete failures close the dialog, keep the note, show the copy, focus Delete, leave the list (AC-40): %s",
    async (_name, error, copy) => {
      const { repository } = await renderWithAB();
      repository.delete.mockImplementation(() => Promise.reject(error));
      await openNote("Shopping");
      await click(button(DELETE_BUTTON));
      await click(button(DELETE_NOTE));
      expect(dialog()).toBeNull();
      expect(
        screen.getByRole("heading", { level: 2, name: "Shopping" }),
      ).toBeInTheDocument();
      expect(viewRegions().alert[0]?.textContent).toBe(copy);
      expect(document.activeElement).toBe(button(DELETE_BUTTON));
      expect(document.body.textContent).not.toContain("boom");
      await activate(backLink());
      expect(noteLinkNames()).toEqual(["Other", "Shopping"]);
    },
  );

  it("a route change closes an idle delete dialog; a pending delete completes without moving focus (AC-41)", async () => {
    const { repository } = await renderWithAB();
    const pending = deferred<void>();
    await openNote("Shopping");
    await click(button(DELETE_BUTTON));
    await goToHash("");
    expect(dialog()).toBeNull();
    expect(noteLinkNames()).toEqual(["Other", "Shopping"]);
    expect(repository.delete).not.toHaveBeenCalled();

    repository.delete.mockImplementation(() => pending.promise);
    await openNote("Shopping");
    await click(button(DELETE_BUTTON));
    await click(button(DELETE_NOTE));
    await goToHash("");
    expect(dialog()).toBeNull();
    expect(yourNotesHeading()).toBeVisible();
    const title = screen.getByRole("textbox", { name: "Title" });
    title.focus();
    pending.resolve();
    await settle();
    expect(noteLinkNames()).toEqual(["Other"]);
    expect(notesStatus().textContent).toBe(NOTE_DELETED);
    expect(document.activeElement).toBe(title);
  });

  it("a delete pending while another note opens sets the status when the list next shows", async () => {
    const { repository } = await renderWithAB();
    const pending = deferred<void>();
    repository.delete.mockImplementation(() => pending.promise);
    await openNote("Shopping");
    await click(button(DELETE_BUTTON));
    await click(button(DELETE_NOTE));
    await goToHash("");
    await openNote("Other");
    pending.resolve();
    await settle();
    expect(location.hash).toContain("#note/");
    await activate(backLink());
    expect(notesStatus().textContent).toBe(NOTE_DELETED);
    expect(noteLinkNames()).toEqual(["Other"]);
  });
});
