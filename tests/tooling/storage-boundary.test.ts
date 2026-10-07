// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  exportSurface,
  importClosure,
  isTestFile,
  listFiles,
  parseImports,
  readText,
  resolveImport,
  uiModules,
} from "./repo";

/** note-storage R36 / AC-51: these modules must not reference the browser database. */
const DOMAIN_FORBIDDEN = /indexedDB|IDB[A-Z]|fake-indexeddb/;
const DATABASE_PACKAGES = ["idb", "fake-indexeddb"];

const IN_MEMORY = "src/test/inMemoryNoteRepository.ts";

/** create-note R29: the one storage module a UI module may import. */
const STORAGE_ENTRY = "src/storage/index.ts";
const NON_UI_DIRS = ["src/notes/", "src/storage/", "src/test/"];

/** create-note R31 / AC-46: browser storage a UI module must never name. */
const UI_SOURCE_FORBIDDEN =
  /indexedDB|IDB[A-Z]|localStorage|sessionStorage|document\.cookie|caches\./;

/** create-note R30 / AC-45: the pinned public surface of the storage entry point. */
const ENTRY_VALUE_EXPORTS = [
  "BODY_MAX_CHARS",
  "NotFoundError",
  "NoteStorageError",
  "QuotaExceededError",
  "StorageUnavailableError",
  "TITLE_MAX_CHARS",
  "ValidationError",
  "countCharacters",
  "getNoteRepository",
];
const ENTRY_TYPE_EXPORTS = [
  "Clock",
  "IdGenerator",
  "Note",
  "NoteInput",
  "NoteRepository",
  "NoteStorageErrorKind",
  "StorageManagerLike",
  "ValidationIssue",
];

function domainFiles(): string[] {
  return listFiles("src/notes").filter(
    (file) => file.endsWith(".ts") && !isTestFile(file),
  );
}

function under(closure: Set<string>, ...dirs: string[]): string[] {
  return [...closure].filter((file) =>
    dirs.some((dir) => file.startsWith(dir)),
  );
}

function packages(closure: Set<string>, names: string[]): string[] {
  return [...closure].filter((spec) =>
    names.some((name) => spec === name || spec.startsWith(`${name}/`)),
  );
}

/**
 * create-note R29 / AC-43: the direct imports of one UI module that break
 * the rule (a storage, domain or test-support module other than the entry
 * point, or a database package).
 */
function uiImportViolations(file: string, text: string): string[] {
  return parseImports(text, file).flatMap((specifier) => {
    const resolved = resolveImport(specifier, file);
    const internal =
      NON_UI_DIRS.some((dir) => resolved.startsWith(dir)) &&
      resolved !== STORAGE_ENTRY;
    const database = packages(new Set([resolved]), DATABASE_PACKAGES);
    return internal || database.length > 0 ? [specifier] : [];
  });
}

function sorted(names: readonly string[]): string[] {
  return [...names].sort();
}

