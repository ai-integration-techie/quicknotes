import { describe, expect, it } from "vitest";
import type { Note } from "../notes/note";
import { freshFactory } from "../test/fakes";
import { createInMemoryNoteRepository } from "../test/inMemoryNoteRepository";
import {
  type Harness,
  type HarnessOptions,
  describeNoteRepositoryContract,
} from "../test/noteRepositoryContract";
import { createIndexedDbNoteRepository } from "./indexedDbNoteRepository";

function indexedDbHarness(): Harness {
  const factory = freshFactory();
  const make = ({ storage, ...rest }: HarnessOptions = {}) =>
    createIndexedDbNoteRepository({
      ...rest,
      indexedDB: () => factory,
      storage: () => storage,
    });
  return { repo: make, reopen: make };
}

function inMemoryHarness(): Harness {
  const records = new Map<string, Note>();
  const make = ({ storage, ...rest }: HarnessOptions = {}) =>
    createInMemoryNoteRepository({ ...rest, records, storage: () => storage });
  return { repo: make, reopen: make };
}

const indexedDbCount = describeNoteRepositoryContract(
  "indexeddb",
  indexedDbHarness,
);
const inMemoryCount = describeNoteRepositoryContract(
  "in-memory",
  inMemoryHarness,
);

describe("note repository contract (AC-52)", () => {
  it("runs the same contract tests against both implementations", () => {
    expect(indexedDbCount()).toBeGreaterThan(0);
    expect(inMemoryCount()).toBe(indexedDbCount());
  });
});
