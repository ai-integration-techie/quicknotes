import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../App";
import {
  LIST_UNAVAILABLE,
  NEW_NOTE_HEADING,
  NOTES_EMPTY_PRIMARY,
  NOTES_EMPTY_SECONDARY,
  NOTES_HEADING,
  NOTES_LOADING,
  NO_MATCHES_PRIMARY,
  NOTE_LABEL,
  SAVE_BUTTON,
  SEARCH_LABEL,
  TITLE_LABEL,
} from "../copy";
import { StorageUnavailableError, type Note } from "../storage";
import { paste, renderApp, settle, typeInto } from "../test/renderApp";
import { button, click } from "../test/renderEdit";
import {
  activate,
  backLink,
  inMemoryWith,
  makeNote,
  noteLink,
  notesSection,
  renderAt,
} from "../test/renderNotes";
import {
  queryClearButton,
  querySearchbox,
  searchbox,
  searchWithCBA,
  shownLinkNames,
  typeQuery,
} from "../test/renderSearch";
import { createStubRepository, deferred } from "../test/repositoryDoubles";

function precedes(a: Node, b: Node): boolean {
  return (
    (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
  );
}

describe("Search notes: the field", () => {
  it("one Search notes searchbox in Your notes inside role=search: type, autocomplete, no maxlength/required/pattern/placeholder, visible label, not in a form; order h2 → searchbox → list; no Clear search or checkbox; h2s unchanged; Title focused; New note unchanged (AC-1)", async () => {
    await searchWithCBA();
    const section = notesSection();
    const boxes = screen.getAllByRole("searchbox");
    expect(boxes).toHaveLength(1);
    const box = boxes[0] as HTMLInputElement;
    expect(box).toHaveAccessibleName(SEARCH_LABEL);
    expect(section.contains(box)).toBe(true);
    expect(box.closest('[role="search"]')).not.toBeNull();
    expect(box.tagName).toBe("INPUT");
    expect(box).toHaveAttribute("type", "search");
    expect(box).toHaveAttribute("autocomplete", "off");
    for (const attribute of ["maxlength", "required", "pattern", "placeholder"])
      expect(box).not.toHaveAttribute(attribute);
    const label = box.labels?.[0];
    expect(label?.textContent).toBe(SEARCH_LABEL);
    expect(label).toBeVisible();
    expect(box.closest("form")).toBeNull();

    const heading = within(section).getByRole("heading", {
      level: 2,
      name: NOTES_HEADING,
    });
    const list = within(section).getByRole("list");
    expect(precedes(heading, box)).toBe(true);
    expect(precedes(box, list)).toBe(true);

    expect(queryClearButton()).toBeNull();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
    ).toEqual([NEW_NOTE_HEADING, NOTES_HEADING]);
    expect(document.activeElement).toBe(
      screen.getByRole("textbox", { name: TITLE_LABEL }),
    );
    const newNote = screen
      .getByRole("heading", { level: 2, name: NEW_NOTE_HEADING })
      .closest("section") as HTMLElement;
    expect(within(newNote).getAllByRole("textbox")).toHaveLength(2);
    expect(within(newNote).getAllByRole("button")).toHaveLength(1);
    expect(within(newNote).queryAllByRole("link")).toHaveLength(0);
    expect(within(newNote).queryAllByRole("searchbox")).toHaveLength(0);
  });

  it("no searchbox or search landmark while loading, empty or failed; list-notes content unchanged (AC-2)", async () => {
    const cases: {
      list: () => Promise<Note[]>;
      check: (section: HTMLElement) => void;
    }[] = [
      {
        list: () => new Promise<Note[]>(() => {}),
        check: (section) =>
          expect(within(section).getByText(NOTES_LOADING)).toBeInTheDocument(),
      },
      {
        list: () => Promise.resolve([]),
        check: (section) => {
          expect(within(section).getByText(NOTES_EMPTY_PRIMARY)).toBeVisible();
          expect(
            within(section).getByText(NOTES_EMPTY_SECONDARY),
          ).toBeVisible();
        },
      },
      {
        list: () => Promise.reject(new StorageUnavailableError()),
        check: (section) =>
          expect(within(section).getByRole("alert").textContent).toBe(
            LIST_UNAVAILABLE,
          ),
      },
    ];
    for (const { list, check } of cases) {
      const { unmount } = render(
        <App repository={createStubRepository({ list })} />,
      );
      await settle();
      const section = notesSection();
      expect(querySearchbox()).toBeNull();
      expect(within(section).queryByRole("search")).toBeNull();
      expect(section.querySelector("[data-search-status]")).toBeNull();
      expect(within(section).queryByText(NO_MATCHES_PRIMARY)).toBeNull();
      check(section);
      unmount();
    }
  });

  it("the searchbox appearing never takes focus from Title or changes its value (AC-3)", async () => {
    const list = deferred<Note[]>();
    const app = renderApp(createStubRepository({ list: () => list.promise }));
    await settle();
    expect(document.activeElement).toBe(app.title);
    typeInto(app.title, "abc");
    list.resolve([makeNote(1), makeNote(2), makeNote(3)]);
    await settle();
    expect(searchbox()).toBeInTheDocument();
    expect(document.activeElement).toBe(app.title);
    expect(app.title.value).toBe("abc");
  });

  it("last note found gone removes the search and resets the query; saving brings it back empty (AC-4)", async () => {
    const { repository, notes } = await inMemoryWith({
      title: "Groceries",
      body: "Shopping for the party",
    });
    await renderAt("", repository);
    typeQuery("groc");
    expect(shownLinkNames()).toEqual(["Groceries"]);
    await repository.delete((notes[0] as Note).id); // gone behind the app's back
    await activate(noteLink("Groceries")); // get rejects with NotFoundError
    await activate(backLink());

    const section = notesSection();
    expect(within(section).getByText(NOTES_EMPTY_PRIMARY)).toBeVisible();
    expect(querySearchbox()).toBeNull();
    expect(within(section).queryByText(NO_MATCHES_PRIMARY)).toBeNull();

    const title = screen.getByRole("textbox", { name: TITLE_LABEL });
    const note = screen.getByRole("textbox", { name: NOTE_LABEL });
    paste(title, "Later");
    paste(note, "x");
    await click(button(SAVE_BUTTON));
    expect(searchbox().value).toBe("");
    expect(shownLinkNames()).toEqual(["Later"]);
  });
});
