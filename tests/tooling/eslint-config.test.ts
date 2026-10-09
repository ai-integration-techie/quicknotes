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

  it("list semantics option is ul:list on NoteList.tsx only; jsx-a11y recommended still on (AC-49)", async () => {
    type Config = { rules: Record<string, unknown[]> };
    const list = (await eslint.calculateConfigForFile(
      "src/components/NoteList.tsx",
    )) as Config;
    const app = (await eslint.calculateConfigForFile("src/App.tsx")) as Config;

    expect(list.rules["jsx-a11y/no-redundant-roles"]).toEqual([
      2,
      { ul: ["list"] },
    ]);
    expect(app.rules["jsx-a11y/no-redundant-roles"]).toEqual([2]);

    // Every other rule, jsx-a11y recommended included, is the same in both files.
    const a11yRules = Object.keys(app.rules).filter((rule) =>
      rule.startsWith("jsx-a11y/"),
    );
    expect(a11yRules.length).toBeGreaterThan(20);
    expect(app.rules["jsx-a11y/alt-text"]?.[0]).toBe(2);
    const without = (rules: Record<string, unknown[]>) =>
      Object.fromEntries(
        Object.entries(rules).filter(
          ([rule]) => rule !== "jsx-a11y/no-redundant-roles",
        ),
      );
    expect(without(list.rules)).toEqual(without(app.rules));

    // The option allows ul role=list there, and nothing else is loosened.
    const lint = (code: string, filePath: string) =>
      eslint.lintText(code, { filePath });
    const ok = '<ul role="list"><li>a</li></ul>';
    const [inList] = await lint(
      `export const A = () => ${ok};\n`,
      "src/components/NoteList.tsx",
    );
    expect(inList?.messages).toEqual([]);
    const [elsewhere] = await lint(
      `export const A = () => ${ok};\n`,
      "src/components/Other.tsx",
    );
    expect(elsewhere?.messages.map((m) => m.ruleId)).toContain(
      "jsx-a11y/no-redundant-roles",
    );
    const [buttonInList] = await lint(
      'export const A = () => <button role="button" />;\n',
      "src/components/NoteList.tsx",
    );
    expect(buttonInList?.messages.map((m) => m.ruleId)).toContain(
      "jsx-a11y/no-redundant-roles",
    );
  });
});
