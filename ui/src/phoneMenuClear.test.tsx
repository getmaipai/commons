import { afterEach, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import FullLayout from "./dashboard/layouts/full/FullLayout";
import { TooltipProvider } from "./dashboard/components/ui/tooltip";
import { useHeaderExtra } from "./dashboard/layouts/full/vertical/header/HeaderExtraContext";

// jsdom does no layout, so the start-edge clearance is asserted on the
// mechanism: the workspace flag FullLayout sets exactly while the button is
// drawn, and the tokens.css rules plus the 72px token measured against the
// button's own geometry in MobileNavDrawer (48px at an 8px inset).
const original = window.matchMedia;
afterEach(() => { cleanup(); window.matchMedia = original; });
function media(width: number) {
  window.matchMedia = ((query: string) => ({ matches: query.includes("max-width: 639.98px") ? width < 640 : false, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
}
function Title() { return <span>Library</span>; }
function Titled() { useHeaderExtra(Title); return <h1>Library</h1>; }
function Bare() { return <div role="tablist">Own top row</div>; }
function shell(hideMobileMenu = false, page = <Titled />) {
  return render(<MemoryRouter><TooltipProvider><Routes><Route element={<FullLayout rail hideMobileMenu={hideMobileMenu} />}><Route path="*" element={page} /></Route></Routes></TooltipProvider></MemoryRouter>);
}
const flag = (v: ReturnType<typeof shell>) => v.container.querySelector('[data-slot="rail-workspace"]')!.hasAttribute("data-phone-menu");

for (const width of [360, 390, 402]) test(`phone ${width}: workspace reserves room for the menu button`, () => {
  media(width);
  const view = shell();
  expect(view.getByRole("button", { name: "Open menu" })).toBeTruthy();
  expect(flag(view)).toBe(true);
  expect(view.container.querySelector('[data-slot="rail-page-header"]')).toBeTruthy();
});
for (const width of [360, 390, 402]) test(`phone ${width}: a page that sets no header still gets the band, before its own top row`, () => {
  media(width);
  const view = shell(false, <Bare />);
  const header = view.container.querySelector('[data-slot="rail-page-header"]')!;
  const row = view.getByRole("tablist");
  expect(header).toBeTruthy();
  expect(header.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
test("no band on desktop or immersive when the page sets no header", () => {
  media(1440);
  expect(shell(false, <Bare />).container.querySelector('[data-slot="rail-page-header"]')).toBeNull();
  cleanup(); media(390);
  expect(shell(true, <Bare />).container.querySelector('[data-slot="rail-page-header"]')).toBeNull();
});
for (const width of [744, 1440]) test(`desktop ${width}: no reserved room`, () => {
  media(width);
  expect(flag(shell())).toBe(false);
});
test("immersive phone (menu hidden): no reserved room", () => {
  media(390);
  expect(flag(shell(true))).toBe(false);
});
test("tokens.css: band holds the 48px button and header content starts past its end edge", () => {
  const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
  const num = (name: string) => Number(new RegExp(`${name}:\\s*(\\d+)px`).exec(css)?.[1]);
  const drawer = readFileSync(new URL("./dashboard/layouts/full/vertical/rail/MobileNavDrawer.tsx", import.meta.url), "utf8");
  expect(drawer).toContain("size-12");
  expect(drawer).toContain("+ 8px)\" }}");
  const buttonEnd = 8 + 48;
  expect(num("--phone-menu-clear")).toBeGreaterThanOrEqual(buttonEnd + 8);
  expect(num("--phone-menu-band")).toBeGreaterThanOrEqual(buttonEnd + 8);
  expect(css).toMatch(/\[data-phone-menu\] \[data-slot="rail-page-header"\] \{\s*min-height: var\(--phone-menu-band\);\s*padding-inline-start: var\(--phone-menu-clear\)/);
  // Must stay outside the generated ease block (ease-tokens parity test).
  expect(css.indexOf("--phone-menu-clear")).toBeLessThan(css.indexOf("EASE-GENERATED:BEGIN"));
});
