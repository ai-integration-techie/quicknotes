import { expect, test, type Page } from "@playwright/test";

const TEXTS = ["QuickNotes", "No notes yet", "Your notes will show up here."];

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

test.describe("layout", () => {
  for (const viewport of VIEWPORTS) {
    test(`no overflow and centred at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      expect(await hasHorizontalOverflow(page)).toBe(false);

      for (const locator of shellText(page)) {
        await expect(locator).toBeVisible();
        const box = await locator.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThan(0);
        expect(box!.height).toBeGreaterThan(0);
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      }

      const offset = await page.evaluate(() => {
        const emptyState = document.querySelector("main > div");
        if (!emptyState) return Number.POSITIVE_INFINITY;
        const rect = emptyState.getBoundingClientRect();
        const centre = rect.left + rect.width / 2;
        return Math.abs(centre - document.documentElement.clientWidth / 2);
      });
      expect(offset).toBeLessThanOrEqual(2);
    });
  }

  test("reflows at 320px with 200% root font", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });

    expect(await hasHorizontalOverflow(page)).toBe(false);
    for (const locator of shellText(page)) {
      await expect(locator).toBeVisible();
    }
  });

  test("survives WCAG 1.4.12 text spacing at 360px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.addStyleTag({ content: TEXT_SPACING_CSS });

    expect(await hasHorizontalOverflow(page)).toBe(false);
    const clipped = await page.evaluate(() =>
      [...document.querySelectorAll("h1, main p")]
        .filter(
          (el) =>
            el.scrollWidth > el.clientWidth ||
            el.scrollHeight > el.clientHeight,
        )
        .map((el) => el.textContent),
    );
    expect(clipped).toEqual([]);
  });

  test("keyboard focus shows 2px accent outline", async ({ page }) => {
    await page.goto("/");
    await page.locator("main").evaluate((main) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Focus probe";
      main.append(button);
    });

    await page.keyboard.press("Tab");
    const button = page.getByRole("button", { name: "Focus probe" });
    await expect(button).toBeFocused();

    const outline = await button.evaluate((element) => {
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
  });

  test("no animations or transitions", async ({ page }) => {
    await page.goto("/");
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
});
