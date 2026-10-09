import { within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NOTE_SAVED, NOTES_EMPTY_PRIMARY } from "../copy";
import { StorageUnavailableError, type Note } from "../storage";
import { clickSave, paste, renderApp, settle } from "../test/renderApp";
import {
  inMemoryWith,
  makeNote,
  noteLinkNames,
  noteLinks,
  notesSection,
} from "../test/renderNotes";
import { createStubRepository, deferred } from "../test/repositoryDoubles";

describe("Your notes: refresh after a save", () => {
  it("a saved note goes first, with no second list() and the form's save behaviour unchanged (AC-19)", async () => {
    const { repository } = await inMemoryWith(
      { title: "A", body: "a" },
      { title: "B", body: "b" },
    );
    const list = vi.spyOn(repository, "list");
    const app = renderApp(repository);
    await settle();
    expect(noteLinkNames()).toEqual(["B", "A"]);

    paste(app.title, "New");
    paste(app.note, "Body");
    await clickSave(app);

    expect(noteLinkNames()[0]).toBe("New");
    expect(noteLinks()).toHaveLength(3);
    expect(list).toHaveBeenCalledTimes(1);
    expect(app.status.textContent).toBe(NOTE_SAVED);
    expect(app.title.value).toBe("");
    expect(app.note.value).toBe("");
    expect(document.activeElement).toBe(app.title);
  });

  it("a save replaces the empty state with a one-item list (AC-20)", async () => {
    const app = renderApp(
      createStubRepository({ list: () => Promise.resolve([]) }),
    );
    await settle();
    expect(
      within(notesSection()).getByText(NOTES_EMPTY_PRIMARY),
    ).toBeInTheDocument();

    paste(app.title, "Only");
    await clickSave(app);
    expect(noteLinkNames()).toEqual(["Only"]);
    expect(within(notesSection()).queryByText(NOTES_EMPTY_PRIMARY)).toBeNull();
  });

  it.each([
    ["(a) list() includes it", true],
    ["(b) list() doesn't include it", false],
  ])(
    "a save during loading is first and appears once, whether or not list() includes it (AC-21) %s",
    async (_name, includes) => {
      const list = deferred<Note[]>();
      const N = makeNote(7, { title: "N" });
      const A = makeNote(1, { title: "A" });
      const app = renderApp(
        createStubRepository({
          list: () => list.promise,
          create: () => Promise.resolve(N),
        }),
      );
      await settle();
      paste(app.title, "N");
      await clickSave(app);
      expect(app.status.textContent).toBe(NOTE_SAVED);

      list.resolve(includes ? [N, A] : [A]);
      await settle();
      expect(noteLinkNames()).toEqual(["N", "A"]);
    },
  );

  it("a failed save leaves the list unchanged (AC-22)", async () => {
    const app = renderApp(
      createStubRepository({
        list: () =>
          Promise.resolve([
            makeNote(1, { title: "A" }),
            makeNote(2, { title: "B" }),
          ]),
        create: () => Promise.reject(new StorageUnavailableError()),
      }),
    );
    await settle();
    paste(app.title, "Lost");
    await clickSave(app);
    expect(app.alert.textContent).not.toBe("");
    expect(noteLinkNames()).toEqual(["A", "B"]);
  });
});
