import { describe, expect, it } from "vitest";
import { ValidationError } from "./errors";
import {
  BODY_MAX_CHARS,
  TITLE_MAX_CHARS,
  countCharacters,
  validateId,
  validateNoteInput,
  validateUpdate,
} from "./validation";

function issuesOf(run: () => unknown) {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    return (error as ValidationError).issues;
  }
  throw new Error("expected a ValidationError");
}

describe("validation", () => {
  it("countCharacters counts code points (AC-10)", () => {
    const cases: [string, number][] = [
      ["a", 1],
      ["é", 1],
      ["é", 2],
      ["\u{1F600}", 1],
      ["\u{1F469}‍\u{1F4BB}", 3],
      ["\r\n", 2],
      ["\t", 1],
      ["\uD800", 1],
      ["", 0],
    ];
    expect(cases.map(([s]) => countCharacters(s))).toEqual(
      cases.map(([, n]) => n),
    );
  });

  it("exports the limits", () => {
    expect(TITLE_MAX_CHARS).toBe(200);
    expect(BODY_MAX_CHARS).toBe(100_000);
  });

  it("validateNoteInput returns a new object with only title and body", () => {
    const input = { title: "t", body: "b", id: "x", extra: 1 };
    const valid = validateNoteInput(input);
    expect(valid).toEqual({ title: "t", body: "b" });
    expect(valid).not.toBe(input);
  });

  it("does not trim or normalise", () => {
    const valid = validateNoteInput({ title: " ", body: "é " });
    expect(valid.title).toBe(" ");
    expect(valid.body).toBe("é ");
  });

  it("rejects non-object input as two not-a-string issues", () => {
    expect(issuesOf(() => validateNoteInput(null))).toEqual([
      { field: "title", rule: "not-a-string" },
      { field: "body", rule: "not-a-string" },
    ]);
    expect(issuesOf(() => validateNoteInput("text"))).toHaveLength(2);
  });

  it("validateId accepts any string and rejects anything else", () => {
    expect(validateId("")).toBe("");
    expect(issuesOf(() => validateId(42))).toEqual([
      { field: "id", rule: "not-a-string" },
    ]);
  });

  it("validateUpdate merges id and input issues", () => {
    expect(issuesOf(() => validateUpdate(1, { title: "", body: "" }))).toEqual([
      { field: "id", rule: "not-a-string" },
      { field: "note", rule: "empty" },
    ]);
    expect(validateUpdate("id", { title: "t", body: "", id: "x" })).toEqual({
      id: "id",
      input: { title: "t", body: "" },
    });
  });
});
