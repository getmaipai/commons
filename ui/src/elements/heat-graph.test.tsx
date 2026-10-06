import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { HEAT_LEVEL_TINT, HeatGraph } from "./heat-graph";
import { ActivityGraph } from "./activity-graph";

afterEach(cleanup);

const data = [
  { date: "2026-01-05", count: 3 },
  { date: "2026-01-06", count: 9 },
  { date: "2026-02-01", count: 1 },
];
const range = { start: "2026-01-01", end: "2026-03-01" };

describe("HeatGraph", () => {
  test("draws a cell per day, month labels, the legend and every word as given", () => {
    const view = render(
      <HeatGraph
        data={data}
        {...range}
        lessLabel="fewer"
        moreLabel="more runs"
        monthLabel={(m) => `M${m}`}
      />,
    );
    // Jan 1 to Mar 1 is 60 days; the grid pads to whole weeks.
    expect(view.container.querySelectorAll("[class*='aspect-square']").length).toBeGreaterThanOrEqual(60);
    expect(view.getByText("fewer")).toBeTruthy();
    expect(view.getByText("more runs")).toBeTruthy();
    expect(view.getByText("M0")).toBeTruthy();
    expect(view.container.querySelector("[data-slot='heat-graph']")).toBeTruthy();
  });

  test("ships no remote image, link or inline hex color", () => {
    const view = render(<HeatGraph data={data} {...range} />);
    expect(view.container.querySelector("img, a, link, iframe")).toBeNull();
    expect(view.container.innerHTML).not.toMatch(/https?:\/\/|#[0-9a-f]{6}\b/i);
  });

  test("the level scale is the kit's own tokens, one definition shared with ActivityGraph", () => {
    expect(HEAT_LEVEL_TINT).toHaveLength(5);
    const view = render(<ActivityGraph data={data} {...range} title="Runs" total="13" />);
    expect(view.container.innerHTML).toContain("bg-blue-500/70");
  });
});
