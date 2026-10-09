import { describe, expect, it } from "vitest";
import {
  NotFoundError,
  QuotaExceededError,
  StorageUnavailableError,
  ValidationError,
} from "../storage";
import { listFailureReason, openOutcome } from "./loadProblems";

const OTHERS: unknown[] = [
  new QuotaExceededError(),
  new NotFoundError(),
  new ValidationError([{ field: "note", rule: "empty" }]),
  new Error("boom"),
  "boom",
  undefined,
  { kind: "unavailable" },
];

describe("loadProblems", () => {
  it("listFailureReason (AC-16)", () => {
    expect(listFailureReason(new StorageUnavailableError())).toBe(
      "unavailable",
    );
    for (const error of OTHERS) {
      expect(listFailureReason(error), String(error)).toBe("other");
    }
  });

  it("openOutcome (AC-30)", () => {
    expect(openOutcome(new NotFoundError())).toBe("not-found");
    expect(openOutcome(new StorageUnavailableError())).toBe("unavailable");
    for (const error of [
      new QuotaExceededError(),
      new ValidationError([{ field: "id", rule: "not-a-string" }]),
      new Error("boom"),
      "boom",
      { kind: "not-found" },
    ]) {
      expect(openOutcome(error), String(error)).toBe("other");
    }
  });
});
