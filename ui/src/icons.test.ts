import { expect, test } from "bun:test";
import { getIcon, iconNames, icons } from "@/kit/icons";

test("the Network and access area icon resolves from the kit registry", () => {
  expect(iconNames).toContain("network");
  expect(getIcon("network")).toBe(icons.network);
});
