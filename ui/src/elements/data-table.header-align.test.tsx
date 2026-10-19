// LIBRARY-REVAMP-06 slice C: the header row draws the same gaps and the same leading parts as a body row, so column
// labels line up with their columns (the header had no gap and no spacer for the first column's initial badge).
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { DataTable, type DataTableColumn, type ModelUsage } from "./data-table";

afterEach(cleanup);

type Row = { id: string; name: string; size: string };
const rows: Row[] = [{ id: "alfred", name: "Alfred", size: "1 MB" }, { id: "bramble", name: "Bramble", size: "2 MB" }];
const columns: DataTableColumn<Row>[] = [{ id: "name", header: "Name" }, { id: "size", header: "Size", align: "end" }];
const usage: ModelUsage[] = [{ name: "Alfred", context: "8K", cost: "$1" }, { name: "Bramble", context: "32K", cost: "$2" }];

describe("DataTable header alignment", () => {
  test("the header row has the same column gap as a body row, with columns given and without", () => {
    for (const view of [
      <DataTable rows={rows} columns={columns} getRowId={(r) => r.id} caption="Files" />,
      <DataTable rows={usage} caption="Usage" />,
    ]) {
      const { container } = render(view);
      expect(container.querySelector('[data-slot="data-table-header-row"]')!.className).toContain("gap-2.5");
      expect(container.querySelector('[data-slot="data-table-row"]')!.className).toContain("gap-2.5");
      cleanup();
    }
  });

  test("the header reserves the width of the first column's initial badge only when body rows draw one", () => {
    // Without `columns` the table is the model-usage table: its body rows draw an initial badge before the first cell.
    const withBadge = render(<DataTable rows={usage} caption="Usage" />);
    expect(withBadge.container.querySelector('[data-slot="data-table-initial"]')).toBeTruthy();
    const spacer = withBadge.container.querySelector('[data-slot="data-table-header-initial-spacer"]');
    expect(spacer).toBeTruthy();
    expect(spacer!.getAttribute("aria-hidden")).toBe("true");
    expect(spacer!.className).toContain("size-5");
    cleanup();
    // With `columns` (what the Library uses) there is no badge, so no spacer.
    const generic = render(<DataTable rows={rows} columns={columns} getRowId={(r) => r.id} caption="Files" />);
    expect(generic.container.querySelector('[data-slot="data-table-initial"]')).toBeNull();
    expect(generic.container.querySelector('[data-slot="data-table-header-initial-spacer"]')).toBeNull();
  });

  test("with selection the header box needs no extra margin: the gap does the spacing", () => {
    const { container } = render(<DataTable rows={rows} columns={columns} getRowId={(r) => r.id} caption="Files" selectedIds={[]} onSelectionChange={() => {}} />);
    const box = container.querySelector('[data-slot="data-table-select-header"]')!;
    expect(box.className).not.toContain("mr-2.5");
    const cell = container.querySelector('[data-slot="data-table-select-cell"]')!;
    expect(cell.className).not.toContain("mr-2.5");
  });
});
