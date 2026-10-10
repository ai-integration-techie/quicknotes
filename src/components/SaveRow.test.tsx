import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SaveRow from "./SaveRow";

describe("SaveRow", () => {
  it("default rendering is unchanged by the optional props (edit-delete-note D4)", () => {
    const plain = render(<SaveRow saving={false} />);
    const ids = (html: string) => html.replace(/_r_\w+_/g, "ID");
    const before = ids(plain.container.innerHTML);
    plain.unmount();
    const withDefaults = render(
      <SaveRow saving={false} label="Save note" savingLabel="Saving…" />,
    );
    expect(ids(withDefaults.container.innerHTML)).toBe(before);
    expect(before).toContain(">Save note</button><p ");
  });

  it("renders the edit labels and the secondary node before the hint", () => {
    const { container } = render(
      <SaveRow
        saving
        label="Save changes"
        savingLabel="Saving…"
        secondary={<button type="button">Cancel</button>}
      />,
    );
    const children = [...(container.firstElementChild?.children ?? [])];
    expect(children.map((child) => child.tagName)).toEqual([
      "BUTTON",
      "BUTTON",
      "P",
    ]);
    expect(children[0]?.textContent).toBe("Saving…");
    expect(children[1]?.textContent).toBe("Cancel");
  });
});
