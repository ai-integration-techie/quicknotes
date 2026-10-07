import { describe, expect, it } from "vitest";
import { HINT_APPLE, HINT_OTHER } from "../copy";
import { shortcutHint } from "./platform";

describe("shortcutHint", () => {
  it.each(["MacIntel", "iPhone", "iPad", "iPod touch"])(
    "%s gets the Cmd hint",
    (platform) => {
      expect(shortcutHint(platform)).toBe(HINT_APPLE);
    },
  );

  it.each(["Win32", "Linux x86_64", "", "Android"])(
    "%j gets the Ctrl hint",
    (platform) => {
      expect(shortcutHint(platform)).toBe(HINT_OTHER);
    },
  );
});
