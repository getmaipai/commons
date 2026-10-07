import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { TraceWaterfall } from "./trace-waterfall";

afterEach(cleanup);

describe("TraceWaterfall", () => {
  test("announces skipped spans without presenting them as completed", () => {
    const view = render(<TraceWaterfall spans={[{
      id: "node-1",
      name: "output gate",
      depth: 0,
      startMs: 10,
      durationMs: 4,
      status: "skipped",
    }]} totalMs={20} visibleCount={10} />);

    expect(view.getByRole("img", { name: "skipped, starts at 10ms, runs 4ms" })).toBeTruthy();
  });
});

describe("TraceWaterfall text contrast", () => {
  test("uses the contrast-safe muted token for span names and durations", () => {
    const { getByText } = render(
      <TraceWaterfall
        spans={[{
          id: "lookup",
          name: "Search the library",
          depth: 0,
          startMs: 0,
          durationMs: 128,
          status: "completed",
        }]}
        totalMs={128}
        visibleCount={1}
      />,
    );

    const name = getByText("Search the library");
    const duration = getByText("128");
    expect(name.className).toContain("text-muted-foreground");
    expect(name.className).not.toMatch(/text-foreground\//);
    expect(duration.className).toContain("text-muted-foreground");
    expect(duration.className).not.toMatch(/text-foreground\//);
  });
});
