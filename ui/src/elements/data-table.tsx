"use client";

import { Fragment, type ComponentProps, type ReactNode } from "react";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "../ui/button";
import { safeHref } from "./href";
import { mono, paper } from "./surfaces";

export interface ModelUsage {
  name: string;
  context: string;
  cost: string;
}

/** Formatting applied to a generic table column. Defaults to plain text. */
export type DataTableFormat =
  | { kind: "text" }
  | { kind: "number"; decimals?: number; compact?: boolean; unit?: string }
  | { kind: "currency"; currency: string; decimals?: number; compact?: boolean }
  | { kind: "percent"; decimals?: number; basis?: "fraction" | "unit" }
  | { kind: "delta"; decimals?: number; unit?: string; upIsGood?: boolean }
  | { kind: "date"; style?: "date" | "datetime" | "relative" }
  | { kind: "boolean"; trueLabel?: string; falseLabel?: string }
  | { kind: "link"; hrefKey?: string }
  | { kind: "badge"; tones?: Readonly<Record<string, "neutral" | "success" | "warning" | "danger">> }
  | { kind: "list"; max?: number };

export interface DataTableColumn<Row> {
  id: string;
  header: ReactNode;
  /** What the cell shows. Unset: `String(row[id])`. */
  cell?: (row: Row) => ReactNode;
  /** `end` right-aligns a numeric column. Default `start`. */
  align?: "start" | "end";
  /** Minimum desktop column width in pixels. Ignored in card mode. */
  minWidth?: number;
  /** Show the sortable header control. The caller owns sorting the rows. */
  sortable?: boolean;
  /** Format this column's value. Unset: render its plain text value. */
  format?: DataTableFormat;
}

