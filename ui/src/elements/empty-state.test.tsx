import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { EmptyStateGreeting, EmptyStateSuggestion } from "./empty-state";

afterEach(cleanup);

describe("EmptyStateGreeting", () => {
  test("defaults to the default size", () => {
    const { getByRole } = render(<EmptyStateGreeting>Hello</EmptyStateGreeting>);
    const greeting = getByRole("heading", { name: "Hello" });
    expect(greeting.className).toContain("text-2xl");
    expect(greeting).toHaveAttribute("data-size", "default");
  });

  test("supports the large size", () => {
    const { getByRole } = render(<EmptyStateGreeting size="lg">Hello</EmptyStateGreeting>);
    const greeting = getByRole("heading", { name: "Hello" });
    expect(greeting.className).toContain("text-3xl");
    expect(greeting.className).not.toContain("text-2xl");
  });
});

describe("EmptyStateSuggestion", () => {
  test("keeps a 48px touch target around the 36px chip through a pseudo-element", () => {
    const { getByRole } = render(<EmptyStateSuggestion>Plan a week of dinners</EmptyStateSuggestion>);
    const chip = getByRole("button", { name: "Plan a week of dinners" });
    expect(chip.className).toContain("before:-inset-y-1.5");
    expect(chip.className).toContain("relative");
  });
});
