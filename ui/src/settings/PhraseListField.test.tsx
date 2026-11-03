import { describe, expect, test, afterEach } from "bun:test";
import { useState } from "react";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { PhraseListField, PhrasePairsField, splitPhrases, type PhrasePair } from "@/kit/settings/PhraseListField";

afterEach(cleanup);

function List({ start = [] as string[], seen, ...rest }: { start?: string[]; seen?: { v: string[] }; maxItems?: number; maxItemChars?: number; maxTotalChars?: number }) {
  const [v, setV] = useState(start);
  if (seen) seen.v = v;
  return <PhraseListField label="Trigger words" help="Words that wake the style." value={v} onChange={setV} addLabel="Add a word" maxItemChars={rest.maxItemChars ?? 20} maxItems={rest.maxItems} maxTotalChars={rest.maxTotalChars} />;
}
const input = (r: ReturnType<typeof render>) => r.getByLabelText("Add a word") as HTMLInputElement;
const type = (el: HTMLInputElement, text: string) => fireEvent.change(el, { target: { value: text } });
const chips = (r: ReturnType<typeof render>) => Array.from(r.container.querySelectorAll('[data-slot="combobox-chip"]')).map((c) => c.textContent);

describe("PhraseListField", () => {
  test("Enter adds, trims, and clears the input", () => {
    const seen = { v: [] as string[] };
    const r = render(<List seen={seen} />);
    type(input(r), "  neon   glow ");
    fireEvent.keyDown(input(r), { key: "Enter" });
    expect(seen.v).toEqual(["neon glow"]);
    expect(input(r).value).toBe("");
    expect(chips(r)).toEqual(["neon glow"]);
  });

  test("a comma adds", () => {
    const seen = { v: [] as string[] };
    const r = render(<List seen={seen} />);
    type(input(r), "ember");
    fireEvent.keyDown(input(r), { key: "," });
    expect(seen.v).toEqual(["ember"]);
  });

  test("a duplicate in another letter case is refused with a plain line, text kept", () => {
    const seen = { v: [] as string[] };
    const r = render(<List start={["Neon"]} seen={seen} />);
    type(input(r), "neon");
    fireEvent.keyDown(input(r), { key: "Enter" });
    expect(seen.v).toEqual(["Neon"]);
    expect(r.getByText('"neon" is already in the list. Type a different one.')).toBeTruthy();
    expect(input(r).value).toBe("neon");
    expect(input(r).getAttribute("aria-invalid")).toBe("true");
  });

  test("per-item limit refuses with the count and what to do", () => {
    const r = render(<List maxItemChars={5} />);
    type(input(r), "abcdefgh");
    fireEvent.keyDown(input(r), { key: "Enter" });
    expect(r.getByText("That is 8 characters and each phrase can have 5. Shorten it.")).toBeTruthy();
    expect(chips(r)).toEqual([]);
  });

  test("total limit and item cap refuse", () => {
    const r = render(<List start={["aaaa", "bbbb"]} maxTotalChars={10} maxItems={3} />);
    type(input(r), "ccccccc");
    fireEvent.keyDown(input(r), { key: "Enter" });
    expect(r.getByText(/10 characters in all and this would make 15/)).toBeTruthy();
    type(input(r), "c");
    fireEvent.keyDown(input(r), { key: "Enter" });
    expect(chips(r)).toEqual(["aaaa", "bbbb", "c"]);
    type(input(r), "d");
    fireEvent.keyDown(input(r), { key: "Enter" });
    expect(r.getByText("The list holds 3 at most. Remove one to add another.")).toBeTruthy();
  });

  test("the count line shows the limits and the use", () => {
    const r = render(<List start={["abc"]} maxItemChars={120} maxTotalChars={400} />);
    expect(r.getByText("120 characters each, 400 in all (3 used)")).toBeTruthy();
  });

  test("a paste splits on newlines and commas, skipping duplicates and reporting them", () => {
    const seen = { v: [] as string[] };
    const r = render(<List start={["one"]} seen={seen} />);
    fireEvent.paste(input(r), { clipboardData: { getData: () => "two, three\nONE\n\nfour" } });
    expect(seen.v).toEqual(["one", "two", "three", "four"]);
    expect(r.getByText('"ONE" is already in the list. Type a different one.')).toBeTruthy();
  });

  test("a paste with no separator is left to the input", () => {
    const r = render(<List />);
    fireEvent.paste(input(r), { clipboardData: { getData: () => "single" } });
    expect(chips(r)).toEqual([]);
  });

  test("splitPhrases drops empties", () => {
    expect(splitPhrases(" a ,, b\r\n c ")).toEqual(["a", "b", "c"]);
  });

  test("each chip has its own named Remove button and removing announces", () => {
    const seen = { v: [] as string[] };
    const r = render(<List start={["red", "blue"]} seen={seen} />);
    fireEvent.click(r.getByRole("button", { name: "Remove red" }));
    expect(seen.v).toEqual(["blue"]);
    expect(r.container.querySelector('[role="status"]')?.textContent).toBe('Removed "red". 1 in the list.');
  });

  test("Backspace on an empty input removes the last chip", () => {
    const seen = { v: [] as string[] };
    const r = render(<List start={["red", "blue"]} seen={seen} />);
    input(r).focus();
    fireEvent.keyDown(input(r), { key: "Backspace" });
    expect(seen.v).toEqual(["red"]);
  });

  test("Backspace with text typed removes no chip", () => {
    const seen = { v: [] as string[] };
    const r = render(<List start={["red"]} seen={seen} />);
    type(input(r), "x");
    fireEvent.keyDown(input(r), { key: "Backspace" });
    expect(seen.v).toEqual(["red"]);
  });

  test("blur adds the pending text", () => {
    const seen = { v: [] as string[] };
    const r = render(<List seen={seen} />);
    type(input(r), "later");
    fireEvent.blur(input(r));
    expect(seen.v).toEqual(["later"]);
  });

  test("an add announces through the polite status region", () => {
    const r = render(<List />);
    type(input(r), "glow");
    fireEvent.keyDown(input(r), { key: "Enter" });
    const status = r.container.querySelector('[role="status"]');
    expect(status?.getAttribute("aria-live")).toBe("polite");
    expect(status?.textContent).toBe('Added "glow". 1 in the list.');
  });

  test("the list is a labelled group and the input is named", () => {
    const r = render(<List />);
    expect(r.getByRole("group", { name: "Trigger words" })).toBeTruthy();
    expect(input(r).getAttribute("aria-describedby")).toContain("-help");
  });

  test("disabled blocks typing and removal", () => {
    const r = render(<PhraseListField label="W" value={["a"]} onChange={() => {}} addLabel="Add a word" maxItemChars={5} disabled />);
    expect((r.getByLabelText("Add a word") as HTMLInputElement).disabled).toBe(true);
    expect((r.getByRole("button", { name: "Remove a" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

function Pairs({ start = [] as PhrasePair[], seen }: { start?: PhrasePair[]; seen?: { v: PhrasePair[] } }) {
  const [v, setV] = useState(start);
  if (seen) seen.v = v;
  return <PhrasePairsField label="Avoid and say instead" value={v} onChange={setV} firstLabel="Avoid" secondLabel="Say instead" addLabel="Add pair" maxItemChars={10} maxTotalChars={30} />;
}

describe("PhrasePairsField", () => {
  test("Enter in either input adds a pair and focuses the first input", () => {
    const seen = { v: [] as PhrasePair[] };
    const r = render(<Pairs seen={seen} />);
    fireEvent.change(r.getByLabelText("Avoid"), { target: { value: "dark" } });
    fireEvent.change(r.getByLabelText("Say instead"), { target: { value: "bright" } });
    fireEvent.keyDown(r.getByLabelText("Say instead"), { key: "Enter" });
    expect(seen.v).toEqual([{ avoid: "dark", say: "bright" }]);
    expect((r.getByLabelText("Avoid") as HTMLInputElement).value).toBe("");
    expect(document.activeElement).toBe(r.getByLabelText("Avoid"));
  });

  test("one empty side is refused with what to do", () => {
    const r = render(<Pairs />);
    fireEvent.change(r.getByLabelText("Avoid"), { target: { value: "dark" } });
    fireEvent.click(r.getByRole("button", { name: "Add pair" }));
    expect(r.getByText('Fill in both "Avoid" and "Say instead", then add the pair.')).toBeTruthy();
  });

  test("a repeated avoid word is refused in any letter case", () => {
    const r = render(<Pairs start={[{ avoid: "Dark", say: "light" }]} />);
    fireEvent.change(r.getByLabelText("Avoid"), { target: { value: "dark" } });
    fireEvent.change(r.getByLabelText("Say instead"), { target: { value: "x" } });
    fireEvent.click(r.getByRole("button", { name: "Add pair" }));
    expect(r.getByText('"dark" is already in the list. Type a different one.')).toBeTruthy();
  });

  test("per-item limit applies to the second side and the total counts both sides", () => {
    const r = render(<Pairs start={[{ avoid: "aaaaaaaaaa", say: "bbbbbbbbbb" }]} />);
    fireEvent.change(r.getByLabelText("Avoid"), { target: { value: "c" } });
    fireEvent.change(r.getByLabelText("Say instead"), { target: { value: "dddddddddddd" } });
    fireEvent.click(r.getByRole("button", { name: "Add pair" }));
    expect(r.getByText("That is 12 characters and each phrase can have 10. Shorten it.")).toBeTruthy();
    fireEvent.change(r.getByLabelText("Avoid"), { target: { value: "cccccccccc" } });
    fireEvent.change(r.getByLabelText("Say instead"), { target: { value: "dddddddddd" } });
    fireEvent.click(r.getByRole("button", { name: "Add pair" }));
    expect(r.getByText(/30 characters in all and this would make 40/)).toBeTruthy();
  });

  test("a pair's Remove button is named and removes it", () => {
    const seen = { v: [] as PhrasePair[] };
    const r = render(<Pairs start={[{ avoid: "dark", say: "bright" }]} seen={seen} />);
    expect(r.getByRole("list", { name: "Avoid and say instead, 1 added" })).toBeTruthy();
    fireEvent.click(r.getByRole("button", { name: "Remove dark" }));
    expect(seen.v).toEqual([]);
  });
});
