import { expect, test } from "bun:test";
import { collapsePanel } from "./surfaces";

// Jesse found this live (2026-09-27): every collapsible built on
// `collapsePanel` (ToolTimeline's "N tool calls", home's own Sources
// footer) opened and closed with no visible transition - the class
// referenced `--collapsible-panel-height`, a variable nothing ever
// sets; Radix's own Collapsible sets `--radix-collapsible-content-height`
// on the content element instead (confirmed live: the element's own
// inline style carries that exact name, never the other one). An
// undefined custom property with no fallback resolves to the property's
// own initial value (`auto` for height), which can't animate regardless
// of the `transition-[height]` declared alongside it - happy-dom (this
// test's own environment) doesn't run a real CSS engine against compiled
// Tailwind output, so the actual computed-height behavior can only be
// proven live in a browser (done, before this fix, and again after); what
// this test can prove, and the thing a fat-fingered variable name breaks
// first, is that the class references the variable Radix genuinely sets,
// not a name nothing does.
test("collapsePanel's height reads Radix's own content-height variable, not an unset one", () => {
  expect(collapsePanel).toContain("--radix-collapsible-content-height");
});

// The fallback chain's second link, the class's own pre-existing manual
// escape hatch (a caller managing the height itself without Radix) -
// kept, not dropped, by this fix.
test("collapsePanel keeps its manual --collapsible-panel-height fallback", () => {
  expect(collapsePanel).toContain("--collapsible-panel-height");
});
