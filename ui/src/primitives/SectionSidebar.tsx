import { useCallback, useEffect, useId, useRef, useState, type ComponentProps, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { getIcon } from "@/kit/icons";
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../dashboard/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../elements/ui/tooltip";
import { cn } from "../dashboard/lib/utils";
import { HitField } from "../settings/HitField";
import { Chip } from "./Chip";
import { SafeImage } from "./SafeImage";

const SearchIcon = getIcon("search");
const HideIcon = getIcon("panel-left-close");
const ShowIcon = getIcon("panel-left-open");
const PinIcon = getIcon("pin");
const PlusIcon = getIcon("plus");
/** Chat's New chat pill: a 36px row, 10px inset, 8px icon gap, 14px label. */
const primaryClass = "relative flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm font-normal text-sidebar-foreground outline-none hover:bg-settings-fill/60 focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:pointer-events-none disabled:opacity-50";

/** The pointer must rest on the hidden column's edge zone this long before it peeks; it closes this long after the pointer leaves
 * (the same numbers as Chat's column, COLUMN-02). */
export const SECTION_SIDEBAR_PEEK_OPEN_DELAY_MS = 120;
export const SECTION_SIDEBAR_PEEK_CLOSE_GRACE_MS = 150;
const PEEK_OPEN_DELAY_MS = SECTION_SIDEBAR_PEEK_OPEN_DELAY_MS;
const PEEK_CLOSE_GRACE_MS = SECTION_SIDEBAR_PEEK_CLOSE_GRACE_MS;
/** The hidden column's show button (`SectionSidebarShowButton`) tells the column it names in `controls` to peek or stop peeking, the way Chat's header toggle does. */
const PEEK_EVENT = "section-sidebar-peek";
const POPUP_OPEN = '[aria-expanded="true"][aria-haspopup]';

/** One row of the column: a link a person can open in a new tab, with its icon (or a picture the host serves) and label. */
export interface SectionSidebarItem {
  id: string;
  label: string;
  /** A kit icon name. */
  icon?: string;
  /** A picture the host serves for this row (never another site's address); drawn in place of the icon. */
  media?: string;
  href?: string;
  active?: boolean;
  /** Written to the row as `data-kind`. */
  kind?: string;
  /** The id of an element that describes the row (the settings arrow rows use it). */
  describedBy?: string;
  /** Drawn after the label (an arrow, a count). */
  trailing?: ReactNode;
  onClick?: (event: MouseEvent) => void;
  /** In the collapsed rail, where the label and `trailing` are hidden: draw a small dot to say the row has something new (a count above zero). */
  dot?: boolean;
}

export interface SectionSidebarGroup {
  id: string;
  /** The small label above the rows; a group with none draws its rows alone. */
  label?: string;
  items: readonly SectionSidebarItem[];
}

export interface SectionSidebarSearch {
  value: string;
  onChange: (value: string) => void;
  /** The field's accessible name and placeholder. */
  label: string;
  /** Pressing Enter in the field. */
  onSubmit?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  /** Recent searches, drawn as chips under the field; the host passes them only while it wants them shown (focused, field empty). */
  recents?: readonly { key: string; label: string }[];
  /** A recent search chosen. */
  onRecent?: (label: string) => void;
}

export interface SectionSidebarCollapseLabels {
  /** The button that collapses the column. Default "Hide sidebar". */
  hide: string;
  /** The button that expands a collapsed rail. Default "Show sidebar". */
  show: string;
  /** The button inside a peeking (hidden) column that docks it again. Default "Keep sidebar open". */
  pin: string;
}

export interface SectionSidebarProps {
  /** The rows. Omit them when `body` draws the column's content instead. */
  groups?: readonly SectionSidebarGroup[];
  /** Replaces `groups` as the column's scrolling content (Chat draws its conversation list here). */
  body?: ReactNode;
  /** Icon buttons or links drawn after the title on the same line (Chat settings, a search toggle); hidden in the rail. */
  headerActions?: ReactNode;
  /** The row under the header that starts a new item (Chat's "New chat"), drawn as Chat's compact pill. Compact columns only. */
  primaryAction?: { label: string; href?: string; onClick?: (event: MouseEvent) => void; disabled?: boolean };
  /** Rows pinned to the foot of the column, drawn like group rows (an app's Settings link). In the rail they are icon-only. */
  footer?: readonly SectionSidebarItem[];
  /** Anything else for the foot of the column, drawn under `footer`; the host owns how it looks when the rail is collapsed (it is hidden in the rail unless `footerInRail`). */
  footerSlot?: ReactNode;
  footerInRail?: boolean;
  /** Controlled collapse state. The kit holds no storage: the host remembers it per person and passes it back. */
  collapsed?: boolean;
  /** Called by the collapse, expand and keep-open buttons and by the rail's search button. Passing it draws the collapse button. */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** The same state as `collapsed`, named the way Chat's "keep open" button reads: `pinned` is docked open, not pinned is hidden (and
   * peeks on hover). When given, it wins over `collapsed`. The kit holds no storage: the host persists it and passes it back. */
  pinned?: boolean;
  /** Called with the new pinned state by the hide, keep-open (pin) and expand buttons. Passing it draws the button. */
  onPinnedChange?: (pinned: boolean) => void;
  /** What a collapsed column looks like. "hidden" (the Chat column) shrinks to a thin hover edge that peeks the column over the page;
   * "rail" keeps a narrow icon-only strip. Default "hidden". Only `standalone` columns collapse by themselves. */
  collapsedStyle?: "hidden" | "rail";
  collapseLabels?: Partial<SectionSidebarCollapseLabels>;
  /** The keyboard shortcut that collapses the column, shown in the collapse button's tooltip and announced with `aria-keyshortcuts`
   * (Chat's column: "Hide conversations ⌘B"). Unset, the tooltip is the label alone. */
  collapseShortcut?: { label: string; keys: string };
  /** "compact" is the Chat column's 36 px rows with no gap. Default "comfortable" (the settings column's rows). */
  density?: "comfortable" | "compact";
  /** Placed first in the header: a collapse button, a back link. */
  headerTop?: ReactNode;
  /** The column's title; omit it when the host draws its own. */
  title?: string;
  /** Drawn below the column title and above search. */
  afterTitle?: ReactNode;
  search?: SectionSidebarSearch;
  /** Placed under the search field (recent searches). */
  afterSearch?: ReactNode;
  /** The classes of the scrolling body; the default is `gap-0 px-2 pb-4`. */
  contentClassName?: string;
  /** Draw the column on its own beside the page content (News, Library): it carries its own sidebar provider, is hidden below the
   * kit's `lg` breakpoint (a phone lists the same entries in the shell's drawer), and takes the settings column's width, border and
   * surface. The settings shell leaves this off because it supplies its own provider and layout. */
  standalone?: boolean;
  /** Forwarded to the kit sidebar that holds the column: its id, `data-*`, `inert`, pointer handlers and layout classes. */
  sidebarProps?: Omit<ComponentProps<typeof Sidebar>, "collapsible" | "children"> & { [attribute: `data-${string}`]: string | undefined };
}

