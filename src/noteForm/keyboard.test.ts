import { describe, expect, it } from "vitest";
import { isComposing, isPlainEnter, isSaveShortcut } from "./keyboard";

const key = (overrides: Partial<Parameters<typeof isComposing>[0]> = {}) => ({
  key: "Enter",
  ctrlKey: false,
  metaKey: false,
  isComposing: false,
  keyCode: 13,
  ...overrides,
});

describe("keyboard", () => {
  it("Ctrl+Enter and Cmd+Enter are the save shortcut", () => {
    expect(isSaveShortcut(key({ ctrlKey: true }))).toBe(true);
    expect(isSaveShortcut(key({ metaKey: true }))).toBe(true);
    expect(isSaveShortcut(key())).toBe(false);
    expect(isSaveShortcut(key({ key: "a", ctrlKey: true }))).toBe(false);
  });

  it("any Enter without Ctrl or Cmd is a plain Enter (D8)", () => {
    expect(isPlainEnter(key())).toBe(true);
    expect(isPlainEnter(key({ key: "Enter" }))).toBe(true);
    expect(isPlainEnter(key({ ctrlKey: true }))).toBe(false);
    expect(isPlainEnter(key({ metaKey: true }))).toBe(false);
    expect(isPlainEnter(key({ key: "Tab" }))).toBe(false);
  });

  it("detects an IME composition by isComposing or keyCode 229 (D9)", () => {
    expect(isComposing(key({ isComposing: true }))).toBe(true);
    expect(isComposing(key({ keyCode: 229 }))).toBe(true);
    expect(isComposing(key())).toBe(false);
    expect(isComposing({ key: "Enter", ctrlKey: false, metaKey: false })).toBe(
      false,
    );
  });
});
