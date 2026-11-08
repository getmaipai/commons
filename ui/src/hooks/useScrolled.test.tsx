import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { useScrolled } from "./useScrolled";

afterEach(cleanup);

describe("useScrolled", () => {
  test("uses the threshold and updates on scroll", () => {
    function Probe() { return <span>{useScrolled(8) ? "scrolled" : "top"}</span>; }
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    const view = render(<Probe />);
    expect(view.getByText("top")).toBeTruthy();
    Object.defineProperty(window, "scrollY", { configurable: true, value: 9 });
    fireEvent.scroll(window);
    expect(view.getByText("scrolled")).toBeTruthy();
  });
});
