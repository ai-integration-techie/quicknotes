import { describe, expect, it } from "vitest";
import { NotFoundError } from "../notes/errors";
import {
  createFixedClock,
  createStubStorage,
  freshFactory,
} from "../test/fakes";
import { createIndexedDbNoteRepository } from "./indexedDbNoteRepository";

function twoTabs() {
  const factory = freshFactory();
  const clock = createFixedClock(1000);
  const tab = () =>
    createIndexedDbNoteRepository({
      indexedDB: () => factory,
      storage: () => createStubStorage(),
      now: clock,
    });
  return { a: tab(), b: tab(), clock };
}

describe("two tabs", () => {
  it("last committed update wins across two instances (AC-48)", async () => {
    const { a, b, clock } = twoTabs();
    const note = await a.create({ title: "start", body: "s" });
    await b.get(note.id);
    clock.set(2000);
    await expect(
      a.update(note.id, { title: "A", body: "a" }),
    ).resolves.toBeDefined();
    await expect(
      b.update(note.id, { title: "B", body: "b" }),
    ).resolves.toBeDefined();
    for (const tab of [a, b]) {
      expect(await tab.get(note.id)).toMatchObject({ title: "B", body: "b" });
    }
  });

  it("update after delete in another tab is not-found and doesn't recreate (AC-49)", async () => {
    const { a, b } = twoTabs();
    const note = await a.create({ title: "t", body: "b" });
    await b.list();
    await a.delete(note.id);
    await expect(
      b.update(note.id, { title: "x", body: "y" }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(await a.list()).toEqual([]);
    expect(await b.list()).toEqual([]);
  });
});
