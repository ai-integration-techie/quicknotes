import type { Page, Response } from "@playwright/test";

/**
 * Where every spec loads the app from, relative to Playwright's `baseURL`.
 * It must stay relative: a root path like "/" resolves to the server root,
 * which Vite redirects to the base but GitHub Pages does not.
 */
export const APP_PATH = "./";

type GotoOptions = Parameters<Page["goto"]>[1];

/**
 * Loads the app shell and returns the main navigation response. `hash`
 * (for example `#note/<id>`) opens a route (list-notes plan D14).
 */
export async function gotoApp(
  page: Page,
  options?: GotoOptions,
  hash = "",
): Promise<Response> {
  const response = await page.goto(APP_PATH + hash, options);
  if (!response) throw new Error(`No navigation response for ${APP_PATH}`);
  return response;
}
