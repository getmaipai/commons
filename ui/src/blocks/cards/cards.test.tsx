import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test } from "bun:test";
import { StatusPill } from "@/kit/blocks/cards/StatusPill";
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
