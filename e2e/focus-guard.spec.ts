import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  btn,
  dialogBox,
  EDIT_COPY,
  noteLink,
  openFromList,
  seeded,
} from "./editDelete";
import { clippingReasons } from "./focusGuard";
import { seedId } from "./notes";

/** focus-outline-guard: self-checks that prove the guard bites (R5). Each test has its own context. */
const NOW = Date.now();
const NOTES = [
  { n: 1, title: "Normal", body: "Milk\nEggs" },
  { n: 2, title: "Other", body: "o" },
].map(({ n, title, body }) => ({
  id: seedId(n),
  title,
  body,
  createdAt: NOW - n * 1000,
  updatedAt: NOW - n * 1000,
}));

function link(page: Page): Locator {
  return noteLink(page, "Normal");
}

function item(page: Page): Locator {
  return link(page).locator("xpath=..");
}

/**
 * Sets `property: value` inline on `target`, runs `check`, then always
 * removes it and re-checks that the guard on `guarded` is back to `[]` (R5).
 */
async function withInline(
  target: Locator,
  property: string,
  value: string,
  guarded: Locator,
  check: () => Promise<void>,
  options?: { overflow?: boolean },
): Promise<void> {
  await target.evaluate(
    (el, [p, v]) => (el as HTMLElement).style.setProperty(p, v),
    [property, value] as const,
  );
  try {
    await check();
  } finally {
    await target.evaluate(
      (el, p) => (el as HTMLElement).style.removeProperty(p),
      property,
    );
  }
  expect(await clippingReasons(guarded, options)).toEqual([]);
}

test.describe("focus-outline guard self-checks", () => {
  test("guard returns [] for a note link as shipped (AC-2)", async ({
    page,
  }) => {
    await seeded(page, NOTES);
    expect(await clippingReasons(link(page))).toEqual([]);
  });

  test("content-visibility: auto on the li is reported, then cleared (AC-3)", async ({
    page,
  }) => {
    await seeded(page, NOTES);
    await withInline(
      item(page),
      "content-visibility",
      "auto",
      link(page),
      async () => {
        expect(await clippingReasons(link(page))).toEqual([
          "li content-visibility: auto",
        ]);
      },
    );
  });

  test("contain: paint on the li is reported, then cleared (AC-4)", async ({
    page,
  }) => {
    await seeded(page, NOTES);
    await withInline(item(page), "contain", "paint", link(page), async () => {
      expect(await clippingReasons(link(page))).toEqual(["li contain: paint"]);
    });
  });

  test("contain: strict and content are reported; contain: layout is not (AC-5)", async ({
    page,
  }) => {
    await seeded(page, NOTES);
    for (const value of ["strict", "content"]) {
      await withInline(item(page), "contain", value, link(page), async () => {
        expect(await clippingReasons(link(page)), value).toEqual([
          `li contain: ${value}`,
        ]);
      });
    }
    await withInline(item(page), "contain", "layout", link(page), async () => {
      expect(await clippingReasons(link(page))).toEqual([]);
    });
  });

  test("self content-visibility reported; ancestor overflow per axis; self overflow ignored (AC-6)", async ({
    page,
  }) => {
    await seeded(page, NOTES);
    await withInline(
      link(page),
      "content-visibility",
      "auto",
      link(page),
      async () => {
        expect(await clippingReasons(link(page))).toEqual([
          "a (self) content-visibility: auto",
        ]);
      },
    );
    await withInline(item(page), "overflow", "hidden", link(page), async () => {
      expect(await clippingReasons(link(page))).toEqual([
        "li overflow-x: hidden",
        "li overflow-y: hidden",
      ]);
    });
    await withInline(link(page), "overflow", "hidden", link(page), async () => {
      expect(await clippingReasons(link(page))).toEqual([]);
    });
  });

  test("dialog option: Keep note passes, contain: paint on the dialog box is caught, full guard reports overflow-y: auto (AC-7)", async ({
    page,
  }) => {
    await seeded(page, NOTES);
    await openFromList(page, "Normal");
    await btn(page, EDIT_COPY.delete).click();
    await expect(dialogBox(page)).toBeVisible();
    const keep = btn(page, EDIT_COPY.keepNote);
    const dialogOnly = { overflow: false };
    const box = await dialogBox(page).evaluate(
      (el) => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : ""),
    );

    expect(await clippingReasons(keep, dialogOnly)).toEqual([]);
    await withInline(
      dialogBox(page),
      "contain",
      "paint",
      keep,
      async () => {
        expect(await clippingReasons(keep, dialogOnly)).toEqual([
          `${box} contain: paint`,
        ]);
      },
      dialogOnly,
    );

    expect(await clippingReasons(keep)).toContain(`${box} overflow-y: auto`);
  });
});
