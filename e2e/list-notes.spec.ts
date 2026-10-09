import { expect, test } from "@playwright/test";
import { openForm } from "./form";
import { noteLinks, saveNote } from "./notes";

/** list-notes: the list in a real browser. Each test uses its own `page` context (R43). */
test.describe("list notes", () => {
  test("saved notes appear newest first without a reload or navigation (AC-23)", async ({
    page,
  }) => {
    await openForm(page);
    await page.evaluate(() => {
      (window as unknown as { __marker: boolean }).__marker = true;
    });

    await saveNote(page, "First", "one");
    await saveNote(page, "Second", "two");

    await expect(noteLinks(page)).toHaveCount(2);
    const names = await noteLinks(page).evaluateAll((links) =>
      links.map(
        (link) =>
          document.getElementById(link.getAttribute("aria-labelledby") ?? "")
            ?.textContent,
      ),
    );
    expect(names).toEqual(["Second", "First"]);
    expect(
      await page.evaluate(
        () => (window as unknown as { __marker?: boolean }).__marker,
      ),
    ).toBe(true);
  });
});
