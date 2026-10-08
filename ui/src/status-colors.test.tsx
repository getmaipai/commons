import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "./dashboard/components/ui/tooltip";
import { TooltipProvider as KitTooltipProvider } from "@/kit/ui/tooltip";
import AppRail from "./dashboard/layouts/full/vertical/rail/AppRail";
import RailProfileMenu, { type RailStatusLevel } from "./dashboard/layouts/full/vertical/rail/RailProfileMenu";
import { Status, StatusIndicator } from "@/kit/ui/status";
import { UptimeStrip } from "@/kit/ui/uptime-strip";

afterEach(cleanup);

// STATUS-COLORS-01: one status palette. Four tokens, one literal per theme,
// and every status surface draws from them (no raw palette, --hue-* or
// --destructive on a status dot).
const css = readFileSync(resolve(import.meta.dir, "tokens.css"), "utf8");
const TOKENS = ["--status-ok", "--status-warning", "--status-error", "--status-unknown"] as const;
const RAW = /(emerald|amber|sky|red|green|yellow|orange)-\d{3}|--hue-|--destructive|--tint-attention|\bbg-destructive\b/;

function lum(hex: string): number {
  const c = (i: number) => { const v = parseInt(hex.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * c(1) + 0.7152 * c(3) + 0.0722 * c(5);
}
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };
const read = (block: string, name: string) => new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6});`).exec(block)?.[1];

const mobile = css.indexOf("@media (max-width: 639px)");
const light = css.slice(css.lastIndexOf(":root {", mobile), mobile);
const dark = css.slice(css.indexOf(".dark {"));

describe("status tokens", () => {
  for (const [name, block] of [["light", light], ["dark", dark]] as const) {
    test(`${name} theme defines all four status tokens as literals that clear 3:1 on page and card`, () => {
      const page = read(block, "--surface-page")!;
      const card = read(block, "--surface-card")!;
      for (const token of TOKENS) {
        const value = read(block, token);
        expect(value, `${token} in ${name}`).toBeTruthy();
        expect(ratio(value!, page), `${token} on page`).toBeGreaterThanOrEqual(3);
        expect(ratio(value!, card), `${token} on card`).toBeGreaterThanOrEqual(3);
      }
    });
  }
});

describe("status surfaces read the tokens", () => {
  test("Status and StatusIndicator dots use --status-* for every state", () => {
    for (const [state, token] of [["online", "ok"], ["offline", "error"], ["degraded", "warning"]] as const) {
      const { container } = render(<Status status={state}><StatusIndicator status={state} /></Status>);
      const html = container.innerHTML;
      expect(html).toContain(`--status-${token}`);
      expect(html).not.toMatch(RAW);
      cleanup();
    }
  });

  test("the group-form indicator (no status prop) uses --status-* too", () => {
    const { container } = render(<Status status="online"><StatusIndicator /></Status>);
    expect(container.innerHTML).toContain("--status-ok");
    expect(container.innerHTML).toContain("--status-error");
    expect(container.innerHTML).toContain("--status-warning");
    expect(container.innerHTML).not.toMatch(RAW);
  });

  test("UptimeStrip cells use --status-* for up, degraded and down", () => {
    const { container } = render(
      <KitTooltipProvider>
        <UptimeStrip data={[{ status: "up", label: "a" }, { status: "degraded", label: "b" }, { status: "down", label: "c" }]} />
      </KitTooltipProvider>,
    );
    const html = container.innerHTML;
    for (const token of ["ok", "warning", "error"]) expect(html).toContain(`--status-${token}`);
    expect(html).not.toMatch(RAW);
  });

  test.each([
    ["degraded", "warning"],
    ["offline", "error"],
  ] as [RailStatusLevel, string][])("the profile LED for %s uses --status-%s", (level, token) => {
    const { container } = render(
      <MemoryRouter>
        <TooltipProvider>
          <RailProfileMenu displayName="Sage Willow" subtitle="Owner" notifications={{ count: 0, onOpen: () => {} }} status={{ label: "x", level, href: "/status" }} incognito={{ on: false, onChange: () => {} }} helpHref="/help" onLogout={() => {}} />
        </TooltipProvider>
      </MemoryRouter>,
    );
    const dot = container.querySelector("[data-slot='rail-profile-dot']");
    expect(dot?.className).toContain(`--status-${token}`);
    expect(dot?.className).not.toMatch(RAW);
  });

  test.each([
    [undefined, "warning"],
    ["online", "ok"],
    ["offline", "error"],
  ] as [RailStatusLevel | undefined, string][])("the rail Chat LED for level %p uses --status-%s", (level, token) => {
    const { container } = render(
      <MemoryRouter>
        <TooltipProvider>
          <AppRail itemStatus={(item) => (item.name === "Chat" ? { title: "t", ariaLabel: "a", level } : undefined)} />
        </TooltipProvider>
      </MemoryRouter>,
    );
    const mark = container.querySelector("[data-slot='rail-status-mark']");
    expect(mark).toBeTruthy();
    expect(mark!.className).toContain(`--status-${token}`);
    expect(mark!.className).not.toMatch(RAW);
  });
});
