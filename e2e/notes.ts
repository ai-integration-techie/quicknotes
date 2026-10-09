import { expect, type Locator, type Page } from "@playwright/test";
import { APP_BASE } from "../vite.config";
import { COPY as FORM_COPY, formLocators } from "./form";

/** Copy from the list-notes spec, as e2e checks it. */
export const NOTES_COPY = {
  skip: "Skip to your notes",
  heading: "Your notes",
  loading: "Loading your notes…",
  emptyPrimary: "No notes yet",
  emptySecondary: "Notes you save will show up here.",
  listFailed:
    "Your notes couldn't be loaded because something went wrong. Reload the page to try again.",
  listUnavailable:
    "Your notes couldn't be loaded. This browser isn't letting QuickNotes read its storage right now, which can happen in private browsing. Reload the page to try again.",
  untitled: "Untitled note",
  back: "Back to notes",
  opening: "Opening note…",
  noText: "This note has no text.",
  notFoundHeading: "Note not found",
  openFailedHeading: "This note couldn't be opened",
} as const;

/** The app's path prefix, from the one place it is defined. */
export const BASE = APP_BASE;

/** A note route URL pattern: the app path, then #note/ and an id. */
export const NOTE_URL = new RegExp(
  `${APP_BASE.replace(/\//g, "\\/")}#note\\/[0-9a-f-]{36}$`,
);

export interface SeedNote {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** Fills the form, saves, and waits for "Note saved.". */
export async function saveNote(
  page: Page,
  title: string,
  body: string,
): Promise<void> {
  const form = formLocators(page);
  await form.title.fill(title);
  await form.note.fill(body);
  await form.saveButton.click();
  await expect(form.status).toHaveText(FORM_COPY.saved);
}

/**
 * Writes `notes` straight into quicknotes/notes (schema as note-storage
 * R27: version 1, store `notes` with keyPath `id`). Reload afterwards.
 */
export async function seedNotes(
  page: Page,
  notes: readonly SeedNote[],
): Promise<void> {
  await page.evaluate(
    (records) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("quicknotes", 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore("notes", { keyPath: "id" });
        };
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("notes", "readwrite");
          const store = tx.objectStore("notes");
          for (const record of records) store.put(record);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        };
      }),
    notes,
  );
}

/**
 * Counts quicknotes/notes records. If the database doesn't exist, the
 * upgrade is aborted (so this never creates it) and the count is 0.
 */
export function countStoredNotes(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const request = indexedDB.open("quicknotes");
        request.onupgradeneeded = () => {
          request.transaction?.abort();
        };
        request.onerror = () => resolve(0);
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains("notes")) {
            db.close();
            resolve(0);
            return;
          }
          const count = db
            .transaction("notes", "readonly")
            .objectStore("notes")
            .count();
          count.onsuccess = () => {
            db.close();
            resolve(count.result);
          };
          count.onerror = () => {
            db.close();
            reject(count.error);
          };
        };
      }),
  );
}

/** Counts calls to navigator.storage.persisted() and persist() (init script). */
export async function trackPersistenceCalls(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const counts = { persisted: 0, persist: 0 };
    Object.defineProperty(window, "__persistenceCalls", { value: counts });
    const proto = StorageManager.prototype;
    const persisted = proto.persisted;
    const persist = proto.persist;
    proto.persisted = function wrappedPersisted() {
      counts.persisted += 1;
      return persisted.call(this);
    };
    proto.persist = function wrappedPersist() {
      counts.persist += 1;
      return persist.call(this);
    };
  });
}

/** The persistence call counters (see trackPersistenceCalls). */
export function persistenceCalls(
  page: Page,
): Promise<{ persisted: number; persist: number }> {
  return page.evaluate(() => ({
    ...(
      window as unknown as {
        __persistenceCalls: { persisted: number; persist: number };
      }
    ).__persistenceCalls,
  }));
}

/** Resets the persistence call counters to 0. */
export async function resetPersistenceCalls(page: Page): Promise<void> {
  await page.evaluate(() => {
    const counts = (
      window as unknown as {
        __persistenceCalls: { persisted: number; persist: number };
      }
    ).__persistenceCalls;
    counts.persisted = 0;
    counts.persist = 0;
  });
}

/** Records long tasks from navigation start (buffered observer, init script). */
export async function observeLongTasks(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const tasks: { start: number; duration: number }[] = [];
    Object.defineProperty(window, "__longTasks", { value: tasks });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        tasks.push({ start: entry.startTime, duration: entry.duration });
      }
    }).observe({ type: "longtask", buffered: true });
  });
}

/** Long tasks recorded so far (see observeLongTasks). */
export function longTasks(
  page: Page,
): Promise<{ start: number; duration: number }[]> {
  return page.evaluate(() => [
    ...(
      window as unknown as {
        __longTasks: { start: number; duration: number }[];
      }
    ).__longTasks,
  ]);
}

/** The "Your notes" section. */
export function notesSection(page: Page): Locator {
  return page.getByRole("region", { name: NOTES_COPY.heading });
}

/** The note links in "Your notes". */
export function noteLinks(page: Page): Locator {
  return page.locator("section[aria-labelledby=notes-heading] ul > li > a");
}

/** The note link named `title`. */
export function noteLink(page: Page, title: string): Locator {
  return notesSection(page).getByRole("link", { name: title, exact: true });
}

/** The note view's "Back to notes" link. */
export function backLink(page: Page): Locator {
  return page.getByRole("link", { name: NOTES_COPY.back, exact: true });
}

/** The note view's body element. */
export function noteBody(page: Page): Locator {
  return page.locator("main [data-note-body]");
}

/** A deterministic v4-form id for seeded note `n`. */
export function seedId(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}
