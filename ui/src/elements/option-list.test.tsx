import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { OptionList } from "./option-list";

afterEach(cleanup);

const options = [
  { id: "a", label: "Alpha", description: "first" },
  { id: "b", label: "Bravo" },
  { id: "c", label: "Charlie" },
];

describe("OptionList", () => {
  test("without onConfirm it only displays the options", () => {
    const view = render(<OptionList options={options} />);
    expect(view.getByText("Alpha")).toBeTruthy();
    expect(view.getByText("first")).toBeTruthy();
    expect(view.queryByRole("button")).toBeNull();
  });

  test("a single selection commits on pick and settles into a receipt of that answer", async () => {
    const picked: string[][] = [];
    const view = render(<OptionList options={options} onConfirm={(ids) => void picked.push(ids)} />);
    fireEvent.click(view.getByRole("button", { name: /Bravo/ }));
    await waitFor(() => expect(view.container.querySelector("[data-state='receipt']")).toBeTruthy());
    expect(picked).toEqual([["b"]]);
    expect(view.queryByText("Alpha")).toBeNull();
    expect(view.getByText("Selected:")).toBeTruthy();
  });

  test("a multiple selection waits for confirm, respects min and max, and words are overridable", async () => {
    const picked: string[][] = [];
    const view = render(
      <OptionList
        options={options}
        selectionMode="multiple"
        minSelections={2}
        maxSelections={2}
        confirmLabel="Done"
        countLabel={(n, max) => `${n}/${max} chosen`}
        onConfirm={(ids) => void picked.push(ids)}
      />,
    );
    fireEvent.click(view.getByRole("button", { name: "Done" }));
    expect(picked).toEqual([]);
    fireEvent.click(view.getByRole("checkbox", { name: /Alpha/ }));
    fireEvent.click(view.getByRole("checkbox", { name: /Charlie/ }));
    fireEvent.click(view.getByRole("checkbox", { name: /Bravo/ }));
    expect(view.getByText("2/2 chosen")).toBeTruthy();
    fireEvent.click(view.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(picked).toEqual([["a", "c"]]));
  });

  test("a rejected commit reopens the list with the reason", async () => {
    const view = render(
      <OptionList options={options} onConfirm={() => Promise.reject(new Error("Could not save"))} />,
    );
    fireEvent.click(view.getByRole("button", { name: /Alpha/ }));
    await waitFor(() => expect(view.getByRole("alert").textContent).toBe("Could not save"));
    expect(view.container.querySelector("[data-state='receipt']")).toBeNull();
  });

  test("a given choice renders the receipt and an empty one uses the overridable empty words", () => {
    const view = render(<OptionList options={options} choice={[]} emptyLabel="Skipped" />);
    expect(view.getByText("Skipped")).toBeTruthy();
  });
});
