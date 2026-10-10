import { expect, test } from "@playwright/test";
import { gotoApp } from "./app";
import {
  btn,
  editAlert,
  EDIT_COPY,
  loadAtNote,
  heading,
  noteField,
  noteLinks,
  notesStatus,
  openFromList,
  readStoredNotes,
  saveAB,
  startEdit,
} from "./editDelete";
import { NOTES_COPY, saveNote } from "./notes";

async function confirmDelete(page: import("@playwright/test").Page) {
  await btn(page, EDIT_COPY.delete).click();
  await btn(page, EDIT_COPY.deleteNote).click();
}

/** edit-delete-note: deleting. Each storing test has its own context (R47). */
test.describe("delete a note", () => {
  test("delete after opening from the list goes back without adding history; Forward shows Note not found (AC-37)", async ({
    page,
  }) => {
    await saveAB(page);
    await openFromList(page, "First");
    const length = await page.evaluate(() => history.length);
    await confirmDelete(page);
    await expect(notesStatus(page)).toHaveText(EDIT_COPY.noteDeleted);
    await expect(heading(page, NOTES_COPY.heading)).toBeFocused();
    await expect(noteLinks(page)).toHaveCount(1);
    expect(page.url()).not.toContain("#note/");
    expect(await page.evaluate(() => history.length)).toBe(length);
    await page.goForward();
    await expect(heading(page, NOTES_COPY.notFoundHeading)).toBeFocused();
  });

  test("delete after loading at the note URL replaces the entry; reload shows only B (AC-37)", async ({
    page,
  }) => {
    await saveAB(page);
    const first = (await readStoredNotes(page)).find(
      (n) => n.title === "First",
    );
    await loadAtNote(page, first?.id ?? "");
    await expect(heading(page, "First")).toBeFocused();
    const length = await page.evaluate(() => history.length);
    await confirmDelete(page);
    await expect(notesStatus(page)).toHaveText(EDIT_COPY.noteDeleted);
    expect(new URL(page.url()).hash).toBe("");
    expect(await page.evaluate(() => history.length)).toBe(length);
    await page.reload();
    await expect(noteLinks(page)).toHaveCount(1);
    expect((await readStoredNotes(page)).map((n) => n.title)).toEqual([
      "Second",
    ]);
  });

  for (const second of ["delete", "edit"] as const) {
    test(`two tabs: a note deleted in one tab is reported in the other (${second}) (AC-42)`, async ({
      browser,
    }) => {
      const context = await browser.newContext();
      try {
        const one = await context.newPage();
        const two = await context.newPage();
        await gotoApp(one);
        await saveNote(one, "Shared", "text");
        const id = (await readStoredNotes(one))[0]?.id;
        await gotoApp(two);
        await openFromList(one, "Shared");
        await openFromList(two, "Shared");
        await confirmDelete(one);
        await expect(notesStatus(one)).toHaveText(EDIT_COPY.noteDeleted);
        if (second === "delete") {
          await confirmDelete(two);
          await expect(notesStatus(two)).toHaveText(EDIT_COPY.alreadyDeleted);
          await expect(heading(two, NOTES_COPY.heading)).toBeFocused();
        } else {
          await startEdit(two);
          await noteField(two).press("End");
          await noteField(two).pressSequentially("x");
          await btn(two, EDIT_COPY.saveChanges).click();
          await expect(editAlert(two)).toHaveText(EDIT_COPY.changesNotFound);
          await expect(noteField(two)).toHaveValue("textx");
        }
        expect((await readStoredNotes(one)).some((n) => n.id === id)).toBe(
          false,
        );
      } finally {
        await context.close();
      }
    });
  }
});
