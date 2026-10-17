// The model selector trigger keeps the 48 px touch floor at every size
// (docs/UI.md): a hit-area pseudo-element, and no overflow clip that would
// cut it off. The painted height classes stay as they were.
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { ModelSelectorRoot, ModelSelectorTrigger } from "./model-selector";

afterEach(cleanup);

function trigger(size: "default" | "sm" | "lg") {
  const view = render(
    <ModelSelectorRoot models={[{ id: "mode", name: "" }]} value="mode" onValueChange={() => {}}>
      <ModelSelectorTrigger size={size} aria-label="Mode" />
    </ModelSelectorRoot>,
  );
  return view.getByRole("combobox");
}

describe("ModelSelectorTrigger hit area", () => {
  test.each([
    ["default", "h-9", "before:-inset-3"],
    ["sm", "h-8", "before:-inset-3"],
    ["lg", "h-10", "before:-inset-2"],
  ] as const)("%s keeps %s and extends the hit area", (size, height, inset) => {
    const el = trigger(size);
    expect(el.className).toContain(height);
    expect(el.className).toContain("relative");
    expect(el.className).toContain(inset);
    expect(el.className).toContain("overflow-visible");
    expect(el.className).not.toContain("overflow-hidden");
  });
});
