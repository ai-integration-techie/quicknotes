import { describe, expect, it, vi } from "vitest";
import {
  NotFoundError,
  QuotaExceededError,
  StorageUnavailableError,
  ValidationError,
} from "./storage";
import { paste, settle, typeInto } from "./test/renderApp";
import {
  button,
  cancel,
  click,
  deleteOpenedNote,
  discardChanges,
  editNote,
  historyBack,
  keepEditing,
  noteField,
  openNote,
  renderWithAB,
  saveChanges,
  titleField,
  waitForHashChange,
} from "./test/renderEdit";
import { activate, backLink, goToHash, renderAt } from "./test/renderNotes";
import { createStubRepository } from "./test/repositoryDoubles";

function leaks(calls: unknown[][]): unknown[][] {
  return calls.filter((args) =>
    args.some((arg) => {
      try {
        return (
          String(arg).includes("SECRET") ||
          JSON.stringify(arg)?.includes("SECRET")
        );
      } catch {
        return String(arg).includes("SECRET");
      }
    }),
  );
}

describe("edit and delete privacy", () => {
  it("no console call or shown message contains note text across every update and delete failure (AC-56)", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map(
      (m) => vi.spyOn(console, m),
    );
    const updateErrors: unknown[] = [
      new StorageUnavailableError(),
      new QuotaExceededError(),
      new Error("SECRET-T2"),
      "SECRET-T2",
      new ValidationError([{ field: "note", rule: "empty" }]),
      new ValidationError([
        { field: "title", rule: "too-long", limit: 200, actual: 250 },
      ]),
      new ValidationError([{ field: "id", rule: "not-a-string" }]),
      new NotFoundError(),
    ];
    const deleteErrors: unknown[] = [
      new StorageUnavailableError(),
      new QuotaExceededError(),
      new Error("SECRET-B"),
      "SECRET-B",
    ];
    const { repository } = await renderWithAB([
      { title: "SECRET-T", body: "SECRET-B" },
    ]);
    await openNote("SECRET-T");
    for (const error of deleteErrors) {
      repository.delete.mockImplementationOnce(() => Promise.reject(error));
      await click(button("Delete"));
      await click(button("Delete note"));
      const messages = [
        ...document.querySelectorAll('[role="alert"], [role="status"]'),
      ]
        .map((el) => el.textContent ?? "")
        .join(" ");
      expect(messages).not.toContain("SECRET");
    }
    await click(button("Edit"));
    paste(titleField(), "SECRET-T2");
    for (const error of updateErrors) {
      repository.update.mockImplementationOnce(() => Promise.reject(error));
      await saveChanges();
      const messages = [
        ...document.querySelectorAll('[role="alert"], [role="status"]'),
      ]
        .map((el) => el.textContent ?? "")
        .join(" ");
      expect(messages).not.toContain("SECRET");
    }
    expect(leaks(spies.flatMap((spy) => spy.mock.calls))).toEqual([]);
    vi.restoreAllMocks();
  });

  it("no pushState, confirm, alert or prompt; every replaceState passes null, across the edit and delete flows (AC-58)", async () => {
    const replace = vi.spyOn(history, "replaceState");
    const push = vi.spyOn(history, "pushState");
    const windowSpies = (["confirm", "alert", "prompt"] as const).map((n) =>
      vi.spyOn(window, n).mockImplementation(() => {
        throw new Error(n);
      }),
    );
    // AC-21 to AC-24
    const { A } = await renderWithAB();
    await editNote("Shopping");
    typeInto(noteField(), "!");
    await cancel();
    await keepEditing();
    await cancel();
    await discardChanges();
    await click(button("Edit"));
    typeInto(noteField(), "!");
    await click(backLink());
    await discardChanges();
    await waitForHashChange();
    await editNote("Shopping");
    typeInto(noteField(), "!");
    await historyBack();
    await keepEditing();
    await waitForHashChange();
    await goToHash("");
    await goToHash(`#note/${A.id}`);
    await goToHash("");
    await discardChanges();
    // AC-34, AC-41
    await openNote("Shopping");
    await click(button("Delete"));
    await goToHash("");
    await openNote("Shopping");
    await deleteOpenedNote();
    await activate(document.querySelector("a[href^='#note/']") as HTMLElement);
    await activate(backLink());
    document.body.innerHTML = "";
    history.replaceState(null, "", "/");
    // AC-36, AC-39: loaded at a note route, then deleted (replaceState path)
    const note = {
      id: A.id,
      title: "X",
      body: "y",
      createdAt: 1,
      updatedAt: 1,
    };
    await renderAt(
      `#note/${note.id}`,
      createStubRepository({
        list: () => Promise.resolve([note]),
        get: () => Promise.resolve(note),
        delete: () => Promise.reject(new NotFoundError()),
      }),
    );
    await click(button("Delete"));
    await click(button("Delete note"));
    await settle();
    expect(location.hash).toBe("");

    expect(push).not.toHaveBeenCalled();
    for (const spy of windowSpies) expect(spy).not.toHaveBeenCalled();
    expect(replace.mock.calls.every(([state]) => state === null)).toBe(true);
    expect(titleField).toBeDefined();
    vi.restoreAllMocks();
  });
});
