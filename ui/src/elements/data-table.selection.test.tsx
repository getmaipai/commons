// LIBRARY-REVAMP-06 slice B: DataTable row selection. Selection is off unless `onSelectionChange` is given,
// and with it off the table renders exactly as before.
import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import axe from "axe-core";
import { useState } from "react";
import { DataTable, type DataTableColumn, type DataTableProps } from "./data-table";

afterEach(cleanup);

type Row = { id: string; name: string; size: string };
const rows: Row[] = [
  { id: "alfred", name: "Alfred", size: "1 MB" },
  { id: "bramble", name: "Bramble", size: "2 MB" },
  { id: "clover", name: "Clover", size: "3 MB" },
  { id: "daisy", name: "Daisy", size: "4 MB" },
];
const columns: DataTableColumn<Row>[] = [
  { id: "name", header: "Name" },
  { id: "size", header: "Size", align: "end" },
];

/** A caller that owns the selection, as Home will. */
function Harness(props: Partial<DataTableProps<Row>> & { initial?: string[]; seen?: (ids: string[]) => void }) {
  const { initial, seen, ...rest } = props;
  const [ids, setIds] = useState<string[]>(initial ?? []);
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      caption="Files"
      selectedIds={ids}
      onSelectionChange={(next) => {
        setIds(next);
        seen?.(next);
      }}
      {...rest}
    />
  );
}

function body(view: ReturnType<typeof render>) {
  return within(view.container.querySelector("[data-slot='data-table-body']") as HTMLElement);
}
function header(view: ReturnType<typeof render>) {
  return within(view.container.querySelector("[data-slot='data-table-header-row']") as HTMLElement);
}
function rowBox(view: ReturnType<typeof render>, name: string) {
  return body(view).getByRole("checkbox", { name: `Select ${name}` });
}

