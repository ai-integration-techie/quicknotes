import { useState, useSyncExternalStore } from "react";
import {
  createHashNavigation,
  type HashNavigation,
  type HeldRoute,
  type NavSnapshot,
} from "./hashNavigation";

export interface Navigation extends Omit<NavSnapshot, "held"> {
  /** The route change a guard is holding, else null (edit-delete-note D7). */
  readonly held: HeldRoute | null;
  backToList(): void;
  setGuard: HashNavigation["setGuard"];
  releaseHeld(): void;
  restoreHeld(): void;
}

/** The current route, one store per App instance (list-notes plan D1). */
export function useHashNavigation(): Navigation {
  const [store] = useState(() => createHashNavigation(window));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return {
    route: snapshot.route,
    visit: snapshot.visit,
    cameFromList: snapshot.cameFromList,
    returnedFromId: snapshot.returnedFromId,
    held: snapshot.held ?? null,
    backToList: store.backToList,
    setGuard: store.setGuard,
    releaseHeld: store.releaseHeld,
    restoreHeld: store.restoreHeld,
  };
}
