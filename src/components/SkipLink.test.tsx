import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NOTES_HEADING, SKIP_TO_NOTES } from "../copy";
import { activate, makeNote, noteLink, renderAt } from "../test/renderNotes";
import { createStubRepository } from "../test/repositoryDoubles";

const FOCUSABLE =
  'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])';

function repository() {
  const notes = [makeNote(1, { title: "A" })];
  return createStubRepository({
    list: () => Promise.resolve(notes),
    get: () => Promise.resolve(notes[0] as (typeof notes)[0]),
  });
}

describe("skip link", () => {
  it("the skip link is the first focusable element and moves focus to Your notes without touching history (AC-41)", async () => {
    await renderAt("", repository());
    const first = document.querySelector(FOCUSABLE) as HTMLElement;
    const skip = screen.getByRole("link", { name: SKIP_TO_NOTES });
    expect(first).toBe(skip);
    const banner = screen.getByRole("banner");
    expect(
      skip.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);

    const hash = location.hash;
    const length = history.length;
    await activate(skip);

    const heading = screen.getByRole("heading", {
      level: 2,
      name: NOTES_HEADING,
    });
    expect(document.activeElement).toBe(heading);
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(location.hash).toBe(hash);
    expect(history.length).toBe(length);
  });

  it("no skip link in the note view (AC-41)", async () => {
    await renderAt("", repository());
    await activate(noteLink("A"));
    expect(screen.getByRole("heading", { level: 2, name: "A" })).toBeVisible();
    expect(
      within(document.body).queryByRole("link", {
        name: SKIP_TO_NOTES,
        hidden: true,
      }),
    ).toBeNull();
  });
});
