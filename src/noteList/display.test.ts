import { describe, expect, it } from "vitest";
import { isBlank, previewText } from "./display";

const ELLIPSIS = "…";

function hasLoneSurrogate(text: string): boolean {
  return /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(
    text,
  );
}

describe("isBlank (AC-9)", () => {
  it("only whitespace, including the empty string, is blank", () => {
    for (const text of ["", " ", "\t", "\n\n", "   "]) {
      expect(isBlank(text), JSON.stringify(text)).toBe(true);
    }
    for (const text of ["a", "  lead  ", ".", "\u{1F600}"]) {
      expect(isBlank(text), JSON.stringify(text)).toBe(false);
    }
  });
});

describe("previewText table (AC-10)", () => {
  it.each([
    ["line1\n\n  line2\tend", "line1 line2 end"],
    ["a".repeat(150), "a".repeat(100) + ELLIPSIS],
    ["a".repeat(100), "a".repeat(100)],
    ["\u{1F600}".repeat(101), "\u{1F600}".repeat(100) + ELLIPSIS],
    ["a".repeat(99) + " b" + "c".repeat(10), "a".repeat(99) + ELLIPSIS],
    ["  padded  ", "padded"],
  ])("%j", (body, expected) => {
    const preview = previewText(body);
    expect(preview).toBe(expected);
    expect(hasLoneSurrogate(preview ?? "")).toBe(false);
  });

  it("a blank body has no preview", () => {
    for (const body of ["", "   ", "\n\n"]) {
      expect(previewText(body), JSON.stringify(body)).toBeNull();
    }
  });

  it("never splits a code point", () => {
    const preview = previewText("x" + "\u{1F600}".repeat(150)) ?? "";
    expect(hasLoneSurrogate(preview)).toBe(false);
    expect(Array.from(preview)).toHaveLength(101);
  });
});
