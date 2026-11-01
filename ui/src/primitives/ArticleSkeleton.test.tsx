import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { ArticleSkeleton } from "@/kit/primitives/ArticleSkeleton";
import { ROUTE_SKELETON_DELAY_MS } from "@/kit/primitives/RouteSkeleton";

afterEach(cleanup);

describe("ArticleSkeleton", () => {
  test("announces article loading with a configurable label", () => {
    const { getByRole, rerender } = render(<ArticleSkeleton />);
    expect(getByRole("status", { name: "Loading article" })).toBeTruthy();
    rerender(<ArticleSkeleton label="Loading story" />);
    expect(getByRole("status", { name: "Loading story" })).toBeTruthy();
  });

  test("uses the shared 200 ms invisible delay", () => {
    const { getByRole } = render(<ArticleSkeleton />);
    const box = getByRole("status", { name: "Loading article" });
    expect(ROUTE_SKELETON_DELAY_MS).toBe(200);
    expect(box.style.opacity).toBe("0");
    expect(box.style.animation).toContain("route-skeleton-in");
    expect(box.style.animation).toContain("200ms");
  });

  test("draws the article structure", () => {
    const { getByRole } = render(<ArticleSkeleton />);
    const box = getByRole("status");
    expect(box.querySelectorAll("[data-slot=skeleton]").length).toBe(13);
    expect(box.querySelectorAll("[class*=aspect-video]").length).toBe(1);
    expect(box.querySelectorAll("[class*=h-4]").length).toBe(8);
  });
});
