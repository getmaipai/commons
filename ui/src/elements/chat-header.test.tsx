import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { ChatHeader } from "@/kit/elements/chat-header";

afterEach(cleanup);

describe("ChatHeader", () => {
  test("labels the character and controls and calls their handlers", () => {
    let menus = 0;
    let calls = 0;
    const { getByRole, getByText } = render(<ChatHeader name="Marlow" media={<span>portrait</span>} onMenu={() => menus++} onCall={() => calls++} />);
    expect(getByText("Marlow")).toBeTruthy();
    expect(getByText("portrait")).toBeTruthy();
    fireEvent.click(getByRole("button", { name: "Open menu" }));
    fireEvent.click(getByRole("button", { name: "Call Marlow" }));
    expect(menus).toBe(1);
    expect(calls).toBe(1);
  });

  test("hides menu and call controls when handlers are absent", () => {
    const { queryByRole } = render(<ChatHeader name="Marlow" media={<span />} />);
    expect(queryByRole("button", { name: "Open menu" })).toBeNull();
    expect(queryByRole("button", { name: "Call Marlow" })).toBeNull();
  });

  test("renders actions immediately left of the call button", () => {
    const { getByRole, getByText } = render(<ChatHeader name="Marlow" media={<span />} onCall={() => {}} actions={<button type="button">More</button>} />);
    const more = getByText("More");
    const call = getByRole("button", { name: "Call Marlow" });
    expect(more.nextElementSibling).toBe(call);
  });

  test("renders actions without a call button", () => {
    const { getByText, queryByRole } = render(<ChatHeader name="Marlow" media={<span />} actions={<button type="button">More</button>} />);
    expect(getByText("More")).toBeTruthy();
    expect(queryByRole("button", { name: "Call Marlow" })).toBeNull();
  });

  test("forwards menuExpanded and menuControls to the menu button", () => {
    const { getByRole } = render(<ChatHeader name="Marlow" media={<span />} onMenu={() => {}} menuExpanded menuControls="side-nav" />);
    const menu = getByRole("button", { name: "Open menu" });
    expect(menu.getAttribute("aria-expanded")).toBe("true");
    expect(menu.getAttribute("aria-controls")).toBe("side-nav");
  });

  test("leaves aria-expanded and aria-controls off when not given", () => {
    const { getByRole } = render(<ChatHeader name="Marlow" media={<span />} onMenu={() => {}} />);
    const menu = getByRole("button", { name: "Open menu" });
    expect(menu.hasAttribute("aria-expanded")).toBe(false);
    expect(menu.hasAttribute("aria-controls")).toBe(false);
  });
});
