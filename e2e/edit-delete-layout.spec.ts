import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  btn,
  dialogBox,
  disallowedColours,
  EDIT_COPY,
  noteField,
  openFromList,
  seeded,
  startEdit,
  TEXT_SPACING_CSS,
} from "./editDelete";
import { seedId } from "./notes";

const VIEWPORTS = [
  { width: 360, height: 740 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
];
const LONG_TITLE = "T".repeat(200);
const NOW = Date.now();

function notes(body: string) {
  return [
    {
      id: seedId(1),
      title: LONG_TITLE,
      body,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ];
}

async function openLong(page: Page, body = "b".repeat(5000)): Promise<void> {
  await seeded(page, notes(body));
  await openFromList(page, LONG_TITLE);
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

/** Visible text elements (and dialog paragraphs) that clip their content. */
function clippedText(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [
      ...document.querySelectorAll(
        "main h2, main label, main button, main [role=status], main [role=alert], main form p, [role=alertdialog] h2, [role=alertdialog] p, [role=alertdialog] button",
      ),
    ]
      .filter((el) => !el.closest("[hidden]"))
      .filter(
        (el) =>
          el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight,
      )
      .map((el) => `${el.tagName} ${(el.textContent ?? "").slice(0, 30)}`),
  );
}

async function expectAccentOutline(page: Page, locator: Locator) {
  await page.keyboard.press("Shift");
  await locator.focus();
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

/** Runs `check` in reading mode, edit mode and with each dialog open. */
async function inEachView(
  page: Page,
  check: (view: string) => Promise<void>,
): Promise<void> {
  await check("reading");
  await btn(page, EDIT_COPY.delete).click();
  await expect(dialogBox(page)).toBeVisible();
  await check("delete dialog");
  await btn(page, EDIT_COPY.keepNote).click();
  await startEdit(page);
  await check("edit");
  await noteField(page).press("End");
  await noteField(page).pressSequentially("x");
  await btn(page, EDIT_COPY.cancel).click();
  await expect(dialogBox(page)).toBeVisible();
  await check("discard dialog");
}

test.describe("edit and delete layout", () => {
  for (const viewport of VIEWPORTS) {
    test(`no overflow, buttons inside the viewport and 44px tall, dialogs inside, column centred at ${viewport.width}x${viewport.height} (AC-47)`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openLong(page);
      await inEachView(page, async (view) => {
        expect(await hasHorizontalOverflow(page), view).toBe(false);
        expect(await mainCentreOffset(page), view).toBeLessThanOrEqual(2);
        const names =
          view === "reading"
            ? [EDIT_COPY.edit, EDIT_COPY.delete]
            : view === "edit"
              ? [EDIT_COPY.saveChanges, EDIT_COPY.cancel]
              : view === "delete dialog"
                ? [EDIT_COPY.keepNote, EDIT_COPY.deleteNote]
                : [EDIT_COPY.keepEditing, EDIT_COPY.discardChanges];
        for (const name of names) {
          await expectInsideAnd44(btn(page, name), viewport.width);
        }
        if (view.endsWith("dialog")) {
          const box = await dialogBox(page).boundingBox();
          expect(box!.x).toBeGreaterThanOrEqual(0);
          expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
        }
      });
    });
  }

  test("reflow at 320px and 200% text, dialogs scroll to their buttons (AC-48)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await openLong(page, "u".repeat(100_000));
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    await inEachView(page, async (view) => {
      expect(await hasHorizontalOverflow(page), view).toBe(false);
      if (view.endsWith("dialog")) {
        for (const button of await dialogBox(page).getByRole("button").all()) {
          await button.scrollIntoViewIfNeeded();
          await expect(button).toBeInViewport();
        }
      }
    });
    await btn(page, EDIT_COPY.keepEditing).click();
    await expect(dialogBox(page)).toHaveCount(0);
  });

  test("WCAG 1.4.12 text spacing at 360px clips nothing (AC-49)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await openLong(page);
    await page.addStyleTag({ content: TEXT_SPACING_CSS });
    await inEachView(page, async (view) => {
      expect(await hasHorizontalOverflow(page), view).toBe(false);
      expect(await clippedText(page), view).toEqual([]);
    });
  });

  test("no animations, accent focus outline on every new button, no red anywhere (AC-50)", async ({
    page,
  }) => {
    await openLong(page);
    await inEachView(page, async (view) => {
      expect(await animatedElements(page), view).toEqual([]);
      expect(await disallowedColours(page), view).toEqual([]);
      const names =
        view === "reading"
          ? [EDIT_COPY.edit, EDIT_COPY.delete]
          : view === "edit"
            ? [EDIT_COPY.saveChanges, EDIT_COPY.cancel]
            : view === "delete dialog"
              ? [EDIT_COPY.keepNote, EDIT_COPY.deleteNote]
              : [EDIT_COPY.keepEditing, EDIT_COPY.discardChanges];
      for (const name of names)
        await expectAccentOutline(page, btn(page, name));
    });
  });
});
