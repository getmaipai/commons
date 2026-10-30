"use client";

import { useEffect, useId, useRef, type ComponentProps, type ReactNode } from "react";
import { SearchIcon } from "lucide-react";
import { cn } from "cn";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { field, floating, mono } from "./surfaces";
import { SafeImage } from "../primitives/SafeImage";

export interface PaletteCommand {
  id: string;
  label: string;
  group: string;
  keys: readonly string[];
  /** Optional detail shown beneath the command label. */
  subtitle?: string;
  /** Optional icon component or image URL for the result tile. */
  icon?: ComponentProps<"span">["children"];
  iconUrl?: string;
  /** [start, end) of the part of `label` to emphasize, e.g. the matched text of a search. */
  match?: readonly [number, number];
  /** A small label above the title naming where the result lives, e.g. "Wikipedia". Makes the row a rich card. */
  source?: string;
  /** Up to two lines of text under the title, e.g. a search snippet. Makes the row a rich card. */
  description?: string;
  /** A line of facts under the description, e.g. "Article · 12 min read". */
  meta?: string;
  /** A picture shown at the end of a rich card. */
  thumbnailUrl?: string;
  /** Text of a button-looking affordance shown on the active row; running the row does what it says. */
  actionLabel?: string;
}

export interface PaletteTab {
  id: string;
  label: string;
  /** A tab whose results are fetched only when the person presses Enter, never while they type (e.g. a web search, where
   * each query leaves the house). Enter calls `onSubmitQuery` until `submittedQuery` matches the query, then runs the active row. */
  submit?: boolean;
}

export type CommandPaletteDialogProps = Omit<ComponentProps<typeof CommandPalette>, "className" | "size"> & {
  size?: "default" | "lg";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
};

export function CommandPaletteDialog({
  open,
  onOpenChange,
  title,
  size = "default",
  ...paletteProps
}: CommandPaletteDialogProps) {
  const returnFocusRef = useRef<HTMLElement | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant="command"
        size={size}
        showCloseButton={false}
        aria-describedby={undefined}
        onOpenAutoFocus={() => {
          returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
          returnFocusRef.current = null;
        }}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <CommandPalette size={size} {...paletteProps} />
      </DialogContent>
    </Dialog>
  );
}

