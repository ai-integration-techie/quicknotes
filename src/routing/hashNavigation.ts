/**
 * Hash navigation as a small external store (list-notes plan D1, D8). It
 * listens for `hashchange` and keeps an immutable snapshot. The app never
 * calls `pushState`, and passes only `null` as history state (R25).
 *
 * edit-delete-note plan D7 adds a route guard: while a guard holds, a
 * route change is "held" instead of shown, and can then be released
 * (shown as normal) or restored (the URL is put back without new history).
 */
import { appUrl, LIST_ROUTE, noteHref, parseRoute, type Route } from "./route";

/** A route change the guard is holding (edit-delete-note R12, R20). */
export interface HeldRoute {
  readonly route: Route;
  /** True when history grew since the current route was entered (a typed URL or an assigned hash). */
  readonly grew: boolean;
}

export interface NavSnapshot {
  readonly route: Route;
  /** Goes up on every route change, so a new note entry remounts the view (R18). */
  readonly visit: number;
  /** True when the route shown just before this note route was the list (R24). */
  readonly cameFromList: boolean;
  /** The id of the note route just left for the list, else null (R24). */
  readonly returnedFromId: string | null;
  /** The held route change; absent when nothing is held. */
  readonly held?: HeldRoute;
}

/** The part of `window` the store uses (a fake in unit tests). */
export interface NavWindow {
  readonly location: Pick<Location, "hash" | "pathname" | "search">;
  readonly history: Pick<
    History,
    "back" | "forward" | "replaceState" | "length"
  >;
  /** The Navigation API, where the browser has it: its entry index tells Back from Forward. */
  readonly navigation?: {
    readonly currentEntry: { readonly index: number } | null;
  };
  addEventListener(type: "hashchange", listener: () => void): void;
  removeEventListener(type: "hashchange", listener: () => void): void;
}

/** `true` means "hold this route change". */
export type RouteGuard = (to: Route) => boolean;

export interface HashNavigation {
  subscribe(listener: () => void): () => void;
  getSnapshot(): NavSnapshot;
  /** "Back to notes" (R24): back one entry, or replace this one. */
  backToList(): void;
  /** Installs (or, with null, removes) the route guard. */
  setGuard(guard: RouteGuard | null): void;
  /** "Discard changes": shows the held route as an unguarded change would. */
  releaseHeld(): void;
  /** "Keep editing": puts the current route's URL back without new history. */
  restoreHeld(): void;
}

export function sameRoute(a: Route, b: Route): boolean {
  if (a.kind === "list" || b.kind === "list") return a.kind === b.kind;
  return a.id === b.id;
}

/** The snapshot after moving from `previous` to `route`. */
export function nextSnapshot(previous: NavSnapshot, route: Route): NavSnapshot {
  if (sameRoute(previous.route, route)) return previous;
  const from = previous.route;
  return {
    route,
    visit: previous.visit + 1,
    cameFromList: route.kind === "note" && from.kind === "list",
    returnedFromId:
      route.kind === "list" && from.kind === "note" ? from.id : null,
  };
}

/**
 * The store's own model of the history entries it has seen, so "Keep
 * editing" knows whether the held route is the entry before or after.
 */
interface Entries {
  readonly routes: readonly Route[];
  readonly index: number;
}

/** Where a `hashchange` moved within the entries. */
interface Move {
  readonly entries: Entries;
  /** Entries moved from the starting one (-1 Back, 1 Forward); null when a new entry was added or the move is unknown. */
  readonly delta: number | null;
}

/**
 * The move for a `hashchange` to `route`: a traversal if it matches a
 * neighbour, else a new entry. `step` is the change in the browser's own
 * entry index when it reports one (the Navigation API); it settles which
 * neighbour when both match the route (review F5). Without it, the entry
 * before wins, so a wrong guess restores with `forward()`, which can't
 * leave the app.
 */
function entriesAfter(
  entries: Entries,
  route: Route,
  step: number | null,
): Move {
  const { routes, index } = entries;
  const before = routes[index - 1];
  const after = routes[index + 1];
  if (before && sameRoute(before, route) && (step === null || step === -1)) {
    return { entries: { routes, index: index - 1 }, delta: -1 };
  }
  if (after && sameRoute(after, route) && (step === null || step === 1)) {
    return { entries: { routes, index: index + 1 }, delta: 1 };
  }
  return {
    entries: {
      routes: [...routes.slice(0, index + 1), route],
      index: index + 1,
    },
    delta: null,
  };
}

/** `move` followed by the next change to `route`, with the deltas summed. */
function moveOn(move: Move, route: Route, step: number | null): Move {
  const next = entriesAfter(move.entries, route, step);
  const delta =
    move.delta === null || next.delta === null ? null : move.delta + next.delta;
  return { entries: next.entries, delta };
}

function replaced(entries: Entries, route: Route): Entries {
  const routes = entries.routes.map((entry, i) =>
    i === entries.index ? route : entry,
  );
  return { routes, index: entries.index };
}

