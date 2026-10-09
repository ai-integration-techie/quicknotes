import { act, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NOTE_SAVED,
  SAVE_FAILED_UNAVAILABLE,
  counterText,
  titleTooLong,
} from "../copy";
import { StorageUnavailableError, type Note } from "../storage";
import { clickSave, paste, renderApp, settle } from "../test/renderApp";
import {
  activate,
  backLink,
  goToHash,
  makeNote,
  noteLink,
  noteLinkNames,
  updatedLines,
} from "../test/renderNotes";
import { createStubRepository, deferred } from "../test/repositoryDoubles";

const T = Date.parse("2026-10-08T12:00:00Z");
const MIN = 60_000;

afterEach(() => {
  vi.useRealTimers();
});

const A = makeNote(1, { title: "A", body: "a" });
const B = makeNote(2, { title: "B", body: "b" });

function stub(
  options: {
    notes?: Note[];
    create?: () => Promise<Note>;
  } = {},
) {
  const notes = options.notes ?? [A, B];
  return createStubRepository({
    list: () => Promise.resolve(notes),
    get: (id) => Promise.resolve(notes.find((n) => n.id === id) ?? A),
    ...(options.create ? { create: options.create } : {}),
  });
}

function beforeUnloadPrevented(): boolean {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

describe("Note view: back to the list", () => {
  it("Back to notes returns focus to the opened link (AC-31)", async () => {
    renderApp(stub());
    await settle();
    await activate(noteLink("A"));
    await activate(backLink());

    expect(location.hash).toBe("");
    expect(noteLinkNames()).toEqual(["A", "B"]);
    expect(document.activeElement).toBe(noteLink("A"));
  });

  it("a hashchange to '' (as browser Back does) returns focus to the opened link (AC-31)", async () => {
    renderApp(stub());
    await settle();
    await activate(noteLink("B"));
    expect(screen.getByRole("heading", { level: 2, name: "B" })).toBeVisible();
    await goToHash("");

    expect(location.hash).toBe("");
    expect(document.activeElement).toBe(noteLink("B"));
  });

  it("relative time doesn't tick, and refreshes when the list shows again (AC-12)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(T);
    renderApp(stub({ notes: [makeNote(1, { title: "A", updatedAt: T })] }));
    await settle();
    expect(updatedLines()).toEqual(["Updated just now"]);

    // Ten minutes pass with every timer faked and advanced; nothing re-renders.
    vi.useFakeTimers();
    vi.setSystemTime(T);
    act(() => {
      vi.advanceTimersByTime(10 * MIN);
    });
    expect(Date.now()).toBe(T + 10 * MIN);
    expect(updatedLines()).toEqual(["Updated just now"]);

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(T + 10 * MIN);
    await activate(noteLink("A"));
    await activate(backLink());
    expect(updatedLines()).toEqual(["Updated 10 minutes ago"]);
  });
});

describe("Note view: unsaved form text", () => {
  it("form values, counter and errors survive opening a note; beforeunload stays on; nothing is stored (AC-38)", async () => {
    const app = renderApp(stub());
    await settle();
    const title181 = "t".repeat(181);
    paste(app.title, title181);
    paste(app.note, "draft");
    expect(screen.getByText(counterText(181, 200))).toBeInTheDocument();

    await activate(noteLink("A"));
    expect(beforeUnloadPrevented()).toBe(true);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(location.hash).toBe(`#note/${A.id}`);
    // jsdom reports a fragment navigation's state as undefined where browsers
    // report null; either way the app stored nothing there (e2e AC-34 checks null).
    expect(history.state ?? null).toBeNull();

    await activate(backLink());
    expect(app.title.value).toBe(title181);
    expect(app.note.value).toBe("draft");
    expect(screen.getByText(counterText(181, 200))).toBeInTheDocument();
  });

  it("the title-too-long error and aria-invalid survive opening a note (AC-38)", async () => {
    const app = renderApp(stub());
    await settle();
    paste(app.title, "t".repeat(205));
    await clickSave(app);
    expect(screen.getByText(titleTooLong(205))).toBeInTheDocument();
    expect(app.title).toHaveAttribute("aria-invalid", "true");

    await activate(noteLink("A"));
    await activate(backLink());
    expect(screen.getByText(titleTooLong(205))).toBeInTheDocument();
    expect(app.title).toHaveAttribute("aria-invalid", "true");
  });

  it("a save that settles while a note is open doesn't move focus, and shows its outcome on return (AC-40)", async () => {
    const create = deferred<Note>();
    const N = makeNote(9, { title: "New" });
    const app = renderApp(stub({ create: () => create.promise }));
    await settle();
    paste(app.title, "New");
    await clickSave(app);

    await activate(noteLink("A"));
    const heading = screen.getByRole("heading", { level: 2, name: "A" });
    expect(document.activeElement).toBe(heading);

    create.resolve(N);
    await settle();
    expect(document.activeElement).toBe(heading);

    await activate(backLink());
    expect(app.title.value).toBe("");
    expect(app.note.value).toBe("");
    expect(app.status.textContent).toBe(NOTE_SAVED);
    expect(noteLinkNames()[0]).toBe("New");
  });

  it("a save that fails while a note is open keeps the text and shows the alert on return (AC-40)", async () => {
    const create = deferred<Note>();
    const app = renderApp(stub({ create: () => create.promise }));
    await settle();
    paste(app.title, "New");
    await clickSave(app);

    await activate(noteLink("A"));
    const heading = screen.getByRole("heading", { level: 2, name: "A" });
    create.reject(new StorageUnavailableError());
    await settle();
    expect(document.activeElement).toBe(heading);

    await activate(backLink());
    expect(app.title.value).toBe("New");
    expect(app.alert.textContent).toBe(SAVE_FAILED_UNAVAILABLE);
    expect(noteLinkNames()).toEqual(["A", "B"]);
  });
});
