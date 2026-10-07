/**
 * Test doubles for the note repositories (note-storage plan D3, D4).
 * Test support only: no production module may import this folder (AC-53).
 */
import { IDBFactory } from "fake-indexeddb";
import { type Mock, vi } from "vitest";
import type { StorageManagerLike } from "../notes/note";

export interface FixedClock {
  (): number;
  set(ms: number): void;
}

/** A clock that returns `start` until the test moves it with `set`. */
export function createFixedClock(start: number): FixedClock {
  let current = start;
  return Object.assign(() => current, {
    set(ms: number) {
      current = ms;
    },
  });
}

/** An id generator returning the given ids in order; throws when exhausted. */
export function sequentialIds(...ids: string[]): () => string {
  let next = 0;
  return () => {
    const id = ids[next];
    if (id === undefined) throw new Error("sequentialIds: no ids left");
    next += 1;
    return id;
  };
}

/** `id(n)` gives `"00000000-0000-4000-8000-" + n padded to 12 digits`. */
export function fixedId(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

export type StubBehaviour =
  "true" | "false" | "pending" | "reject" | "throw" | "missing";

type StorageMethod = Mock<() => Promise<boolean>>;

export interface StubStorage extends StorageManagerLike {
  persisted?: StorageMethod;
  persist?: StorageMethod;
}

function stubMethod(behaviour: StubBehaviour): StorageMethod | undefined {
  switch (behaviour) {
    case "true":
      return vi.fn(() => Promise.resolve(true));
    case "false":
      return vi.fn(() => Promise.resolve(false));
    case "pending":
      return vi.fn(() => new Promise<boolean>(() => {}));
    case "reject":
      return vi.fn(() => Promise.reject(new Error("stub rejection")));
    case "throw":
      return vi.fn(() => {
        throw new Error("stub throw");
      });
    case "missing":
      return undefined;
  }
}

/** A storage manager whose `persisted` and `persist` are spies (default: both resolve false). */
export function createStubStorage(
  behaviour: { persisted?: StubBehaviour; persist?: StubBehaviour } = {},
): StubStorage {
  const persisted = stubMethod(behaviour.persisted ?? "false");
  const persist = stubMethod(behaviour.persist ?? "false");
  return {
    ...(persisted ? { persisted } : {}),
    ...(persist ? { persist } : {}),
  };
}

/**
 * Installs `stub` as `navigator.storage` (jsdom has none). Returns the
 * function that removes it again.
 */
export function installNavigatorStorage(stub: StorageManagerLike): () => void {
  Object.defineProperty(navigator, "storage", {
    configurable: true,
    value: stub,
  });
  return () => {
    Reflect.deleteProperty(navigator, "storage");
  };
}

/** A new, empty in-process database factory. */
export function freshFactory(): IDBFactory {
  return new IDBFactory();
}

/** Spies on (and passes through) the factory's `open`. */
export function spyOnOpen(factory: IDBFactory) {
  return vi.spyOn(factory, "open");
}

/** Lets pending microtasks and macrotasks run. */
export function flushTasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Opens `name` directly on `factory` (current version unless given), for inspection. */
export function openDirect(
  factory: IDBFactory,
  name = "quicknotes",
  version?: number,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request =
      version === undefined ? factory.open(name) : factory.open(name, version);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("openDirect: blocked"));
  });
}

/** Resolves an IDBRequest's result. */
export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
