import { expect, test, type Locator, type Page } from "@playwright/test";
import { gotoApp } from "./app";
import { NOTES_COPY, seedId, seedNotes } from "./notes";
import {
  animatedElements,
  clearSearch,
  expectAccentOutline,
  noMatches,
  SEARCH_COPY,
  searchbox,
  searchStatus,
  shownNoteLinks,
  TEXT_SPACING_CSS,
} from "./search";

/** search-notes: look and layout of the search area. Each test has its own context (R31). */
const VIEWPORTS = [
  { width: 360, height: 740 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
];

const NOW = Date.now();
const CBA = [
  { n: 3, title: "Shopping list", body: "milk" },
  { n: 2, title: "Ideas", body: "café plans" },
  { n: 1, title: "Groceries", body: "Shopping for the party" },
].map(({ n, title, body }) => ({
  id: seedId(n),
  title,
  body,
  createdAt: NOW - (10 - n) * 60_000,
  updatedAt: NOW - (10 - n) * 60_000,
}));

async function seeded(page: Page): Promise<void> {
  await gotoApp(page);
  await expect(page.getByText(NOTES_COPY.emptyPrimary)).toBeVisible();
  await seedNotes(page, CBA);
  await page.reload();
  await expect(shownNoteLinks(page)).toHaveCount(3);
}

function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
}

async function expectInsideHorizontally(
  locator: Locator,
  width: number,
): Promise<void> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(width);
}

/** Search-area texts that are hidden or clip (the searchbox's own text excepted). */
function clippedSearchParts(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const section = document.querySelector(
      "section[aria-labelledby=notes-heading]",
    );
    if (!section) return ["no section"];
    const parts = [
      ...section.querySelectorAll(
        '[role="search"] label, [role="search"] button, [data-search-status], p',
      ),
    ];
    return parts
      .filter((el) => !el.closest("[hidden]"))
      .filter((el) => (el.textContent ?? "") !== "")
      .filter(
        (el) =>
          (el as HTMLElement).offsetParent === null ||
          el.scrollWidth > el.clientWidth ||
          el.scrollHeight > el.clientHeight,
      )
      .map((el) => (el.textContent ?? "").slice(0, 40));
  });
}

test.describe("search layout", () => {
  test("field and Clear search: accent outline, 44px, 16px text; no animations in results and no-match (AC-24)", async ({
    page,
  }) => {
    await seeded(page);
    await page
      .getByRole("heading", { level: 2, name: NOTES_COPY.heading })
      .focus();
    await page.keyboard.press("Tab");
    const field = searchbox(page);
    await expectAccentOutline(field);
    await page.keyboard.type("a");
    await page.keyboard.press("Tab");
    await expectAccentOutline(clearSearch(page));
    for (const control of [field, clearSearch(page)]) {
      const box = await control.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    const fontSize = await field.evaluate((el) =>
      parseFloat(getComputedStyle(el).fontSize),
    );
    expect(fontSize).toBeGreaterThanOrEqual(16);
    expect(await animatedElements(page)).toEqual([]);

    await field.fill("zebra");
    await expect(noMatches(page)).toBeVisible();
    await expect(searchStatus(page)).toHaveText(SEARCH_COPY.noneMatch);
    expect(await animatedElements(page)).toEqual([]);
  });

  for (const viewport of VIEWPORTS) {
    test(`no horizontal scroll at ${viewport.width}x${viewport.height} with a, a 2,000-char query and zebra (AC-25)`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await seeded(page);
      for (const query of ["a", "x".repeat(2000), "zebra"]) {
        await searchbox(page).fill(query);
        await expect(clearSearch(page)).toBeVisible();
        expect(await hasHorizontalOverflow(page)).toBe(false);
        await expectInsideHorizontally(searchbox(page), viewport.width);
        await expectInsideHorizontally(clearSearch(page), viewport.width);
      }
      await expectInsideHorizontally(noMatches(page), viewport.width);
      await expectInsideHorizontally(
        page.getByText(SEARCH_COPY.noMatchesSecondary),
        viewport.width,
      );
    });
  }

  test("320px at 200% and 360px with text spacing: no horizontal scroll, search parts unclipped (AC-25)", async ({
    page,
  }) => {
    for (const setup of ["zoom", "spacing"] as const) {
      await page.setViewportSize(
        setup === "zoom"
          ? { width: 320, height: 640 }
          : { width: 360, height: 740 },
      );
      if (setup === "zoom") await seeded(page);
      else await page.reload();
      if (setup === "zoom")
        await page.evaluate(() => {
          document.documentElement.style.fontSize = "200%";
        });
      else await page.addStyleTag({ content: TEXT_SPACING_CSS });

      for (const query of ["a", "zebra"]) {
        await searchbox(page).fill(query);
        await expect(searchStatus(page)).not.toHaveText("");
        expect(await hasHorizontalOverflow(page)).toBe(false);
        for (const part of [
          page.getByText(SEARCH_COPY.label, { exact: true }),
          searchbox(page),
          clearSearch(page),
          searchStatus(page),
        ])
          await expect(part).toBeVisible();
        expect(await clippedSearchParts(page)).toEqual([]);
      }
      await expect(noMatches(page)).toBeVisible();
      await expect(
        page.getByText(SEARCH_COPY.noMatchesSecondary),
      ).toBeVisible();
    }
  });
});
