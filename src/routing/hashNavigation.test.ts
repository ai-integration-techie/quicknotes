import { describe, expect, it, vi } from "vitest";
import { createHashNavigation, type NavWindow } from "./hashNavigation";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";

/** An EventTarget with location and history stubs; `go(hash)` acts like a link or Back. */
function fakeWindow(initialHash = "") {
  const target = new EventTarget();
  const location = { hash: initialHash, pathname: "/quicknotes/", search: "" };
  const history = {
    back: vi.fn(),
    replaceState: vi.fn((_state: unknown, _unused: string, url: string) => {
      location.hash = new URL(url, "http://x").hash;
    }),
  };
  const win: NavWindow = {
    location,
    history,
    addEventListener: (type, listener) =>
      target.addEventListener(type, listener),
    removeEventListener: (type, listener) =>
      target.removeEventListener(type, listener),
  };
  function go(hash: string) {
    location.hash = hash;
    target.dispatchEvent(new Event("hashchange"));
  }
  return { win, history, go };
}

describe("hash navigation store", () => {
  it("reads the route on creation", () => {
    const { win } = fakeWindow(`#note/${A}`);
    const nav = createHashNavigation(win);
    expect(nav.getSnapshot()).toEqual({
      route: { kind: "note", id: A, valid: true },
      visit: 0,
      cameFromList: false,
      returnedFromId: null,
    });
  });

  it("returnedFromId and cameFromList (R24)", () => {
    const { win, go } = fakeWindow();
    const nav = createHashNavigation(win);
    const listener = vi.fn();
    nav.subscribe(listener);

    go(`#note/${A}`);
    expect(nav.getSnapshot()).toMatchObject({
      visit: 1,
      cameFromList: true,
      returnedFromId: null,
    });

    go(`#note/${B}`);
    expect(nav.getSnapshot()).toMatchObject({
      route: { kind: "note", id: B },
      visit: 2,
      cameFromList: false,
    });

    go("");
    expect(nav.getSnapshot()).toMatchObject({
      route: { kind: "list" },
      visit: 3,
      cameFromList: false,
      returnedFromId: B,
    });

    go("#elsewhere"); // still the list view: no change
    expect(nav.getSnapshot().visit).toBe(3);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("backToList goes back when the note was opened from the list", () => {
    const { win, history, go } = fakeWindow();
    const nav = createHashNavigation(win);
    nav.subscribe(() => {});
    go(`#note/${A}`);
    nav.backToList();
    expect(history.back).toHaveBeenCalledTimes(1);
    expect(history.replaceState).not.toHaveBeenCalled();
  });

  it("backToList replaces the entry when the page loaded at the note route", () => {
    const { win, history } = fakeWindow(`#note/${A}`);
    const nav = createHashNavigation(win);
    nav.subscribe(() => {});
    nav.backToList();
    expect(history.back).not.toHaveBeenCalled();
    expect(history.replaceState).toHaveBeenCalledWith(null, "", "/quicknotes/");
    expect(nav.getSnapshot()).toMatchObject({
      route: { kind: "list" },
      visit: 1,
      returnedFromId: A,
    });
  });

  it("unsubscribing the last listener stops listening", () => {
    const { win, go } = fakeWindow();
    const nav = createHashNavigation(win);
    const unsubscribe = nav.subscribe(() => {});
    unsubscribe();
    go(`#note/${A}`);
    expect(nav.getSnapshot().visit).toBe(0);
  });

  it("subscribing picks up a hash change made before it", () => {
    const { win } = fakeWindow();
    const nav = createHashNavigation(win);
    win.location.hash = `#note/${A}`;
    nav.subscribe(() => {});
    expect(nav.getSnapshot().route).toMatchObject({ kind: "note", id: A });
  });
});
