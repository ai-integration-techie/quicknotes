import { cleanup, render, screen, within } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import App from "../App";
import {
  INFO_PRIMARY,
  INFO_SECONDARY,
  LIST_FAILED,
  LIST_UNAVAILABLE,
  NEW_NOTE_HEADING,
  NOTE_SAVED,
  NOTES_EMPTY_PRIMARY,
  NOTES_EMPTY_SECONDARY,
  NOTES_HEADING,
  NOTES_LOADING,
  TITLE_LABEL,
} from "../copy";
import {
  NotFoundError,
  QuotaExceededError,
  StorageUnavailableError,
  ValidationError,
  type Note,
} from "../storage";
import {
  clickSave,
  paste,
  renderApp,
  settle,
  typeInto,
} from "../test/renderApp";
import {
  activate,
  backLink,
  goToHash,
  inMemoryWith,
  makeNote,
  noteLink,
  noteLinks,
  notesSection,
} from "../test/renderNotes";
import { createStubRepository, deferred } from "../test/repositoryDoubles";

function precedes(a: Node, b: Node): boolean {
  return (
    (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
  );
}

function rejecting(value: unknown) {
  return createStubRepository({ list: () => Promise.reject(value) });
}

/** Elements inside "Your notes" that are live regions. */
function liveRegions(): Element[] {
  return [
    ...notesSection().querySelectorAll(
      '[role="status"], [role="alert"], [aria-live]',
    ),
  ];
}

describe("Your notes: first load", () => {
  it("main holds New note, the info lines and Your notes in order; h2s are exactly New note and Your notes (AC-1)", async () => {
    const { repository } = await inMemoryWith(
      { title: "A", body: "a" },
      { title: "B", body: "b" },
    );
    render(<App repository={repository} />);
    await settle();

    const main = screen.getByRole("main");
    const newNote = within(main)
      .getByRole("heading", { level: 2, name: NEW_NOTE_HEADING })
      .closest("section") as HTMLElement;
    const primary = within(main).getByText(INFO_PRIMARY);
    const secondary = within(main).getByText(INFO_SECONDARY);
    const notes = notesSection();
    expect(main.contains(notes)).toBe(true);
    expect(precedes(newNote, primary)).toBe(true);
    expect(precedes(primary, secondary)).toBe(true);
    expect(precedes(secondary, notes)).toBe(true);

    expect(
      screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
    ).toEqual([NEW_NOTE_HEADING, NOTES_HEADING]);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);

    expect(within(newNote).getAllByRole("textbox")).toHaveLength(2);
    expect(within(newNote).getAllByRole("button")).toHaveLength(1);
    expect(within(newNote).queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryAllByRole("searchbox")).toHaveLength(0);
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(noteLinks()).toHaveLength(2);
  });

  it("loading the list never moves focus, changes a value or makes a field read-only (AC-2)", async () => {
    const list = deferred<Note[]>();
    const app = renderApp(createStubRepository({ list: () => list.promise }));
    await settle();
    expect(document.activeElement).toBe(app.title);
    expect(screen.getByText(NOTES_LOADING)).toBeInTheDocument();

    typeInto(app.title, "abc");
    list.resolve([makeNote(1), makeNote(2), makeNote(3)]);
    await settle();

    expect(noteLinks()).toHaveLength(3);
    expect(document.activeElement).toBe(app.title);
    expect(app.title.value).toBe("abc");
    expect(app.title.readOnly).toBe(false);
    expect(app.note.readOnly).toBe(false);
  });

  it("list() starts only after the form is in the document (AC-3)", async () => {
    const seen: boolean[] = [];
    const repository = createStubRepository({
      list: () => {
        seen.push(
          screen.queryByRole("textbox", { name: TITLE_LABEL }) !== null,
        );
        return Promise.resolve([]);
      },
    });
    render(<App repository={repository} />);
    await settle();
    expect(seen).toEqual([true]);
  });

  it("with the list unavailable, Title is focused and a save still works (AC-4)", async () => {
    const repository = rejecting(new StorageUnavailableError());
    const app = renderApp(repository);
    await settle();
    expect(document.activeElement).toBe(app.title);

    paste(app.title, "a");
    paste(app.note, "b");
    await clickSave(app);
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(app.status.textContent).toBe(NOTE_SAVED);
  });

  it("list() is called once across typing, a save, open, back and a hash change (AC-5)", async () => {
    const { repository } = await inMemoryWith({ title: "A", body: "a" });
    const list = vi.spyOn(repository, "list");
    const app = renderApp(repository);
    await settle();

    typeInto(app.title, "New");
    await clickSave(app);
    await activate(noteLink("A"));
    expect(backLink()).toBeInTheDocument();
    await activate(backLink());
    await goToHash("#elsewhere");

    expect(list).toHaveBeenCalledTimes(1);
  });

  it("list() is called once under StrictMode's double effects (AC-5, plan D4)", async () => {
    const repository = createStubRepository({
      list: () => Promise.resolve([makeNote(1)]),
    });
    render(
      <StrictMode>
        <App repository={repository} />
      </StrictMode>,
    );
    await settle();
    expect(repository.list).toHaveBeenCalledTimes(1);
    expect(noteLinks()).toHaveLength(1);
  });
});

