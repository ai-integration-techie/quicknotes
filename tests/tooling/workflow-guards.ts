import { isDeepStrictEqual } from "node:util";
import { parse, stringify } from "yaml";

/**
 * Pure guards for the GitHub Actions workflows (pages-deploy R26-R30).
 * Each guard returns a list of violations; an empty list means it passes.
 * They take raw text (or a listing) so tests can feed them in-memory mutations.
 */

export interface Step {
  name?: string;
  id?: string;
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
  if?: unknown;
  "continue-on-error"?: unknown;
}

export interface Job {
  name?: string;
  "runs-on"?: unknown;
  "timeout-minutes"?: unknown;
  needs?: unknown;
  if?: unknown;
  permissions?: unknown;
  environment?: unknown;
  uses?: string;
  steps?: Step[];
  "continue-on-error"?: unknown;
}

export interface Workflow {
  name?: unknown;
  on?: unknown;
  permissions?: unknown;
  concurrency?: unknown;
  jobs?: Record<string, Job>;
}

export const WORKFLOW_FILES = ["ci.yml", "deploy.yml"] as const;

const UPLOAD_PAGES = "actions/upload-pages-artifact";
const DEPLOY_PAGES = "actions/deploy-pages";
const BANNED_ACTIONS = ["actions/upload-artifact", "actions/configure-pages"];
const PINNED_ACTION = /^actions\/[\w-]+@v\d+$/;
const MAIN_ONLY = "github.ref == 'refs/heads/main'";

const GATE_STEPS = [
  "Checkout",
  "Set up Node",
  "Install dependencies",
  "Install Playwright Chromium",
  "Quality gate (npm run ci)",
  "Upload Pages artifact",
];

/** Parses workflow YAML; returns undefined if it is not a YAML mapping. */
export function parseWorkflow(raw: string): Workflow | undefined {
  try {
    const doc: unknown = parse(raw);
    return doc !== null && typeof doc === "object" && !Array.isArray(doc)
      ? (doc as Workflow)
      : undefined;
  } catch {
    return undefined;
  }
}

/** Applies `edit` to a deep copy of the parsed workflow and returns it as YAML. */
export function mutateYaml(
  raw: string,
  edit: (workflow: Workflow) => void,
): string {
  const copy = structuredClone(parse(raw) as Workflow);
  edit(copy);
  return stringify(copy);
}

function jobsOf(workflow: Workflow): [string, Job][] {
  return Object.entries(workflow.jobs ?? {});
}

function stepsOf(job: Job | undefined): Step[] {
  return Array.isArray(job?.steps) ? job.steps : [];
}

/** The action name of a `uses:` value, without the `@ref`. */
function actionName(uses: string): string {
  return uses.split("@")[0] ?? uses;
}

interface UsesEntry {
  job: string;
  index: number;
  uses: string;
}

/** Every `uses:` in a workflow, at job level (index -1) and step level. */
function collectUses(workflow: Workflow): UsesEntry[] {
  return jobsOf(workflow).flatMap(([job, body]) => [
    ...(typeof body.uses === "string"
      ? [{ job, index: -1, uses: body.uses }]
      : []),
    ...stepsOf(body).flatMap((step, index) =>
      typeof step.uses === "string" ? [{ job, index, uses: step.uses }] : [],
    ),
  ]);
}

/** Strips an optional `${{ }}` wrapper from an `if:` expression. */
function bareCondition(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  const wrapped = /^\$\{\{([\s\S]*)\}\}$/.exec(text);
  return (wrapped?.[1] ?? text).trim();
}

// ---------------------------------------------------------------------------
// Listing (AC-23, R27)

export function workflowListingViolations(names: string[]): string[] {
  const sorted = [...names].sort();
  return isDeepStrictEqual(sorted, [...WORKFLOW_FILES])
    ? []
    : [
        `.github/workflows must be exactly ${WORKFLOW_FILES.join(", ")}; found ${sorted.join(", ") || "nothing"}`,
      ];
}

// ---------------------------------------------------------------------------
// ci.yml (AC-22, AC-27, R26, plus "only actions/* actions")

const CI_RAW_BANS: [RegExp, string][] = [
  [/secrets\./, "must not reference secrets."],
  [/continue-on-error/, "must not use continue-on-error"],
  [
    /deploy|pages|publish|upload-artifact/i,
    "must not deploy, publish or upload",
  ],
  [/id-token/, "must not mention id-token"],
];

