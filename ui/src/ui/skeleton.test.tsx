import { afterEach, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { Skeleton } from "./skeleton";

afterEach(cleanup);

test("Skeleton defaults keep their exact classes; optional animation, shape and tone apply", () => {
  const baseline = render(<Skeleton />).container.firstElementChild!;
  expect(baseline.className).toBe("animate-pulse rounded-md bg-accent");
  const tile = render(<Skeleton animation="shimmer" shape="tile" tone="surface" />).container.firstElementChild!;
  expect(tile.className).toBe("tw-shimmer aspect-square rounded-[var(--radius-card)] bg-[var(--surface-2)]");
  const row = render(<Skeleton shape="row" />).container.firstElementChild!;
  expect(row.className).toContain("h-[76px] rounded-[var(--radius-thumb)] w-full");
  const line = render(<Skeleton shape="line" />).container.firstElementChild!;
  expect(line.className).toContain("h-4 rounded-full");
});
