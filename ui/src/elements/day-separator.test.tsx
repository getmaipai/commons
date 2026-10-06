import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { DayDivider, DaySeparator } from "./day-separator";

afterEach(cleanup);

describe("DayDivider", () => {
  test("is a named separator showing its label", () => {
    const { getByRole } = render(<DayDivider label="Today 1:53 AM" />);
    const divider = getByRole("separator", { name: "Today 1:53 AM" });
    expect(divider.textContent).toBe("Today 1:53 AM");
  });

  test("DaySeparator draws one divider per new day", () => {
    const { getAllByRole } = render(
      <DaySeparator
        messages={[
          { id: "1", day: "Mon", time: "9:00", role: "user", text: "a" },
          { id: "2", day: "Mon", time: "9:01", role: "assistant", text: "b" },
          { id: "3", day: "Tue", time: "9:00", role: "user", text: "c" },
        ]}
      />,
    );
    expect(getAllByRole("separator").map((divider) => divider.textContent)).toEqual(["Mon", "Tue"]);
  });
});
