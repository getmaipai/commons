import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { TraceWaterfall } from "./trace-waterfall";

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
