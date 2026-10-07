import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/** The URL path the app is served from, in dev, preview and on GitHub Pages (pages-deploy R14). */
export const APP_BASE = "/quicknotes/";

export default defineConfig({
  base: APP_BASE,
  plugins: [react(), tailwindcss()],
  build: {
    // Tailwind CSS v4's own browser floor; below the last 2 versions of each target browser (R31).
    target: ["chrome111", "edge111", "firefox128", "safari16.4", "ios16.4"],
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.ts"],
    setupFiles: ["src/test/setup.ts"],
    restoreMocks: true,
  },
});
