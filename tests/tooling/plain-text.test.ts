// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readText, uiModules } from "./repo";

/** list-notes R9 / AC-13: note text is plain text; no UI module uses an HTML sink. */
const HTML_SINK =
  /dangerouslySetInnerHTML|innerHTML|outerHTML|insertAdjacentHTML/;

function sinkOffenders(files: Record<string, string>): string[] {
  return Object.entries(files)
    .filter(([, text]) => HTML_SINK.test(text))
    .map(([file]) => file);
}

describe("plain text", () => {
  it("no UI module uses an HTML sink (AC-13)", () => {
    const modules = uiModules();
    expect(modules).toEqual(
      expect.arrayContaining(["src/App.tsx", "src/copy.ts"]),
    );
    const sources = Object.fromEntries(
      modules.map((file) => [file, readText(file)]),
    );
    expect(sinkOffenders(sources)).toEqual([]);
  });

  it("the sink scan flags each fixture (AC-13)", () => {
    expect(
      sinkOffenders({
        "a.tsx": "<div dangerouslySetInnerHTML={{ __html: body }} />",
        "b.ts": "element.innerHTML = body;",
        "c.ts": "element.outerHTML = body;",
        "d.ts": 'element.insertAdjacentHTML("beforeend", body);',
        "e.tsx": "<div>{body}</div>",
      }),
    ).toEqual(["a.tsx", "b.ts", "c.ts", "d.ts"]);
  });
});
