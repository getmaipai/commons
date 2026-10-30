import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { TierChip, TierSegment, type TierOptionDef } from "./tier-segment";

afterEach(cleanup);

const tiers: TierOptionDef[] = [
  { id: "standard", label: "Standard", hint: "Fast" },
  { id: "boost", label: "Boost", hint: "More detail" },
  { id: "max", label: "Max", confirm: "Max takes the computer. Big jobs wait. Continue?" },
];

describe("TierSegment", () => {
  test("draws only the tiers it is given and keeps a 48 px touch target", () => {
    const { getAllByRole } = render(<TierSegment value="standard" onValueChange={() => {}} tiers={tiers.slice(0, 2)} />);
    const radios = getAllByRole("radio");
    expect(radios.map((r) => r.textContent)).toEqual(["Standard", "Boost"]);
    expect(radios[0]!.className).toContain("min-h-[48px]");
  });

  test("a plain tier applies at once and shows its hint", () => {
    const picked: string[] = [];
    const { getByText, rerender } = render(<TierSegment value="standard" onValueChange={(t) => picked.push(t)} tiers={tiers} />);
    expect(getByText("Fast")).toBeTruthy();
    fireEvent.click(getByText("Boost"));
    expect(picked).toEqual(["boost"]);
    rerender(<TierSegment value="boost" onValueChange={() => {}} tiers={tiers} />);
    expect(getByText("More detail")).toBeTruthy();
  });

  test("Max asks once: nothing applies until Continue, and Cancel drops it", () => {
    const picked: string[] = [];
    const { getByText, queryByText } = render(<TierSegment value="standard" onValueChange={(t) => picked.push(t)} tiers={tiers} />);
    fireEvent.click(getByText("Max"));
    expect(getByText("Max takes the computer. Big jobs wait. Continue?")).toBeTruthy();
    expect(picked).toEqual([]);
    fireEvent.click(getByText("Cancel"));
    expect(queryByText("Max takes the computer. Big jobs wait. Continue?")).toBeNull();
    fireEvent.click(getByText("Max"));
    fireEvent.click(getByText("Continue"));
    expect(picked).toEqual(["max"]);
  });

  test("a tier with a reason cannot be picked", () => {
    const picked: string[] = [];
    const { getByText } = render(<TierSegment value="standard" onValueChange={(t) => picked.push(t)} tiers={[tiers[0]!, { id: "boost", label: "Boost", disabledReason: "Not installed" }]} />);
    fireEvent.click(getByText("Boost"));
    expect(picked).toEqual([]);
  });
});

describe("TierChip", () => {
  test("Standard draws nothing, Boost is a label, a held Max is a release button", () => {
    expect(render(<TierChip tier="standard" />).container.innerHTML).toBe("");
    cleanup();
    expect(render(<TierChip tier="boost" />).getByText("Boost").tagName).toBe("SPAN");
    cleanup();
    let released = 0;
    const { getByRole } = render(<TierChip tier="max" onRelease={() => { released += 1; }} />);
    fireEvent.click(getByRole("button"));
    expect(released).toBe(1);
  });
});