/** create-note AC-45: what is wrong with an entry point's export surface. */
function surfaceProblems(text: string): string[] {
  const surface = exportSurface(text);
  const problems: string[] = [];
  if (
    JSON.stringify(sorted(surface.values)) !==
    JSON.stringify(sorted(ENTRY_VALUE_EXPORTS))
  )
    problems.push(`values: ${sorted(surface.values).join(", ")}`);
  if (
    JSON.stringify(sorted(surface.types)) !==
    JSON.stringify(sorted(ENTRY_TYPE_EXPORTS))
  )
    problems.push(`types: ${sorted(surface.types).join(", ")}`);
  for (const from of surface.starExports) problems.push(`export * ${from}`);
  for (const from of surface.reExportSources) {
    if (/(?:^|\/)test\//.test(from)) problems.push(`re-export ${from}`);
  }
  return problems;
}

describe("storage boundary", () => {
  it("domain modules don't reference or import IndexedDB (AC-51)", () => {
    const files = domainFiles();
    expect(files).toEqual(
      expect.arrayContaining([
        "src/notes/note.ts",
        "src/notes/errors.ts",
        "src/notes/validation.ts",
      ]),
    );
    expect(
      files.filter((file) => DOMAIN_FORBIDDEN.test(readText(file))),
    ).toEqual([]);
    const closure = importClosure(files);
    expect(under(closure, "src/storage/", "src/test/")).toEqual([]);
    expect(packages(closure, DATABASE_PACKAGES)).toEqual([]);
  });

  it("no production module reaches the in-memory implementation or test support (AC-53)", () => {
    const production = listFiles("src").filter(
      (file) => !isTestFile(file) && !file.startsWith("src/test/"),
    );
    expect(production).toContain("src/storage/index.ts");
    const closure = importClosure(production);
    expect(closure.has(IN_MEMORY)).toBe(false);
    expect(under(closure, "src/test/")).toEqual([]);
    expect(packages(closure, ["fake-indexeddb"])).toEqual([]);
  });

  it("UI modules import storage only through src/storage/index.ts (create-note AC-43; narrows note-storage AC-56)", () => {
    const modules = uiModules();
    const closure = importClosure(modules);
    // Sanity: the walk follows index.html into the app.
    expect(closure.has("src/main.tsx")).toBe(true);
    expect(closure.has("src/App.tsx")).toBe(true);
    expect(closure.has("src/index.css")).toBe(true);
    // Sanity: discovery finds the UI by listing files, including new folders.
    expect(modules).toEqual(
      expect.arrayContaining(["index.html", "src/App.tsx", "src/copy.ts"]),
    );
    expect(
      modules.filter((file) => NON_UI_DIRS.some((dir) => file.startsWith(dir))),
    ).toEqual([]);
    expect(modules.filter((file) => isTestFile(file))).toEqual([]);

    const violations = modules.flatMap((file) =>
      uiImportViolations(file, readText(file)).map(
        (specifier) => `${file}: ${specifier}`,
      ),
    );
    expect(violations).toEqual([]);
    expect(packages(closure, DATABASE_PACKAGES)).toEqual([]);
    // The form wiring exists: some UI module imports the entry point.
    expect(
      modules.some((file) =>
        parseImports(readText(file), file).some(
          (specifier) => resolveImport(specifier, file) === STORAGE_ENTRY,
        ),
      ),
    ).toBe(true);
  });

  it("the UI import rule rejects storage internals and test support, and allows ../storage (AC-44)", () => {
    const fixture = "src/components/Fixture.tsx";
    for (const specifier of [
      "../storage/indexedDbNoteRepository",
      "../storage/connection",
      "../notes/validation",
      "../notes/errors",
      "../test/inMemoryNoteRepository",
      "fake-indexeddb",
      "fake-indexeddb/auto",
      "idb",
    ]) {
      expect(
        uiImportViolations(fixture, `import { x } from "${specifier}";`),
        specifier,
      ).toEqual([specifier]);
    }
    for (const specifier of ["../storage", "../storage/index", "react"]) {
      expect(
        uiImportViolations(fixture, `import { x } from "${specifier}";`),
        specifier,
      ).toEqual([]);
    }
  });

  it("src/storage/index.ts exports exactly the R30 value and type names (AC-45)", () => {
    const text = readText(STORAGE_ENTRY);
    const surface = exportSurface(text);
    expect(sorted(surface.values)).toEqual(sorted(ENTRY_VALUE_EXPORTS));
    expect(sorted(surface.types)).toEqual(sorted(ENTRY_TYPE_EXPORTS));
    expect(surface.starExports).toEqual([]);
    expect(surfaceProblems(text)).toEqual([]);
  });

  it("the export pin fails for an added factory or test re-export (AC-45)", () => {
    const text = readText(STORAGE_ENTRY);
    for (const addition of [
      'export { createIndexedDbNoteRepository } from "./indexedDbNoteRepository";',
      'export { createInMemoryNoteRepository } from "../test/inMemoryNoteRepository";',
      'export type { InMemoryNoteRepositoryOptions } from "../test/inMemoryNoteRepository";',
      'export * from "../test/fakes";',
      "export interface Extra {}",
    ]) {
      expect(surfaceProblems(`${text}\n${addition}\n`), addition).not.toEqual(
        [],
      );
    }
  });

  it("UI module source never names IndexedDB or other browser storage (AC-46)", () => {
    const offenders = uiModules().filter((file) =>
      UI_SOURCE_FORBIDDEN.test(readText(file)),
    );
    expect(offenders).toEqual([]);
  });

  it("the UI source pattern catches each fixture (AC-46)", () => {
    for (const fixture of [
      'indexedDB.open("x")',
      "let db: IDBDatabase;",
      'localStorage.setItem("k", v)',
      "sessionStorage.clear()",
      'document.cookie = "a=b"',
      'caches.open("v1")',
    ]) {
      expect(UI_SOURCE_FORBIDDEN.test(fixture), fixture).toBe(true);
    }
    expect(UI_SOURCE_FORBIDDEN.test('import { x } from "../storage";')).toBe(
      false,
    );
  });

  it("the import parser finds static, re-export, dynamic, CSS and HTML imports", () => {
    expect(
      parseImports(
        [
          'import { a } from "../storage";',
          'import type { Note } from "../notes/note";',
          'export * from "./b";',
          'const m = await import("./c");',
        ].join("\n"),
        "src/components/X.tsx",
      ),
    ).toEqual(["../storage", "../notes/note", "./b", "./c"]);
    expect(parseImports('@import "tailwindcss";', "src/x.css")).toEqual([
      "tailwindcss",
    ]);
    expect(
      parseImports(
        '<script type="module" src="/src/main.tsx"></script>',
        "index.html",
      ),
    ).toEqual(["/src/main.tsx"]);
  });

  it("the resolver maps specifiers to repo files and keeps package names", () => {
    expect(resolveImport("../storage", "src/components/X.tsx")).toBe(
      "src/storage/index.ts",
    );
    expect(resolveImport("./App", "src/main.tsx")).toBe("src/App.tsx");
    expect(resolveImport("/src/main.tsx", "index.html")).toBe("src/main.tsx");
    expect(resolveImport("fake-indexeddb", "src/x.ts")).toBe("fake-indexeddb");
  });

  it("the boundary checks catch a violation", () => {
    expect(DOMAIN_FORBIDDEN.test("const f: IDBFactory = indexedDB;")).toBe(
      true,
    );
    expect(DOMAIN_FORBIDDEN.test('import "fake-indexeddb";')).toBe(true);
    expect(DOMAIN_FORBIDDEN.test("export interface Note {}")).toBe(false);
    const fake = new Set([
      "src/App.tsx",
      "src/storage/index.ts",
      "fake-indexeddb/auto",
    ]);
    expect(under(fake, "src/storage/")).toEqual(["src/storage/index.ts"]);
    expect(packages(fake, DATABASE_PACKAGES)).toEqual(["fake-indexeddb/auto"]);
  });
});
