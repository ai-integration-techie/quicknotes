import { expect, test } from "@playwright/test";
import { gotoApp } from "./app";

test.describe("privacy", () => {
  test("no web fonts; h1 uses system stack", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));

    await gotoApp(page, { waitUntil: "networkidle" });

    expect(
      requests.filter((url) => /\.(woff2?|ttf|otf)(\?|$)/i.test(url)),
    ).toEqual([]);
    const fontFamily = await page
      .getByRole("heading", { level: 1 })
      .evaluate((element) => getComputedStyle(element).fontFamily);
    expect(fontFamily).toMatch(/^(ui-sans-serif|system-ui)/);
  });

  test("all requests are same-origin", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));

    await gotoApp(page, { waitUntil: "networkidle" });

    const origin = new URL(page.url()).origin;
    expect(requests.length).toBeGreaterThan(0);
    expect(requests.filter((url) => new URL(url).origin !== origin)).toEqual(
      [],
    );
  });

  test("no storage or cookies on fresh load", async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await gotoApp(page, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      const storage = await page.evaluate(async () => ({
        local: localStorage.length,
        session: sessionStorage.length,
        cookie: document.cookie,
        databases: (await indexedDB.databases()).length,
      }));
      expect(storage).toEqual({
        local: 0,
        session: 0,
        cookie: "",
        databases: 0,
      });
      expect(await context.cookies()).toEqual([]);
    } finally {
      await context.close();
    }
  });
});
