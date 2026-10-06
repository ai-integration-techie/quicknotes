import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";
import { APP_NAME, EMPTY_STATE_PRIMARY, EMPTY_STATE_SECONDARY } from "./copy";

describe("App shell", () => {
  it("renders banner with the only h1 and the empty state in main", () => {
    render(<App />);

    const banner = screen.getByRole("banner");
    expect(
      within(banner).getByRole("heading", { level: 1, name: APP_NAME }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);

    const main = screen.getByRole("main");
    expect(within(main).getByText(EMPTY_STATE_PRIMARY)).toBeInTheDocument();
    expect(within(main).getByText(EMPTY_STATE_SECONDARY)).toBeInTheDocument();
  });

  it("has no interactive controls", () => {
    render(<App />);

    for (const role of [
      "button",
      "textbox",
      "link",
      "searchbox",
      "checkbox",
    ] as const) {
      expect(screen.queryAllByRole(role)).toHaveLength(0);
    }
  });
});
