import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest globals are off, so React Testing Library cannot register its
// automatic cleanup; unmount rendered trees after each test explicitly.
afterEach(() => {
  cleanup();
  // list-notes plan D13b: the hash never leaks into the next test.
  // (Tooling tests run in the node environment, which has no history.)
  if (typeof history !== "undefined") history.replaceState(null, "", "/");
});
