import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { PromptBar, type PromptBarChip } from "./prompt-bar";

afterEach(cleanup);

const shape = (onValueChange: (v: string | number) => void = () => {}): PromptBarChip => ({
  id: "shape", label: "Shape", value: "landscape", onValueChange,
  options: [{ value: "landscape", label: "Landscape" }, { value: "portrait", label: "Portrait" }],
});

describe("PromptBar", () => {
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

  test("busy or a disabled reason turns Make off and the reason is shown instead of an error", () => {
    const { getByRole, getByText, rerender } = render(<PromptBar label="Describe" value="x" onValueChange={() => {}} onSubmit={() => {}} busy />);
    expect((getByRole("button", { name: "Make" }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<PromptBar label="Describe" value="x" onValueChange={() => {}} onSubmit={() => {}} disabledReason="Video is not ready yet. Try again in a minute." />);
    expect((getByRole("button", { name: "Make" }) as HTMLButtonElement).disabled).toBe(true);
    expect((getByRole("textbox", { name: "Describe" }) as HTMLTextAreaElement).disabled).toBe(true);
    expect(getByText("Video is not ready yet. Try again in a minute.")).toBeTruthy();
  });

  test("the leading slot is drawn at the start of the chip row", () => {
    const { getByTestId, container } = render(<PromptBar label="Describe" value="x" onValueChange={() => {}} onSubmit={() => {}} chips={[shape()]} leading={<span data-testid="frame">Start frame</span>} />);
    const row = container.querySelector('[data-slot="prompt-bar-chips"]')!;
    expect(row.firstElementChild).toBe(getByTestId("frame"));
  });
});
