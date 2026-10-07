// @vitest-environment node
import { describe, expect, it } from "vitest";
import viteConfig from "../../vite.config";
import {
  allDependencyNames,
  listFiles,
  readJson,
  readPackageJson,
} from "./repo";

const pkg = readPackageJson();
const deps = allDependencyNames(pkg);

const UI_KIT_PATTERNS: RegExp[] = [
  /^@mui\//,
  /^@chakra-ui\//,
  /^antd$/,
  /^@ant-design\//,
  /^@radix-ui\//,
  /^@headlessui\//,
  /^react-bootstrap$/,
  /^@mantine\//,
  /^class-variance-authority$/,
];

describe("package contract", () => {
  it("stack deps present, strict TS, no UI kit", () => {
    for (const name of [
      "react",
      "react-dom",
      "vite",
      "typescript",
      "tailwindcss",
    ]) {
      expect(deps, `${name} should be a dependency`).toContain(name);
    }

    for (const file of ["tsconfig.app.json", "tsconfig.node.json"]) {
      const config = readJson<{ compilerOptions: { strict?: boolean } }>(file);
      expect(config.compilerOptions.strict, `${file} strict`).toBe(true);
    }

    const uiKits = deps.filter((name) =>
      UI_KIT_PATTERNS.some((pattern) => pattern.test(name)),
    );
    expect(uiKits).toEqual([]);
  });

  it("runtime dependencies are exactly react and react-dom (create-note AC-48)", () => {
    expect(Object.keys(pkg.dependencies ?? {}).sort()).toEqual([
      "react",
      "react-dom",
    ]);
  });

  it("application source is TypeScript only (R2)", () => {
    const scripts = listFiles("src").filter((file) =>
      /\.(js|jsx|mjs|cjs)$/.test(file),
    );
    expect(scripts).toEqual([]);
    expect(listFiles("src").some((file) => file.endsWith(".tsx"))).toBe(true);
  });

  it("test script is non-watch vitest run in jsdom", () => {
    expect(pkg.scripts.test).toBe("vitest run");
    expect(viteConfig.test?.environment).toBe("jsdom");
  });

  it("ci script chains the gate in order", () => {
    const steps = (pkg.scripts.ci ?? "").split("&&").map((part) => part.trim());
    expect(steps).toEqual([
      "npm run format:check",
      "npm run lint",
      "npm run typecheck",
      "npm test",
      "npm run build",
      "npm run test:a11y",
    ]);
  });

  it("documents the developer-tooling scripts", () => {
    expect(pkg.scripts).toMatchObject({
      dev: "vite",
      build: "tsc -b && vite build",
      preview: "vite preview",
      typecheck: "tsc -b",
      lint: "eslint . --max-warnings 0",
      format: "prettier --write .",
      "format:check": "prettier --check .",
      "test:a11y": "npm run build && playwright test",
    });
  });

  it("browser targets cover last 2 versions", () => {
    for (const browser of ["Chrome", "Edge", "Firefox", "Safari", "iOS"]) {
      expect(pkg.browserslist).toContain(`last 2 ${browser} versions`);
    }

    const target = viteConfig.build?.target;
    expect(Array.isArray(target)).toBe(true);
    const targets = (target as string[]).join(" ");
    for (const browser of ["chrome", "edge", "firefox", "safari", "ios"]) {
      expect(targets).toMatch(new RegExp(`\\b${browser}\\d`));
    }
  });
});
