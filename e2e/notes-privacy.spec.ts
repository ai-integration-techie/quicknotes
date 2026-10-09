import { expect, test } from "@playwright/test";
import { openForm } from "./form";
import {
  backLink,
  countStoredNotes,
  noteLink,
  NOTES_COPY,
  persistenceCalls,
  resetPersistenceCalls,
  saveNote,
  trackPersistenceCalls,
} from "./notes";

/** list-notes: privacy while reading notes. Each test has its own context (R43). */
test.describe("notes privacy", () => {
  test("note text never reaches the URL, the title or history.state (AC-34)", async ({
    page,
  }) => {
    await openForm(page);
    await saveNote(page, "SECRET-TITLE", "SECRET-BODY");
    await noteLink(page, "SECRET-TITLE").click();
    await expect(
      page.getByRole("heading", { level: 2, name: "SECRET-TITLE" }),
    ).toBeFocused();

    expect(page.url()).not.toContain("SECRET");
    expect(await page.title()).toBe("QuickNotes");
    expect(
      await page.evaluate(() => JSON.stringify(history.state) ?? ""),
    ).not.toContain("SECRET");

    await page.reload();
    await expect(
      page.getByRole("heading", { level: 2, name: "SECRET-TITLE" }),
    ).toBeFocused();
    await backLink(page).click();
    await expect(noteLink(page, "SECRET-TITLE")).toBeFocused();
    expect(await page.evaluate(() => history.state)).toBeNull();
    expect(await page.title()).toBe("QuickNotes");
  });

  test("opening and closing notes sends no request, calls no persistence API and writes nothing (AC-57)", async ({
    page,
  }) => {
    await trackPersistenceCalls(page);
    await openForm(page);
    await saveNote(page, "One", "1");
    await saveNote(page, "Two", "2");

    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.reload({ waitUntil: "networkidle" });
    await expect(noteLink(page, "Two")).toBeVisible();
    requests.length = 0;
    await resetPersistenceCalls(page);

    for (const title of ["One", "Two"]) {
      await noteLink(page, title).click();
      await expect(
        page.getByRole("heading", { level: 2, name: title }),
      ).toBeFocused();
      await backLink(page).click();
      await expect(noteLink(page, title)).toBeFocused();
    }

    expect(requests).toEqual([]);
    expect(await persistenceCalls(page)).toEqual({ persisted: 0, persist: 0 });
    expect(
      await page.evaluate(() => ({
        local: localStorage.length,
        session: sessionStorage.length,
        cookie: document.cookie,
      })),
    ).toEqual({ local: 0, session: 0, cookie: "" });
    expect(await countStoredNotes(page)).toBe(2);
    await expect(
      page.getByRole("heading", { level: 2, name: NOTES_COPY.heading }),
    ).toBeVisible();
  });
});
