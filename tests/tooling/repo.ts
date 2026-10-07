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

const UI_EXCLUDED_DIRS = ["src/notes/", "src/storage/", "src/test/"];

/**
 * create-note R29: the UI modules are `index.html` plus every non-test
 * `.ts`, `.tsx` and `.css` file under `src/` outside `src/notes/`,
 * `src/storage/` and `src/test/`. Found by listing files, not a fixed list.
 */
export function uiModules(): string[] {
  const sources = listFiles("src")
    .map((file) => file.split(sep).join("/"))
    .filter(
      (file) =>
        /\.(?:tsx?|css)$/.test(file) &&
        !isTestFile(file) &&
        !UI_EXCLUDED_DIRS.some((dir) => file.startsWith(dir)),
    );
  return ["index.html", ...sources];
}

export interface ExportSurface {
  /** Names exported as values (functions, classes, constants, value specifiers). */
  readonly values: string[];
  /** Names exported as types only (interfaces, type aliases, `type` specifiers). */
  readonly types: string[];
  /** Module specifiers of `export * from` statements (a pinned surface allows none). */
  readonly starExports: string[];
  /** Module specifiers of every `export … from` statement. */
  readonly reExportSources: string[];
}

function hasExportKeyword(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    )
  );
}

function declarationNames(node: ts.Statement): string[] {
  if (ts.isVariableStatement(node)) {
    return node.declarationList.declarations.flatMap((declaration) =>
      ts.isIdentifier(declaration.name) ? [declaration.name.text] : [],
    );
  }
  if (
    (ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isEnumDeclaration(node)) &&
    node.name
  ) {
    return [node.name.text];
  }
  return [];
}

/**
 * The exported names of a module's source text, read with the TypeScript
 * compiler API so that type-only exports are told apart from value exports
 * (create-note AC-45).
 */
export function exportSurface(text: string): ExportSurface {
  const source = ts.createSourceFile(
    "surface.ts",
    text,
    ts.ScriptTarget.ES2022,
  );
  const values: string[] = [];
  const types: string[] = [];
  const starExports: string[] = [];
  const reExportSources: string[] = [];
  for (const statement of source.statements) {
    if (ts.isExportDeclaration(statement)) {
      const from =
        statement.moduleSpecifier &&
        ts.isStringLiteral(statement.moduleSpecifier)
          ? statement.moduleSpecifier.text
          : undefined;
      if (from !== undefined) reExportSources.push(from);
      const clause = statement.exportClause;
      if (!clause || !ts.isNamedExports(clause)) {
        starExports.push(from ?? "");
        continue;
      }
      for (const element of clause.elements) {
        const target =
          statement.isTypeOnly || element.isTypeOnly ? types : values;
        target.push(element.name.text);
      }
      continue;
    }
    if (!hasExportKeyword(statement)) continue;
    if (
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement)
    ) {
      types.push(statement.name.text);
    } else {
      values.push(...declarationNames(statement));
    }
  }
  return { values, types, starExports, reExportSources };
}
