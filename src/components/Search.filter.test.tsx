import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import App from "../App";
import {
  NO_MATCHES_PRIMARY,
  NO_MATCHES_SECONDARY,
  NOTES_EMPTY_PRIMARY,
} from "../copy";
import { paste, settle, typeInto } from "../test/renderApp";
import { makeNote, noteLinks, notesSection } from "../test/renderNotes";
import {
  advance,
  clearButton,
  queryClearButton,
  queryShownList,
  searchbox,
  searchStatus,
  searchWithCBA,
  shownLinkNames,
  typeQuery,
  fakeStatusTimers,
} from "../test/renderSearch";
import {
  createStubRepository,
  type SpyRepository,
} from "../test/repositoryDoubles";

const FOCUSABLE =
  'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])';

/** Focusable, non-hidden elements after `from`, in DOM (= Tab) order (plan S2). */
function tabOrderAfter(from: HTMLElement): HTMLElement[] {
  const all = [...document.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => !element.closest("[hidden]"),
  );
  return all.slice(all.indexOf(from) + 1);
}

function noMatchTexts(): HTMLElement[] {
  const section = notesSection();
  return [
    within(section).queryByText(NO_MATCHES_PRIMARY),
    within(section).queryByText(NO_MATCHES_SECONDARY),
  ].filter((element): element is HTMLElement => element !== null);
}

function onlyListCalled(repository: SpyRepository): void {
  expect(repository.list).toHaveBeenCalledTimes(1);
  for (const method of [
    repository.create,
    repository.get,
    repository.update,
    repository.delete,
    repository.isPersisted,
  ])
    expect(method).not.toHaveBeenCalled();
}

afterEach(() => {
  vi.useRealTimers();
});

describe("Search notes: filtering", () => {
  it("blank queries show C, B, A with an empty status and no no-match text (AC-6)", async () => {
    await searchWithCBA();
    fakeStatusTimers();
    for (const value of ["", " ", "\t", "\n", " "]) {
      paste(searchbox(), value);
      advance(1000);
      expect(shownLinkNames()).toEqual(["Shopping list", "Ideas", "Groceries"]);
      expect(searchStatus().textContent).toBe("");
      expect(noMatchTexts()).toEqual([]);
    }
  });

  it("display stand-ins (Untitled note, …, Updated, ago) are never matched (AC-7)", async () => {
    const recent = Date.now() - 5 * 60_000;
    render(
      <App
        repository={createStubRepository({
          list: () =>
            Promise.resolve([
              makeNote(1, { title: "", body: "x", updatedAt: recent }),
              makeNote(2, {
                title: "Long",
                body: "a".repeat(150),
                updatedAt: recent,
              }),
            ]),
        })}
      />,
    );
    await settle();
    const text = notesSection().textContent ?? "";
    for (const shown of ["Untitled note", "…", "Updated", "ago"])
      expect(text).toContain(shown);
    for (const query of ["untitled", "updated", "…", "ago"]) {
      paste(searchbox(), query);
      expect(screen.getByText(NO_MATCHES_PRIMARY)).toBeVisible();
    }
  });

  it("filters per character; list has 2 listitems; hidden note not found; Tab: Clear search → C → A (AC-9)", async () => {
    await searchWithCBA();
    const expected: Record<string, string[]> = {
      s: ["Shopping list", "Ideas", "Groceries"],
      sh: ["Shopping list", "Groceries"],
      sho: ["Shopping list", "Groceries"],
      shop: ["Shopping list", "Groceries"],
    };
    for (const character of "shop") {
      typeInto(searchbox(), character);
      expect(shownLinkNames()).toEqual(expected[searchbox().value]);
    }
    const list = within(notesSection()).getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(
      within(notesSection()).queryByRole("link", { name: "Ideas" }),
    ).toBeNull();
    const [first, second, third] = tabOrderAfter(searchbox());
    expect(first).toBe(clearButton());
    expect(second).toBe(noteLinks()[0]);
    expect(third).toBe(noteLinks()[1]);
    expect(shownLinkNames()).toEqual(["Shopping list", "Groceries"]);
  });

  it("a result's link outerHTML equals its unfiltered link (AC-10)", async () => {
    await searchWithCBA();
    const link = () =>
      within(notesSection()).getByRole("link", { name: "Groceries" });
    const before = link().outerHTML;
    typeQuery("groc");
    expect(shownLinkNames()).toEqual(["Groceries"]);
    expect(link().outerHTML).toBe(before);
  });

  it("paste filters; Enter changes nothing and calls no repository method (AC-11)", async () => {
    const { repository } = await searchWithCBA();
    paste(searchbox(), "café plans");
    expect(shownLinkNames()).toEqual(["Ideas"]);

    const hash = location.hash;
    const length = history.length;
    searchbox().focus();
    fireEvent.keyDown(searchbox(), { key: "Enter", code: "Enter" });
    fireEvent.keyUp(searchbox(), { key: "Enter", code: "Enter" });
    await settle();
    expect(location.hash).toBe(hash);
    expect(history.length).toBe(length);
    expect(searchbox().value).toBe("café plans");
    expect(shownLinkNames()).toEqual(["Ideas"]);
    expect(document.activeElement).toBe(searchbox());
    onlyListCalled(repository);
  });

  it("Clear search, Escape (defaultPrevented) and Backspace restore the list; Escape on empty does nothing (AC-12)", async () => {
    await searchWithCBA();
    const all = ["Shopping list", "Ideas", "Groceries"];

    typeQuery("shop");
    expect(queryClearButton()).not.toBeNull();
    clearButton().focus();
    fireEvent.click(clearButton());
    expect(searchbox().value).toBe("");
    expect(shownLinkNames()).toEqual(all);
    expect(queryClearButton()).toBeNull();
    expect(document.activeElement).toBe(searchbox());
    expect(searchStatus().textContent).toBe("");

    typeQuery("shop");
    const notPrevented = fireEvent.keyDown(searchbox(), { key: "Escape" });
    expect(notPrevented).toBe(false); // defaultPrevented
    expect(searchbox().value).toBe("");
    expect(shownLinkNames()).toEqual(all);
    expect(queryClearButton()).toBeNull();
    expect(document.activeElement).toBe(searchbox());
    expect(searchStatus().textContent).toBe("");

    expect(fireEvent.keyDown(searchbox(), { key: "Escape" })).toBe(true);
    expect(searchbox().value).toBe("");
    expect(shownLinkNames()).toEqual(all);

    typeQuery("shop");
    for (let i = 0; i < 4; i += 1)
      paste(searchbox(), searchbox().value.slice(0, -1)); // Backspace
    expect(searchbox().value).toBe("");
    expect(shownLinkNames()).toEqual(all);
  });

  it("zebra shows the no-match texts, no list, not live; cleared afterwards (AC-13)", async () => {
    await searchWithCBA();
    typeQuery("zebra");
    const section = notesSection();
    const texts = noMatchTexts();
    expect(texts).toHaveLength(2);
    for (const text of texts) {
      expect(text).toBeVisible();
      expect(
        text.closest('[aria-live], [role="status"], [role="alert"]'),
      ).toBeNull();
    }
    expect(queryShownList()).toBeNull();
    expect(within(section).queryByText(NOTES_EMPTY_PRIMARY)).toBeNull();

    fireEvent.click(clearButton());
    expect(noMatchTexts()).toEqual([]);
    expect(shownLinkNames()).toEqual(["Shopping list", "Ideas", "Groceries"]);
  });
});
