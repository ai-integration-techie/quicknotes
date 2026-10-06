// @vitest-environment node
import * as prettier from "prettier";
import { describe, expect, it } from "vitest";
import { repoPath } from "./repo";

describe("Prettier", () => {
  it("formatting drift detected", async () => {
    const filepath = repoPath("src/x.tsx");
    const config = (await prettier.resolveConfig(filepath)) ?? {};
    const drifted = "<p  >x</p>";

    expect(await prettier.check(drifted, { ...config, filepath })).toBe(false);

    const formatted = await prettier.format(drifted, { ...config, filepath });
    expect(await prettier.check(formatted, { ...config, filepath })).toBe(true);
  });

  it("ignores SpecFabric artifacts, the lab kit and build output", async () => {
    const ignorePath = repoPath(".prettierignore");
    for (const path of [
      "labs/notes-app/x.js",
      ".kilo/worktrees/x.ts",
      "specs/x/spec.md",
      "docs/framework.md",
      "dist/index.html",
      "package-lock.json",
    ]) {
      const info = await prettier.getFileInfo(repoPath(path), { ignorePath });
      expect(info.ignored, path).toBe(true);
    }

    const app = await prettier.getFileInfo(repoPath("src/App.tsx"), {
      ignorePath,
    });
    expect(app.ignored).toBe(false);
  });
});
