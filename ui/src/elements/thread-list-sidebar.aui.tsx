"use client";

import { useAuiState } from "@assistant-ui/react";
import { useState, type ComponentProps, type ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
} from "./ui/sidebar";
import {
  ThreadListItems,
  ThreadListNew,
  ThreadListRoot,
  ThreadListSearch,
  type ThreadListLabels,
  type ThreadListProjects,
} from "./thread-list.aui";

export type ThreadListSidebarProps = Omit<ComponentProps<typeof Sidebar>, "children" | "variant"> & {
  /** The compact density matches the Home chat history column. */
  variant?: "default" | "compact" | "sidebar" | "floating" | "inset";
  /** The underlying shadcn sidebar surface style. */
  sidebarVariant?: "sidebar" | "floating" | "inset";
  header?: ReactNode;
  footer?: ReactNode;
  /** Accepted for compatibility with the previous Sidebar prop shape. */
  children?: ReactNode;
  projects?: ThreadListProjects;
  pinnable?: boolean;
  /** Temporary chats such as Incognito never expose projects or pinning. */
  temporary?: boolean;
  labels?: ThreadListLabels;
  newChatDisabled?: boolean;
  onNewChat?: () => void;
  searchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
  searchable?: boolean;
  emptyState?: ReactNode;
  /** COLUMN-02 state and pointer handlers are owned by the host. */
  collapsed?: boolean;
  peek?: boolean;
  onPeekZonePointerEnter?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPeekZonePointerLeave?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPeekPointerEnter?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPeekPointerLeave?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPeekNavigate?: () => void;
};

/** Supersedes the branded assistant-ui demo sidebar. Slots are empty by default. */
export function ThreadListSidebar({
  variant = "default",
  sidebarVariant = "sidebar",
  header,
  footer,
  projects,
  pinnable,
  temporary = false,
  labels,
  newChatDisabled,
  onNewChat,
  searchQuery: controlledSearch,
  onSearchQueryChange,
  searchable = true,
  emptyState,
  collapsed = false,
  peek = false,
  onPeekZonePointerEnter,
  onPeekZonePointerLeave,
  onPeekPointerEnter,
  onPeekPointerLeave,
  onPeekNavigate,
  side,
  collapsible = "none",
  className,
  style,
  onClick,
  onPointerEnter,
  onPointerLeave,
  ...props
}: ThreadListSidebarProps) {
  const [localSearch, setLocalSearch] = useState("");
  const search = controlledSearch ?? localSearch;
  const setSearch = onSearchQueryChange ?? setLocalSearch;
  const hasThreads = useAuiState((state) => state.threads.threadIds.length > 0);
  const compact = variant === "compact";
  const density = compact ? "compact" : "default";
  const showPeek = compact && peek;
  const showZone = compact && collapsed && !peek;
  const resolvedSidebarVariant = variant === "sidebar" || variant === "floating" || variant === "inset"
    ? variant
    : sidebarVariant;
  const effectiveProjects = temporary ? undefined : projects;
  const effectivePinnable = temporary ? false : pinnable;

  const panel = (
    <SidebarProvider
      style={{ "--sidebar-width": "18rem", ...style } as ComponentProps<typeof SidebarProvider>["style"]}
      className="h-full min-h-0 w-full min-w-0"
    >
      <Sidebar
        {...props}
        side={side}
        variant={resolvedSidebarVariant}
        collapsible={compact ? "none" : collapsible}
        className={className}
        data-variant={variant}
        data-peek={showPeek || undefined}
        aria-hidden={compact && collapsed && !peek ? true : undefined}
        inert={compact && collapsed && !peek ? true : undefined}
        onPointerEnter={(event) => {
          onPointerEnter?.(event);
          if (showPeek) onPeekPointerEnter?.(event);
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          if (showPeek) onPeekPointerLeave?.(event);
        }}
        onClick={(event) => {
          const target = event.target;
          if (target instanceof Element && target.closest('[data-slot="aui_thread-list-item-trigger"], [data-slot="aui_thread-list-new"], a[href]')) {
            onPeekNavigate?.();
          }
          onClick?.(event);
        }}
      >
        {header ? <SidebarHeader data-slot="aui_thread-list-sidebar-header">{header}</SidebarHeader> : null}
        <SidebarContent data-slot="aui_thread-list-sidebar-content" className="gap-0 px-2">
          <ThreadListRoot density={density}>
            <ThreadListNew
              density={density}
              label={labels?.newChat}
              disabled={newChatDisabled}
              onClick={onNewChat}
            />
            {searchable && hasThreads ? (
              <ThreadListSearch
                density={density}
                value={search}
                onValueChange={setSearch}
                label={labels?.searchChats}
              />
            ) : null}
            <ThreadListItems
              density={density}
              searchQuery={hasThreads ? search : ""}
              pinnable={effectivePinnable}
              labels={labels}
              projects={effectiveProjects}
            />
            {!hasThreads && emptyState ? <div data-slot="aui_thread-list-sidebar-empty">{emptyState}</div> : null}
          </ThreadListRoot>
        </SidebarContent>
        {footer ? <SidebarFooter data-slot="aui_thread-list-sidebar-footer">{footer}</SidebarFooter> : null}
      </Sidebar>
    </SidebarProvider>
  );

  if (!compact) return panel;

  return (
    <div
      data-slot="aui_thread-list-sidebar"
      data-variant="compact"
      data-state={collapsed ? (peek ? "peek" : "collapsed") : "expanded"}
      className="relative h-full shrink-0 transition-[width] duration-200 ease-linear"
      style={{ width: collapsed ? (peek ? "18rem" : "0.375rem") : "18rem" }}
    >
      {showZone ? (
        <div
          data-slot="aui_thread-list-sidebar-peek-zone"
          aria-hidden="true"
          className="absolute inset-y-0 start-0 z-20 w-1.5"
          onPointerEnter={(event) => {
            if (event.pointerType !== "touch") onPeekZonePointerEnter?.(event);
          }}
          onPointerLeave={onPeekZonePointerLeave}
        />
      ) : null}
      <div
        data-slot="aui_thread-list-sidebar-panel"
        className={showPeek
          ? "absolute inset-y-0 start-0 z-30 w-72 shadow-xl"
          : collapsed
            ? "invisible h-full w-72 overflow-hidden"
            : "h-full w-72"}
      >
        {panel}
      </div>
    </div>
  );
}
