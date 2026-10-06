// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { exists, readPackageJson, readText } from "./repo";

interface Step {
  uses?: string;
  with?: Record<string, unknown>;
}

describe("Node pin", () => {
  it("Node major pinned consistently", () => {
    expect(exists("package-lock.json")).toBe(true);

    const nvmrc = readText(".nvmrc").trim();
    expect(nvmrc).toMatch(/^\d+$/);
    const major = Number(nvmrc);
    expect(major % 2, "LTS lines are even majors").toBe(0);

    expect(readPackageJson().engines?.node).toBe(`^${major}.0.0`);

    const workflow = parse(readText(".github/workflows/ci.yml")) as {
      jobs: Record<string, { steps: Step[] }>;
    };
    const steps = Object.values(workflow.jobs).flatMap((job) => job.steps);
    const setupNode = steps.find((step) =>
      step.uses?.startsWith("actions/setup-node@"),
    );
    expect(setupNode?.with?.["node-version-file"]).toBe(".nvmrc");
  });
});
