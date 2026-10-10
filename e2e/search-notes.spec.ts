import { expect, test, type Page } from "@playwright/test";
import { gotoApp } from "./app";
import { formLocators, openForm } from "./form";
import { noteLink, NOTES_COPY, saveNote } from "./notes";
import { clearSearch, searchbox, shownNoteLinks } from "./search";

/** search-notes: the query in memory, and keyboard order. Each test has its own context (R31). */

/** Saves A, B, then C, so the list shows C, B, A. */
async function saveCBA(page: Page): Promise<void> {
  await openForm(page);
  await saveNote(page, "Groceries", "Shopping for the party");
  await saveNote(page, "Ideas", "café plans");
  await saveNote(page, "Shopping list", "milk");
  await expect(shownNoteLinks(page)).toHaveCount(3);
}

function linkTitles(page: Page): Promise<string[]> {
  return shownNoteLinks(page).evaluateAll((links) =>
    links.map(
      (a) =>
        document.getElementById(a.getAttribute("aria-labelledby") ?? "")
          ?.textContent ?? "",
    ),
  );
}

test.describe("search notes", () => {
  test("query never in URL, history state, title or storage; kept across open and Back; gone after reload and in a second page (AC-18)", async ({
    page,
  }) => {
    await saveCBA(page);
    await searchbox(page).fill("SECRET-Q");
    await expect(page.getByText("No matching notes")).toBeVisible();
    expect(page.url()).not.toContain("SECRET");
    const state = await page.evaluate(() => ({
      history: JSON.stringify(history.state) ?? "",
      title: document.title,
      local: localStorage.length,
      session: sessionStorage.length,
      cookie: document.cookie,
    }));
    expect(state.history).not.toContain("SECRET");
    expect(state).toMatchObject({
      title: "QuickNotes",
      local: 0,
      session: 0,
      cookie: "",
    });

    await clearSearch(page).click();
    await searchbox(page).pressSequentially("shop");
    await expect(shownNoteLinks(page)).toHaveCount(2);
    await noteLink(page, "Shopping list").click();
    await expect(
      page.getByRole("heading", { level: 2, name: "Shopping list" }),
    ).toBeFocused();
    await page.goBack();
    await expect(noteLink(page, "Shopping list")).toBeFocused();
    await expect(searchbox(page)).toHaveValue("shop");
    expect(await linkTitles(page)).toEqual(["Shopping list", "Groceries"]);

    await page.reload();
    await expect(searchbox(page)).toHaveValue("");
    await expect(shownNoteLinks(page)).toHaveCount(3);

    const second = await page.context().newPage();
    await gotoApp(second);
    await expect(searchbox(second)).toHaveValue("");
    await expect(shownNoteLinks(second)).toHaveCount(3);
    await second.close();
  });

  test("skip link then Tab reaches Search notes, then Clear search, then the note; Save note → Search notes → note (AC-23)", async ({
    page,
  }) => {
    const form = await openForm(page);
    await saveNote(page, "Alpha", "a");
    await form.title.focus();
    await page.keyboard.press("Shift+Tab");
    await expect(
      page.getByRole("link", { name: NOTES_COPY.skip }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { level: 2, name: NOTES_COPY.heading }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(searchbox(page)).toBeFocused();
    await page.keyboard.type("a");
    await expect(clearSearch(page)).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(clearSearch(page)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(noteLink(page, "Alpha")).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(searchbox(page)).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(searchbox(page)).toHaveValue("");

    await formLocators(page).saveButton.focus();
    await page.keyboard.press("Tab");
    await expect(searchbox(page)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(noteLink(page, "Alpha")).toBeFocused();
  });
});