/**
 * The one sidebar column of an app area (NEWS-SIDEBAR-01, APP-SIDEBAR-01, RULES S1 and S2): a title, a pill search, and groups of icon rows
 * beside the content, built from the dashboard Sidebar parts and the `--settings-*` tokens. The settings shell draws its
 * column with it, and so do News, Library and Chat; the host passes data (groups or a `body`, search, footer) and writes no layout.
 * It holds no storage: a host that collapses the column keeps the state per person and passes it as `collapsed` and `onCollapsedChange`.
 *
 * A `standalone` column is pinned to the viewport (sticky at the top, one viewport tall, its own scroll): the page scrolls beside it,
 * never with it. Collapsed ("hidden" style) it behaves as Chat's column does: the same 200 ms width slide, a hover peek from the left
 * edge, Escape or a link click closes the peek, and the pin button docks it again.
 *
 * Phone: a `standalone` column is hidden below the kit's `lg` breakpoint. The host lists the same entries in the menu drawer with
 * `SectionSidebarDrawerSections` (pass the same `groups` and `footer` to `FullLayout`'s `mobileSections`).
 */
export function SectionSidebar({
  groups = [],
  body,
  headerTop,
  headerActions,
  primaryAction,
  title,
  afterTitle,
  search,
  afterSearch,
  footer,
  footerSlot,
  footerInRail,
  collapsed: collapsedProp = false,
  onCollapsedChange: onCollapsedChangeProp,
  pinned,
  onPinnedChange,
  collapsedStyle = "hidden",
  collapseLabels,
  collapseShortcut,
  density = "comfortable",
  contentClassName,
  standalone,
  sidebarProps,
}: SectionSidebarProps) {
  const labels: SectionSidebarCollapseLabels = { hide: "Hide sidebar", show: "Show sidebar", pin: "Keep sidebar open", ...collapseLabels };
  const generatedId = useId();
  const columnId = sidebarProps?.id ?? `section-sidebar-${generatedId}`;
  const compact = density === "compact";
  const collapsed = pinned !== undefined ? !pinned : collapsedProp;
  const onCollapsedChange =
    onCollapsedChangeProp || onPinnedChange
      ? (next: boolean) => {
          onPinnedChange?.(!next);
          onCollapsedChangeProp?.(next);
        }
      : undefined;
  const collapsible = standalone === true && (onCollapsedChange !== undefined || collapsed);
  const rail = collapsible && collapsed && collapsedStyle === "rail";
  const hiddenMode = collapsible && collapsed && collapsedStyle === "hidden";

  const [peek, setPeek] = useState(false);
  const timer = useRef<number | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  // Compact columns (Chat's) open the search field from a header icon and hide it again when it is empty and blurred.
  const [searchOpen, setSearchOpen] = useState(false);
  // The field the header icon opens takes focus at once; a keyboard or pointer user expects to type straight away.
  useEffect(() => {
    if (!searchOpen) return;
    document.querySelector<HTMLInputElement>('[data-slot="section-sidebar-search-input"]')?.focus();
  }, [searchOpen]);
  // Where focus goes once the column has changed state: the host's show button after a hide, this column's own button after a pin.
  const focusAfter = useRef<"show" | "toggle" | null>(null);
  const clearTimer = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const scheduleOpen = useCallback(() => {
    clearTimer();
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setPeek(true);
    }, PEEK_OPEN_DELAY_MS);
  }, [clearTimer]);
  const scheduleClose = useCallback(() => {
    clearTimer();
    timer.current = window.setTimeout(() => {
      timer.current = null;
      // A row menu is open (its popup lives outside the column): look again shortly, so the peek still closes once the menu is gone.
      if (document.getElementById(columnId)?.querySelector(POPUP_OPEN)) {
        scheduleClose();
        return;
      }
      setPeek(false);
    }, PEEK_CLOSE_GRACE_MS);
  }, [clearTimer, columnId]);
  const showButton = useCallback(() => document.querySelector<HTMLElement>(`[data-slot="section-sidebar-show"][aria-controls="${CSS.escape(columnId)}"]`), [columnId]);
  const closePeek = useCallback(
    (restoreFocus: boolean) => {
      clearTimer();
      setPeek(false);
      // Only a keyboard or click close hands focus back; a pointer drifting away never moves it.
      if (restoreFocus) focusAfter.current = "show";
    },
    [clearTimer],
  );
  useEffect(() => {
    if (!hiddenMode) {
      clearTimer();
      setPeek(false);
    }
    return clearTimer;
  }, [hiddenMode, clearTimer]);
  useEffect(() => {
    if (!peek) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // The search field's own Escape clears a typed query first; an open row menu takes this Escape first.
      if (event.target instanceof HTMLInputElement && event.target.value !== "") return;
      if (document.getElementById(columnId)?.querySelector(POPUP_OPEN)) return;
      closePeek(true);
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [peek, columnId, closePeek]);
  // A click that navigates (a link in the peeking column) closes the peek.
  useEffect(() => {
    if (!peek) return;
    const onClick = (event: globalThis.MouseEvent) => {
      const column = document.getElementById(columnId);
      if (event.target instanceof Element && column?.contains(event.target) && event.target.closest("a[href]")) closePeek(true);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [peek, columnId, closePeek]);
  // The host's show button peeks the column on hover or keyboard focus, as Chat's header toggle does.
  useEffect(() => {
    if (!hiddenMode) return;
    const onPeek = (event: Event) => {
      const detail = (event as CustomEvent<{ controls: string; open: boolean }>).detail;
      if (detail?.controls !== columnId) return;
      if (detail.open) scheduleOpen();
      else scheduleClose();
    };
    window.addEventListener(PEEK_EVENT, onPeek);
    return () => window.removeEventListener(PEEK_EVENT, onPeek);
  }, [hiddenMode, columnId, scheduleOpen, scheduleClose]);
  // Hand focus on after a state change (the column that was focused has just gone inert, or the pin control has just been replaced).
  useEffect(() => {
    const target = focusAfter.current;
    if (!target) return;
    if (target === "show" && hiddenMode && !peek) {
      focusAfter.current = null;
      showButton()?.focus({ preventScroll: true });
    } else if (target === "toggle" && !hiddenMode) {
      focusAfter.current = null;
      toggleRef.current?.focus({ preventScroll: true });
    }
  }, [hiddenMode, peek, showButton]);
  const peeking = hiddenMode && peek;
  const closed = hiddenMode && !peek;

  const toggleLabel = peeking ? labels.pin : rail ? labels.show : labels.hide;
  const toggle = onCollapsedChange ? (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            ref={toggleRef}
            type="button"
            data-slot="section-sidebar-toggle"
            aria-label={toggleLabel}
            aria-expanded={peeking ? undefined : !collapsed}
            aria-controls={peeking ? undefined : columnId}
            aria-keyshortcuts={collapseShortcut?.keys}
            onClick={() => {
              clearTimer();
              setPeek(false);
              focusAfter.current = peeking ? "toggle" : collapsed ? "toggle" : "show";
              onCollapsedChange(peeking ? false : !collapsed);
            }}
            className={cn(
              "relative inline-flex shrink-0 items-center justify-center rounded-[var(--settings-control-radius)] text-settings-helper outline-none before:absolute before:-inset-1.5 before:content-[''] hover:bg-settings-fill/60 hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              compact ? "size-6" : "size-9",
            )}
          >
            {peeking ? <PinIcon aria-hidden className={compact ? "size-4.5" : "size-[18px]"} /> : rail ? <ShowIcon aria-hidden className={compact ? "size-4.5" : "size-[18px]"} /> : <HideIcon aria-hidden className={compact ? "size-4.5" : "size-[18px]"} />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{collapseShortcut ? `${toggleLabel} ${collapseShortcut.label}` : toggleLabel}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : null;

  function row(item: SectionSidebarItem) {
    const Icon = getIcon(item.icon ?? "chevron-right");
    return (
      <SidebarMenuItem key={item.id}>
        <SidebarMenuButton
          size="settings"
          isActive={item.active === true}
          className={cn(compact && "h-9 rounded-lg px-2.5 before:-inset-y-1.5", rail && "justify-center gap-0 px-0", item.active && "font-semibold bg-settings-selected")}
          render={(props) => (
            <a {...props} href={item.href ?? "#"} onClick={(event) => { item.onClick?.(event); }} title={rail ? item.label : undefined}>
              {props.children}
            </a>
          )}
          data-kind={item.kind}
          aria-current={item.active ? "page" : undefined}
          aria-describedby={item.describedBy}
        >
          {item.active ? <span aria-hidden data-active="true" className="absolute inset-y-0 start-0 w-[3px] rounded-full bg-settings-accent" /> : null}
          <span className={cn("relative flex shrink-0", !rail && item.icon && !item.media && "size-7 items-center justify-center rounded-lg bg-settings-icon-tile", item.active && item.icon && !item.media && "bg-settings-accent/15")}>
            {item.media ? <SafeImage src={item.media} alt="" aria-hidden className="size-[18px] rounded-sm object-cover" /> : <Icon aria-hidden className={cn("size-[18px]", item.icon ? "text-settings-helper" : "text-settings-helper", item.active && item.icon && "text-settings-accent")} />}
            {rail && item.dot ? <span data-slot="section-sidebar-dot" aria-hidden className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary" /> : null}
          </span>
          <span className={cn("flex-1 truncate", rail && "sr-only")}>{item.label}</span>
          {rail ? null : item.trailing}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }
  const menuGap = compact ? "gap-0" : "gap-[var(--settings-column-row-gap)]";

  const hasHeaderRow = headerActions !== undefined || toggle !== null || (compact && !rail && search !== undefined);
  const titleNode = title ? <h2 className="px-2 text-[length:var(--settings-column-title-size)] leading-7 font-semibold">{title}</h2> : null;

  const column = (
    <Sidebar
      collapsible="none"
      {...sidebarProps}
      id={collapsible || sidebarProps?.id ? columnId : undefined}
      {...(closed ? { inert: true, "aria-hidden": true } : {})}
      className={cn(
        standalone && "h-full min-w-0 border-r border-settings-column-divider bg-settings-column",
        standalone && (rail ? "w-(--settings-rail-width)" : "w-(--settings-column-width)"),
        sidebarProps?.className,
      )}
      data-collapsed={collapsible ? (collapsed ? collapsedStyle : "false") : undefined}
    >
      <SidebarHeader className={cn("px-2 pt-4 pb-2", compact ? "gap-1" : "gap-3", rail && "items-center")}>
        {headerTop}
        {hasHeaderRow ? (
          <div data-slot="section-sidebar-header" className={cn("flex h-9 items-center gap-1", rail && "justify-center")}>
            {rail ? null : title ? <h2 className="min-w-0 flex-1 truncate px-2 text-[length:var(--settings-column-title-size)] leading-7 font-semibold">{title}</h2> : <span className="flex-1" />}
            {rail ? null : headerActions}
            {compact && !rail && search ? (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      data-slot="section-sidebar-search"
                      aria-label={search.label}
                      aria-expanded={searchOpen}
                      onClick={() => setSearchOpen(true)}
                      className="relative inline-flex size-6 shrink-0 items-center justify-center rounded-[var(--settings-control-radius)] text-settings-helper outline-none before:absolute before:-inset-1.5 before:content-[''] hover:bg-settings-fill/60 hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                    >
                      <SearchIcon aria-hidden className="size-4.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{search.label}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
            {toggle}
          </div>
        ) : (
          titleNode
        )}
        {afterTitle}
        {compact && !rail && primaryAction ? (
          primaryAction.href && !primaryAction.disabled ? (
            <a data-slot="section-sidebar-primary" href={primaryAction.href} onClick={primaryAction.onClick} className={primaryClass}>
              <PlusIcon aria-hidden className="size-4 shrink-0" />
              <span className="whitespace-nowrap">{primaryAction.label}</span>
            </a>
          ) : (
            <button type="button" data-slot="section-sidebar-primary" disabled={primaryAction.disabled} onClick={primaryAction.onClick} className={primaryClass}>
              <PlusIcon aria-hidden className="size-4 shrink-0" />
              <span className="whitespace-nowrap">{primaryAction.label}</span>
            </button>
          )
        ) : null}
        {search && rail ? (
          <button
            type="button"
            data-slot="section-sidebar-search-button"
            aria-label={search.label}
            title={search.label}
            onClick={() => onCollapsedChange?.(false)}
            className="relative inline-flex size-9 items-center justify-center rounded-full bg-settings-fill text-settings-helper outline-none before:absolute before:-inset-1.5 before:content-[''] focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <SearchIcon aria-hidden className="size-4" />
          </button>
        ) : null}
        {search && !rail && (!compact || searchOpen || search.value !== "") ? (
          <HitField pad={6} className="relative">
            <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-settings-helper" />
            <SidebarInput
              variant="pill"
              type="search"
              data-slot="section-sidebar-search-input"
              className="pl-9"
              aria-label={search.label}
              placeholder={search.label}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              onFocus={search.onFocus}
              onBlur={() => {
                search.onBlur?.();
                if (compact && search.value === "") setSearchOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape" && search.value) {
                  e.preventDefault();
                  search.onChange("");
                } else if (e.key === "Escape" && compact) {
                  e.preventDefault();
                  setSearchOpen(false);
                } else if (e.key === "Enter" && search.onSubmit) {
                  e.preventDefault();
                  search.onSubmit();
                }
              }}
            />
          </HitField>
        ) : null}
        {!rail && search?.recents && search.recents.length > 0 ? (
          <ul aria-label="Recent searches" className="flex list-none flex-wrap gap-1 px-2">
            {search.recents.map((recent) => (
              <li key={recent.key}>
                <Chip onClick={() => search.onRecent?.(recent.label)}>{recent.label}</Chip>
              </li>
            ))}
          </ul>
        ) : null}
        {rail ? null : afterSearch}
      </SidebarHeader>
      <SidebarContent className={cn("gap-0 px-2 pb-4", contentClassName)}>
        {body !== undefined ? (rail ? null : body) : null}
        {groups.map((group, index) => (
          <SidebarGroup key={group.id} className={cn("p-0", rail ? (index === 0 ? "pt-2" : "mt-2 border-t border-settings-column-divider pt-2") : compact ? "pt-2" : "pt-5")}>
            {group.label && group.items.length >= 2 && !rail ? (
              <SidebarGroupLabel className="h-8 px-2 text-[length:var(--settings-group-label-size)] font-normal text-settings-helper">{group.label}</SidebarGroupLabel>
            ) : null}
            <SidebarMenu className={menuGap}>{group.items.map(row)}</SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      {(footer && footer.length > 0) || (footerSlot && (!rail || footerInRail)) ? (
        <SidebarFooter data-slot="section-sidebar-footer" className="border-t border-settings-column-divider px-2 py-2">
          {footer && footer.length > 0 ? <SidebarMenu className={menuGap}>{footer.map(row)}</SidebarMenu> : null}
          {!rail || footerInRail ? footerSlot : null}
        </SidebarFooter>
      ) : null}
    </Sidebar>
  );

  if (!standalone) return column;

  // Pinned to the viewport: the outer box stretches the whole row (whatever the host's alignment), and the column inside sticks to the top of
  // the screen at one viewport tall, with its own scroll. The page scrolls beside it, never with it.
  const provider = (inner: ReactNode, layer = "") => (
    <SidebarProvider keyboardShortcut={false} data-slot="section-sidebar" className="relative hidden min-h-0 w-auto shrink-0 self-stretch lg:block">
      <div data-slot="section-sidebar-pin" className={cn("sticky top-0 flex h-svh max-h-svh min-h-0", layer)}>
        {inner}
      </div>
    </SidebarProvider>
  );
  if (!collapsible) return provider(column);

  const pointerOk = (event: PointerEvent) => event.pointerType !== "touch";
  return provider(
    <div
      data-slot="section-sidebar-box"
      data-state={peeking ? "peek" : hiddenMode ? "closed" : rail ? "rail" : "open"}
      className={cn(
        "relative h-full shrink-0 transition-[width] duration-200 ease-linear motion-reduce:transition-none",
        hiddenMode ? "w-1.5" : rail ? "w-(--settings-rail-width)" : "w-(--settings-column-width)",
      )}
    >
      {closed ? (
        <div
          data-slot="section-sidebar-peek-zone"
          aria-hidden
          className="absolute inset-y-0 start-0 z-20 w-1.5"
          onPointerEnter={(event) => {
            if (pointerOk(event)) scheduleOpen();
          }}
          onPointerLeave={clearTimer}
        />
      ) : null}
      <div
        data-slot="section-sidebar-panel"
        className={
          peeking
            ? "absolute inset-y-0 start-0 z-30 w-(--settings-column-width) shadow-xl motion-safe:animate-[section-sidebar-peek-in_160ms_ease-out]"
            : closed
              ? "invisible h-full w-(--settings-column-width) overflow-hidden"
              : "h-full"
        }
        onPointerEnter={peeking ? clearTimer : undefined}
        onPointerLeave={peeking ? (event) => { if (pointerOk(event)) scheduleClose(); } : undefined}
      >
        {column}
      </div>
    </div>,
    // Above the page's own sticky bars while the edge zone is live or the peek is open.
    peeking ? "z-30" : closed ? "z-20" : "",
  );
}

/** The button a host puts in its page header while the column is hidden, to bring it back. 48 px target, labelled, `aria-expanded`. */
export function SectionSidebarShowButton({ onClick, label = "Show sidebar", controls }: { onClick: () => void; label?: string; controls?: string }) {
  // With `controls` (the column's id) resting the pointer on it, or tabbing to it, peeks the column like Chat's header toggle; a click still pins.
  const tell = (open: boolean) => {
    if (controls) window.dispatchEvent(new CustomEvent(PEEK_EVENT, { detail: { controls, open } }));
  };
  const fromPointer = useRef(false);
  return (
    <button
      type="button"
      data-slot="section-sidebar-show"
      aria-label={label}
      aria-expanded={false}
      aria-controls={controls}
      onClick={onClick}
      onPointerEnter={(event) => { if (event.pointerType !== "touch") tell(true); }}
      onPointerLeave={(event) => { if (event.pointerType !== "touch") tell(false); }}
      onPointerDown={() => { fromPointer.current = true; }}
      onPointerUp={() => { fromPointer.current = false; }}
      onFocus={() => {
        const pointer = fromPointer.current;
        fromPointer.current = false;
        if (!pointer) tell(true);
      }}
      onBlur={(event) => {
        fromPointer.current = false;
        // Focus moving into the peeking column keeps it open.
        const column = controls ? document.getElementById(controls) : null;
        if (column && event.relatedTarget instanceof Node && column.contains(event.relatedTarget)) return;
        tell(false);
      }}
      className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--settings-control-radius)] text-settings-helper outline-none before:absolute before:-inset-1.5 before:content-[''] hover:bg-settings-fill/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ShowIcon aria-hidden className="size-[18px]" />
    </button>
  );
}

/** The same groups and footer rows as plain links, for the phone's menu drawer (`FullLayout`'s `mobileSections`). Rows are 48 px tall. */
export function SectionSidebarDrawerSections({ groups = [], footer, onNavigate }: Pick<SectionSidebarProps, "groups" | "footer"> & { onNavigate?: () => void }) {
  const list = (items: readonly SectionSidebarItem[]) => (
    <ul className="flex list-none flex-col">
      {items.map((item) => {
        const Icon = getIcon(item.icon ?? "chevron-right");
        return (
          <li key={item.id}>
            <a
              href={item.href ?? "#"}
              data-kind={item.kind}
              aria-current={item.active ? "page" : undefined}
              onClick={(event) => {
                item.onClick?.(event);
                onNavigate?.();
              }}
              className="flex min-h-12 items-center gap-3 rounded-[var(--settings-control-radius)] px-3 text-sm outline-none hover:bg-settings-fill/60 focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-settings-fill"
            >
              {item.media ? <SafeImage src={item.media} alt="" aria-hidden className="size-[18px] rounded-sm object-cover" /> : <Icon aria-hidden className="size-[18px] text-settings-helper" />}
              <span className="flex-1 truncate">{item.label}</span>
              {item.trailing}
            </a>
          </li>
        );
      })}
    </ul>
  );
  return (
    <nav data-slot="section-sidebar-drawer" className="flex flex-col gap-2">
      {groups.map((group) => (
        <div key={group.id}>
          {group.label ? <h3 className="px-3 py-1 text-xs text-settings-helper">{group.label}</h3> : null}
          {list(group.items)}
        </div>
      ))}
      {footer && footer.length > 0 ? <div className="border-t border-settings-column-divider pt-2">{list(footer)}</div> : null}
    </nav>
  );
}
