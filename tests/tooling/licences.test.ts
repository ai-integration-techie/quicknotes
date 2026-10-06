// @vitest-environment node
import { describe, expect, it } from "vitest";
import { R5_EXCEPTIONS, exists, readJson } from "./repo";

/** OSI-approved licences accepted for any package in the dependency tree (AC-36). */
const OSI_ALLOWLIST = new Set([
  "MIT",
  "MIT-0",
  "ISC",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "0BSD",
  "MPL-2.0",
  "BlueOak-1.0.0",
  "Python-2.0",
]);

/*
 * R5 exceptions (spec R5 / AC-36): the closed, named list of dev-only
 * transitive data packages allowed a non-OSI licence. Defined once in
 * ./repo.ts so e2e/document.spec.ts can check none of them reaches dist/.
 * A package passes only if its licence is OSI-approved, or if it is listed
 * here AND its licence equals the listed value. Widening this list needs a
 * spec revision.
 */
const EXPECTED_R5_EXCEPTIONS = {
  "caniuse-lite": "CC-BY-4.0",
  "language-subtag-registry": "CC0-1.0",
  "mdn-data": "CC0-1.0",
};

interface LockPackage {
  license?: string;
}

interface InstalledManifest {
  name?: string;
  license?: string | { type?: string };
  licenses?: { type?: string }[];
}

function packageName(lockPath: string): string {
  return lockPath.slice(
    lockPath.lastIndexOf("node_modules/") + "node_modules/".length,
  );
}

/** Licence from the installed package.json, or the lockfile for uninstalled optional packages. */
function licenceOf(lockPath: string, entry: LockPackage): string {
  const manifestPath = `${lockPath}/package.json`;
  if (exists(manifestPath)) {
    const manifest = readJson<InstalledManifest>(manifestPath);
    if (typeof manifest.license === "string") return manifest.license;
    if (manifest.license?.type) return manifest.license.type;
    const legacy = manifest.licenses?.map((l) => l.type).filter(Boolean);
    if (legacy?.length) return `(${legacy.join(" OR ")})`;
  }
  return entry.license ?? "UNKNOWN";
}

function isOsiExpression(expression: string): boolean {
  const ids = expression
    .replace(/[()]/g, " ")
    .split(/\s+(?:OR|AND)\s+/)
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.length > 0 && ids.every((id) => OSI_ALLOWLIST.has(id));
}

/** True when the package is OSI-licensed or a listed R5 exception at its listed licence. */
function isLicenceAllowed(
  name: string,
  licence: string,
  exceptions: Readonly<Record<string, string>> = R5_EXCEPTIONS,
): boolean {
  if (isOsiExpression(licence)) return true;
  return Object.hasOwn(exceptions, name) && exceptions[name] === licence;
}

describe("licences", () => {
  it("licence expressions are checked id by id", () => {
    expect(isOsiExpression("MIT")).toBe(true);
    expect(isOsiExpression("MIT-0")).toBe(true);
    expect(isOsiExpression("(MIT OR Apache-2.0)")).toBe(true);
    expect(isOsiExpression("MIT AND CC-BY-4.0")).toBe(false);
    expect(isOsiExpression("UNKNOWN")).toBe(false);
  });

  it("R5 exception list holds exactly the three named packages", () => {
    expect({ ...R5_EXCEPTIONS }).toEqual(EXPECTED_R5_EXCEPTIONS);
    expect(Object.isFrozen(R5_EXCEPTIONS)).toBe(true);
  });

  it("exceptions apply only to listed packages at their listed licence", () => {
    expect(isLicenceAllowed("caniuse-lite", "CC-BY-4.0")).toBe(true);
    expect(isLicenceAllowed("mdn-data", "CC0-1.0")).toBe(true);
    // A listed package whose licence has changed fails.
    expect(isLicenceAllowed("caniuse-lite", "CC-BY-NC-4.0")).toBe(false);
    expect(isLicenceAllowed("mdn-data", "CC-BY-4.0")).toBe(false);
    // An unlisted package with a non-OSI licence fails.
    expect(isLicenceAllowed("some-data", "CC0-1.0")).toBe(false);
    expect(isLicenceAllowed("some-lib", "UNKNOWN")).toBe(false);
    expect(isLicenceAllowed("some-lib", "MIT")).toBe(true);
  });

  it("dependencies are OSI-licensed or a named R5 exception", () => {
    const lock = readJson<{ packages: Record<string, LockPackage> }>(
      "package-lock.json",
    );
    const failures = Object.entries(lock.packages)
      .filter(([lockPath]) => lockPath !== "")
      .map(([lockPath, entry]) => ({
        name: packageName(lockPath),
        licence: licenceOf(lockPath, entry),
      }))
      .filter(({ name, licence }) => !isLicenceAllowed(name, licence))
      .map(({ name, licence }) => `${name}: ${licence}`);

    expect([...new Set(failures)].sort()).toEqual([]);
  });
});
