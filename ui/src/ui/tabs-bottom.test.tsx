import { render } from "@testing-library/react";
import { expect, test } from "bun:test";
import { Tabs, TabsList, TabsTrigger } from "./tabs";

test("bottom TabsList renders an additive full width variant", () => {
  const { container } = render(<Tabs defaultValue="home"><TabsList variant="bottom" aria-label="Main"><TabsTrigger value="home"><span>Home</span></TabsTrigger><TabsTrigger value="search">Search</TabsTrigger></TabsList></Tabs>);
  const list = container.querySelector('[data-slot="tabs-list"]')!;
  expect(list.getAttribute("data-variant")).toBe("bottom");
  expect(list.className).toContain("w-full");
  expect(list.className).toContain("pb-[env(safe-area-inset-bottom)]");
  expect(container.querySelector('[data-slot="tabs-trigger"]')?.className).toContain("min-h-12");
});

test("default TabsList classes remain unchanged", () => {
  const { container } = render(<Tabs defaultValue="home"><TabsList><TabsTrigger value="home">Home</TabsTrigger></TabsList></Tabs>);
  expect(container.querySelector('[data-slot="tabs-list"]')?.className).toContain("inline-flex w-fit");
  expect(container.querySelector('[data-slot="tabs-list"]')?.className).toContain("bg-muted");
});

test("sticky bottom tabs expose a sticky position marker", () => {
  const { container } = render(<Tabs defaultValue="home"><TabsList variant="bottom" position="sticky"><TabsTrigger value="home">Home</TabsTrigger></TabsList></Tabs>);
  expect(container.querySelector('[data-slot="tabs-list"]')?.getAttribute("data-position")).toBe("sticky");
});
