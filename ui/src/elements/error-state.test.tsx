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

  test("defaults to stacked message and one-line 48px retry; inline preserves the old arrangement", () => {
    const { getByRole, getByText } = render(
      <ErrorState title="A longer failure message that should use its own full line" detail="More context" retrying={false} onRetry={() => {}} retryLabel="Try again" />,
    );
    const alert = getByRole("alert");
    const button = getByRole("button", { name: "Try again" });
    expect(alert.className).toContain("flex-col");
    expect(getByText("A longer failure message that should use its own full line").parentElement?.parentElement?.className).toContain("flex");
    expect(button.className).toContain("h-12");
    expect(button.className).toContain("whitespace-nowrap");
    expect(button.className).toContain("self-start");
    cleanup();
    const inline = render(<ErrorState title="Oops" retrying={false} onRetry={() => {}} layout="inline" />).getByRole("alert");
    expect(inline.className).not.toContain("flex-col");
  });
});
