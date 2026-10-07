import { describe, expect, it } from "vitest";
import {
  NotFoundError,
  NoteStorageError,
  QuotaExceededError,
  StorageUnavailableError,
  ValidationError,
} from "./errors";

describe("note storage errors", () => {
  it("every class is a NoteStorageError with its kind and name", () => {
    const cases: [NoteStorageError, string, string][] = [
      [
        new ValidationError([{ field: "note", rule: "empty" }]),
        "validation",
        "ValidationError",
      ],
      [new NotFoundError(), "not-found", "NotFoundError"],
      [new StorageUnavailableError(), "unavailable", "StorageUnavailableError"],
      [new QuotaExceededError(), "quota-exceeded", "QuotaExceededError"],
    ];
    for (const [error, kind, name] of cases) {
      expect(error).toBeInstanceOf(NoteStorageError);
      expect(error).toBeInstanceOf(Error);
      expect(error.kind).toBe(kind);
      expect(error.name).toBe(name);
      expect(Object.hasOwn(error, "kind")).toBe(true);
      expect(JSON.parse(JSON.stringify(error))).toMatchObject({ kind });
    }
  });

  it("keeps the original error on cause", () => {
    const original = new DOMException("full", "QuotaExceededError");
    expect(new QuotaExceededError({ cause: original }).cause).toBe(original);
    expect(new StorageUnavailableError({ cause: original }).cause).toBe(
      original,
    );
    expect(new StorageUnavailableError({ cause: undefined })).toHaveProperty(
      "cause",
    );
    expect(new StorageUnavailableError()).not.toHaveProperty("cause");
  });

  it("messages are fixed templates from field, rule, limit and count", () => {
    const error = new ValidationError([
      { field: "title", rule: "too-long", limit: 200, actual: 201 },
      { field: "body", rule: "not-a-string" },
    ]);
    expect(error.message).toBe(
      "Note failed validation: title too-long (201/200), body not-a-string",
    );
    expect(new NotFoundError().message).toBe("Note not found");
    expect(new StorageUnavailableError().message).toBe(
      "Note storage is unavailable",
    );
    expect(new QuotaExceededError().message).toBe("Note storage is full");
  });

  it("validation issues are copies of the input list", () => {
    const issues = [{ field: "note", rule: "empty" } as const];
    const error = new ValidationError(issues);
    expect(error.issues).toEqual(issues);
    expect(error.issues[0]).not.toBe(issues[0]);
  });
});
