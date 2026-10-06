import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { cleanup, render } from "@testing-library/react";
import { ErrorState } from "./error-state";

afterEach(cleanup);

describe("ErrorState", () => {
  test("renders a muted, unfilled failure with a text retry action", () => {
    const { getByRole, getByText, container } = render(
      <ErrorState title="Could not send" detail="Try again in a moment." retrying={false} onRetry={() => {}} />,
    );
    const alert = getByRole("alert");
    expect(alert.className).not.toMatch(/\bbg-/);
    expect(alert.querySelector("svg")?.className.baseVal ?? alert.querySelector("svg")?.getAttribute("class"))
      .toContain("text-muted-foreground");
    expect(getByText("Could not send").className).toContain("text-muted-foreground");
    expect(getByRole("button", { name: "Retry" }).className).toContain("text-muted-foreground");
    expect(container.querySelector("[data-slot='error-state']")).toBeTruthy();
  });

  test("contains no raw palette color utility classes", () => {
    const source = readFileSync(new URL("./error-state.tsx", import.meta.url), "utf8");
    expect(source).not.toMatch(/(?:bg|text|border|ring|from|to|via)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}/);
  });
});
