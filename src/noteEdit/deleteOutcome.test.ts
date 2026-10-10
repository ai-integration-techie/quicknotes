import { describe, expect, it } from "vitest";
import { DELETE_FAILED, DELETE_UNAVAILABLE } from "../copy";
import {
  NotFoundError,
  QuotaExceededError,
  StorageUnavailableError,
  ValidationError,
} from "../storage";
import { deleteFailureText, deleteOutcomeFor } from "./deleteOutcome";

describe("deleteOutcomeFor", () => {
  it("maps not-found to already-deleted and everything else to a failure (R29, R30)", () => {
    expect(deleteOutcomeFor(new NotFoundError())).toEqual({
      kind: "already-deleted",
    });
    expect(deleteOutcomeFor(new StorageUnavailableError())).toEqual({
      kind: "failed",
      reason: "unavailable",
    });
    for (const error of [
      new QuotaExceededError(),
      new ValidationError([{ field: "id", rule: "not-a-string" }]),
      new Error("not-found"),
      "boom",
      undefined,
    ]) {
      expect(deleteOutcomeFor(error)).toEqual({
        kind: "failed",
        reason: "other",
      });
    }
  });

  it("gives the copy for each failure reason (R30)", () => {
    expect(deleteFailureText("unavailable")).toBe(DELETE_UNAVAILABLE);
    expect(deleteFailureText("other")).toBe(DELETE_FAILED);
  });
});
