import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BOTH_EMPTY,
  NOTE_SAVED,
  SAVE_BUTTON,
  SAVE_FAILED_GENERIC,
  SAVE_FAILED_QUOTA,
  SAVE_FAILED_UNAVAILABLE,
  titleTooLong,
} from "../copy";
import {
  NotFoundError,
  QuotaExceededError,
  StorageUnavailableError,
  ValidationError,
  type Note,
  type NoteInput,
  type ValidationIssue,
} from "../storage";
import {
  clickSave,
  paste,
  pressSaveShortcut,
  renderApp,
  type RenderedApp,
} from "../test/renderApp";
import {
  createStubRepository,
  noteFor,
  rejectingWith,
} from "../test/repositoryDoubles";

/** Records every text the element shows, starting with the current one. */
function recordText(element: HTMLElement): { texts: string[]; stop(): void } {
  const texts = [element.textContent ?? ""];
  const observer = new MutationObserver(() => {
    const text = element.textContent ?? "";
    if (texts[texts.length - 1] !== text) texts.push(text);
  });
  observer.observe(element, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  return { texts, stop: () => observer.disconnect() };
}

function fillAndSave(app: RenderedApp, title: string, body: string) {
  paste(app.title, title);
  paste(app.note, body);
  return clickSave(app);
}

function expectReset(app: RenderedApp): void {
  expect(app.saveButton).toHaveAccessibleName(SAVE_BUTTON);
  expect(app.saveButton).not.toHaveAttribute("aria-disabled");
  expect(app.title.readOnly).toBe(false);
  expect(app.note.readOnly).toBe(false);
}

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("NoteForm storage failures", () => {
  it.each([
    ["StorageUnavailableError", new StorageUnavailableError()],
    ["QuotaExceededError", new QuotaExceededError()],
    ["NotFoundError", new NotFoundError()],
    [
      "ValidationError",
      new ValidationError([{ field: "note", rule: "empty" }]),
    ],
    ["Error", new Error("x")],
  ])(
    "never shows Note saved. and keeps the text when create rejects with %s (AC-15)",
    async (_name, error) => {
      const app = renderApp(rejectingWith(error));
      const status = recordText(app.status);
      await fillAndSave(app, "Keep  me ", "And\nme");
      status.stop();

      expect(status.texts).not.toContain(NOTE_SAVED);
      expect(document.body.textContent).not.toContain(NOTE_SAVED);
      expect(app.title.value).toBe("Keep  me ");
      expect(app.note.value).toBe("And\nme");
    },
  );

  it.each([
    [[{ field: "note", rule: "empty" }], BOTH_EMPTY],
    [
      [{ field: "title", rule: "too-long", limit: 200, actual: 250 }],
      titleTooLong(250),
    ],
    [[{ field: "id", rule: "not-a-string" }], SAVE_FAILED_GENERIC],
  ] as [ValidationIssue[], string][])(
    "maps a ValidationError rejection with %j to its message (AC-24)",
    async (issues, message) => {
      const app = renderApp(rejectingWith(new ValidationError(issues)));
      await fillAndSave(app, "a", "b");
      expect(document.body.textContent).toContain(message);
    },
  );

  it("unavailable: exact copy, text kept and editable, button reset, focus stays on Save note (AC-29)", async () => {
    const app = renderApp(rejectingWith(new StorageUnavailableError()));
    await fillAndSave(app, "Keep me", "And me");

    expect(app.alert.textContent).toBe(SAVE_FAILED_UNAVAILABLE);
    expect(app.title.value).toBe("Keep me");
    expect(app.note.value).toBe("And me");
    expectReset(app);
    expect(document.activeElement).toBe(app.saveButton);
  });

  it("unavailable via Ctrl+Enter from Note keeps focus in Note (AC-29)", async () => {
    const app = renderApp(rejectingWith(new StorageUnavailableError()));
    paste(app.title, "Keep me");
    paste(app.note, "And me");
    await pressSaveShortcut(app.note);

    expect(app.alert.textContent).toBe(SAVE_FAILED_UNAVAILABLE);
    expect(document.activeElement).toBe(app.note);
    expectReset(app);
  });

  it("quota exceeded shows the Storage full copy (AC-30)", async () => {
    const app = renderApp(rejectingWith(new QuotaExceededError()));
    await fillAndSave(app, "Keep me", "And me");
    expect(app.alert.textContent).toBe(SAVE_FAILED_QUOTA);
    expect(app.title.value).toBe("Keep me");
    expectReset(app);
  });

  it.each([
    ["NotFoundError", new NotFoundError()],
    ["Error(boom)", new Error("boom")],
    ["the string boom", "boom"],
  ])(
    "%s shows the generic copy and never the raw message (AC-31)",
    async (_name, error) => {
      const app = renderApp(rejectingWith(error));
      await fillAndSave(app, "Keep me", "And me");
      expect(app.alert.textContent).toBe(SAVE_FAILED_GENERIC);
      expect(document.body.textContent).not.toContain("boom");
      expect(document.activeElement).toBe(app.saveButton);
    },
  );

  it("a retry that succeeds clears the alert and saves (AC-32)", async () => {
    let calls = 0;
    const repository = createStubRepository({
      create: (input: NoteInput): Promise<Note> => {
        calls += 1;
        return calls === 1
          ? Promise.reject(new StorageUnavailableError())
          : Promise.resolve(noteFor(input));
      },
    });
    const app = renderApp(repository);
    await fillAndSave(app, "Keep me", "And me");
    expect(app.alert.textContent).toBe(SAVE_FAILED_UNAVAILABLE);

    await clickSave(app);
    expect(app.alert.textContent).toBe("");
    expect(app.status.textContent).toBe(NOTE_SAVED);
    expect(app.title.value).toBe("");
    expect(app.note.value).toBe("");
  });

  it("a repeated failure empties the alert before showing it again (AC-32)", async () => {
    const app = renderApp(rejectingWith(new StorageUnavailableError()));
    await fillAndSave(app, "Keep me", "And me");

    const alert = recordText(app.alert);
    await clickSave(app);
    alert.stop();
    expect(alert.texts).toEqual([
      SAVE_FAILED_UNAVAILABLE,
      "",
      SAVE_FAILED_UNAVAILABLE,
    ]);
  });

  it("a repeated both-empty alert is removed and re-added as two DOM changes (R22)", async () => {
    const app = renderApp(createStubRepository());
    await clickSave(app);
    expect(app.alert.textContent).toBe(BOTH_EMPTY);

    const records: MutationRecord[] = [];
    const observer = new MutationObserver((batch) => records.push(...batch));
    observer.observe(app.alert, { childList: true, subtree: true });
    await clickSave(app);
    records.push(...observer.takeRecords());
    observer.disconnect();

    // The synchronous path commits twice, so the observer batches both.
    const removed = records.findIndex((record) =>
      [...record.removedNodes].some((node) => node.textContent === BOTH_EMPTY),
    );
    const added = records.findIndex((record) =>
      [...record.addedNodes].some((node) => node.textContent === BOTH_EMPTY),
    );
    expect(removed).toBeGreaterThanOrEqual(0);
    expect(added).toBeGreaterThan(removed);
    expect(app.alert.textContent).toBe(BOTH_EMPTY);
  });

  it("a failed save leaves no web storage, cookies or console output containing the note (AC-33)", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map(
      (method) => vi.spyOn(console, method),
    );
    const app = renderApp(rejectingWith(new StorageUnavailableError()));
    await fillAndSave(app, "SECRET-T", "SECRET-B");

    expect(app.alert.textContent).toBe(SAVE_FAILED_UNAVAILABLE);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(document.cookie).toBe("");
    const logged = spies.flatMap((spy) => spy.mock.calls.flat());
    expect(
      logged.filter((arg) => {
        const text =
          arg instanceof Error ? `${arg.message} ${arg.stack}` : String(arg);
        return text.includes("SECRET");
      }),
    ).toEqual([]);
  });

  it("no saved or failure state mentions persist or permission (AC-49)", async () => {
    const outcomes = [
      createStubRepository(),
      rejectingWith(new StorageUnavailableError()),
      rejectingWith(new QuotaExceededError()),
      rejectingWith(new NotFoundError()),
      rejectingWith(new Error("boom")),
      rejectingWith("boom"),
    ];
    for (const repository of outcomes) {
      const app = renderApp(repository);
      await fillAndSave(app, "a", "b");
      expect(document.body.textContent ?? "").not.toMatch(
        /persist|permission/i,
      );
      cleanup();
    }
  });
});
