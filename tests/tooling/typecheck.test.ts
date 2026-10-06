// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";
import { afterAll, describe, expect, it } from "vitest";
import { repoPath } from "./repo";

const tempDir = mkdtempSync(join(tmpdir(), "quicknotes-typecheck-"));

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function appCompilerOptions(): ts.CompilerOptions {
  const parsed = ts.getParsedCommandLineOfConfigFile(
    repoPath("tsconfig.app.json"),
    undefined,
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(
          ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        );
      },
    },
  );
  if (!parsed) throw new Error("Could not parse tsconfig.app.json");
  return parsed.options;
}

describe("type checking", () => {
  it("string-to-number assignment is a type error", () => {
    const file = join(tempDir, "fixture.tsx");
    writeFileSync(file, "export const n: number = 'x';\n");

    const program = ts.createProgram([file], appCompilerOptions());
    const diagnostics = ts.getPreEmitDiagnostics(
      program,
      program.getSourceFile(file),
    );

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics.map((d) => d.code)).toContain(2322);
  });

  it("app config is strict with no emit", () => {
    const options = appCompilerOptions();
    expect(options.strict).toBe(true);
    expect(options.noEmit).toBe(true);
  });
});
