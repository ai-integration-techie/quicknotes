import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/** Absolute path of the repository root. */
export const ROOT = fileURLToPath(new URL("../../", import.meta.url));

export function repoPath(...segments: string[]): string {
  return join(ROOT, ...segments);
}

export function readText(path: string): string {
  return readFileSync(repoPath(path), "utf8");
}

export function readJson<T>(path: string): T {
  return JSON.parse(readText(path)) as T;
}

export function exists(path: string): boolean {
  return existsSync(repoPath(path));
}

/** Every file under `dir` (repo-relative), recursively. */
export function listFiles(dir: string): string[] {
  const absolute = repoPath(dir);
  return readdirSync(absolute).flatMap((entry) => {
    const full = join(absolute, entry);
    const rel = relative(ROOT, full);
    return statSync(full).isDirectory() ? listFiles(rel) : [rel];
  });
}

export interface PackageJson {
  name: string;
  private?: boolean;
  type?: string;
  engines?: { node?: string };
  browserslist?: string[];
  scripts: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export function readPackageJson(): PackageJson {
  return readJson<PackageJson>("package.json");
}

export function allDependencyNames(pkg: PackageJson): string[] {
  return [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ];
}

/**
 * R5 licence exceptions (spec R5 / AC-36), package name -> its exact licence.
 * Each is a dev-only transitive data package under a non-OSI permissive data
 * licence, pulled in by a tool the spec requires, and none may ship in dist/.
 * This list is closed: adding to it needs a spec revision (R5).
 * - caniuse-lite: browser support data (via browserslist, from eslint-plugin-react-hooks).
 * - language-subtag-registry: BCP 47 data (via eslint-plugin-jsx-a11y).
 * - mdn-data: CSS data (via css-tree, used by the jsdom test environment).
 */
export const R5_EXCEPTIONS: Readonly<Record<string, string>> = Object.freeze({
  "caniuse-lite": "CC-BY-4.0",
  "language-subtag-registry": "CC0-1.0",
  "mdn-data": "CC0-1.0",
});
