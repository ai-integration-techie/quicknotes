import type { Page } from "@playwright/test";

/**
 * Makes the browser database refuse to open, as private browsing or
 * blocked site data can: `open` throws a SecurityError (create-note AC-34).
 * Must run before the app loads.
 */
export async function blockIndexedDb(page: Page): Promise<void> {
  await page.addInitScript(() => {
    IDBFactory.prototype.open = function open(): IDBOpenDBRequest {
      throw new DOMException("blocked", "SecurityError");
    };
  });
}

/**
 * Makes every database open hang forever, so a save stays in the saving
 * state (create-note AC-56). The returned request is an EventTarget whose
 * events never fire; the storage layer only listens on it.
 */
export async function hangIndexedDb(page: Page): Promise<void> {
  await page.addInitScript(() => {
    IDBFactory.prototype.open = function open(): IDBOpenDBRequest {
      return new EventTarget() as IDBOpenDBRequest;
    };
  });
}
