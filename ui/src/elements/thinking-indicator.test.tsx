// Firefox has no `-webkit-mask-clip: text`, so tw-shimmer's own
// `@supports` gate falls back to plain `background-clip: text` there -
// that background only paints 100% of the label's own box height, and
// `leading-none` (line-height: 1) left no room in that box for a
// descender (g/p/y) to paint into, so Firefox rendered "Sizing this
// up…" with its own "g" missing (reported live, reproduced only in
// Firefox; jsdom can't render the shimmer paint itself, so this guards
// the one lever that controls it: the label never goes back to a
// line-height too tight to hold a descender).
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { ThinkingIndicator } from "./thinking-indicator";

afterEach(cleanup);

describe("ThinkingIndicator", () => {
  test("the label never reverts to a line-height too tight for a descender", () => {
    const { getByText } = render(<ThinkingIndicator label="Sizing this up…" />);
    const label = getByText("Sizing this up…");
    expect(label.className).not.toContain("leading-none");
    expect(label.className).toContain("leading-tight");
  });
});
