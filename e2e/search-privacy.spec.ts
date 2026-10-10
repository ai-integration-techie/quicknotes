import { expect, test } from "@playwright/test";
import { openForm, readStoredNotes } from "./form";
import {
  noteLink,
  persistenceCalls,
  resetPersistenceCalls,
  saveNote,
  trackPersistenceCalls,
} from "./notes";
import { clearSearch, noMatches, searchbox, shownNoteLinks } from "./search";

/** search-notes: searching sends and stores nothing. Each test has its own context (R31). */
test.describe("search privacy", () => {
  test("searching makes no request, no persist call, no storage write (AC-30)", async ({
    page,
  }) => {
    await trackPersistenceCalls(page);
    await openForm(page);
    await saveNote(page, "Groceries", "Shopping for the party");
    await saveNote(page, "Ideas", "café plans");
    await saveNote(page, "Shopping list", "milk");

    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.reload({ waitUntil: "networkidle" });
    await expect(noteLink(page, "Shopping list")).toBeVisible();
    const before = await readStoredNotes(page);
    requests.length = 0;
    await resetPersistenceCalls(page);

    await searchbox(page).pressSequentially("shop");
    await expect(shownNoteLinks(page)).toHaveCount(2);
    await clearSearch(page).click();
    await expect(shownNoteLinks(page)).toHaveCount(3);
    await searchbox(page).pressSequentially("zebra");
    await expect(noMatches(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(searchbox(page)).toHaveValue("");
    await expect(shownNoteLinks(page)).toHaveCount(3);

    expect(requests).toEqual([]);
    expect(await persistenceCalls(page)).toEqual({ persisted: 0, persist: 0 });
    expect(
      await page.evaluate(async () => ({
        local: localStorage.length,
        session: sessionStorage.length,
        cookie: document.cookie,
        caches: await caches.keys(),
      })),
    ).toEqual({ local: 0, session: 0, cookie: "", caches: [] });
    const after = await readStoredNotes(page);
    expect(after).toHaveLength(3);
    const stamps = (notes: typeof after) =>
      Object.fromEntries(notes.map((n) => [n.id, n.updatedAt]));
    expect(stamps(after)).toEqual(stamps(before));
  });
});
