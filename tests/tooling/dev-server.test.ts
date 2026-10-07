// @vitest-environment node
import { createServer, type ViteDevServer } from "vite";
import { afterAll, describe, expect, it } from "vitest";
import { ROOT, repoPath } from "./repo";

let server: ViteDevServer | undefined;

afterAll(async () => {
  await server?.close();
});

describe("dev server", () => {
  it("dev server serves the shell", async () => {
    server = await createServer({
      root: ROOT,
      configFile: repoPath("vite.config.ts"),
      logLevel: "silent",
      server: { port: 5199, strictPort: false },
    });
    await server.listen();

    const url = server.resolvedUrls?.local[0];
    expect(url).toMatch(/^http:\/\/localhost:\d+\/quicknotes\/$/);

    const response = await fetch(url!);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("<title>QuickNotes</title>");
  }, 30_000);
});
