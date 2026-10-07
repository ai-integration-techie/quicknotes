import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { APP_BASE } from "../vite.config";
import { gotoApp } from "./app";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const ASSET_PREFIX = `${APP_BASE}assets/`;

function attributeValues(html: string, tag: string, attr: string): string[] {
  const tags = html.match(new RegExp(`<${tag}\\b[^>]*>`, "gi")) ?? [];
  return tags.flatMap((element) => {
    const value = new RegExp(`\\b${attr}\\s*=\\s*["']([^"']*)["']`, "i").exec(
      element,
    )?.[1];
    return value === undefined ? [] : [value];
  });
}

test.describe("base path", () => {
  test(`built index.html references only ${APP_BASE} assets`, () => {
    const html = readFileSync(`${DIST}index.html`, "utf8");
    const scripts = attributeValues(html, "script", "src");
    const links = attributeValues(html, "link", "href");
    expect(scripts.length).toBeGreaterThan(0);
    expect(links.length).toBeGreaterThan(0);
    for (const url of [...scripts, ...links]) {
      expect(url.startsWith(ASSET_PREFIX), url).toBe(true);
    }

    const everyUrl = [
      ...html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']*)["']/gi),
    ]
      .map((match) => match[1] ?? "")
      .filter((url) => url.startsWith("/"));
    expect(everyUrl.filter((url) => !url.startsWith(APP_BASE))).toEqual([]);

    const moduleTag =
      html.match(/<script\b[^>]*\btype\s*=\s*["']module["'][^>]*>/i)?.[0] ?? "";
    const entry = /\bsrc\s*=\s*["']([^"']+)["']/.exec(moduleTag)?.[1] ?? "";
    expect(entry).toMatch(/-[A-Za-z0-9_-]{8,}\.js$/);
    expect(
      existsSync(`${DIST}assets/${entry.slice(ASSET_PREFIX.length)}`),
    ).toBe(true);
  });

  test(`shell loads under ${APP_BASE} with every JS/CSS 200 from the sub-path`, async ({
    page,
  }) => {
    const assets: { path: string; status: number }[] = [];
    page.on("response", (response) => {
      const path = new URL(response.url()).pathname;
      if (/\.(js|css)$/.test(path)) {
        assets.push({ path, status: response.status() });
      }
    });

    await gotoApp(page, { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { level: 1, name: "QuickNotes" }),
    ).toBeVisible();
    await expect(page.getByText("No notes yet", { exact: true })).toBeVisible();

    expect(assets.some(({ path }) => path.endsWith(".js"))).toBe(true);
    expect(assets.some(({ path }) => path.endsWith(".css"))).toBe(true);
    for (const asset of assets) {
      expect(asset.status, asset.path).toBe(200);
      expect(asset.path.startsWith(APP_BASE), asset.path).toBe(true);
    }
  });

  test(`Playwright baseURL and webServer.url end in ${APP_BASE}`, () => {
    const info = test.info();
    expect(String(info.project.use.baseURL)).toMatch(
      new RegExp(`${APP_BASE}$`),
    );
    const servers = info.config.webServer ? [info.config.webServer] : [];
    expect(servers).toHaveLength(1);
    expect(String(servers[0]?.url)).toMatch(new RegExp(`${APP_BASE}$`));
  });

  test(`specs navigate straight to ${APP_BASE} without a redirect`, async ({
    page,
  }) => {
    const response = await gotoApp(page);
    expect(new URL(page.url()).pathname.startsWith(APP_BASE)).toBe(true);
    expect(response.request().redirectedFrom()).toBeNull();
    expect(response.status()).toBe(200);
  });

  test("root navigation is detected as a redirect", async ({ page }) => {
    // Self-check: the server root only reaches the app through Vite's redirect,
    // which GitHub Pages does not do, so the test above must see no redirect.
    const response = await page.goto("/");
    const redirectedFrom = response?.request().redirectedFrom();
    expect(redirectedFrom).not.toBeNull();
    expect(new URL(redirectedFrom!.url()).pathname).toBe("/");
  });
});
