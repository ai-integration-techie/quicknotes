import { expect, test, type Page } from "@playwright/test";
import { gotoApp } from "./app";
import { longTasks, NOTES_COPY, observeLongTasks, seedNotes } from "./notes";
import {
  armStep,
  checkSeed,
  clearSearch,
  noMatches,
  referenceMatch,
  SEARCH_COPY,
  searchbox,
  searchSeed,
  shownNoteLinks,
  stepTime,
  type TriggerEvent,
} from "./search";

/** search-notes R25, R26: budgets in headless Chromium against the production build. */
const STEP_MS = 100;
const PASTE_MS = 300;
const RUNS = 3; // plan D13: each step's median over 3 runs

const SEED = searchSeed();
const ALL = SEED.map((note) => note.id);

async function loadSeed(page: Page): Promise<void> {
  checkSeed(SEED);
  await gotoApp(page);
  await expect(page.getByText(NOTES_COPY.emptyPrimary)).toBeVisible();
  await seedNotes(page, SEED);
  await observeLongTasks(page);
  await page.reload();
  await expect(shownNoteLinks(page)).toHaveCount(1000);
  await searchbox(page).focus(); // primes the fold cache (plan D5)
}

interface Step {
  readonly label: string;
  readonly trigger: TriggerEvent;
  readonly expected: readonly string[];
  readonly act: (page: Page) => Promise<void>;
}

/** The R25 script: "cafe market" key by key, 7 Backspaces, Clear, "market", Escape. */
function script(): Step[] {
  const steps: Step[] = [];
  let query = "";
  for (const key of "cafe market") {
    query += key;
    const q = query;
    steps.push({
      label: `type ${JSON.stringify(q)}`,
      trigger: "input",
      expected: referenceMatch(SEED, q),
      act: (page) => page.keyboard.type(key),
    });
  }
  for (let i = 0; i < 7; i += 1) {
    query = query.slice(0, -1);
    const q = query;
    steps.push({
      label: `Backspace to ${JSON.stringify(q)}`,
      trigger: "input",
      expected: referenceMatch(SEED, q),
      act: (page) => page.keyboard.press("Backspace"),
    });
  }
  steps.push({
    label: "Clear search",
    trigger: "click",
    expected: ALL,
    act: (page) => clearSearch(page).click(),
  });
  query = "";
  for (const key of "market") {
    query += key;
    const q = query;
    steps.push({
      label: `type ${JSON.stringify(q)}`,
      trigger: "input",
      expected: referenceMatch(SEED, q),
      act: (page) => page.keyboard.type(key),
    });
  }
  steps.push({
    label: "Escape",
    trigger: "keydown",
    expected: ALL,
    act: (page) => page.keyboard.press("Escape"),
  });
  return steps;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] as number;
}

async function longTasksOver(
  page: Page,
  ms: number,
  from: number,
  to = Number.POSITIVE_INFINITY,
) {
  return (await longTasks(page)).filter(
    (task) =>
      task.duration > ms &&
      task.start + task.duration >= from &&
      task.start <= to,
  );
}

/**
 * Arms an in-page recorder: the first keydown and last input timeStamps,
 * and the first animation frame at which the field holds `final` and the
 * no-match text is visible.
 */
async function recordTyping(page: Page, final: string): Promise<void> {
  await page.evaluate(
    ({ final, noMatchText }) => {
      const times = { firstKey: -1, lastInput: -1, shownAt: -1 };
      Object.defineProperty(window, "__typing", { value: times });
      document.addEventListener(
        "keydown",
        (event) => {
          if (times.firstKey < 0) times.firstKey = event.timeStamp;
        },
        { capture: true },
      );
      document.addEventListener(
        "input",
        (event) => {
          times.lastInput = event.timeStamp;
        },
        { capture: true },
      );
      const field = document.querySelector<HTMLInputElement>(
        'input[type="search"]',
      );
      const frame = () => {
        const shown = [
          ...document.querySelectorAll<HTMLElement>(
            "section[aria-labelledby=notes-heading] p",
          ),
        ].some((p) => p.textContent === noMatchText && p.offsetParent !== null);
        if (field?.value === final && shown) {
          times.shownAt = performance.now();
          return;
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    },
    { final, noMatchText: SEARCH_COPY.noMatchesPrimary },
  );
}

function typingTimes(
  page: Page,
): Promise<{ firstKey: number; lastInput: number; shownAt: number }> {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __typing: { firstKey: number; lastInput: number; shownAt: number };
        }
      ).__typing,
  );
}

test.describe("search performance", () => {
  test("26-step script, each step's median under 100 ms on the search seed (AC-27)", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await loadSeed(page);
    const steps = script();
    expect(steps).toHaveLength(26);
    expect(referenceMatch(SEED, "cafe")).toHaveLength(10);
    expect(referenceMatch(SEED, "market")).toHaveLength(20);

    const times: number[][] = steps.map(() => []);
    for (let run = 0; run < RUNS; run += 1) {
      await expect(searchbox(page)).toBeFocused();
      for (const [i, step] of steps.entries()) {
        await armStep(page, step.trigger, step.expected);
        await step.act(page);
        times[i]!.push(await stepTime(page));
      }
      await expect(searchbox(page)).toHaveValue("");
    }
    const report = steps.map((step, i) => ({
      step: step.label,
      median: Math.round(median(times[i]!)),
      runs: times[i]!.map(Math.round),
    }));
    test.info().annotations.push({
      type: "search step timings (ms)",
      description: JSON.stringify(report),
    });
    expect(report.filter((r) => r.median >= STEP_MS)).toEqual([]);
  });

  test("keyboard.type with no delay: exact value, no-match within 100 ms, no long task over 100 ms (AC-28)", async ({
    page,
  }) => {
    await loadSeed(page);
    await recordTyping(page, "cafe market");
    await page.keyboard.type("cafe market");
    await expect(searchbox(page)).toHaveValue("cafe market");
    await expect(noMatches(page)).toBeVisible();
    await expect
      .poll(async () => (await typingTimes(page)).shownAt)
      .toBeGreaterThan(0);
    const { firstKey, lastInput, shownAt } = await typingTimes(page);
    expect(firstKey).toBeGreaterThan(0);
    expect(shownAt - lastInput).toBeLessThan(STEP_MS);
    expect(await longTasksOver(page, STEP_MS, firstKey, shownAt)).toEqual([]);
  });

  test("pasting note 500's body shows it within 300 ms, no long task over 300 ms (AC-29)", async ({
    page,
  }) => {
    await loadSeed(page);
    const note = SEED[500]!;
    const from = await page.evaluate(() => performance.now());
    await armStep(page, "input", [note.id], "includes");
    await searchbox(page).fill(note.body);
    const elapsed = await stepTime(page);
    expect(elapsed).toBeLessThan(PASTE_MS);
    expect(await longTasksOver(page, PASTE_MS, from)).toEqual([]);
  });
});