describe("Your notes: states", () => {
  it("loading: text, aria-busy, no list, not in a live region; cleared when settled (AC-14)", async () => {
    const list = deferred<Note[]>();
    render(
      <App repository={createStubRepository({ list: () => list.promise })} />,
    );
    await settle();
    const section = notesSection();
    const loading = within(section).getByText(NOTES_LOADING);
    expect(section).toHaveAttribute("aria-busy", "true");
    expect(within(section).queryByRole("list")).toBeNull();
    expect(within(section).queryByText(NOTES_EMPTY_PRIMARY)).toBeNull();
    expect(
      loading.closest('[aria-live], [role="status"], [role="alert"]'),
    ).toBeNull();

    list.resolve([makeNote(1)]);
    await settle();
    expect(within(section).queryByText(NOTES_LOADING)).toBeNull();
    expect(section.getAttribute("aria-busy") ?? "false").toBe("false");
  });

  it("empty: No notes yet, the secondary line, no list, empty alert (AC-15)", async () => {
    render(
      <App
        repository={createStubRepository({ list: () => Promise.resolve([]) })}
      />,
    );
    await settle();
    const section = notesSection();
    expect(within(section).getByText(NOTES_EMPTY_PRIMARY)).toBeInTheDocument();
    expect(
      within(section).getByText(NOTES_EMPTY_SECONDARY),
    ).toBeInTheDocument();
    expect(within(section).queryByRole("list")).toBeNull();
    expect(within(section).getByRole("alert").textContent).toBe("");
  });

  it.each<[string, unknown, string]>([
    [
      "StorageUnavailableError",
      new StorageUnavailableError(),
      LIST_UNAVAILABLE,
    ],
    ["QuotaExceededError", new QuotaExceededError(), LIST_FAILED],
    ["NotFoundError", new NotFoundError(), LIST_FAILED],
    [
      "ValidationError",
      new ValidationError([{ field: "note", rule: "empty" }]),
      LIST_FAILED,
    ],
    ['new Error("boom")', new Error("boom"), LIST_FAILED],
    ['the non-Error "boom"', "boom", LIST_FAILED],
  ])(
    "load failure copy by error, with no list and no rejection text (AC-16): %s",
    async (_name, error, copy) => {
      render(<App repository={rejecting(error)} />);
      await settle();
      const section = notesSection();
      expect(within(section).getByRole("alert").textContent).toBe(copy);
      expect(within(section).queryByRole("list")).toBeNull();
      expect(within(section).queryByText(NOTES_EMPTY_PRIMARY)).toBeNull();
      expect(within(section).queryByText(NOTES_LOADING)).toBeNull();
      expect(document.body.textContent).not.toContain("boom");
    },
  );

  it("Your notes has exactly one empty alert region from the first render; the form keeps its two regions (AC-17)", () => {
    const app = renderApp(createStubRepository());
    const section = notesSection();
    const alerts = within(section).getAllByRole("alert");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.textContent).toBe("");
    expect(within(app.form).getAllByRole("status")).toHaveLength(1);
    expect(within(app.form).getAllByRole("alert")).toHaveLength(1);
  });

  it("a load failure stays after a successful save (AC-18)", async () => {
    const app = renderApp(rejecting(new StorageUnavailableError()));
    await settle();
    paste(app.title, "a");
    paste(app.note, "b");
    await clickSave(app);
    expect(app.status.textContent).toBe(NOTE_SAVED);
    const section = notesSection();
    expect(within(section).getByRole("alert").textContent).toBe(
      LIST_UNAVAILABLE,
    );
    expect(within(section).queryAllByRole("listitem")).toHaveLength(0);
  });

  it("no live region in Your notes gets text except on a load failure (AC-43)", async () => {
    const silent = () =>
      expect(liveRegions().map((region) => region.textContent)).toEqual([""]);

    renderApp(createStubRepository());
    await settle();
    silent();
    cleanup();

    for (const notes of [[makeNote(9)], []]) {
      const { unmount } = render(
        <App
          repository={createStubRepository({
            list: () => Promise.resolve(notes),
          })}
        />,
      );
      await settle();
      silent();
      unmount();
    }

    const app = renderApp(
      createStubRepository({ list: () => Promise.resolve([makeNote(9)]) }),
    );
    await settle();
    paste(app.title, "Saved");
    await clickSave(app);
    expect(app.status.textContent).toBe(NOTE_SAVED);
    expect(noteLinks()).toHaveLength(2);
    silent();
  });
});
