import { describe, expect, it } from "vitest";
import { baselineOf, differsFrom } from "./baseline";

describe("baselineOf", () => {
  it("baselineOf is the identity for in-app notes; strips title line breaks and normalises CRLF (AC-5, spec risk 3)", () => {
    for (const note of [
      {
        title: "  lead and trail  ",
        body: "line1\nline2\n\n  indented\ttab  ",
      },
      { title: "👩‍💻 🇮🇳", body: "日本語 العربية עברית हिन्दी" },
      { title: "<b>not html</b>", body: "é vs é" },
      { title: "", body: "x" },
    ]) {
      const baseline = baselineOf(note);
      expect(baseline.title === note.title).toBe(true);
      expect(baseline.body === note.body).toBe(true);
    }
    expect(baselineOf({ title: "a\r\nb\nc\rd", body: "x\r\ny\rz\n" })).toEqual({
      title: "abcd",
      body: "x\ny\nz\n",
    });
  });

  it("differsFrom compares both fields exactly (R17)", () => {
    const baseline = { title: "t", body: "b" };
    expect(differsFrom(baseline, { title: "t", body: "b" })).toBe(false);
    expect(differsFrom(baseline, { title: "t ", body: "b" })).toBe(true);
    expect(differsFrom(baseline, { title: "t", body: "b\n" })).toBe(true);
  });
});
