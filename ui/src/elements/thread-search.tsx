"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { PinIcon, SearchIcon } from "lucide-react";
import { cn } from "cn";
import { field, mono, paper } from "./surfaces";

export interface SearchableThread {
  id: string;
  title: string;
  group: string;
  preview?: string;
  pinned?: boolean;
}

export function groupThreads(matches: readonly SearchableThread[]): {
  pinned: SearchableThread[];
  groups: { group: string; threads: SearchableThread[] }[];
} {
  const rest = matches.filter((thread) => !thread.pinned);
  return {
    pinned: matches.filter((thread) => thread.pinned),
    groups: [...new Set(rest.map((thread) => thread.group))].map((group) => ({
      group,
      threads: rest.filter((thread) => thread.group === group),
    })),
  };
}

// Matches on title and preview, then orders pinned first and day groups in
// first-seen order: the same order ThreadSearch renders and Enter/arrows use.
export function matchThreads(
  threads: readonly SearchableThread[],
  query: string,
): SearchableThread[] {
  const needle = query.toLowerCase();
  const matches = threads.filter((thread) =>
    `${thread.title} ${thread.preview ?? ""}`.toLowerCase().includes(needle),
  );
  const { pinned, groups } = groupThreads(matches);
  return [...pinned, ...groups.flatMap((entry) => entry.threads)];
}

export function ThreadSearch({
  threads,
  query,
  activeId,
  onQueryChange,
  onSelect,
  onMatchesChange,
  inputOnly = false,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  | "children"
  | "threads"
  | "query"
  | "activeId"
  | "onQueryChange"
  | "onSelect"
  | "onMatchesChange"
  | "inputOnly"
> & {
  threads: readonly SearchableThread[];
  query: string;
  activeId: string;
  onQueryChange?: (query: string) => void;
  onSelect?: (id: string) => void;
  // Ordered ids of the current matches, for a host list that filters itself.
  onMatchesChange?: (ids: string[]) => void;
  // Render only the search field; the host shows the results.
  inputOnly?: boolean;
}) {
  const ordered = matchThreads(threads, query);
  const { pinned, groups } = groupThreads(ordered);

  const reported = useRef<string | null>(null);
  const orderedKey = ordered.map((thread) => thread.id).join("\n");
  useEffect(() => {
    if (reported.current === orderedKey) return;
    reported.current = orderedKey;
    onMatchesChange?.(ordered.map((thread) => thread.id));
  });

  const move = (delta: number) => {
    if (ordered.length === 0) return;
    const at = ordered.findIndex((thread) => thread.id === activeId);
    // activeId can be filtered out by the query; start from the edge the key implies
    const from = at === -1 ? (delta > 0 ? -1 : 0) : at;
    const next = ordered[(from + delta + ordered.length) % ordered.length];
    if (next && onSelect) onSelect(next.id);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Enter") {
      const first = ordered[0];
      if (first && onSelect) {
        event.preventDefault();
        onSelect(first.id);
      }
    } else if (event.key === "Escape" && query !== "") {
      event.preventDefault();
      onQueryChange?.("");
    }
  };

  const row = (thread: SearchableThread) => {
    const className = cn(
      "flex flex-col gap-0.5 rounded-xl px-2 py-1 text-start transition-colors",
      thread.id === activeId
        ? "bg-foreground/[0.05]"
        : onSelect
          ? "hover:bg-foreground/[0.03]"
          : undefined,
    );
    const content = (
      <>
        <span className="flex items-center gap-1.5">
          {thread.pinned && (
            <PinIcon className="text-foreground/30 size-2.5 shrink-0" />
          )}
          <span className="min-w-0 flex-1 truncate text-[13px]">
            {thread.title}
          </span>
        </span>
        {thread.preview && (
          <span className="text-foreground/35 truncate text-xs">
            {thread.preview}
          </span>
        )}
      </>
    );

    return onSelect ? (
      <button
        key={thread.id}
        type="button"
        onClick={() => onSelect(thread.id)}
        className={className}
      >
        {content}
      </button>
    ) : (
      <div key={thread.id} className={className}>
        {content}
      </div>
    );
  };

  const searchField = (
    <div
      className={cn(
        field,
        "flex items-center gap-2 rounded-xl px-2.5 py-1.5",
      )}
    >
      <SearchIcon className="text-foreground/30 size-3.5 shrink-0" />
      <input
        value={query}
        onChange={(event) => onQueryChange?.(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Search threads"
        aria-label="Search threads"
        className="text-foreground/85 placeholder:text-foreground/30 min-w-0 flex-1 bg-transparent text-[13px] outline-none"
      />
    </div>
  );

  if (inputOnly) {
    return (
      <div
        data-slot="thread-search"
        className={cn("w-full", className)}
        {...props}
      >
        {searchField}
      </div>
    );
  }

  return (
    <div
      data-slot="thread-search"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-1.5 rounded-2xl p-3",
        className,
      )}

      {...props}
    >
      {searchField}

      {pinned.length > 0 && (
        <div className="flex flex-col">
          <span className={cn(mono, "text-foreground/25 px-2 pb-1")}>
            pinned
          </span>
          {pinned.map(row)}
        </div>
      )}

      {groups.map(({ group, threads: items }) => (
        <div key={group} className="flex flex-col">
          <span className={cn(mono, "text-foreground/25 px-2 pb-1")}>
            {group}
          </span>
          {items.map(row)}
        </div>
      ))}

      {ordered.length === 0 && (
        <span className="text-foreground/30 px-2 py-4 text-center text-xs">
          No thread matches “{query}”
        </span>
      )}
    </div>
  );
}
