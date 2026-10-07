import { describe, expect, it } from "vitest";
import { clickSave, paste, renderApp } from "../test/renderApp";
import { createSpyRepository } from "../test/repositoryDoubles";

function beforeUnloadPrevented(): boolean {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

describe("NoteForm unsaved-text warning", () => {
  it("beforeunload is prevented only while a field has text, and not after a save (AC-35)", async () => {
    const app = renderApp(createSpyRepository());
    expect(beforeUnloadPrevented()).toBe(false);

    paste(app.title, " ");
    expect(beforeUnloadPrevented()).toBe(true);

    paste(app.title, "");
    expect(beforeUnloadPrevented()).toBe(false);

    paste(app.note, "a");
    expect(beforeUnloadPrevented()).toBe(true);

    await clickSave(app);
    expect(app.note.value).toBe("");
    expect(beforeUnloadPrevented()).toBe(false);
  });
});
