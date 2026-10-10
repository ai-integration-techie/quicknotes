import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { gotoApp } from "./app";
import {
  axNames,
  backLink,
  btn,
  dialogBox,
  EDIT_COPY,
  faultNoteWrites,
  heading,
  noteLink,
  notesStatus,
  openFromList,
  removeStoredNote,
  seeded,
  setWriteFault,
  startEdit,
  titleField,
  viewStatus,
  editAlert,
  noteField,
} from "./editDelete";
import { NOTES_COPY, seedId } from "./notes";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const NOW = Date.now();
const NOTES = [
  { n: 1, title: "First", body: "one" },
  { n: 2, title: "Second", body: "two" },
].map(({ n, title, body }) => ({
  id: seedId(n),
  title,
  body,
  createdAt: NOW - n * 60_000,
  updatedAt: NOW - n * 60_000,
}));
const FIRST_ID = seedId(1);

const DIALOG_STATES = new Set([
  "the discard dialog",
  "the delete dialog",
  "the delete dialog deleting",
]);

function allInsideDialog(page: Page, selectors: string[]): Promise<boolean> {
  return page.evaluate(
    (list) =>
      list.every((selector) => {
        const found = [...document.querySelectorAll(selector)];
        return (
          found.length > 0 &&
          found.every((el) => el.closest("[role=alertdialog]") !== null)
        );
      }),
    selectors,
  );
}

/**
 * AC-46 (Revision 2026-10-10): each dialog text element against the box's
 * solid background, button labels against their own background (4.5:1, or
 * 3:1 for large text), and the focused button's outline against the box (3:1).
 */
function dialogContrastProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const parse = (value: string): number[] => {
      const parts = value.match(/[\d.]+/g)?.map(Number) ?? [];
      if (!value.startsWith("rgb") || parts.length < 3) {
        throw new Error(`unexpected colour ${value}`);
      }
      if (parts.length === 4 && parts[3] !== 1) {
        throw new Error(`translucent colour ${value}`);
      }
      return parts.slice(0, 3);
    };
    const luminance = (rgb: number[]): number => {
      const [r, g, b] = rgb.map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
    };
    const ratio = (a: string, b: string): number => {
      const [x, y] = [luminance(parse(a)), luminance(parse(b))];
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    };
    const box = document.querySelector("[role=alertdialog]");
    if (!box) return ["no dialog"];
    const boxBg = getComputedStyle(box).backgroundColor;
    const problems: string[] = [];
    const texts = [...box.querySelectorAll("h2, p, button")];
    if (texts.length < 4) problems.push(`only ${texts.length} text elements`);
    for (const el of texts) {
      const style = getComputedStyle(el);
      const bg = el.tagName === "BUTTON" ? style.backgroundColor : boxBg;
      const size = parseFloat(style.fontSize);
      const bold = Number(style.fontWeight) >= 700;
      const large = size >= 24 || (bold && size >= 18.66);
      const needed = large ? 3 : 4.5;
      const got = ratio(style.color, bg);
      if (got < needed) problems.push(`${el.textContent}: ${got.toFixed(2)}`);
    }
    // Called once per keyboard-focused button: its focus outline against the box.
    const active = document.activeElement;
    if (active instanceof HTMLButtonElement && box.contains(active)) {
      const style = getComputedStyle(active);
      if (style.outlineStyle === "none") {
        problems.push(`no outline on ${active.textContent}`);
      } else {
        const got = ratio(style.outlineColor, boxBg);
        if (got < 3) problems.push(`outline ${active.textContent}: ${got}`);
      }
    }
    return problems;
  });
}

async function openFirst(page: Page): Promise<void> {
  await seeded(page, NOTES);
  await openFromList(page, "First");
}

async function editFirst(page: Page): Promise<void> {
  await openFirst(page);
  await startEdit(page);
}

