import { describe, expect, it } from "vitest";
import {
  formReducer,
  initialFormState,
  type FormAction,
  type FormState,
} from "./formState";

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function state(overrides: Partial<FormState> = {}): FormState {
  return deepFreeze({ ...initialFormState, ...overrides });
}

function apply(from: FormState, action: FormAction): FormState {
  const snapshot = JSON.stringify(from);
  const next = formReducer(from, action);
  expect(JSON.stringify(from)).toBe(snapshot); // input never changes
  return next;
}

describe("formReducer", () => {
  it("starts idle and empty with no messages", () => {
    expect(initialFormState).toEqual({
      title: "",
      body: "",
      phase: "idle",
      fieldErrors: {},
      message: null,
    });
  });

  it("edit sets the value exactly as given", () => {
    const next = apply(state(), {
      type: "edit",
      field: "body",
      value: "  a\n\tb  ",
    });
    expect(next.body).toBe("  a\n\tb  ");
    expect(next.title).toBe("");
  });

  it("edit removes only that field's error", () => {
    const next = apply(state({ fieldErrors: { title: 201, body: 100001 } }), {
      type: "edit",
      field: "title",
      value: "x",
    });
    expect(next.fieldErrors).toEqual({ body: 100001 });
  });

  it("edit removes a saved message", () => {
    const next = apply(state({ message: { kind: "saved" } }), {
      type: "edit",
      field: "title",
      value: "x",
    });
    expect(next.message).toBeNull();
  });

  it("edit removes the empty message only once a field has a character", () => {
    const empty = state({ message: { kind: "empty" } });
    expect(
      apply(empty, { type: "edit", field: "body", value: "" }).message,
    ).toEqual({ kind: "empty" });
    expect(
      apply(empty, { type: "edit", field: "body", value: " " }).message,
    ).toBeNull();
  });

  it("edit keeps a failure message (it waits for the next attempt)", () => {
    const failure = { kind: "failure", text: "x" } as const;
    const next = apply(state({ message: failure, title: "a" }), {
      type: "edit",
      field: "title",
      value: "ab",
    });
    expect(next.message).toEqual(failure);
  });

  it("edit never adds an error or message", () => {
    const next = apply(state(), {
      type: "edit",
      field: "title",
      value: "a".repeat(250),
    });
    expect(next.fieldErrors).toEqual({});
    expect(next.message).toBeNull();
  });

  it("edit is ignored while saving", () => {
    const saving = state({ phase: "saving", title: "a" });
    expect(apply(saving, { type: "edit", field: "title", value: "b" })).toBe(
      saving,
    );
  });

  it("attemptStarted clears every message and field error, keeping text", () => {
    const next = apply(
      state({
        title: "t",
        fieldErrors: { title: 201 },
        message: { kind: "failure", text: "x" },
      }),
      { type: "attemptStarted" },
    );
    expect(next).toEqual({ ...initialFormState, title: "t" });
  });

  it("savingStarted enters the saving phase", () => {
    expect(apply(state({ title: "t" }), { type: "savingStarted" })).toEqual({
      ...initialFormState,
      title: "t",
      phase: "saving",
    });
  });

  it("saved clears both fields, shows the saved message and returns to idle", () => {
    expect(
      apply(state({ title: "t", body: "b", phase: "saving" }), {
        type: "saved",
      }),
    ).toEqual({ ...initialFormState, message: { kind: "saved" } });
  });

  it("problem shows its errors and message, keeps the text and returns to idle", () => {
    const next = apply(state({ title: "t", body: "b", phase: "saving" }), {
      type: "problem",
      problem: { fieldErrors: { body: 100001 }, message: null },
    });
    expect(next).toEqual({
      title: "t",
      body: "b",
      phase: "idle",
      fieldErrors: { body: 100001 },
      message: null,
    });
  });
});