export function ciWorkflowViolations(raw: string): string[] {
  const workflow = parseWorkflow(raw);
  if (!workflow) return ["ci.yml: not a YAML mapping"];

  const violations: string[] = [];
  if (workflow.name !== "CI") violations.push("ci.yml: name must be CI");
  if (!isDeepStrictEqual(workflow.permissions, { contents: "read" })) {
    violations.push("ci.yml: permissions must be exactly contents: read");
  }
  for (const [job, body] of jobsOf(workflow)) {
    if (body.permissions !== undefined) {
      violations.push(`ci.yml: job ${job} must not declare permissions`);
    }
  }
  for (const [pattern, message] of CI_RAW_BANS) {
    if (pattern.test(raw)) violations.push(`ci.yml: ${message}`);
  }
  for (const { job, uses } of collectUses(workflow)) {
    const name = actionName(uses);
    if (!uses.startsWith("actions/")) {
      violations.push(`ci.yml: job ${job} uses non-actions/* action ${uses}`);
    }
    if ([UPLOAD_PAGES, DEPLOY_PAGES, ...BANNED_ACTIONS].includes(name)) {
      violations.push(`ci.yml: job ${job} must not use ${name}`);
    }
  }
  return violations;
}

// ---------------------------------------------------------------------------
// deploy.yml (AC-1 to AC-4, AC-7, AC-9, AC-10, AC-12, AC-13, AC-24, R11)

const DEPLOY_RAW_BANS: [string, string][] = [
  ["always()", "must not use always()"],
  ["failure()", "must not use failure()"],
  ["cancelled()", "must not use cancelled()"],
  ["continue-on-error", "must not use continue-on-error"],
  ["secrets.", "must not reference secrets."],
];

function deployTopLevelViolations(workflow: Workflow): string[] {
  const violations: string[] = [];
  if (workflow.name !== "Deploy") violations.push("name must be Deploy");

  const on = workflow.on;
  const triggers =
    on !== null && typeof on === "object"
      ? (on as Record<string, unknown>)
      : {};
  if (
    !isDeepStrictEqual(Object.keys(triggers).sort(), [
      "push",
      "workflow_dispatch",
    ])
  ) {
    violations.push("on must be exactly push and workflow_dispatch");
  }
  if (!isDeepStrictEqual(triggers.push, { branches: ["main"] })) {
    violations.push("on.push must be exactly branches: [main]");
  }
  const dispatch = triggers.workflow_dispatch;
  if (!(dispatch === null || isDeepStrictEqual(dispatch, {}))) {
    violations.push("on.workflow_dispatch must have no inputs");
  }

  if (!isDeepStrictEqual(workflow.permissions, { contents: "read" })) {
    violations.push("permissions must be exactly contents: read");
  }
  const concurrency = (workflow.concurrency ?? {}) as Record<string, unknown>;
  if (
    typeof concurrency.group !== "string" ||
    concurrency.group.trim() === ""
  ) {
    violations.push("concurrency.group must be a non-empty string");
  }
  if (concurrency["cancel-in-progress"] !== false) {
    violations.push("concurrency.cancel-in-progress must be false");
  }

  const jobIds = Object.keys(workflow.jobs ?? {}).sort();
  if (!isDeepStrictEqual(jobIds, ["deploy", "quality-gate"])) {
    violations.push("jobs must be exactly quality-gate and deploy");
  }
  return violations;
}

function gateCommandViolations(steps: Step[]): string[] {
  const violations: string[] = [];
  const byName = (name: string) => steps.find((step) => step.name === name);
  const run = (name: string) => byName(name)?.run?.trim() ?? "";

  if (!/^actions\/checkout@v\d+$/.test(byName("Checkout")?.uses ?? "")) {
    violations.push("quality-gate: Checkout must use actions/checkout@v<n>");
  }
  const setupNode = byName("Set up Node");
  if (!/^actions\/setup-node@v\d+$/.test(setupNode?.uses ?? "")) {
    violations.push(
      "quality-gate: Set up Node must use actions/setup-node@v<n>",
    );
  }
  if (
    !isDeepStrictEqual(setupNode?.with, {
      "node-version-file": ".nvmrc",
      cache: "npm",
    })
  ) {
    violations.push(
      "quality-gate: Set up Node must read .nvmrc with npm caching",
    );
  }
  if (run("Install dependencies") !== "npm ci") {
    violations.push("quality-gate: Install dependencies must run npm ci");
  }
  if (
    !/playwright install.*--with-deps.*chromium/.test(
      run("Install Playwright Chromium"),
    )
  ) {
    violations.push("quality-gate: must install Playwright Chromium with deps");
  }
  if (run("Quality gate (npm run ci)") !== "npm run ci") {
    violations.push("quality-gate: Quality gate step must run npm run ci");
  }
  return violations;
}

