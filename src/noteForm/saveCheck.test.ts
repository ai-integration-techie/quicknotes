import { describe, expect, it } from "vitest";
import {
  COUNTER_FROM,
  checkBeforeSave,
  counterFrom,
  counterValue,
} from "./saveCheck";

describe("counterValue", () => {
  it("shows from 90% of the limit", () => {
    expect(counterFrom(200)).toBe(180);
    expect(counterFrom(100000)).toBe(90000);
    expect(COUNTER_FROM).toEqual({ title: 180, body: 90000 });
  });

  it("is null at 179 and the count at 180 (Title)", () => {
    expect(counterValue("a".repeat(179), 200)).toBeNull();
    expect(counterValue("a".repeat(180), 200)).toBe(180);
    expect(counterValue("a".repeat(205), 200)).toBe(205);
  });

  it("is null at 89,999 and the count at 90,000 (Note)", () => {
    expect(counterValue("a".repeat(89999), 100000)).toBeNull();
    expect(counterValue("a".repeat(90000), 100000)).toBe(90000);
  });

  it("counts code points, not UTF-16 units", () => {
    // 100 emoji are 200 UTF-16 units but only 100 characters.
    expect(counterValue("😀".repeat(100), 200)).toBeNull();
    expect(counterValue("😀".repeat(179), 200)).toBeNull();
    expect(counterValue("😀".repeat(180), 200)).toBe(180);
  });
});

describe("checkBeforeSave", () => {
  it("reports both-empty when both fields have no characters", () => {
    expect(checkBeforeSave({ title: "", body: "" })).toEqual({
      fieldErrors: {},
      message: { kind: "empty" },
    });
  });

  it("treats whitespace as content", () => {
    expect(checkBeforeSave({ title: " ", body: "" })).toBeNull();
    expect(checkBeforeSave({ title: "", body: "\n" })).toBeNull();
  });

  it("accepts values exactly at the limits", () => {
    expect(
      checkBeforeSave({ title: "😀".repeat(200), body: "a".repeat(100000) }),
    ).toBeNull();
  });

  it("reports each over-limit field with its code-point count", () => {
    expect(checkBeforeSave({ title: "a".repeat(201), body: "x" })).toEqual({
      fieldErrors: { title: 201 },
      message: null,
    });
    expect(checkBeforeSave({ title: "t", body: "a".repeat(100001) })).toEqual({
      fieldErrors: { body: 100001 },
      message: null,
    });
    expect(
      checkBeforeSave({ title: "😀".repeat(201), body: "a".repeat(100001) }),
    ).toEqual({ fieldErrors: { title: 201, body: 100001 }, message: null });
  });
});
