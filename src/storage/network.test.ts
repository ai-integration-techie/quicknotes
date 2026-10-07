import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createFixedClock,
  createStubStorage,
  freshFactory,
} from "../test/fakes";
import { createIndexedDbNoteRepository } from "./indexedDbNoteRepository";

function forbidden(name: string, calls: string[]) {
  return vi.fn(function forbiddenNetworkCall() {
    calls.push(name);
    throw new Error(`${name} must not be called`);
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "sendBeacon");
});

describe("no network", () => {
  it("a full cycle makes no network call (AC-54)", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", forbidden("fetch", calls));
    vi.stubGlobal("XMLHttpRequest", forbidden("XMLHttpRequest", calls));
    vi.stubGlobal("WebSocket", forbidden("WebSocket", calls));
    vi.stubGlobal("EventSource", forbidden("EventSource", calls));
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: forbidden("sendBeacon", calls),
    });

    const repo = createIndexedDbNoteRepository({
      indexedDB: () => freshFactory(),
      storage: () => createStubStorage({ persisted: "true" }),
      now: createFixedClock(1000),
    });
    const note = await repo.create({ title: "t", body: "b" });
    await repo.get(note.id);
    await repo.update(note.id, { title: "u", body: "b" });
    await repo.list();
    await repo.isPersisted();
    await repo.delete(note.id);
    expect(calls).toEqual([]);
  });
});
