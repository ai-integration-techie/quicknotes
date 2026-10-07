import { describe, expect, it } from "vitest";
import { clickSave, paste, renderApp } from "../test/renderApp";
import { createSpyRepository } from "../test/repositoryDoubles";

function counter(text: string): HTMLElement | null {
  return (
    [...document.querySelectorAll<HTMLElement>("main p")].find(
      (element) => element.textContent === text,
    ) ?? null
  );
}

function anyCounter(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>("main p")].filter(
    (element) => /^\S+ of \S+ characters$/.test(element.textContent ?? ""),
  );
}

function isLive(element: HTMLElement): boolean {
  for (
    let node: HTMLElement | null = element;
    node !== null;
    node = node.parentElement
  ) {
    if (node.hasAttribute("aria-live")) return true;
    const role = node.getAttribute("role");
    if (role === "status" || role === "alert") return true;
  }
  return false;
}

describe("NoteForm counter", () => {
  it("Title counter appears at 180, shows 200 and 205 with the same classes, hides at 179, is described-by and not live (AC-25)", () => {
    const app = renderApp(createSpyRepository());
    paste(app.title, "a".repeat(179));
    expect(anyCounter()).toEqual([]);
    expect(app.title).not.toHaveAttribute("aria-describedby");

    paste(app.title, "a".repeat(180));
    const at180 = counter("180 of 200 characters");
    expect(at180).not.toBeNull();
    const classes = at180?.className;
    expect(app.title.getAttribute("aria-describedby")).toContain(at180?.id);
    expect(isLive(at180!)).toBe(false);

    paste(app.title, "a".repeat(200));
    expect(counter("200 of 200 characters")?.className).toBe(classes);

    paste(app.title, "a".repeat(205));
    const at205 = counter("205 of 200 characters");
    expect(at205?.className).toBe(classes);
    expect(app.title.getAttribute("aria-describedby")).toContain(at205?.id);
    expect(isLive(at205!)).toBe(false);

    paste(app.title, "a".repeat(179));
    expect(anyCounter()).toEqual([]);
    expect(app.title).not.toHaveAttribute("aria-describedby");
  });

  it("Note counter appears at 90,000 and reads 100,001 of 100,000 (AC-26)", () => {
    const app = renderApp(createSpyRepository());
    paste(app.note, "a".repeat(89999));
    expect(anyCounter()).toEqual([]);

    paste(app.note, "a".repeat(90000));
    const at90k = counter("90,000 of 100,000 characters");
    expect(at90k).not.toBeNull();
    expect(app.note.getAttribute("aria-describedby")).toContain(at90k?.id);

    paste(app.note, "a".repeat(100001));
    expect(counter("100,001 of 100,000 characters")).not.toBeNull();
  });

  it("180 emoji count as 180 characters (AC-27)", () => {
    const app = renderApp(createSpyRepository());
    paste(app.title, "😀".repeat(180));
    expect(counter("180 of 200 characters")).not.toBeNull();
  });

  it("after a too-long save, the field describes its error then its counter (R16, R19)", async () => {
    const app = renderApp(createSpyRepository());
    paste(app.title, "a".repeat(205));
    await clickSave(app);

    const ids = (app.title.getAttribute("aria-describedby") ?? "").split(" ");
    expect(ids).toHaveLength(2);
    const [errorId, counterId] = ids;
    expect(document.getElementById(errorId ?? "")?.textContent).toContain(
      "too long",
    );
    expect(document.getElementById(counterId ?? "")?.textContent).toBe(
      "205 of 200 characters",
    );
  });
});