describe("DataTable selection: off by default", () => {
  test("without onSelectionChange there are no boxes, no aria-selected and the same markup", () => {
    const plain = render(<DataTable rows={rows} columns={columns} getRowId={(row) => row.id} caption="Files" />);
    const plainHtml = plain.container.innerHTML.replace(/animation-delay:[^;"]*;?/g, "");
    expect(plain.container.querySelector("[role=checkbox]")).toBeNull();
    expect(plain.container.querySelector("[aria-selected]")).toBeNull();
    cleanup();
    // selectedIds and selectionMode alone switch nothing on.
    const withProps = render(<DataTable rows={rows} columns={columns} getRowId={(row) => row.id} caption="Files" selectedIds={["alfred"]} selectionMode />);
    expect(withProps.container.innerHTML.replace(/animation-delay:[^;"]*;?/g, "")).toBe(plainHtml);
  });

  test("the default ModelUsage table is untouched", () => {
    const view = render(<DataTable rows={[{ name: "Alpha", context: "8k", cost: "$1" }]} />);
    expect(view.container.querySelector("[role=checkbox]")).toBeNull();
    expect(view.container.querySelector("[data-slot='data-table-select-cell']")).toBeNull();
  });
});

describe("DataTable selection", () => {
  test("every row gets a box named for its first column, with a 48 px hit area", () => {
    const view = render(<Harness />);
    for (const row of rows) expect(rowBox(view, row.name)).toBeTruthy();
    expect(rowBox(view, "Alfred").className).toContain("after:-inset-4");
    expect(header(view).getByRole("checkbox", { name: "Select all rows" }).className).toContain("after:-inset-4");
  });

  test("a click selects and clears one row, and the row says so with aria-selected", () => {
    const seen = mock((_: string[]) => {});
    const view = render(<Harness seen={seen} />);
    const row = rowBox(view, "Bramble").closest("[role=row]") as HTMLElement;
    expect(row.getAttribute("aria-selected")).toBe("false");
    fireEvent.click(rowBox(view, "Bramble"));
    expect(seen.mock.calls.at(-1)?.[0]).toEqual(["bramble"]);
    expect(row.getAttribute("aria-selected")).toBe("true");
    expect(rowBox(view, "Bramble").getAttribute("aria-checked")).toBe("true");
    fireEvent.click(rowBox(view, "Bramble"));
    expect(seen.mock.calls.at(-1)?.[0]).toEqual([]);
    expect(row.getAttribute("aria-selected")).toBe("false");
  });

  test("the header box is mixed for some rows, checked for all, and clear for none", () => {
    const view = render(<Harness />);
    const all = () => header(view).getByRole("checkbox", { name: "Select all rows" });
    expect(all().getAttribute("aria-checked")).toBe("false");
    fireEvent.click(rowBox(view, "Alfred"));
    expect(all().getAttribute("aria-checked")).toBe("mixed");
    expect(all().getAttribute("data-state")).toBe("indeterminate");
    fireEvent.click(rowBox(view, "Bramble"));
    fireEvent.click(rowBox(view, "Clover"));
    fireEvent.click(rowBox(view, "Daisy"));
    expect(all().getAttribute("aria-checked")).toBe("true");
  });

  test("select all picks every row in table order, and pressing it again clears them", () => {
    const seen = mock((_: string[]) => {});
    const view = render(<Harness seen={seen} initial={["clover"]} />);
    const all = () => header(view).getByRole("checkbox", { name: "Select all rows" });
    // From a mixed state it selects the rest.
    fireEvent.click(all());
    expect(seen.mock.calls.at(-1)?.[0]).toEqual(["alfred", "bramble", "clover", "daisy"]);
    fireEvent.click(all());
    expect(seen.mock.calls.at(-1)?.[0]).toEqual([]);
  });

  test("shift-click selects the range from the last box pressed", () => {
    const seen = mock((_: string[]) => {});
    const view = render(<Harness seen={seen} />);
    fireEvent.click(rowBox(view, "Alfred"));
    fireEvent.click(rowBox(view, "Clover"), { shiftKey: true });
    expect(seen.mock.calls.at(-1)?.[0]).toEqual(["alfred", "bramble", "clover"]);
    // A backwards range works too.
    fireEvent.click(rowBox(view, "Daisy"));
    fireEvent.click(rowBox(view, "Bramble"), { shiftKey: true });
    expect(new Set(seen.mock.calls.at(-1)?.[0])).toEqual(new Set(["alfred", "bramble", "clover", "daisy"]));
  });

  test("shift-click with no earlier box acts as a plain click", () => {
    const seen = mock((_: string[]) => {});
    const view = render(<Harness seen={seen} />);
    fireEvent.click(rowBox(view, "Clover"), { shiftKey: true });
    expect(seen.mock.calls.at(-1)?.[0]).toEqual(["clover"]);
  });

  test("ids that are not on this page are kept", () => {
    const seen = mock((_: string[]) => {});
    const view = render(<Harness seen={seen} initial={["elsewhere"]} />);
    fireEvent.click(rowBox(view, "Alfred"));
    expect(seen.mock.calls.at(-1)?.[0]).toEqual(["alfred", "elsewhere"]);
    fireEvent.click(header(view).getByRole("checkbox", { name: "Select all rows" }));
    expect(seen.mock.calls.at(-1)?.[0]).toEqual(["alfred", "bramble", "clover", "daisy", "elsewhere"]);
  });

  test("boxes are hidden until hover or focus, and always shown in selection mode or once anything is selected", () => {
    const hidden = render(<Harness />);
    expect(rowBox(hidden, "Alfred").parentElement!.className).toContain("opacity-0");
    expect(rowBox(hidden, "Alfred").parentElement!.className).toContain("group-focus-within/table:opacity-100");
    cleanup();
    const mode = render(<Harness selectionMode />);
    expect(rowBox(mode, "Alfred").parentElement!.className).toContain("opacity-100");
    expect(rowBox(mode, "Alfred").parentElement!.className).not.toContain("opacity-0");
    cleanup();
    const some = render(<Harness initial={["daisy"]} />);
    expect(rowBox(some, "Alfred").parentElement!.className).not.toContain("opacity-0");
  });

  test("a custom row label and labels are used", () => {
    const view = render(
      <Harness getRowLabel={(row) => `file ${row.name}`} selectionLabels={{ selectAll: "Pick every file", selectRow: (label) => `Pick ${label}` }} />,
    );
    expect(body(view).getByRole("checkbox", { name: "Pick file Alfred" })).toBeTruthy();
    expect(header(view).getByRole("checkbox", { name: "Pick every file" })).toBeTruthy();
  });

  test("a thumbnail cell works in the first column and names the box from its row", () => {
    const view = render(
      <Harness
        columns={[{ id: "name", header: "Name", cell: (row: Row) => <span><img alt="" src="data:," width={48} height={48} />{row.name}</span> }, ...columns.slice(1)]}
        getRowLabel={(row) => row.name}
      />,
    );
    expect(rowBox(view, "Alfred")).toBeTruthy();
  });

  test("the phone card layout has its own select-all line and a box per card", () => {
    const view = render(<Harness />);
    const cards = view.container.querySelector("[data-slot='data-table-cards']") as HTMLElement;
    expect(within(cards).getAllByRole("checkbox", { name: /^Select (Alfred|Bramble|Clover|Daisy)$/ })).toHaveLength(4);
    expect(within(cards).getByRole("checkbox", { name: "Select all rows" })).toBeTruthy();
    fireEvent.click(within(cards).getByRole("checkbox", { name: "Select Daisy" }));
    expect(within(cards).getByRole("checkbox", { name: "Select Daisy" }).getAttribute("aria-checked")).toBe("true");
  });

  test("an empty table disables select all", () => {
    const view = render(<Harness rows={[]} emptyLabel="Nothing here yet." />);
    expect(header(view).getByRole("checkbox", { name: "Select all rows" }).hasAttribute("disabled")).toBe(true);
  });

  test("sorting and selection live together", () => {
    const view = render(<Harness columns={[{ id: "name", header: "Name", sortable: true }, columns[1]!]} onSortChange={() => {}} />);
    fireEvent.click(rowBox(view, "Alfred"));
    expect(header(view).getByRole("button", { name: "Sort by Name" })).toBeTruthy();
  });
});

describe("DataTable selection accessibility", () => {
  test("axe finds no violation in the selectable table", async () => {
    const view = render(<Harness initial={["bramble"]} />);
    const result = await axe.run(view.container, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 80)).join(" | ")}`)).toEqual([]);
  });
});
