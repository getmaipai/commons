"use client";

import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/kit/ui/dialog";
import { DestructiveConfirm } from "@/kit/primitives/DestructiveConfirm";
import { Button } from "@/kit/ui/button";
import { Checkbox } from "@/kit/ui/checkbox";
import { Input } from "@/kit/ui/input";
import { Skeleton } from "@/kit/ui/skeleton";
import { cn, hitArea } from "@/kit/utils";
import { computeThreadListGroups } from "@/kit/assistant-ui/thread-list-groups";
import {
  AuiIf,
  ThreadListItemMorePrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import {
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PinIcon,
  PinOffIcon,
  PlusIcon,
  SearchIcon,
  SquareCheckIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import {
  createContext,
  forwardRef,
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type FC,
} from "react";

/** MaiPai-specific bulk actions this kit component has no native concept
 * of (assistant-ui's own `RemoteThreadListAdapter` has per-thread
 * `delete()`, nothing list-wide) - a caller that wants multi-select and
 * "clear all" supplies these; a caller that doesn't (Stack, Catalog)
 * leaves `actions` undefined and gets today's single-thread-only rows,
 * same as before this existed. `clearAll` is separately optional so a
 * caller can offer batch-delete without a destructive "everything"
 * button (Home's own case when an admin is viewing someone else's list -
 * the household's own `clearConversations()` only ever touches the
 * actor's own threads regardless, so this is belt-and-suspenders UI
 * gating on top of a hard server-side rule, not the only thing standing
 * between a click and a cross-person delete). */
export interface ThreadListActions {
  batchDelete: (remoteIds: string[]) => Promise<void>;
  clearAll?: () => Promise<void>;
}

interface ThreadListSelectionState {
  selectMode: boolean;
  selected: ReadonlySet<string>;
  setSelectMode: (value: boolean) => void;
  toggleSelected: (remoteId: string) => void;
  /** Whether this list's adapter actually implements `updateCustom` -
   * gates the pin button and the More menu's own Pin/Unpin item.
   * `RemoteThreadListAdapter.updateCustom` is optional in
   * `@assistant-ui/core`'s own types; without this flag every caller of
   * this shared component would get a pin control that always throws
   * (a code review, ui-v0.4.x: "any adapter that doesn't implement
   * updateCustom gets a pin control that always throws... on every
   * click, forever"). */
  pinnable: boolean;
}

const ThreadListSelectionContext = createContext<ThreadListSelectionState | null>(null);

function useThreadListSelection(): ThreadListSelectionState | null {
  return useContext(ThreadListSelectionContext);
}

export const ThreadList: FC<{
  actions?: ThreadListActions;
  /** Whether this list's own adapter supports pin/unpin (implements
   * `updateCustom`) - Home's own `chatThreadListAdapter.ts` does; a
   * caller whose adapter doesn't should leave this false (the default)
   * rather than ship a pin control that always fails. */
  pinnable?: boolean;
  /** False when this list isn't the caller's own - a code review
   * (ui-v0.4.x) caught that "New chat" had no such gate at all: clicking
   * it while an admin was looking at someone else's list created the new
   * conversation under the admin (the adapter's own `initialize()` has
   * no target-person concept), spliced it into what the screen still
   * labeled as the other person's list until the next real reload
   * quietly dropped it again. Defaults true (today's behavior, every
   * list is the caller's own) so an existing caller is unaffected. */
  newChatEnabled?: boolean;
  /** Debounced (300ms) as the search box changes. When provided, the
   * list is trusted to already be server-filtered for this query (Home's
   * own adapter re-fetches on query change, message bodies included, not
   * just titles) - this component stops re-filtering by title on top of
   * that, which would otherwise hide a message-body-only match. Omit for
   * the previous client-side, title-only behavior. */
  onSearchQueryChange?: (query: string) => void;
}> = ({ actions, pinnable = false, newChatEnabled = true, onSearchQueryChange }) => {
  const [search, setSearch] = useState("");
  const hasThreads = useAuiState((s) => s.threads.threadIds.length > 0);
  const serverSearch = onSearchQueryChange !== undefined;

  // A ref for the latest callback, not a `useEffect` dependency on the
  // callback itself (a code review, ui-v0.4.x): a typical inline caller
  // (`onSearchQueryChange={(q) => setQuery(q)}`) creates a new function
  // every render, which would restart this 300ms timer on every parent
  // re-render regardless of whether the search text itself changed -
  // under a fast-enough re-render source (Home's own SSE-fed
  // notifications, for one), a typed query could go arbitrarily long
  // without ever reaching the server. `didMountRef` skips the debounced
  // call that would otherwise fire once on mount with the empty string
  // every list starts with, a redundant round-trip no keystroke asked for.
  const onSearchQueryChangeRef = useRef(onSearchQueryChange);
  onSearchQueryChangeRef.current = onSearchQueryChange;
  const didMountRef = useRef(false);
  useEffect(() => {
    // The mount-skip check comes first, unconditionally (a second code
    // review pass caught this ordered after the "no callback" check
    // instead): a caller whose own `onSearchQueryChange` starts
    // undefined and only becomes real later would never have set
    // `didMountRef` true on its own actual mount, so the first search
    // after the callback appeared would have been silently swallowed
    // as if it were the initial mount call instead of a real one.
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (!onSearchQueryChangeRef.current) return;
    const handle = setTimeout(() => onSearchQueryChangeRef.current?.(search), 300);
    return () => clearTimeout(handle);
  }, [search]);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const selection = useMemo<ThreadListSelectionState>(
    () => ({
      selectMode,
      selected,
      setSelectMode: (value) => {
        setSelectMode(value);
        if (!value) setSelected(new Set());
      },
      toggleSelected: (remoteId) =>
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(remoteId)) next.delete(remoteId);
          else next.add(remoteId);
          return next;
        }),
      pinnable,
    }),
    [selectMode, selected, pinnable],
  );

  return (
    <ThreadListSelectionContext.Provider value={selection}>
      <ThreadListRoot>
        <div data-slot="aui_thread-list-toolbar" className="flex items-center gap-1">
          {newChatEnabled && <ThreadListNew className="flex-1" />}
          {actions && (
            <ThreadListSelectModeToggle
              active={selectMode}
              onToggle={() => selection.setSelectMode(!selectMode)}
            />
          )}
        </div>
        {/* serverSearch stays visible regardless of the live thread
            count (a code review, ui-v0.4.x): gating on `hasThreads`
            alone let the box unmount mid-edit whenever a server-search
            query's own debounced refetch briefly landed on zero
            results, dropping focus for the ~300ms until the next
            (cleared) query's own results came back. */}
        {(hasThreads || search || serverSearch) && (
          <ThreadListSearch value={search} onValueChange={setSearch} />
        )}
        {actions && selectMode ? (
          <ThreadListBatchBar actions={actions} onDeleted={() => selection.setSelectMode(false)} />
        ) : (
          actions?.clearAll && <ThreadListClearAll clearAll={actions.clearAll} />
        )}
        <ThreadListItems searchQuery={search} skipFilter={serverSearch} pinnable={pinnable} />
      </ThreadListRoot>
    </ThreadListSelectionContext.Provider>
  );
};

