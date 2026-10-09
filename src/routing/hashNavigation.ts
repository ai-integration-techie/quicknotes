/**
 * Hash navigation as a small external store (list-notes plan D1, D8). It
 * listens for `hashchange` and keeps an immutable snapshot. The app never
 * calls `pushState`, and passes only `null` as history state (R25).
 */
import { appUrl, LIST_ROUTE, parseRoute, type Route } from "./route";

export interface NavSnapshot {
  readonly route: Route;
  /** Goes up on every route change, so a new note entry remounts the view (R18). */
  readonly visit: number;
  /** True when the route shown just before this note route was the list (R24). */
  readonly cameFromList: boolean;
  /** The id of the note route just left for the list, else null (R24). */
  readonly returnedFromId: string | null;
}

/** The part of `window` the store uses (a fake in unit tests). */
export interface NavWindow {
  readonly location: Pick<Location, "hash" | "pathname" | "search">;
  readonly history: Pick<History, "back" | "replaceState">;
  addEventListener(type: "hashchange", listener: () => void): void;
  removeEventListener(type: "hashchange", listener: () => void): void;
}

export interface HashNavigation {
  subscribe(listener: () => void): () => void;
  getSnapshot(): NavSnapshot;
  /** "Back to notes" (R24): back one entry, or replace this one. */
  backToList(): void;
}

function sameRoute(a: Route, b: Route): boolean {
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

export function createHashNavigation(win: NavWindow): HashNavigation {
  let snapshot: NavSnapshot = {
    route: parseRoute(win.location.hash),
    visit: 0,
    cameFromList: false,
    returnedFromId: null,
  };
  const listeners = new Set<() => void>();

  function moveTo(route: Route): void {
    const next = nextSnapshot(snapshot, route);
    if (next === snapshot) return;
    snapshot = next;
    for (const listener of [...listeners]) listener();
  }

  function onHashChange(): void {
    moveTo(parseRoute(win.location.hash));
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
      moveTo(LIST_ROUTE); // replaceState fires no hashchange
    },
  };
}
