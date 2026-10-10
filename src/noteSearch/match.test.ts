import { describe, expect, it } from "vitest";
import type { Note } from "../storage";
import {
  fold,
  isBlankQuery,
  matchNotes,
  primeFolds,
  queryWords,
} from "./match";

function note(id: string, title: string, body: string): Note {
  return { id, title, body, createdAt: 0, updatedAt: 0 };
}

/** search-notes AC-5: title / body / query → match. */
const AC5_ROWS: readonly [string, string, string, boolean][] = [
  ["Café", "", "cafe", true],
  ["", "café au lait", "CAFÉ", true],
  ["NAIVE", "", "naïve", true],
  ["Uber", "", "über", true],
  ["Việt Nam", "", "viet", true],
  ["İstanbul", "", "istanbul", true],
  ["Shopping list", "", "shop list", true],
  ["", "list for the shop", "shop list", true],
  ["Shopping", "", "shop list", false],
  ["Groceries", "milk", "groceries milk", true],
  ["ab", "cd", "bc", false],
  ["a.b", "", "a.b", true],
  ["axb", "", "a.b", false],
  ["(x", "", "(", true],
  ["日本語", "", "日本", true],
  ["", "עברית", "עברית", true],
  ["", "a😀b", "😀", true],
  ["", "line one\nline two", "one\ntwo", true],
  ["한", "", "하", false],
  ["x", "\uD800", "\uD800", true],
  ["x", "", "  x   ", true],
  ["Plans", "", "plans plans", true],
  ["cat", "", "cats", false],
];

const C = Object.freeze(note("c", "Shopping list", "milk"));
const B = Object.freeze(note("b", "Ideas", "café plans"));
const A = Object.freeze(note("a", "Groceries", "Shopping for the party"));

describe("search matching", () => {
  it.each(AC5_ROWS)(
    "the AC-5 table, row by row: %j / %j / %j → %s (AC-5)",
    (title, body, query, expected) => {
      const n = note("x", title, body);
      expect(matchNotes(query, [n])).toEqual(expected ? [n] : []);
    },
  );

  it("no call throws for regex characters, lone surrogates and 10,000 characters (AC-5)", () => {
    const notes = [C, B, A, note("s", "\uDC00", "\uD800x")];
    for (const query of [
      "[*+?",
      "\\",
      "\uDC00",
      "x".repeat(10_000),
      ".*+?^${}()|[]\\",
      "\u0000\u0007",
    ]) {
      expect(() => matchNotes(query, notes)).not.toThrow();
    }
    expect(matchNotes("\uDC00", notes).map((n) => n.id)).toEqual(["s"]);
  });

  it("returns the same objects in order, leaves frozen input unchanged, returns the input for a blank query (AC-8)", () => {
    const input = Object.freeze([C, B, A]);
    const result = matchNotes("shop", input);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(C);
    expect(result[1]).toBe(A);
    expect(input).toEqual([C, B, A]);
    expect(C).toEqual(note("c", "Shopping list", "milk"));
    for (const blank of ["", " ", "\t", "\n", "  "]) {
      expect(matchNotes(blank, input)).toBe(input);
    }
  });

  it("folds as R5: accents and case removed, other scripts kept whole", () => {
    expect(fold("Café")).toBe("cafe");
    expect(fold("CAFE")).toBe("cafe");
    expect(fold("café")).toBe("cafe");
    expect(fold("İstanbul")).toBe("istanbul");
    expect(fold("Việt")).toBe("viet");
    expect(fold("한")).toBe("한");
    expect(fold("Straße")).toBe("straße");
    expect(fold("ＡＢＣ")).toBe("ａｂｃ");
  });

  it("blank queries and words follow R6, with repeated words removed", () => {
    for (const blank of ["", " ", "\t", "\n", " "]) {
      expect(isBlankQuery(blank)).toBe(true);
      expect(queryWords(blank)).toEqual([]);
    }
    expect(isBlankQuery(" a ")).toBe(false);
    expect(queryWords("  shop\tlist\nshop ")).toEqual(["shop", "list"]);
  });

  it("the fold cache never goes stale: an edited note is a new object", () => {
    const before = note("e", "Shopping", "");
    primeFolds([before]);
    expect(matchNotes("shop", [before])).toEqual([before]);
    const after = note("e", "Party", "cake");
    expect(matchNotes("shop", [after])).toEqual([]);
    expect(matchNotes("cake", [after])).toEqual([after]);
  });

  it("a word never matches across the title and body boundary", () => {
    expect(matchNotes("ab", [note("x", "a", "b")])).toEqual([]);
  });
});
