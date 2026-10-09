import { expect, test } from "@playwright/test";
import { gotoApp } from "./app";
import { COPY, databaseNames, formLocators, openForm } from "./form";

/**
 * create-note: the form in a real browser. Each test uses the per-test
 * `page` fixture, so it runs in its own fresh browser context (R28).
 */
test.describe("create note form", () => {
  test("Title is focused within 1000 ms of navigation start and takes typing without a click (AC-4)", async ({
    page,
  }) => {
    await gotoApp(page);
    const focusedAt = await page.waitForFunction(
      () => {
        const active = document.activeElement;
        return active instanceof HTMLInputElement &&
          active.labels?.[0]?.textContent === "Title"
          ? performance.now()
          : false;
      },
      undefined,
      { polling: "raf" },
    );
    expect(await focusedAt.jsonValue()).toBeLessThan(1000);

    await page.keyboard.type("Hello");
    await expect(formLocators(page).title).toHaveValue("Hello");
  });

  test("real Enter in Title moves to Note without saving (AC-10)", async ({
    page,
  }) => {
    const form = await openForm(page);
    const url = page.url();
    await page.keyboard.type("a");
    await page.keyboard.press("Enter");

    await expect(form.note).toBeFocused();
    await expect(form.title).toHaveValue("a");
    await expect(form.status).toHaveText("");
    expect(page.url()).toBe(url);
    expect(await databaseNames(page)).toEqual([]);
  });

  test("250 inserted characters are kept, the counter reads 250 of 200, no error shows (AC-28)", async ({
    page,
  }) => {
    const form = await openForm(page);
    await page.keyboard.insertText("a".repeat(250));

    expect(await form.title.inputValue()).toHaveLength(250);
    await expect(
      page.getByText("250 of 200 characters", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/too long/)).toHaveCount(0);
    await expect(form.title).not.toHaveAttribute("aria-invalid", "true");
    await expect(form.alert).toHaveText("");
  });

  test("closing with unsaved text raises the beforeunload dialog (AC-36)", async ({
    page,
  }) => {
    const form = await openForm(page);
    await form.note.focus();
    await page.keyboard.type("unsaved");

    const dialogType = new Promise<string>((resolve) => {
      page.once("dialog", (dialog) => {
        resolve(dialog.type());
        void dialog.dismiss();
      });
    });
    await page.close({ runBeforeUnload: true });
    expect(await dialogType).toBe("beforeunload");
  });

  test("closing with nothing typed raises no dialog (AC-36)", async ({
    page,
  }) => {
    const form = await openForm(page);
    // A click gives the page user activation, so only the empty fields
    // explain the missing dialog.
    await form.title.click();
    const dialogs: string[] = [];
    page.on("dialog", (dialog) => {
      dialogs.push(dialog.type());
      void dialog.dismiss();
    });

    const closed = page.waitForEvent("close");
    await page.close({ runBeforeUnload: true });
    await closed;
    expect(dialogs).toEqual([]);
  });

  test("the New note heading and info text are shown (AC-6)", async ({
    page,
  }) => {
    await openForm(page);
    await expect(
      page.getByRole("heading", { level: 2, name: COPY.heading }),
    ).toBeVisible();
    await expect(
      page.getByText(COPY.infoPrimary, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(COPY.infoSecondary, { exact: true }),
    ).toBeVisible();
  });
});
