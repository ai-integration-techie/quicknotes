// @vitest-environment node
import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { readText, repoPath } from "./repo";
import {
  ciWorkflowViolations,
  crossWorkflowViolations,
  deployWorkflowViolations,
  mutateYaml,
  workflowListingViolations,
  type Workflow as GuardWorkflow,
} from "./workflow-guards";

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

const listing = readdirSync(repoPath(".github/workflows")).sort();
const deployRaw = readText(".github/workflows/deploy.yml");
const allFiles = { "ci.yml": raw, "deploy.yml": deployRaw };

function stepNamed(name: string): Step | undefined {
  return job?.steps.find((step) => step.name === name);
}

describe("CI workflow", () => {
  it("one gate workflow with safe settings", () => {
    expect(workflowListingViolations(listing)).toEqual([]);
    expect(ciWorkflowViolations(raw)).toEqual([]);
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

describe("workflow guards", () => {
  it("workflows directory is exactly ci.yml and deploy.yml", () => {
    expect(listing).toEqual(["ci.yml", "deploy.yml"]);
    expect(workflowListingViolations(listing)).toEqual([]);
  });

  it("listing guard rejects a third file", () => {
    expect(
      workflowListingViolations(["ci.yml", "deploy.yml", "release.yml"]),
    ).not.toEqual([]);
  });

  it("listing guard rejects a missing deploy.yml", () => {
    expect(workflowListingViolations(["ci.yml"])).not.toEqual([]);
  });

  it("only deploy.yml's deploy job declares permissions", () => {
    expect(crossWorkflowViolations(allFiles)).toEqual([]);
    expect(raw).not.toContain("id-token");
  });

  it("rejects permissions on ci.yml quality-gate", () => {
    const mutated = mutateYaml(raw, (workflow) => {
      workflow.jobs!["quality-gate"]!.permissions = { pages: "write" };
    });
    expect(ciWorkflowViolations(mutated)).not.toEqual([]);
    expect(
      crossWorkflowViolations({ ...allFiles, "ci.yml": mutated }),
    ).not.toEqual([]);
  });

  it("rejects permissions on deploy.yml quality-gate", () => {
    const mutated = mutateYaml(deployRaw, (workflow) => {
      workflow.jobs!["quality-gate"]!.permissions = { pages: "write" };
    });
    expect(deployWorkflowViolations(mutated)).not.toEqual([]);
    expect(
      crossWorkflowViolations({ ...allFiles, "deploy.yml": mutated }),
    ).not.toEqual([]);
  });

  it("cross guard rejects id-token in ci.yml", () => {
    const mutated = `${raw}\n# id-token\n`;
    expect(
      crossWorkflowViolations({ ...allFiles, "ci.yml": mutated }),
    ).not.toEqual([]);
  });

  it.each([
    "actions/deploy-pages@v5",
    "actions/upload-pages-artifact@v5",
    "actions/upload-artifact@v7",
  ])("ci guard rejects a step using %s", (uses) => {
    const mutated = mutateYaml(raw, (workflow) => {
      workflow.jobs!["quality-gate"]!.steps!.push({ name: "Extra", uses });
    });
    expect(ciWorkflowViolations(mutated)).not.toEqual([]);
  });

  it("ci guard rejects a non-actions/* action", () => {
    const mutated = mutateYaml(raw, (workflow) => {
      workflow.jobs!["quality-gate"]!.steps!.push({
        name: "Extra",
        uses: "someone/thing@v1",
      });
    });
    expect(ciWorkflowViolations(mutated)).not.toEqual([]);
  });

  it("upload-pages-artifact and deploy-pages each appear exactly once, in place", () => {
    const deploy = parse(deployRaw) as GuardWorkflow;
    const gateSteps = deploy.jobs?.["quality-gate"]?.steps ?? [];
    expect(gateSteps.at(-1)?.uses).toMatch(
      /^actions\/upload-pages-artifact@v\d+$/,
    );
    expect(deploy.jobs?.deploy?.steps?.[0]?.uses).toMatch(
      /^actions\/deploy-pages@v\d+$/,
    );
    const everything = `${raw}\n${deployRaw}`;
    expect(everything.match(/actions\/upload-pages-artifact@/g)).toHaveLength(
      1,
    );
    expect(everything.match(/actions\/deploy-pages@/g)).toHaveLength(1);
    expect(crossWorkflowViolations(allFiles)).toEqual([]);
  });

  it.each([
    [
      "a second upload-pages-artifact in deploy.yml's deploy job",
      (workflow: GuardWorkflow) => {
        workflow.jobs!.deploy!.steps!.push({
          name: "Again",
          uses: "actions/upload-pages-artifact@v5",
        });
      },
    ],
    [
      "deploy-pages moved into the quality-gate job",
      (workflow: GuardWorkflow) => {
        const [step] = workflow.jobs!.deploy!.steps!.splice(0, 1);
        workflow.jobs!["quality-gate"]!.steps!.push(step!);
      },
    ],
    [
      "actions/configure-pages added",
      (workflow: GuardWorkflow) => {
        workflow.jobs!["quality-gate"]!.steps!.unshift({
          name: "Configure",
          uses: "actions/configure-pages@v5",
        });
      },
    ],
    [
      "a third-party deploy action",
      (workflow: GuardWorkflow) => {
        workflow.jobs!.deploy!.steps![0]!.uses =
          "peaceiris/actions-gh-pages@v4";
      },
    ],
  ])("cross guard rejects %s", (_label, edit) => {
    const mutated = mutateYaml(deployRaw, edit);
    expect(
      crossWorkflowViolations({ ...allFiles, "deploy.yml": mutated }),
    ).not.toEqual([]);
  });
});
