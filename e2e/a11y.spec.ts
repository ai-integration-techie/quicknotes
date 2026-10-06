import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("accessibility", () => {
  test("shell has no WCAG 2.1 A/AA axe violations", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "QuickNotes" }),
    ).toBeVisible();

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

  test("axe detects a contrast failure", async ({ page }) => {
    await page.goto("/");
    const secondary = page.getByText("Your notes will show up here.");
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
