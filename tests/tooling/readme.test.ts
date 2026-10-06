// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readText } from "./repo";

const README = readText("README.md");

/** The body of the markdown section whose heading text is `title`, up to the next heading of the same or higher level. */
function section(title: string): string {
  const lines = README.split("\n");
  const start = lines.findIndex((line) =>
    new RegExp(`^#{1,6}\\s+${title}\\s*$`, "i").test(line),
  );
  if (start === -1) return "";
  const level = (lines[start]?.match(/^#+/)?.[0] ?? "").length;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => {
    const hashes = line.match(/^(#+)\s/)?.[1];
    return hashes !== undefined && hashes.length <= level;
  });
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

const SCRIPTS = [
  "dev",
  "lint",
  "typecheck",
  "format",
  "format:check",
  "test",
  "test:a11y",
  "build",
  "ci",
];

describe("README", () => {
  it("has the QuickNotes title", () => {
    expect(README.split("\n")[0]).toBe("# QuickNotes");
  });

  it("documents getting started", () => {
    const body = section("Getting started");
    expect(body).toContain("npm install");
    expect(body).toContain("npm run dev");
    expect(body).toContain("nvm use");
  });

  it("documents every script with a one-line description", () => {
    const body = section("Scripts");
    for (const script of SCRIPTS) {
      const escaped = script.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      expect(body, script).toMatch(
        new RegExp(`^- \`npm (?:run )?${escaped}\`\\s*[:\\-–]\\s*\\S.+$`, "m"),
      );
    }
  });
});
