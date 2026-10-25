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
});
