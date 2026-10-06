// @vitest-environment node
import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { readText, repoPath } from "./repo";

interface Step {
  name?: string;
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
}

interface Job {
  "runs-on": string;
  "timeout-minutes"?: number;
  steps: Step[];
}

interface Workflow {
  name: string;
  on: Record<string, unknown>;
  permissions: unknown;
  jobs: Record<string, Job>;
}

const WORKFLOW_PATH = ".github/workflows/ci.yml";
const raw = readText(WORKFLOW_PATH);
const workflow = parse(raw) as Workflow;
const job = workflow.jobs["quality-gate"];

function stepNamed(name: string): Step | undefined {
  return job?.steps.find((step) => step.name === name);
}

describe("CI workflow", () => {
  it("one gate workflow with safe settings", () => {
    expect(readdirSync(repoPath(".github/workflows"))).toEqual(["ci.yml"]);
    expect(workflow.name).toBe("CI");
    expect(Object.keys(workflow.on)).toEqual(
      expect.arrayContaining(["push", "pull_request"]),
    );
    expect(workflow.on.push).toEqual({ branches: ["**"] });
    expect(workflow.permissions).toEqual({ contents: "read" });

    expect(Object.keys(workflow.jobs)).toEqual(["quality-gate"]);
    expect(job?.["runs-on"]).toBe("ubuntu-latest");
    expect(job?.["timeout-minutes"]).toBe(15);

    expect(raw).not.toMatch(/secrets\./);
    expect(raw).not.toMatch(/continue-on-error/);
    expect(raw).not.toMatch(/deploy|pages|publish|upload-artifact/i);
  });

  it("named step per check", () => {
    const expected: [string, RegExp][] = [
      ["Install dependencies", /^npm ci$/],
      ["Format check", /^npm run format:check$/],
      ["Lint", /^npm run lint$/],
      ["Type check", /^npm run typecheck$/],
      ["Unit tests", /^npm test$/],
      ["Build", /^npm run build$/],
      ["Install Playwright Chromium", /playwright install.*chromium/],
      ["Accessibility", /^npm run test:a11y$/],
    ];
    for (const [name, run] of expected) {
      expect(stepNamed(name)?.run?.trim(), name).toMatch(run);
    }

    const names = job?.steps.map((step) => step.name);
    expect(names).toEqual([
      "Checkout",
      "Set up Node",
      ...expected.map(([name]) => name),
    ]);
  });

  it("sets up Node from .nvmrc with npm caching", () => {
    expect(stepNamed("Checkout")?.uses).toMatch(/^actions\/checkout@v\d+$/);
    const setupNode = stepNamed("Set up Node");
    expect(setupNode?.uses).toMatch(/^actions\/setup-node@v\d+$/);
    expect(setupNode?.with).toEqual({
      "node-version-file": ".nvmrc",
      cache: "npm",
    });
  });

  it("uses only public actions/* actions", () => {
    const uses =
      job?.steps.flatMap((step) => (step.uses ? [step.uses] : [])) ?? [];
    expect(uses.length).toBeGreaterThan(0);
    for (const action of uses) {
      expect(action).toMatch(/^actions\//);
    }
  });
});
