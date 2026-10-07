// @vitest-environment node
import { readdirSync } from "node:fs";
import { resolveConfig } from "vite";
import { describe, expect, it } from "vitest";
import { APP_BASE } from "../../vite.config";
import { ROOT, readText, repoPath } from "./repo";

const BASE = "/quicknotes/";

/** Config and browser-test files where the base path may be written (D2). */
function baseLiteralFiles(): string[] {
  const e2e = readdirSync(repoPath("e2e"))
    .filter((file) => file.endsWith(".ts"))
    .map((file) => `e2e/${file}`);
  return ["vite.config.ts", "playwright.config.ts", ...e2e];
}

describe("base path", () => {
  it("resolved base is /quicknotes/ for build and serve", async () => {
    expect(APP_BASE).toBe(BASE);
    for (const command of ["build", "serve"] as const) {
      const config = await resolveConfig(
        {
          root: ROOT,
          configFile: repoPath("vite.config.ts"),
          logLevel: "silent",
        },
        command,
      );
      expect(config.base, command).toBe(BASE);
    }
  });

  it("base literal is defined once", () => {
    const counts = baseLiteralFiles().flatMap((file) => {
      const hits = readText(file).split(BASE).length - 1;
      return hits > 0 ? [[file, hits] as const] : [];
    });
    expect(counts).toEqual([["vite.config.ts", 1]]);
  });
});
