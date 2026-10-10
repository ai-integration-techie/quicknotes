import { expect, type Locator, type Page } from "@playwright/test";
import { notesSection, seedId, type SeedNote } from "./notes";

/** Copy from the search-notes spec, as e2e checks it. */
export const SEARCH_COPY = {
  label: "Search notes",
  clear: "Clear search",
  noMatchesPrimary: "No matching notes",
  noMatchesSecondary:
    "Try fewer or different words, or clear the search to see all your notes.",
  noneMatch: "No notes match",
} as const;

/** The visible note links in "Your notes" (plan D13). */
export const SHOWN_LINKS =
  "section[aria-labelledby=notes-heading] ul:not([hidden]) > li:not([hidden]) > a";

export function searchbox(page: Page): Locator {
  return page.getByRole("searchbox", { name: SEARCH_COPY.label, exact: true });
}

export function clearSearch(page: Page): Locator {
  return page.getByRole("button", { name: SEARCH_COPY.clear, exact: true });
}

export function searchStatus(page: Page): Locator {
  return page.locator("[data-search-status]");
}

export function shownNoteLinks(page: Page): Locator {
  return page.locator(SHOWN_LINKS);
}

export function noMatches(page: Page): Locator {
  return notesSection(page).getByText(SEARCH_COPY.noMatchesPrimary, {
    exact: true,
  });
}

// ---------------------------------------------------------------------
// The search seed (spec R25, plan D12).

/** 48 lower-case ASCII filler words; none contains "caf", "market" or "zq". */
export const FILLER_WORDS = [
  "alpha", "bravo", "river", "stone", "cloud", "maple", "ocean", "pencil",
  "garden", "window", "yellow", "silver", "forest", "planet", "candle", "bridge",
  "orange", "copper", "winter", "summer", "violet", "harbor", "meadow", "rocket",
  "lemon", "tiger", "falcon", "marble", "velvet", "anchor", "ember", "quartz",
  "cotton", "willow", "pepper", "saddle", "timber", "canyon", "glacier", "dolphin",
  "lantern", "nectar", "orbit", "pebble", "raven", "sierra", "tundra", "walnut",
]; // prettier-ignore

/** A fixed-seed PRNG (mulberry32), so the seed is the same on every run. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fillerText(random: () => number, length: number): string {
  let text = "";
  while (text.length < length) {
    const word = FILLER_WORDS[Math.floor(random() * FILLER_WORDS.length)];
    text += (text === "" ? "" : " ") + word;
  }
  return text.slice(0, length);
}

function exactly(text: string, length: number): string {
  return text.length >= length
    ? text.slice(0, length)
    : text.padEnd(length, "t");
}

const SEED_BASE = Date.now() - 10_000_000;
const CAFE_AT = 1500; // " Café " fills characters 1,501 to 1,506

/** The 1,000-note search seed: item i sorts at position i. */
export function searchSeed(): SeedNote[] {
  const random = mulberry32(0x5ea2c4);
  return Array.from({ length: 1000 }, (_, i) => {
    const time = SEED_BASE + (1000 - i) * 10;
    let title = fillerText(random, 60);
    if (i % 50 === 3) title = "MARKET " + title;
    let body = fillerText(random, 2000);
    if (i % 100 === 7)
      body = body.slice(0, CAFE_AT) + " Café " + body.slice(CAFE_AT + 6);
    return {
      id: seedId(i + 1),
      title: exactly(title, 60),
      body: exactly(body, 2000),
      createdAt: time,
      updatedAt: time,
    };
  });
}

// ---------------------------------------------------------------------
// A reference matcher, written apart from src/ (spec R5-R7).

function referenceFold(text: string): string {
  const kept = [...text.normalize("NFD")].filter((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code < 0x300 || code > 0x36f;
  });
  return kept.join("").toLowerCase().normalize("NFC");
}

/** The ids of the seed notes that match `query`, in list order. */
export function referenceMatch(
  notes: readonly SeedNote[],
  query: string,
): string[] {
  const words = query.trim() === "" ? [] : query.trim().split(/\s+/u);
  const folded = words.map(referenceFold);
  return notes
    .filter((note) => {
      const title = referenceFold(note.title);
      const body = referenceFold(note.body);
      return folded.every((w) => title.includes(w) || body.includes(w));
    })
    .map((note) => note.id);
}

