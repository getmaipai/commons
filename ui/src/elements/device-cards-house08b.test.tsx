import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { FanTile } from "./fan-tile";
import { CoverTile } from "./cover-tile";
import { ClimateTile } from "./climate-tile";
import { RoomHeader } from "./room-header";
import { LockTile } from "./lock-tile";
import { SwitchTile } from "./switch-tile";

afterEach(cleanup);

describe("FanTile", () => {
  test("toggles, and spins only while on with a motion-reduce fallback", () => {
    let n = 0;
    const v = render(<FanTile name="Fan" room="Den" on percentage={80} onToggle={() => n++} onPercentage={() => {}} />);
    fireEvent.click(v.getByRole("switch", { name: "Fan" }));
    expect(n).toBe(1);
    const icon = v.container.querySelector("[data-slot=fan-icon]")!;
    expect(icon.getAttribute("class")).toContain("animate-spin");
    expect(icon.getAttribute("class")).toContain("motion-reduce:animate-none");
    expect(v.getByText(/80%/)).toBeTruthy();
  });
  test("off fan does not spin, speed slider is disabled", () => {
    const v = render(<FanTile name="Fan" room="Den" on={false} percentage={0} onToggle={() => {}} onPercentage={() => {}} />);
    expect(v.container.querySelector("[data-slot=fan-icon]")!.getAttribute("class")).not.toContain("animate-spin");
    expect(v.getByRole("slider", { name: "Fan speed" }).hasAttribute("data-disabled")).toBe(true);
  });
  test("unavailable labels the last known state and disables the switch", () => {
    const v = render(<FanTile name="Fan" room="Den" on unavailable percentage={50} onToggle={() => {}} onPercentage={() => {}} />);
    expect(v.getByText(/Last known: on/)).toBeTruthy();
    expect(v.getByRole("switch", { name: "Fan" }).hasAttribute("disabled")).toBe(true);
  });
});

describe("CoverTile", () => {
  test("fill follows position and buttons call back", () => {
    const calls: string[] = [];
    const v = render(<CoverTile name="Blind" room="Den" position={40} onOpen={() => calls.push("open")} onStop={() => calls.push("stop")} onClose={() => calls.push("close")} />);
    expect((v.container.querySelector("[data-slot=cover-fill]") as HTMLElement).style.transform).toBe("scaleY(0.6)");
    fireEvent.click(v.getByRole("button", { name: "Open Blind" }));
    fireEvent.click(v.getByRole("button", { name: "Stop Blind" }));
    fireEvent.click(v.getByRole("button", { name: "Close Blind" }));
    expect(calls).toEqual(["open", "stop", "close"]);
    expect(v.getByText("Open 40%")).toBeTruthy();
  });
  test("closed disables Close; pending disables movement but unavailable-free Stop stays", () => {
    const v = render(<CoverTile name="Blind" room="Den" position={0} pending onOpen={() => {}} onStop={() => {}} onClose={() => {}} />);
    expect(v.getByRole("button", { name: "Close Blind" }).hasAttribute("disabled")).toBe(true);
    expect(v.getByRole("button", { name: "Open Blind" }).hasAttribute("disabled")).toBe(true);
    expect(v.getByRole("button", { name: "Stop Blind" }).hasAttribute("disabled")).toBe(false);
  });
});

describe("ClimateTile", () => {
  test("plus and minus send a clamped step", () => {
    const sent: number[] = [];
    const v = render(<ClimateTile name="Heat" room="Den" mode="heat" current={19} target={21} min={16} max={22} onTarget={x => sent.push(x)} />);
    fireEvent.click(v.getByRole("button", { name: "Raise Heat" }));
    fireEvent.click(v.getByRole("button", { name: "Lower Heat" }));
    expect(sent).toEqual([21.5, 20.5]);
  });
  test("at the limit the button is disabled; thumb rotates; glow uses a token", () => {
    const v = render(<ClimateTile name="Heat" room="Den" mode="cool" current={25} target={30} min={10} max={30} onTarget={() => {}} />);
    expect(v.getByRole("button", { name: "Raise Heat" }).hasAttribute("disabled")).toBe(true);
    expect((v.container.querySelector("[data-slot=climate-thumb]") as HTMLElement).style.transform).toBe("rotate(135deg)");
    expect(v.container.querySelector("[data-slot=climate-glow]")!.getAttribute("class")).toContain("bg-chart-2");
  });
  test("off mode hides the glow", () => {
    const v = render(<ClimateTile name="Heat" room="Den" mode="off" current={20} target={20} min={10} max={30} onTarget={() => {}} />);
    expect(v.container.querySelector("[data-slot=climate-glow]")!.getAttribute("class")).toContain("opacity-0");
  });
});

describe("RoomHeader", () => {
  test("shows the counter, toggles all, renders children", () => {
    const seen: boolean[] = [];
    const v = render(<RoomHeader name="Kitchen" onCount={3} total={5} onToggleAll={x => seen.push(x)}><p>tile</p></RoomHeader>);
    expect(v.getByText("3 of 5 on")).toBeTruthy();
    expect(v.getByText("tile")).toBeTruthy();
    fireEvent.click(v.getByRole("switch", { name: "All of Kitchen" }));
    expect(seen).toEqual([false]);
  });
  test("all off turns everything on; empty room is disabled", () => {
    const seen: boolean[] = [];
    const v = render(<RoomHeader name="Kitchen" onCount={0} total={2} onToggleAll={x => seen.push(x)} />);
    fireEvent.click(v.getByRole("switch", { name: "All of Kitchen" }));
    expect(seen).toEqual([true]);
    cleanup();
    const e = render(<RoomHeader name="Attic" onCount={0} total={0} onToggleAll={() => {}} />);
    expect(e.getByRole("switch", { name: "All of Attic" }).hasAttribute("disabled")).toBe(true);
  });
});

describe("pending ring and hold fill", () => {
  test("SwitchTile pending shows a pulsing ring that stops for reduced motion", () => {
    const v = render(<SwitchTile name="Plug" room="Den" on pending onToggle={() => {}} />);
    const ring = v.container.querySelector("[data-slot=pending-ring]")!;
    expect(ring.getAttribute("class")).toContain("animate-pulse");
    expect(ring.getAttribute("class")).toContain("motion-reduce:animate-none");
  });
  test("LockTile hold fill grows while pressed and resets on release without confirming", () => {
    let n = 0;
    const v = render(<LockTile name="Door" room="Entry" locked onConfirm={() => n++} />);
    const hold = v.getByRole("button", { name: "Hold to unlock Door" });
    const fill = () => (v.container.querySelector("[data-slot=hold-fill]") as HTMLElement).style.transform;
    expect(fill()).toBe("scaleX(0)");
    fireEvent.pointerDown(hold);
    expect(fill()).toBe("scaleX(1)");
    fireEvent.pointerUp(hold);
    expect(fill()).toBe("scaleX(0)");
    expect(n).toBe(0);
  });
});
