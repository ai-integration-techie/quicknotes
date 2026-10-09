/**
 * Repository doubles for the create-note component tests (plan D1).
 * Test support only: no production module may import this folder (AC-53).
 */
import { type Mock, vi } from "vitest";
import type { Note, NoteInput, NoteRepository } from "../storage";
import { fixedId } from "./fakes";

export interface SpyRepository extends NoteRepository {
  create: Mock<(input: NoteInput) => Promise<Note>>;
  get: Mock<(id: string) => Promise<Note>>;
  update: Mock<(id: string, input: NoteInput) => Promise<Note>>;
  delete: Mock<(id: string) => Promise<void>>;
  list: Mock<() => Promise<Note[]>>;
  isPersisted: Mock<() => Promise<boolean>>;
}

function savedNote(input: NoteInput): Note {
  return {
    id: fixedId(1),
    title: input.title,
    body: input.body,
    createdAt: 0,
    updatedAt: 0,
  };
}

function unused(name: string): () => Promise<never> {
  return () => Promise.reject(new Error(`${name} must not be called`));
}

/**
 * A repository whose every method is a spy. `create` resolves a note
 * unless `create` is given; the other methods reject if ever called.
 */
export function createStubRepository(
  options: { create?: (input: NoteInput) => Promise<Note> } = {},
): SpyRepository {
  return {
    create: vi.fn(
      options.create ??
        ((input: NoteInput) => Promise.resolve(savedNote(input))),
    ),
    get: vi.fn(unused("get")),
    update: vi.fn(unused("update")),
    delete: vi.fn(unused("delete")),
    list: vi.fn(unused("list")),
    isPersisted: vi.fn(unused("isPersisted")),
  };
}

/** Every method a spy; `create` resolves a note (AC-37). */
export function createSpyRepository(): SpyRepository {
  return createStubRepository();
}

/** A repository whose `create` rejects with `value` every time. */
export function rejectingWith(value: unknown): SpyRepository {
  return createStubRepository({ create: () => Promise.reject(value) });
}

export interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
  reject(reason: unknown): void;
}

/** A promise the test settles by hand. */
export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** A note for resolving a deferred `create`. */
export function noteFor(input: NoteInput): Note {
  return savedNote(input);
}
