import { expect, test } from "@playwright/test";
import { gotoApp } from "./app";
import {
  COPY,
  databaseNames,
  formLocators,
  openForm,
  readStoredNotes,
} from "./form";
import { countStoredNotes } from "./notes";
import { blockIndexedDb } from "./storageFaults";

/**
 * create-note: saving in a real browser. Every test here stores (or tries
 * to store) a note, so each one uses the per-test `page` fixture, which
 * Playwright gives a fresh browser context (R28). Nothing leaks into
 * list-notes AC-58's fresh load.
 */
test.describe("save note", () => {
  test("IndexedDB open throwing SecurityError shows the unavailable copy and keeps the title (AC-34)", async ({
    page,
  }) => {
    await blockIndexedDb(page);
    const form = await openForm(page);
    await page.keyboard.type("Keep me");
    await form.saveButton.click();

    await expect(
      page.getByText(COPY.unavailable, { exact: true }),
    ).toBeVisible();
    await expect(form.title).toHaveValue("Keep me");
  });

  test("typing without saving stores nothing and leaves the URL unchanged (AC-39; revised by list-notes AC-59)", async ({
    page,
  }) => {
    await gotoApp(page, { waitUntil: "networkidle" });
    const form = formLocators(page);
    await expect(form.title).toBeFocused();
    const url = page.url();

    await page.keyboard.type("draft");
    await form.note.focus();
    await page.keyboard.type("draft");
    await page.waitForLoadState("networkidle");

    const storage = await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
      cookie: document.cookie,
    }));
    expect(storage).toEqual({
      local: 0,
      session: 0,
      cookie: "",
    });
    expect(await countStoredNotes(page)).toBe(0);
    expect(page.url()).toBe(url);
  });

  test("a saved note is the only record in quicknotes/notes (AC-40) and survives a reload unchanged (AC-41)", async ({
    page,
  }) => {
    const form = await openForm(page);

    const saved =
      await test.step("save writes exactly one record (AC-40)", async () => {
        await form.title.fill("E2E title");
        await form.note.fill("E2E body\nline 2");
        await form.saveButton.click();
        await expect(form.status).toHaveText(COPY.saved);

        const notes = await readStoredNotes(page);
        expect(notes).toHaveLength(1);
        expect(notes[0]).toMatchObject({
          title: "E2E title",
          body: "E2E body\nline 2",
        });
        expect(await databaseNames(page)).toContain("quicknotes");
        return notes[0];
      });

    await test.step("reload keeps id, title, body, createdAt, updatedAt; form empty, focus in Title (AC-41)", async () => {
      await page.reload();
      await expect(form.title).toBeFocused();
      await expect(form.title).toHaveValue("");
      await expect(form.note).toHaveValue("");

      const notes = await readStoredNotes(page);
      expect(notes).toHaveLength(1);
      expect(notes[0]).toEqual(saved);
    });
  });

  test("saving a note sends no request (AC-47)", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await gotoApp(page, { waitUntil: "networkidle" });
    const form = formLocators(page);
    await expect(form.title).toBeFocused();
    requests.length = 0;

    await form.title.fill("Offline note");
    await form.note.fill("Never sent anywhere");
    await form.saveButton.click();
    await expect(form.status).toHaveText(COPY.saved);

    expect(requests).toEqual([]);
  });
});
