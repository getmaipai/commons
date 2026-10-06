import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { ActivityGraph } from "./activity-graph";

afterEach(cleanup);

describe("ActivityGraph", () => {
  test("its markup is unchanged now that it composes heat-graph (ELT-T1-03 depends on this output)", () => {
    const view = render(
      <ActivityGraph
        data={[
          { date: "2026-01-05", count: 3 },
          { date: "2026-01-06", count: 9 },
          { date: "2026-02-01", count: 1 },
        ]}
        start="2026-01-01"
        end="2026-03-01"
        title="Runs"
        total="13 runs"
      />,
    );
    expect(view.container.innerHTML).toMatchSnapshot();
    expect(view.getByText("Runs")).toBeTruthy();
    expect(view.getByText("13 runs")).toBeTruthy();
  });
});
