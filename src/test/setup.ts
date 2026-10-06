import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest globals are off, so React Testing Library cannot register its
// automatic cleanup; unmount rendered trees after each test explicitly.
afterEach(() => {
  cleanup();
});