const ThreadListSelectModeToggle: FC<{ active: boolean; onToggle: () => void }> = ({ active, onToggle }) => {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      data-slot="aui_thread-list-select-toggle"
      aria-pressed={active}
      aria-label={active ? "Exit select mode" : "Select chats"}
      onClick={onToggle}
      className="shrink-0"
    >
      {active ? <XIcon className="size-4" /> : <SquareCheckIcon className="size-4" />}
    </Button>
  );
};

/** The Dialog/DialogContent/title/description/DestructiveConfirm shape,
 * pulled out of three call sites in this file (BatchBar's own delete,
 * ClearAll, and ThreadListItem's own per-thread delete) - `DestructiveConfirm`
 * itself already exists to kill exactly this duplication (its own header
 * comment names "ConversationsPage.tsx's batch delete and clear-all" as
 * two of the four places this shape used to be hand-copied), but that
 * extraction only ever covered the inner message/buttons, not the outer
 * Dialog wrapper around it - a code review, ui-v0.4.x, caught this file
 * re-growing the same duplication it was restoring functions from. */
const ThreadListConfirmDialog: FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  message: string;
  confirmLabel: string;
  busyLabel: string;
  busy: boolean;
  onConfirm: () => void;
}> = ({ open, onOpenChange, title, description, message, confirmLabel, busyLabel, busy, onConfirm }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <DestructiveConfirm
          message={message}
          confirmLabel={confirmLabel}
          busyLabel={busyLabel}
          busy={busy}
          onConfirm={onConfirm}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

const ThreadListBatchBar: FC<{ actions: ThreadListActions; onDeleted: () => void }> = ({ actions, onDeleted }) => {
  const aui = useAui();
  const selection = useThreadListSelection();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const count = selection?.selected.size ?? 0;

  async function handleDelete() {
    if (!selection) return;
    setBusy(true);
    // The delete itself and the post-delete refresh are reported
    // separately (a code review, ui-v0.4.x): a shared try/catch around
    // both told a person their chats were still there ("could not
    // delete") on any reload hiccup after a delete that had already
    // succeeded - the opposite of true.
    try {
      await actions.batchDelete([...selection.selected]);
    } catch {
      toast.error("Could not delete the selected chats. Try again.");
      setBusy(false);
      return;
    }
    setConfirming(false);
    onDeleted();
    setBusy(false);
    try {
      await aui.threads().reload();
    } catch {
      toast.error("Chats were deleted, but the list couldn't refresh. Reload to see the change.");
    }
  }

  return (
    <div
      data-slot="aui_thread-list-batch-bar"
      className="flex min-h-12 items-center justify-between gap-2 px-2.5 text-base"
    >
      <span data-slot="aui_thread-list-batch-count" className="text-muted-foreground">
        {count} selected
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={count === 0}
        data-slot="aui_thread-list-batch-delete"
        onClick={() => setConfirming(true)}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <TrashIcon className="size-4" />
        Delete selected
      </Button>
      <ThreadListConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Delete ${count} chat${count === 1 ? "" : "s"}`}
        description="This removes the messages in each selected chat. Saved memories remain."
        message={`Delete ${count} chat${count === 1 ? "" : "s"}?`}
        confirmLabel="Delete chats"
        busyLabel="Deleting…"
        busy={busy}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
};

const ThreadListClearAll: FC<{ clearAll: () => Promise<void> }> = ({ clearAll }) => {
  const aui = useAui();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleClear() {
    setBusy(true);
    try {
      await clearAll();
    } catch {
      toast.error("Could not clear your chats. Try again.");
      setBusy(false);
      return;
    }
    setConfirming(false);
    setBusy(false);
    try {
      await aui.threads().reload();
    } catch {
      toast.error("Chats were cleared, but the list couldn't refresh. Reload to see the change.");
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        data-slot="aui_thread-list-clear-all"
        onClick={() => setConfirming(true)}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive justify-start gap-2 px-2.5 font-normal"
      >
        <TrashIcon className="size-4" />
        Clear all chats
      </Button>
      <ThreadListConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Clear all chats"
        description="This removes every chat's messages. Saved memories remain."
        message="Clear all chats?"
        confirmLabel="Clear all"
        busyLabel="Clearing…"
        busy={busy}
        onConfirm={() => void handleClear()}
      />
    </>
  );
};

export const ThreadListSearch = forwardRef<
  HTMLInputElement,
  Omit<ComponentPropsWithoutRef<typeof Input>, "value" | "onChange"> & {
    value: string;
    onValueChange: (value: string) => void;
  }
>(({ className, value, onValueChange, ...props }, ref) => {
  return (
    <div data-slot="aui_thread-list-search" className="relative px-0.5 py-1">
      <SearchIcon
        data-slot="aui_thread-list-search-icon"
        className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
      />
      <Input
        ref={ref}
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        aria-label="Search chats"
        placeholder="Search chats"
        // `h-8`/`text-sm` (found live, Home's step 5b - the persistent
        // desktop thread-list column made this always-visible instead
        // of behind a toggle) silently defeated Input's own h-12/
        // text-base touch-target floor, the same call-site-override
        // bug class this session found repeatedly elsewhere.
        className={cn("ps-8", className)}
        {...props}
      />
    </div>
  );
});

ThreadListSearch.displayName = "ThreadListSearch";

export const ThreadListRoot: FC<
  ComponentPropsWithoutRef<typeof ThreadListPrimitive.Root>
> = ({ className, ...props }) => {
  return (
    <ThreadListPrimitive.Root
      data-slot="aui_thread-list-root"
      className={cn("flex flex-col gap-0.5", className)}
      {...props}
    />
  );
};

/** A caller reaching for this directly instead of `<ThreadList>` (both
 * exported) owns making its own `pinnable` agree with whatever actually
 * renders the row-level pin controls (`ThreadListItem` reads
 * `pinnable` from `ThreadListSelectionContext`, populated only by
 * `<ThreadList>`'s own Provider) - passing `pinnable` here with no
 * `<ThreadList>` wrapper produces a "Pinned" section heading with no
 * pin/unpin control anywhere on the page to explain it. */
export const ThreadListItems: FC<
  ComponentPropsWithoutRef<"div"> & { searchQuery?: string; skipFilter?: boolean; pinnable?: boolean }
> = ({ className, searchQuery = "", skipFilter, pinnable, ...props }) => {
  return (
    <div
      data-slot="aui_thread-list-items"
      className={cn("flex flex-col gap-0.5", className)}
      {...props}
    >
      <AuiIf condition={(s) => s.threads.isLoading}>
        <ThreadListSkeleton />
      </AuiIf>
      <AuiIf condition={(s) => !s.threads.isLoading}>
        <ThreadListItemGroups searchQuery={searchQuery} skipFilter={skipFilter} pinnable={pinnable} />
      </AuiIf>
    </div>
  );
};

export type { ThreadListGroup, ThreadListGroupableItem } from "@/kit/assistant-ui/thread-list-groups";

/** Wraps `computeThreadListGroups` (thread-list-groups.ts - a separate,
 * dependency-free module on purpose, so it's unit-testable without a real
 * assistant-ui runtime) in the live `useAuiState` subscription and a
 * `useMemo`. */
export const useThreadListGroups = (searchQuery = "", skipFilter = false, pinnable = false) => {
  const threadIds = useAuiState((s) => s.threads.threadIds);
  const threadItems = useAuiState((s) => s.threads.threadItems);

  return useMemo(() => {
    const itemsById = new Map(threadItems.map((item) => [item.id, item]));
    return computeThreadListGroups(threadIds, itemsById, searchQuery, skipFilter, pinnable);
  }, [threadIds, threadItems, searchQuery, skipFilter, pinnable]);
};

const ThreadListItemGroups: FC<{ searchQuery?: string; skipFilter?: boolean; pinnable?: boolean }> = ({
  searchQuery = "",
  skipFilter = false,
  pinnable = false,
}) => {
  const { threadIds, filteredIndices, groups } =
    useThreadListGroups(searchQuery, skipFilter, pinnable);
  const query = searchQuery.trim();

  if (query && filteredIndices.length === 0) {
    return (
      <div
        data-slot="aui_thread-list-empty"
        className="text-muted-foreground px-2.5 py-4 text-base"
      >
        No chats found
      </div>
    );
  }

  if (!groups) {
    return filteredIndices.map((index) => (
      <ThreadListPrimitive.ItemByIndex
        key={threadIds[index]}
        index={index}
        components={{ ThreadListItem }}
      />
    ));
  }

  return groups.map((group) => (
    <Fragment key={group.label}>
      {/* text-base, not text-xs: the type floor (docs/UI.md), lane 7
          item 3, 2026-09-13 - a real date-group heading ("Today"), the
          same reasoning that already moved DayDivider off text-xs. */}
      <div
        data-slot="aui_thread-list-group-label"
        className="text-muted-foreground px-2.5 pt-3 pb-1 text-base font-medium"
      >
        {group.label}
      </div>
      {group.indices.map((index) => (
        <ThreadListPrimitive.ItemByIndex
          key={threadIds[index]}
          index={index}
          components={{ ThreadListItem }}
        />
      ))}
    </Fragment>
  ));
};

export const ThreadListNew = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof Button> & { labelClassName?: string }
>(({ className, labelClassName, children, ...props }, ref) => {
  return (
    <ThreadListPrimitive.New asChild>
      <Button
        ref={ref}
        variant="ghost"
        data-slot="aui_thread-list-new"
        // Found live, Home's step 5b (the persistent desktop
        // thread-list column made this always-visible): `h-8`/`text-sm`
        // silently defeated Button's own h-12/text-base touch-target
        // floor, the same call-site-override bug class this session
        // found repeatedly elsewhere. A caller wanting the compact
        // header icon-only variant already overrides size/className at
        // its own call site (AppShell/ChatPage), not here.
        className={cn(
          "hover:bg-muted data-active:bg-muted justify-start gap-2 rounded-md px-2.5 font-normal",
          className,
        )}
        {...props}
      >
        {children ?? (
          <>
            <PlusIcon
              data-slot="aui_thread-list-new-icon"
              className="size-4 shrink-0"
            />
            <span
              data-slot="aui_thread-list-new-label"
              className={cn("whitespace-nowrap", labelClassName)}
            >
              New chat
            </span>
          </>
        )}
      </Button>
    </ThreadListPrimitive.New>
  );
});

ThreadListNew.displayName = "ThreadListNew";

const ThreadListSkeleton: FC = () => {
  return (
    <div className="flex flex-col gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          role="status"
          aria-label="Loading threads"
          data-slot="aui_thread-list-skeleton-wrapper"
          // h-12, matching the real row height above - otherwise the
          // real list jumps taller the moment it loads.
          className="flex h-12 items-center px-2.5"
        >
          <Skeleton
            data-slot="aui_thread-list-skeleton"
            className="h-3.5 w-full"
          />
        </div>
      ))}
    </div>
  );
};

export const ThreadListItem: FC = () => {
  const isRunning = useAuiState((s) => s.threadListItem.isRunning);
  // `custom` is `RemoteThreadListAdapter`'s own sanctioned extension
  // point for per-thread metadata the standard shape has no field for
  // (types.d.ts: `RemoteThreadMetadata.custom?: Record<string,
  // unknown>`, `ThreadListItemRuntime.updateCustom()`) - Home's own
  // adapter reads/writes `custom.pinned` there; this kit component only
  // ever reads the one key it also writes, generic to any caller that
  // wants the same convention.
  const pinned = useAuiState((s) => s.threadListItem.custom?.pinned === true);
  const remoteId = useAuiState((s) => s.threadListItem.remoteId);
  const [isRenaming, setIsRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const aui = useAui();
  const title = useAuiState((s) => s.threadListItem.title) ?? "New chat";
  const selection = useThreadListSelection();
  const checked = remoteId !== undefined && (selection?.selected.has(remoteId) ?? false);

  async function deleteThread() {
    setDeleting(true);
    try { await aui.threadListItem().delete(); setConfirmDelete(false); }
    catch { toast.error("Could not delete this chat. Try again."); }
    finally { setDeleting(false); }
  }
  async function togglePin() {
    try { await aui.threadListItem().updateCustom({ pinned: !pinned }); }
    catch { toast.error("Could not pin this chat. Try again."); }
  }
  const triggerRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);

  useEffect(() => {
    if (isRenaming || !restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    triggerRef.current?.focus();
  }, [isRenaming]);

  const pinnable = selection?.pinnable ?? false;
  // A sibling of the Trigger, not a child: a <button> (the pin toggle)
  // or the select-mode Checkbox nested inside the Trigger's own
  // interactive element would be invalid, unclickable HTML - the same
  // reason ThreadListItemMore already sits outside it, absolutely
  // positioned at the row's end. This one anchors the row's start
  // instead, and the Trigger below reserves ps-11 for it unconditionally
  // (pinned or in select mode) rather than only on hover, since a
  // pinned thread's own indicator needs to stay visible at rest, not
  // just on hover like the End side's own "More" button does. `remoteId
  // !== undefined` on the pin button too (a code review, ui-v0.4.x): a
  // freshly-created thread has no remote id yet, and
  // `updateCustom()`'s own runtime throws for a not-yet-initialized
  // thread regardless - the Checkbox already had this guard, the pin
  // button didn't. `pinnable &&` on the `pinned` half too (a second
  // review pass, same item): without it, a caller with `pinnable=false`
  // reserved this space on every hover (no pin button ever renders to
  // fill it), or permanently on any thread whose `custom.pinned` happens
  // to read true from stale data - the two actual pin controls (the
  // button above, the More menu item below) already gated on
  // `pinnable`; this is the same gate on the space reserved for them.
  const showLeadingSlot = selection?.selectMode || (pinnable && pinned);

  return (
    <ThreadListItemPrimitive.Root
      data-slot="aui_thread-list-item"
      // h-12, not h-8 (found live, Home's step 5b - the persistent
      // desktop thread-list column made every row always-visible
      // instead of behind a toggle): docs/UI.md's 48px touch-target
      // floor, one real thread per row.
      className="group hover:bg-muted focus-visible:bg-muted data-active:bg-muted has-focus-visible:bg-muted has-data-[state=open]:bg-muted relative flex h-12 items-center rounded-md transition-colors focus-visible:outline-none"
    >
      {selection?.selectMode && remoteId !== undefined && (
        <Checkbox
          data-slot="aui_thread-list-item-select"
          aria-label={checked ? `Deselect “${title}”` : `Select “${title}”`}
          checked={checked}
          onCheckedChange={() => selection.toggleSelected(remoteId)}
          className="absolute start-2.5 top-1/2 z-10 -translate-y-1/2"
        />
      )}
      {!selection?.selectMode && pinnable && remoteId !== undefined && (
        <button
          type="button"
          data-slot="aui_thread-list-item-pin"
          aria-pressed={pinned}
          aria-label={pinned ? "Unpin chat" : "Pin chat"}
          onClick={(event) => { event.preventDefault(); event.stopPropagation(); void togglePin(); }}
          className={cn(
            hitArea(3),
            "absolute z-10 start-1.5 top-1/2 flex size-6 -translate-y-1/2 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            pinned ? "text-primary opacity-100" : "opacity-0 group-hover:opacity-100 group-has-focus-visible:opacity-100",
          )}
        >
          {pinned ? <PinIcon className="size-3.5 fill-current" /> : <PinIcon className="size-3.5" />}
        </button>
      )}
      {isRenaming ? (
        <ThreadListItemRename
          onDone={(restoreFocus) => {
            restoreFocusRef.current = restoreFocus;
            setIsRenaming(false);
          }}
        />
      ) : (
        <ThreadListItemPrimitive.Trigger
          ref={triggerRef}
          data-slot="aui_thread-list-item-trigger"
          // pe-11/ps-11 (44px), not pe-9/ps-9 (36px): a code review
          // caught that the leading slot's own real invisible reach
          // (the Checkbox's own `after:-inset-4`, or this pin button's
          // `hitArea(3)`) lands at 42px from the row's start, the same
          // 6px-short-of-clearing gap the End side's own "More" button
          // was already fixed for (ps-9/pe-9's own 36px vs a 42px real
          // reach) - a click in that band used to land on the invisible
          // control instead of this trigger.
          className={cn(
            "focus-visible:ring-ring/50 flex h-full min-w-0 flex-1 items-center rounded-md px-2.5 text-start text-base outline-none group-hover:pe-11 group-has-focus-visible:pe-11 group-has-data-[state=open]:pe-11 group-data-active:pe-11 focus-visible:ring-1",
            // The hover-only reservation only ever applies to the pin
            // button's own hover-reveal (an unselected, unpinned row
            // has nothing else that could appear in this slot on
            // hover) - gated on `pinnable` for the same reason
            // `showLeadingSlot` above is: a `pinnable=false` caller has
            // no control that will ever fill this space, hovered or not.
            showLeadingSlot ? "ps-11" : pinnable ? "group-hover:ps-11 group-has-focus-visible:ps-11" : undefined,
          )}
        >
          {isRunning && (
            <Loader2Icon
              aria-hidden
              data-slot="aui_thread-list-item-running"
              className="text-muted-foreground me-1.5 size-3.5 shrink-0 animate-spin"
            />
          )}
          <span
            data-slot="aui_thread-list-item-title"
            className="min-w-0 flex-1 truncate"
          >
            <ThreadListItemPrimitive.Title fallback="New Chat" />
          </span>
          {isRunning && <span className="sr-only">Running</span>}
        </ThreadListItemPrimitive.Trigger>
      )}
      <ThreadListItemMore
        pinned={pinned}
        pinnable={pinnable && remoteId !== undefined}
        onTogglePin={() => void togglePin()}
        onRename={() => setIsRenaming(true)}
        onDelete={() => setConfirmDelete(true)}
      />
      <ThreadListConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete chat"
        description="This removes the messages in this chat. Saved memories remain."
        message={`Delete “${title}”?`}
        confirmLabel="Delete chat"
        busyLabel="Deleting…"
        busy={deleting}
        onConfirm={() => void deleteThread()}
      />
    </ThreadListItemPrimitive.Root>
  );
};

const ThreadListItemRename: FC<{
  onDone: (restoreFocus: boolean) => void;
}> = ({ onDone }) => {
  const aui = useAui();
  const title = useAuiState((s) => s.threadListItem.title) ?? "";
  const [value, setValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);
  const settledRef = useRef(false);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const commit = (restoreFocus: boolean) => {
    if (settledRef.current) return;
    settledRef.current = true;

    const next = value.trim();
    if (!next || next === title) {
      onDone(restoreFocus);
      return;
    }

    // Deferred so a synchronous throw lands on the rejection path too.
    Promise.resolve()
      .then(() => aui.threadListItem.rename(next))
      .then(
        () => onDone(restoreFocus),
        () => {
          toast.error("Could not rename this chat. Try again.");
          settledRef.current = false;
          if (restoreFocus) inputRef.current?.focus();
        },
      );
  };

  const cancel = () => {
    if (settledRef.current) return;
    settledRef.current = true;
    onDone(true);
  };

  return (
    <Input
      ref={inputRef}
      autoFocus
      data-slot="aui_thread-list-item-rename"
      aria-label="Rename thread"
      value={value}
      // Same call-site-override bug as the row and its own "More
      // options" trigger above (`h-7`/`text-sm` defeating Input's own
      // h-12/text-base floor) - fixed the same way, found live while
      // fixing those. pe-11 (44px), not pe-9: the same reserved-space
      // fix the row's own Trigger needed, so a caret placed at the end
      // of a rename in progress doesn't land on the more-button's own
      // now-larger invisible hitArea(3) reach instead.
      className="min-w-0 flex-1 ps-2.5 pe-11"
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => commit(false)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit(true);
        } else if (event.key === "Escape") {
          event.preventDefault();
          cancel();
        }
      }}
    />
  );
};

