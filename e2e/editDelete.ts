import { expect, type Locator, type Page } from "@playwright/test";
import { gotoApp } from "./app";
import {
  backLink,
  noteLink,
  noteLinks,
  NOTES_COPY,
  saveNote,
  seedNotes,
  type SeedNote,
} from "./notes";

/** Copy from the edit-delete-note spec, as e2e checks it. */
export const EDIT_COPY = {
  edit: "Edit",
  delete: "Delete",
  editHeading: "Edit note",
  saveChanges: "Save changes",
  cancel: "Cancel",
  changesSaved: "Changes saved.",
  noChanges: "No changes to save.",
  changesNotFound:
    "Your changes weren't saved because this note has been deleted, maybe in another tab. Your text is still here, so you can copy it.",
  discardHeading: "Discard your changes?",
  keepEditing: "Keep editing",
  discardChanges: "Discard changes",
  deleteHeading: "Delete this note?",
  keepNote: "Keep note",
  deleteNote: "Delete note",
  deleting: "Deleting…",
  noteDeleted: "Note deleted.",
  alreadyDeleted: "That note had already been deleted, maybe in another tab.",
  deleteUnavailable:
    "The note wasn't deleted. This browser isn't letting QuickNotes change its storage right now, which can happen in private browsing. The note is still here.",
} as const;

export const TEXT_SPACING_CSS = `
  * {
    line-height: 1.5 !important;
    letter-spacing: 0.12em !important;
    word-spacing: 0.16em !important;
  }
  p {
    margin-bottom: 2em !important;
  }
`;

export function btn(page: Page, name: string): Locator {
  return page.getByRole("button", { name, exact: true });
}

export function heading(page: Page, name: string): Locator {
  return page.getByRole("heading", { level: 2, name, exact: true });
}

export function dialogBox(page: Page): Locator {
  return page.getByRole("alertdialog");
}

export function titleField(page: Page): Locator {
  return page.getByRole("textbox", { name: "Title", exact: true });
}

export function noteField(page: Page): Locator {
  return page.getByRole("textbox", { name: "Note", exact: true });
}

/** The note view's status region (outside any form). */
export function viewStatus(page: Page): Locator {
  return page.locator("main > div:not([hidden]) > [role=status]");
}

/** The edit form's alert region. */
export function editAlert(page: Page): Locator {
  return page.getByRole("region", { name: "Edit note" }).getByRole("alert");
}

/** Loads the app fresh at `#note/<id>` (a new document, so the note route is the first entry). */
export async function loadAtNote(page: Page, id: string): Promise<void> {
  await page.evaluate((hash) => {
    location.hash = hash;
  }, `#note/${id}`);
  await page.reload();
}

/** The "Your notes" status region. */
export function notesStatus(page: Page): Locator {
  return page.locator("section[aria-labelledby=notes-heading] > [role=status]");
}

/** Saves A ("First"/"one") then B ("Second"/"two") through the form. */
export async function saveAB(page: Page): Promise<void> {
  await gotoApp(page);
  await saveNote(page, "First", "one");
  await saveNote(page, "Second", "two");
  await expect(noteLinks(page)).toHaveCount(2);
}

/** Opens the note titled `title` from the list; its heading is focused. */
export async function openFromList(page: Page, title: string): Promise<void> {
  await noteLink(page, title).click();
  await expect(heading(page, title)).toBeFocused();
}

export async function startEdit(page: Page): Promise<void> {
  await btn(page, EDIT_COPY.edit).click();
  await expect(titleField(page)).toBeFocused();
}

/** Seeds `notes` into a freshly loaded app and reloads. */
export async function seeded(
  page: Page,
  notes: readonly SeedNote[],
): Promise<void> {
  await gotoApp(page);
  await expect(page.getByText(NOTES_COPY.emptyPrimary)).toBeVisible();
  await seedNotes(page, notes);
  await page.reload();
  await expect(noteLinks(page)).toHaveCount(notes.length);
}

/** Every record in quicknotes/notes. */
export function readStoredNotes(page: Page): Promise<SeedNote[]> {
  return page.evaluate(
    () =>
      new Promise<SeedNote[]>((resolve, reject) => {
        const request = indexedDB.open("quicknotes", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const all = db
            .transaction("notes", "readonly")
            .objectStore("notes")
            .getAll();
          all.onsuccess = () => {
            db.close();
            resolve(all.result as SeedNote[]);
          };
          all.onerror = () => {
            db.close();
            reject(all.error);
          };
        };
      }),
  );
}

