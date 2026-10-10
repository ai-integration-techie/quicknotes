import { expect, test } from "@playwright/test";
import {
  backLink,
  btn,
  dialogBox,
  EDIT_COPY,
  heading,
  noteField,
  noteLinks,
  openFromList,
  readStoredNotes,
  saveAB,
  startEdit,
  viewStatus,
} from "./editDelete";
import { noteBody, NOTES_COPY } from "./notes";

/** edit-delete-note: editing. Each test uses its own `page` context (R47). */
test.describe("edit a note", () => {
  test("edit and save with Ctrl+Enter: Changes saved., first in the list, record keeps id and createdAt with a later updatedAt, survives reload (AC-19)", async ({
    page,
  }) => {
    await saveAB(page);
    const before = (await readStoredNotes(page)).find(
      (n) => n.title === "First",
    );
    await openFromList(page, "First");
    await startEdit(page);
    await noteField(page).fill("one\nmore 😀");
    await noteField(page).press("Control+Enter");
    await expect(viewStatus(page)).toHaveText(EDIT_COPY.changesSaved);
    await expect(heading(page, "First")).toBeFocused();
    await expect(noteBody(page)).toHaveText("one\nmore 😀");
    await backLink(page).click();
    await expect(noteLinks(page).first()).toContainText("First");
    const after = (await readStoredNotes(page)).find(
      (n) => n.id === before?.id,
    );
    expect(after?.createdAt).toBe(before?.createdAt);
    expect(after?.body).toBe("one\nmore 😀");
    expect(after!.updatedAt).toBeGreaterThan(before!.updatedAt);
    await page.reload();
    await expect(noteLinks(page).first()).toContainText("First");
  });

  test("a no-op save writes nothing and keeps the order after reload (AC-20)", async ({
    page,
  }) => {
    await saveAB(page);
    const before = (await readStoredNotes(page)).find(
      (n) => n.title === "First",
    );
    await openFromList(page, "First");
    await startEdit(page);
    await btn(page, EDIT_COPY.saveChanges).click();
    await expect(viewStatus(page)).toHaveText(EDIT_COPY.noChanges);
    const after = (await readStoredNotes(page)).find(
      (n) => n.id === before?.id,
    );
    expect(after?.updatedAt).toBe(before?.updatedAt);
    await page.reload();
    await expect(noteLinks(page).nth(0)).toContainText("Second");
    await expect(noteLinks(page).nth(1)).toContainText("First");
  });

  test("browser Back with changes asks; Keep editing restores the URL with the same history.length; Discard then Forward shows the original (AC-25)", async ({
    page,
  }) => {
    await saveAB(page);
    await openFromList(page, "First");
    const noteUrl = page.url();
    await startEdit(page);
    await noteField(page).press("End");
    await noteField(page).pressSequentially("typed");
    const length = await page.evaluate(() => history.length);
    await page.goBack();
    await expect(dialogBox(page)).toBeVisible();
    await expect(btn(page, EDIT_COPY.keepEditing)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(dialogBox(page)).toHaveCount(0);
    await expect(page).toHaveURL(noteUrl);
    await expect(noteField(page)).toHaveValue(/typed$/);
    expect(await page.evaluate(() => history.length)).toBe(length);

    await page.goBack();
    await btn(page, EDIT_COPY.discardChanges).click();
    await expect(heading(page, NOTES_COPY.heading)).toBeVisible();
    expect(page.url()).not.toContain("#note/");
    await expect(page.getByRole("link", { name: /^First/ })).toBeFocused();
    await page.goForward();
    await expect(noteBody(page)).toHaveText("one");
    await expect(btn(page, EDIT_COPY.edit)).toBeVisible();
  });

  test("closing with changes raises beforeunload (AC-27)", async ({ page }) => {
    await saveAB(page);
    await openFromList(page, "First");
    await startEdit(page);
    await noteField(page).pressSequentially("x");
    const dialog = page.waitForEvent("dialog");
    await page.close({ runBeforeUnload: true });
    const raised = await dialog;
    expect(raised.type()).toBe("beforeunload");
    await raised.dismiss();
  });

  test("reloading with changes reopens the note read-only (AC-27)", async ({
    page,
  }) => {
    await saveAB(page);
    await openFromList(page, "First");
    await startEdit(page);
    await noteField(page).pressSequentially("x");
    page.on("dialog", (dialog) => void dialog.accept());
    await page.reload();
    await expect(noteBody(page)).toHaveText("one");
    await expect(page.locator("main").getByRole("textbox")).toHaveCount(0);
    await expect(heading(page, "First")).toBeFocused();
  });
});
