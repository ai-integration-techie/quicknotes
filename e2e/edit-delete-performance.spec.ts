import { expect, test } from "@playwright/test";
import {
  btn,
  EDIT_COPY,
  heading,
  noteField,
  noteLinks,
  openFromList,
  seeded,
  titleField,
  viewStatus,
} from "./editDelete";
import { longTasks, NOTES_COPY, observeLongTasks, seedId } from "./notes";

const BUDGET_MS = 1000;
const LONG_TASK_MS = 300;
const NOW = Date.now();
const LONG_TITLE = "Long note";
// 2,000 lines of 50 characters: exactly 100,000 characters.
const LONG_BODY = `${"a".repeat(49)}\n`.repeat(2000);

const NOTES = [
  ...Array.from({ length: 1000 }, (_, i) => ({
    id: seedId(i + 1),
    title: `Note ${String(i + 1).padStart(4, "0")} ${"t".repeat(50)}`,
    body: "b".repeat(2000),
    createdAt: NOW - (i + 2) * 1000,
    updatedAt: NOW - (i + 2) * 1000,
  })),
  {
    id: seedId(5000),
    title: LONG_TITLE,
    body: LONG_BODY,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

test("100,000-character edit and save, and delete with 1,000 notes, each under 1,000 ms with no long task over 300 ms (AC-52)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await observeLongTasks(page);
  await seeded(page, NOTES);
  await openFromList(page, LONG_TITLE);
  const marks: number[] = [];
  const mark = () => page.evaluate(() => performance.now());

  marks.push(await mark());
  let start = Date.now();
  await btn(page, EDIT_COPY.edit).click();
  await expect(titleField(page)).toBeFocused({ timeout: BUDGET_MS });
  expect(
    await noteField(page).evaluate(
      (el) => (el as HTMLTextAreaElement).value.length,
    ),
  ).toBe(100_000);
  expect(Date.now() - start).toBeLessThanOrEqual(BUDGET_MS);

  // The body is at the limit, so the typed "x" replaces the last character
  // (one more would be too long to save: create-note R8).
  await noteField(page).evaluate((el) => {
    const area = el as HTMLTextAreaElement;
    area.focus();
    area.setSelectionRange(area.value.length - 1, area.value.length);
  });
  await page.keyboard.type("x");
  start = Date.now();
  await btn(page, EDIT_COPY.saveChanges).click();
  await expect(heading(page, LONG_TITLE)).toBeFocused({ timeout: BUDGET_MS });
  expect(Date.now() - start).toBeLessThanOrEqual(BUDGET_MS);
  await expect(viewStatus(page)).toHaveText(EDIT_COPY.changesSaved);

  await page.getByRole("link", { name: NOTES_COPY.back, exact: true }).click();
  await openFromList(page, `Note 0001 ${"t".repeat(50)}`);
  await btn(page, EDIT_COPY.delete).click();
  start = Date.now();
  await btn(page, EDIT_COPY.deleteNote).click();
  await expect(heading(page, NOTES_COPY.heading)).toBeFocused({
    timeout: BUDGET_MS,
  });
  await expect(noteLinks(page)).toHaveCount(1000, { timeout: BUDGET_MS });
  expect(Date.now() - start).toBeLessThanOrEqual(BUDGET_MS);

  const from = marks[0] ?? 0;
  const long = (await longTasks(page)).filter(
    (task) => task.start >= from && task.duration > LONG_TASK_MS,
  );
  expect(long).toEqual([]);
});
