// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  allDependencyNames,
  listFiles,
  readPackageJson,
  readText,
} from "./repo";

const SDK_PATTERNS: RegExp[] = [
  /gtag/,
  /^react-ga/,
  /^@vercel\/analytics$/,
  /plausible/,
  /^@sentry\//,
  /posthog/,
  /mixpanel/,
  /^@segment\//,
  /^@amplitude\//,
  /^@datadog\//,
  /^logrocket/,
  /hotjar/,
];

const SOURCE_MARKERS = /googletagmanager|gtag\(|sentry|posthog|plausible/i;
const EXTERNAL_ASSET =
  /<(?:script|link)\b[^>]*\b(?:src|href)\s*=\s*["']?(?:https?:)?\/\//i;

describe("privacy", () => {
  it("no analytics/telemetry SDKs in dependencies", () => {
    const deps = allDependencyNames(readPackageJson());
    expect(
      deps.filter((name) => SDK_PATTERNS.some((pattern) => pattern.test(name))),
    ).toEqual([]);
  });

  it("no tracking code or external assets in source", () => {
    const files = ["index.html", ...listFiles("src")];
    const offenders = files.filter((file) => {
      const text = readText(file);
      return SOURCE_MARKERS.test(text) || EXTERNAL_ASSET.test(text);
    });
    expect(offenders).toEqual([]);
  });

  it("the external-asset check catches a CDN script", () => {
    expect(
      EXTERNAL_ASSET.test(
        '<script src="https://cdn.example.com/a.js"></script>',
      ),
    ).toBe(true);
    expect(EXTERNAL_ASSET.test('<link href="//fonts.example.com/x.css">')).toBe(
      true,
    );
    expect(
      EXTERNAL_ASSET.test(
        '<script type="module" src="/src/main.tsx"></script>',
      ),
    ).toBe(false);
  });
});
