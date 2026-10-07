import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { gotoApp } from "./app";
import { COPY, openForm, showTitleTooLong, type FormLocators } from "./form";
import { blockIndexedDb } from "./storageFaults";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

interface FormState {
  readonly name: string;
  readonly before?: (page: Page) => Promise<void>;
  readonly setup: (page: Page, form: FormLocators) => Promise<void>;
}

/** create-note AC-51: every form state the user can reach. */
const STATES: FormState[] = [
  { name: "idle empty", setup: async () => {} },
  {
    name: "idle with a 180-character title",
    setup: async (page, form) => {
      await form.title.fill("a".repeat(180));
      await expect(page.getByText("180 of 200 characters")).toBeVisible();
    },
  },
  {
    name: "title too long",
    setup: (page, form) => showTitleTooLong(page, form),
  },
  {
    name: "both empty",
    setup: async (_page, form) => {
      await form.saveButton.click();
      await expect(form.alert).toHaveText(COPY.bothEmpty);
    },
  },
  {
    name: "saved",
    setup: async (_page, form) => {
      await form.title.fill("Axe check");
      await form.saveButton.click();
      await expect(form.status).toHaveText(COPY.saved);
    },
  },
  {
    name: "storage unavailable",
    before: blockIndexedDb,
    setup: async (_page, form) => {
      await form.title.fill("Axe check");
      await form.saveButton.click();
      await expect(form.alert).toHaveText(COPY.unavailable);
    },
  },
];

test.describe("accessibility", () => {
  for (const state of STATES) {
    test(`${state.name}: no WCAG 2.1 A/AA axe violations, contrast evaluated (AC-51)`, async ({
      page,
    }) => {
      await state.before?.(page);
      const form = await openForm(page);
      await expect(
        page.getByRole("heading", { level: 1, name: "QuickNotes" }),
      ).toBeVisible();
      await state.setup(page, form);

      const results = await new AxeBuilder({ page })
        .withTags(WCAG_TAGS)
        .analyze();

      expect(results.violations).toEqual([]);
      // Contrast must actually be evaluated, not left "incomplete" (e.g. unreadable colours).
      expect(results.incomplete.map((result) => result.id)).not.toContain(
        "color-contrast",
      );
      const contrastChecked = results.passes.find(
        (result) => result.id === "color-contrast",
      );
      expect(contrastChecked?.nodes.length).toBeGreaterThanOrEqual(3);
    });
  }

  test("axe detects a contrast failure", async ({ page }) => {
    await gotoApp(page);
    const secondary = page.getByText(
      "They stay in this browser and are never sent anywhere.",
    );
    await expect(secondary).toBeVisible();
    // zinc-300 on zinc-50 is about 1.4:1, well below 4.5:1.
    await secondary.evaluate((element) => {
      (element as HTMLElement).style.color = "#d4d4d8";
    });

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();

    expect(results.violations.map((violation) => violation.id)).toContain(
      "color-contrast",
    );
  });
});
