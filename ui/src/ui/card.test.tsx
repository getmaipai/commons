import { afterEach, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { Card } from "./card";

afterEach(cleanup);

test("Card default classes stay unchanged; flat adds its token surface", () => {
  const baseline = render(<Card />).container.firstElementChild!;
  expect(baseline.className).toBe("surface-card flex flex-col gap-6 py-6 text-card-foreground");
  const flat = render(<Card surface="flat" />).container.firstElementChild!;
  expect(flat.className).toContain("bg-[var(--surface-1)]");
  expect(flat.className).toContain("rounded-[var(--radius-card)]");
  expect(flat.className).toContain("p-4");
  expect(flat.className).toContain("shadow-none");
  expect(flat.className).not.toContain("border ");
});