async function openDelete(page: Page): Promise<void> {
  await btn(page, EDIT_COPY.delete).click();
  await expect(btn(page, EDIT_COPY.keepNote)).toBeFocused();
}

const STATES: { name: string; setup: (page: Page) => Promise<void> }[] = [
  { name: "reading mode", setup: openFirst },
  {
    name: "reading mode with Changes saved.",
    setup: async (page) => {
      await editFirst(page);
      await titleField(page).press("End");
      await titleField(page).pressSequentially("!");
      await btn(page, EDIT_COPY.saveChanges).click();
      await expect(viewStatus(page)).toHaveText(EDIT_COPY.changesSaved);
    },
  },
  { name: "edit mode idle", setup: editFirst },
  {
    name: "edit mode with a counter",
    setup: async (page) => {
      await editFirst(page);
      await titleField(page).fill("c".repeat(185));
      await expect(page.getByText("185 of 200 characters")).toBeVisible();
    },
  },
  {
    name: "edit title too long",
    setup: async (page) => {
      await editFirst(page);
      await titleField(page).fill("c".repeat(201));
      await btn(page, EDIT_COPY.saveChanges).click();
      await expect(titleField(page)).toHaveAttribute("aria-invalid", "true");
    },
  },
  {
    name: "edit both empty",
    setup: async (page) => {
      await editFirst(page);
      await titleField(page).fill("");
      await noteField(page).fill("");
      await btn(page, EDIT_COPY.saveChanges).click();
      await expect(editAlert(page)).toHaveText(
        "Add a title or some text first.",
      );
    },
  },
  {
    name: "edit save failed",
    setup: async (page) => {
      await editFirst(page);
      const second = await page.context().newPage();
      await gotoApp(second);
      await removeStoredNote(second, FIRST_ID);
      await second.close();
      await noteField(page).pressSequentially("x");
      await btn(page, EDIT_COPY.saveChanges).click();
      await expect(editAlert(page)).toHaveText(EDIT_COPY.changesNotFound);
    },
  },
  {
    name: "the discard dialog",
    setup: async (page) => {
      await editFirst(page);
      await noteField(page).pressSequentially("x");
      await btn(page, EDIT_COPY.cancel).click();
      await expect(btn(page, EDIT_COPY.keepEditing)).toBeFocused();
    },
  },
  {
    name: "the delete dialog",
    setup: async (page) => {
      await openFirst(page);
      await openDelete(page);
    },
  },
  {
    name: "the delete dialog deleting",
    setup: async (page) => {
      await faultNoteWrites(page);
      await openFirst(page);
      await setWriteFault(page, "hang");
      await openDelete(page);
      await btn(page, EDIT_COPY.deleteNote).click();
      await expect(btn(page, EDIT_COPY.deleting)).toBeVisible();
    },
  },
  {
    name: "delete failed",
    setup: async (page) => {
      await faultNoteWrites(page);
      await openFirst(page);
      await setWriteFault(page, "fail");
      await openDelete(page);
      await btn(page, EDIT_COPY.deleteNote).click();
      await expect(
        page.locator("main > div:not([hidden]) > [role=alert]"),
      ).toHaveText(EDIT_COPY.deleteUnavailable);
    },
  },
  {
    name: "the list view with Note deleted.",
    setup: async (page) => {
      await openFirst(page);
      await openDelete(page);
      await btn(page, EDIT_COPY.deleteNote).click();
      await expect(notesStatus(page)).toHaveText(EDIT_COPY.noteDeleted);
    },
  },
];

async function pressUntilFocused(
  page: Page,
  key: string,
  target: Locator,
): Promise<void> {
  for (let i = 0; i < 25; i += 1) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press(key);
  }
  await expect(target).toBeFocused();
}