function gateJobViolations(job: Job | undefined): string[] {
  if (!job) return ["quality-gate: job is missing"];
  const violations: string[] = [];
  const steps = stepsOf(job);

  if (job.name !== "Quality gate")
    violations.push("quality-gate: name must be Quality gate");
  if (job["runs-on"] !== "ubuntu-latest")
    violations.push("quality-gate: must run on ubuntu-latest");
  if (job["timeout-minutes"] !== 15)
    violations.push("quality-gate: timeout-minutes must be 15");
  if (job.permissions !== undefined)
    violations.push("quality-gate: must not declare permissions");
  if (job.if !== undefined)
    violations.push("quality-gate: job must not have an if");

  const names = steps.map((step) => step.name);
  if (!isDeepStrictEqual(names, GATE_STEPS)) {
    violations.push(
      `quality-gate: steps must be exactly ${GATE_STEPS.join(", ")}`,
    );
  }
  if (steps.some((step) => step.if !== undefined)) {
    violations.push("quality-gate: no step may have an if");
  }

  const last = steps.at(-1);
  const gateIndex = names.indexOf("Quality gate (npm run ci)");
  if (
    last?.name !== "Upload Pages artifact" ||
    gateIndex !== steps.length - 2
  ) {
    violations.push(
      "quality-gate: Upload Pages artifact must be the last step, right after the gate",
    );
  }
  const upload = steps.find((step) => step.name === "Upload Pages artifact");
  if (!new RegExp(`^${UPLOAD_PAGES}@v\\d+$`).test(upload?.uses ?? "")) {
    violations.push(
      `quality-gate: Upload Pages artifact must use ${UPLOAD_PAGES}@v<n>`,
    );
  }
  if (upload?.with?.path !== "dist") {
    violations.push(
      "quality-gate: Upload Pages artifact must upload path dist",
    );
  }
  if (upload?.run !== undefined)
    violations.push(
      "quality-gate: Upload Pages artifact must not run a command",
    );

  return [...violations, ...gateCommandViolations(steps)];
}

function deployJobViolations(job: Job | undefined): string[] {
  if (!job) return ["deploy: job is missing"];
  const violations: string[] = [];
  const steps = stepsOf(job);
  const needs = job.needs;

  if (job.name !== "Publish to GitHub Pages")
    violations.push("deploy: name must be Publish to GitHub Pages");
  if (!(
    needs === "quality-gate" || isDeepStrictEqual(needs, ["quality-gate"])
  )) {
    violations.push("deploy: needs must be quality-gate");
  }
  if (bareCondition(job.if) !== MAIN_ONLY) {
    violations.push(`deploy: if must be exactly ${MAIN_ONLY}`);
  }
  if (job["timeout-minutes"] !== 10)
    violations.push("deploy: timeout-minutes must be 10");
  if (
    !isDeepStrictEqual(job.permissions, { pages: "write", "id-token": "write" })
  ) {
    violations.push(
      "deploy: permissions must be exactly pages: write and id-token: write",
    );
  }

  const environment = (job.environment ?? {}) as Record<string, unknown>;
  if (environment.name !== "github-pages")
    violations.push("deploy: environment must be github-pages");
  const url = typeof environment.url === "string" ? environment.url : "";
  const stepRef = /steps\.([\w-]+)\.outputs\.page_url/.exec(url)?.[1];
  if (!stepRef)
    violations.push(
      "deploy: environment.url must be the deploy step's page_url",
    );

  const [step] = steps;
  if (steps.length !== 1 || !step)
    return [...violations, "deploy: must have exactly one step"];
  if (step.name !== "Deploy to GitHub Pages")
    violations.push("deploy: step must be named Deploy to GitHub Pages");
  if (!new RegExp(`^${DEPLOY_PAGES}@v\\d+$`).test(step.uses ?? "")) {
    violations.push(`deploy: step must use ${DEPLOY_PAGES}@v<n>`);
  }
  if (step.run !== undefined)
    violations.push("deploy: step must not run a command");
  if (stepRef && step.id !== stepRef)
    violations.push(
      "deploy: environment.url must reference the deploy step's id",
    );
  return violations;
}

