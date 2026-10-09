import { expect, test } from "@playwright/test";
import { gotoApp } from "./app";
import {
  BASE,
  countStoredNotes,
  NOTES_COPY,
  persistenceCalls,
  trackPersistenceCalls,
} from "./notes";

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

  test("fresh load stores no note and no web storage, sets no cookies, calls no persistence API and requests only app files (AC-58; revised project-foundation AC-33)", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      const requests: { method: string; url: string }[] = [];
      page.on("request", (request) =>
        requests.push({ method: request.method(), url: request.url() }),
      );
      await trackPersistenceCalls(page);

      await gotoApp(page, { waitUntil: "networkidle" });
      await expect(page.getByText(NOTES_COPY.emptyPrimary)).toBeVisible();

      const storage = await page.evaluate(async () => ({
        local: localStorage.length,
        session: sessionStorage.length,
        cookie: document.cookie,
        caches: await caches.keys(),
      }));
      expect(storage).toEqual({
        local: 0,
        session: 0,
        cookie: "",
        caches: [],
      });
      expect(await context.cookies()).toEqual([]);
      expect(await persistenceCalls(page)).toEqual({
        persisted: 0,
        persist: 0,
      });
      // The empty database may now exist (owner decision); no note does.
      expect(await countStoredNotes(page)).toBe(0);

      const origin = new URL(page.url()).origin;
      expect(requests.length).toBeGreaterThan(0);
      const unexpected = requests.filter(({ method, url }) => {
        const parsed = new URL(url);
        return !(
          method === "GET" &&
          parsed.origin === origin &&
          (parsed.pathname.startsWith(BASE) ||
            parsed.pathname === "/favicon.ico")
        );
      });
      expect(unexpected).toEqual([]);
    } finally {
      await context.close();
    }
  });
});
