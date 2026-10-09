import { expect, test, type Page } from "@playwright/test";
import { gotoApp } from "./app";
import { formLocators } from "./form";
import {
  backLink,
  longTasks,
  noteBody,
  noteLink,
  NOTES_COPY,
  observeLongTasks,
  seedId,
  seedNotes,
  type SeedNote,
} from "./notes";

/** list-notes R34: budgets in headless Chromium against the production build. */
const LONG_TASK_MS = 300;
const BASE_TIME = Date.now() - 1_000_000;

function thousandNotes(): SeedNote[] {
  return Array.from({ length: 1000 }, (_, i) => {
    const time = BASE_TIME + (1000 - i) * 10; // item i sorts at position i
    return {
      id: seedId(i + 1),
      title: `Note ${String(i).padStart(4, "0")} `.padEnd(60, "t"),
      body: "b".repeat(2000),
      createdAt: time,
      updatedAt: time,
    };
  });
}

/** Loads the app once (creating the store), seeds, and reloads with the long-task observer. */
async function loadSeeded(page: Page, notes: SeedNote[]): Promise<void> {
  await gotoApp(page);
  await expect(page.getByText(NOTES_COPY.emptyPrimary)).toBeVisible();
  await seedNotes(page, notes);
  await observeLongTasks(page);
  await page.reload();
}

/** Counts the time of the next click (capture phase) on `window.__clickAt`. */
async function markNextClick(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.addEventListener(
      "click",
      () => {
        (window as unknown as { __clickAt: number }).__clickAt =
          performance.now();
      },
      { capture: true, once: true },
    );
  });
}

function clickAt(page: Page): Promise<number> {
  return page.evaluate(
    () => (window as unknown as { __clickAt: number }).__clickAt,
  );
}

async function longTasksBetween(page: Page, from: number, to: number) {
  return (await longTasks(page)).filter(
    (task) =>
      task.duration > LONG_TASK_MS &&
      task.start + task.duration >= from &&
      task.start <= to,
  );
}

test.describe("notes performance", () => {
  test("1,000 notes: Title focused under 1,000 ms, all links under 2,500 ms, no long task over 300 ms (AC-50)", async ({
    page,
  }) => {
    await loadSeeded(page, thousandNotes());

    const focusedAt = await page.waitForFunction(
      () => {
        const active = document.activeElement;
        return active instanceof HTMLInputElement &&
          active.labels?.[0]?.textContent === "Title"
          ? performance.now()
          : false;
      },
      undefined,
      { polling: "raf" },
    );
    const linksAt = await page.waitForFunction(
      () =>
        document.querySelectorAll(
          "section[aria-labelledby=notes-heading] li > a",
        ).length === 1000
          ? performance.now()
          : false,
      undefined,
      { polling: "raf" },
    );
    expect(await focusedAt.jsonValue()).toBeLessThan(1000);
    const allLinks = Number(await linksAt.jsonValue());
    expect(allLinks).toBeLessThan(2500);
    expect(await longTasksBetween(page, 0, allLinks)).toEqual([]);

    await page.keyboard.type("Hello");
    await expect(formLocators(page).title).toHaveValue("Hello");
  });

  test("a 100,000-character note at item 900 opens and returns within 1,000 ms with no long task over 300 ms (AC-51)", async ({
    page,
  }) => {
    const notes = thousandNotes();
    const bigTime = BASE_TIME + (1000 - 899) * 10 + 5; // between items 899 and 900
    const big: SeedNote = {
      id: seedId(5000),
      title: "Big note",
      body:
        Array.from({ length: 2000 }, () => "x".repeat(49)).join("\n") + "\n",
      createdAt: bigTime,
      updatedAt: bigTime,
    };
    expect(big.body).toHaveLength(100_000);
    await loadSeeded(page, [...notes, big]);

    const link = noteLink(page, "Big note");
    await expect(
      page.locator("section[aria-labelledby=notes-heading] li > a"),
    ).toHaveCount(1001);
    const index = await page
      .locator("section[aria-labelledby=notes-heading] li > a")
      .evaluateAll(
        (links, id) =>
          links.findIndex((a) => a.getAttribute("href") === `#note/${id}`),
        big.id,
      );
    expect(index).toBe(899);
    await link.scrollIntoViewIfNeeded();

    await markNextClick(page);
    await link.click();
    const opened = await page.waitForFunction(
      () => {
        const body = document.querySelector("main [data-note-body]");
        const active = document.activeElement;
        return active?.tagName === "H2" &&
          active.textContent === "Big note" &&
          body?.textContent?.length === 100_000
          ? performance.now()
          : false;
      },
      undefined,
      { polling: "raf" },
    );
    const openStart = await clickAt(page);
    const openEnd = Number(await opened.jsonValue());
    expect(openEnd - openStart).toBeLessThan(1000);
    await expect(noteBody(page)).toBeVisible();
    expect(await longTasksBetween(page, openStart, openEnd)).toEqual([]);

    await markNextClick(page);
    await backLink(page).click();
    const returned = await page.waitForFunction(
      (id) => {
        const active = document.activeElement;
        if (!(active instanceof HTMLAnchorElement)) return false;
        if (active.getAttribute("href") !== `#note/${id}`) return false;
        const rect = active.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= window.innerHeight
          ? performance.now()
          : false;
      },
      big.id,
      { polling: "raf" },
    );
    const backStart = await clickAt(page);
    const backEnd = Number(await returned.jsonValue());
    expect(backEnd - backStart).toBeLessThan(1000);
    expect(await longTasksBetween(page, backStart, backEnd)).toEqual([]);
  });
});
