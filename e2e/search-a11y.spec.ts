import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { gotoApp } from "./app";
import { NOTES_COPY, seedId, seedNotes } from "./notes";
import {
  clearSearch,
  noMatches,
  SEARCH_COPY,
  searchbox,
  searchStatus,
  shownNoteLinks,
} from "./search";

/** search-notes AC-26: axe over every search state. Each test has its own context (R31). */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
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

async function searched(page: Page, query: string, status: string) {
  await searchbox(page).fill(query);
  await expect(searchStatus(page)).toHaveText(status);
}

const STATES: { name: string; setup: (page: Page) => Promise<void> }[] = [
  {
    name: "search with no query",
    setup: async (page) => {
      await expect(searchbox(page)).toHaveValue("");
    },
  },
  {
    name: "results with the status showing",
    setup: (page) => searched(page, "shop", "2 notes match"),
  },
  {
    name: "no matches with the status showing",
    setup: async (page) => {
      await searched(page, "zebra", SEARCH_COPY.noneMatch);
      await expect(noMatches(page)).toBeVisible();
    },
  },
  {
    name: "Clear search focused",
    setup: async (page) => {
      await searchbox(page).fill("shop");
      await searchbox(page).focus();
      await page.keyboard.press("Tab");
      await expect(clearSearch(page)).toBeFocused();
    },
  },
  {
    name: "a 360px viewport with results",
    setup: async (page) => {
      await page.setViewportSize({ width: 360, height: 740 });
      await searched(page, "shop", "2 notes match");
    },
  },
];

test.describe("search accessibility", () => {
  for (const state of STATES) {
    test(`axe: ${state.name} (AC-26)`, async ({ page }) => {
      await seeded(page);
      await state.setup(page);
      const results = await new AxeBuilder({ page })
        .withTags(WCAG_TAGS)
        .analyze();
      expect(results.violations).toEqual([]);
      expect(
        results.incomplete.find((r) => r.id === "color-contrast"),
      ).toBeUndefined();
      const contrast = results.passes.find((r) => r.id === "color-contrast");
      expect(contrast?.nodes.length).toBeGreaterThanOrEqual(3);
    });
  }
});
