import { useState, useSyncExternalStore } from "react";
import { createHashNavigation, type NavSnapshot } from "./hashNavigation";

export interface Navigation extends NavSnapshot {
  backToList(): void;
}

/** The current route, one store per App instance (list-notes plan D1). */
export function useHashNavigation(): Navigation {
  const [store] = useState(() => createHashNavigation(window));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return { ...snapshot, backToList: store.backToList };
}
