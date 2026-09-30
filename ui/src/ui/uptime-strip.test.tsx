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
  test("renders non-interactive hidden cells and one labelled image", () => {
    const { container, getByRole } = render(
      <TooltipProvider>
        <UptimeStrip data={[...sample]} summary="Last two days: one outage" />
      </TooltipProvider>,
    );
    expect(getByRole("img").getAttribute("aria-label")).toBe("Last two days: one outage");
    expect(container.querySelectorAll("button")).toHaveLength(0);
    expect(container.querySelectorAll("[tabindex]")).toHaveLength(0);
    expect(container.querySelectorAll("[aria-label]")).toHaveLength(1);
    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(2);
  });

  test("aria-label takes precedence over summary", () => {
    const { getByRole } = render(
      <TooltipProvider>
        <UptimeStrip data={[...sample]} summary="Summary" aria-label="Explicit label" />
      </TooltipProvider>,
    );
    expect(getByRole("img").getAttribute("aria-label")).toBe("Explicit label");
  });

  test("generates an image label when summary is omitted", () => {
    const { getByRole } = render(
      <TooltipProvider>
        <UptimeStrip data={[...sample]} />
      </TooltipProvider>,
    );
    expect(getByRole("img").getAttribute("aria-label")).toBe("Uptime history, 2 days");
  });

  test("shows the day's label and detail on hover", async () => {
    const { container, findByText, getByText } = render(
      <TooltipProvider>
        <UptimeStrip data={[...sample]} />
      </TooltipProvider>,
    );
    fireEvent.pointerMove(container.querySelectorAll("[aria-hidden='true']")[1]!, { pointerType: "mouse" });
    expect(await findByText("Tue")).toBeTruthy();
    expect(getByText("Database outage")).toBeTruthy();
  });

  test("renders an empty array without crashing", () => {
    const { container } = render(<UptimeStrip data={[]} aria-label="No history" />);
    expect(container.firstElementChild).toBeTruthy();
    expect(container.querySelectorAll("button")).toHaveLength(0);
    expect(container.firstElementChild?.getAttribute("role")).toBe("img");
    expect(container.firstElementChild?.getAttribute("aria-label")).toBe("No history");
  });
});
