import { expect, test, type Locator, type Page } from "@playwright/test";
import { gotoApp } from "./app";
import { formLocators, openForm } from "./form";
import {
  backLink,
  noteBody,
  noteLink,
  noteLinks,
  NOTES_COPY,
  saveNote,
  seedId,
  seedNotes,
} from "./notes";

/** list-notes: layout of the list and the note view. Each test has its own context (R43). */
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

const LONG_TITLE = "T".repeat(200);
const NOW = Date.now();
const NOTES = [
  { n: 1, title: LONG_TITLE, body: "short" },
  { n: 2, title: "Long body", body: "b".repeat(5000) },
  { n: 3, title: "Normal", body: "Milk\nEggs" },
  { n: 4, title: "Huge body", body: "h".repeat(100_000) },
].map(({ n, title, body }) => ({
  id: seedId(n),
  title,
  body,
  createdAt: NOW - n * 1000,
  updatedAt: NOW - n * 1000,
}));

/** Loads the app, seeds the AC-45 notes and reloads. */
async function seeded(page: Page): Promise<void> {
  await gotoApp(page);
  await expect(page.getByText(NOTES_COPY.emptyPrimary)).toBeVisible();
  await seedNotes(page, NOTES);
  await page.reload();
  await expect(noteLinks(page)).toHaveCount(NOTES.length);
}

async function openHuge(page: Page): Promise<void> {
  await noteLink(page, "Huge body").click();
  await expect(
    page.getByRole("heading", { level: 2, name: "Huge body" }),
  ).toBeFocused();
}

function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
}

async function expectInsideAnd44(locator: Locator, width: number) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}

function mainCentreOffset(page: Page): Promise<number> {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return Number.POSITIVE_INFINITY;
    const rect = main.getBoundingClientRect();
    return Math.abs(
      rect.left + rect.width / 2 - document.documentElement.clientWidth / 2,
    );
  });
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

function animatedElements(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [document.body, ...document.body.querySelectorAll("*")]
      .filter((element) => {
        const style = getComputedStyle(element);
        return (
          style.animationName !== "none" ||
          style.transitionDuration
            .split(",")
            .some((part) => part.trim() !== "0s")
        );
      })
      .map((element) => element.tagName),
  );
}

/** Visible text elements that clip their content. */
function clippedText(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [
      ...document.querySelectorAll(
        "main h2, main a, main [data-note-body], main li a > span",
      ),
    ]
      .filter((el) => !el.closest("[hidden]"))
      .filter(
        (el) =>
          el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight,
      )
      .map((el) => (el.textContent ?? "").slice(0, 40)),
  );
}

test.describe("notes layout", () => {
  for (const viewport of VIEWPORTS) {
    test(`no overflow, links inside the viewport and 44px tall, column centred at ${viewport.width}x${viewport.height} (AC-45)`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await seeded(page);

      expect(await hasHorizontalOverflow(page)).toBe(false);
      for (const link of await noteLinks(page).all()) {
        await expectInsideAnd44(link, viewport.width);
      }
      expect(await mainCentreOffset(page)).toBeLessThanOrEqual(2);

      await openHuge(page);
      expect(await hasHorizontalOverflow(page)).toBe(false);
      await expectInsideAnd44(backLink(page), viewport.width);
      expect(await mainCentreOffset(page)).toBeLessThanOrEqual(2);
    });
  }

  test("list and note view reflow at 320px with 200% root font (AC-46)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await seeded(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    expect(await hasHorizontalOverflow(page)).toBe(false);
    for (const line of await page
      .locator("section[aria-labelledby=notes-heading] li a > span")
      .all()) {
      await expect(line).toBeVisible();
    }

    await openHuge(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    expect(await hasHorizontalOverflow(page)).toBe(false);
    await expect(noteBody(page)).toBeVisible();
    await expect(backLink(page)).toBeVisible();
  });

  test("list and note view survive WCAG 1.4.12 text spacing at 360px (AC-47)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await seeded(page);
    await page.addStyleTag({ content: TEXT_SPACING_CSS });
    expect(await hasHorizontalOverflow(page)).toBe(false);
    expect(await clippedText(page)).toEqual([]);

    await openHuge(page);
    expect(await hasHorizontalOverflow(page)).toBe(false);
    expect(await clippedText(page)).toEqual([]);
  });

  test("no animations or transitions with notes, hover and the note view; links show the accent outline, unclipped (AC-48)", async ({
    page,
  }) => {
    await seeded(page);
    expect(await animatedElements(page)).toEqual([]);
    await noteLink(page, "Normal").hover();
    expect(await animatedElements(page)).toEqual([]);

    const clippingAncestors = await noteLink(page, "Normal").evaluate(
      (link) => {
        const found: string[] = [];
        for (let el = link.parentElement; el; el = el.parentElement) {
          const style = getComputedStyle(el);
          if (style.overflowX !== "visible" || style.overflowY !== "visible")
            found.push(el.tagName);
        }
        return found;
      },
    );
    expect(clippingAncestors).toEqual([]);

    await formLocators(page).title.focus();
    const target = noteLink(page, "Normal");
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press("Tab");
      if (await target.evaluate((el) => el === document.activeElement)) break;
    }
    await expectAccentOutline(target);

    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { level: 2, name: "Normal" }),
    ).toBeFocused();
    expect(await animatedElements(page)).toEqual([]);
    await page.keyboard.press("Shift+Tab");
    await expectAccentOutline(backLink(page));
  });

  test("skip link: hidden until Shift+Tab from Title, 44px, accent outline, Enter then Tab reaches the note (AC-42)", async ({
    page,
  }) => {
    const form = await openForm(page);
    await saveNote(page, "Only", "o");
    await form.title.focus();
    const skip = page.getByRole("link", { name: NOTES_COPY.skip });
    const viewport = page.viewportSize()!;

    const hidden = await skip.boundingBox();
    expect(hidden).not.toBeNull();
    const outside =
      hidden!.y + hidden!.height <= 0 ||
      hidden!.x + hidden!.width <= 0 ||
      hidden!.y >= viewport.height ||
      hidden!.x >= viewport.width;
    expect(outside || (hidden!.width <= 1 && hidden!.height <= 1)).toBe(true);

    await page.keyboard.press("Shift+Tab");
    await expectAccentOutline(skip);
    const shown = await skip.boundingBox();
    expect(shown!.y).toBeGreaterThanOrEqual(0);
    expect(shown!.x).toBeGreaterThanOrEqual(0);
    expect(shown!.x + shown!.width).toBeLessThanOrEqual(viewport.width);
    expect(shown!.height).toBeGreaterThanOrEqual(44);

    const url = page.url();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { level: 2, name: NOTES_COPY.heading }),
    ).toBeFocused();
    expect(page.url()).toBe(url);
    await page.keyboard.press("Tab");
    await expect(noteLink(page, "Only")).toBeFocused();
  });
});
