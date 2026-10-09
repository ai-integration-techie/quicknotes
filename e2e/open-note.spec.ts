import { expect, test, type Page } from "@playwright/test";
import { gotoApp } from "./app";
import { formLocators, openForm } from "./form";
import {
  backLink,
  NOTE_URL,
  noteBody,
  noteLink,
  NOTES_COPY,
  saveNote,
} from "./notes";

/** list-notes: opening notes in a real browser. Each test has its own context (R43). */
function heading(page: Page, name: string) {
  return page.getByRole("heading", { level: 2, name, exact: true });
}

function historyLength(page: Page): Promise<number> {
  return page.evaluate(() => history.length);
}

test.describe("open note", () => {
  test("click, Back, Forward, reload and Back to notes behave as browser history (AC-32)", async ({
    page,
  }) => {
    await openForm(page);
    await saveNote(page, "A", "a");
    await saveNote(page, "B", "b");

    await noteLink(page, "A").click();
    await expect(page).toHaveURL(NOTE_URL);
    await expect(heading(page, "A")).toBeFocused();

    await page.goBack();
    await expect(noteLink(page, "A")).toBeFocused();
    expect(page.url()).not.toContain("#note/");

    await page.goForward();
    await expect(heading(page, "A")).toBeFocused();

    await page.reload();
    await expect(heading(page, "A")).toBeFocused();

    // Spec note 1: history.length is read just before "Back to notes".
    const before = await historyLength(page);
    await backLink(page).click();
    await expect(noteLink(page, "A")).toBeFocused();
    expect(page.url()).not.toContain("#note/");
    expect(await historyLength(page)).toBe(before);
  });

  test("Back to notes after opening from the list goes back instead of adding an entry (AC-33)", async ({
    page,
  }) => {
    await openForm(page);
    await saveNote(page, "A", "a");
    await noteLink(page, "A").click();
    await expect(heading(page, "A")).toBeFocused();

    const before = await historyLength(page);
    await backLink(page).click();
    await expect(noteLink(page, "A")).toBeFocused();
    expect(await historyLength(page)).toBe(before);

    await page.goForward();
    await expect(heading(page, "A")).toBeFocused();
  });

  test("a note opens with Enter and with a tap (AC-35)", async ({
    page,
    browser,
  }) => {
    await openForm(page);
    await saveNote(page, "Keyed", "k");
    await formLocators(page).title.focus();
    for (let i = 0; i < 10; i += 1) {
      await page.keyboard.press("Tab");
      if (
        await noteLink(page, "Keyed").evaluate(
          (el) => el === document.activeElement,
        )
      )
        break;
    }
    await expect(noteLink(page, "Keyed")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(heading(page, "Keyed")).toBeFocused();

    const context = await browser.newContext({ hasTouch: true });
    try {
      const touchPage = await context.newPage();
      await openForm(touchPage);
      await saveNote(touchPage, "Tapped", "t");
      await noteLink(touchPage, "Tapped").tap();
      await expect(heading(touchPage, "Tapped")).toBeFocused();
    } finally {
      await context.close();
    }
  });

  test("an unknown id shows Note not found, focused, and Back to notes shows the list (AC-36)", async ({
    page,
  }) => {
    await gotoApp(
      page,
      undefined,
      "#note/00000000-0000-4000-8000-000000000000",
    );
    await expect(heading(page, NOTES_COPY.notFoundHeading)).toBeFocused();
    await backLink(page).click();
    await expect(
      page.getByRole("heading", { level: 2, name: NOTES_COPY.heading }),
    ).toBeVisible();
    expect(page.url()).not.toContain("#note/");
  });

  test("the body keeps line breaks, spaces, tabs, emoji and RTL text, in pre-wrap (AC-37)", async ({
    page,
  }) => {
    const body = "line one\nline two\n\n    indented\t😀 עברית";
    await openForm(page);
    await saveNote(page, "Spacing", body);
    await noteLink(page, "Spacing").click();
    await expect(heading(page, "Spacing")).toBeFocused();

    const measured = await noteBody(page).evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        text: el.textContent,
        whiteSpace: style.whiteSpace,
        height: el.getBoundingClientRect().height,
        lineHeight: parseFloat(style.lineHeight),
      };
    });
    expect(measured.text).toBe(body);
    expect(measured.whiteSpace).toBe("pre-wrap");
    expect(measured.height).toBeGreaterThanOrEqual(4 * measured.lineHeight);
  });

  test("unsaved text survives open and Back, and closing during the view raises beforeunload (AC-39)", async ({
    page,
  }) => {
    const form = await openForm(page);
    await saveNote(page, "A", "a");
    await form.note.fill("half a thought");

    await noteLink(page, "A").click();
    await expect(heading(page, "A")).toBeFocused();
    await page.goBack();
    await expect(form.note).toHaveValue("half a thought");

    await noteLink(page, "A").click();
    await expect(heading(page, "A")).toBeFocused();
    const dialogType = new Promise<string>((resolve) => {
      page.once("dialog", (dialog) => {
        resolve(dialog.type());
        void dialog.dismiss();
      });
    });
    await page.close({ runBeforeUnload: true });
    expect(await dialogType).toBe("beforeunload");
  });
});
