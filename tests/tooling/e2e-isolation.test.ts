// @vitest-environment node
import { describe, expect, it } from "vitest";
import { listFiles, readText } from "./repo";

/**
 * create-note R28 / AC-42: every e2e test runs in a fresh browser context,
 * so no saved note can leak into project-foundation AC-33's fresh load.
 * Neither a persistent context nor saved browser state may be used.
 */
const SHARED_STATE = /launchPersistentContext|storageState/;

function isolationOffenders(files: Record<string, string>): string[] {
  return Object.entries(files)
    .filter(([, text]) => SHARED_STATE.test(text))
    .map(([file]) => file);
}

describe("e2e isolation", () => {
  it("no e2e file or the Playwright config uses launchPersistentContext or storageState (AC-42)", () => {
    const files = ["playwright.config.ts", ...listFiles("e2e")];
    expect(files.some((file) => file.endsWith(".spec.ts"))).toBe(true);
    const sources = Object.fromEntries(
      files.map((file) => [file, readText(file)]),
    );
    expect(isolationOffenders(sources)).toEqual([]);
  });

  it("the isolation check flags each fixture (AC-42)", () => {
    expect(
      isolationOffenders({
        "a.spec.ts": "await chromium.launchPersistentContext(dir);",
        "b.spec.ts": 'test.use({ storageState: "state.json" });',
        "c.spec.ts": "const context = await browser.newContext();",
      }),
    ).toEqual(["a.spec.ts", "b.spec.ts"]);
  });
});
