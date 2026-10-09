import { describe, expect, it } from "vitest";
import type { Note } from "../storage";
import { initialListState, listReducer, type ListState } from "./listState";

function note(n: number): Note {
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    title: `N${n}`,
    body: "",
    createdAt: n,
    updatedAt: n,
  };
}

const A = note(1);
const B = note(2);
const N = note(3);

function ids(state: ListState): string[] {
  if (state.phase !== "loaded") throw new Error(`not loaded: ${state.phase}`);
  return state.notes.map((n) => n.id);
}

const loaded: ListState = { phase: "loaded", notes: [A, B], now: 10 };
const failed: ListState = { phase: "failed", reason: "unavailable" };

describe("listReducer", () => {
  it("starts loading with nothing saved or gone", () => {
    expect(initialListState).toMatchObject({
      phase: "loading",
      savedFirst: [],
    });
  });

  it("listResolved keeps list() order and sets now", () => {
    const next = listReducer(initialListState, {
      type: "listResolved",
      notes: [B, A],
      now: 5,
    });
    expect(next).toEqual({ phase: "loaded", notes: [B, A], now: 5 });
  });

  it("listResolved merges savedFirst without duplicates (R14)", () => {
    const loading = listReducer(initialListState, {
      type: "noteSaved",
      note: N,
      now: 1,
    });
    for (const notes of [[N, A], [A]]) {
      const next = listReducer(loading, {
        type: "listResolved",
        notes,
        now: 2,
      });
      expect(ids(next)).toEqual([N.id, A.id]);
    }
  });

  it("listRejected fails with the reason", () => {
    expect(
      listReducer(initialListState, { type: "listRejected", reason: "other" }),
    ).toEqual({ phase: "failed", reason: "other" });
  });

  it("noteSaved puts the note first when loaded, and once", () => {
    const next = listReducer(loaded, { type: "noteSaved", note: N, now: 20 });
    expect(ids(next)).toEqual([N.id, A.id, B.id]);
    expect(next).toMatchObject({ now: 20 });
    const again = listReducer(next, { type: "noteSaved", note: N, now: 21 });
    expect(ids(again)).toEqual([N.id, A.id, B.id]);
  });

  it("noteSaved replaces the empty state with one note", () => {
    const empty: ListState = { phase: "loaded", notes: [], now: 0 };
    expect(
      ids(listReducer(empty, { type: "noteSaved", note: N, now: 1 })),
    ).toEqual([N.id]);
  });

  it("noteGone removes the note when loaded, and drops it from a later list() when loading", () => {
    expect(ids(listReducer(loaded, { type: "noteGone", id: A.id }))).toEqual([
      B.id,
    ]);
    const loading = listReducer(initialListState, {
      type: "noteGone",
      id: A.id,
    });
    const next = listReducer(loading, {
      type: "listResolved",
      notes: [A, B],
      now: 1,
    });
    expect(ids(next)).toEqual([B.id]);
  });

  it("failed ignores noteSaved and noteGone (R13)", () => {
    expect(listReducer(failed, { type: "noteSaved", note: N, now: 1 })).toBe(
      failed,
    );
    expect(listReducer(failed, { type: "noteGone", id: A.id })).toBe(failed);
    expect(listReducer(failed, { type: "listShown", now: 1 })).toBe(failed);
    expect(
      listReducer(failed, { type: "listResolved", notes: [A], now: 1 }),
    ).toBe(failed);
  });

  it("listShown refreshes now only when loaded", () => {
    expect(listReducer(loaded, { type: "listShown", now: 99 })).toEqual({
      ...loaded,
      now: 99,
    });
    expect(listReducer(initialListState, { type: "listShown", now: 99 })).toBe(
      initialListState,
    );
  });

  it("never changes the input state", () => {
    const before = JSON.stringify(loaded);
    listReducer(loaded, { type: "noteSaved", note: N, now: 1 });
    listReducer(loaded, { type: "noteGone", id: A.id });
    expect(JSON.stringify(loaded)).toBe(before);
  });
});