/** The browser's index of the current entry, when the Navigation API reports it. */
function navIndex(win: NavWindow): number | null {
  const index = win.navigation?.currentEntry?.index;
  return typeof index === "number" && index >= 0 ? index : null;
}

export function createHashNavigation(win: NavWindow): HashNavigation {
  const initial = parseRoute(win.location.hash);
  let snapshot: NavSnapshot = {
    route: initial,
    visit: 0,
    cameFromList: false,
    returnedFromId: null,
  };
  let entries: Entries = { routes: [initial], index: 0 };
  /** Where the held change moved; its entries are as they will be if it is released. */
  let heldMove: Move | null = null;
  /** `history.length` when the current route was entered. */
  let enteredLength = win.history.length;
  /** The browser's entry index at the last `hashchange`, when known. */
  let lastIndex = navIndex(win);
  let guard: RouteGuard | null = null;
  const listeners = new Set<() => void>();

  function publish(next: NavSnapshot): void {
    snapshot = next;
    for (const listener of [...listeners]) listener();
  }

  function moveTo(route: Route, nextEntries: Entries): void {
    const next = nextSnapshot(snapshot, route);
    heldMove = null;
    entries = nextEntries;
    if (next === snapshot) return;
    enteredLength = win.history.length;
    publish(next);
  }

  function withoutHeld(current: NavSnapshot): NavSnapshot {
    return {
      route: current.route,
      visit: current.visit,
      cameFromList: current.cameFromList,
      returnedFromId: current.returnedFromId,
    };
  }

  /** Back on the current entry: keep any entries the held change added after it (R20). */
  function keepLaterEntries(move: Move | null): void {
    const routes = move?.entries.routes;
    const own = routes?.[entries.index];
    if (routes && own && sameRoute(own, snapshot.route)) {
      entries = { routes, index: entries.index };
    }
  }

  function hold(route: Route, step: number | null): void {
    heldMove = moveOn(heldMove ?? { entries, delta: 0 }, route, step);
    publish({
      ...snapshot,
      held: { route, grew: win.history.length > enteredLength },
    });
  }

  /** The change in the browser's entry index since the last `hashchange`, when known. */
  function stepTaken(): number | null {
    const index = navIndex(win);
    const step =
      index !== null && lastIndex !== null ? index - lastIndex : null;
    lastIndex = index;
    return step;
  }

  function onHashChange(): void {
    const step = stepTaken();
    const route = parseRoute(win.location.hash);
    const held = snapshot.held;
    if (sameRoute(route, snapshot.route)) {
      // Back on the current route: a held change closes as "Keep editing".
      if (held) {
        keepLaterEntries(heldMove);
        heldMove = null;
        enteredLength = win.history.length; // later entries may persist (R20)
        publish(withoutHeld(snapshot));
      }
      return;
    }
    if (held || guard?.(route)) {
      hold(route, step);
      return;
    }
    moveTo(route, entriesAfter(entries, route, step).entries);
  }

  return {
    subscribe(listener) {
      if (listeners.size === 0) {
        win.addEventListener("hashchange", onHashChange);
      }
      listeners.add(listener);
      // The hash may have changed between creating the store and subscribing.
      onHashChange();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          win.removeEventListener("hashchange", onHashChange);
        }
      };
    },
    getSnapshot() {
      return snapshot;
    },
    backToList() {
      if (snapshot.route.kind !== "note") return;
      if (snapshot.cameFromList) {
        win.history.back(); // its hashchange moves the store
        return;
      }
      win.history.replaceState(null, "", appUrl(win.location));
      moveTo(LIST_ROUTE, replaced(entries, LIST_ROUTE)); // replaceState fires no hashchange
    },
    setGuard(next) {
      guard = next;
    },
    releaseHeld() {
      const held = snapshot.held;
      if (!held) return;
      const move = heldMove ?? entriesAfter(entries, held.route, null);
      moveTo(held.route, move.entries);
    },
    restoreHeld() {
      const held = snapshot.held;
      if (!held) return;
      const current = snapshot.route;
      const move = heldMove;
      heldMove = null;
      publish(withoutHeld(snapshot));
      // Which way the held change went, from the note's own entry (review F5).
      const delta = move?.delta ?? null;
      if (held.grew || delta === 1) {
        // A new entry (typed URL, assigned hash) or the Forward button: back
        // onto the current entry; the held entry stays as the next one.
        keepLaterEntries(move);
        win.history.back();
      } else if (delta === -1) {
        keepLaterEntries(move);
        win.history.forward(); // the held change was the Back button
      } else if (current.kind === "note") {
        // Unknown entry: put the URL back in place (plan risk R2).
        win.history.replaceState(null, "", noteHref(current.id));
      }
      // Restoring adds no entry: measure growth from here (R20).
      enteredLength = win.history.length;
    },
  };
}
