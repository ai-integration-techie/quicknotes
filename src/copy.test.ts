import { describe, expect, it } from "vitest";
import * as copy from "./copy";

/** Literal spec text (create-note Copy table), so a typo can't hide behind a shared constant. */
describe("copy", () => {
  it("every create-note string matches the spec exactly", () => {
    expect(copy.NEW_NOTE_HEADING).toBe("New note");
    expect(copy.TITLE_LABEL).toBe("Title");
    expect(copy.NOTE_LABEL).toBe("Note");
    expect(copy.SAVE_BUTTON).toBe("Save note");
    expect(copy.SAVE_BUTTON_SAVING).toBe("Saving…");
    expect(copy.HINT_APPLE).toBe("Press Cmd+Enter to save.");
    expect(copy.HINT_OTHER).toBe("Press Ctrl+Enter to save.");
    expect(copy.NOTE_SAVED).toBe("Note saved.");
    expect(copy.BOTH_EMPTY).toBe("Add a title or some text first.");
    expect(copy.SAVE_FAILED_UNAVAILABLE).toBe(
      "Your note wasn't saved. This browser isn't letting QuickNotes store notes right now, which can happen in private browsing. Your text is still here.",
    );
    expect(copy.SAVE_FAILED_QUOTA).toBe(
      "Your note wasn't saved because there's no storage space left for QuickNotes on this device. Free up some space, then try again. Your text is still here.",
    );
    expect(copy.SAVE_FAILED_GENERIC).toBe(
      "Your note wasn't saved because something went wrong. Your text is still here, so you can try again.",
    );
    expect(copy.INFO_PRIMARY).toBe("Your notes are saved on this device");
    expect(copy.INFO_SECONDARY).toBe(
      "They stay in this browser and are never sent anywhere.",
    );
  });

  it("the shell copy is unchanged", () => {
    expect(copy.APP_NAME).toBe("QuickNotes");
    expect(copy.ERROR_FALLBACK).toBe(
      "Something went wrong. Reload the page to try again.",
    );
    expect(copy.NOSCRIPT_MESSAGE).toBe(
      "QuickNotes needs JavaScript to run. Please turn it on and reload the page.",
    );
    expect("EMPTY_STATE_PRIMARY" in copy).toBe(false);
    expect("EMPTY_STATE_SECONDARY" in copy).toBe(false);
  });

  it("formats the counter with en-US thousands separators", () => {
    expect(copy.counterText(180, 200)).toBe("180 of 200 characters");
    expect(copy.counterText(90000, 100000)).toBe(
      "90,000 of 100,000 characters",
    );
    expect(copy.counterText(100001, 100000)).toBe(
      "100,001 of 100,000 characters",
    );
  });

  it("formats the too-long messages", () => {
    expect(copy.titleTooLong(205)).toBe(
      "The title is too long. It has 205 characters and the limit is 200.",
    );
    expect(copy.noteTooLong(100001)).toBe(
      "The note is too long. It has 100,001 characters and the limit is 100,000.",
    );
  });
});