test.describe("edit and delete accessibility", () => {
  for (const state of STATES) {
    test(`${state.name}: no WCAG 2.1 A/AA axe violations, contrast evaluated (AC-46)`, async ({
      page,
    }) => {
      await state.setup(page);
      const results = await new AxeBuilder({ page })
        .withTags(WCAG_TAGS)
        .analyze();
      expect(results.violations).toEqual([]);
      const incomplete = results.incomplete.find(
        (r) => r.id === "color-contrast",
      );
      if (DIALOG_STATES.has(state.name)) {
        // Revision 2026-10-10: only dialog text may be incomplete (axe counts
        // the dimmed page under each line); it is then checked explicitly.
        const selectors = (incomplete?.nodes ?? []).map((n) =>
          String(n.target[0]),
        );
        expect(await allInsideDialog(page, selectors)).toBe(true);
        for (let i = 0; i < 2; i += 1) {
          await page.keyboard.press("Tab"); // keyboard focus shows :focus-visible
          expect(await dialogContrastProblems(page)).toEqual([]);
        }
      } else {
        expect(incomplete).toBeUndefined();
        const contrast = results.passes.find((r) => r.id === "color-contrast");
        expect(contrast?.nodes.length).toBeGreaterThanOrEqual(3);
      }
    });
  }

  for (const kind of ["delete", "discard"] as const) {
    test(`dialogs trap Tab, ignore outside clicks and hide the page from the accessibility tree (AC-33): ${kind}`, async ({
      page,
    }) => {
      const pageHeading = kind === "delete" ? "First" : "Edit note";
      if (kind === "delete") {
        await openFirst(page);
        await openDelete(page);
      } else {
        await editFirst(page);
        await noteField(page).pressSequentially("x");
        await btn(page, EDIT_COPY.cancel).click();
      }
      const buttons = dialogBox(page).getByRole("button");
      for (const key of [
        "Tab",
        "Tab",
        "Tab",
        "Shift+Tab",
        "Shift+Tab",
        "Shift+Tab",
      ]) {
        await page.keyboard.press(key);
        const inside = await buttons.evaluateAll((all) =>
          all.includes(document.activeElement as HTMLElement),
        );
        expect(inside, key).toBe(true);
      }
      const url = page.url();
      const box = await backLink(page).boundingBox();
      await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
      expect(page.url()).toBe(url);
      await expect(dialogBox(page)).toBeVisible();

      const open = await axNames(page);
      expect(open).not.toContain(`link:${NOTES_COPY.back}`);
      expect(open).not.toContain(`heading:${pageHeading}`);
      expect(open).not.toContain("heading:QuickNotes");

      await page.keyboard.press("Escape");
      await expect(dialogBox(page)).toHaveCount(0);
      const closed = await axNames(page);
      expect(closed).toContain(`link:${NOTES_COPY.back}`);
      expect(closed).toContain(`heading:${pageHeading}`);
      expect(closed).toContain("heading:QuickNotes");
    });
  }

  test("keyboard only: open, edit, save, delete (AC-51)", async ({ page }) => {
    await seeded(page, NOTES);
    await expect(titleField(page)).toBeFocused();
    await pressUntilFocused(page, "Tab", noteLink(page, "First"));
    await page.keyboard.press("Enter");
    await expect(heading(page, "First")).toBeFocused();
    await pressUntilFocused(page, "Shift+Tab", btn(page, EDIT_COPY.edit));
    await page.keyboard.press("Enter");
    await expect(titleField(page)).toBeFocused();
    await page.keyboard.press("End");
    await page.keyboard.type("!");
    await page.keyboard.press("Control+Enter");
    await expect(viewStatus(page)).toHaveText(EDIT_COPY.changesSaved);
    await pressUntilFocused(page, "Shift+Tab", btn(page, EDIT_COPY.delete));
    await page.keyboard.press("Enter");
    await expect(btn(page, EDIT_COPY.keepNote)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(btn(page, EDIT_COPY.deleteNote)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(heading(page, NOTES_COPY.heading)).toBeFocused();
    await expect(noteLink(page, "First!")).toHaveCount(0);
    await expect(noteLink(page, "Second")).toBeVisible();
  });
});
