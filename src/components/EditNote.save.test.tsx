import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BOTH_EMPTY,
  CHANGES_FAILED,
  CHANGES_FULL,
  CHANGES_NOT_FOUND,
  CHANGES_SAVED,
  CHANGES_UNAVAILABLE,
  NO_CHANGES,
  NOT_FOUND_HEADING,
  SAVE_CHANGES,
} from "../copy";
import {
  NotFoundError,
  QuotaExceededError,
  StorageUnavailableError,
  ValidationError,
  type Note,
  type NoteInput,
} from "../storage";
import { paste, pressSaveShortcut, settle, typeInto } from "../test/renderApp";
import {
  button,
  cancel,
  click,
  dialog,
  discardChanges,
  editNote,
  formRegions,
  noteField,
  renderWithAB,
  saveChanges,
  textSequence,
  titleField,
  viewRegions,
} from "../test/renderEdit";
import { backLink, noteLinkNames, renderAt } from "../test/renderNotes";
import {
  createStubRepository,
  deferred,
  type SpyRepository,
} from "../test/repositoryDoubles";

/** Shadows navigator.platform with an own property; removed after each test. */
function stubPlatform(value: string): void {
  Object.defineProperty(navigator, "platform", { configurable: true, value });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "platform");
  vi.useRealTimers();
});

/** A spy over the in-memory double whose `update` is replaced by `update`. */
async function withUpdate(
  update: (id: string, input: NoteInput) => Promise<Note>,
): Promise<{ repository: SpyRepository; A: Note }> {
  const fixture = await renderWithAB();
  fixture.repository.update.mockImplementation(update);
  return fixture;
}

