"use client";

import { Fragment, type ComponentProps, type ReactNode } from "react";
import { cn } from "cn";
import { mono, paper } from "./surfaces";

export interface ModelUsage {
  name: string;
  context: string;
  cost: string;
}

export interface DataTableColumn<Row> {
  id: string;
  header: ReactNode;
  /** What the cell shows. Unset: `String(row[id])`. */
  cell?: (row: Row) => ReactNode;
  /** `end` right-aligns a numeric column. Default `start`. */
  align?: "start" | "end";
  /** A fixed Tailwind width class for the column, such as `w-16`. Unset: the
   * first column grows and the rest take `w-16`. */
  widthClass?: string;
}

export const MODEL_USAGE_COLUMNS: readonly DataTableColumn<ModelUsage>[] = [
  { id: "name", header: "Model" },
  { id: "context", header: "Context", align: "end" },
  { id: "cost", header: "Cost", align: "end" },
];

export interface DataTableProps<Row = ModelUsage> extends Omit<
  ComponentProps<"div">,
  "children"
> {
  rows: readonly Row[];
  /** Replays the row entrance animation when it changes. */
  cycle?: number;
  /** Unset: the ModelUsage columns (Model, Context, Cost), so `rows` must then
   * be `ModelUsage[]`. */
  columns?: readonly DataTableColumn<Row>[];
  /** Stable row key. Unset: the row's `name` when it has one, else its index. */
  getRowId?: (row: Row, index: number) => string;
  /** Kit slot above the header, for a filter box or any controls. The caller
   * owns the filtering: pass the already filtered `rows`. */
  toolbar?: ReactNode;
  /** Kit slot at the end of every row, for its action buttons. */
  rowActions?: (row: Row) => ReactNode;
  /** Accessible name for the actions column header cell. */
  rowActionsLabel?: string;
  /** Shown instead of the rows when `rows` is empty. Unset: nothing. */
  emptyLabel?: ReactNode;
}

function defaultRowId(row: unknown, index: number): string {
  const name = (row as { name?: unknown }).name;
  return typeof name === "string" ? name : String(index);
}

function cellText<Row>(column: DataTableColumn<Row>, row: Row): ReactNode {
  if (column.cell) return column.cell(row);
  const value = (row as Record<string, unknown>)[column.id];
  return value === undefined || value === null ? "" : String(value);
}

function initial(content: ReactNode): string {
  return typeof content === "string" || typeof content === "number"
    ? String(content).charAt(0)
    : "";
}

export function DataTable<Row = ModelUsage>({
  rows,
  cycle = 0,
  columns,
  getRowId = defaultRowId,
  toolbar,
  rowActions,
  rowActionsLabel = "Actions",
  emptyLabel,
  className,
  ...props
}: DataTableProps<Row>) {
  const cols = (columns ??
    (MODEL_USAGE_COLUMNS as unknown as readonly DataTableColumn<Row>[]));
  const widthOf = (column: DataTableColumn<Row>, index: number) =>
    column.widthClass ?? (index === 0 ? "flex-1" : "w-16");

  return (
    <div
      data-slot="data-table"
      className={cn(
        paper,
        "w-full max-w-sm overflow-hidden rounded-2xl text-[13px]",
        className,
      )}

      {...props}
    >
      {toolbar && (
        <div
          data-slot="data-table-toolbar"
          className="flex items-center gap-2 px-4 pt-3"
        >
          {toolbar}
        </div>
      )}
      <div className="flex items-center px-4 pt-3 pb-2">
        {cols.map((column, index) => (
          <span
            key={column.id}
            className={cn(
              mono,
              "text-muted-foreground",
              widthOf(column, index),
              column.align === "end" && "text-end",
            )}
          >
            {column.header}
          </span>
        ))}
        {rowActions && <span className="sr-only">{rowActionsLabel}</span>}
      </div>
      <div className="bg-foreground/[0.06] mx-4 h-px" />
      <div key={cycle}>
        {rows.length === 0 && emptyLabel !== undefined && (
          <p
            data-slot="data-table-empty"
            className="text-muted-foreground px-4 py-6 text-center"
          >
            {emptyLabel}
          </p>
        )}
        {rows.map((row, index) => (
          <div
            key={getRowId(row, index)}
            data-slot="data-table-row"
            className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both hover:bg-foreground/[0.03] flex items-center gap-2.5 px-4 py-2.5 transition-colors duration-300"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            {cols.map((column, columnIndex) =>
              columnIndex === 0 ? (
                <Fragment key={column.id}>
                  <span className="bg-foreground/[0.06] text-muted-foreground flex size-5 shrink-0 items-center justify-center rounded-md text-[9px] font-medium">
                    {initial(cellText(column, row))}
                  </span>
                  <span className="text-foreground/90 flex-1 truncate">
                    {cellText(column, row)}
                  </span>
                </Fragment>
              ) : (
                <span
                  key={column.id}
                  className={cn(
                    mono,
                    "text-muted-foreground tabular-nums",
                    widthOf(column, columnIndex),
                    column.align === "end" && "text-end",
                  )}
                >
                  {cellText(column, row)}
                </span>
              ),
            )}
            {rowActions && (
              <span
                data-slot="data-table-row-actions"
                className="flex shrink-0 items-center gap-1"
              >
                {rowActions(row)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
