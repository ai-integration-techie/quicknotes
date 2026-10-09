import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HINT_APPLE, HINT_OTHER, SAVE_BUTTON } from "../copy";
import { paste, pressSaveShortcut, renderApp, settle } from "../test/renderApp";
import { createSpyRepository } from "../test/repositoryDoubles";

/** Shadows navigator.platform with an own property; removed after each test. */
function stubPlatform(value: string): void {
  Object.defineProperty(navigator, "platform", { configurable: true, value });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "platform");
});

describe("NoteForm keyboard", () => {
  it.each([
    ["Title", "ctrlKey"],
    ["Title", "metaKey"],
    ["Note", "ctrlKey"],
    ["Note", "metaKey"],
  ] as const)(
    "Ctrl/Cmd+Enter in %s (%s) saves once (AC-9)",
    async (fieldName, modifier) => {
      const repository = createSpyRepository();
      const app = renderApp(repository);
      paste(app.title, "a");
      const field = fieldName === "Title" ? app.title : app.note;

      await pressSaveShortcut(field, modifier);
      expect(repository.create).toHaveBeenCalledTimes(1);
    },
  );

  it("Ctrl+Enter in Note inserts no line break (AC-9)", () => {
    const app = renderApp(createSpyRepository());
    paste(app.note, "a");
    const allowed = fireEvent.keyDown(app.note, {
      key: "Enter",
      ctrlKey: true,
    });
    expect(allowed).toBe(false);
  });

  it("Ctrl+Enter while composing does not save (AC-9)", async () => {
    const repository = createSpyRepository();
    const app = renderApp(repository);
    paste(app.title, "a");

    fireEvent.keyDown(app.title, {
      key: "Enter",
      ctrlKey: true,
      isComposing: true,
    });
    fireEvent.keyDown(app.title, { key: "Enter", ctrlKey: true, keyCode: 229 });
    await settle();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("plain Enter in Title moves focus to Note and doesn't save or submit (AC-10)", async () => {
    const repository = createSpyRepository();
    const app = renderApp(repository);
    const onSubmit = vi.fn();
    app.form.addEventListener("submit", onSubmit);
    paste(app.title, "a");
    app.title.focus();

    const allowed = fireEvent.keyDown(app.title, { key: "Enter" });
    await settle();

    expect(allowed).toBe(false); // default prevented: no implicit submit
    expect(onSubmit).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(app.note);
  });

  it("Shift+Enter in Title also moves to Note without saving (D8)", async () => {
    const repository = createSpyRepository();
    const app = renderApp(repository);
    paste(app.title, "a");
    app.title.focus();

    expect(fireEvent.keyDown(app.title, { key: "Enter", shiftKey: true })).toBe(
      false,
    );
    await settle();
    expect(repository.create).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(app.note);
  });

  it("Enter and Shift+Enter in Note don't save (AC-10)", async () => {
    const repository = createSpyRepository();
    const app = renderApp(repository);
    paste(app.title, "a");
    app.note.focus();

    // Not prevented: the textarea keeps its default (a line break).
    expect(fireEvent.keyDown(app.note, { key: "Enter" })).toBe(true);
    expect(fireEvent.keyDown(app.note, { key: "Enter", shiftKey: true })).toBe(
      true,
    );
    await settle();
    expect(repository.create).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(app.note);
  });

  it("Tab is never handled, so there is no keyboard trap (R6)", () => {
    const app = renderApp(createSpyRepository());
    expect(fireEvent.keyDown(app.title, { key: "Tab" })).toBe(true);
    expect(fireEvent.keyDown(app.note, { key: "Tab" })).toBe(true);
    expect(fireEvent.keyDown(app.note, { key: "Tab", shiftKey: true })).toBe(
      true,
    );
  });

  it.each([
    ["Cmd", "MacIntel", HINT_APPLE],
    ["Ctrl", "Win32", HINT_OTHER],
  ])(
    "shows the %s hint for navigator.platform %s, with aria-keyshortcuts and description (AC-11)",
    (_name, platform, hint) => {
      stubPlatform(platform);
      renderApp(createSpyRepository());

      expect(screen.getByText(hint)).toBeInTheDocument();
      const button = screen.getByRole("button", { name: SAVE_BUTTON });
      expect(button).toHaveAttribute(
        "aria-keyshortcuts",
        "Control+Enter Meta+Enter",
      );
      expect(button).toHaveAccessibleName(SAVE_BUTTON);
      expect(button).toHaveAccessibleDescription(hint);
    },
  );
});
