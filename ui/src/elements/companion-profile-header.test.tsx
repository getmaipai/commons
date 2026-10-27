import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { CompanionProfileHeader } from "@/kit/elements/companion-profile-header";

afterEach(cleanup);

describe("CompanionProfileHeader", () => {
  test("renders the name as the page heading", () => {
    const { getByRole } = render(<CompanionProfileHeader name="Marlow" />);
    expect(getByRole("heading", { level: 1, name: "Marlow" })).toBeTruthy();
  });

  test("renders optional slots and uses the requested portrait sizes", () => {
    const { getByText, getByRole, container } = render(<CompanionProfileHeader name="Marlow" eyebrow="Built-in companion" media={<span>Portrait</span>} chips={<span>Ready</span>} actions={<button>Chat</button>} back={<a href="/companions">Back</a>} />);
    expect(getByText("Built-in companion")).toBeTruthy();
    expect(getByText("Ready")).toBeTruthy();
    expect(getByRole("button", { name: "Chat" })).toBeTruthy();
    expect(getByRole("link", { name: "Back" })).toBeTruthy();
    expect(container.querySelector(".size-24.md\\:size-28")).toBeTruthy();
  });

  test("omits optional slots when they are absent", () => {
    const { container } = render(<CompanionProfileHeader name="Marlow" />);
    expect(container.querySelector(".size-24.md\\:size-28")).toBeNull();
    expect(container.querySelector("button, a")).toBeNull();
  });
});
