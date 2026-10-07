import { IDBDatabase } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import type { Note } from "../notes/note";
import { compareForList } from "../notes/ordering";
import {
  createStubStorage,
  fixedId,
  freshFactory,
  openDirect,
} from "../test/fakes";
import { createIndexedDbNoteRepository } from "./indexedDbNoteRepository";

const NOTE_COUNT = 1000;
const TIMED_RUNS = 5;
const BUDGET_MS = 250;

function seedNotes(): Note[] {
  return Array.from({ length: NOTE_COUNT }, (_, i) => ({
    id: fixedId(i),
    title: `Title ${String(i).padStart(4, "0")}`.padEnd(60, "t"),
    body: "b".repeat(2000),
    createdAt: 1000,
    // Ties every 3 notes exercise the id tie-break.
    updatedAt: 1000 + Math.floor(i / 3),
  }));
}

async function seed(
  factory: IDBFactory,
  notes: readonly Note[],
): Promise<void> {
  const db = await openDirect(factory);
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("notes", "readwrite");
      const store = tx.objectStore("notes");
      for (const note of notes) store.put(note);
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((x, y) => x - y);
  return sorted[Math.floor(sorted.length / 2)] ?? Number.NaN;
}

describe("performance", () => {
  it("list over 1,000 notes uses one readonly transaction and a median under 250 ms (AC-40)", async () => {
    const factory = freshFactory();
    const repo = createIndexedDbNoteRepository({
      indexedDB: () => factory,
      storage: () => createStubStorage(),
    });
    await repo.list(); // creates the schema
    const notes = seedNotes();
    await seed(factory, notes);
    const expectedIds = [...notes].sort(compareForList).map((n) => n.id);

    expect(await repo.list()).toHaveLength(NOTE_COUNT); // warm-up
    const transaction = vi.spyOn(IDBDatabase.prototype, "transaction");
    const durations: number[] = [];
    for (let run = 0; run < TIMED_RUNS; run += 1) {
      transaction.mockClear();
      const start = performance.now();
      const listed = await repo.list();
      durations.push(performance.now() - start);
      expect(listed.map((n) => n.id)).toEqual(expectedIds);
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(transaction.mock.calls[0]?.[1]).toBe("readonly");
    }
    expect(median(durations)).toBeLessThan(BUDGET_MS);
  });
});