// ---------------------------------------------------------------------
// Timing (plan D13).

export type TriggerEvent = "input" | "click" | "keydown";

/**
 * Arms an in-page watcher: it records the `timeStamp` of the next
 * `trigger` event inside the search area, then checks the shown note links
 * on each animation frame until they are exactly `expected` (or, when
 * `expected` is empty, the no-match text is visible). Resolves the elapsed
 * time on `window.__searchStep`. `mode: "includes"` only needs `expected`
 * among the shown links.
 */
export async function armStep(
  page: Page,
  trigger: TriggerEvent,
  expected: readonly string[],
  mode: "exact" | "includes" = "exact",
): Promise<void> {
  await page.evaluate(
    ({ trigger, expected, mode, selector, noMatchText }) => {
      const hrefs = expected.map((id) => `#note/${id}`);
      const w = window as unknown as { __searchStep: Promise<number> };
      w.__searchStep = new Promise<number>((resolve) => {
        let eventAt: number | null = null;
        const area = document.querySelector('[role="search"]');
        const onEvent = (event: Event) => {
          if (!area?.contains(event.target as Node)) return;
          if (eventAt === null) eventAt = event.timeStamp;
        };
        document.addEventListener(trigger, onEvent, { capture: true });
        const shownMatches = (): boolean => {
          const shown = [...document.querySelectorAll(selector)].map(
            (a) => a.getAttribute("href") ?? "",
          );
          if (hrefs.length === 0) {
            const texts = [
              ...document.querySelectorAll(
                "section[aria-labelledby=notes-heading] p",
              ),
            ];
            return (
              shown.length === 0 &&
              texts.some(
                (p) =>
                  p.textContent === noMatchText &&
                  (p as HTMLElement).offsetParent !== null,
              )
            );
          }
          if (mode === "includes") {
            const set = new Set(shown);
            return hrefs.every((h) => set.has(h));
          }
          return (
            shown.length === hrefs.length &&
            shown.every((href, i) => href === hrefs[i])
          );
        };
        const frame = () => {
          if (eventAt !== null && shownMatches()) {
            const at = performance.now();
            document.removeEventListener(trigger, onEvent, { capture: true });
            resolve(at - eventAt);
            return;
          }
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
    },
    {
      trigger,
      expected: [...expected],
      mode,
      selector: SHOWN_LINKS,
      noMatchText: SEARCH_COPY.noMatchesPrimary,
    },
  );
}

/** The elapsed time of the armed step (see armStep). */
export function stepTime(page: Page): Promise<number> {
  return page.evaluate(
    () => (window as unknown as { __searchStep: Promise<number> }).__searchStep,
  );
}

/** Asserts the seed's markers before it is used (plan D12). */
export function checkSeed(notes: readonly SeedNote[]): void {
  for (const word of FILLER_WORDS) {
    expect(word).toMatch(/^[a-z]+$/);
    for (const banned of ["caf", "market", "zq"])
      expect(word).not.toContain(banned);
  }
  expect(FILLER_WORDS).toHaveLength(48);
  expect(new Set(FILLER_WORDS).size).toBe(48);
  for (const note of notes) {
    expect([...note.title]).toHaveLength(60);
    expect([...note.body]).toHaveLength(2000);
  }
  expect(new Set(notes.map((n) => n.updatedAt)).size).toBe(1000);
  expect(referenceMatch(notes, "cafe")).toHaveLength(10);
  expect(referenceMatch(notes, "market")).toHaveLength(20);
  expect(referenceMatch(notes, "cafe market")).toHaveLength(0);
}

export async function expectAccentOutline(locator: Locator): Promise<void> {
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

export function animatedElements(page: Page): Promise<string[]> {
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

export const TEXT_SPACING_CSS = `
  * {
    line-height: 1.5 !important;
    letter-spacing: 0.12em !important;
    word-spacing: 0.16em !important;
  }
  p {
    margin-bottom: 2em !important;
  }
`;
