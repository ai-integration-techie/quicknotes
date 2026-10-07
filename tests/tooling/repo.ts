import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

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

/** True for `*.test.ts` / `*.test.tsx` files. */
export function isTestFile(file: string): boolean {
  return /\.test\.tsx?$/.test(file);
}

/** Non-test source files of the note-storage layer (`src/notes/`, `src/storage/`). */
export function storageSourceFiles(): string[] {
  return ["src/notes", "src/storage"]
    .flatMap((dir) => listFiles(dir))
    .filter((file) => /\.tsx?$/.test(file) && !isTestFile(file));
}

/**
 * Raw import specifiers in `text`, by file type: TypeScript static,
 * `export ... from` and dynamic imports; CSS `@import`; HTML `src=`.
 */
export function parseImports(text: string, file: string): string[] {
  if (/\.(?:[cm]?[jt]sx?)$/.test(file)) {
    return ts
      .preProcessFile(text, true, true)
      .importedFiles.map((ref) => ref.fileName);
  }
  if (file.endsWith(".css")) {
    return [...text.matchAll(/@import\s+(?:url\()?\s*["']([^"']+)["']/g)].map(
      (match) => match[1] ?? "",
    );
  }
  if (file.endsWith(".html")) {
    return [...text.matchAll(/\bsrc\s*=\s*["']([^"']+)["']/g)].map(
      (match) => match[1] ?? "",
    );
  }
  return [];
}

const RESOLVE_SUFFIXES = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

/**
 * Resolves a specifier from repo-relative `fromFile`: relative and
 * root-relative paths become repo-relative files (trying `.ts`, `.tsx`,
 * `/index.ts`, `/index.tsx`); bare specifiers stay package names.
 */
export function resolveImport(specifier: string, fromFile: string): string {
  if (!specifier.startsWith(".") && !specifier.startsWith("/"))
    return specifier;
  const base = specifier.startsWith("/")
    ? posix.normalize(specifier.slice(1))
    : posix.join(posix.dirname(fromFile.split(sep).join("/")), specifier);
  const match = RESOLVE_SUFFIXES.map((suffix) => base + suffix).find(
    (candidate) => exists(candidate) && statSync(repoPath(candidate)).isFile(),
  );
  return match ?? base;
}

/** Resolved imports of a repo-relative file. */
export function importsOf(file: string): string[] {
  return parseImports(readText(file), file).map((spec) =>
    resolveImport(spec, file),
  );
}

/**
 * Every module reachable from `entries` (repo-relative files), including the
 * entries themselves and bare package names, which are not followed.
 */
export function importClosure(entries: readonly string[]): Set<string> {
  const seen = new Set<string>();
  const queue = entries.map((file) => file.split(sep).join("/"));
  while (queue.length > 0) {
    const file = queue.shift() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    if (exists(file) && statSync(repoPath(file)).isFile()) {
      queue.push(...importsOf(file));
    }
  }
  return seen;
}
