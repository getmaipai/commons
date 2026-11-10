import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { PromptBar, type PromptBarChip } from "./prompt-bar";

afterEach(cleanup);

const shape = (onValueChange: (v: string | number) => void = () => {}): PromptBarChip => ({
  id: "shape", label: "Shape", value: "landscape", onValueChange,
  options: [{ value: "landscape", label: "Landscape" }, { value: "portrait", label: "Portrait" }],
});

describe("PromptBar", () => {
  test("default field classes stay unchanged; pill and create are opt-in", () => {
    const props = { label: "Describe", value: "a fox", onValueChange: () => {}, onSubmit: () => {}, references: [{ id: "image", label: "Image", kind: "picture" as const, placement: "in_field" as const, onPick: () => {}, onRemove: () => {} }] };
    const baseline = render(<PromptBar {...props} />);
    const baselineField = baseline.container.querySelector('[data-slot="prompt-bar-field"]') ?? baseline.container.querySelector("textarea")!;
    expect(baselineField).toHaveClass("rounded-2xl", "border-input", "bg-transparent", "focus-within:ring-3", "focus-within:ring-ring/50");
    baseline.unmount();
    const { container, getByRole } = render(<PromptBar {...props} shape="pill" accent="create" />);
    expect(container.querySelector('[data-slot="prompt-bar-field"]')).toHaveClass("rounded-[28px]", "border-[var(--hairline)]", "bg-[var(--surface-2)]", "focus-within:ring-[var(--accent-create)]/50");
    expect(getByRole("button", { name: "Make" })).toHaveClass("rounded-full", "bg-primary");
  });

  test("Make stays off until there is text, then submits once", () => {
    let made = 0;
    const { getByRole, rerender } = render(<PromptBar label="Describe" value="" onValueChange={() => {}} onSubmit={() => { made += 1; }} />);
    const make = getByRole("button", { name: "Make" }) as HTMLButtonElement;
    expect(make.disabled).toBe(true);
    rerender(<PromptBar label="Describe" value="a fox" onValueChange={() => {}} onSubmit={() => { made += 1; }} />);
    expect(make.disabled).toBe(false);
    fireEvent.click(make);
    expect(made).toBe(1);
  });

  test("typing reports the text and Cmd+Enter submits", () => {
    const typed: string[] = [];
    let made = 0;
    const { getByRole } = render(<PromptBar label="Describe" value="a fox" onValueChange={(t) => typed.push(t)} onSubmit={() => { made += 1; }} />);
    const box = getByRole("textbox", { name: "Describe" });
    fireEvent.change(box, { target: { value: "a fox in snow" } });
    expect(typed).toEqual(["a fox in snow"]);
    fireEvent.keyDown(box, { key: "Enter", metaKey: true });
    expect(made).toBe(1);
  });

  test("a chip shows its value and reports the picked option with its own type", async () => {
    const picked: (string | number)[] = [];
    const length: PromptBarChip = { id: "length", label: "Length", value: 5, onValueChange: (v) => picked.push(v), options: [{ value: 3, label: "3 seconds" }, { value: 5, label: "5 seconds" }] };
    const view = render(<PromptBar label="Describe" value="x" onValueChange={() => {}} onSubmit={() => {}} chips={[shape(), length]} />);
    expect(view.getByRole("combobox", { name: "Shape" }).textContent).toContain("Landscape");
    const trigger = view.getByRole("combobox", { name: "Length" });
    expect(trigger.textContent).toContain("5 seconds");
    act(() => { fireEvent.keyDown(trigger, { key: "ArrowDown" }); });
    const option = await view.findByRole("option", { name: "3 seconds" });
    act(() => { fireEvent.keyDown(option, { key: "Enter" }); });
    expect(picked).toEqual([3]);
  });

  test("the tier segment is the kit one and reports a tier", () => {
    const tiers: string[] = [];
    const { getByRole } = render(
      <PromptBar label="Describe" value="x" onValueChange={() => {}} onSubmit={() => {}}
        tier={{ value: "standard", onValueChange: (t) => tiers.push(t), tiers: [{ id: "standard", label: "Standard" }, { id: "boost", label: "Boost" }] }} />,
    );
    fireEvent.click(getByRole("radio", { name: "Boost" }));
    expect(tiers).toEqual(["boost"]);
  });

  test("busy or an unavailable engine turns Make off; the reason stays visible and the text field stays editable", () => {
    const { getByRole, getByText, rerender } = render(<PromptBar label="Describe" value="x" onValueChange={() => {}} onSubmit={() => {}} busy />);
    expect((getByRole("button", { name: "Make" }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<PromptBar label="Describe" value="x" onValueChange={() => {}} onSubmit={() => {}} disabledReason="Video is not ready yet. Try again in a minute." chips={[shape()]} />);
    expect((getByRole("button", { name: "Make" }) as HTMLButtonElement).disabled).toBe(true);
    expect((getByRole("textbox", { name: "Describe" }) as HTMLTextAreaElement).disabled).toBe(false);
    expect((getByRole("combobox", { name: "Shape" }) as HTMLButtonElement).disabled).toBe(false);
    expect(getByText("Video is not ready yet. Try again in a minute.")).toBeTruthy();
  });

  test("composer keeps prompt, controls, tier and Generate inside one input mechanism", () => {
    const view = render(<PromptBar layout="composer" label="Describe" value="a fox" onValueChange={() => {}} onSubmit={() => {}} chips={[shape()]} tier={{ value: "standard", onValueChange: () => {}, tiers: [{ id: "standard", label: "Standard" }, { id: "boost", label: "Boost" }] }} />);
    const composer = view.container.querySelector('[data-slot="prompt-bar-composer"]')!;
    expect(composer.contains(view.getByRole("textbox", { name: "Describe" }))).toBe(true);
    expect(composer.contains(view.getByRole("combobox", { name: "Shape" }))).toBe(true);
    expect(composer.contains(view.getByRole("radio", { name: "Boost" }))).toBe(true);
    expect(composer.contains(view.getByRole("button", { name: "Make" }))).toBe(true);
  });

  test("an error is an in-flow status row above the field, not floating text", () => {
    const { getByRole, container } = render(<PromptBar label="Describe" value="x" onValueChange={() => {}} onSubmit={() => {}} error="You already have a video being made." />);
    const row = getByRole("alert");
    expect(row.getAttribute("data-slot")).toBe("prompt-bar-error");
    expect(row.getAttribute("data-status-kind")).toBe("problem");
    expect(row.className).not.toMatch(/\b(absolute|fixed)\b/);
    expect(row.className).toContain("--tint-problem");
    const field = container.querySelector("textarea")!;
    expect(row.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test("the leading slot is drawn at the start of the chip row", () => {
    const { getByTestId, container } = render(<PromptBar label="Describe" value="x" onValueChange={() => {}} onSubmit={() => {}} chips={[shape()]} leading={<span data-testid="frame">Start frame</span>} />);
    const row = container.querySelector('[data-slot="prompt-bar-chips"]')!;
    expect(row.firstElementChild).toBe(getByTestId("frame"));
  });
});
