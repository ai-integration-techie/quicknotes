/**
 * The shared NoteRepository contract suite (note-storage R37, AC-52). Every
 * acceptance criterion the spec marks "contract" lives here and runs once
 * per implementation. Defaults per the spec: a fresh store, a stub storage
 * manager resolving false/false, and a fixed clock.
 */
import { describe, expect, it } from "vitest";
import {
  NotFoundError,
  NoteStorageError,
  ValidationError,
} from "../notes/errors";
import type {
  Clock,
  IdGenerator,
  NoteInput,
  NoteRepository,
  StorageManagerLike,
} from "../notes/note";
import {
  createFixedClock,
  createStubStorage,
  fixedId,
  sequentialIds,
} from "./fakes";

export interface HarnessOptions {
  now?: Clock;
  newId?: IdGenerator;
  storage?: StorageManagerLike;
}

/** One fresh, empty store per test. */
export interface Harness {
  /** A repository instance over this harness's store. */
  repo(options?: HarnessOptions): NoteRepository;
  /** A new instance over the same store (a new launch). */
  reopen(options?: HarnessOptions): NoteRepository;
}

export const CONTRACT_START = 1_760_000_000_000;
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Inputs typed loosely on purpose: JavaScript callers can pass anything. */
function loose(value: unknown): NoteInput {
  return value as NoteInput;
}

async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected the promise to reject");
}

async function validationIssues(promise: Promise<unknown>) {
  const error = await rejectionOf(promise);
  expect(error).toBeInstanceOf(ValidationError);
  expect(error).toBeInstanceOf(NoteStorageError);
  expect((error as ValidationError).kind).toBe("validation");
  return (error as ValidationError).issues;
}

async function expectNotFound(promise: Promise<unknown>): Promise<void> {
  const error = await rejectionOf(promise);
  expect(error).toBeInstanceOf(NotFoundError);
  expect((error as NotFoundError).kind).toBe("not-found");
}

/**
 * Registers the contract suite for one implementation. Returns a function
 * giving how many tests it registered (known once collection has run), so
 * the caller can check both runs are the same size.
 */
