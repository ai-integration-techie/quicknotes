// @vitest-environment node
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { listFiles, readText } from "./repo";

/**
 * list-notes R43 / AC-60: every browser context an e2e test creates itself
 * is closed in `finally`. The shape required is
 * `const context = await browser.newContext(…);` followed directly by a
 * `try` whose `finally` calls `context.close()`.
 */
function isNewContextCall(node: ts.Node): node is ts.CallExpression {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === "newContext"
  );
}

function closesInFinally(next: ts.Statement | undefined, name: string) {
  if (!next || !ts.isTryStatement(next) || !next.finallyBlock) return false;
  const pattern = new RegExp(`\\b${name}\\.close\\(\\)`);
  return pattern.test(next.finallyBlock.getText());
}

/** Is `call` the initialiser of `const x = await …newContext()` closed in the next statement's finally? */
function isClosedProperly(call: ts.CallExpression): boolean {
  const awaited = call.parent;
  if (!awaited || !ts.isAwaitExpression(awaited)) return false;
  const declaration = awaited.parent;
  if (!declaration || !ts.isVariableDeclaration(declaration)) return false;
  if (!ts.isIdentifier(declaration.name)) return false;
  const statement = declaration.parent?.parent;
  if (!statement || !ts.isVariableStatement(statement)) return false;
  const block = statement.parent;
  if (!block || !(ts.isBlock(block) || ts.isSourceFile(block))) return false;
  const statements = [...block.statements];
  const next = statements[statements.indexOf(statement) + 1];
  return closesInFinally(next, declaration.name.text);
}

function unclosedContexts(files: Record<string, string>): string[] {
  return Object.entries(files).flatMap(([file, text]) => {
    const source = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.ES2022,
      true,
    );
    const offenders: string[] = [];
    const visit = (node: ts.Node): void => {
      if (isNewContextCall(node) && !isClosedProperly(node)) {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart());
        offenders.push(`${file}:${line + 1}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    return offenders;
  });
}

describe("e2e contexts", () => {
  it("every e2e newContext is closed in finally (AC-60)", () => {
    const files = listFiles("e2e").filter((file) => file.endsWith(".ts"));
    const sources = Object.fromEntries(
      files.map((file) => [file, readText(file)]),
    );
    expect(Object.values(sources).some((t) => t.includes("newContext("))).toBe(
      true,
    );
    expect(unclosedContexts(sources)).toEqual([]);
  });

  it("the context check passes a closed context and flags unclosed ones (AC-60)", () => {
    const good = `
      test("x", async ({ browser }) => {
        const context = await browser.newContext({ hasTouch: true });
        try {
          await context.newPage();
        } finally {
          await context.close();
        }
      });`;
    const noFinally = `
      test("x", async ({ browser }) => {
        const context = await browser.newContext();
        await context.newPage();
        await context.close();
      });`;
    const wrongClose = `
      test("x", async ({ browser }) => {
        const context = await browser.newContext();
        try {
          await context.newPage();
        } finally {
          await other.close();
        }
      });`;
    const notBound = `
      test("x", async ({ browser }) => {
        await (await browser.newContext()).newPage();
      });`;
    expect(
      unclosedContexts({
        "good.ts": good,
        "noFinally.ts": noFinally,
        "wrongClose.ts": wrongClose,
        "notBound.ts": notBound,
      }),
    ).toEqual(["noFinally.ts:3", "wrongClose.ts:3", "notBound.ts:3"]);
  });
});
