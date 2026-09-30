import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { TooltipProvider } from "@/kit/ui/tooltip";
import { UptimeStrip } from "@/kit/ui/uptime-strip";

afterEach(cleanup);

const sample = [
  { status: "up", label: "Mon", detail: "All systems operational" },
  { status: "down", label: "Tue", detail: "Database outage" },
] as const;

describe("UptimeStrip", () => {
  test("renders one accessible cell per datum", () => {
    const { getAllByRole } = render(
      <TooltipProvider>
        <UptimeStrip data={[...sample]} aria-label="Service uptime" />
      </TooltipProvider>,
    );
    const cells = getAllByRole("button");
    expect(cells).toHaveLength(2);
    expect(cells[0]!.getAttribute("aria-label")).toBe("Mon, up");
    expect(cells[1]!.getAttribute("aria-label")).toBe("Tue, down");
  });

  test("shows the day's label and detail when focused", async () => {
    const { getAllByRole, findByText, getByText } = render(
      <TooltipProvider>
        <UptimeStrip data={[...sample]} />
      </TooltipProvider>,
    );
    fireEvent.focus(getAllByRole("button")[0]!);
    expect(await findByText("Mon")).toBeTruthy();
    expect(getByText("All systems operational")).toBeTruthy();
  });

  test("shows the day's label and detail on hover", async () => {
    const { getAllByRole, findByText, getByText } = render(
      <TooltipProvider>
        <UptimeStrip data={[...sample]} />
      </TooltipProvider>,
    );
    fireEvent.pointerMove(getAllByRole("button")[1]!, { pointerType: "mouse" });
    expect(await findByText("Tue")).toBeTruthy();
    expect(getByText("Database outage")).toBeTruthy();
  });

  test("renders an empty array without crashing", () => {
    const { container } = render(<UptimeStrip data={[]} aria-label="No history" />);
    expect(container.firstElementChild).toBeTruthy();
    expect(container.querySelectorAll("button")).toHaveLength(0);
  });
});
