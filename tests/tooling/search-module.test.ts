// @vitest-environment node
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { importsOf, readText } from "./repo";

/** search-notes R8 / AC-8: the match module is pure and React-free. */
const MATCH_MODULE = "src/noteSearch/match.ts";
const STORAGE_ENTRY = "src/storage/index.ts";
const FORBIDDEN_PACKAGES = /^(?:react|react-dom|idb|fake-indexeddb)(?:\/|$)/;

/** Each import declaration's module and whether the whole import is type-only. */
function importDeclarations(
  file: string,
): { module: string; typeOnly: boolean }[] {
  const source = ts.createSourceFile(
    file,
    readText(file),
    ts.ScriptTarget.Latest,
    true,
  );
  return source.statements.filter(ts.isImportDeclaration).map((statement) => ({
    module: (statement.moduleSpecifier as ts.StringLiteral).text,
    typeOnly: statement.importClause?.isTypeOnly === true,
  }));
}

describe("search module", () => {
  it("match.ts imports only a type from src/storage/index.ts (AC-8)", () => {
    const resolved = importsOf(MATCH_MODULE);
    expect(resolved).toEqual([STORAGE_ENTRY]);
    expect(resolved.filter((m) => FORBIDDEN_PACKAGES.test(m))).toEqual([]);
    expect(
      resolved.filter(
        (m) => m.startsWith("src/storage/") && m !== STORAGE_ENTRY,
      ),
    ).toEqual([]);
    const declarations = importDeclarations(MATCH_MODULE);
    expect(declarations).toHaveLength(1);
    expect(declarations.every((d) => d.typeOnly)).toBe(true);
    expect(readText(MATCH_MODULE)).not.toMatch(/indexedDB|IDB[A-Z]/);
  });
});
