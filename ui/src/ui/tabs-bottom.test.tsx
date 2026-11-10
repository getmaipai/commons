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

test("the active bottom tab is a pill with no square outline, and the list stays keyboard reachable (KIT-QA-01)", () => {
  const { container } = render(<Tabs defaultValue="home"><TabsList variant="bottom" aria-label="Main"><TabsTrigger value="home">Home</TabsTrigger><TabsTrigger value="search">Search</TabsTrigger></TabsList></Tabs>);
  const trigger = container.querySelector('[data-slot="tabs-trigger"]')!;
  expect(trigger.className).toContain("group-data-[variant=bottom]/tabs-list:rounded-full");
  expect(trigger.className).not.toContain("group-data-[variant=bottom]/tabs-list:rounded-none");
  expect(trigger.className).toContain("group-data-[variant=bottom]/tabs-list:data-[state=active]:border-transparent");
  expect(trigger.className).toContain("dark:group-data-[variant=bottom]/tabs-list:data-[state=active]:border-transparent");
  expect(trigger.className).toContain("focus-visible:ring-[3px]");
  expect(trigger.getAttribute("role")).toBe("tab");
  expect(container.querySelectorAll('[role="tab"]').length).toBe(2);
});
