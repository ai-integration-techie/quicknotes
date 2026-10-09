import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { gotoApp } from "./app";
import { formLocators } from "./form";
import { noteLink, noteLinks, NOTES_COPY, seedId, seedNotes } from "./notes";
import { blockIndexedDb, hangIndexedDb } from "./storageFaults";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const NOW = Date.now();
const MISSING = "#note/00000000-0000-4000-8000-000000000000";

function note(n: number, title: string, body: string) {
  const time = NOW - n * 60_000;
  return { id: seedId(n), title, body, createdAt: time, updatedAt: time };
}

const MIXED = [
  note(1, " ", "Untitled body"),
  note(2, "No body", ""),
  note(3, "Normal", "Milk\nEggs"),
  note(4, "", ""),
];

async function seeded(page: Page): Promise<void> {
  await gotoApp(page);
  await expect(page.getByText(NOTES_COPY.emptyPrimary)).toBeVisible();
  await seedNotes(page, MIXED);
  await page.reload();
  await expect(noteLinks(page)).toHaveCount(MIXED.length);
}

function h2(page: Page, name: string) {
  return page.getByRole("heading", { level: 2, name, exact: true });
}

interface State {
  readonly name: string;
  readonly setup: (page: Page) => Promise<void>;
}

/** list-notes AC-44: every list and note-view state. */
const STATES: State[] = [
  {
    name: "list loaded with untitled, no-body and normal notes",
    setup: seeded,
  },
  {
    name: "list loading",
    setup: async (page) => {
      await hangIndexedDb(page);
      await gotoApp(page);
      await expect(page.getByText(NOTES_COPY.loading)).toBeVisible();
    },
  },
  {
    name: "list empty",
    setup: async (page) => {
      await gotoApp(page);
      await expect(page.getByText(NOTES_COPY.emptyPrimary)).toBeVisible();
    },
  },
  {
    name: "list load failed",
    setup: async (page) => {
      await blockIndexedDb(page);
      await gotoApp(page);
      await expect(page.getByText(NOTES_COPY.listUnavailable)).toBeVisible();
    },
  },
  {
    name: "note view loaded",
    setup: async (page) => {
      await seeded(page);
      await noteLink(page, "Normal").click();
      await expect(h2(page, "Normal")).toBeFocused();
    },
  },
  {
    name: "note view untitled with no text",
    setup: async (page) => {
      await seeded(page);
      await page.goto(page.url() + `#note/${seedId(4)}`);
      await expect(h2(page, NOTES_COPY.untitled)).toBeFocused();
      await expect(page.getByText(NOTES_COPY.noText)).toBeVisible();
    },
  },
  {
    name: "not found",
    setup: async (page) => {
      await gotoApp(page, undefined, MISSING);
      await expect(h2(page, NOTES_COPY.notFoundHeading)).toBeFocused();
    },
  },
  {
    name: "open failed",
    setup: async (page) => {
      await blockIndexedDb(page);
      await gotoApp(page, undefined, `#note/${seedId(3)}`);
      await expect(h2(page, NOTES_COPY.openFailedHeading)).toBeFocused();
    },
  },
  {
    name: "skip link focused",
    setup: async (page) => {
      await gotoApp(page);
      await expect(formLocators(page).title).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(
        page.getByRole("link", { name: NOTES_COPY.skip }),
      ).toBeFocused();
    },
  },
];

test.describe("notes accessibility", () => {
  for (const state of STATES) {
    test(`${state.name}: no WCAG 2.1 A/AA axe violations, contrast evaluated (AC-44)`, async ({
      page,
    }) => {
      await state.setup(page);
      const results = await new AxeBuilder({ page })
        .withTags(WCAG_TAGS)
        .analyze();
      expect(results.violations).toEqual([]);
      expect(results.incomplete.map((r) => r.id)).not.toContain(
        "color-contrast",
      );
      const contrast = results.passes.find((r) => r.id === "color-contrast");
      expect(contrast?.nodes.length).toBeGreaterThanOrEqual(3);
    });
  }
});
