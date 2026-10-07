// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  importClosure,
  isTestFile,
  listFiles,
  parseImports,
  readText,
  resolveImport,
} from "./repo";

/** note-storage R36 / AC-51: these modules must not reference the browser database. */
const DOMAIN_FORBIDDEN = /indexedDB|IDB[A-Z]|fake-indexeddb/;
const DATABASE_PACKAGES = ["idb", "fake-indexeddb"];

const IN_MEMORY = "src/test/inMemoryNoteRepository.ts";

const UI_FILES = [
  "index.html",
  "src/App.tsx",
  "src/main.tsx",
  ...listFiles("src/components"),
  "src/copy.ts",
  "src/index.css",
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

  it("the live UI doesn't reach any storage module (AC-56)", () => {
    const closure = importClosure(UI_FILES);
    // Sanity: the walk follows index.html into the app.
    expect(closure.has("src/main.tsx")).toBe(true);
    expect(closure.has("src/App.tsx")).toBe(true);
    expect(closure.has("src/index.css")).toBe(true);
    expect(under(closure, "src/notes/", "src/storage/", "src/test/")).toEqual(
      [],
    );
    expect(packages(closure, DATABASE_PACKAGES)).toEqual([]);
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
