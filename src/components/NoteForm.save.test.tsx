import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NOTE_SAVED, SAVE_BUTTON, SAVE_BUTTON_SAVING } from "../copy";
import type { Note, NoteRepository } from "../storage";
import { createInMemoryNoteRepository } from "../test/inMemoryNoteRepository";
import {
  clickSave,
  paste,
  pressSaveShortcut,
  renderApp,
  settle,
  typeInto,
} from "../test/renderApp";
import {
  createSpyRepository,
  createStubRepository,
  deferred,
  noteFor,
} from "../test/repositoryDoubles";

function inMemory(): NoteRepository {
  return createInMemoryNoteRepository();
}

describe("NoteForm saving", () => {
  it("saves typed title and pasted multi-line note with one create({ title, body }) call (AC-7)", async () => {
    const repository = inMemory();
    const create = vi.spyOn(repository, "create");
    const app = renderApp(repository);

    typeInto(app.title, "Shopping");
    paste(app.note, "Milk\nEggs");
    await clickSave(app);

    expect(create).toHaveBeenCalledTimes(1);
    const [arg] = create.mock.calls[0] ?? [];
    expect(arg).toEqual({ title: "Shopping", body: "Milk\nEggs" });
    expect(Object.keys(arg ?? {}).sort()).toEqual(["body", "title"]);
    const notes = await repository.list();
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ title: "Shopping", body: "Milk\nEggs" });
  });

  it.each([
    [
      "whitespace and tabs",
      "  lead and trail  ",
      "line1\nline2\n\n  indented\ttab  ",
    ],
    ["emoji and scripts", "👩‍💻 🇮🇳", "日本語 العربية עברית हिन्दी"],
    ["markup and normalisation forms", "<b>not html</b>", "é vs é"],
  ])(
    "passes pasted text through unchanged: %s (AC-8)",
    async (_name, title, body) => {
      const repository = createSpyRepository();
      const app = renderApp(repository);
      paste(app.title, title);
      paste(app.note, body);
      await clickSave(app);

      expect(repository.create).toHaveBeenCalledTimes(1);
      const [arg] = repository.create.mock.calls[0] ?? [];
      expect(arg?.title).toBe(title);
      expect(arg?.body).toBe(body);
    },
  );

  it("a resolved save shows Note saved., clears both fields, focuses Title and resets the button (AC-12)", async () => {
    const app = renderApp(createSpyRepository());
    paste(app.title, "Title A");
    paste(app.note, "Body A");
    await clickSave(app);

    expect(app.status.textContent).toBe(NOTE_SAVED);
    expect(app.title.value).toBe("");
    expect(app.note.value).toBe("");
    expect(document.activeElement).toBe(app.title);
    expect(app.alert.textContent).toBe("");
    expect(app.saveButton).toHaveAccessibleName(SAVE_BUTTON);
    expect(app.saveButton).not.toHaveAttribute("aria-disabled");
  });

  it("while create is pending: Saving…, aria-disabled not disabled, read-only fields, repeat attempts ignored (AC-13)", async () => {
    const pending = deferred<Note>();
    const repository = createStubRepository({ create: () => pending.promise });
    const app = renderApp(repository);
    paste(app.title, "a");
    await clickSave(app);

    expect(app.saveButton).toHaveAccessibleName(SAVE_BUTTON_SAVING);
    expect(app.saveButton).toHaveAttribute("aria-disabled", "true");
    expect(app.saveButton).not.toBeDisabled();
    expect(app.title.readOnly).toBe(true);
    expect(app.note.readOnly).toBe(true);

    fireEvent.click(app.saveButton);
    await pressSaveShortcut(app.title);
    expect(repository.create).toHaveBeenCalledTimes(1);

    pending.resolve(noteFor({ title: "a", body: "" }));
    await settle();
    expect(app.saveButton).toHaveAccessibleName(SAVE_BUTTON);
    expect(app.saveButton).not.toHaveAttribute("aria-disabled");
    expect(app.title.readOnly).toBe(false);
    expect(app.note.readOnly).toBe(false);
  });

  it("two triggers in the same tick start one save (D4)", async () => {
    const repository = createSpyRepository();
    const app = renderApp(repository);
    paste(app.title, "a");
    fireEvent.click(app.saveButton);
    fireEvent.keyDown(app.title, { key: "Enter", ctrlKey: true });
    await settle();
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it("Note saved. clears on the next edit (AC-14)", async () => {
    const app = renderApp(createSpyRepository());
    paste(app.title, "Title A");
    await clickSave(app);
    expect(app.status.textContent).toBe(NOTE_SAVED);

    typeInto(app.title, "x");
    expect(app.status.textContent).toBe("");
  });

  it("Note saved. clears on the next save attempt, which then shows the both-empty alert (AC-14)", async () => {
    const app = renderApp(createSpyRepository());
    paste(app.title, "Title A");
    await clickSave(app);
    expect(app.status.textContent).toBe(NOTE_SAVED);

    await clickSave(app);
    expect(app.status.textContent).toBe("");
    expect(app.alert.textContent).toBe("Add a title or some text first.");
  });

  it("rendering and typing call no repository method; a valid save calls only create, once (AC-37)", async () => {
    const repository = createSpyRepository();
    const app = renderApp(repository);
    const methods = [
      repository.create,
      repository.get,
      repository.update,
      repository.delete,
      repository.list,
      repository.isPersisted,
    ];

    typeInto(app.title, "Draft");
    typeInto(app.note, "Some text");
    for (const method of methods) expect(method).not.toHaveBeenCalled();

    await clickSave(app);
    expect(repository.create).toHaveBeenCalledTimes(1);
    for (const method of methods.slice(1))
      expect(method).not.toHaveBeenCalled();
  });
});
