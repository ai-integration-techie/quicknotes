import { describe, expect, it } from "vitest";
import { relativeTime } from "./relativeTime";

const T = Date.parse("2026-10-08T12:00:00Z");
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("relativeTime", () => {
  it.each([
    [0, "just now"],
    [-5_000, "just now"],
    [59_999, "just now"],
    [60_000, "1 minute ago"],
    [59 * MIN, "59 minutes ago"],
    [60 * MIN, "1 hour ago"],
    [23 * HOUR + 59 * MIN, "23 hours ago"],
    [24 * HOUR, "1 day ago"],
    [6 * DAY + 23 * HOUR, "6 days ago"],
    [7 * DAY, "1 week ago"],
    [29 * DAY, "4 weeks ago"],
    [30 * DAY, "1 month ago"],
    [364 * DAY, "12 months ago"],
    [365 * DAY, "1 year ago"],
    [800 * DAY, "2 years ago"],
  ])(
    "R8 thresholds and plurals (AC-11): %i ms ago reads %s",
    (offset, text) => {
      expect(relativeTime(T - offset, T)).toBe(text);
    },
  );

  it("plurals follow Intl.RelativeTimeFormat", () => {
    expect(relativeTime(T - 2 * MIN, T)).toBe("2 minutes ago");
    expect(relativeTime(T - 2 * DAY, T)).toBe("2 days ago");
  });
});
