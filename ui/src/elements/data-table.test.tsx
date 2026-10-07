// ELT-T1-K02: the generic DataTable and its toolbar and rowActions slots.
import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { useState } from "react";
import { DataTable, type DataTableColumn, type ModelUsage } from "./data-table";

afterEach(cleanup);

const usage: ModelUsage[] = [
  { name: "Alpha", context: "8k", cost: "$1" },
  { name: "Beta", context: "32k", cost: "$2" },
];

describe("DataTable defaults (the ModelUsage demo shape)", () => {
  test("renders the three default columns and every row, cycle optional", () => {
    const { getByText, container } = render(<DataTable rows={usage} />);
    for (const text of ["Model", "Context", "Cost", "Alpha", "32k", "$2"]) {
      expect(getByText(text)).toBeTruthy();
    }
    expect(container.querySelectorAll("[data-slot='data-table-row']").length).toBe(2);
    expect(container.querySelector("[data-slot='data-table-toolbar']")).toBeNull();
    expect(container.querySelector("[data-slot='data-table-row-actions']")).toBeNull();
  });
});

type Person = { id: string; person: string; role: string };
const people: Person[] = [
  { id: "p1", person: "Ada", role: "Admin" },
  { id: "p2", person: "Bo", role: "Member" },
];
const columns: DataTableColumn<Person>[] = [
  { id: "person", header: "Person" },
  { id: "role", header: "Role", widthClass: "w-24" },
];

describe("DataTable generic rows and slots", () => {
  test("custom columns, getRowId and cell renderers", () => {
    const { getByText } = render(
      <DataTable
        rows={people}
        columns={[...columns, { id: "x", header: "Shout", cell: (r) => r.person.toUpperCase() }]}
        getRowId={(r) => r.id}
      />,
    );
    expect(getByText("Ada")).toBeTruthy();
    expect(getByText("Member")).toBeTruthy();
    expect(getByText("BO")).toBeTruthy();
  });

  test("rowActions renders per row and receives that row", () => {
    const onEdit = mock((_: string) => {});
    const { getAllByRole } = render(
      <DataTable
        rows={people}
        columns={columns}
        rowActions={(r) => (
          <button type="button" onClick={() => onEdit(r.id)}>Edit {r.person}</button>
        )}
      />,
    );
    const buttons = getAllByRole("button");
    expect(buttons.length).toBe(2);
    fireEvent.click(buttons[1]!);
    expect(onEdit).toHaveBeenCalledWith("p2");
  });

  test("toolbar slot hosts a filter box the caller wires to rows", () => {
    function Filtered() {
      const [query, setQuery] = useState("");
      const shown = people.filter((p) => p.person.toLowerCase().includes(query.toLowerCase()));
      return (
        <DataTable
          rows={shown}
          columns={columns}
          emptyLabel="No matches"
          toolbar={<input aria-label="Filter" value={query} onChange={(e) => setQuery(e.target.value)} />}
        />
      );
    }
    const { getByLabelText, queryByText, getByText } = render(<Filtered />);
    expect(getByText("Ada")).toBeTruthy();
    fireEvent.change(getByLabelText("Filter"), { target: { value: "bo" } });
    expect(queryByText("Ada")).toBeNull();
    expect(getByText("Bo")).toBeTruthy();
    fireEvent.change(getByLabelText("Filter"), { target: { value: "zzz" } });
    expect(getByText("No matches")).toBeTruthy();
  });

  test("emptyLabel is not drawn when unset or when rows exist", () => {
    const none = render(<DataTable rows={[]} columns={columns} />);
    expect(none.container.querySelector("[data-slot='data-table-empty']")).toBeNull();
    cleanup();
    const some = render(<DataTable rows={people} columns={columns} emptyLabel="Nothing" />);
    expect(some.queryByText("Nothing")).toBeNull();
  });
});
