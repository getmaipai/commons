// VIDEO-STUDIO-02 (K1, K1b): the studio token scope and the page surface that carries it.
// Contrast: text, muted text and the primary pill label clear 4.5 on every studio surface; the slider fill and the focus ring clear 3
// against the card and the slider track; the dark values are the Music app's. The scope sits on its own element, so no look can override it.
import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderWithQueryClient } from "../tests/renderWithQueryClient";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { PageNodeSchema } from "@/kit/schema/types";

afterEach(cleanup);

const css = readFileSync(resolve(import.meta.dir, "tokens.css"), "utf8");

/** The declaration blocks of one selector, in file order, text only. */
function blocks(selector: string): string[] {
  const out: string[] = [];
  let at = css.indexOf(`${selector} {`);
  while (at !== -1) {
    const end = css.indexOf("}", at);
    out.push(css.slice(at, end));
    at = css.indexOf(`${selector} {`, end);
  }
  return out;
}
const light = blocks('[data-surface="studio"]').find((b) => b.startsWith('[data-surface="studio"]'))!;
const dark = blocks('.dark [data-surface="studio"]')[0]!;
const systemDark = blocks(':root:not(.light):not(.dark) [data-surface="studio"]')[0]!;

function hex(block: string, name: string): string {
  const match = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6});`).exec(block);
  if (!match) throw new Error(`${name} not found`);
  return match[1]!.toLowerCase();
}
function lum(h: string): number {
  const c = [0, 1, 2].map((i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}
const ratio = (a: string, b: string) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi! + 0.05) / (lo! + 0.05); };

const SCOPES = [["light", light], ["dark", dark]] as const;
const SURFACES = ["--background", "--card", "--popover", "--muted", "--secondary", "--accent", "--surface-page", "--surface-card", "--surface-pane", "--surface-sidebar", "--surface-stage"];
const TEXT = [["--foreground", 4.5], ["--card-foreground", 4.5], ["--popover-foreground", 4.5], ["--secondary-foreground", 4.5], ["--accent-foreground", 4.5], ["--muted-foreground", 4.5]] as const;

describe("the studio token scope", () => {
  test("is written for light, the dark class and the device's dark, with the same dark values in both", () => {
    expect(light).toBeDefined();
    expect(dark).toBeDefined();
    expect(systemDark).toBeDefined();
    for (const name of [...SURFACES, "--primary", "--primary-foreground", "--ring", "--foreground", "--muted-foreground", "--border", "--input", "--kicker"]) {
      expect(hex(systemDark, name)).toBe(hex(dark, name));
      expect(hex(light, name)).toMatch(/^#/);
    }
  });

  test("dark carries the Music app's near-black steps and lime, not a look's navy", () => {
    // oklch(0.17 0.003 285) and its steps, lime oklch(0.9 0.2 125), as gamut-mapped hex (the values of Home's `music-surface`).
    expect(hex(dark, "--background")).toBe("#0f0f11");
    expect(hex(dark, "--card")).toBe("#18181a");
    expect(hex(dark, "--muted")).toBe("#242425");
    expect(hex(dark, "--accent")).toBe("#2e2e2f");
    expect(hex(dark, "--primary")).toBe("#c0f447");
    expect(hex(dark, "--ring")).toBe("#c0f447");
    expect(hex(dark, "--primary-foreground")).toBe(hex(dark, "--background"));
    expect(lum(hex(dark, "--surface-stage"))).toBeLessThan(lum(hex(dark, "--background")));
  });

  test("light is a grey page under white cards and a lime deeper than dark's", () => {
    expect(lum(hex(light, "--card"))).toBeGreaterThan(lum(hex(light, "--background")));
    expect(lum(hex(light, "--surface-stage"))).toBeLessThan(lum(hex(light, "--background")));
    expect(lum(hex(light, "--primary"))).toBeLessThan(lum(hex(dark, "--primary")));
  });

  for (const [theme, block] of SCOPES) {
    for (const [textName, floor] of TEXT) {
      test(`${theme}: ${textName} clears ${floor} on every studio surface`, () => {
        for (const surface of SURFACES) expect(ratio(hex(block, textName), hex(block, surface))).toBeGreaterThanOrEqual(floor);
      });
    }
    test(`${theme}: the primary pill label clears 4.5`, () => {
      expect(ratio(hex(block, "--primary-foreground"), hex(block, "--primary"))).toBeGreaterThanOrEqual(4.5);
    });
    test(`${theme}: the slider fill and the focus ring clear 3 against the card, the page and the slider track`, () => {
      for (const name of ["--primary", "--ring"]) {
        for (const against of ["--card", "--background", "--muted", "--secondary"]) expect(ratio(hex(block, name), hex(block, against))).toBeGreaterThanOrEqual(3);
      }
    });
    test(`${theme}: a card edge is not the card`, () => {
      expect(hex(block, "--border")).not.toBe(hex(block, "--card"));
    });
    test(`${theme}: the kicker (accent text) clears 4.5 on the card and the page`, () => {
      for (const against of ["--card", "--background"]) expect(ratio(hex(block, "--kicker"), hex(block, against))).toBeGreaterThanOrEqual(4.5);
    });
  }

  test("no look can change it: the scope is set on the element, and no look block names the scope", () => {
    expect(css).not.toMatch(/style-[a-z-]+[^{]*\[data-surface="studio"\]/);
    expect(css).not.toMatch(/data-look[^{]*\[data-surface="studio"\]\s*\{/);
  });
});

describe("page.surface: studio", () => {
  const body = [{ type: "empty_state" as const, icon: "film", text: "Nothing yet" }];
  const render = (surface?: "page" | "studio") =>
    renderWithQueryClient(<MemoryRouter><NodeRenderer node={PageNodeSchema.parse({ type: "page", id: "x", title: "X", ...(surface ? { surface } : {}), body })} /></MemoryRouter>);

  test("studio draws the body in one pane that carries the scope, rounded from lg and full bleed on a phone", () => {
    const { container } = render("studio");
    const pane = container.querySelector('[data-surface="studio"]') as HTMLElement;
    expect(pane).not.toBeNull();
    expect(pane.textContent).toContain("Nothing yet");
    expect(pane.className).toContain("lg:rounded-3xl");
    expect(pane.className).toContain("-mx-4");
    expect(pane.className).toContain("lg:mx-0");
  });

  test("the default and page draw no pane", () => {
    expect(render().container.querySelector("[data-surface]")).toBeNull();
    cleanup();
    expect(render("page").container.querySelector("[data-surface]")).toBeNull();
  });
});
