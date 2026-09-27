import { readFileSync } from "fs";
import { expect, test } from "bun:test";
import { collapsePanel } from "./surfaces";

// Jesse found this live (2026-09-27): every collapsible built on
// `collapsePanel` (ToolTimeline's "N tool calls", home's own Sources
// footer) opened and closed with no visible transition. Two real bugs:
// a `transition-[height]` reading a CSS variable Radix never actually
// changes (so nothing ever has two values to interpolate between - a
// live `transitionend` listener never fired), and a wrong variable name
// underneath that. The real fix is a CSS `animation` keyed on
// `data-state`, driving the `@keyframes collapsible-down`/
// `collapsible-up` this file's own `globals.css` already defines for
// exactly this. happy-dom (this test's own environment) doesn't run a
// real CSS engine against compiled Tailwind output, so the actual
// visual behavior can only be proven live in a browser (done, before
// and after this fix); what these tests can prove is that the class
// names the real animations, on the real data-state values, in a form
// that keeps its end state instead of snapping back mid-close.
test("collapsePanel animates on data-state, not a transition with nothing to interpolate", () => {
  expect(collapsePanel).not.toContain("transition-[height]");
  expect(collapsePanel).toContain("data-[state=open]:animate-[collapsible-down_");
  expect(collapsePanel).toContain("data-[state=closed]:animate-[collapsible-up_");
});

test("collapsePanel's closing animation keeps its end state (forwards), so it doesn't snap back to auto before Radix hides it", () => {
  expect(collapsePanel).toContain("collapsible-up_200ms_cubic-bezier(0.32,0.72,0,1)_forwards");
});

test("collapsePanel respects prefers-reduced-motion", () => {
  expect(collapsePanel).toContain("motion-reduce:animate-none");
});

// The two keyframes collapsePanel's classes reference by name have to
// actually exist, or the animation silently does nothing (a name typo
// here is exactly the kind of thing a browser never errors on).
test("the collapsible-down/collapsible-up keyframes collapsePanel references are real, in globals.css", () => {
  const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
  expect(css).toContain("@keyframes collapsible-down");
  expect(css).toContain("@keyframes collapsible-up");
});
