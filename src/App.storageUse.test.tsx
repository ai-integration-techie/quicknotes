import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { StorageUnavailableError } from "./storage";
import { clickSave, paste, renderApp, settle } from "./test/renderApp";
import { activate, backLink, makeNote, noteLink } from "./test/renderNotes";
import { createStubRepository } from "./test/repositoryDoubles";

describe("storage use", () => {
  it("the UI calls list once, create per save, get per open, and never update, delete or isPersisted (AC-53)", async () => {
    const A = makeNote(1, { title: "A" });
    const repository = createStubRepository({
      list: () => Promise.resolve([A]),
      get: () => Promise.resolve(A),
      create: (input) => Promise.resolve(makeNote(2, { ...input })),
    });
    const counts = () => ({
      create: repository.create.mock.calls.length,
      get: repository.get.mock.calls.length,
      update: repository.update.mock.calls.length,
      delete: repository.delete.mock.calls.length,
      list: repository.list.mock.calls.length,
      isPersisted: repository.isPersisted.mock.calls.length,
    });
    const none = { create: 0, get: 0, update: 0, delete: 0, isPersisted: 0 };

    const app = renderApp(repository);
    await settle();
    expect(counts()).toEqual({ ...none, list: 1 });

    paste(app.title, "Typed");
    paste(app.note, "Text");
    expect(counts()).toEqual({ ...none, list: 1 });

    await clickSave(app);
    expect(counts()).toEqual({ ...none, list: 1, create: 1 });

    await activate(noteLink("A"));
    expect(screen.getByRole("heading", { level: 2, name: "A" })).toBeVisible();
    expect(counts()).toEqual({ ...none, list: 1, create: 1, get: 1 });
    expect(repository.get).toHaveBeenCalledWith(A.id);

    await activate(backLink());
    expect(counts()).toEqual({ ...none, list: 1, create: 1, get: 1 });
  });

  it("no console call contains note text across load, open and failures (AC-56)", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map(
      (method) => vi.spyOn(console, method),
    );
    const secret = makeNote(1, { title: "SECRET-T", body: "SECRET-B" });

    render(
      <App
        repository={createStubRepository({
          list: () => Promise.resolve([secret]),
          get: () => Promise.resolve(secret),
        })}
      />,
    );
    await settle();
    await activate(noteLink("SECRET-T"));
    expect(document.querySelector("[data-note-body]")?.textContent).toBe(
      "SECRET-B",
    );
    await activate(backLink());
    cleanup();
    history.replaceState(null, "", "/");

    render(
      <App
        repository={createStubRepository({
          list: () => Promise.resolve([secret]),
          get: () => Promise.reject(new StorageUnavailableError()),
        })}
      />,
    );
    await settle();
    await activate(noteLink("SECRET-T"));
    await activate(backLink());
    cleanup();
    history.replaceState(null, "", "/");

    render(
      <App
        repository={createStubRepository({
          list: () => Promise.reject(new Error("x")),
        })}
      />,
    );
    await settle();

    const calls = spies.flatMap((spy) => spy.mock.calls);
    const leaked = calls.filter((args) =>
      args.some((arg) => {
        try {
          return (
            String(arg).includes("SECRET") ||
            JSON.stringify(arg)?.includes("SECRET")
          );
        } catch {
          return String(arg).includes("SECRET");
        }
      }),
    );
    expect(leaked).toEqual([]);
  });
});
