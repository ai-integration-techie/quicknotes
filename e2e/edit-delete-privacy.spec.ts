import { expect, test } from "@playwright/test";
import {
  btn,
  EDIT_COPY,
  noteField,
  notesStatus,
  openFromList,
  readStoredNote,
  readStoredNotes,
  saveAB,
  startEdit,
  titleField,
  viewStatus,
} from "./editDelete";
import {
  persistenceCalls,
  resetPersistenceCalls,
  trackPersistenceCalls,
} from "./notes";

test.describe("edit and delete privacy", () => {
  test("edit text never reaches the URL, title, history.state or web storage (AC-28)", async ({
    page,
  }) => {
    await saveAB(page);
    const first = (await readStoredNotes(page)).find(
      (n) => n.title === "First",
    );
    await openFromList(page, "First");
    await startEdit(page);
    await noteField(page).pressSequentially("SECRET-EDIT");
    expect(page.url()).not.toContain("SECRET");
    const state = await page.evaluate(() => ({
      title: document.title,
      history: JSON.stringify(history.state),
      local: localStorage.length,
      session: sessionStorage.length,
      cookie: document.cookie,
    }));
    expect(state.title).toBe("QuickNotes");
    expect(String(state.history)).not.toContain("SECRET");
    expect(state.local).toBe(0);
    expect(state.session).toBe(0);
    expect(state.cookie).toBe("");
    expect(await readStoredNote(page, first?.id ?? "")).toEqual(first);
  });

  test("delete and edit send no request; delete calls no persistence API; edits call each at most once; nothing written elsewhere (AC-57)", async ({
    page,
  }) => {
    await trackPersistenceCalls(page);
    await saveAB(page);
    await page.reload();
    await page.waitForLoadState("networkidle");
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await resetPersistenceCalls(page);

    await openFromList(page, "Second");
    await btn(page, EDIT_COPY.delete).click();
    await btn(page, EDIT_COPY.deleteNote).click();
    await expect(notesStatus(page)).toHaveText(EDIT_COPY.noteDeleted);
    expect(requests).toEqual([]);
    expect(await persistenceCalls(page)).toEqual({ persisted: 0, persist: 0 });

    await openFromList(page, "First");
    for (const suffix of ["!", "?"]) {
      await startEdit(page);
      await titleField(page).press("End");
      await titleField(page).pressSequentially(suffix);
      await btn(page, EDIT_COPY.saveChanges).click();
      await expect(viewStatus(page)).toHaveText(EDIT_COPY.changesSaved);
    }
    expect(requests).toEqual([]);
    const calls = await persistenceCalls(page);
    expect(calls.persisted).toBeLessThanOrEqual(1);
    expect(calls.persist).toBeLessThanOrEqual(1);
    const stores = await page.evaluate(async () => ({
      local: localStorage.length,
      session: sessionStorage.length,
      cookie: document.cookie,
      caches: await caches.keys(),
    }));
    expect(stores).toEqual({ local: 0, session: 0, cookie: "", caches: [] });
  });
});
