// @vitest-environment node
import { describe, expect, it } from "vitest";
import { importClosure, readText } from "./repo";

/** create-note R2 / AC-5: the form is in the first render, never code-split. */
const DEFERRED_RENDER = /React\.lazy|lazy\(|<Suspense/;

function renderPathFiles(): string[] {
  return [...importClosure(["src/main.tsx"])].filter(
    (file) => file.startsWith("src/") && /\.tsx?$/.test(file),
  );
}

describe("render path", () => {
  it("the render path has no React.lazy, lazy( or <Suspense (AC-5)", () => {
    const files = renderPathFiles();
    expect(files).toEqual(
      expect.arrayContaining(["src/main.tsx", "src/App.tsx"]),
    );
    expect(files.some((file) => file.startsWith("src/components/"))).toBe(true);
    expect(
      files.filter((file) => DEFERRED_RENDER.test(readText(file))),
    ).toEqual([]);
  });

  it("the render-path pattern catches each fixture (AC-5)", () => {
    for (const fixture of [
      'const Form = React.lazy(() => import("./Form"));',
      'const Form = lazy(() => import("./Form"));',
      "<Suspense fallback={null}><Form /></Suspense>",
    ]) {
      expect(DEFERRED_RENDER.test(fixture), fixture).toBe(true);
    }
    expect(DEFERRED_RENDER.test("// the database opens lazily")).toBe(false);
  });
});
