import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { Status, StatusIndicator, StatusLabel } from "@/kit/ui/status";

afterEach(cleanup);

describe("Status", () => {
  test.each([
    ["online", "Online"],
    ["offline", "Offline"],
    ["maintenance", "Maintenance"],
    ["degraded", "Degraded"],
  ] as const)("renders the %s state with its label", (status, label) => {
    const { getByText } = render(
      <Status status={status}>
        <StatusIndicator />
        <StatusLabel />
      </Status>,
    );
    expect(getByText(label)).toBeTruthy();
  });

  test("supports a quiet indicator while keeping the status dot visible", () => {
    const { container } = render(
      <Status status="offline">
        <StatusIndicator ping={false} />
      </Status>,
    );
    expect(container.querySelector(".animate-ping")).toBeNull();
    expect(container.querySelectorAll("[aria-hidden='true'] > span")).toHaveLength(1);
  });

  test("supports inline placement in flowing text", () => {
    const { getByTestId } = render(<StatusIndicator inline ping={false} data-testid="paused-dot" />);
    const dot = getByTestId("paused-dot");
    expect(dot.className).toContain("inline-flex");
    expect(dot.className).not.toContain(" flex ");
  });

  test("uses the attention foreground tint for degraded status", () => {
    const { container } = render(
      <Status status="degraded">
        <StatusIndicator />
      </Status>,
    );
    expect(container.querySelector(".animate-ping")?.className).toContain("var(--tint-attention-fg)");
    expect(container.querySelector("[aria-hidden='true'] > span:last-child")?.className).toContain("var(--tint-attention-fg)");
  });
});
