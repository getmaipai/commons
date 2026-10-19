import { describe, expect, test, afterEach } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { ROUTE_SKELETON_DELAY_MS, RouteSkeleton } from "@/kit/primitives/RouteSkeleton";

afterEach(cleanup);

describe("RouteSkeleton", () => {
  test("announces loading, never a blank screen", () => {
    const { getByRole } = render(<RouteSkeleton />);
    expect(getByRole("status", { name: "Loading" })).toBeTruthy();
  });

  test("stays invisible for its first 200 ms, so a quick load never flashes it", () => {
    const { getByRole } = render(<RouteSkeleton />);
    const box = getByRole("status", { name: "Loading" });
    expect(ROUTE_SKELETON_DELAY_MS).toBe(200);
    expect(box.style.opacity).toBe("0");
    expect(box.style.animation).toContain("route-skeleton-in");
    expect(box.style.animation).toContain("200ms");
  });
});
