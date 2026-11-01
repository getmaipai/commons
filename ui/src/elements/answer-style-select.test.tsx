import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { getIcon } from "@/kit/icons";
import { AnswerStyleSelect, type AnswerStyleChoice } from "./answer-style-select";

afterEach(cleanup);

const choices: AnswerStyleChoice[] = [
  { id: "instant", label: "Instant", description: "Quick answers.", icon: getIcon("zap") },
  { id: "thinking", label: "Thinking", description: "Slower answers, only for you.", icon: getIcon("brain") },
  { id: "max", label: "Max", description: "Strongest answers. Slows everyone down.", icon: getIcon("brain"), accent: getIcon("sparkles") },
];

describe("AnswerStyleSelect", () => {
  test("the closed control is an icon only, named by its current word, 44 px square", () => {
    const view = render(<AnswerStyleSelect choices={choices} value="thinking" onValueChange={() => {}} />);
    const trigger = view.getByRole("combobox", { name: "Answer style: Thinking" });
    expect(trigger.textContent).toBe("");
    expect(trigger.querySelector("svg")).toBeTruthy();
    expect(trigger.className).toContain("size-11");
  });

  test("the open menu shows icon, word and line per choice, and picking reports the id", () => {
    const picked: string[] = [];
    const view = render(<AnswerStyleSelect choices={choices} value="instant" onValueChange={(id) => picked.push(id)} />);
    fireEvent.keyDown(view.getByRole("combobox"), { key: "ArrowDown" });
    const menu = view.getByRole("menu");
    const items = within(menu).getAllByRole("menuitemradio");
    expect(items.map((item) => item.textContent)).toEqual(choices.map((choice) => `${choice.label}${choice.description}`));
    for (const item of items) expect(item.querySelector("svg")).toBeTruthy();
    expect(items[2]!.querySelectorAll("svg").length).toBe(2);
    fireEvent.click(items[2]!);
    expect(picked).toEqual(["max"]);
  });

  test("a disabled choice cannot be picked", () => {
    const picked: string[] = [];
    const view = render(<AnswerStyleSelect choices={choices.map((c) => (c.id === "max" ? { ...c, disabled: true } : c))} value="instant" onValueChange={(id) => picked.push(id)} />);
    fireEvent.keyDown(view.getByRole("combobox"), { key: "ArrowDown" });
    fireEvent.click(within(view.getByRole("menu")).getByRole("menuitemradio", { name: /^Max/ }));
    expect(picked).toEqual([]);
  });
});