export function describeNoteRepositoryContract(
  name: string,
  makeHarness: () => Harness,
): () => number {
  let registered = 0;
  const test = (title: string, body: () => Promise<void>) => {
    registered += 1;
    it(title, body);
  };

  function setup(options: HarnessOptions = {}) {
    const harness = makeHarness();
    const clock = createFixedClock(CONTRACT_START);
    const full: HarnessOptions = {
      now: clock,
      storage: createStubStorage(),
      ...options,
    };
    return { harness, clock, repo: harness.repo(full), options: full };
  }

  describe(`noteRepositoryContract [${name}]`, () => {
    describe("create", () => {
      test("returns exactly the five fields with a v4 id and clock times (AC-1)", async () => {
        const { repo } = setup();
        const note = await repo.create({ title: "Shopping", body: "Milk" });
        expect(Object.keys(note).sort()).toEqual([
          "body",
          "createdAt",
          "id",
          "title",
          "updatedAt",
        ]);
        expect(note.id).toMatch(UUID_V4);
        expect(note).toMatchObject({
          title: "Shopping",
          body: "Milk",
          createdAt: CONTRACT_START,
          updatedAt: CONTRACT_START,
        });
      });

      test("ignores id, createdAt, updatedAt and unknown keys in input (AC-3)", async () => {
        const { repo } = setup();
        const created = await repo.create(
          loose({
            title: "T",
            body: "B",
            id: "x",
            createdAt: 1,
            updatedAt: 2,
            extra: true,
          }),
        );
        const stored = await repo.get(created.id);
        expect(stored.id).not.toBe("x");
        expect(stored.createdAt).toBe(CONTRACT_START);
        expect(stored.updatedAt).toBe(CONTRACT_START);
        expect(stored).not.toHaveProperty("extra");
        expect(Object.keys(stored).sort()).toEqual([
          "body",
          "createdAt",
          "id",
          "title",
          "updatedAt",
        ]);
      });
    });

    test("returned notes are copies: mutating one doesn't change get/list (AC-5)", async () => {
      const { repo } = setup();
      const note = await repo.create({ title: "original", body: "b" });
      (note as { title: string }).title = "changed";
      expect((await repo.get(note.id)).title).toBe("original");
      expect((await repo.list())[0]?.title).toBe("original");
      const listed = await repo.list();
      (listed[0] as { title: string }).title = "changed again";
      expect((await repo.get(note.id)).title).toBe("original");
    });

    describe("field rules", () => {
      test("accepts title of 200 and body of 100,000 (AC-6)", async () => {
        const { repo } = setup();
        const note = await repo.create({
          title: "a".repeat(200),
          body: "a".repeat(100_000),
        });
        expect(note.title).toHaveLength(200);
        expect(note.body).toHaveLength(100_000);
      });

      test("title of 201 rejects with one too-long issue and writes nothing (AC-7)", async () => {
        const { repo } = setup();
        const issues = await validationIssues(
          repo.create({ title: "a".repeat(201), body: "x" }),
        );
        expect(issues).toEqual([
          { field: "title", rule: "too-long", limit: 200, actual: 201 },
        ]);
        expect(await repo.list()).toEqual([]);
      });

      test("body of 100,001 rejects with too-long issue (AC-8)", async () => {
        const { repo } = setup();
        const issues = await validationIssues(
          repo.create({ title: "x", body: "a".repeat(100_001) }),
        );
        expect(issues).toContainEqual({
          field: "body",
          rule: "too-long",
          limit: 100000,
          actual: 100001,
        });
      });

      test("counts emoji as one code point (200 ok, 201 rejects) (AC-9)", async () => {
        const { repo } = setup();
        const ok = "\u{1F600}".repeat(200);
        expect(ok).toHaveLength(400);
        await expect(
          repo.create({ title: ok, body: "" }),
        ).resolves.toMatchObject({
          title: ok,
        });
        const issues = await validationIssues(
          repo.create({ title: "\u{1F600}".repeat(201), body: "" }),
        );
        expect(issues).toEqual([
          { field: "title", rule: "too-long", limit: 200, actual: 201 },
        ]);
      });

      test("both empty rejects with note/empty and writes nothing (AC-11)", async () => {
        const { repo } = setup();
        const issues = await validationIssues(
          repo.create({ title: "", body: "" }),
        );
        expect(issues).toEqual([{ field: "note", rule: "empty" }]);
        expect(await repo.list()).toEqual([]);
      });

      test("one empty field or whitespace-only title is accepted and kept (AC-12)", async () => {
        const { repo } = setup();
        await expect(
          repo.create({ title: "", body: "b" }),
        ).resolves.toBeDefined();
        await expect(
          repo.create({ title: "t", body: "" }),
        ).resolves.toBeDefined();
        const spaced = await repo.create({ title: " ", body: "" });
        expect((await repo.get(spaced.id)).title).toBe(" ");
      });

      const nonStrings: [string, unknown, "title" | "body"][] = [
        ["undefined title", { title: undefined, body: "b" }, "title"],
        ["null title", { title: null, body: "b" }, "title"],
        ["number title", { title: 5, body: "b" }, "title"],
        ["String object title", { title: new String("t"), body: "b" }, "title"],
        ["missing body", { title: "t" }, "body"],
      ];
      for (const [label, input, field] of nonStrings) {
        test(`non-string input rejects not-a-string: ${label} (AC-13)`, async () => {
          const { repo } = setup();
          const issues = await validationIssues(repo.create(loose(input)));
          expect(issues).toContainEqual({ field, rule: "not-a-string" });
        });
      }

      test("reports every broken rule, not just the first (AC-14)", async () => {
        const { repo } = setup();
        const issues = await validationIssues(
          repo.create(loose({ title: 5, body: "a".repeat(100_001) })),
        );
        expect(issues).toEqual([
          { field: "title", rule: "not-a-string" },
          { field: "body", rule: "too-long", limit: 100000, actual: 100001 },
        ]);
      });
    });

    const exactPairs: [string, string][] = [
      ["  lead and trail  ", "line1\nline2\r\nline3\n\n"],
      ["\ttab", "é vs é"],
      ["\u{1F469}‍\u{1F4BB} \u{1F1EE}\u{1F1F3}", "日本語 العربية עברית हिन्दी"],
      ["<b>not html</b>", "\u0000\u0007\uD800"],
    ];
    exactPairs.forEach(([title, body], index) => {
      test(`round-trips text exactly, also through a new instance (AC-15 pair ${index + 1})`, async () => {
        const { harness, repo, options } = setup();
        const created = await repo.create({ title, body });
        const stored = await repo.get(created.id);
        expect(stored.title === title).toBe(true);
        expect(stored.body === body).toBe(true);
        const reloaded = await harness.reopen(options).get(created.id);
        expect(reloaded.title === title).toBe(true);
        expect(reloaded.body === body).toBe(true);
      });
    });

    describe("get", () => {
      test("returns a note deep-equal to create's result (AC-17)", async () => {
        const { repo } = setup();
        const created = await repo.create({ title: "t", body: "b" });
        expect(await repo.get(created.id)).toEqual(created);
      });

      test("unknown or empty id is not-found; non-string id is a validation error (AC-18)", async () => {
        const { repo } = setup();
        await expectNotFound(repo.get("3f2b8c1e-7a4d-4e2b-9c1f-0a1b2c3d4e5f"));
        await expectNotFound(repo.get(""));
        const issues = await validationIssues(
          repo.get(42 as unknown as string),
        );
        expect(issues).toEqual([{ field: "id", rule: "not-a-string" }]);
      });
    });

    describe("update", () => {
      test("replaces fields, keeps id and createdAt, sets updatedAt to now (AC-19)", async () => {
        const { repo, clock } = setup();
        clock.set(1000);
        const created = await repo.create({ title: "Old", body: "Old body" });
        clock.set(5000);
        const updated = await repo.update(created.id, {
          title: "New",
          body: "Body",
        });
        const expected = {
          id: created.id,
          title: "New",
          body: "Body",
          createdAt: 1000,
          updatedAt: 5000,
        };
        expect(updated).toEqual(expected);
        expect(await repo.get(created.id)).toEqual(expected);
      });

      test("updatedAt always moves forward (same ms, clock backwards) (AC-20)", async () => {
        const { repo, clock } = setup();
        clock.set(1000);
        const { id } = await repo.create({ title: "t", body: "b" });
        expect(
          (await repo.update(id, { title: "t", body: "b" })).updatedAt,
        ).toBe(1001);
        expect(
          (await repo.update(id, { title: "t", body: "b" })).updatedAt,
        ).toBe(1002);
        clock.set(500);
        expect(
          (await repo.update(id, { title: "t", body: "b" })).updatedAt,
        ).toBe(1003);
      });

      test("invalid input rejects and leaves the note unchanged (AC-21)", async () => {
        const { repo, clock } = setup();
        const created = await repo.create({ title: "A", body: "B" });
        clock.set(CONTRACT_START + 10);
        await validationIssues(
          repo.update(created.id, { title: "", body: "" }),
        );
        await validationIssues(repo.update(created.id, loose({ title: "A" })));
        expect(await repo.get(created.id)).toEqual(created);
      });

      test("missing id rejects not-found and doesn't create (AC-22)", async () => {
        const { repo } = setup();
        await expectNotFound(
          repo.update(fixedId(9), { title: "t", body: "b" }),
        );
        expect(await repo.list()).toEqual([]);
      });

      test("ignores id and createdAt in input (AC-23)", async () => {
        const { repo, clock } = setup();
        const created = await repo.create({ title: "t", body: "b" });
        clock.set(CONTRACT_START + 5);
        const updated = await repo.update(
          created.id,
          loose({ title: "t", body: "b", id: "other", createdAt: 1 }),
        );
        expect(updated.id).toBe(created.id);
        expect(updated.createdAt).toBe(created.createdAt);
        await expectNotFound(repo.get("other"));
        expect((await repo.list()).map((n) => n.id)).toEqual([created.id]);
      });
    });

    describe("delete", () => {
      test("removes the note; second delete is not-found (AC-24)", async () => {
        const { repo } = setup();
        const a = await repo.create({ title: "A", body: "" });
        const b = await repo.create({ title: "B", body: "" });
        await expect(repo.delete(a.id)).resolves.toBeUndefined();
        await expectNotFound(repo.get(a.id));
        expect(await repo.list()).toEqual([b]);
        await expectNotFound(repo.delete(a.id));
      });
    });

    describe("list", () => {
      test("sorts by updatedAt descending (AC-26)", async () => {
        const { repo, clock } = setup();
        clock.set(1000);
        const a = await repo.create({ title: "A", body: "" });
        clock.set(3000);
        const b = await repo.create({ title: "B", body: "" });
        clock.set(2000);
        const c = await repo.create({ title: "C", body: "" });
        clock.set(4000);
        await repo.update(a.id, { title: "A", body: "" });
        expect((await repo.list()).map((n) => n.id)).toEqual([
          a.id,
          b.id,
          c.id,
        ]);
      });

      test("breaks updatedAt ties by id ascending (AC-27)", async () => {
        const { repo } = setup({
          newId: sequentialIds(fixedId(2), fixedId(1)),
        });
        await repo.create({ title: "two", body: "" });
        await repo.create({ title: "one", body: "" });
        expect((await repo.list()).map((n) => n.id)).toEqual([
          fixedId(1),
          fixedId(2),
        ]);
      });

      test("empty store gives [] (AC-28)", async () => {
        const { repo } = setup();
        expect(await repo.list()).toEqual([]);
      });
    });
  });

  return () => registered;
}
