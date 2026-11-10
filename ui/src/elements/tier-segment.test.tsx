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
  test("dropdown shows concise level benefits and applies a choice", () => {
    const view = render(<TierSegment presentation="dropdown" value="standard" onValueChange={() => {}} label="Level" tiers={[{ id: "standard", label: "Standard", hint: "Sound · up to 10 seconds" }, { id: "boost", label: "Boost", hint: "Sharper · sound · up to 5 seconds" }]} />);
    const trigger = view.getByRole("combobox", { name: "Level: Standard" });
    expect(trigger.getAttribute("data-slot")).toBe("answer-style-select-trigger");
    expect(trigger.getAttribute("title")).toBe("Level: Standard");
  });
  test("compact density keeps the levels in the toolbar and drops the extra hint row", () => {
    const { getByRole, queryByText, container } = render(<TierSegment density="compact" value="standard" onValueChange={() => {}} tiers={[{ id: "standard", label: "Standard", hint: "Fast" }, { id: "boost", label: "Boost" }]} />);
    expect(getByRole("radio", { name: "Standard" }).className).toContain("sm:min-h-9");
    expect(container.querySelector('[data-slot="tier-segment"]')?.getAttribute("data-density")).toBe("compact");
    expect(queryByText("Fast")).toBeNull();
  });
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

describe("TierSegment presentation cards (VIDEO-UI-12)", () => {
  const level: TierOptionDef[] = [
    { id: "standard", label: "Standard", hint: "Fast, with sound" },
    { id: "boost", label: "Boost", hint: "Sharper picture" },
    { id: "max", label: "Max", hint: "Best", disabledReason: "Not set up on this home yet" },
  ];
  const details = { standard: "Under a minute", boost: "About a minute", max: "Long" };
  test("one card per level: label, promise and time; a disabled level shows its reason and no time", () => {
    const { getAllByRole, getByText, queryByText } = render(<TierSegment presentation="cards" details={details} value="standard" onValueChange={() => {}} tiers={level} />);
    const radios = getAllByRole("radio");
    expect(radios.length).toBe(3);
    expect(radios[0]!.getAttribute("aria-checked")).toBe("true");
    expect(getByText("Fast, with sound")).toBeTruthy();
    expect(getByText("Under a minute")).toBeTruthy();
    expect(getByText("About a minute")).toBeTruthy();
    expect(getByText("Not set up on this home yet")).toBeTruthy();
    expect(queryByText("Best")).toBeNull();
    expect(queryByText("Long")).toBeNull();
    expect(radios[2]!.getAttribute("aria-disabled")).toBe("true");
  });
  test("a card picks like the segment: plain at once, disabled never, keyboard Enter and Space work on the focused card", () => {
    const picked: string[] = [];
    const { getAllByRole } = render(<TierSegment presentation="cards" value="standard" onValueChange={(t) => picked.push(t)} tiers={level} />);
    const radios = getAllByRole("radio");
    fireEvent.click(radios[2]!);
    expect(picked).toEqual([]);
    fireEvent.click(radios[1]!);
    expect(picked).toEqual(["boost"]);
    expect(radios[0]!.tagName).toBe("BUTTON");
  });
  test("a level with a confirm line still asks once, in cards", () => {
    const picked: string[] = [];
    const { getAllByRole, getByRole } = render(<TierSegment presentation="cards" value="standard" onValueChange={(t) => picked.push(t)} tiers={[{ id: "standard", label: "Standard" }, { id: "max", label: "Max", confirm: "Max takes the computer. Continue?" }]} />);
    fireEvent.click(getAllByRole("radio")[1]!);
    expect(picked).toEqual([]);
    fireEvent.click(getByRole("button", { name: "Continue" }));
    expect(picked).toEqual(["max"]);
  });
  test("the default presentation is the unchanged segment", () => {
    const { container } = render(<TierSegment value="standard" onValueChange={() => {}} tiers={level} details={details} />);
    expect(container.querySelector('[data-presentation="cards"]')).toBeNull();
    expect(container.querySelector('[data-slot="tier-card-time"]')).toBeNull();
  });
});
