import { expect, test } from "bun:test";
import { getIcon, iconNames, icons } from "@/kit/icons";

test("the Network and access area icon resolves from the kit registry", () => {
  expect(iconNames).toContain("network");
  expect(getIcon("network")).toBe(icons.network);
});

test("equalizer icon is registered for the visualizer menu", () => {
  expect(getIcon("equalizer")).toBe(icons.equalizer);
  expect(iconNames).toContain("equalizer");
});

test("the weather advice icons are registered", () => {
  for (const name of ["umbrella", "shirt", "glasses", "snowflake", "wind", "footprints", "tree-pine", "cloud-rain", "sun"]) expect((iconNames as readonly string[]).includes(name)).toBe(true);
});
