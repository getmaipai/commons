import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { CompanionCard } from "@/kit/elements/companion-card";

afterEach(cleanup);

describe("CompanionCard", () => {
  test("renders its name as a level two heading by default and supports level three", () => {
    const { getByRole, rerender } = render(<CompanionCard name="Marlow" />);
    expect(getByRole("heading", { level: 2, name: "Marlow" })).toBeTruthy();
    rerender(<CompanionCard name="Marlow" headingLevel={3} />);
    expect(getByRole("heading", { level: 3, name: "Marlow" })).toBeTruthy();
  });

  test("renders optional slots and uses the requested portrait sizes", () => {
    const { getByText, container } = render(<CompanionCard name="Marlow" media={<span>Portrait</span>} status="Ready" menu={<button>Menu</button>} meta="Last active today" actions={<button>Chat</button>} />);
    expect(getByText("Ready")).toBeTruthy();
    expect(getByText("Menu")).toBeTruthy();
    expect(getByText("Last active today")).toBeTruthy();
    expect(getByText("Chat")).toBeTruthy();
    expect(container.querySelector(".size-16.md\\:size-18")).toBeTruthy();
  });

  test("omits optional slots when they are absent", () => {
    const { container } = render(<CompanionCard name="Marlow" />);
    expect(container.querySelector('[data-slot="badge"]')).toBeNull();
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector("[class*=size-16]")).toBeNull();
  });
});