describe("Edit mode: saving", () => {
  it("Ctrl/Cmd+Enter saves from either field, not while composing; Enter in Title moves to Note; keyshortcuts and platform hint (AC-8)", async () => {
    for (const field of [titleField, noteField] as const) {
      for (const modifier of ["ctrlKey", "metaKey"] as const) {
        const pending = deferred<Note>();
        const { repository } = await withUpdate(() => pending.promise);
        await editNote("Shopping");
        typeInto(titleField(), "!");
        fireEvent.keyDown(field(), {
          key: "Enter",
          ctrlKey: true,
          isComposing: true,
        });
        await settle();
        expect(repository.update).not.toHaveBeenCalled();
        await pressSaveShortcut(field(), modifier);
        expect(repository.update).toHaveBeenCalledTimes(1);
        document.body.innerHTML = "";
        history.replaceState(null, "", "/");
      }
    }
  });

  it("plain Enter in Title moves to Note and calls nothing; the save button's shortcut and hint (AC-8)", async () => {
    stubPlatform("MacIntel");
    const { repository } = await renderWithAB();
    await editNote("Shopping");
    titleField().focus();
    fireEvent.keyDown(titleField(), { key: "Enter" });
    await settle();
    expect(document.activeElement).toBe(noteField());
    expect(repository.update).not.toHaveBeenCalled();
    const save = button(SAVE_CHANGES);
    expect(save).toHaveAttribute(
      "aria-keyshortcuts",
      "Control+Enter Meta+Enter",
    );
    expect(save).toHaveAccessibleName("Save changes");
    expect(save).toHaveAccessibleDescription("Press Cmd+Enter to save.");
  });

  it("the hint is Ctrl on Windows (AC-8)", async () => {
    stubPlatform("Win32");
    await renderWithAB();
    await editNote("Shopping");
    expect(button(SAVE_CHANGES)).toHaveAccessibleDescription(
      "Press Ctrl+Enter to save.",
    );
  });

  it("both empty shows the message, focuses Title, calls nothing and never deletes (AC-9)", async () => {
    const { repository } = await renderWithAB();
    await editNote("Shopping");
    paste(titleField(), "");
    paste(noteField(), "");
    await saveChanges();
    expect(formRegions().alert.textContent).toBe(BOTH_EMPTY);
    expect(document.activeElement).toBe(titleField());
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.delete).not.toHaveBeenCalled();
    typeInto(noteField(), "a");
    expect(formRegions().alert.textContent).toBe("");
    paste(noteField(), "");
    await cancel();
    await discardChanges();
    await click(backLink());
    await settle();
    expect(noteLinkNames()).toContain("Shopping");
  });

  it("too-long title and note: messages, aria-invalid, describedby, focus; removed on edit (AC-10)", async () => {
    const { repository } = await renderWithAB();
    await editNote("Shopping");
    paste(titleField(), "a".repeat(201));
    await saveChanges();
    const message = screen.getByText(
      "The title is too long. It has 201 characters and the limit is 200.",
    );
    expect(titleField()).toHaveAttribute("aria-invalid", "true");
    expect(titleField().getAttribute("aria-describedby")).toContain(message.id);
    expect(document.activeElement).toBe(titleField());
    expect(repository.update).not.toHaveBeenCalled();

    paste(titleField(), "Shopping");
    paste(noteField(), "n".repeat(100_001));
    await saveChanges();
    expect(
      screen.getByText(
        "The note is too long. It has 100,001 characters and the limit is 100,000.",
      ),
    ).toBeInTheDocument();
    expect(document.activeElement).toBe(noteField());

    paste(titleField(), "a".repeat(201));
    await saveChanges();
    expect(screen.getAllByText(/is too long/)).toHaveLength(2);
    expect(document.activeElement).toBe(titleField());

    paste(titleField(), "a".repeat(200));
    expect(screen.queryByText(/The title is too long/)).toBeNull();
    expect(titleField().hasAttribute("aria-invalid")).toBe(false);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("no-op save (including typed and undone) calls no update, says No changes to save., keeps list order (AC-11)", async () => {
    for (const typeAndUndo of [false, true]) {
      const { repository } = await renderWithAB();
      await editNote("Shopping");
      if (typeAndUndo) {
        typeInto(titleField(), "x");
        paste(titleField(), "Shopping");
      }
      await saveChanges();
      expect(repository.update).not.toHaveBeenCalled();
      const heading = screen.getByRole("heading", {
        level: 2,
        name: "Shopping",
      });
      expect(document.activeElement).toBe(heading);
      expect(viewRegions().status[0]?.textContent).toBe(NO_CHANGES);
      expect(
        document.querySelector("[data-note-body]")?.textContent ===
          "Milk\n\n  Eggs\tx",
      ).toBe(true);
      await click(backLink());
      await settle();
      expect(noteLinkNames()).toEqual(["Other", "Shopping"]);
      document.body.innerHTML = "";
      history.replaceState(null, "", "/");
    }
  });

  it("a changed save calls update once with exactly two keys, shows Changes saved., and moves the note first without list or get (AC-12)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-10-09T12:00:00Z"));
    const { repository, A } = await renderWithAB();
    await editNote("Shopping");
    const getCalls = repository.get.mock.calls.length;
    paste(titleField(), "Shopping list");
    await saveChanges();
    expect(repository.update).toHaveBeenCalledTimes(1);
    const [id, input] = repository.update.mock.calls[0] ?? [];
    expect(id).toBe(A.id);
    expect(input).toEqual({
      title: "Shopping list",
      body: "Milk\n\n  Eggs\tx",
    });
    expect(Object.keys(input ?? {}).sort()).toEqual(["body", "title"]);
    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Shopping list",
    });
    expect(document.activeElement).toBe(heading);
    const article = heading.closest("article") as HTMLElement;
    expect(article.querySelector("time")?.parentElement?.textContent).toBe(
      "Updated just now",
    );
    expect(viewRegions().status[0]?.textContent).toBe(CHANGES_SAVED);
    expect(repository.get.mock.calls.length).toBe(getCalls);
    expect(repository.list).toHaveBeenCalledTimes(1);

    await click(backLink());
    await settle();
    expect(noteLinkNames()).toEqual(["Shopping list", "Other"]);
    expect(repository.list).toHaveBeenCalledTimes(1);
    expect(document.activeElement?.textContent).toContain("Shopping list");
  });

  it("while saving: Saving…, aria-disabled not disabled, read-only fields, repeat triggers and Cancel/Back ignored (AC-13)", async () => {
    const pending = deferred<Note>();
    const { repository, A } = await withUpdate(() => pending.promise);
    await editNote("Shopping");
    typeInto(titleField(), "!");
    await saveChanges();
    const saving = button("Saving…");
    expect(saving).toHaveAttribute("aria-disabled", "true");
    expect(saving).not.toBeDisabled();
    expect(button("Cancel")).toHaveAttribute("aria-disabled", "true");
    expect(backLink()).toHaveAttribute("aria-disabled", "true");
    expect(titleField().readOnly).toBe(true);
    expect(noteField().readOnly).toBe(true);
    await click(saving);
    await pressSaveShortcut(titleField());
    expect(repository.update).toHaveBeenCalledTimes(1);
    const hash = location.hash;
    await click(button("Cancel"));
    await click(backLink());
    await settle();
    expect(location.hash).toBe(hash);
    expect(titleField().value).toBe("Shopping!");
    expect(dialog()).toBeNull();
    pending.resolve({ ...A, title: "Shopping!", updatedAt: A.updatedAt + 1 });
    await settle();
    expect(
      screen.getByRole("heading", { level: 2, name: "Shopping!" }),
    ).toBeInTheDocument();
  });

  it.each<[string, unknown, string]>([
    ["unavailable", new StorageUnavailableError(), CHANGES_UNAVAILABLE],
    ["quota", new QuotaExceededError(), CHANGES_FULL],
    ["Error", new Error("boom"), CHANGES_FAILED],
    ["non-Error", "boom", CHANGES_FAILED],
  ])(
    "update failures show the matching Changes copy, keep text and focus, never show the rejection text (AC-15): %s",
    async (_name, error, copy) => {
      await withUpdate(() => Promise.reject(error));
      await editNote("Shopping");
      paste(titleField(), "Keep me");
      await saveChanges();
      expect(formRegions().alert.textContent).toBe(copy);
      expect(titleField().value).toBe("Keep me");
      expect(titleField().readOnly).toBe(false);
      const save = button(SAVE_CHANGES);
      expect(save).not.toHaveAttribute("aria-disabled");
      expect(button("Cancel")).not.toHaveAttribute("aria-disabled");
      expect(backLink()).not.toHaveAttribute("aria-disabled");
      expect(document.activeElement).toBe(save);
      expect(document.body.textContent).not.toContain(CHANGES_SAVED);
      expect(document.body.textContent).not.toContain("boom");

      await pressSaveShortcut(noteField());
      expect(document.activeElement).toBe(noteField());
      expect(formRegions().alert.textContent).toBe(copy);
    },
  );

  it.each<[string, ValidationError, string]>([
    [
      "empty",
      new ValidationError([{ field: "note", rule: "empty" }]),
      BOTH_EMPTY,
    ],
    [
      "too-long",
      new ValidationError([
        { field: "title", rule: "too-long", limit: 200, actual: 250 },
      ]),
      "The title is too long. It has 250 characters and the limit is 200.",
    ],
    [
      "other",
      new ValidationError([{ field: "id", rule: "not-a-string" }]),
      CHANGES_FAILED,
    ],
  ])(
    "ValidationError issues map like create-note R18 (AC-16): %s",
    async (_name, error, text) => {
      await withUpdate(() => Promise.reject(error));
      await editNote("Shopping");
      typeInto(titleField(), "!");
      await saveChanges();
      expect(screen.getByText(text)).toBeInTheDocument();
    },
  );

  it("a retry clears the alert first, then shows the outcome (AC-17)", async () => {
    const { repository, A } = await withUpdate(() =>
      Promise.reject(new StorageUnavailableError()),
    );
    await editNote("Shopping");
    paste(titleField(), "Keep me");
    await saveChanges();
    const { alert } = formRegions();
    expect(alert.textContent).toBe(CHANGES_UNAVAILABLE);

    const sequence = textSequence(alert);
    await saveChanges();
    sequence.stop();
    expect(sequence.texts).toEqual(["", CHANGES_UNAVAILABLE]);

    repository.update.mockImplementation((_id, input) =>
      Promise.resolve({ ...A, ...input, updatedAt: A.updatedAt + 1 }),
    );
    const last = textSequence(alert);
    await saveChanges();
    last.stop();
    expect(last.texts[0]).toBe("");
    expect(viewRegions().status[0]?.textContent).toBe(CHANGES_SAVED);
  });

  it("NotFoundError: Changes not found, no create, note removed from list; Cancel → discard → Note not found without get (AC-18)", async () => {
    const { repository } = await withUpdate(() =>
      Promise.reject(new NotFoundError()),
    );
    await editNote("Shopping");
    typeInto(noteField(), " more");
    await saveChanges();
    expect(formRegions().alert.textContent).toBe(CHANGES_NOT_FOUND);
    expect(titleField().value).toBe("Shopping");
    expect(noteField().value).toBe("Milk\n\n  Eggs\tx more");
    expect(repository.create).not.toHaveBeenCalled();
    const gets = repository.get.mock.calls.length;

    await cancel();
    expect(dialog()).not.toBeNull();
    await discardChanges();
    const heading = screen.getByRole("heading", {
      level: 2,
      name: NOT_FOUND_HEADING,
    });
    expect(document.activeElement).toBe(heading);
    expect(repository.get.mock.calls.length).toBe(gets);

    await click(backLink());
    await settle();
    expect(noteLinkNames()).toEqual(["Other"]);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("a further save after NotFoundError calls update again", async () => {
    const { repository } = await withUpdate(() =>
      Promise.reject(new NotFoundError()),
    );
    await editNote("Shopping");
    typeInto(noteField(), "!");
    await saveChanges();
    await saveChanges();
    expect(repository.update).toHaveBeenCalledTimes(2);
  });

  it("a stub repository's update works the same as the double's", async () => {
    const A = {
      id: "00000000-0000-4000-8000-00000000000a",
      title: "Shopping",
      body: "b",
      createdAt: 1,
      updatedAt: 1,
    };
    const repository = createStubRepository({
      list: () => Promise.resolve([A]),
      get: () => Promise.resolve(A),
      update: (_id, input) => Promise.resolve({ ...A, ...input, updatedAt: 2 }),
    });
    await renderAt(`#note/${A.id}`, repository);
    await click(button("Edit"));
    typeInto(noteField(), "!");
    await saveChanges();
    expect(viewRegions().status[0]?.textContent).toBe(CHANGES_SAVED);
  });
});
