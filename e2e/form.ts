import { expect, type Locator, type Page } from "@playwright/test";
import { gotoApp } from "./app";

/** Copy from the create-note spec, as e2e checks it. */
export const COPY = {
  heading: "New note",
  titleLabel: "Title",
  noteLabel: "Note",
  save: "Save note",
  saving: "Saving…",
  saved: "Note saved.",
  bothEmpty: "Add a title or some text first.",
  unavailable:
    "Your note wasn't saved. This browser isn't letting QuickNotes store notes right now, which can happen in private browsing. Your text is still here.",
  infoPrimary: "Your notes are saved on this device",
  infoSecondary: "They stay in this browser and are never sent anywhere.",
  titleTooLong: (n: number) =>
    `The title is too long. It has ${n} characters and the limit is 200.`,
} as const;

/**
 * The hint follows the host's navigator.platform (Cmd on a Mac, Ctrl on
 * CI's Linux), so e2e never asserts one fixed text (create-note plan D6).
 */
export const HINT = /^Press (?:Cmd|Ctrl)\+Enter to save\.$/;

export interface FormLocators {
  readonly title: Locator;
  readonly note: Locator;
  readonly saveButton: Locator;
  readonly hint: Locator;
  readonly status: Locator;
  readonly alert: Locator;
}

export function formLocators(page: Page): FormLocators {
  return {
    title: page.getByRole("textbox", { name: COPY.titleLabel, exact: true }),
    note: page.getByRole("textbox", { name: COPY.noteLabel, exact: true }),
    saveButton: page.getByRole("button", { name: COPY.save, exact: true }),
    hint: page.getByText(HINT),
    status: page.locator("main form [role=status]"),
    alert: page.locator("main form [role=alert]"),
  };
}

/** Loads the app and waits until the form is ready (focus in Title). */
export async function openForm(page: Page): Promise<FormLocators> {
  await gotoApp(page);
  const form = formLocators(page);
  await expect(form.title).toBeFocused();
  return form;
}

/** Puts the form in the title-too-long state (205 characters, saved). */
export async function showTitleTooLong(
  page: Page,
  form: FormLocators,
  length = 205,
): Promise<void> {
  await form.title.fill("a".repeat(length));
  await form.saveButton.click();
  await expect(page.getByText(COPY.titleTooLong(length))).toBeVisible();
}

export interface StoredNote {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** Reads every record in the app's notes store directly in the page. */
export function readStoredNotes(page: Page): Promise<StoredNote[]> {
  return page.evaluate(
    () =>
      new Promise<StoredNote[]>((resolve, reject) => {
        const request = indexedDB.open("quicknotes");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const read = db
            .transaction("notes", "readonly")
            .objectStore("notes")
            .getAll();
          read.onsuccess = () => {
            db.close();
            resolve(read.result as StoredNote[]);
          };
          read.onerror = () => {
            db.close();
            reject(read.error);
          };
        };
      }),
  );
}

/** Names of the databases this origin holds. */
export function databaseNames(page: Page): Promise<string[]> {
  return page.evaluate(async () =>
    (await indexedDB.databases()).map((info) => info.name ?? ""),
  );
}