function deployActionViolations(workflow: Workflow): string[] {
  const violations: string[] = [];
  for (const { job, uses } of collectUses(workflow)) {
    if (!PINNED_ACTION.test(uses)) {
      violations.push(
        `${job}: ${uses} must be an actions/* action pinned to @v<n>`,
      );
    }
    if (BANNED_ACTIONS.includes(actionName(uses))) {
      violations.push(`${job}: must not use ${actionName(uses)}`);
    }
  }
  for (const [job, body] of jobsOf(workflow)) {
    for (const step of stepsOf(body)) {
      if (/git push|gh-pages/.test(step.run ?? "")) {
        violations.push(`${job}: no step may push to git or a gh-pages branch`);
      }
    }
  }
  return violations;
}

export function deployWorkflowViolations(raw: string): string[] {
  const workflow = parseWorkflow(raw);
  if (!workflow) return ["deploy.yml: not a YAML mapping"];

  const rawViolations = DEPLOY_RAW_BANS.filter(([text]) =>
    raw.includes(text),
  ).map(([, message]) => message);
  return [
    ...rawViolations,
    ...deployTopLevelViolations(workflow),
    ...gateJobViolations(workflow.jobs?.["quality-gate"]),
    ...deployJobViolations(workflow.jobs?.deploy),
    ...deployActionViolations(workflow),
  ].map((message) => `deploy.yml: ${message}`);
}

// ---------------------------------------------------------------------------
// Across all workflow files (AC-8, AC-25, R29)

function placementViolations(
  entries: (UsesEntry & { file: string })[],
  action: string,
  expected: (entry: UsesEntry & { file: string }) => boolean,
  where: string,
): string[] {
  const hits = entries.filter((entry) => actionName(entry.uses) === action);
  if (hits.length !== 1)
    return [`${action} must appear exactly once; found ${hits.length}`];
  return hits.every(expected) ? [] : [`${action} must appear only in ${where}`];
}

export function crossWorkflowViolations(
  files: Record<string, string>,
): string[] {
  const violations: string[] = [];
  const entries: (UsesEntry & { file: string })[] = [];
  const parsed: Record<string, Workflow> = {};

  for (const [file, raw] of Object.entries(files)) {
    const workflow = parseWorkflow(raw);
    if (!workflow) {
      violations.push(`${file}: not a YAML mapping`);
      continue;
    }
    parsed[file] = workflow;
    for (const [job, body] of jobsOf(workflow)) {
      if (
        body.permissions !== undefined &&
        !(file === "deploy.yml" && job === "deploy")
      ) {
        violations.push(`${file}: job ${job} must not declare permissions`);
      }
    }
    entries.push(...collectUses(workflow).map((entry) => ({ ...entry, file })));
  }

  if (files["ci.yml"]?.includes("id-token"))
    violations.push("ci.yml: must not mention id-token");

  const gateSteps = stepsOf(parsed["deploy.yml"]?.jobs?.["quality-gate"]);
  violations.push(
    ...placementViolations(
      entries,
      UPLOAD_PAGES,
      (e) =>
        e.file === "deploy.yml" &&
        e.job === "quality-gate" &&
        e.index === gateSteps.length - 1,
      "the last step of deploy.yml's quality-gate job",
    ),
    ...placementViolations(
      entries,
      DEPLOY_PAGES,
      (e) => e.file === "deploy.yml" && e.job === "deploy" && e.index >= 0,
      "deploy.yml's deploy job",
    ),
  );

  for (const { file, job, uses } of entries) {
    if (!uses.startsWith("actions/"))
      violations.push(`${file}: job ${job} uses non-actions/* action ${uses}`);
    if (BANNED_ACTIONS.includes(actionName(uses))) {
      violations.push(`${file}: job ${job} must not use ${actionName(uses)}`);
    }
  }
  return violations;
}
