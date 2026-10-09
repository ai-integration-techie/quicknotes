import { expect, test, type Locator, type Page } from "@playwright/test";
import { gotoApp } from "./app";
import { COPY, formLocators, openForm, showTitleTooLong } from "./form";
import { hangIndexedDb } from "./storageFaults";

const TEXTS = [
  "QuickNotes",
  "New note",
  "Your notes are saved on this device",
  "They stay in this browser and are never sent anywhere.",
];

const VIEWPORTS = [
  { width: 360, height: 740 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
];

const TEXT_SPACING_CSS = `
  * {
    line-height: 1.5 !important;
    letter-spacing: 0.12em !important;
    word-spacing: 0.16em !important;
  }
  p {
    margin-bottom: 2em !important;
  }
`;

async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
}

function shellText(page: Page) {
  return TEXTS.map((text) => page.getByText(text, { exact: true }));
}

/** The shell texts plus the form's labels, fields, button and hint. */
function shellAndForm(page: Page): Locator[] {
  const form = formLocators(page);
  return [
    ...shellText(page),
    page.locator("label", { hasText: /^Title$/ }),
    page.locator("label", { hasText: /^Note$/ }),
    form.title,
    form.note,
    form.saveButton,
    form.hint,
  ];
}

async function expectAccentOutline(locator: Locator): Promise<void> {
  await expect(locator).toBeFocused();
  const outline = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      style: style.outlineStyle,
      width: parseFloat(style.outlineWidth),
      color: style.outlineColor,
    };
  });
  expect(outline.style).not.toBe("none");
  expect(outline.width).toBeGreaterThanOrEqual(2);
  expect(outline.color).toBe("rgb(29, 78, 216)");
}

async function animatedElements(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [document.body, ...document.body.querySelectorAll("*")]
      .filter((element) => {
        const style = getComputedStyle(element);
        const transitions = style.transitionDuration
          .split(",")
          .map((part) => part.trim());
        return (
          style.animationName !== "none" ||
          transitions.some((part) => part !== "0s")
        );
      })
      .map((element) => element.tagName),
  );
}

test.describe("layout", () => {
  for (const viewport of VIEWPORTS) {
    test(`no overflow, form centred, controls inside the viewport at ${viewport.width}x${viewport.height} (AC-53)`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await gotoApp(page);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      expect(await hasHorizontalOverflow(page)).toBe(false);

      for (const locator of shellAndForm(page)) {
        await expect(locator).toBeVisible();
        const box = await locator.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThan(0);
        expect(box!.height).toBeGreaterThan(0);
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      }

      const offset = await page.evaluate(() => {
        const form = document.querySelector("main form");
        if (!form) return Number.POSITIVE_INFINITY;
        const rect = form.getBoundingClientRect();
        const centre = rect.left + rect.width / 2;
        return Math.abs(centre - document.documentElement.clientWidth / 2);
      });
      expect(offset).toBeLessThanOrEqual(2);

      const button = await formLocators(page).saveButton.boundingBox();
      expect(button!.height).toBeGreaterThanOrEqual(44);
    });
  }

  test("reflows at 320px with 200% root font, in the title-too-long state (AC-54)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    const form = await openForm(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await showTitleTooLong(page, form);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });

    expect(await hasHorizontalOverflow(page)).toBe(false);
    for (const locator of [
      ...shellAndForm(page),
      page.getByText(COPY.titleTooLong(205), { exact: true }),
      page.getByText("205 of 200 characters", { exact: true }),
    ]) {
      await expect(locator).toBeVisible();
    }
  });

  test("survives WCAG 1.4.12 text spacing at 360px, in the title-too-long state (AC-55)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    const form = await openForm(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await showTitleTooLong(page, form);
    await page.addStyleTag({ content: TEXT_SPACING_CSS });

    expect(await hasHorizontalOverflow(page)).toBe(false);
    const clipped = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          "h1, h2, label, main p, button, [role=status], [role=alert]",
        ),
      ]
        .filter(
          (el) =>
            el.scrollWidth > el.clientWidth ||
            el.scrollHeight > el.clientHeight,
        )
        .map((el) => el.textContent),
    );
    expect(clipped).toEqual([]);
  });

  test("Tab order is Title, Note, Save note, each with the 2px accent outline (AC-52)", async ({
    page,
  }) => {
    const form = await openForm(page);
    await expectAccentOutline(form.title);

    await page.keyboard.press("Tab");
    await expectAccentOutline(form.note);

    await page.keyboard.press("Tab");
    await expectAccentOutline(form.saveButton);

    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    await expectAccentOutline(form.title);
  });

  test("no animations or transitions", async ({ page }) => {
    await gotoApp(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const animated = await page.evaluate(() =>
      [document.body, ...document.body.querySelectorAll("*")]
        .filter((element) => {
          const style = getComputedStyle(element);
          const transitions = style.transitionDuration
            .split(",")
            .map((part) => part.trim());
          return (
            style.animationName !== "none" ||
            transitions.some((part) => part !== "0s")
          );
        })
        .map((element) => element.tagName),
    );
    expect(animated).toEqual([]);
  });

  test("no animations or transitions while saving (AC-56)", async ({
    page,
  }) => {
    await hangIndexedDb(page);
    const form = await openForm(page);
    await form.title.fill("Saving check");
    await form.saveButton.click();
    const saving = page.getByRole("button", { name: COPY.saving, exact: true });
    await expect(saving).toBeVisible();
    await expect(saving).toHaveAttribute("aria-disabled", "true");

    expect(await animatedElements(page)).toEqual([]);
  });
});
