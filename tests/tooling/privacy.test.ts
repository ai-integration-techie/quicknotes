// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  allDependencyNames,
  listFiles,
  readPackageJson,
  readText,
  storageSourceFiles,
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

/** note-storage R41 / AC-55: no network and no other browser storage in the storage layer. */
const STORAGE_NETWORK_PATTERNS: RegExp[] = [
  /fetch\(/,
  /XMLHttpRequest/,
  /sendBeacon/,
  /WebSocket/,
  /EventSource/,
  /localStorage/,
  /sessionStorage/,
  /document\.cookie/,
  /caches\./,
  /import\(\s*["'`](?:https?:)?\/\//,
];

/** note-storage R35 / AC-50: no cross-tab channels in the storage layer. */
const CROSS_TAB_PATTERNS: RegExp[] = [
  /BroadcastChannel/,
  /addEventListener\(\s*["']storage["']/,
  /SharedWorker/,
];

function offenders(patterns: RegExp[]): string[] {
  return storageSourceFiles().flatMap((file) => {
    const text = readText(file);
    return patterns
      .filter((pattern) => pattern.test(text))
      .map((pattern) => `${file}: ${pattern.source}`);
  });
}

describe("storage privacy", () => {
  it("scans the storage source files", () => {
    expect(storageSourceFiles()).toEqual(
      expect.arrayContaining([
        "src/notes/note.ts",
        "src/storage/indexedDbNoteRepository.ts",
        "src/storage/index.ts",
      ]),
    );
    expect(storageSourceFiles().some((file) => file.includes(".test."))).toBe(
      false,
    );
  });

  it("no network or other storage APIs in storage source (AC-55)", () => {
    expect(offenders(STORAGE_NETWORK_PATTERNS)).toEqual([]);
  });

  it("no cross-tab channels in storage source (AC-50)", () => {
    expect(offenders(CROSS_TAB_PATTERNS)).toEqual([]);
  });

  it("each storage pattern catches its fixture", () => {
    const fixtures = [
      'await fetch("/x")',
      "new XMLHttpRequest()",
      "navigator.sendBeacon(url)",
      "new WebSocket(url)",
      "new EventSource(url)",
      'localStorage.setItem("k", v)',
      "sessionStorage.clear()",
      'document.cookie = "a=b"',
      'caches.open("v1")',
      'await import("https://cdn.example.com/m.js")',
    ];
    STORAGE_NETWORK_PATTERNS.forEach((pattern, index) => {
      expect(pattern.test(fixtures[index] ?? ""), pattern.source).toBe(true);
    });
    expect(
      STORAGE_NETWORK_PATTERNS.some((pattern) =>
        pattern.test('const m = await import("./local");'),
      ),
    ).toBe(false);

    const crossTab = [
      'new BroadcastChannel("notes")',
      'window.addEventListener("storage", onChange)',
      'new SharedWorker("w.js")',
    ];
    CROSS_TAB_PATTERNS.forEach((pattern, index) => {
      expect(pattern.test(crossTab[index] ?? ""), pattern.source).toBe(true);
    });
  });
});
