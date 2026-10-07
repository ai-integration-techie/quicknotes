import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useUnsavedTextWarning } from "./useUnsavedTextWarning";

function dispatchBeforeUnload(): Event {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

describe("useUnsavedTextWarning", () => {
  it("adds the listener only while active and removes it on cleanup", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const { rerender, unmount } = renderHook(
      ({ active }) => useUnsavedTextWarning(active),
      { initialProps: { active: false } },
    );
    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);

    rerender({ active: true });
    expect(dispatchBeforeUnload().defaultPrevented).toBe(true);

    rerender({ active: false });
    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);

    rerender({ active: true });
    unmount();
    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);

    const added = add.mock.calls.filter(([type]) => type === "beforeunload");
    const removed = remove.mock.calls.filter(
      ([type]) => type === "beforeunload",
    );
    expect(added).toHaveLength(2);
    expect(removed).toHaveLength(2);
  });
});
