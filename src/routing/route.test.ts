import { describe, expect, it } from "vitest";
import { appUrl, NOTE_ID_PATTERN, noteHref, parseRoute } from "./route";

const ID = "3f2b8c1e-7a4d-4e2b-9c1f-0a1b2c3d4e5f";

describe("parseRoute (AC-28)", () => {
  it("no hash, # and other hashes are the list view", () => {
    for (const hash of ["", "#", "#elsewhere", "#notes-heading", "#note"]) {
      expect(parseRoute(hash), hash).toEqual({ kind: "list" });
    }
  });

  it("a valid id is a valid note route", () => {
    expect(parseRoute(`#note/${ID}`)).toEqual({
      kind: "note",
      id: ID,
      valid: true,
    });
  });

  it("#note/, a malformed id and an upper-case id are invalid note routes", () => {
    for (const id of ["", "not-a-uuid", ID.toUpperCase(), `${ID}x`]) {
      expect(parseRoute(`#note/${id}`), id).toEqual({
        kind: "note",
        id,
        valid: false,
      });
    }
  });

  it("the id pattern is the note-storage R1 form", () => {
    expect(NOTE_ID_PATTERN.test(ID)).toBe(true);
    expect(NOTE_ID_PATTERN.test("00000000-0000-4000-8000-000000000000")).toBe(
      true,
    );
    expect(NOTE_ID_PATTERN.test("00000000-0000-1000-8000-000000000000")).toBe(
      false,
    );
  });
});

describe("hrefs", () => {
  it("noteHref is #note/<id>", () => {
    expect(noteHref(ID)).toBe(`#note/${ID}`);
  });

  it("appUrl is the path and query, without the hash", () => {
    expect(appUrl({ pathname: "/quicknotes/", search: "" })).toBe(
      "/quicknotes/",
    );
    expect(appUrl({ pathname: "/", search: "?a=1" })).toBe("/?a=1");
  });
});
