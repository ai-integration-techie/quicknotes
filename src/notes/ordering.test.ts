import { describe, expect, it } from "vitest";
import type { Note } from "./note";
import { compareForList, nextUpdatedAt, sortForList, toNote } from "./ordering";

function note(id: string, updatedAt: number): Note {
  return { id, title: "", body: "x", createdAt: 0, updatedAt };
}

describe("ordering", () => {
  it("sorts by updatedAt descending, then id ascending by plain comparison", () => {
    const notes = [note("b", 1), note("a", 1), note("c", 3), note("B", 1)];
    expect(sortForList(notes).map((n) => n.id)).toEqual(["c", "B", "a", "b"]);
    expect(compareForList(note("a", 1), note("a", 1))).toBe(0);
  });

  it("sortForList returns fresh notes and leaves the input untouched", () => {
    const input = [note("a", 1), note("b", 2)];
    const sorted = sortForList(input);
    expect(input.map((n) => n.id)).toEqual(["a", "b"]);
    expect(sorted[1]).toEqual(input[0]);
    expect(sorted[1]).not.toBe(input[0]);
  });

  it("toNote keeps exactly the five model fields", () => {
    const record = { ...note("a", 1), extra: true } as Note;
    expect(Object.keys(toNote(record)).sort()).toEqual([
      "body",
      "createdAt",
      "id",
      "title",
      "updatedAt",
    ]);
  });

  it("nextUpdatedAt always moves forward", () => {
    expect(nextUpdatedAt(5000, 1000)).toBe(5000);
    expect(nextUpdatedAt(1000, 1000)).toBe(1001);
    expect(nextUpdatedAt(500, 1002)).toBe(1003);
  });
});
