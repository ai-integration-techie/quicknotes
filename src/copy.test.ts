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

  it("every list-notes string matches the spec exactly", () => {
    expect(copy.SKIP_TO_NOTES).toBe("Skip to your notes");
    expect(copy.NOTES_HEADING).toBe("Your notes");
    expect(copy.NOTES_LOADING).toBe("Loading your notes\u2026");
    expect(copy.NOTES_EMPTY_PRIMARY).toBe("No notes yet");
    expect(copy.NOTES_EMPTY_SECONDARY).toBe(
      "Notes you save will show up here.",
    );
    expect(copy.LIST_UNAVAILABLE).toBe(
      "Your notes couldn't be loaded. This browser isn't letting QuickNotes read its storage right now, which can happen in private browsing. Reload the page to try again.",
    );
    expect(copy.LIST_FAILED).toBe(
      "Your notes couldn't be loaded because something went wrong. Reload the page to try again.",
    );
    expect(copy.UNTITLED_NOTE).toBe("Untitled note");
    expect(copy.PREVIEW_ELLIPSIS).toBe("\u2026");
    expect(copy.BACK_TO_NOTES).toBe("Back to notes");
    expect(copy.NOTE_OPENING).toBe("Opening note\u2026");
    expect(copy.NOTE_NO_TEXT).toBe("This note has no text.");
    expect(copy.NOT_FOUND_HEADING).toBe("Note not found");
    expect(copy.NOT_FOUND).toBe(
      "This note isn't on this device. It may have been deleted, or the link may be wrong.",
    );
    expect(copy.OPEN_FAILED_HEADING).toBe("This note couldn't be opened");
    expect(copy.OPEN_UNAVAILABLE).toBe(
      "This browser isn't letting QuickNotes read its storage right now, which can happen in private browsing. Go back to your notes, or reload the page to try again.",
    );
    expect(copy.OPEN_FAILED).toBe(
      "Something went wrong while opening this note. Go back to your notes, or reload the page to try again.",
    );
    expect(copy.UPDATED_PREFIX).toBe("Updated ");
    expect(copy.updatedLine("just now")).toBe("Updated just now");
    expect(copy.updatedLine("5 minutes ago")).toBe("Updated 5 minutes ago");
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
  it("every edit-delete-note string matches the spec exactly", () => {
    expect(copy.EDIT_BUTTON).toBe("Edit");
    expect(copy.DELETE_BUTTON).toBe("Delete");
    expect(copy.EDIT_HEADING).toBe("Edit note");
    expect(copy.SAVE_CHANGES).toBe("Save changes");
    expect(copy.CANCEL_BUTTON).toBe("Cancel");
    expect(copy.CHANGES_SAVED).toBe("Changes saved.");
    expect(copy.NO_CHANGES).toBe("No changes to save.");
    expect(copy.CHANGES_UNAVAILABLE).toBe(
      "Your changes weren't saved. This browser isn't letting QuickNotes store notes right now, which can happen in private browsing. Your text is still here.",
    );
    expect(copy.CHANGES_FULL).toBe(
      "Your changes weren't saved because there's no storage space left for QuickNotes on this device. Free up some space, then try again. Your text is still here.",
    );
    expect(copy.CHANGES_FAILED).toBe(
      "Your changes weren't saved because something went wrong. Your text is still here, so you can try again.",
    );
    expect(copy.CHANGES_NOT_FOUND).toBe(
      "Your changes weren't saved because this note has been deleted, maybe in another tab. Your text is still here, so you can copy it.",
    );
    expect(copy.DISCARD_HEADING).toBe("Discard your changes?");
    expect(copy.DISCARD_TEXT).toBe(
      "Your changes to this note haven't been saved. Discarding them can't be undone.",
    );
    expect(copy.KEEP_EDITING).toBe("Keep editing");
    expect(copy.DISCARD_CHANGES).toBe("Discard changes");
    expect(copy.DELETE_HEADING).toBe("Delete this note?");
    expect(copy.DELETE_TEXT).toBe(
      "It will be removed from this device for good. This can't be undone.",
    );
    expect(copy.KEEP_NOTE).toBe("Keep note");
    expect(copy.DELETE_NOTE).toBe("Delete note");
    expect(copy.DELETING).toBe("Deleting…");
    expect(copy.NOTE_DELETED).toBe("Note deleted.");
    expect(copy.ALREADY_DELETED).toBe(
      "That note had already been deleted, maybe in another tab.",
    );
    expect(copy.DELETE_UNAVAILABLE).toBe(
      "The note wasn't deleted. This browser isn't letting QuickNotes change its storage right now, which can happen in private browsing. The note is still here.",
    );
    expect(copy.DELETE_FAILED).toBe(
      "The note wasn't deleted because something went wrong. It's still here, so you can try again.",
    );
  });
});
