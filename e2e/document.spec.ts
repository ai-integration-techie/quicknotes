import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { R5_EXCEPTIONS } from "../tests/tooling/repo";

const NOSCRIPT_COPY =
  "QuickNotes needs JavaScript to run. Please turn it on and reload the page.";
const DIST = fileURLToPath(new URL("../dist/", import.meta.url));

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });
}

test.describe("document", () => {
  test("build output has index.html, hashed js and css", () => {
    expect(existsSync(`${DIST}index.html`)).toBe(true);
    const assets = readdirSync(`${DIST}assets`);
    expect(assets.some((file) => /-[A-Za-z0-9_-]{8,}\.js$/.test(file))).toBe(
      true,
    );
    expect(assets.some((file) => /-[A-Za-z0-9_-]{8,}\.css$/.test(file))).toBe(
      true,
    );
  });

  test("document head meets R21", async ({ page, request }) => {
    const html = await (await request.get("/")).text();
    expect(html).toMatch(/<meta charset="utf-8"\s*\/?>/i);

    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page).toHaveTitle("QuickNotes");
    const charset = await page.locator("meta[charset]").getAttribute("charset");
    expect(charset?.toLowerCase()).toBe("utf-8");
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
      "content",
      "width=device-width, initial-scale=1",
    );
  });

  test("noscript message shows with JS disabled", async ({
    browser,
    request,
  }) => {
    const html = await (await request.get("/")).text();
    const noscript = /<noscript>([\s\S]*?)<\/noscript>/.exec(html)?.[1] ?? "";
    expect(
      noscript
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    ).toBe(NOSCRIPT_COPY);

    const context = await browser.newContext({ javaScriptEnabled: false });
    try {
      const page = await context.newPage();
      await page.goto("/");
      // Playwright's text selectors skip <noscript>, so target its content directly.
      const message = page.locator("noscript p");
      await expect(message).toBeVisible();
      await expect(message).toHaveText(NOSCRIPT_COPY);
    } finally {
      await context.close();
    }
  });

  test("R5 licence exceptions are not shipped", () => {
    const files = filesUnder(DIST);
    expect(files.length).toBeGreaterThan(0);
    const names = Object.keys(R5_EXCEPTIONS);
    expect(names.length).toBe(3);

    const hits = files.flatMap((file) => {
      const content = readFileSync(file, "latin1");
      const rel = relative(DIST, file);
      return names.flatMap((name) =>
        rel.includes(name) ||
        content.includes(name) ||
        content.includes(`node_modules/${name}`)
          ? [`${rel}: ${name}`]
          : [],
      );
    });
    expect(hits).toEqual([]);
  });
});
