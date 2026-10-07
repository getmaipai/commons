"use client";

// ELT-T1-13b story: desktop columns can request semantic minimum widths while
// the mobile card layout continues to size its label and value independently.
import { DataTable, type DataTableColumn } from "./data-table";

type Update = {
  name: string;
  installed: string;
  available: string;
  status: string;
};

const rows: Update[] = [
  {
    name: "Home Assistant integration",
    installed: "1.8.2",
    available: "1.9.0",
    status: "Update available",
  },
  {
    name: "Family calendar bridge",
    installed: "2.1.0",
    available: "2.1.0",
    status: "Current",
  },
];

const columns: DataTableColumn<Update>[] = [
  { id: "name", header: "Package" },
  { id: "installed", header: "Installed", minWidth: 104 },
  { id: "available", header: "Available", minWidth: 104 },
  { id: "status", header: "Status", minWidth: 152 },
];

export function DataTableMinWidthShowcase() {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      caption="Package updates"
      getRowId={(row) => row.name}
    />
  );
}