/** The stored record with `id`, if any. */
export async function readStoredNote(
  page: Page,
  id: string,
): Promise<SeedNote | undefined> {
  return (await readStoredNotes(page)).find((note) => note.id === id);
}

/** Deletes record `id` straight from the store (as another tab would). */
export function removeStoredNote(page: Page, id: string): Promise<void> {
  return page.evaluate(
    (key) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("quicknotes", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("notes", "readwrite");
          tx.objectStore("notes").delete(key);
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
    id,
  );
}

/**
 * Installs a switchable fault on read-write transactions (init script).
 * `setWriteFault(page, "fail")` makes them throw (the repository reports
 * "unavailable"); "hang" makes them never settle; "off" restores them.
 */
export async function faultNoteWrites(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const state = { mode: "off" };
    Object.defineProperty(window, "__writeFault", { value: state });
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function transaction(
      this: IDBDatabase,
      ...args: Parameters<IDBDatabase["transaction"]>
    ): IDBTransaction {
      if (args[1] === "readwrite" && state.mode === "fail") {
        throw new DOMException("blocked", "InvalidStateError");
      }
      if (args[1] === "readwrite" && state.mode === "hang") {
        const request = () => new EventTarget();
        return {
          objectStore: () => ({
            get: request,
            count: request,
            put: request,
            delete: request,
          }),
          addEventListener: () => {},
          abort: () => {},
        } as unknown as IDBTransaction;
      }
      return original.apply(this, args);
    };
  });
}

export async function setWriteFault(
  page: Page,
  mode: "off" | "fail" | "hang",
): Promise<void> {
  await page.evaluate((value) => {
    (
      window as unknown as { __writeFault: { mode: string } }
    ).__writeFault.mode = value;
  }, mode);
}

/** D14: the colours allowed in the note view and the dialog layer. */
export const COLOUR_ALLOW_LIST = [
  "rgb(250, 250, 250)",
  "rgb(244, 244, 245)",
  "rgb(228, 228, 231)",
  "rgb(212, 212, 216)",
  "rgb(161, 161, 170)",
  "rgb(113, 113, 122)",
  "rgb(82, 82, 91)",
  "rgb(63, 63, 70)",
  "rgb(39, 39, 42)",
  "rgb(24, 24, 27)",
  "rgb(9, 9, 11)",
  "rgb(255, 255, 255)",
  "rgb(0, 0, 0)",
  "rgba(0, 0, 0, 0)",
  "rgb(29, 78, 216)",
  "rgba(24, 24, 27, 0.5)",
  // The same zinc-900 at 50% (the backdrop), as Chromium reports Tailwind's color-mix.
  "oklab(0.210329 0.00161358 -0.00563219 / 0.5)",
];

/** Computed colours in `main` and the dialog layer that are not in the allow-list. */
export function disallowedColours(page: Page): Promise<string[]> {
  return page.evaluate((allowed) => {
    const scope = [
      ...document.querySelectorAll("main *, main, [data-dialog-host] *"),
    ].filter((element) => !element.closest("[hidden]"));
    const props = [
      "color",
      "background-color",
      "border-top-color",
      "border-right-color",
      "border-bottom-color",
      "border-left-color",
    ];
    const bad = new Set<string>();
    for (const element of scope) {
      const style = getComputedStyle(element);
      for (const prop of props) {
        const value = style.getPropertyValue(prop);
        if (!allowed.includes(value))
          bad.add(`${element.tagName} ${prop} ${value}`);
      }
    }
    return [...bad];
  }, COLOUR_ALLOW_LIST);
}

/**
 * D14 AX check: "role:name" of unignored, named nodes in Chromium's accessibility tree,
 * read through CDP `Accessibility.getFullAXTree`.
 */
export async function axNames(page: Page): Promise<string[]> {
  const session = await page.context().newCDPSession(page);
  try {
    const { nodes } = (await session.send("Accessibility.getFullAXTree")) as {
      nodes: {
        ignored: boolean;
        role?: { value?: unknown };
        name?: { value?: unknown };
      }[];
    };
    return nodes
      .filter((node) => !node.ignored && node.role?.value !== "RootWebArea")
      .filter((node) => String(node.name?.value ?? "") !== "")
      .map((node) => `${String(node.role?.value)}:${String(node.name?.value)}`);
  } finally {
    await session.detach();
  }
}

export { backLink, noteLink, noteLinks };
