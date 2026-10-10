import { describe, expect, it, vi } from "vitest";
import { createHashNavigation, type NavWindow } from "./hashNavigation";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";

/** An EventTarget with location and history stubs; `go(hash)` acts like a link or Back. */
function fakeWindow(initialHash = "") {
  const target = new EventTarget();
  const location = { hash: initialHash, pathname: "/quicknotes/", search: "" };
  const history = {
    length: 1,
    back: vi.fn(),
    forward: vi.fn(),
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

/**
 * A window whose history is a real stack of same-document entries, with the
 * Navigation API's entry index, like Chromium. Traversals are queued and
 * fire `hashchange` on `settle()`, as browsers fire it asynchronously.
 */
function browserWindow(initialHash = "") {
  const target = new EventTarget();
  const location = { hash: initialHash, pathname: "/quicknotes/", search: "" };
  let stack = [initialHash];
  let index = 0;
  let queued: number[] = [];
  function show(next: number) {
    index = next;
    const changed = location.hash !== stack[index];
    location.hash = stack[index] ?? "";
    if (changed) target.dispatchEvent(new Event("hashchange"));
  }
  const history = {
    get length() {
      return stack.length;
    },
    back: vi.fn(() => {
      queued = [...queued, -1];
    }),
    forward: vi.fn(() => {
      queued = [...queued, 1];
    }),
    pushState: vi.fn(),
    replaceState: vi.fn((_state: unknown, _unused: string, url: string) => {
      const hash = new URL(url, "http://x").hash;
      stack = stack.map((entry, i) => (i === index ? hash : entry));
      location.hash = hash;
    }),
  };
  const win: NavWindow = {
    location,
    history,
    navigation: {
      get currentEntry() {
        return { index };
      },
    },
    addEventListener: (type, listener) =>
      target.addEventListener(type, listener),
    removeEventListener: (type, listener) =>
      target.removeEventListener(type, listener),
  };
  /** Runs the queued back()/forward() calls; one past either end does nothing. */
  function settle() {
    const steps = queued;
    queued = [];
    for (const step of steps) {
      const next = index + step;
      if (next >= 0 && next < stack.length) show(next);
    }
  }
  /** A link click, an assigned hash or a typed URL: a new entry. */
  function visit(hash: string) {
    stack = [...stack.slice(0, index + 1), hash];
    show(index + 1);
  }
  const user = {
    back() {
      history.back();
      settle();
    },
    forward() {
      history.forward();
      settle();
    },
  };
  return { win, history, settle, visit, user, hash: () => location.hash };
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

  describe("route guard (edit-delete-note D7)", () => {
    /** Note A opened from the list: list entry, then A's entry (length 2). */
    function openedFromList() {
      const fake = fakeWindow();
      const nav = createHashNavigation(fake.win);
      const listener = vi.fn();
      nav.subscribe(listener);
      fake.history.length = 2;
      fake.go(`#note/${A}`);
      return { ...fake, nav, listener };
    }

    it("guard holds a route and releaseHeld commits it (D7)", () => {
      const { nav, go } = openedFromList();
      const guard = vi.fn(() => true);
      nav.setGuard(guard);

      go(""); // the Back button
      expect(guard).toHaveBeenCalledWith({ kind: "list" });
      expect(nav.getSnapshot()).toMatchObject({
        route: { kind: "note", id: A },
        visit: 1,
        held: { route: { kind: "list" }, grew: false },
      });

      nav.releaseHeld();
      expect(nav.getSnapshot()).toEqual({
        route: { kind: "list" },
        visit: 2,
        cameFromList: false,
        returnedFromId: A,
      });
    });

    it("a guard that returns false lets the route change through", () => {
      const { nav, go } = openedFromList();
      nav.setGuard(() => false);
      go("");
      expect(nav.getSnapshot().route).toEqual({ kind: "list" });
      expect(nav.getSnapshot().held).toBeUndefined();
    });

    it("returning to the current route clears the held change; another route replaces it", () => {
      const { nav, go, history } = openedFromList();
      nav.setGuard(() => true);
      go("");
      history.length = 3;
      go(`#note/${B}`);
      expect(nav.getSnapshot().held).toEqual({
        route: { kind: "note", id: B, valid: true },
        grew: true,
      });
      go(`#note/${A}`);
      expect(nav.getSnapshot().held).toBeUndefined();
      expect(nav.getSnapshot().visit).toBe(1);
    });

    it("setGuard(null) removes the guard", () => {
      const { nav, go } = openedFromList();
      nav.setGuard(() => true);
      nav.setGuard(null);
      go("");
      expect(nav.getSnapshot().route).toEqual({ kind: "list" });
    });

    describe("restoreHeld branches (D7)", () => {
      it("grew → back", () => {
        const { nav, go, history } = openedFromList();
        nav.setGuard(() => true);
        history.length = 3; // an assigned hash adds an entry
        go("");
        nav.restoreHeld();
        expect(history.back).toHaveBeenCalledTimes(1);
        expect(history.forward).not.toHaveBeenCalled();
        expect(history.replaceState).not.toHaveBeenCalled();
        expect(nav.getSnapshot().held).toBeUndefined();
        expect(nav.getSnapshot().visit).toBe(1);
      });

      it("the previous route (the Back button) → forward", () => {
        const { nav, go, history } = openedFromList();
        nav.setGuard(() => true);
        go("");
        nav.restoreHeld();
        expect(history.forward).toHaveBeenCalledTimes(1);
        expect(history.back).not.toHaveBeenCalled();
        expect(history.replaceState).not.toHaveBeenCalled();
      });

      it("the next route (the Forward button) → back", () => {
        const { nav, go, history } = openedFromList();
        go(`#note/${B}`); // A → B as a new entry
        go(`#note/${A}`); // Back to A
        nav.setGuard(() => true);
        go(`#note/${B}`); // Forward to B
        nav.restoreHeld();
        expect(history.back).toHaveBeenCalledTimes(1);
        expect(history.forward).not.toHaveBeenCalled();
      });

      it("an unknown entry → replaceState(null, …) with the note's hash", () => {
        const { win, history, go } = fakeWindow(`#note/${A}`);
        const nav = createHashNavigation(win);
        nav.subscribe(() => {});
        nav.setGuard(() => true);
        go(""); // a Back to an entry the store never saw
        nav.restoreHeld();
        expect(history.back).not.toHaveBeenCalled();
        expect(history.forward).not.toHaveBeenCalled();
        expect(history.replaceState).toHaveBeenCalledWith(
          null,
          "",
          `#note/${A}`,
        );
        expect(nav.getSnapshot().held).toBeUndefined();
      });
    });

    it("a typed URL, Keep editing, then the Back button restores with forward, not back (review F1)", () => {
      const { nav, go, history } = openedFromList();
      nav.setGuard(() => true);
      history.length = 3; // typing the list URL adds an entry
      go("");
      expect(nav.getSnapshot().held).toMatchObject({ grew: true });
      nav.restoreHeld();
      expect(history.back).toHaveBeenCalledTimes(1);
      go(`#note/${A}`); // the back() lands on the note entry

      go(""); // the Back button: no new entry
      expect(nav.getSnapshot().held).toEqual({
        route: { kind: "list" },
        grew: false,
      });
      nav.restoreHeld();
      expect(history.forward).toHaveBeenCalledTimes(1);
      expect(history.back).toHaveBeenCalledTimes(1);
      expect(history.replaceState).not.toHaveBeenCalled();
      go(`#note/${A}`);
      expect(nav.getSnapshot()).toMatchObject({
        route: { kind: "note", id: A },
        visit: 1,
      });
      expect(nav.getSnapshot().held).toBeUndefined();

      go(`#note/${B}`); // then Forward, onto the typed entry's neighbour
      expect(nav.getSnapshot().held).toMatchObject({ grew: false });
    });

    it("returning to the note by itself also resets the growth baseline", () => {
      const { nav, go, history } = openedFromList();
      nav.setGuard(() => true);
      history.length = 3;
      go("");
      go(`#note/${A}`); // the user went Back to the note themselves
      go(""); // Forward again: no new entry
      expect(nav.getSnapshot().held).toMatchObject({ grew: false });
    });

    describe("Keep editing always puts the note URL back (review F5)", () => {
      type Step = "type list URL" | "Back" | "Forward";

      /**
       * Note A opened from the list and edited (guard on). `forwardEntry`
       * adds a later entry first: B opened from A, then Back to A.
       */
      function editing(forwardEntry: boolean) {
        const fake = browserWindow();
        const nav = createHashNavigation(fake.win);
        nav.subscribe(() => {});
        fake.visit(`#note/${A}`);
        if (forwardEntry) {
          fake.visit(`#note/${B}`);
          fake.user.back();
        }
        nav.setGuard(() => true);
        return { ...fake, nav };
      }

      /** One held change then "Keep editing"; each must end on A with nothing held. */
      function keepEditingAfter(fake: ReturnType<typeof editing>, step: Step) {
        const { nav, user, visit, settle, history } = fake;
        const shown = nav.getSnapshot().visit;
        if (step === "type list URL") visit("");
        else if (step === "Back") user.back();
        else user.forward();
        expect(fake.hash(), `${step} moved the URL`).toBe("");
        expect(nav.getSnapshot().held?.route).toEqual({ kind: "list" });
        const heldLength = history.length;
        nav.restoreHeld();
        settle();
        expect(fake.hash(), `Keep editing after ${step}`).toBe(`#note/${A}`);
        expect(nav.getSnapshot().held).toBeUndefined();
        expect(nav.getSnapshot()).toMatchObject({
          route: { kind: "note", id: A },
          visit: shown,
        });
        expect(history.length).toBe(heldLength);
      }

      const sequences: readonly (readonly Step[])[] = [
        ["type list URL", "Forward"],
        ["type list URL", "Back", "Forward"],
        ["type list URL", "Forward", "Back"],
        ["type list URL", "Forward", "Forward", "Back", "Back"],
        ["type list URL", "type list URL", "Forward", "Back"],
        ["Back", "Back"],
        ["Back", "type list URL", "Forward", "Back"],
      ];

      for (const steps of sequences) {
        it(`${steps.join(" → Keep editing → ")} → Keep editing`, () => {
          const fake = editing(false);
          for (const step of steps) keepEditingAfter(fake, step);
          expect(fake.history.pushState).not.toHaveBeenCalled();
          expect(fake.history.replaceState).not.toHaveBeenCalled();
        });
      }

      it("with a later entry: Back → Keep editing → Forward → Keep editing, and Forward then Back", () => {
        const fake = editing(true);
        const { nav, user, settle, history } = fake;
        const lengthBefore = history.length;
        keepEditingAfter(fake, "Back");
        user.forward(); // onto B's entry
        expect(nav.getSnapshot().held?.route).toMatchObject({ id: B });
        nav.restoreHeld();
        settle();
        expect(fake.hash()).toBe(`#note/${A}`);
        expect(nav.getSnapshot().held).toBeUndefined();
        keepEditingAfter(fake, "Back");
        expect(history.length).toBe(lengthBefore);
        expect(history.pushState).not.toHaveBeenCalled();
        expect(history.replaceState).not.toHaveBeenCalled();
      });

      it("held Forward, then Back to the note by itself, then Forward → Keep editing", () => {
        const fake = editing(false);
        const { nav, user, visit, history } = fake;
        keepEditingAfter(fake, "type list URL");
        user.forward(); // onto the typed entry: held
        user.back(); // the user goes back to the note themselves
        expect(fake.hash()).toBe(`#note/${A}`);
        expect(nav.getSnapshot().held).toBeUndefined();
        keepEditingAfter(fake, "Forward");
        keepEditingAfter(fake, "Back");
        visit(`#note/${B}`); // then a held link still releases as normal
        nav.releaseHeld();
        expect(nav.getSnapshot().route).toMatchObject({ id: B });
        expect(history.pushState).not.toHaveBeenCalled();
        expect(history.replaceState).not.toHaveBeenCalled();
      });

      it("without the Navigation API, Back → Keep editing still restores with forward()", () => {
        const { win, history, visit, user, settle, hash } = browserWindow();
        const nav = createHashNavigation({ ...win, navigation: undefined });
        nav.subscribe(() => {});
        visit(`#note/${A}`);
        nav.setGuard(() => true);
        user.back();
        nav.restoreHeld();
        settle();
        expect(history.forward).toHaveBeenCalledTimes(1);
        expect(hash()).toBe(`#note/${A}`);
        expect(nav.getSnapshot().held).toBeUndefined();
      });
    });

    it("releaseHeld and restoreHeld do nothing when nothing is held", () => {
      const { nav, history } = openedFromList();
      const before = nav.getSnapshot();
      nav.releaseHeld();
      nav.restoreHeld();
      expect(nav.getSnapshot()).toBe(before);
      expect(history.back).not.toHaveBeenCalled();
    });
  });
});
