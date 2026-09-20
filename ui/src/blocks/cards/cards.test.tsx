import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, test } from "bun:test";
import { MemoryRouter } from "react-router-dom";
import { StatusPill } from "@/kit/blocks/cards/StatusPill";
import { TypeBadge } from "@/kit/blocks/cards/TypeBadge";
import { MetricCard } from "@/kit/blocks/cards/MetricCard";
import { ResourceRow } from "@/kit/blocks/cards/ResourceRow";
import { CategoryTile } from "@/kit/blocks/cards/CategoryTile";
import { ActionTile } from "@/kit/blocks/cards/ActionTile";
import { Sparkline } from "@/kit/blocks/cards/Sparkline";
import { hueTextColor, hueTintBackground } from "@/kit/utils";

afterEach(cleanup);

test("StatusPill shows the label and a dot only when the status carries one", () => {
  render(<StatusPill status="running" />);
  expect(document.body.textContent).toContain("Running");
  expect(document.querySelector("span > span[aria-hidden]")).toBeTruthy();
  cleanup();
  render(<StatusPill status="loading" />);
  expect(document.body.textContent).toContain("Loading");
  expect(document.querySelector("span > span[aria-hidden]")).toBeNull();
});

// Regression: StatusPill used to render with no background tint or text
// color at all (a plain bordered span), missing spec section 1's "tinted
// with the status color at 15 percent and text in the color" entirely -
// found while wiring the Apps page's pane header, before any real page
// rendered it. happy-dom's CSSStyleDeclaration doesn't parse color-mix()
// (a real browser does; this is the same style value MetricCard's state
// link already ships in ui-v0.3.1), so the border-class removal is the
// DOM-observable half of this regression here; the color math itself
// (the exact hue-text mix, against a 15%-tinted background, every named
// hue, both themes) is contrast.test.ts's job, not a rendered-string one.
test("StatusPill drops the old unstyled plain border for a hue-tinted pill", () => {
  render(<StatusPill status="warning" />);
  const pill = document.querySelector("span");
  expect(pill?.className).not.toContain("border");
  expect(pill?.style).toBeTruthy();
});

// A muted status (stopped/loading/disabled/unavailable - no real hue
// token) takes a different branch than the hue-tinted one above; happy-
// dom can render `var(--x)` (unlike `color-mix()`, checked live), so
// this is a real DOM assertion, not just "some style exists" - a review
// pointed out the muted branch had no coverage at all, only the hue one.
test("StatusPill's muted branch uses the kit's own muted surface pair, not a hue", () => {
  render(<StatusPill status="stopped" />);
  const pill = document.querySelector("span") as HTMLElement;
  expect(pill.style.backgroundColor).toBe("var(--muted)");
  expect(pill.style.color).toBe("var(--muted-foreground)");
});

test("hueTextColor mixes the named hue with --foreground at the kit's shared ratio", () => {
  expect(hueTextColor("--hue-orange")).toBe("color-mix(in srgb, var(--hue-orange) 50%, var(--foreground) 50%)");
});

test("hueTintBackground mixes the named hue with transparent at the kit's shared pill-tint ratio", () => {
  expect(hueTintBackground("--hue-orange")).toBe("color-mix(in srgb, var(--hue-orange) 15%, transparent)");
});

test("TypeBadge renders its label with no dot, unlike StatusPill", () => {
  render(<TypeBadge label="Plugin" hue="--hue-blue" />);
  expect(document.body.textContent).toBe("Plugin");
  expect(document.querySelector("span > span")).toBeNull();
});

test("MetricCard renders the count, label and a linked state", () => {
  render(<MemoryRouter><MetricCard icon="box" hue="--cat-models" count={38} label="Installed Components" state="2 updates available" stateHref="/settings/updates" /></MemoryRouter>);
  expect(document.body.textContent).toContain("38");
  expect(document.body.textContent).toContain("Installed Components");
  expect(document.querySelector('a[href="/settings/updates"]')?.textContent).toBe("2 updates available");
});

// Regression for the touch-target half of the bug contrast.test.ts's
// own "MetricCard state-link" block covers the color half of (a review
// caught this exact link at 79x17, under the 48px floor).
test("MetricCard's state link carries a touch-target extension", () => {
  render(<MemoryRouter><MetricCard icon="wrench" hue="--hue-orange" count={1} label="Repairs" state="View repairs" stateHref="/settings/repairs" /></MemoryRouter>);
  const link = document.querySelector('a[href="/settings/repairs"]');
  expect(link?.className).toContain("before:-inset-3");
});

test("Sparkline renders a polyline that skips null samples as gaps", () => {
  const points = [
    { at: "2026-09-20T00:00:00Z", value: 10 },
    { at: "2026-09-20T00:01:00Z", value: 12 },
    { at: "2026-09-20T00:02:00Z", value: null },
    { at: "2026-09-20T00:03:00Z", value: 18 },
    { at: "2026-09-20T00:04:00Z", value: 20 },
  ];
  render(<Sparkline points={points} hue="--primary" />);
  expect(document.querySelectorAll("polyline").length).toBe(2);
});

test("Sparkline with no samples announces that instead of drawing", () => {
  render(<Sparkline points={[{ at: "2026-09-20T00:00:00Z", value: null }]} hue="--primary" />);
  expect(document.querySelector("svg")).toBeNull();
  expect(document.body.textContent).toContain("No samples yet");
});

test("Sparkline with exactly one real sample draws a dot, not the empty state", () => {
  render(<Sparkline points={[{ at: "2026-09-20T00:00:00Z", value: 42 }]} hue="--primary" />);
  expect(document.querySelector("svg")).toBeTruthy();
  expect(document.querySelector("circle")).toBeTruthy();
  expect(document.body.textContent).not.toContain("No samples yet");
});

test("ResourceRow shows the percent, capacity label and a tooltip trigger", () => {
  const series = [{ at: "2026-09-20T00:00:00Z", value: 18 }];
  render(<ResourceRow icon="cpu" hue="--primary" label="CPU" percent={18} series={series} capacityLabel="4 of 16 cores" />);
  expect(document.body.textContent).toContain("18%");
  expect(document.body.textContent).toContain("4 of 16 cores");
});

test("CategoryTile links to the browse path with the installed count", () => {
  render(<MemoryRouter><CategoryTile icon="box" hue="--cat-models" label="Models" installedCount={12} browsePath="/models" /></MemoryRouter>);
  const link = document.querySelector('a[href="/models"]');
  expect(link?.textContent).toContain("Models");
  expect(link?.textContent).toContain("12 installed");
});

test("ActionTile fires onClick", () => {
  let clicked = false;
  render(<ActionTile icon="refresh-cw" label="Check for Updates" subtitle="Scan all components" onClick={() => { clicked = true; }} />);
  fireEvent.click(document.querySelector("button")!);
  expect(clicked).toBe(true);
});