export function CommandPalette({
  commands,
  query,
  activeId,
  onQueryChange,
  onActiveChange,
  onRun,
  size = "default",
  placeholder = "Type a command",
  prefiltered = false,
  emptyMessage,
  tabs,
  activeTab,
  onTabChange,
  onSubmitQuery,
  submittedQuery,
  footer,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  | "children"
  | "commands"
  | "query"
  | "activeId"
  | "onQueryChange"
  | "onActiveChange"
  | "onRun"
> & {
  commands: readonly PaletteCommand[];
  query: string;
  activeId: string;
  onQueryChange?: (query: string) => void;
  onActiveChange?: (id: string) => void;
  onRun?: (id: string) => void;
  // "lg" fills a wide dialog at a fixed viewport-bound height; the list scrolls inside.
  size?: "default" | "lg";
  /** Input placeholder and accessible name; a search caller says "Search". */
  placeholder?: string;
  /** True when the caller already filtered and ranked `commands` (a server search): they all show, in the caller's order. */
  prefiltered?: boolean;
  /** Replaces the empty-result line, which otherwise names the query as a command. */
  emptyMessage?: string;
  /** A row of tabs under the input; the caller filters `commands` for the active one. */
  tabs?: readonly PaletteTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  /** Called with the query when Enter is pressed on a `submit` tab whose results are not yet for this query. */
  onSubmitQuery?: (query: string) => void;
  /** The query the caller last submitted; once it equals the query, Enter runs the active row instead of submitting. */
  submittedQuery?: string;
  /** A line under the list, e.g. a hint about keys. */
  footer?: ReactNode;
}) {
  const listId = useId();
  const optionId = (id: string) => `${listId}-${id}`;
  const matches = prefiltered
    ? commands
    : commands.filter((command) =>
        command.label.toLowerCase().includes(query.toLowerCase()),
      );
  const groups = [...new Set(matches.map((command) => command.group))];
  // display order, which is grouped and so differs from the filter order
  const ordered = groups.flatMap((group) =>
    matches.filter((command) => command.group === group),
  );

  const move = (delta: number) => {
    if (ordered.length === 0) return;
    const at = ordered.findIndex((command) => command.id === activeId);
    // activeId can be filtered out by the query; start from the edge the key implies
    const from = at === -1 ? (delta > 0 ? -1 : 0) : at;
    const next = ordered[(from + delta + ordered.length) % ordered.length];
    if (next && onActiveChange) onActiveChange(next.id);
  };

  // aria-activedescendant moves the highlight without moving focus, and only
  // focus scrolls; the list is short enough to walk the active row out of view.
  useEffect(() => {
    document
      .getElementById(optionId(activeId))
      ?.scrollIntoView({ block: "nearest" });
  }, [activeId, listId]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const submitTab = tabs?.find((tab) => tab.id === activeTab)?.submit === true;
      if (submitTab && query.trim() !== "" && query.trim() !== submittedQuery) {
        onSubmitQuery?.(query.trim());
        return;
      }
      const active = ordered.find((command) => command.id === activeId);
      if (active && onRun) onRun(active.id);
    }
  };

  return (
    <div
      data-slot="command-palette"
      className={cn(
        floating,
        "flex w-full flex-col overflow-hidden rounded-[24px] shadow-xl ring-1 ring-border/60 backdrop-blur-2xl",
        size === "lg"
          ? "h-[min(40rem,calc(100dvh-4rem))] max-w-none"
          : "max-w-xl",
        className,
      )}

      {...props}
    >
      <div className="border-foreground/[0.07] flex items-center gap-4 border-b px-6 py-5">
        <SearchIcon aria-hidden className="text-muted-foreground size-6 shrink-0" />
        <input
          value={query}
          onChange={(event) => onQueryChange?.(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          role="combobox"
          aria-expanded={ordered.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            ordered.some((command) => command.id === activeId)
              ? optionId(activeId)
              : undefined
          }
          className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-xl outline-none"
        />
        <span
          className={cn(
            field,
            mono,
            "text-muted-foreground rounded px-1.5 py-0.5",
          )}
        >
          esc
        </span>
      </div>

      {tabs && tabs.length > 0 ? (
        <div role="tablist" aria-label="Result type" className="border-foreground/[0.07] flex gap-5 overflow-x-auto border-b px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={tab.id === activeTab}
              tabIndex={-1}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onTabChange?.(tab.id)}
              className={cn(
                "-mb-px shrink-0 border-b-2 py-2.5 text-sm transition-colors",
                tab.id === activeTab ? "border-primary text-foreground font-medium" : "text-muted-foreground hover:text-foreground border-transparent",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      <div
        id={listId}
        role="listbox"
        aria-label="Commands"
        className={cn(
          "flex flex-col overflow-y-auto px-3 py-2",
          size === "lg" ? "min-h-0 flex-1" : "max-h-72",
        )}
      >
        {groups.map((group) => (
          <div
            key={group}
            role="group"
            aria-label={group}
              className="flex flex-col gap-1 pb-2"
          >
            <span
              aria-hidden
              className={cn(mono, "text-muted-foreground px-3 pt-3 pb-1 text-[10px] font-medium uppercase tracking-wider")}
            >
              {group}
            </span>
            {matches
              .filter((command) => command.group === group)
              .map((command) => {
                const rich = Boolean(command.description || command.source || command.thumbnailUrl);
                const className = cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-start transition-colors",
                  rich ? "min-h-20 py-3" : "min-h-14",
                  command.id === activeId
                    ? "bg-accent text-accent-foreground"
                    : onRun
                      ? "hover:bg-foreground/[0.03]"
                      : undefined,
                );
                const content = (
                  <>
                    {command.iconUrl ? (
                      <SafeImage src={command.iconUrl} alt="" className="size-8 shrink-0 rounded-lg object-cover" />
                    ) : command.icon ? (
                      <span className="bg-foreground/[0.05] text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4">{command.icon}</span>
                    ) : (
                      <span aria-hidden className="bg-foreground/[0.05] size-8 shrink-0 rounded-lg" />
                    )}
                    <span className="flex min-w-0 flex-1 flex-col">
                      {command.source ? <span className="text-muted-foreground truncate text-xs">{command.source}</span> : null}
                      <span className={cn("text-sm font-medium", rich ? "" : "truncate")}>{highlighted(command.label, command.match)}</span>
                      {command.subtitle ? <span className="text-muted-foreground truncate text-xs">{command.subtitle}</span> : null}
                      {command.description ? <span className="text-muted-foreground line-clamp-2 text-xs">{command.description}</span> : null}
                      {command.meta ? <span className="text-muted-foreground truncate pt-1 text-xs">{command.meta}</span> : null}
                    </span>
                    {command.thumbnailUrl ? <SafeImage src={command.thumbnailUrl} alt="" className="h-16 w-28 shrink-0 rounded-lg object-cover" /> : null}
                    {command.actionLabel && command.id === activeId ? (
                      <span className={cn(field, "text-foreground shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium")}>{command.actionLabel}</span>
                    ) : null}
                    <span className="flex shrink-0 gap-1">
                      {command.keys.map((key) => (
                        <span
                          key={key}
                          className={cn(
                            field,
                            mono,
                            "text-muted-foreground rounded-md px-1.5 py-0.5",
                          )}
                        >
                          {key}
                        </span>
                      ))}
                    </span>
                  </>
                );

                return onRun ? (
                  <button
                    key={command.id}
                    id={optionId(command.id)}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={command.id === activeId}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onRun(command.id)}
                    className={className}
                  >
                    {content}
                  </button>
                ) : (
                  <div
                    key={command.id}
                    id={optionId(command.id)}
                    role="option"
                    aria-selected={command.id === activeId}
                    className={className}
                  >
                    {content}
                  </div>
                );
              })}
          </div>
        ))}
      </div>
      {matches.length === 0 && (
        <div className="border-foreground/[0.07] border-t p-1.5">
          <span className="text-muted-foreground block px-2 py-4 text-center text-xs break-words">
            {emptyMessage ?? `No command matches “${query}”`}
          </span>
        </div>
      )}
      {footer ? <div className="border-foreground/[0.07] text-muted-foreground border-t px-6 py-3 text-center text-xs">{footer}</div> : null}
    </div>
  );
}

function highlighted(label: string, match: PaletteCommand["match"]) {
  if (!match || match[0] < 0 || match[1] > label.length || match[0] >= match[1]) return label;
  return (
    <>
      {label.slice(0, match[0])}
      <mark className="bg-transparent font-semibold text-inherit underline decoration-primary/60 underline-offset-2">{label.slice(match[0], match[1])}</mark>
      {label.slice(match[1])}
    </>
  );
}
