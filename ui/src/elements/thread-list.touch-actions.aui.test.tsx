import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

// A touch screen has no hover, so Tailwind's hover variant never matches there: the "..." menu of a
// project row and of every chat must be shown without hover on a device with no hover.
const list = readFileSync(new URL("./thread-list.aui.tsx", import.meta.url), "utf8");

describe("row actions stay reachable without hover", () => {
  const triggers = list.split("\n").filter((line) => line.includes('data-slot="aui_thread-list-project-more"') || line.includes('data-slot="aui_thread-list-item-more"') || line.includes("opacity-0 group-hover:opacity-100"));

  test("the project row and the chat row each have a hidden-until-hover menu button", () => {
    expect(triggers.length).toBeGreaterThanOrEqual(2);
  });

  test.each(["project", "item"])("the %s menu button is visible when the device has no hover", (kind) => {
    const index = list.indexOf(`data-slot="aui_thread-list-${kind}-more"`);
    expect(index).toBeGreaterThan(0);
    const button = list.slice(index, index + 700);
    expect(button).toContain("[@media(hover:none)]:opacity-100");
  });

  test("the row title leaves room for the button on a device with no hover", () => {
    expect(list).toContain("[@media(hover:none)]:pe-9");
  });
});
