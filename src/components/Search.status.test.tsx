import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { LIST_FAILED } from "../copy";
import type { Note } from "../storage";
import {
  clickSave,
  paste,
  renderApp,
  settle,
  typeInto,
} from "../test/renderApp";
import { textSequence } from "../test/renderEdit";
import {
  activate,
  backLink,
  makeNote,
  noteLink,
  notesSection,
} from "../test/renderNotes";
import {
  advance,
  clearButton,
  querySearchStatus,
  searchbox,
  searchStatus,
  searchWithCBA,
  typeQuery,
  fakeStatusTimers,
} from "../test/renderSearch";
import { createStubRepository } from "../test/repositoryDoubles";

afterEach(() => {
  vi.useRealTimers();
});

function alertText(): string {
  return within(notesSection()).getByRole("alert").textContent ?? "";
}

describe("Search notes: the status", () => {
  it("count after 500 ms, restarted by each change, copy for 1 / n / none / 1,000, emptied at once on clear (AC-14)", async () => {
    await searchWithCBA();
    fakeStatusTimers();
    expect(searchStatus()).toHaveAttribute("role", "status");
    expect(searchStatus().textContent).toBe("");

    typeQuery("shop");
    expect(searchStatus().textContent).toBe("");
    advance(499);
    expect(searchStatus().textContent).toBe("");
    advance(1);
    expect(searchStatus().textContent).toBe("2 notes match");

    fireEvent.click(clearButton());
    expect(searchStatus().textContent).toBe("");
    typeInto(searchbox(), "s");
    advance(400);
    typeInto(searchbox(), "h");
    advance(400);
    expect(searchStatus().textContent).toBe("");
    advance(100);
    expect(searchStatus().textContent).toBe("2 notes match");

    paste(searchbox(), "ideas");
    advance(500);
    expect(searchStatus().textContent).toBe("1 note matches");
    paste(searchbox(), "zebra");
    advance(500);
    expect(searchStatus().textContent).toBe("No notes match");

    fireEvent.click(clearButton());
    expect(searchStatus().textContent).toBe("");
    advance(1000);
    expect(searchStatus().textContent).toBe("");
    vi.useRealTimers();
    cleanup();

    const thousand = Array.from({ length: 1000 }, (_, i) =>
      makeNote(i + 1, { title: `Note ${i}`, updatedAt: 2000 - i }),
    );
    render(
      <App
        repository={createStubRepository({
          list: () => Promise.resolve(thousand),
        })}
      />,
    );
    await settle();
    fakeStatusTimers();
    typeQuery("note");
    advance(500);
    expect(searchStatus().textContent).toBe("1,000 notes match");
  });

  it("with a blank query the search status never has text; the alert only on load failure (AC-17)", async () => {
    // Pending: no search status region at all, and an empty alert.
    renderApp(createStubRepository());
    await settle();
    expect(querySearchStatus()).toBeNull();
    expect(alertText()).toBe("");
    cleanup();

    // Resolved empty: still no search status; failure: alert only.
    for (const [list, alert] of [
      [() => Promise.resolve([] as Note[]), ""],
      [() => Promise.reject(new Error("boom")), LIST_FAILED],
    ] as const) {
      render(<App repository={createStubRepository({ list })} />);
      await settle();
      expect(querySearchStatus()).toBeNull();
      expect(alertText()).toBe(alert);
      cleanup();
    }

    // Resolved non-empty, a save, opening a note and going back.
    const N = makeNote(9, { title: "Nine" });
    const app = renderApp(
      createStubRepository({
        list: () => Promise.resolve([N]),
        get: () => Promise.resolve(N),
      }),
    );
    await settle();
    const region = searchStatus();
    const seen = textSequence(region);
    expect(region.textContent).toBe("");
    paste(app.title, "Saved");
    await clickSave(app);
    await new Promise((resolve) => setTimeout(resolve, 600));
    await activate(noteLink("Nine"));
    await activate(backLink());
    await new Promise((resolve) => setTimeout(resolve, 600));
    seen.stop();
    expect(searchStatus()).toBe(region);
    expect(region.textContent).toBe("");
    expect(seen.texts.filter((text) => text !== "")).toEqual([]);
    expect(alertText()).toBe("");
  });
});
