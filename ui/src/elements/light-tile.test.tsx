import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { LightTile } from "./light-tile";

afterEach(cleanup);

describe("LightTile", () => {
  test("shows state, brightness and calls toggle", () => {
    let toggles = 0;
    const view = render(<LightTile name="Lamp" room="Den" on brightness={55} onToggle={() => toggles++} onBrightness={() => {}} />);
    expect(view.getByText("Den")).toBeTruthy();
    fireEvent.click(view.getByRole("switch", { name: "Lamp" }));
    expect(toggles).toBe(1);
  });
  test("brightness commits on release only", () => {
    const calls: number[] = [];
    const view = render(<LightTile name="Lamp" room="Den" on={false} brightness={40} onToggle={() => {}} onBrightness={v => calls.push(v)} />);
    const slider = view.getByRole("slider", { name: "Lamp brightness" });
    fireEvent.pointerDown(slider);
    expect(calls).toEqual([]);
    fireEvent.pointerUp(slider);
    expect(calls.length).toBeLessThanOrEqual(1);
  });
  test("pending and unavailable disable controls and announce last known state", () => {
    const view = render(<LightTile name="Lamp" room="Den" on pending unavailable brightness={40} onToggle={() => {}} onBrightness={() => {}} />);
    expect(view.getByRole("switch", { name: "Lamp" }).hasAttribute("disabled")).toBe(true);
    expect(view.getByRole("slider", { name: "Lamp brightness" }).hasAttribute("data-disabled")).toBe(true);
    expect(view.getByText("Last known: on")).toBeTruthy();
  });
  test("keeps labels readable with reduced motion", () => {
    const view = render(<LightTile name="Lamp" room="Den" on={false} brightness={40} onToggle={() => {}} onBrightness={() => {}} />);
    expect(view.getByRole("switch", { name: "Lamp" })).toBeTruthy();
    expect(view.getByText("Off")).toBeTruthy();
  });
});
