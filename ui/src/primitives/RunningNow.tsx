// ACTIVITY-01d (home, 2026-10-06): the "Running now" trigger and panel.
// A shell-header icon button with a calm count, opening a panel of what
// is running for the viewer, what waits on them, and a folded list of
// what finished. On a phone the same content opens as a bottom sheet.
//
// Why a kit part: no shipped Element fits. `job-progress` and
// `background-inbox` loop a spinner (the ACTIVITY-01d verdict forbids a
// looping animation in any state), offer only Cancel (no Approve, Deny or
// Open), and set 13 px text under docs/UI.md's 16 px floor. This composes
// shipped primitives only (Button, Badge, Popover, Sheet, Progress,
// Collapsible) and takes data and copy as props, so the host writes words
// and wiring, never a component.
import { useId, useState, type ReactNode } from "react";
import { getIcon } from "@/kit/icons";
import { Badge } from "@/kit/ui/badge";
import { Button } from "@/kit/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/kit/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/kit/ui/popover";
import { Progress } from "@/kit/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/kit/ui/sheet";
import { useBreakpoint } from "@/kit/hooks/useBreakpoint";
import { cn } from "@/kit/utils";

export type RunningNowTone = "running" | "waiting" | "done" | "failed";

export interface RunningNowAction {
  /** Visible words ("Stop", "Approve", "Open"). The accessible name adds
   * the row's title so a screen reader hears which row it acts on. */
  label: string;
  onSelect: () => void;
  /** The one emphasised action in a row (Approve). */
  primary?: boolean;
  disabled?: boolean;
}

export interface RunningNowItem {
  id: string;
  title: string;
  /** One plain word or two beside the dot: "Working", "Needs you". Empty
   * shows none. */
  status: string;
  tone: RunningNowTone;
  /** A second line: "About a minute left", "Step 2 of 4". */
  detail?: string;
  /** 0 to 1. Omitted means no bar: never a made-up percentage. */
  progress?: number;
  actions?: readonly RunningNowAction[];
  /** Raw detail for the people allowed to see it, folded behind "Details". */
  details?: ReactNode;
}

