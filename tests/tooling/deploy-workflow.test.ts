// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { readText } from "./repo";
import {
  deployWorkflowViolations,
  mutateYaml,
  type Step,
  type Workflow,
} from "./workflow-guards";

const raw = readText(".github/workflows/deploy.yml");
const workflow = parse(raw) as Workflow;
const gate = workflow.jobs?.["quality-gate"];
const deploy = workflow.jobs?.deploy;
const gateSteps: Step[] = gate?.steps ?? [];

function gateStep(name: string): Step | undefined {
  return gateSteps.find((step) => step.name === name);
}

function allUses(): string[] {
  return Object.values(workflow.jobs ?? {}).flatMap((job) =>
    (job.steps ?? []).flatMap((step) => (step.uses ? [step.uses] : [])),
  );
}

describe("Deploy workflow", () => {
  it("Deploy runs on push to main and manual dispatch only", () => {
    expect(workflow.name).toBe("Deploy");
    const on = workflow.on as Record<string, unknown>;
    expect(Object.keys(on).sort()).toEqual(["push", "workflow_dispatch"]);
    expect(on.push).toEqual({ branches: ["main"] });
    const dispatch = on.workflow_dispatch;
    const noInputs =
      dispatch === null ||
      (typeof dispatch === "object" && Object.keys(dispatch).length === 0);
    expect(noInputs, "workflow_dispatch must have no inputs").toBe(true);
  });

  it("quality-gate runs npm ci, Playwright install and npm run ci as named steps in order", () => {
    expect(gate?.["runs-on"]).toBe("ubuntu-latest");
    expect(gate?.name).toBe("Quality gate");
    expect(gateSteps.map((step) => step.name)).toEqual([
      "Checkout",
      "Set up Node",
      "Install dependencies",
      "Install Playwright Chromium",
      "Quality gate (npm run ci)",
      "Upload Pages artifact",
    ]);
    expect(gateStep("Install dependencies")?.run?.trim()).toBe("npm ci");
    expect(gateStep("Install Playwright Chromium")?.run).toMatch(
      /playwright install.*--with-deps.*chromium/,
    );
    expect(gateStep("Quality gate (npm run ci)")?.run?.trim()).toBe(
      "npm run ci",
    );
  });

  it("uploads dist with upload-pages-artifact as the last step, right after the gate", () => {
    const last = gateSteps.at(-1);
    expect(last?.name).toBe("Upload Pages artifact");
    expect(gateSteps.at(-2)?.name).toBe("Quality gate (npm run ci)");
    expect(last?.uses).toMatch(/^actions\/upload-pages-artifact@v\d+$/);
    expect(last?.with?.path).toBe("dist");
    expect(last).not.toHaveProperty("if");
  });

  it("publish needs the gate, is main-only, and nothing overrides failure", () => {
    expect(["quality-gate", ["quality-gate"]]).toContainEqual(deploy?.needs);
    expect(deploy?.if).toContain("github.ref == 'refs/heads/main'");
    for (const banned of [
      "always()",
      "failure()",
      "cancelled()",
      "continue-on-error",
    ]) {
      expect(raw, banned).not.toContain(banned);
    }
  });

  it("contents: read at top; only the publish job has pages/id-token write", () => {
    expect(workflow.permissions).toEqual({ contents: "read" });
    expect(gate).not.toHaveProperty("permissions");
    expect(deploy?.permissions).toEqual({
      pages: "write",
      "id-token": "write",
    });
  });

  it("workflow-level concurrency never cancels an in-progress deploy", () => {
    const concurrency = workflow.concurrency as Record<string, unknown>;
    expect(typeof concurrency.group).toBe("string");
    expect((concurrency.group as string).length).toBeGreaterThan(0);
    expect(concurrency["cancel-in-progress"]).toBe(false);
  });

  it("publish job uses github-pages with the page_url output", () => {
    const environment = deploy?.environment as Record<string, unknown>;
    expect(environment.name).toBe("github-pages");
    expect(environment.url).toMatch(/steps\.[\w-]+\.outputs\.page_url/);
    expect(deploy?.name).toBe("Publish to GitHub Pages");
  });

  it("uses only pinned actions/* actions and no credentials", () => {
    const uses = allUses();
    expect(uses.length).toBeGreaterThan(0);
    for (const action of uses) {
      expect(action).toMatch(/^actions\/[\w-]+@v\d+$/);
      expect(action).not.toMatch(
        /^actions\/(upload-artifact|configure-pages)@/,
      );
    }
    expect(raw).not.toContain("secrets.");
    const runs = gateSteps.flatMap((step) => (step.run ? [step.run] : []));
    for (const run of runs) {
      expect(run).not.toMatch(/git push|gh-pages/);
    }
  });

  it("sets up Node from .nvmrc with npm caching", () => {
    const setupNode = gateStep("Set up Node");
    expect(setupNode?.uses).toMatch(/^actions\/setup-node@v\d+$/);
    expect(setupNode?.with).toEqual({
      "node-version-file": ".nvmrc",
      cache: "npm",
    });
  });

  it("exactly quality-gate and deploy; deploy has one deploy-pages step", () => {
    expect(Object.keys(workflow.jobs ?? {}).sort()).toEqual([
      "deploy",
      "quality-gate",
    ]);
    expect(deploy?.steps).toHaveLength(1);
    const [step] = deploy?.steps ?? [];
    expect(step?.name).toBe("Deploy to GitHub Pages");
    expect(step?.uses).toMatch(/^actions\/deploy-pages@v\d+$/);
    expect(step).not.toHaveProperty("run");
  });

  it("sets the R11 timeouts", () => {
    expect(gate?.["timeout-minutes"]).toBe(15);
    expect(deploy?.["timeout-minutes"]).toBe(10);
  });
});

