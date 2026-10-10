import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  DELETE_BUTTON,
  EDIT_BUTTON,
  EDIT_HEADING,
  SAVE_CHANGES,
} from "../copy";
import { typeInto } from "../test/renderApp";
import {
  button,
  click,
  editForm,
  editNote,
  noteField,
  openNote,
  queryButton,
  renderWithAB,
  titleField,
} from "../test/renderEdit";
import { goToHash } from "../test/renderNotes";

function calls(
  repository: Awaited<ReturnType<typeof renderWithAB>>["repository"],
) {
  return [
    repository.create,
    repository.get,
    repository.update,
    repository.delete,
    repository.list,
    repository.isPersisted,
  ].map((spy) => spy.mock.calls.length);
}

function outsideLiveRegions(element: Element): boolean {
  return !element.closest('[aria-live], [role="status"], [role="alert"]');
}

describe("Edit mode: opening", () => {
  it("Edit opens the form in place: same hash and history.length, no repository call, fields prefilled, Title focused, no article (AC-4)", async () => {
    const { repository, A } = await renderWithAB();
    await openNote("Shopping");
    const hash = location.hash;
    const length = history.length;
    const before = calls(repository);

    await click(button(EDIT_BUTTON));

    expect(location.hash).toBe(hash);
    expect(location.hash).toBe(`#note/${A.id}`);
    expect(history.length).toBe(length);
    expect(calls(repository)).toEqual(before);
    expect(
      screen.getByRole("heading", { level: 2, name: EDIT_HEADING }),
    ).toBeInTheDocument();
    const title = titleField();
    expect(title.tagName).toBe("INPUT");
    expect(title.value === "Shopping").toBe(true);
    expect(document.activeElement).toBe(title);
    const note = noteField();
    expect(note.tagName).toBe("TEXTAREA");
    expect(note.value === "Milk\n\n  Eggs\tx").toBe(true);
    expect(button(SAVE_CHANGES).getAttribute("type")).toBe("submit");
    expect(button("Cancel").getAttribute("type")).toBe("button");
    expect(queryButton(EDIT_BUTTON)).toBeNull();
    expect(queryButton(DELETE_BUTTON)).toBeNull();
    expect(screen.getByRole("main").querySelector("article")).toBeNull();
  });

  it("fields equal the stored strings exactly (AC-5)", async () => {
    const inputs = [
      {
        title: "  lead and trail  ",
        body: "line1\nline2\n\n  indented\ttab  ",
      },
      { title: "👩‍💻 🇮🇳", body: "日本語 العربية עברית हिन्दी" },
      { title: "<b>not html</b>", body: "é vs é" },
      { title: "", body: "x" },
    ];
    const { notes } = await renderWithAB(inputs);
    for (const stored of notes) {
      await goToHash(`#note/${stored.id}`);
      await click(button(EDIT_BUTTON));
      expect(titleField().value === stored.title).toBe(true);
      expect(noteField().value === stored.body).toBe(true);
      await click(button("Cancel"));
    }
  });

  it("no maxlength or required, noValidate, unique ids, labels control the edit fields (AC-6)", async () => {
    await renderWithAB();
    await editNote("Shopping");
    for (const field of [titleField(), noteField()]) {
      expect(field.hasAttribute("maxlength")).toBe(false);
      expect(field.hasAttribute("required")).toBe(false);
    }
    const form = editForm();
    expect(form.noValidate).toBe(true);
    const ids = [...document.querySelectorAll("[id]")].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
    const labels = [...form.querySelectorAll("label")];
    expect(labels.map((label) => label.textContent)).toEqual(["Title", "Note"]);
    expect(labels[0]?.control).toBe(titleField());
    expect(labels[1]?.control).toBe(noteField());
  });

  it("counters show straight away at 90% and stay outside live regions; no message while typing (AC-7)", async () => {
    const { notes } = await renderWithAB([
      { title: "t".repeat(185), body: "short" },
      { title: "long body", body: "b".repeat(90_000) },
      { title: "u".repeat(179), body: "x" },
    ]);
    const [title185, body90k, title179] = notes;

    await goToHash(`#note/${title185?.id}`);
    await click(button(EDIT_BUTTON));
    const counter = screen.getByText("185 of 200 characters");
    expect(titleField().getAttribute("aria-describedby")).toContain(counter.id);
    expect(outsideLiveRegions(counter)).toBe(true);
    await click(button("Cancel"));

    await goToHash(`#note/${body90k?.id}`);
    await click(button(EDIT_BUTTON));
    const bodyCounter = screen.getByText("90,000 of 100,000 characters");
    expect(noteField().getAttribute("aria-describedby")).toContain(
      bodyCounter.id,
    );
    expect(outsideLiveRegions(bodyCounter)).toBe(true);
    await click(button("Cancel"));

    await goToHash(`#note/${title179?.id}`);
    await click(button(EDIT_BUTTON));
    expect(within(editForm()).queryByText(/characters$/)).toBeNull();
    typeInto(titleField(), "u".repeat(71));
    expect(screen.getByText("250 of 200 characters")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("too long");
    expect(titleField().hasAttribute("aria-invalid")).toBe(false);
  });
});
