// The Stack's "memory in use right now" card: one stacked, colored bar of the whole computer (each running feature, other programs, free), a legend
// with each part's size and share, and the share of the AI budget in use. The Stack's admin page and Home's Settings both draw this one component
// and feed it the Stack's own readings (`resources/summary` and `resources/engines`), so the two can never show different numbers or colors.
import { StatusIndicator } from "@/kit/ui/status";
import { Progress } from "@/kit/ui/progress";
import { formatBytes } from "@/kit/format";
import { cn } from "@/kit/utils";
import { i18n } from "@/kit/i18n";
import { stackMemorySegments, stackPressureWord, stackShareText } from "./stackMemory";
import type { StackMemoryEngine, StackMemoryReading } from "./stackMemory";

export interface StackMemoryNowProps {
  /** The Stack's latest reading of the computer; null before its first sample. */
  current: StackMemoryReading | null;
  /** The Stack's engines with what each holds; null while that list has not loaded. */
  engines: readonly StackMemoryEngine[] | null;
  /** The most memory the Stack lets its engines use, in bytes; absent, the budget line is left out. */
  budgetBytes?: number | null;
  /** A model's plain name by its id, shown beside the feature. */
  modelName?: (id: string | null) => string | null;
  /** The Stack's feature order, so a feature keeps its color everywhere. */
  featureOrder?: readonly string[];
  /** Given, a feature's slice and legend row open its detail; absent, the bar is a picture only. */
  onOpenRole?: (role: string) => void;
  /** False draws no border or padding, for a page that already puts this in its own card. */
  framed?: boolean;
  className?: string;
}

const stateWord = (state: StackMemoryEngine["state"]): string => {
  switch (state) {
    case "running": return i18n._({ id: "ui.in use", message: "in use" });
    case "loading": return i18n._({ id: "ui.loading", message: "loading" });
    case "queued": return i18n._({ id: "ui.waiting", message: "waiting" });
    default: return i18n._({ id: "ui.ready", message: "ready" });
  }
};

export function StackMemoryNow({ current, engines, budgetBytes, modelName, featureOrder, onOpenRole, framed = true, className }: StackMemoryNowProps) {
  const rows = engines ?? [];
  const segments = stackMemorySegments(current, rows, modelName, featureOrder);
  const total = current?.total ?? 0;
  const used = current?.used ?? 0;
  const pressure = stackPressureWord(current?.pressure);
  const held = rows.reduce((n, r) => n + r.memory_bytes, 0);
  const cap = budgetBytes ?? 0;
  const title = i18n._({ id: "ui.Memory in use right now", message: "Memory in use right now" });
  const split = segments.map((s) => `${s.label} ${formatBytes(s.bytes)}`).join(", ");
  return (
    <div data-testid="stack-memory-now" className={cn("flex min-w-0 flex-col gap-4", framed && "rounded-xl border bg-card p-4 sm:p-5", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            {current ? i18n._({ id: "ui.{used} of {total}", message: "{used} of {total}", values: { used: formatBytes(used), total: formatBytes(total) } }) : i18n._({ id: "ui.No reading yet", message: "No reading yet" })}
          </p>
        </div>
        {current ? <span className="inline-flex items-center gap-2 text-sm" data-testid="stack-memory-pressure"><StatusIndicator status={pressure.kind} ping={false} />{pressure.word}</span> : null}
      </div>
      {current ? (
        <>
          <div className="flex h-5 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={i18n._({ id: "ui.Memory split: {split}", message: "Memory split: {split}", values: { split } })}>
            {segments.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={s.kind !== "role" || !onOpenRole}
                onClick={() => onOpenRole?.(s.id)}
                title={`${s.label}: ${formatBytes(s.bytes)}, ${stackShareText(s.bytes, total)}`}
                aria-label={`${s.label}, ${formatBytes(s.bytes)}`}
                data-testid={`stack-memory-segment-${s.id}`}
                className="h-full min-w-0 cursor-default border-e border-card outline-none transition-[width] duration-500 last:border-e-0 enabled:cursor-pointer focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                style={{ width: `${s.percent}%`, background: s.color }}
              />
            ))}
          </div>
          <ul className="grid grid-cols-1 gap-x-8 gap-y-1 text-sm lg:grid-cols-2" aria-label={i18n._({ id: "ui.Where memory is going", message: "Where memory is going" })}>
            {segments.filter((s) => s.bytes > 0).map((s) => {
              const row = rows.find((r) => r.role === s.id);
              const body = (
                <>
                  <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="min-w-0 flex-1 truncate">
                    {s.label}
                    {s.detail ? <span className="text-muted-foreground"> · {s.detail}</span> : null}
                    {row ? <span className="text-muted-foreground"> · {stateWord(row.state)}</span> : null}
                  </span>
                  <span className="tabular-nums">{formatBytes(s.bytes)}</span>
                  <span className="w-12 text-end text-muted-foreground tabular-nums">{stackShareText(s.bytes, total)}</span>
                </>
              );
              return (
                <li key={s.id}>
                  {row && onOpenRole
                    ? <button type="button" onClick={() => onOpenRole(s.id)} className="flex min-h-9 w-full items-center gap-2 rounded-md text-start outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">{body}</button>
                    : <div className="flex min-h-9 items-center gap-2">{body}</div>}
                </li>
              );
            })}
          </ul>
          {cap > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm">{i18n._({ id: "ui.Share of the AI budget in use", message: "Share of the AI budget in use" })}</p>
              <Progress value={Math.min(100, Math.round((held / cap) * 100))} aria-label={i18n._({ id: "ui.Share of the AI budget in use", message: "Share of the AI budget in use" })} />
              <p className="text-xs text-muted-foreground">
                {i18n._({ id: "ui.The Stack's engines hold {held} of their {cap} budget. The budget is the most memory the Stack lets itself use, so there is always room left for everything else.", message: "The Stack's engines hold {held} of their {cap} budget. The budget is the most memory the Stack lets itself use, so there is always room left for everything else.", values: { held: formatBytes(held), cap: formatBytes(cap) } })}
              </p>
            </div>
          ) : null}
          {engines && rows.every((r) => r.memory_bytes <= 0) ? <p className="text-sm text-muted-foreground">{i18n._({ id: "ui.No engine is loaded right now, so the Stack itself holds almost nothing. A feature loads its engine the first time it is used.", message: "No engine is loaded right now, so the Stack itself holds almost nothing. A feature loads its engine the first time it is used." })}</p> : null}
        </>
      ) : <p className="text-sm text-muted-foreground">{i18n._({ id: "ui.The Stack has not taken its first memory reading yet. It samples every 5 seconds, so this fills in on its own.", message: "The Stack has not taken its first memory reading yet. It samples every 5 seconds, so this fills in on its own." })}</p>}
    </div>
  );
}