const ThreadListItemMore: FC<{ pinned: boolean; pinnable: boolean; onTogglePin: () => void; onRename: () => void; onDelete: () => void }> = ({ pinned, pinnable, onTogglePin, onRename, onDelete }) => {
  return (
    <ThreadListItemMorePrimitive.Root sharedFocusGroup>
      <ThreadListItemMorePrimitive.Trigger asChild>
        <Button
          variant="ghost"
          // `icon-xs`, not `icon` + a `size-6` override (found live,
          // Home's step 5b - the persistent desktop thread-list column
          // made this always-visible): the override was silently
          // shrinking Button's own 48px `icon` size to 24px with no
          // touch-target extension at all. `icon-xs` is the same 24px
          // visual size this row's compact layout needs, but carries
          // its own hitArea() extension to the real 48px floor.
          size="icon-xs"
          data-slot="aui_thread-list-item-more"
          className="data-[state=open]:bg-accent absolute end-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-has-focus-visible:opacity-100 group-data-active:opacity-100 data-[state=open]:opacity-100"
        >
          <MoreHorizontalIcon className="size-3.5" />
          <span className="sr-only">More options</span>
        </Button>
      </ThreadListItemMorePrimitive.Trigger>
      <ThreadListItemMorePrimitive.Content
        side="right"
        align="start"
        sideOffset={6}
        data-slot="aui_thread-list-item-more-content"
        className="bg-popover text-popover-foreground data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:animate-out data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-32 overflow-hidden rounded-xl border p-1.5"
      >
        {/* min-h-12/text-base, not the assistant-ui registry's own py-
            1.5/text-sm (found live, Home's step 5b, the same
            touch-target/type floor sweep as the rest of this file -
            this menu is @assistant-ui/react's own primitive, not the
            kit's DropdownMenuItem, so it never inherited that fix). */}
        {pinnable && (
          <ThreadListItemMorePrimitive.Item
            data-slot="aui_thread-list-item-more-item"
            className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex min-h-12 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-base outline-none select-none"
            onSelect={onTogglePin}
          >
            {pinned ? <PinOffIcon className="size-4" /> : <PinIcon className="size-4" />}
            {pinned ? "Unpin" : "Pin"}
          </ThreadListItemMorePrimitive.Item>
        )}
        <ThreadListItemMorePrimitive.Item
          data-slot="aui_thread-list-item-more-item"
          className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex min-h-12 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-base outline-none select-none"
          onSelect={onRename}
        >
          <PencilIcon className="size-4" />
          Rename
        </ThreadListItemMorePrimitive.Item>
          <ThreadListItemMorePrimitive.Item
            data-slot="aui_thread-list-item-more-item"
            onSelect={onDelete}
            // dark:hover:/dark:focus: bg-destructive/20, not just the
            // light-mode /10 (a code review caught this): the kit's own
            // DropdownMenuItem destructive variant (dropdown-menu.tsx)
            // bumps the same tint in dark mode for contrast, and this
            // menu (assistant-ui's own primitive, not that component)
            // never inherited it.
            className="text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive dark:hover:bg-destructive/20 dark:focus:bg-destructive/20 flex min-h-12 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-base outline-none select-none"
          >
            <TrashIcon className="size-4" />
            Delete
          </ThreadListItemMorePrimitive.Item>
      </ThreadListItemMorePrimitive.Content>
    </ThreadListItemMorePrimitive.Root>
  );
};