export interface DataTableSort {
  columnId: string;
  direction: "asc" | "desc";
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
  /** Accessible name for the table. */
  caption?: string;
  /** Current controlled sort. The caller sorts `rows` to match this value. */
  sort?: DataTableSort | null;
  /** Receives the next controlled sort state when a sortable header is pressed. */
  onSortChange?: (sort: DataTableSort | null) => void;
  /** Kit slot above the header, for a filter box or any controls. The caller
   * owns the filtering: pass the already filtered `rows`. */
  toolbar?: ReactNode;
  /** Kit slot at the end of every row, for its action buttons. */
  rowActions?: (row: Row) => ReactNode;
  /** Accessible name for the actions column header cell. */
  rowActionsLabel?: string;
  /** Per-column upstream format defaults keyed by column id. A column's own
   * `format` takes precedence. Unset: plain text values. */
  formats?: Readonly<Record<string, DataTableFormat>>;
  /** Shown instead of the rows when `rows` is empty. Unset: nothing. */
  emptyLabel?: ReactNode;
  /** Locale for numeric and date formatting. Unset: the runtime default locale. */
  locale?: string;
  /** Reference time in milliseconds for relative dates. Unset: now. */
  relativeTo?: number;
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

function formatCell<Row>(column: DataTableColumn<Row>, row: Row, locale: string, relativeTo: number, formats?: Readonly<Record<string, DataTableFormat>>): ReactNode {
  const format = column.format ?? formats?.[column.id];
  if (column.cell || !format || format.kind === "text") return cellText(column, row);
  const value = (row as Record<string, unknown>)[column.id];
  if (value === undefined || value === null) return "";
  const raw = Array.isArray(value) ? value.join(", ") : String(value);
  if (format.kind === "boolean") return value ? (format.trueLabel ?? "Yes") : (format.falseLabel ?? "No");
  if (format.kind === "list") {
    const values = Array.isArray(value) ? value : [value];
    const shown = values.slice(0, Math.max(0, format.max ?? values.length));
    return shown.join(", ") + (shown.length < values.length ? ` +${values.length - shown.length}` : "");
  }
  if (format.kind === "badge") {
    const tone = format.tones?.[raw] ?? "neutral";
    const toneClass = tone === "success" ? "text-emerald-700 dark:text-emerald-300" : tone === "warning" ? "text-amber-700 dark:text-amber-300" : tone === "danger" ? "text-red-700 dark:text-red-300" : "text-muted-foreground";
    return <span data-tone={tone} className={toneClass}>{raw}</span>;
  }
  if (format.kind === "link") {
    const hrefValue = format.hrefKey ? (row as Record<string, unknown>)[format.hrefKey] : value;
    const href = safeHref(typeof hrefValue === "string" ? hrefValue : undefined);
    return href ? <a href={href} className="underline underline-offset-2">{raw}</a> : raw;
  }
  if (typeof value !== "number" && typeof value !== "string") return raw;
  const number = typeof value === "number" ? value : Number(value);
  const decimals = "decimals" in format ? format.decimals : undefined;
  const numberFormat = (options: Intl.NumberFormatOptions = {}) => {
    try { return new Intl.NumberFormat(locale, { maximumFractionDigits: decimals, ...options }).format(number); }
    catch { return raw; }
  };
  if (format.kind === "number") return `${numberFormat({ notation: format.compact ? "compact" : "standard" })}${format.unit ? ` ${format.unit}` : ""}`;
  if (format.kind === "currency") return numberFormat({ style: "currency", currency: format.currency, notation: format.compact ? "compact" : "standard" });
  if (format.kind === "percent") return format.basis === "unit" ? `${numberFormat({ maximumFractionDigits: format.decimals })}%` : numberFormat({ style: "percent", maximumFractionDigits: format.decimals });
  if (format.kind === "delta") return `${numberFormat({ signDisplay: "always" })}${format.unit ? ` ${format.unit}` : ""}`;
  if (format.kind === "date") {
    const date = new Date(typeof value === "number" ? value : Date.parse(value));
    if (Number.isNaN(date.getTime())) return raw;
    if (format.style === "relative") {
      const seconds = Math.round((date.getTime() - relativeTo) / 1000);
      const [amount, unit] = Math.abs(seconds) < 60 ? [seconds, "second"] : Math.abs(seconds) < 3600 ? [Math.round(seconds / 60), "minute"] : Math.abs(seconds) < 86400 ? [Math.round(seconds / 3600), "hour"] : [Math.round(seconds / 86400), "day"];
      try { return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(amount, unit as Intl.RelativeTimeFormatUnit); } catch { return raw; }
    }
    try { return new Intl.DateTimeFormat(locale, format.style === "datetime" ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date); } catch { return raw; }
  }
  return raw;
}

function columnMinWidth<Row>(column: DataTableColumn<Row>) {
  return column.minWidth === undefined
    ? undefined
    : { minWidth: column.minWidth };
}

function initial(content: ReactNode): string {
  return typeof content === "string" || typeof content === "number"
    ? String(content).charAt(0)
    : "";
}

function nextSort(
  sort: DataTableSort | null | undefined,
  columnId: string,
): DataTableSort | null {
  if (sort?.columnId !== columnId) return { columnId, direction: "asc" };
  if (sort.direction === "asc") return { columnId, direction: "desc" };
  return null;
}

function headerText(header: ReactNode, fallback: string): string {
  return typeof header === "string" || typeof header === "number"
    ? String(header)
    : fallback;
}

export function DataTable<Row = ModelUsage>({
  rows,
  cycle = 0,
  columns,
  getRowId = defaultRowId,
  caption,
  sort,
  onSortChange,
  toolbar,
  rowActions,
  rowActionsLabel = "Actions",
  formats,
  emptyLabel,
  locale,
  relativeTo,
  className,
  ...props
}: DataTableProps<Row>) {
  const { "aria-label": inheritedLabel, ...rootProps } = props;
  const genericMode = columns !== undefined;
  const formatLocale = locale ?? Intl.DateTimeFormat().resolvedOptions().locale;
  const formatRelativeTo = relativeTo ?? Date.now();
  const cols = (columns ??
    (MODEL_USAGE_COLUMNS as unknown as readonly DataTableColumn<Row>[]));
  const widthOf = (index: number) => (index === 0 ? "flex-1" : "w-16");
  const ariaSortFor = (column: DataTableColumn<Row>) => {
    if (!column.sortable) return undefined;
    if (sort?.columnId !== column.id) return "none" as const;
    return sort.direction === "asc"
      ? "ascending" as const
      : "descending" as const;
  };
  const sortButton = (column: DataTableColumn<Row>) => {
    const active = sort?.columnId === column.id;
    const icon = active
      ? sort?.direction === "asc"
        ? <ArrowUpIcon aria-hidden="true" className="size-3" />
        : <ArrowDownIcon aria-hidden="true" className="size-3" />
      : <ArrowUpDownIcon aria-hidden="true" className="size-3" />;
    return (
      <Button
        type="button"
        variant="ghost"
        size="xs"
        aria-label={`Sort by ${headerText(column.header, column.id)}`}
        onClick={() => onSortChange?.(nextSort(sort, column.id))}
      >
        {column.header}
        {icon}
      </Button>
    );
  };
  const sortableColumns = cols.filter((column) => column.sortable);
  const tableRows = (
    <div
      key={cycle}
      role="rowgroup"
      data-slot="data-table-body"
      className={genericMode ? "hidden @md:block" : ""}
    >
      {rows.length === 0 && emptyLabel !== undefined && (
        <div role="row" data-slot="data-table-empty-row">
          <p
            role="cell"
            data-slot="data-table-empty"
            className="text-muted-foreground px-4 py-6 text-center"
          >
            {emptyLabel}
          </p>
        </div>
      )}
      {rows.map((row, index) => (
        <div
          key={getRowId(row, index)}
          role="row"
          data-slot="data-table-row"
          className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both hover:bg-foreground/[0.03] flex items-center gap-2.5 px-4 py-2.5 transition-colors duration-300"
          style={{ animationDelay: `${index * 80}ms` }}
        >
          {cols.map((column, columnIndex) => {
            const value = formatCell(column, row, formatLocale, formatRelativeTo, formats);
            return columnIndex === 0 && !genericMode ? (
              <Fragment key={column.id}>
                <span
                  data-slot="data-table-initial"
                  aria-hidden="true"
                  className="bg-foreground/[0.06] text-muted-foreground flex size-5 shrink-0 items-center justify-center rounded-md text-[9px] font-medium"
                >
                  {initial(value)}
                </span>
                <span
                  role="cell"
                  className="text-foreground/90 flex-1 truncate"
                >
                  {value}
                </span>
              </Fragment>
            ) : (
              <span
                key={column.id}
                role="cell"
                style={columnMinWidth(column)}
                className={cn(
                  columnIndex === 0 ? "text-foreground/90 truncate" : mono,
                  columnIndex > 0 && "text-muted-foreground tabular-nums",
                  widthOf(columnIndex),
                  column.align === "end" && "text-end",
                )}
              >
                {value}
              </span>
            );
          })}
          {rowActions && (
            <span
              role="cell"
              data-slot="data-table-row-actions"
              className="flex shrink-0 items-center gap-1"
            >
              {rowActions(row)}
            </span>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div
      data-slot="data-table"
      className={cn(
        paper,
        genericMode
          ? "@container w-full overflow-hidden rounded-2xl text-[13px]"
          : "@container w-full max-w-sm overflow-hidden rounded-2xl text-[13px]",
        className,
      )}
      {...rootProps}
    >
      {toolbar && (
        <div
          data-slot="data-table-toolbar"
          className="flex items-center gap-2 px-4 pt-3"
        >
          {toolbar}
        </div>
      )}
      <div role="table" aria-label={caption ?? inheritedLabel} className="w-full">
      <div
        role="rowgroup"
        data-slot="data-table-header-group"
      >
        <div
          role="row"
          data-slot="data-table-header-row"
          className={cn(
            "flex items-center px-4 pt-3 pb-2",
            genericMode && "hidden @md:flex",
          )}
        >
          {cols.map((column, index) => (
            <span
              key={column.id}
              role="columnheader"
              aria-sort={ariaSortFor(column)}
              style={columnMinWidth(column)}
              className={cn(
                mono,
                "text-muted-foreground",
                widthOf(index),
                column.align === "end" && "text-end",
              )}
            >
              {column.sortable ? sortButton(column) : column.header}
            </span>
          ))}
          {rowActions && (
            <span role="columnheader" className="sr-only">
              {rowActionsLabel}
            </span>
          )}
        </div>
        {genericMode && sortableColumns.length > 0 && (
          <div
            role="row"
            data-slot="data-table-mobile-sort"
            className="flex flex-wrap items-center gap-1 px-4 pt-3 @md:hidden"
          >
            {sortableColumns.map((column) => (
              <span
                key={column.id}
                role="columnheader"
                aria-sort={ariaSortFor(column)}
              >
                {sortButton(column)}
              </span>
            ))}
          </div>
        )}
        <div
          aria-hidden="true"
          className={cn(
            "bg-foreground/[0.06] mx-4 h-px",
            genericMode && "hidden @md:block",
          )}
        />
      </div>
      {tableRows}
      {genericMode && (
        <div
          role="rowgroup"
          data-slot="data-table-cards"
          className="@md:hidden"
        >
          {rows.length === 0 && emptyLabel !== undefined && (
            <div role="row" data-slot="data-table-empty-row">
              <p
                role="cell"
                data-slot="data-table-empty"
                className="text-muted-foreground px-4 py-6 text-center"
              >
                {emptyLabel}
              </p>
            </div>
          )}
          {rows.map((row, index) => (
            <div
              key={getRowId(row, index)}
              role="row"
              data-slot="data-table-card-row"
              className="border-foreground/[0.06] flex flex-col gap-2 border-b px-4 py-3 last:border-b-0"
            >
              {cols.map((column) => (
                <div
                  key={column.id}
                  className="flex items-start justify-between gap-4"
                >
                  <span
                    role="columnheader"
                    className={cn(mono, "text-muted-foreground")}
                  >
                    {column.header}
                  </span>
                  <span role="cell" className="text-foreground/90 text-end">
                    {formatCell(column, row, formatLocale, formatRelativeTo, formats)}
                  </span>
                </div>
              ))}
              {rowActions && (
                <div
                  role="cell"
                  data-slot="data-table-card-actions"
                  className="flex items-center justify-end gap-1 pt-1"
                >
                  <span className="sr-only">{rowActionsLabel}</span>
                  {rowActions(row)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
