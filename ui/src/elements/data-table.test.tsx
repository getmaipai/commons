// ELT-T1-K02: the generic DataTable and its toolbar and rowActions slots.
import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { useState } from "react";
import {
  DataTable,
  type DataTableColumn,
  type DataTableSort,
  type ModelUsage,
} from "./data-table";

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
    expect(container.querySelectorAll("[data-slot='data-table-initial']").length).toBe(2);
    expect(container.querySelector("[data-slot='data-table-card-row']")).toBeNull();
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
  { id: "person", header: "Person", sortable: true },
  { id: "role", header: "Role" },
];

describe("DataTable generic rows and slots", () => {
  test("custom columns, getRowId and cell renderers", () => {
    const { container } = render(
      <DataTable
        rows={people}
        columns={[...columns, { id: "x", header: "Shout", cell: (r) => r.person.toUpperCase() }]}
        getRowId={(r) => r.id}
      />,
    );
    const desktopRows = within(container.querySelector("[data-slot='data-table-body']")!);
    expect(desktopRows.getByText("Ada")).toBeTruthy();
    expect(desktopRows.getByText("Member")).toBeTruthy();
    expect(desktopRows.getByText("BO")).toBeTruthy();
  });

  test("caption and the div structure expose table roles", () => {
    const { container, getByRole } = render(
      <DataTable rows={usage} caption="Model usage" />,
    );
    expect(getByRole("table", { name: "Model usage" })).toBeTruthy();
    const header = container.querySelector("[data-slot='data-table-header-row']")!;
    const body = container.querySelector("[data-slot='data-table-body']")!;
    expect(header.querySelectorAll("[role='columnheader']").length).toBe(3);
    expect(body.querySelectorAll("[role='row']").length).toBe(2);
    expect(body.querySelectorAll("[role='cell']").length).toBe(6);
  });

  test("sortable headers cycle none, ascending, descending, then none", () => {
    const onSortChange = mock((_sort: DataTableSort | null) => {});
    const view = render(
      <DataTable rows={people} columns={columns} sort={null} onSortChange={onSortChange} />,
    );
    const desktopHeader = () =>
      within(view.container.querySelector("[data-slot='data-table-header-row']")!);
    const mobileHeader = () =>
      within(view.container.querySelector("[data-slot='data-table-mobile-sort']")!);
    const header = () => desktopHeader().getByRole("columnheader", { name: "Person" });
    const button = () => desktopHeader().getByRole("button", { name: "Sort by Person" });
    const mobileColumn = () =>
      mobileHeader().getByRole("columnheader", { name: "Person" });
    expect(mobileHeader().getByRole("button", { name: "Sort by Person" })).toBeTruthy();
    expect(header().getAttribute("aria-sort")).toBe("none");
    expect(mobileColumn().getAttribute("aria-sort")).toBe("none");

    fireEvent.click(button());
    expect(onSortChange).toHaveBeenLastCalledWith({ columnId: "person", direction: "asc" });
    view.rerender(
      <DataTable
        rows={people}
        columns={columns}
        sort={{ columnId: "person", direction: "asc" }}
        onSortChange={onSortChange}
      />,
    );
    expect(header().getAttribute("aria-sort")).toBe("ascending");
    expect(mobileColumn().getAttribute("aria-sort")).toBe("ascending");

    fireEvent.click(mobileHeader().getByRole("button", { name: "Sort by Person" }));
    expect(onSortChange).toHaveBeenLastCalledWith({ columnId: "person", direction: "desc" });
    view.rerender(
      <DataTable
        rows={people}
        columns={columns}
        sort={{ columnId: "person", direction: "desc" }}
        onSortChange={onSortChange}
      />,
    );
    expect(header().getAttribute("aria-sort")).toBe("descending");
    expect(mobileColumn().getAttribute("aria-sort")).toBe("descending");

    fireEvent.click(mobileHeader().getByRole("button", { name: "Sort by Person" }));
    expect(onSortChange).toHaveBeenLastCalledWith(null);
    view.rerender(
      <DataTable rows={people} columns={columns} sort={null} onSortChange={onSortChange} />,
    );
    expect(header().getAttribute("aria-sort")).toBe("none");
    expect(mobileColumn().getAttribute("aria-sort")).toBe("none");
  });

  test("generic rows omit the initial badge and include responsive card rows", () => {
    const { container } = render(
      <DataTable
        rows={people}
        columns={columns}
        caption="People"
        rowActions={(person) => <button type="button">Edit {person.person}</button>}
      />,
    );
    expect(container.querySelector("[data-slot='data-table-initial']")).toBeNull();
    expect(container.querySelector("[data-slot='data-table-cards']")?.className).toContain("@md:hidden");
    expect(container.querySelectorAll("[data-slot='data-table-card-row']").length).toBe(2);
    const cards = container.querySelector<HTMLElement>("[data-slot='data-table-cards']")!;
    expect(within(cards).getByText("Ada")).toBeTruthy();
    expect(within(cards).getByText("Admin")).toBeTruthy();
    expect(cards.querySelectorAll("[role='columnheader']").length).toBe(4);
    const card = cards.querySelector<HTMLElement>("[data-slot='data-table-card-row']")!;
    expect(card.lastElementChild?.getAttribute("data-slot")).toBe("data-table-card-actions");
    expect(within(card).getByRole("button", { name: "Edit Ada" })).toBeTruthy();
  });

  test("rowActions renders per row and receives that row", () => {
    const onEdit = mock((_: string) => {});
    const { container } = render(
      <DataTable
        rows={people}
        columns={columns}
        rowActions={(r) => (
          <button type="button" onClick={() => onEdit(r.id)}>Edit {r.person}</button>
        )}
      />,
    );
    const desktopRows = within(container.querySelector("[data-slot='data-table-body']")!);
    const buttons = desktopRows.getAllByRole("button");
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
    const { container, getByLabelText } = render(<Filtered />);
    const desktopRows = () => within(container.querySelector("[data-slot='data-table-body']")!);
    expect(desktopRows().getByText("Ada")).toBeTruthy();
    fireEvent.change(getByLabelText("Filter"), { target: { value: "bo" } });
    expect(desktopRows().queryByText("Ada")).toBeNull();
    expect(desktopRows().getByText("Bo")).toBeTruthy();
    fireEvent.change(getByLabelText("Filter"), { target: { value: "zzz" } });
    expect(desktopRows().getByText("No matches")).toBeTruthy();
  });

  test("emptyLabel is not drawn when unset or when rows exist", () => {
    const none = render(<DataTable rows={[]} columns={columns} />);
    expect(none.container.querySelector("[data-slot='data-table-empty']")).toBeNull();
    cleanup();
    const some = render(<DataTable rows={people} columns={columns} emptyLabel="Nothing" />);
    expect(some.queryByText("Nothing")).toBeNull();
  });
});
