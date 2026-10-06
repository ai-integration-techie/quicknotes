// @vitest-environment node
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import { ROOT, readPackageJson } from "./repo";

const eslint = new ESLint({ cwd: ROOT });

describe("ESLint config", () => {
  it("unused variable fails lint", async () => {
    const [result] = await eslint.lintText("const unused = 1;\nexport {};\n", {
      filePath: "src/fixture.tsx",
    });
    expect(result).toBeDefined();
    expect(result!.errorCount + result!.warningCount).toBeGreaterThan(0);
  });

  it("the repo source lints clean", async () => {
    const results = await eslint.lintFiles(["src"]);
    const problems = results.flatMap((r) =>
      r.messages.map((m) => `${r.filePath}: ${m.message}`),
    );
    expect(problems).toEqual([]);
  }, 30_000);

  it("required recommended configs and --max-warnings 0", async () => {
    const config = (await eslint.calculateConfigForFile("src/App.tsx")) as {
      rules: Record<string, unknown>;
    };
    const rules = Object.keys(config.rules);

    expect(rules).toContain("no-undef"); // @eslint/js recommended
    expect(rules).toContain("@typescript-eslint/no-unused-vars"); // typescript-eslint recommended
    expect(rules).toContain("react-hooks/rules-of-hooks"); // react-hooks recommended
    expect(rules).toContain("jsx-a11y/alt-text"); // jsx-a11y recommended

    expect(readPackageJson().scripts.lint).toContain("--max-warnings 0");
  });
});
