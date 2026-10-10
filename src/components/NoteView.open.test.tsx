import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  NOT_FOUND,
  NOT_FOUND_HEADING,
  NOTE_NO_TEXT,
  NOTE_OPENING,
  NOTES_HEADING,
  OPEN_FAILED,
  OPEN_FAILED_HEADING,
  OPEN_UNAVAILABLE,
  SAVE_BUTTON,
  SKIP_TO_NOTES,
  TITLE_LABEL,
  UNTITLED_NOTE,
} from "../copy";
import { NotFoundError, StorageUnavailableError, type Note } from "../storage";
import { settle } from "../test/renderApp";
import {
  activate,
  backLink,
  inMemoryWith,
  makeNote,
  noteLink,
  noteLinkNames,
  renderAt,
} from "../test/renderNotes";
import { createStubRepository, deferred } from "../test/repositoryDoubles";

function heading(): HTMLElement {
  return screen.getByRole("heading", { level: 2 });
}

function stubWith(
  notes: Note[],
  get: (id: string) => Promise<Note> = (id) => {
    const note = notes.find((n) => n.id === id);
    return note ? Promise.resolve(note) : Promise.reject(new NotFoundError());
  },
) {
  return createStubRepository({ list: () => Promise.resolve(notes), get });
}

/** Renders the list with `notes`, then opens the one titled `title`. */
async function openFromList(
  repository: ReturnType<typeof stubWith>,
  title: string,
) {
  await renderAt("", repository);
  await activate(noteLink(title));
}

const A = makeNote(1, { title: "Shopping", body: "Milk\n\n  Eggs\tx" });
const B = makeNote(2, { title: "Other", body: "b" });

