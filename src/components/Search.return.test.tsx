import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NOTES_HEADING } from "../copy";
import { paste } from "../test/renderApp";
import { activate, backLink, goToHash, noteLink } from "../test/renderNotes";
import {
  advance,
  searchbox,
  searchStatus,
  searchWithCBA,
  shownLinkNames,
  typeQuery,
  fakeStatusTimers,
} from "../test/renderSearch";

afterEach(() => {
  vi.useRealTimers();
});

function beforeUnloadPrevented(): boolean {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

/** Searched for "shop" with the status reading "2 notes match". */
async function searchedForShop() {
  const fixture = await searchWithCBA();
  fakeStatusTimers();
  typeQuery("shop");
  advance(500);
  expect(searchStatus().textContent).toBe("2 notes match");
  vi.useRealTimers(); // navigation helpers wait on real timers
  return fixture;
}

describe("Search notes: keeping the query", () => {
  for (const way of ["Back to notes", "hashchange"] as const) {
    it(`${way} keeps query, results, status; focus on the opened link; hidden field keeps its value (AC-15)`, async () => {
      await searchedForShop();
      await activate(noteLink("Groceries"));
      expect(
        screen.getByRole("heading", { level: 2, name: "Groceries" }),
      ).toBeInTheDocument();
      expect(searchbox().value).toBe("shop");
      expect(searchbox().closest("[hidden]")).not.toBeNull();

      if (way === "Back to notes") await activate(backLink());
      else await goToHash("");

      expect(searchbox().value).toBe("shop");
      expect(shownLinkNames()).toEqual(["Shopping list", "Groceries"]);
      expect(document.activeElement).toBe(noteLink("Groceries"));
      expect(searchStatus().textContent).toBe("2 notes match");
    });
  }

  it("back after the opened note is found gone: A only, heading focused (AC-16)", async () => {
    const { inner, C } = await searchWithCBA();
    typeQuery("shop");
    await inner.delete(C.id); // gone behind the app's back
    await activate(noteLink("Shopping list")); // get rejects with NotFoundError
    await activate(backLink());
    expect(shownLinkNames()).toEqual(["Groceries"]);
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { level: 2, name: NOTES_HEADING }),
    );
    expect(searchbox().value).toBe("shop");
  });

  it("a note filtered out of the shown list is never focused on return (D8)", async () => {
    await searchWithCBA();
    await activate(noteLink("Ideas"));
    // While B is open, a query that hides it is set on the (hidden) field.
    paste(searchbox(), "shop");
    await activate(backLink());
    expect(shownLinkNames()).toEqual(["Shopping list", "Groceries"]);
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { level: 2, name: NOTES_HEADING }),
    );
  });

  it("typing a query doesn't arm Leave site? (AC-19)", async () => {
    await searchWithCBA();
    expect(beforeUnloadPrevented()).toBe(false);
    typeQuery("shop");
    expect(beforeUnloadPrevented()).toBe(false);
  });
});
