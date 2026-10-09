import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { UNTITLED_NOTE } from "../copy";
import type { Note } from "../storage";
import { createFixedClock } from "../test/fakes";
import { createInMemoryNoteRepository } from "../test/inMemoryNoteRepository";
import { settle } from "../test/renderApp";
import {
  makeNote,
  noteLinkNames,
  noteLinks,
  notesSection,
  updatedLines,
} from "../test/renderNotes";
import { createStubRepository } from "../test/repositoryDoubles";

const ELLIPSIS = "…";
const T = Date.parse("2026-10-08T12:00:00Z");
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

afterEach(() => {
  vi.useRealTimers();
});

async function renderList(notes: Note[]): Promise<void> {
  render(
    <App
      repository={createStubRepository({ list: () => Promise.resolve(notes) })}
    />,
  );
  await settle();
}

/** The preview line of the n-th link (its first describedby id when there are two). */
function previewOf(link: HTMLElement): string | null {
  const ids = (link.getAttribute("aria-describedby") ?? "").split(" ");
  if (ids.length < 2) return null;
  return document.getElementById(ids[0] ?? "")?.textContent ?? null;
}

function titleLineOf(link: HTMLElement): HTMLElement {
  const id = link.getAttribute("aria-labelledby") ?? "";
  const line = document.getElementById(id);
  if (!line) throw new Error("no title line");
  return line;
}

describe("Your notes: items", () => {
  it("shows notes in list() order, without re-sorting (AC-6)", async () => {
    const X = makeNote(1, { title: "X", updatedAt: 1 });
    const Y = makeNote(2, { title: "Y", updatedAt: 3 });
    const Z = makeNote(3, { title: "Z", updatedAt: 2 });
    await renderList([X, Y, Z]);
    expect(noteLinkNames()).toEqual(["X", "Y", "Z"]);
  });

  it("shows the in-memory repository's order: newest update first (AC-6)", async () => {
    const clock = createFixedClock(1000);
    const repository = createInMemoryNoteRepository({ now: clock });
    await repository.create({ title: "A", body: "" });
    clock.set(3000);
    await repository.create({ title: "B", body: "" });
    clock.set(2000);
    await repository.create({ title: "C", body: "" });
    render(<App repository={repository} />);
    await settle();
    expect(noteLinkNames()).toEqual(["B", "C", "A"]);
  });

  it("renders all 1,000 notes at once, each linking to #note/<id>, with no paging (AC-7)", async () => {
    const notes = Array.from({ length: 1000 }, (_, i) => makeNote(i + 1));
    await renderList(notes);
    const list = notesSection().querySelector("ul");
    const items = list?.querySelectorAll(":scope > li") ?? [];
    expect(items).toHaveLength(1000);
    items.forEach((item, i) => {
      const links = item.querySelectorAll("a");
      expect(links).toHaveLength(1);
      expect(links[0]?.getAttribute("href")).toBe(`#note/${notes[i]?.id}`);
    });
    expect(document.body.textContent).not.toMatch(
      /load more|show more|next page/i,
    );
  });

  it("a link's name is the title and its description is the preview and updated line, with a <time> (AC-8)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-08T12:05:00Z"));
    await renderList([
      makeNote(1, {
        title: "Shopping",
        body: "Milk\nEggs",
        updatedAt: Date.parse("2026-10-08T12:00:00Z"),
      }),
    ]);
    const link = screen.getByRole("link", { name: "Shopping" });
    expect(link).toHaveAccessibleName("Shopping");
    expect(link).toHaveAccessibleDescription("Milk Eggs Updated 5 minutes ago");
    const time = link.querySelector("time");
    expect(time?.dateTime).toBe("2026-10-08T12:00:00.000Z");
  });

  it("blank titles read Untitled note; titles are kept exactly and never truncated (AC-9)", async () => {
    const long = "t".repeat(200);
    await renderList([
      makeNote(1, { title: "" }),
      makeNote(2, { title: " " }),
      makeNote(3, { title: "\t" }),
      makeNote(4, { title: "  lead  " }),
      makeNote(5, { title: long }),
    ]);
    const links = noteLinks();
    for (const link of links.slice(0, 3)) {
      expect(link).toHaveAccessibleName(UNTITLED_NOTE);
    }
    expect(titleLineOf(links[3] as HTMLElement).textContent).toBe("  lead  ");
    expect(titleLineOf(links[4] as HTMLElement).textContent).toBe(long);
    expect(screen.getByText(long)).toBeInTheDocument();
  });

  it("preview lines follow the collapse and 100-code-point rule (AC-10)", async () => {
    const cases: [string, string | null][] = [
      ["line1\n\n  line2\tend", "line1 line2 end"],
      ["a".repeat(150), "a".repeat(100) + ELLIPSIS],
      ["a".repeat(100), "a".repeat(100)],
      ["\u{1F600}".repeat(101), "\u{1F600}".repeat(100) + ELLIPSIS],
      ["a".repeat(99) + " b" + "c".repeat(10), "a".repeat(99) + ELLIPSIS],
      ["", null],
      ["   ", null],
      ["\n\n", null],
    ];
    await renderList(
      cases.map(([body], i) => makeNote(i + 1, { title: `n${i}`, body })),
    );
    const links = noteLinks();
    cases.forEach(([, expected], i) => {
      const link = links[i] as HTMLElement;
      expect(previewOf(link), `case ${i}`).toBe(expected);
      const preview = previewOf(link) ?? "";
      expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(preview)).toBe(false);
      if (expected === null) {
        expect(link.getAttribute("aria-describedby")?.split(" ")).toHaveLength(
          1,
        );
        expect(link).toHaveAccessibleDescription(/^Updated /);
      }
    });
  });

  it("updated lines follow the R8 table (AC-11)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(T);
    const table: [number, string][] = [
      [0, "Updated just now"],
      [-5_000, "Updated just now"],
      [59_999, "Updated just now"],
      [60_000, "Updated 1 minute ago"],
      [59 * MIN, "Updated 59 minutes ago"],
      [60 * MIN, "Updated 1 hour ago"],
      [23 * HOUR + 59 * MIN, "Updated 23 hours ago"],
      [24 * HOUR, "Updated 1 day ago"],
      [6 * DAY + 23 * HOUR, "Updated 6 days ago"],
      [7 * DAY, "Updated 1 week ago"],
      [29 * DAY, "Updated 4 weeks ago"],
      [30 * DAY, "Updated 1 month ago"],
      [364 * DAY, "Updated 12 months ago"],
      [365 * DAY, "Updated 1 year ago"],
      [800 * DAY, "Updated 2 years ago"],
    ];
    await renderList(
      table.map(([offset], i) => makeNote(i + 1, { updatedAt: T - offset })),
    );
    expect(updatedLines()).toEqual(table.map(([, text]) => text));
  });

  it("Your notes is a list with one listitem per note (AC-49)", async () => {
    await renderList([makeNote(1), makeNote(2), makeNote(3)]);
    const list = within(notesSection()).getByRole("list");
    expect(list.tagName).toBe("UL");
    expect(list).toHaveAttribute("role", "list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  });
});
