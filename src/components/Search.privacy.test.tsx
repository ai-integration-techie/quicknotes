import { afterEach, describe, expect, it, vi } from "vitest";
import { paste, settle } from "../test/renderApp";
import { makeNote, renderAt } from "../test/renderNotes";
import { createStubRepository } from "../test/repositoryDoubles";
import { advance, searchbox, fakeStatusTimers } from "../test/renderSearch";

const METHODS = ["log", "info", "warn", "error", "debug"] as const;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Search notes: privacy", () => {
  it("no console call contains the query or note text (AC-31)", async () => {
    const spies = METHODS.map((method) =>
      vi.spyOn(console, method).mockImplementation(() => {}),
    );
    await renderAt(
      "",
      createStubRepository({
        list: () =>
          Promise.resolve([
            makeNote(1, { title: "SECRET-T", body: "SECRET-B" }),
          ]),
      }),
    );
    fakeStatusTimers();
    for (const query of ["SECRET-Q", "SECRET-T", "SECRET".repeat(1000)]) {
      paste(searchbox(), query);
      advance(600);
    }
    vi.useRealTimers();
    await settle();
    const leaked = spies.flatMap((spy) =>
      spy.mock.calls.filter((args) =>
        args.some((arg) => String(arg).includes("SECRET")),
      ),
    );
    expect(leaked).toEqual([]);
  });
});
