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
});
