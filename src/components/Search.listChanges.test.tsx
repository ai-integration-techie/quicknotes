import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NOTE_LABEL, NOTES_HEADING, SAVE_BUTTON, TITLE_LABEL } from "../copy";
import { paste } from "../test/renderApp";
import {
  button,
  click,
  deleteOpenedNote,
  editNote,
  noteField,
  openNote,
  saveChanges,
  titleField,
} from "../test/renderEdit";
import { activate, backLink, goToHash } from "../test/renderNotes";
import type { SpyRepository } from "../test/repositoryDoubles";
import {
  clearButton,
  searchbox,
  searchStatus,
  searchWithCBA,
  shownLinkNames,
  typeQuery,
} from "../test/renderSearch";

/** Saves a note with the "New note" form (list view). */
async function saveWithForm(title: string, body: string): Promise<void> {
  paste(screen.getByRole("textbox", { name: TITLE_LABEL }), title);
  paste(screen.getByRole("textbox", { name: NOTE_LABEL }), body);
  await click(button(SAVE_BUTTON));
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nothingButList(repository: SpyRepository): void {
  for (const method of [
    repository.create,
    repository.get,
    repository.update,
    repository.delete,
    repository.isPersisted,
  ])
    expect(method).not.toHaveBeenCalled();
}

describe("Search notes: the list stays true", () => {
  it("saves while searching appear only if they match; query kept; one list() (AC-20)", async () => {
    const { repository } = await searchWithCBA();
    typeQuery("shop");
    expect(shownLinkNames()).toEqual(["Shopping list", "Groceries"]);

    await saveWithForm("Shop hours", "x");
    expect(shownLinkNames()).toEqual([
      "Shop hours",
      "Shopping list",
      "Groceries",
    ]);
    expect(searchbox().value).toBe("shop");

    await saveWithForm("Other", "y");
    expect(shownLinkNames()).toEqual([
      "Shop hours",
      "Shopping list",
      "Groceries",
    ]);

    fireEvent.click(clearButton());
    const names = shownLinkNames();
    expect(names).toHaveLength(5);
    expect(names[0]).toBe("Other");
    expect(repository.list).toHaveBeenCalledTimes(1);
  });

  it("edits and deletes while searching update the results; one list() (AC-21)", async () => {
    const { repository, B } = await searchWithCBA();
    typeQuery("shop");

    await editNote("Groceries");
    paste(titleField(), "Party");
    paste(noteField(), "cake");
    await saveChanges();
    await activate(backLink());
    expect(shownLinkNames()).toEqual(["Shopping list"]);
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { level: 2, name: NOTES_HEADING }),
    );
    await wait(550);
    expect(searchStatus().textContent).toBe("1 note matches");

    // B is filtered out, so it is opened by its URL.
    await goToHash(`#note/${B.id}`);
    await click(button("Edit"));
    paste(noteField(), "shopping run");
    await saveChanges();
    await activate(backLink());
    expect(shownLinkNames()).toEqual(["Ideas", "Shopping list"]);

    await openNote("Shopping list");
    await deleteOpenedNote();
    expect(shownLinkNames()).toEqual(["Ideas"]);
    expect(searchbox().value).toBe("shop");
    expect(repository.list).toHaveBeenCalledTimes(1);
  });

  it("typing, clearing and Escape call no repository method (AC-22)", async () => {
    const { repository } = await searchWithCBA();
    expect(repository.list).toHaveBeenCalledTimes(1);
    searchbox().focus();
    typeQuery("abcdefghijklmnopqrst");
    fireEvent.click(clearButton());
    typeQuery("shop");
    fireEvent.keyDown(searchbox(), { key: "Escape" });
    await wait(550);
    expect(repository.list).toHaveBeenCalledTimes(1);
    nothingButList(repository);
  });
});
