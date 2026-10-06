// @vitest-environment node
import { describe, expect, it } from "vitest";
import { listFiles, readText } from "./repo";

const COLOUR_UTILITY =
  /^(?:[a-z0-9-]+:)*-?(?:bg|text|border(?:-[xytrbl])?|outline|ring|ring-offset|divide|from|to|via|fill|stroke|decoration|placeholder|accent|caret|shadow)-(.+)$/;

const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|mauve|olive|mist|taupe";
const COLOUR_VALUE = new RegExp(
  `^(?:(?:${PALETTE})-\\d{2,3}|white|black|transparent|current|inherit|accent|\\[.*\\])(?:\\/\\S+)?$`,
);
const ALLOWED_COLOUR = /^(?:zinc-\d{2,3}|white|accent)(?:\/\S+)?$/;

function classTokens(source: string): string[] {
  const attributes = [...source.matchAll(/\bclass(?:Name)?="([^"]*)"/g)];
  return attributes.flatMap((match) =>
    (match[1] ?? "").split(/\s+/).filter(Boolean),
  );
}

function colourValues(tokens: string[]): string[] {
  return tokens.flatMap((token) => {
    const value = COLOUR_UTILITY.exec(token)?.[1];
    return value && COLOUR_VALUE.test(value) ? [value] : [];
  });
}

/** Tailwind's published zinc scale in sRGB hex; @theme may restate these, nothing else. */
const TAILWIND_ZINC_HEX: Record<string, string> = {
  "--color-zinc-50": "#fafafa",
  "--color-zinc-100": "#f4f4f5",
  "--color-zinc-200": "#e4e4e7",
  "--color-zinc-300": "#d4d4d8",
  "--color-zinc-400": "#a1a1aa",
  "--color-zinc-500": "#71717a",
  "--color-zinc-600": "#52525b",
  "--color-zinc-700": "#3f3f46",
  "--color-zinc-800": "#27272a",
  "--color-zinc-900": "#18181b",
  "--color-zinc-950": "#09090b",
};

function themeColourTokens(): [string, string][] {
  const css = readText("src/index.css").replace(/\/\*[\s\S]*?\*\//g, "");
  const themeBlocks = [...css.matchAll(/@theme[^{]*\{([^}]*)\}/g)].map(
    (m) => m[1] ?? "",
  );
  expect(themeBlocks.length).toBeGreaterThan(0);
  return themeBlocks.flatMap((block) =>
    [...block.matchAll(/(--color-[\w-]+)\s*:\s*([^;]+);/g)].map(
      (m): [string, string] => [m[1] ?? "", (m[2] ?? "").trim().toLowerCase()],
    ),
  );
}

function themeDeclarations(property: string): string[] {
  const css = readText("src/index.css").replace(/\/\*[\s\S]*?\*\//g, "");
  const themeBlocks = [...css.matchAll(/@theme[^{]*\{([^}]*)\}/g)].map(
    (m) => m[1] ?? "",
  );
  const pattern = new RegExp(`(?:^|[;{\\s])${property}\\s*:\\s*([^;]+);`, "g");
  return themeBlocks.flatMap((block) =>
    [...block.matchAll(pattern)].map((m) =>
      (m[1] ?? "").replace(/\s+/g, " ").trim(),
    ),
  );
}

describe("theme", () => {
  it("theme sets --font-sans to a system UI stack", () => {
    const values = themeDeclarations("--font-sans");
    expect(values).toHaveLength(1);
    expect(values[0]).toMatch(/^ui-sans-serif, system-ui(?:,|$)/);
  });

  it("accent is the only non-zinc custom colour", () => {
    const tokens = themeColourTokens();
    const nonZinc = tokens.filter(
      ([name]) => !name.startsWith("--color-zinc-"),
    );
    expect(nonZinc).toEqual([["--color-accent", "#1d4ed8"]]);
  });

  it("zinc tokens, if restated, keep Tailwind's own values", () => {
    const zinc = themeColourTokens().filter(([name]) =>
      name.startsWith("--color-zinc-"),
    );
    for (const [name, value] of zinc) {
      expect(value, name).toBe(TAILWIND_ZINC_HEX[name]);
    }
  });

  it("shell uses only zinc, white and accent colour utilities", () => {
    const sources = [
      "index.html",
      ...listFiles("src").filter(
        (file) => file.endsWith(".tsx") && !file.includes(".test."),
      ),
    ];
    const tokens = sources.flatMap((file) => classTokens(readText(file)));
    const colours = colourValues(tokens);

    expect(colours).toContain("zinc-900"); // sanity: the scan finds the shell's colours
    expect(colours.filter((value) => !ALLOWED_COLOUR.test(value))).toEqual([]);
  });

  it("the colour scan flags a non-zinc colour", () => {
    const colours = colourValues(
      classTokens('<p className="text-blue-500 bg-zinc-50 text-lg">'),
    );
    expect(colours.filter((value) => !ALLOWED_COLOUR.test(value))).toEqual([
      "blue-500",
    ]);
  });

  it("global focus style is a 2px accent outline with 2px offset", () => {
    const css = readText("src/index.css").replace(/\s+/g, " ");
    expect(css).toMatch(
      /:focus-visible \{ outline: 2px solid var\(--color-accent\); outline-offset: 2px; \}/,
    );
  });
});
