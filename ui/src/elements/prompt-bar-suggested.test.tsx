// STYLES-04: the removable "suggested style" chips under the prompt box.
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { PromptBar } from "./prompt-bar";

afterEach(cleanup);

const rows = [{ id: "lora-a", name: "Clay look", kind: "style" as const }, { id: "char-1", name: "Nova", kind: "character" as const }];

describe("PromptBar suggested styles", () => {
  test("no chips and no group without suggestions", () => {
    const view = render(<PromptBar label="Describe" value="a fox" onValueChange={() => {}} onSubmit={() => {}} />);
    expect(view.queryByRole("group", { name: "Suggested styles" })).toBeNull();
  });

  test("each suggestion is a named chip with a remove button that reports its id", () => {
    const removed: string[] = [];
    const view = render(<PromptBar label="Describe" value="a fox" onValueChange={() => {}} onSubmit={() => {}} suggestedStyles={rows} onDismissSuggestion={(id) => removed.push(id)} />);
    const group = view.getByRole("group", { name: "Suggested styles" });
    expect(group.textContent).toContain("Style: Clay look");
    expect(group.textContent).toContain("Character: Nova");
    fireEvent.click(view.getByRole("button", { name: "Remove style Clay look" }));
    expect(removed).toEqual(["lora-a"]);
    fireEvent.click(view.getByRole("button", { name: "Remove character Nova" }));
    expect(removed).toEqual(["lora-a", "char-1"]);
  });

  test("the remove button is a real button, reachable and operable from the keyboard", () => {
    const removed: string[] = [];
    const view = render(<PromptBar label="Describe" value="a fox" onValueChange={() => {}} onSubmit={() => {}} suggestedStyles={[rows[0]!]} onDismissSuggestion={(id) => removed.push(id)} />);
    const button = view.getByRole("button", { name: "Remove style Clay look" }) as HTMLButtonElement;
    expect(button.tagName).toBe("BUTTON");
    expect(button.tabIndex).toBeGreaterThanOrEqual(0);
    button.focus();
    expect(document.activeElement).toBe(button);
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.click(button);
    expect(removed).toEqual(["lora-a"]);
  });

  test("at most two chips show", () => {
    const many = [...rows, { id: "x", name: "Third", kind: "style" as const }];
    const view = render(<PromptBar label="Describe" value="a fox" onValueChange={() => {}} onSubmit={() => {}} suggestedStyles={many} />);
    expect(view.queryByText(/Third/)).toBeNull();
  });
});
