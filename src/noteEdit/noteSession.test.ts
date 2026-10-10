import { describe, expect, it } from "vitest";
import type { Note } from "../storage";
import {
  readingSession,
  sessionReducer,
  type NoteSession,
  type SessionAction,
} from "./noteSession";

const A: Note = {
  id: "00000000-0000-4000-8000-00000000000a",
  title: "Shopping",
  body: "Milk",
  createdAt: 1,
  updatedAt: 1,
};
const N: Note = { ...A, title: "Shopping list", updatedAt: 5 };

function run(state: NoteSession, ...actions: SessionAction[]): NoteSession {
  return actions.reduce(sessionReducer, state);
}

const start = readingSession(A, 10);
const editingA = run(start, { type: "edit" });

describe("note session", () => {
  it("edit enters editing with the baseline, without changing the input", () => {
    const frozen = Object.freeze({ ...start });
    expect(sessionReducer(frozen, { type: "edit" })).toEqual({
      mode: "editing",
      note: A,
      now: 10,
      baseline: { title: "Shopping", body: "Milk" },
      saving: false,
      noteGone: false,
      discard: null,
    });
    expect(frozen).toEqual(start);
  });

  it("cancel, noChange and discard return to reading with the note as it was", () => {
    for (const type of ["cancel", "noChange", "discard"] as const) {
      expect(run(editingA, { type })).toEqual(start);
    }
  });

  it("saved shows the resolved note", () => {
    expect(
      run(
        editingA,
        { type: "saveStarted" },
        { type: "saved", note: N, now: 6 },
      ),
    ).toEqual(readingSession(N, 6));
  });

  it("save failure keeps editing; cancel and discard are ignored while saving", () => {
    const saving = run(editingA, { type: "saveStarted" });
    expect(run(saving, { type: "cancel" })).toBe(saving);
    expect(run(saving, { type: "askDiscard", reason: "back" })).toBe(saving);
    expect(run(saving, { type: "saveFailed" })).toEqual(editingA);
  });

  it("askDiscard and keepEditing open and close the discard dialog", () => {
    const asked = run(editingA, { type: "askDiscard", reason: "cancel" });
    expect(asked).toMatchObject({ mode: "editing", discard: "cancel" });
    expect(run(asked, { type: "keepEditing" })).toEqual(editingA);
  });

  it("notFound then discard → goneAfterEdit (R15)", () => {
    const gone = run(editingA, { type: "saveStarted" }, { type: "notFound" });
    expect(gone).toMatchObject({ mode: "editing", noteGone: true });
    expect(run(gone, { type: "discard" })).toEqual({ mode: "gone" });
    expect(run(gone, { type: "cancel" })).toEqual({ mode: "gone" });
    expect(run({ mode: "gone" }, { type: "edit" })).toEqual({ mode: "gone" });
  });

  it("delete dialog: keepNote closes it unless pending; deleteFailed closes it", () => {
    const asked = run(start, { type: "askDelete" });
    expect(asked).toMatchObject({ deleting: { pending: false } });
    expect(run(asked, { type: "keepNote" })).toEqual(start);
    expect(run(asked, { type: "edit" })).toBe(asked);
    const pending = run(asked, { type: "deleteStarted" });
    expect(pending).toMatchObject({ deleting: { pending: true } });
    expect(run(pending, { type: "keepNote" })).toBe(pending);
    expect(run(pending, { type: "deleteFailed" })).toEqual(start);
    expect(run(pending, { type: "deleteSettled" })).toEqual(start);
    expect(run(start, { type: "deleteStarted" })).toBe(start);
  });
});
