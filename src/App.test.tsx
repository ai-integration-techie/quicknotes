import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";
import {
  APP_NAME,
  INFO_PRIMARY,
  INFO_SECONDARY,
  NEW_NOTE_HEADING,
  NOTE_LABEL,
  SAVE_BUTTON,
  SKIP_TO_NOTES,
  TITLE_LABEL,
} from "./copy";
import { clickSave, paste, renderApp, settle } from "./test/renderApp";
import { notesSection } from "./test/renderNotes";
import {
  createSpyRepository,
  createStubRepository,
} from "./test/repositoryDoubles";

function precedes(a: Node, b: Node): boolean {
  return (
    (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
  );
}

describe("App shell", () => {
  it("renders banner with the only h1 and the info text in main (AC-6)", async () => {
    render(
      <App
        repository={createStubRepository({ list: () => Promise.resolve([]) })}
      />,
    );
    await settle();

    const banner = screen.getByRole("banner");
    expect(
      within(banner).getByRole("heading", { level: 1, name: APP_NAME }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);

    const main = screen.getByRole("main");
    expect(within(main).getByText(INFO_PRIMARY)).toBeInTheDocument();
    expect(within(main).getByText(INFO_SECONDARY)).toBeInTheDocument();
    // list-notes AC-6 change: "No notes yet" is now the Your notes empty state, only.
    expect(within(main).getAllByText("No notes yet")).toHaveLength(1);
    expect(
      within(notesSection()).getByText("No notes yet"),
    ).toBeInTheDocument();
    expect(
      within(main).queryByText("Your notes will show up here."),
    ).toBeNull();
  });

  it("the info text is unchanged after a successful save (AC-6)", async () => {
    const app = renderApp(createSpyRepository());
    paste(app.title, "Title A");
    await clickSave(app);
    expect(app.status).toHaveTextContent("Note saved.");

    const main = screen.getByRole("main");
    expect(within(main).getByText(INFO_PRIMARY)).toBeInTheDocument();
    expect(within(main).getByText(INFO_SECONDARY)).toBeInTheDocument();
  });

  it("main holds the New note form: h2, Title input, Note textarea, Save note submit, in DOM order (AC-1)", () => {
    render(<App repository={createSpyRepository()} />);
    const main = screen.getByRole("main");

    const heading = within(main).getByRole("heading", {
      level: 2,
      name: NEW_NOTE_HEADING,
    });
    const title = within(main).getByRole("textbox", { name: TITLE_LABEL });
    const note = within(main).getByRole("textbox", { name: NOTE_LABEL });
    const button = within(main).getByRole("button", { name: SAVE_BUTTON });

    expect(title.tagName).toBe("INPUT");
    expect(title).toHaveAttribute("type", "text");
    expect(note.tagName).toBe("TEXTAREA");
    expect(button).toHaveAttribute("type", "submit");
    expect(precedes(heading, title)).toBe(true);
    expect(precedes(title, note)).toBe(true);
    expect(precedes(note, button)).toBe(true);

    // The section is labelled by its visible h2, and holds the one form.
    const section = heading.closest("section");
    expect(section).toHaveAttribute("aria-labelledby", heading.id);
    expect(section?.querySelectorAll("form")).toHaveLength(1);

    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    // list-notes AC-1 change: no link inside "New note"; page-wide, only
    // the skip link (the list is still loading), and no searchbox or checkbox.
    expect(within(section as HTMLElement).queryAllByRole("link")).toHaveLength(
      0,
    );
    for (const role of ["searchbox", "checkbox"] as const) {
      expect(screen.queryAllByRole(role)).toHaveLength(0);
    }
    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(
      [SKIP_TO_NOTES],
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      within(screen.getByRole("banner")).getByRole("heading", {
        level: 1,
        name: APP_NAME,
      }),
    ).toBeInTheDocument();
  });

  it("focus is in Title after the first render, with no interaction (AC-2)", () => {
    render(<App repository={createSpyRepository()} />);
    expect(document.activeElement).toBe(
      screen.getByRole("textbox", { name: TITLE_LABEL }),
    );
  });

  it("fields have no maxlength or required; form is noValidate (AC-3)", () => {
    const app = renderApp(createSpyRepository());
    for (const field of [app.title, app.note]) {
      expect(field).not.toHaveAttribute("maxlength");
      expect(field).not.toHaveAttribute("required");
    }
    expect(app.form.noValidate).toBe(true);
  });

  it("the form has exactly one empty status region and one empty alert region on first render (AC-50)", () => {
    const app = renderApp(createSpyRepository());
    expect(within(app.form).getAllByRole("status")).toHaveLength(1);
    expect(within(app.form).getAllByRole("alert")).toHaveLength(1);
    expect(app.status).toHaveTextContent("");
    expect(app.status.textContent).toBe("");
    expect(app.alert.textContent).toBe("");
  });
});
