import { describe, expect, it } from "vitest";
import {
  CHANGES_FAILED,
  CHANGES_FULL,
  CHANGES_NOT_FOUND,
  CHANGES_UNAVAILABLE,
  SAVE_FAILED_GENERIC,
  SAVE_FAILED_QUOTA,
  SAVE_FAILED_UNAVAILABLE,
} from "../copy";
import {
  NotFoundError,
  QuotaExceededError,
  StorageUnavailableError,
  ValidationError,
} from "../storage";
import { focusTargetFor, problemFromRejection } from "./saveProblems";

const generic = {
  fieldErrors: {},
  message: { kind: "failure", text: SAVE_FAILED_GENERIC },
};

describe("problemFromRejection", () => {
  it("maps storage error kinds to their copy (R20)", () => {
    expect(problemFromRejection(new StorageUnavailableError())).toEqual({
      fieldErrors: {},
      message: { kind: "failure", text: SAVE_FAILED_UNAVAILABLE },
    });
    expect(problemFromRejection(new QuotaExceededError())).toEqual({
      fieldErrors: {},
      message: { kind: "failure", text: SAVE_FAILED_QUOTA },
    });
    expect(problemFromRejection(new NotFoundError())).toEqual(generic);
  });

  it("maps anything that isn't a storage error to the generic copy", () => {
    expect(problemFromRejection(new Error("boom"))).toEqual(generic);
    expect(problemFromRejection("boom")).toEqual(generic);
    expect(problemFromRejection(undefined)).toEqual(generic);
    expect(
      problemFromRejection({ kind: "unavailable", message: "fake" }),
    ).toEqual(generic);
  });

  it("maps a lone empty issue to the both-empty message (R18)", () => {
    expect(
      problemFromRejection(
        new ValidationError([{ field: "note", rule: "empty" }]),
      ),
    ).toEqual({ fieldErrors: {}, message: { kind: "empty" } });
  });

  it("maps too-long issues to field errors with the issue's actual count (R18)", () => {
    expect(
      problemFromRejection(
        new ValidationError([
          { field: "title", rule: "too-long", limit: 200, actual: 250 },
          { field: "body", rule: "too-long", limit: 100000, actual: 100002 },
        ]),
      ),
    ).toEqual({ fieldErrors: { title: 250, body: 100002 }, message: null });
  });

  it("maps any list with an unknown issue to the generic copy only (D7)", () => {
    expect(
      problemFromRejection(
        new ValidationError([{ field: "id", rule: "not-a-string" }]),
      ),
    ).toEqual(generic);
    expect(
      problemFromRejection(
        new ValidationError([
          { field: "title", rule: "too-long", limit: 200, actual: 250 },
          { field: "body", rule: "not-a-string" },
        ]),
      ),
    ).toEqual(generic);
    expect(
      problemFromRejection(
        new ValidationError([
          { field: "note", rule: "empty" },
          { field: "title", rule: "not-a-string" },
        ]),
      ),
    ).toEqual(generic);
    expect(problemFromRejection(new ValidationError([]))).toEqual(generic);
  });
});

describe("focusTargetFor", () => {
  it("focuses Title for the both-empty message", () => {
    expect(
      focusTargetFor({ fieldErrors: {}, message: { kind: "empty" } }),
    ).toBe("title");
  });

  it("focuses the first invalid field, Title before Note", () => {
    expect(
      focusTargetFor({
        fieldErrors: { title: 201, body: 100001 },
        message: null,
      }),
    ).toBe("title");
    expect(
      focusTargetFor({ fieldErrors: { body: 100001 }, message: null }),
    ).toBe("body");
  });

  it("leaves focus alone for storage failures", () => {
    expect(focusTargetFor(generic as never)).toBeNull();
  });
});

describe("problemFromRejection with the edit copy (edit-delete-note D4)", () => {
  const edit = {
    unavailable: CHANGES_UNAVAILABLE,
    quota: CHANGES_FULL,
    generic: CHANGES_FAILED,
    notFound: CHANGES_NOT_FOUND,
  };
  const failure = (text: string) => ({
    fieldErrors: {},
    message: { kind: "failure", text },
  });

  it("edit copy table maps not-found and generic (AC-16)", () => {
    expect(problemFromRejection(new StorageUnavailableError(), edit)).toEqual(
      failure(CHANGES_UNAVAILABLE),
    );
    expect(problemFromRejection(new QuotaExceededError(), edit)).toEqual(
      failure(CHANGES_FULL),
    );
    expect(problemFromRejection(new NotFoundError(), edit)).toEqual(
      failure(CHANGES_NOT_FOUND),
    );
    expect(problemFromRejection(new Error("boom"), edit)).toEqual(
      failure(CHANGES_FAILED),
    );
    expect(problemFromRejection("boom", edit)).toEqual(failure(CHANGES_FAILED));
    expect(
      problemFromRejection(
        new ValidationError([{ field: "id", rule: "not-a-string" }]),
        edit,
      ),
    ).toEqual(failure(CHANGES_FAILED));
    expect(
      problemFromRejection(
        new ValidationError([{ field: "note", rule: "empty" }]),
        edit,
      ),
    ).toEqual({ fieldErrors: {}, message: { kind: "empty" } });
    expect(
      problemFromRejection(
        new ValidationError([
          { field: "title", rule: "too-long", limit: 200, actual: 250 },
        ]),
        edit,
      ),
    ).toEqual({ fieldErrors: { title: 250 }, message: null });
  });
});