type Mutation = [string, (workflow: Workflow) => void];

function gateStepsOf(target: Workflow): Step[] {
  return target.jobs!["quality-gate"]!.steps!;
}

const AC5_MUTATIONS: Mutation[] = [
  [
    "(a) if: always() on deploy",
    (w) => {
      w.jobs!.deploy!.if = "always()";
    },
  ],
  [
    "(b) needs removed from deploy",
    (w) => {
      delete w.jobs!.deploy!.needs;
    },
  ],
  [
    "(c) continue-on-error on the gate step",
    (w) => {
      const step = gateStepsOf(w).find(
        (s) => s.name === "Quality gate (npm run ci)",
      )!;
      step["continue-on-error"] = true;
    },
  ],
  [
    "(d) pull_request trigger added",
    (w) => {
      (w.on as Record<string, unknown>).pull_request = null;
    },
  ],
  [
    "(e) push branches widened to **",
    (w) => {
      (w.on as Record<string, unknown>).push = { branches: ["**"] };
    },
  ],
  [
    "(f) github.ref condition removed from deploy",
    (w) => {
      delete w.jobs!.deploy!.if;
    },
  ],
  [
    "(g) upload moved before the gate",
    (w) => {
      const steps = gateStepsOf(w);
      const upload = steps.pop()!;
      steps.splice(steps.length - 1, 0, upload);
    },
  ],
];

const EXTRA_MUTATIONS: Mutation[] = [
  [
    "a run step in the deploy job",
    (w) => {
      w.jobs!.deploy!.steps!.push({ name: "Build", run: "npm run build" });
    },
  ],
  [
    "permissions on the quality-gate job",
    (w) => {
      w.jobs!["quality-gate"]!.permissions = { pages: "write" };
    },
  ],
  [
    "a third job",
    (w) => {
      w.jobs!.extra = { "runs-on": "ubuntu-latest", steps: [] };
    },
  ],
  [
    "top-level permissions widened",
    (w) => {
      w.permissions = { contents: "write" };
    },
  ],
  [
    "cancel-in-progress: true",
    (w) => {
      w.concurrency = { group: "pages", "cancel-in-progress": true };
    },
  ],
  [
    "a different environment",
    (w) => {
      w.jobs!.deploy!.environment = { name: "production" };
    },
  ],
  [
    "a SHA-pinned action",
    (w) => {
      gateStepsOf(w)[0]!.uses = "actions/checkout@abc123";
    },
  ],
  [
    "a secrets reference",
    (w) => {
      gateStepsOf(w)[4]!.run = "TOKEN=${{ secrets.PAT }} npm run ci";
    },
  ],
  [
    "a gh-pages push",
    (w) => {
      gateStepsOf(w)[4]!.run = "npm run ci && git push origin gh-pages";
    },
  ],
  [
    "the gate step skipped with if: false",
    (w) => {
      gateStepsOf(w)[4]!.if = false;
    },
  ],
  [
    "setup-node without .nvmrc",
    (w) => {
      gateStepsOf(w)[1]!.with = { "node-version": "24" };
    },
  ],
  [
    "the github.ref condition OR-ed open",
    (w) => {
      w.jobs!.deploy!.if = "github.ref == 'refs/heads/main' || true";
    },
  ],
  [
    "upload path changed",
    (w) => {
      gateStepsOf(w)[5]!.with = { path: "." };
    },
  ],
];

describe("Deploy workflow guard", () => {
  it("deploy guard passes the real deploy.yml", () => {
    expect(deployWorkflowViolations(raw)).toEqual([]);
  });

  it("mutateYaml round-trips without changing the guard result", () => {
    expect(deployWorkflowViolations(mutateYaml(raw, () => {}))).toEqual([]);
    expect(workflow.jobs?.deploy?.if).toBe("github.ref == 'refs/heads/main'");
  });

  it.each(AC5_MUTATIONS)("deploy guard rejects mutation: %s", (_, edit) => {
    expect(deployWorkflowViolations(mutateYaml(raw, edit))).not.toEqual([]);
  });

  it.each(EXTRA_MUTATIONS)("deploy guard rejects %s", (_, edit) => {
    expect(deployWorkflowViolations(mutateYaml(raw, edit))).not.toEqual([]);
  });

  it("deploy guard rejects text that is not a YAML mapping", () => {
    expect(deployWorkflowViolations("- just\n- a list\n")).not.toEqual([]);
  });
});
