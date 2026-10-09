import { describe, expect, it, vi } from "vitest";
import { BOTH_EMPTY, NOTE_SAVED, noteTooLong, titleTooLong } from "../copy";
import type { NoteRepository } from "../storage";
import { createInMemoryNoteRepository } from "../test/inMemoryNoteRepository";
import {
  clickSave,
  paste,
  pressSaveShortcut,
  renderApp,
  typeInto,
} from "../test/renderApp";
import { createSpyRepository } from "../test/repositoryDoubles";

function inMemory(): NoteRepository {
  return createInMemoryNoteRepository();
}

function describedBy(field: HTMLElement): string[] {
  return (field.getAttribute("aria-describedby") ?? "")
    .split(/\s+/)
    .filter(Boolean);
}

function messageElement(text: string): HTMLElement {
  const match = [...document.querySelectorAll<HTMLElement>("main p")].find(
    (element) => element.textContent === text,
  );
  if (!match) throw new Error(`No <p> with text: ${text}`);
  return match;
}

describe("NoteForm validation", () => {
  it("Save with both fields empty shows the both-empty alert, focuses Title, stores nothing (AC-16)", async () => {
    const repository = inMemory();
    const app = renderApp(repository);
    await clickSave(app);

    expect(app.alert.textContent).toBe(BOTH_EMPTY);
    expect(document.activeElement).toBe(app.title);
    expect(await repository.list()).toEqual([]);
  });

  it("the same via Ctrl+Enter from Note (AC-16)", async () => {
    const repository = inMemory();
    const app = renderApp(repository);
    await pressSaveShortcut(app.note);

    expect(app.alert.textContent).toBe(BOTH_EMPTY);
    expect(document.activeElement).toBe(app.title);
    expect(await repository.list()).toEqual([]);
  });

  it("a single-space title with an empty note is saved as-is (AC-17)", async () => {
    const repository = createSpyRepository();
    const app = renderApp(repository);
    paste(app.title, " ");
    await clickSave(app);

    expect(repository.create).toHaveBeenCalledWith({ title: " ", body: "" });
    expect(app.status.textContent).toBe(NOTE_SAVED);
  });

  it("201-character title: message under Title, aria-invalid, described-by, focus, nothing stored, text kept (AC-18)", async () => {
    const repository = inMemory();
    const create = vi.spyOn(repository, "create");
    const app = renderApp(repository);
    paste(app.title, "a".repeat(201));
    paste(app.note, "x");
    await clickSave(app);

    expect(create).not.toHaveBeenCalled();
    expect(await repository.list()).toEqual([]);
    const message = messageElement(
      "The title is too long. It has 201 characters and the limit is 200.",
    );
    expect(app.title).toHaveAttribute("aria-invalid", "true");
    expect(describedBy(app.title)).toContain(message.id);
    expect(document.activeElement).toBe(app.title);
    expect(app.title.value).toHaveLength(201);
    // Under Title: inside Title's wrapper, after the input.
    expect(message.parentElement).toBe(app.title.parentElement);
  });

  it("100,001-character note: message under Note, aria-invalid, focus in Note (AC-19)", async () => {
    const repository = inMemory();
    const app = renderApp(repository);
    paste(app.title, "t");
    paste(app.note, "a".repeat(100001));
    await clickSave(app);

    expect(await repository.list()).toEqual([]);
    const message = messageElement(
      "The note is too long. It has 100,001 characters and the limit is 100,000.",
    );
    expect(message.parentElement).toBe(app.note.parentElement);
    expect(
      app.note.compareDocumentPosition(message) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    expect(app.note).toHaveAttribute("aria-invalid", "true");
    expect(describedBy(app.note)).toContain(message.id);
    expect(app.title).not.toHaveAttribute("aria-invalid");
    expect(document.activeElement).toBe(app.note);
  });

  it("both fields too long: both messages, both invalid, focus in Title (AC-20)", async () => {
    const repository = createSpyRepository();
    const app = renderApp(repository);
    paste(app.title, "a".repeat(201));
    paste(app.note, "a".repeat(100001));
    await clickSave(app);

    expect(repository.create).not.toHaveBeenCalled();
    messageElement(titleTooLong(201));
    messageElement(noteTooLong(100001));
    expect(app.title).toHaveAttribute("aria-invalid", "true");
    expect(app.note).toHaveAttribute("aria-invalid", "true");
    expect(document.activeElement).toBe(app.title);
  });

  it("200 emoji title saves; 201 emoji title reports 201 characters (AC-21)", async () => {
    const repository = createSpyRepository();
    const app = renderApp(repository);
    paste(app.title, "😀".repeat(200));
    await clickSave(app);
    expect(repository.create).toHaveBeenCalledTimes(1);

    paste(app.title, "😀".repeat(201));
    await clickSave(app);
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain("It has 201 characters");
  });

  it("typing 250 characters shows no error, aria-invalid or alert before a save (AC-22)", () => {
    const app = renderApp(createSpyRepository());
    for (let i = 0; i < 250; i += 1) typeInto(app.title, "a");

    expect(app.title.value).toHaveLength(250);
    expect(document.body.textContent).not.toContain("too long");
    expect(app.title).not.toHaveAttribute("aria-invalid");
    expect(app.alert.textContent).toBe("");
  });

  it("editing an invalid Title removes its message and aria-invalid (AC-23)", async () => {
    const app = renderApp(createSpyRepository());
    paste(app.title, "a".repeat(201));
    paste(app.note, "x");
    await clickSave(app);
    expect(app.title).toHaveAttribute("aria-invalid", "true");

    paste(app.title, "a".repeat(200));
    expect(document.body.textContent).not.toContain("too long");
    expect(app.title).not.toHaveAttribute("aria-invalid");
  });

  it("editing one invalid field keeps the other field's error (R17)", async () => {
    const app = renderApp(createSpyRepository());
    paste(app.title, "a".repeat(201));
    paste(app.note, "a".repeat(100001));
    await clickSave(app);

    paste(app.title, "short");
    expect(app.title).not.toHaveAttribute("aria-invalid");
    expect(app.note).toHaveAttribute("aria-invalid", "true");
    messageElement(noteTooLong(100001));
  });

  it("typing in Note clears the both-empty alert (AC-23)", async () => {
    const app = renderApp(createSpyRepository());
    await clickSave(app);
    expect(app.alert.textContent).toBe(BOTH_EMPTY);

    typeInto(app.note, "a");
    expect(app.alert.textContent).toBe("");
  });
});