export interface RunningNowProps {
  /** The trigger's accessible name; the count is appended to it. */
  label: string;
  heading: string;
  waitingHeading: string;
  doneLabel: (count: number) => string;
  emptyText: string;
  running: readonly RunningNowItem[];
  waiting: readonly RunningNowItem[];
  done: readonly RunningNowItem[];
  /** Defaults to running plus waiting. */
  count?: number;
  /** Polite live-region text the host sets on a start, finish or failure. */
  announcement?: string;
  detailsLabel?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

const ActivityIcon = getIcon("activity");
const ChevronDown = getIcon("chevron-down");

const toneDot: Record<RunningNowTone, string> = {
  running: "bg-primary",
  waiting: "bg-[var(--tint-attention-fg)]",
  done: "bg-[var(--hue-green)]",
  failed: "bg-destructive",
};

function Row({ item, detailsLabel }: { item: RunningNowItem; detailsLabel: string }) {
  const pct = item.progress === undefined ? undefined : Math.round(Math.max(0, Math.min(1, item.progress)) * 100);
  return (
    <li data-slot="running-now-item" data-tone={item.tone} className="flex flex-col gap-2 py-3">
      <div className="flex items-start gap-3">
        <span aria-hidden className={cn("mt-2 size-2 shrink-0 rounded-full", toneDot[item.tone])} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 text-base font-medium break-words">{item.title}</span>
            {item.status ? <span className="shrink-0 text-base text-muted-foreground">{item.status}</span> : null}
          </div>
          {item.detail ? <span className="text-base text-muted-foreground">{item.detail}</span> : null}
        </div>
      </div>
      {pct !== undefined ? (
        <Progress value={pct} aria-label={`${item.title} progress`} aria-valuenow={pct} className="ms-5 w-auto" />
      ) : null}
      {item.actions && item.actions.length > 0 ? (
        <div className="ms-5 flex flex-wrap gap-2">
          {item.actions.map((action, index) => (
            <Button
              key={`${index}-${action.label}`}
              type="button"
              size="sm"
              variant={action.primary ? "default" : "outline"}
              className="text-base"
              disabled={action.disabled}
              aria-label={`${action.label} ${item.title}`}
              onClick={action.onSelect}
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
      {item.details ? (
        <Collapsible className="ms-5">
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="sm" aria-label={`${detailsLabel}: ${item.title}`} className="group text-base text-muted-foreground">
              {detailsLabel}
              <ChevronDown aria-hidden className="size-4 group-data-[state=open]:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-1 rounded-md bg-muted p-2 text-base break-words text-muted-foreground">{item.details}</div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </li>
  );
}

function Body({ heading, waitingHeading, doneLabel, emptyText, running, waiting, done, detailsLabel, headingId, showHeading }: Pick<RunningNowProps, "heading" | "waitingHeading" | "doneLabel" | "emptyText" | "running" | "waiting" | "done"> & { detailsLabel: string; headingId: string; showHeading: boolean }) {
  const empty = running.length === 0 && waiting.length === 0;
  return (
    <div data-slot="running-now-body" className="flex flex-col gap-3">
      {showHeading ? <h2 id={headingId} className="text-base font-semibold">{heading}</h2> : null}
      {empty ? <p className="text-base text-muted-foreground">{emptyText}</p> : null}
      {waiting.length > 0 ? (
        <section aria-label={waitingHeading} className="rounded-xl border border-[var(--tint-attention-hairline)] bg-[var(--tint-attention)] px-3">
          <h3 className="pt-3 text-base font-medium">{waitingHeading}</h3>
          <ul className="flex flex-col divide-y divide-[var(--tint-attention-hairline)]">
            {waiting.map((item) => <Row key={item.id} item={item} detailsLabel={detailsLabel} />)}
          </ul>
        </section>
      ) : null}
      {running.length > 0 ? (
        <ul aria-label={heading} className="flex flex-col divide-y divide-border">
          {running.map((item) => <Row key={item.id} item={item} detailsLabel={detailsLabel} />)}
        </ul>
      ) : null}
      {done.length > 0 ? (
        <Collapsible className="border-t border-border pt-1">
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="group w-full justify-between text-base text-muted-foreground">
              {doneLabel(done.length)}
              <ChevronDown aria-hidden className="size-4 group-data-[state=open]:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="flex flex-col divide-y divide-border">
              {done.map((item) => <Row key={item.id} item={item} detailsLabel={detailsLabel} />)}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
}

export function RunningNow({
  label,
  heading,
  waitingHeading,
  doneLabel,
  emptyText,
  running,
  waiting,
  done,
  count,
  announcement,
  detailsLabel = "Details",
  open,
  defaultOpen,
  onOpenChange,
  className,
}: RunningNowProps) {
  const phone = useBreakpoint().tier === "phone";
  const headingId = useId();
  const [ownOpen, setOwnOpen] = useState(defaultOpen ?? false);
  const isOpen = open ?? ownOpen;
  const setOpen = (next: boolean) => {
    if (open === undefined) setOwnOpen(next);
    onOpenChange?.(next);
  };
  const shown = count ?? running.length + waiting.length;
  const name = shown > 0 ? `${label}, ${shown} ${shown === 1 ? "item" : "items"}` : label;

  const trigger = (
    <Button type="button" variant="ghost" size="icon-lg" aria-label={name} className={cn("relative rounded-full text-muted-foreground", className)}>
      <ActivityIcon aria-hidden className="size-5" />
      {shown > 0 ? (
        <Badge aria-hidden className="absolute -top-0.5 -end-0.5 h-5 min-w-5 rounded-full bg-foreground px-1 text-base leading-none text-background tabular-nums">
          {shown}
        </Badge>
      ) : null}
    </Button>
  );
  const body = { heading, waitingHeading, doneLabel, emptyText, running, waiting, done, detailsLabel, headingId };

  return (
    <>
      <span role="status" aria-live="polite" className="sr-only">{announcement ?? ""}</span>
      {phone ? (
        <Sheet open={isOpen} onOpenChange={setOpen}>
          <SheetTrigger asChild>{trigger}</SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl">
            <SheetHeader className="pb-0">
              <SheetTitle className="text-base">{heading}</SheetTitle>
              <SheetDescription className="sr-only">{label}</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-6">
              <Body {...body} showHeading={false} />
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Popover open={isOpen} onOpenChange={setOpen}>
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            aria-labelledby={headingId}
            className="max-h-[min(36rem,calc(100dvh-6rem))] w-[24rem] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl p-4 motion-reduce:animate-none"
          >
            <Body {...body} showHeading />
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}