describe("Note view: opening", () => {
  it("opening a note sets the hash, calls get once and shows the read-only view with the heading focused (AC-24)", async () => {
    const repository = stubWith([A, B]);
    await openFromList(repository, "Shopping");

    expect(location.hash).toBe(`#note/${A.id}`);
    expect(repository.get).toHaveBeenCalledTimes(1);
    expect(repository.get).toHaveBeenCalledWith(A.id);
    expect(backLink()).toBeInTheDocument();
    const h2 = screen.getByRole("heading", { level: 2, name: "Shopping" });
    expect(document.activeElement).toBe(h2);
    const article = h2.closest("article") as HTMLElement;
    const body = article.querySelector("[data-note-body]");
    expect(body?.textContent === "Milk\n\n  Eggs\tx").toBe(true);

    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: SAVE_BUTTON })).toBeNull();
    expect(screen.queryByRole("heading", { name: NOTES_HEADING })).toBeNull();
    expect(screen.queryByRole("link", { name: SKIP_TO_NOTES })).toBeNull();
  });

  it("the view shows what get returns, not the list copy (AC-25)", async () => {
    const repository = stubWith([A], () =>
      Promise.resolve({ ...A, title: "Fresh" }),
    );
    await openFromList(repository, "Shopping");
    expect(heading()).toHaveTextContent("Fresh");
  });

  it("while get is pending: Opening note…, no h2, focus not in the view (AC-25)", async () => {
    const get = deferred<Note>();
    await openFromList(
      stubWith([A], () => get.promise),
      "Shopping",
    );
    const main = screen.getByRole("main");
    expect(backLink()).toBeInTheDocument();
    expect(within(main).getByText(NOTE_OPENING)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
    const view = backLink().parentElement as HTMLElement;
    expect(view.contains(document.activeElement)).toBe(false);
  });

  it("untitled heading, no-text message, and the title kept exactly (AC-26)", async () => {
    await renderAt(
      `#note/${A.id}`,
      stubWith([], () => Promise.resolve({ ...A, title: " ", body: "" })),
    );
    expect(heading()).toHaveTextContent(UNTITLED_NOTE);
    expect(screen.getByText(NOTE_NO_TEXT)).toBeInTheDocument();
  });

  it.each([
    ["a whitespace body", { body: "  \n " }, null],
    ["a title with spaces", { title: "  lead  " }, "  lead  "],
  ])(
    "untitled heading, no-text message, and the title kept exactly (AC-26): %s",
    async (_name, overrides, title) => {
      await renderAt(
        `#note/${A.id}`,
        stubWith([], () => Promise.resolve({ ...A, ...overrides })),
      );
      if (title === null) {
        expect(screen.getByText(NOTE_NO_TEXT)).toBeInTheDocument();
      } else {
        expect(heading().textContent).toBe(title);
      }
    },
  );

  it("the view has no control other than Back to notes, Edit and Delete (list-notes AC-27, revised by edit-delete-note AC-1)", async () => {
    await openFromList(stubWith([A, B]), "Shopping");
    const main = screen.getByRole("main");
    expect(within(main).queryAllByRole("textbox")).toHaveLength(0);
    expect(
      within(main)
        .queryAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Edit", "Delete"]);
    const visible = [...main.querySelectorAll("[contenteditable]")].filter(
      (element) => !element.closest("[hidden]"),
    );
    expect(visible).toHaveLength(0);
    expect(
      within(main)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Back to notes"]);
    expect(within(main).getAllByRole("link")[0]).toHaveAccessibleName(
      "Back to notes",
    );
  });

  it("markup in note text renders literally in the list and the view (AC-13)", async () => {
    const title = "<img src=x onerror=alert(1)>";
    const body = "**bold** <script>x</script>";
    const note = makeNote(1, { title, body });
    await renderAt("", stubWith([note]));
    const main = screen.getByRole("main");
    expect(within(main).getByText(title)).toBeInTheDocument();
    expect(within(main).getByText(body)).toBeInTheDocument();
    expect(main.querySelectorAll("img, script, strong")).toHaveLength(0);

    await activate(noteLink(title));
    expect(heading().textContent).toBe(title);
    expect(document.querySelector("[data-note-body]")?.textContent).toBe(body);
    expect(main.querySelectorAll("img, script, strong")).toHaveLength(0);
  });
});

describe("Note view: routes", () => {
  it("loading at #note/<id> opens it with one list() and one get() (AC-28)", async () => {
    const { repository, notes } = await inMemoryWith({
      title: "A",
      body: "a",
    });
    const id = notes[0]?.id ?? "";
    const list = vi.spyOn(repository, "list");
    const get = vi.spyOn(repository, "get");
    await renderAt(`#note/${id}`, repository);

    const h2 = screen.getByRole("heading", { level: 2, name: "A" });
    expect(document.activeElement).toBe(h2);
    expect(list).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["#note/not-a-uuid"],
    ["#note/"],
    [`#note/${A.id.replace(/[a-f]/g, (c) => c.toUpperCase())}-X`],
    [`#note/${"3f2b8c1e-7a4d-4e2b-9c1f-0a1b2c3d4e5f".toUpperCase()}`],
  ])(
    "malformed ids show Note not found without get; other hashes show the list (AC-28): %s",
    async (hash) => {
      const repository = stubWith([A]);
      await renderAt(hash, repository);
      const h2 = screen.getByRole("heading", {
        level: 2,
        name: NOT_FOUND_HEADING,
      });
      expect(document.activeElement).toBe(h2);
      expect(repository.get).not.toHaveBeenCalled();
    },
  );

  it.each([["#elsewhere"], ["#"]])(
    "malformed ids show Note not found without get; other hashes show the list (AC-28): %s",
    async (hash) => {
      const repository = stubWith([A]);
      await renderAt(hash, repository);
      expect(document.activeElement).toBe(
        screen.getByRole("textbox", { name: TITLE_LABEL }),
      );
      expect(noteLinkNames()).toEqual(["Shopping"]);
      expect(repository.get).not.toHaveBeenCalled();
    },
  );
});

describe("Note view: failures", () => {
  it("NotFoundError shows Note not found and removes the note from the list (AC-29)", async () => {
    await openFromList(
      stubWith([A, B], () => Promise.reject(new NotFoundError())),
      "Shopping",
    );
    const h2 = screen.getByRole("heading", {
      level: 2,
      name: NOT_FOUND_HEADING,
    });
    expect(document.activeElement).toBe(h2);
    expect(screen.getByText(NOT_FOUND)).toBeInTheDocument();

    await activate(backLink());
    expect(noteLinkNames()).toEqual(["Other"]);
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { level: 2, name: NOTES_HEADING }),
    );
  });

  it.each<[string, unknown, string]>([
    [
      "StorageUnavailableError",
      new StorageUnavailableError(),
      OPEN_UNAVAILABLE,
    ],
    ['new Error("boom")', new Error("boom"), OPEN_FAILED],
  ])(
    "open failures show the matching copy and leave the list unchanged (AC-30): %s",
    async (_name, error, copy) => {
      await openFromList(
        stubWith([A, B], () => Promise.reject(error)),
        "Shopping",
      );
      const h2 = screen.getByRole("heading", {
        level: 2,
        name: OPEN_FAILED_HEADING,
      });
      expect(document.activeElement).toBe(h2);
      expect(screen.getByText(copy)).toBeInTheDocument();
      expect(document.body.textContent).not.toContain("boom");

      await activate(backLink());
      await settle();
      expect(noteLinkNames()).toEqual(["Shopping", "Other"]);
    },
  );
});
