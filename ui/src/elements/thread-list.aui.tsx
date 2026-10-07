"use client";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";
import { cn } from "cn";
import {
  AuiIf,
  ThreadListItemMorePrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { ProjectMark } from "./project-mark";
import { formatRelative } from "../relativeTime";
import { hitArea } from "../utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import {
  ArchiveIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
  FolderIcon,
  FolderInputIcon,
  FolderMinusIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PinIcon,
  PinOffIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "lucide-react";
import {
  createContext,
  forwardRef,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type DragEvent,
  type FC,
  type KeyboardEvent,
} from "react";

export type ThreadListLabels = {
  newChat?: string;
  searchChats?: string;
  /** Menu item on an unpinned row (only when `pinnable`). Default "Pin". */
  pin?: string;
  /** Menu item on a pinned row (only when `pinnable`). Default "Unpin". */
  unpin?: string;
  /** Group header above the day groups (only when `pinnable`). Default "Pinned". */
  pinned?: string;
};

type ThreadListPinConfig = {
  pinnable: boolean;
  pin: string;
  unpin: string;
  pinned: string;
};

const defaultPinConfig: ThreadListPinConfig = {
  pinnable: false,
  pin: "Pin",
  unpin: "Unpin",
  pinned: "Pinned",
};

const ThreadListPinContext = createContext<ThreadListPinConfig>(defaultPinConfig);

/** Words the projects mode shows; every one has an English default. */
export type ThreadListProjectLabels = {
  /** Section label above the projects. Default "Projects". */
  projects?: string;
  /** The section label's "+" and the create field. Default "New project". */
  newProject?: string;
  /** Placeholder in the create and rename fields. Default "Project name". */
  projectName?: string;
  /** Chat row menu item that lists the projects. Default "Move to project". */
  moveTo?: string;
  /** Chat row menu item for a chat in a project. Default "Remove from project". */
  removeFromProject?: string;
  /** Back from the project list to the chat menu. Default "Back". */
  back?: string;
  /** Project row menu item. Default "New chat in project". */
  newChatInProject?: string;
  /** Project row menu items. Defaults "Rename" and "Delete". */
  rename?: string;
  delete?: string;
  /** Inline delete confirmation. Default "Delete this project? Its chats stay." */
  confirmDelete?: string;
  /** Cancel in the inline confirmation. Default "Cancel". */
  cancel?: string;
  /** Shown under a project with more than six chats. Defaults "Show more" and "Show less". */
  showMore?: string;
  showLess?: string;
  /** Shown inside an open project with no chats. Default "No chats yet". */
  empty?: string;
  /** Accessible name of a project row's menu button. Default "Project options". */
  projectOptions?: string;
  /** Menu item that opens the project's settings (needs `onEdit`). Default "Edit project". */
  editProject?: string;
  /** Link row after the projects (needs `onSeeAll`). Default "See all projects". */
  seeAll?: string;
  /** Menu items when a host passes `onPin`. Defaults "Pin project" and "Unpin project". */
  pinProject?: string;
  unpinProject?: string;
  /** Accessible name of the chevron that folds a project's chats (with `onOpen`). Default "Show or hide chats". */
  toggleChats?: string;
};

/** One project in the list. `icon` and `color` are the spec's names (see
 * `ProjectMark`); absent, the row is the plain folder it always was. */
export type ThreadListProjectFolder = {
  id: string;
  name: string;
  icon?: string | undefined;
  color?: string | undefined;
  /** A pinned project lists first, under Pinned. */
  pinned?: boolean | undefined;
};

/**
 * Opt-in projects mode (CHAT-PROJECT-01). A host passes the person's
 * projects; a chat whose custom metadata carries `folder_id` naming one of
 * them leaves the day groups and lists under its project instead. Moving a
 * chat calls the thread list's own `updateCustom` with the new `folder_id`
 * (null to take it out), the same channel pinning uses. Creating, renaming,
 * deleting and starting a chat in a project are the host's callbacks.
 */
export type ThreadListProjects = {
  folders: ReadonlyArray<ThreadListProjectFolder>;
  /** Make, rename and delete projects. Default false. */
  canManage?: boolean;
  /** Move chats in and out (menu and drag). Default true. */
  canMove?: boolean;
  onCreate?: (name: string) => void | Promise<void>;
  onRename?: (id: string, name: string) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
  onNewChat?: (id: string) => void;
  /** The project's name opens its page; the chevron still folds the row. */
  onOpen?: (id: string) => void;
  /** Adds "Edit project" to the row menu (the host opens its settings). */
  onEdit?: (id: string) => void;
  /** Adds Pin / Unpin project to the row menu. */
  onPin?: (id: string, pinned: boolean) => void;
  /** Adds a "See all projects" row after the list. */
  onSeeAll?: () => void;
  /** Opt into the project-page chat row presentation; absent keeps current rows unchanged. */
  rowVariant?: "page";
  /** Page-row details keyed by thread id. Missing fields are omitted. */
  pageRows?: Readonly<Record<string, ThreadListPageRow>>;
  labels?: ThreadListProjectLabels;
};

export type ThreadListPageRow = {
  preview?: string | null;
  date?: string | null;
  projectIcon?: { icon?: string; color?: string };
};

const PROJECT_LABEL_DEFAULTS: Required<ThreadListProjectLabels> = {
  projects: "Projects",
  newProject: "New project",
  projectName: "Project name",
  moveTo: "Move to project",
  removeFromProject: "Remove from project",
  back: "Back",
  newChatInProject: "New chat in project",
  rename: "Rename",
  delete: "Delete",
  confirmDelete: "Delete this project? Its chats stay.",
  cancel: "Cancel",
  showMore: "Show more",
  showLess: "Show less",
  empty: "No chats yet",
  projectOptions: "Project options",
  editProject: "Edit project",
  seeAll: "See all projects",
  pinProject: "Pin project",
  unpinProject: "Unpin project",
  toggleChats: "Show or hide chats",
};

type ResolvedProjects = Omit<ThreadListProjects, "labels"> & {
  labels: Required<ThreadListProjectLabels>;
  canManage: boolean;
  canMove: boolean;
};

const ThreadListProjectsContext = createContext<ResolvedProjects | null>(null);
export type ThreadListDensity = "default" | "compact";
const ThreadListDensityContext = createContext<ThreadListDensity>("default");

/** Reads the project id a host keeps in a thread's custom metadata. */
export const threadFolderId = (custom: Record<string, unknown> | undefined): string | null =>
  typeof custom?.folder_id === "string" ? custom.folder_id : null;

/** A chat shows under its project only when that project is listed, the
 * list is not being searched, and (with pinning) the chat is not pinned:
 * a chat appears in exactly one place, and Pinned wins. */
const PROJECT_PREVIEW_COUNT = 6;
const THREAD_DRAG_TYPE = "application/x-maipai-thread";

const menuContentClass =
  "bg-popover text-popover-foreground data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:animate-out data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-32 overflow-hidden rounded-xl border p-1.5";
const menuItemClass =
  "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none";
const destructiveItemClass =
  "text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none";

const resolvePinConfig = (
  pinnable: boolean | undefined,
  labels: ThreadListLabels | undefined,
): ThreadListPinConfig => ({
  pinnable: pinnable ?? false,
  pin: labels?.pin ?? defaultPinConfig.pin,
  unpin: labels?.unpin ?? defaultPinConfig.unpin,
  pinned: labels?.pinned ?? defaultPinConfig.pinned,
});

/** Reads the `pinned` flag a host keeps in a thread's custom metadata. */
export const isThreadPinned = (
  custom: Record<string, unknown> | undefined,
): boolean => custom?.pinned === true;

export const ThreadList: FC<{ labels?: ThreadListLabels; pinnable?: boolean }> = ({
  labels,
  pinnable,
}) => {
  const [search, setSearch] = useState("");
  const hasThreads = useAuiState((s) => s.threads.threadIds.length > 0);
  const newChatLabel = labels?.newChat ?? "New chat";
  const searchChatsLabel = labels?.searchChats ?? "Search chats";

  return (
    <ThreadListRoot>
      <ThreadListNew label={newChatLabel} />
      {hasThreads && (
        <ThreadListSearch value={search} onValueChange={setSearch} label={searchChatsLabel} />
      )}
      <ThreadListItems
        searchQuery={hasThreads ? search : ""}
        pinnable={pinnable}
        labels={labels}
      />
    </ThreadListRoot>
  );
};

export const ThreadListSearch = forwardRef<
  HTMLInputElement,
  Omit<ComponentPropsWithoutRef<typeof Input>, "value" | "onChange"> & {
    value: string;
    onValueChange: (value: string) => void;
    label?: string;
    density?: ThreadListDensity;
  }
>(({ className, value, onValueChange, label = "Search chats", density = "default", ...props }, ref) => {
  return (
    <div data-slot="aui_thread-list-search" data-density={density} className={cn("relative px-0.5", density === "compact" ? "py-0" : "py-1")}>
      <SearchIcon
        data-slot="aui_thread-list-search-icon"
        className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
      />
      <Input
        ref={ref}
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        aria-label={label}
        placeholder={label}
        className={cn(density === "compact" ? "h-9 rounded-lg border-0 bg-muted px-2.5 ps-8 text-sm shadow-none" : "h-8 ps-8 text-sm", className)}
        {...props}
      />
    </div>
  );
});

ThreadListSearch.displayName = "ThreadListSearch";

export const ThreadListRoot: FC<
  ComponentPropsWithoutRef<typeof ThreadListPrimitive.Root> & { density?: ThreadListDensity }
> = ({ className, density = "default", ...props }) => {
  return (
    <ThreadListPrimitive.Root
      data-slot="aui_thread-list-root"
      data-density={density}
      className={cn("flex flex-col", density === "compact" ? "gap-0" : "gap-0.5", className)}
      {...props}
    />
  );
};

export const ThreadListItems: FC<
  ComponentPropsWithoutRef<"div"> & {
    searchQuery?: string;
    /** Adds Pin / Unpin to each row menu, a pinned indicator and a Pinned group. */
    pinnable?: boolean;
    labels?: ThreadListLabels;
    /** Opt-in projects mode; see ThreadListProjects. */
    projects?: ThreadListProjects;
    /** Compact chat-column density. Unset preserves the standard list. */
    density?: ThreadListDensity;
  }
> = ({ className, searchQuery = "", pinnable, labels, projects, density = "default", ...props }) => {
  const { pin: pinLabel, unpin: unpinLabel, pinned: pinnedLabel } = labels ?? {};
  const pin = useMemo(
    () =>
      resolvePinConfig(pinnable, {
        pin: pinLabel,
        unpin: unpinLabel,
        pinned: pinnedLabel,
      }),
    [pinnable, pinLabel, unpinLabel, pinnedLabel],
  );
  const resolvedProjects = useMemo<ResolvedProjects | null>(
    () =>
      projects
        ? {
            ...projects,
            canManage: projects.canManage ?? false,
            canMove: projects.canMove ?? true,
            labels: { ...PROJECT_LABEL_DEFAULTS, ...projects.labels },
          }
        : null,
    [projects],
  );
  return (
    <ThreadListDensityContext.Provider value={density}>
    <ThreadListPinContext.Provider value={pin}>
      <ThreadListProjectsContext.Provider value={resolvedProjects}>
      <div
        data-slot="aui_thread-list-items"
        data-density={density}
        className={cn("flex flex-col", density === "compact" ? "gap-0" : "gap-0.5", className)}
        {...props}
      >
        <AuiIf condition={(s) => s.threads.isLoading}>
          <ThreadListSkeleton />
        </AuiIf>
        <AuiIf condition={(s) => !s.threads.isLoading}>
          <ThreadListItemGroups searchQuery={searchQuery} />
        </AuiIf>
      </div>
      </ThreadListProjectsContext.Provider>
    </ThreadListPinContext.Provider>
    </ThreadListDensityContext.Provider>
  );
};

const DAY_IN_MS = 86_400_000;

/** Local midnight of `now`, in ms: the `startOfToday` `dateGroupLabel` takes. */
export const startOfLocalDay = (now: Date): number =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

/** The one definition of the day buckets (Today, Yesterday, Earlier).
 * `startOfToday` is local midnight in ms. A missing date counts as Today. */
export const dateGroupLabel = (
  date: Date | undefined,
  startOfToday: number,
): string => {
  if (!date || date.getTime() >= startOfToday) return "Today";
  if (date.getTime() >= startOfToday - DAY_IN_MS) return "Yesterday";
  return "Earlier";
};

export type ThreadListGroup = { label: string; indices: number[] };

/**
 * Filters the thread list by title and buckets the matches by last activity
 * (Today, Yesterday, Earlier). `groups` is null when no thread carries a
 * date, in which case `filteredIndices` keeps the runtime order. With
 * `options.pinnable`, rows whose custom metadata has `pinned: true` lead in
 * a group labelled `options.pinnedLabel` (default "Pinned") instead of
 * landing in a day group.
 */
export const useThreadListGroups = (
  searchQuery = "",
  options: { pinnable?: boolean; pinnedLabel?: string; folderIds?: ReadonlySet<string> | null } = {},
) => {
  const pinnable = options.pinnable ?? false;
  const folderIds = options.folderIds ?? null;
  const pinnedLabel = options.pinnedLabel ?? defaultPinConfig.pinned;
  const threadIds = useAuiState((s) => s.threads.threadIds);
  const threadItems = useAuiState((s) => s.threads.threadItems);

  const query = searchQuery.trim().toLowerCase();

  return useMemo(() => {
    const itemsById = new Map(threadItems.map((item) => [item.id, item]));
    const dates = threadIds.map((id) => itemsById.get(id)?.lastMessageAt);
    const filteredIndices = threadIds
      .map((id, index) => ({ id, index }))
      .filter(
        ({ id }) =>
          !query ||
          (itemsById.get(id)?.title || "New Chat")
            .toLowerCase()
            .includes(query),
      )
      .map(({ index }) => index);
    // Projects mode, not searching: a chat in a listed project goes under
    // that project (unless pinned, when Pinned wins), never in a day group.
    const byFolder = new Map<string, number[]>();
    const inFolder = (index: number): string | null => {
      if (!folderIds || query) return null;
      const custom = itemsById.get(threadIds[index] ?? "")?.custom;
      if (pinnable && isThreadPinned(custom)) return null;
      const folderId = threadFolderId(custom);
      return folderId && folderIds.has(folderId) ? folderId : null;
    };
    const timeOf = (index: number) => dates[index]?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (folderIds && !query) {
      for (const index of [...filteredIndices].sort((a, b) => timeOf(b) - timeOf(a))) {
        const folderId = inFolder(index);
        if (folderId) byFolder.set(folderId, [...(byFolder.get(folderId) ?? []), index]);
      }
    }
    const looseIndices = filteredIndices.filter((index) => inFolder(index) === null);
    if (!looseIndices.some((index) => dates[index])) {
      return { threadIds, filteredIndices, groups: null, looseIndices, byFolder };
    }

    const startOfToday = startOfLocalDay(new Date());
    const sorted = [...looseIndices].sort((a, b) => timeOf(b) - timeOf(a));

    const result: ThreadListGroup[] = [];
    if (pinnable) {
      const pinned = sorted.filter((index) =>
        isThreadPinned(itemsById.get(threadIds[index] ?? "")?.custom),
      );
      if (pinned.length > 0) {
        result.push({ label: pinnedLabel, indices: pinned });
      }
    }
    for (const index of sorted) {
      if (
        pinnable &&
        isThreadPinned(itemsById.get(threadIds[index] ?? "")?.custom)
      ) {
        continue;
      }
      const label = dateGroupLabel(dates[index], startOfToday);
      const lastGroup = result[result.length - 1];
      if (lastGroup?.label === label) {
        lastGroup.indices.push(index);
      } else {
        result.push({ label, indices: [index] });
      }
    }
    return { threadIds, filteredIndices, groups: result, looseIndices, byFolder };
  }, [threadIds, threadItems, query, pinnable, pinnedLabel, folderIds]);
};

const ThreadListItemGroups: FC<{ searchQuery?: string }> = ({
  searchQuery = "",
}) => {
  const pin = useContext(ThreadListPinContext);
  const projects = useContext(ThreadListProjectsContext);
  const density = useContext(ThreadListDensityContext);
  const folderIds = useMemo(
    () => (projects ? new Set(projects.folders.map((folder) => folder.id)) : null),
    [projects],
  );
  const { threadIds, filteredIndices, groups, looseIndices, byFolder } = useThreadListGroups(
    searchQuery,
    { pinnable: pin.pinnable, pinnedLabel: pin.pinned, folderIds },
  );
  const query = searchQuery.trim();

  if (query && filteredIndices.length === 0) {
    return (
      <div
        data-slot="aui_thread-list-empty"
        className="text-muted-foreground px-2.5 py-4 text-sm"
      >
        No threads found
      </div>
    );
  }

  const row = (index: number) => (
    <ThreadListPrimitive.ItemByIndex
      key={threadIds[index]}
      index={index}
      components={{ ThreadListItem }}
    />
  );
  const pinnedFolders = projects && !query && pin.pinnable ? projects.folders.filter((folder) => folder.pinned) : [];
  const pinnedProjectRows = projects
    ? pinnedFolders.map((folder) => (
        <ThreadListProjectRow key={folder.id} folder={folder} projects={projects} indices={byFolder.get(folder.id) ?? []} row={row} />
      ))
    : [];
  const pinnedLabel = (
    <div
      data-slot="aui_thread-list-group-label"
      className={cn("text-muted-foreground px-2.5 pb-1 text-xs font-medium", density === "compact" ? "pt-4 first:pt-2" : "pt-3")}
    >
      {pin.pinned}
    </div>
  );
  const section =
    projects && !query ? (
      <ThreadListProjectsSection
        projects={projects}
        byFolder={byFolder}
        row={row}
        skip={new Set(pinnedFolders.map((folder) => folder.id))}
      />
    ) : null;

  if (!groups) {
    return (
      <>
        {pinnedProjectRows.length > 0 ? pinnedLabel : null}
        {pinnedProjectRows}
        {section}
        {looseIndices.map(row)}
      </>
    );
  }

  // Pinned (when present) leads, then Projects, then the day groups.
  const pinnedFirst = pin.pinnable && groups[0]?.label === pin.pinned ? groups[0] : null;
  const rest = pinnedFirst ? groups.slice(1) : groups;
  const renderGroup = (group: ThreadListGroup, leading?: React.ReactNode) => (
    <Fragment key={group.label}>
      <div
        data-slot="aui_thread-list-group-label"
        className={cn("text-muted-foreground px-2.5 pb-1 text-xs font-medium", density === "compact" ? "pt-4 first:pt-2" : "pt-3")}
      >
        {group.label}
      </div>
      {leading}
      {group.indices.map(row)}
    </Fragment>
  );
  return (
    <>
      {pinnedFirst ? renderGroup(pinnedFirst, pinnedProjectRows) : pinnedProjectRows.length > 0 ? (
        <>
          {pinnedLabel}
          {pinnedProjectRows}
        </>
      ) : null}
      {section}
      {rest.map((group) => renderGroup(group))}
    </>
  );
};

/** The projects section: its label (with "+" when the host allows), then
 * one collapsible row per project with its chats indented under it. */
const ThreadListProjectsSection: FC<{
  projects: ResolvedProjects;
  byFolder: Map<string, number[]>;
  row: (index: number) => React.ReactNode;
  /** Projects already drawn under Pinned. */
  skip?: ReadonlySet<string>;
}> = ({ projects, byFolder, row, skip }) => {
  const density = useContext(ThreadListDensityContext);
  const { labels } = projects;
  const [creating, setCreating] = useState(false);
  const canCreate = projects.canManage && Boolean(projects.onCreate);
  if (projects.folders.length === 0 && !canCreate) return null;
  return (
    <div data-slot="aui_thread-list-projects" data-density={density} className={cn("flex flex-col", density === "compact" ? "gap-0" : "gap-0.5")}>
      <div
        data-slot="aui_thread-list-group-label"
        className={cn("text-muted-foreground flex items-center justify-between px-2.5 pb-1 text-xs font-medium", density === "compact" ? "pt-4 first:pt-2" : "pt-3")}
      >
        <span>{labels.projects}</span>
        {canCreate ? (
          <Button
            variant="ghost"
            size="icon"
            data-slot="aui_thread-list-section-action"
            aria-label={labels.newProject}
            // A 24px box with a 12px transparent overhang: the 48px touch floor.
            className="relative size-6 p-0 before:absolute before:-inset-3 before:content-['']"
            onClick={() => setCreating(true)}
          >
            <PlusIcon className="size-3.5" />
          </Button>
        ) : null}
      </div>
      {creating ? (
        <ProjectNameField
          label={labels.newProject}
          placeholder={labels.projectName}
          initial=""
          onDone={async (name) => {
            // The field closes whether or not the host's save succeeds;
            // the host says what went wrong.
            try {
              if (name) await projects.onCreate?.(name);
            } finally {
              setCreating(false);
            }
          }}
        />
      ) : null}
      {projects.folders
        .filter((folder) => !skip?.has(folder.id))
        .map((folder) => (
          <ThreadListProjectRow
            key={folder.id}
            folder={folder}
            projects={projects}
            indices={byFolder.get(folder.id) ?? []}
            row={row}
          />
        ))}
      {projects.onSeeAll ? (
        <Button
          variant="ghost"
          data-slot="aui_thread-list-projects-see-all"
          className={cn("text-muted-foreground justify-start px-2.5 text-sm font-normal", density === "compact" ? "h-9 rounded-lg" : "h-8 rounded-md")}
          onClick={() => projects.onSeeAll?.()}
        >
          {labels.seeAll}
        </Button>
      ) : null}
    </div>
  );
};

/** One inline name field, for making and renaming a project: Enter keeps
 * it, Escape or an empty name drops it. */
const ProjectNameField: FC<{
  label: string;
  placeholder: string;
  initial: string;
  onDone: (name: string | null) => void | Promise<void>;
}> = ({ label, placeholder, initial, onDone }) => {
  const [value, setValue] = useState(initial);
  const settled = useRef(false);
  const finish = (keep: boolean) => {
    if (settled.current) return;
    settled.current = true;
    const name = value.trim();
    // A host whose save fails reports it itself; nothing is left pending here.
    Promise.resolve(onDone(keep && name && name !== initial ? name : null)).catch(() => {});
  };
  return (
    <Input
      autoFocus
      data-slot="aui_thread-list-project-name"
      aria-label={label}
      placeholder={placeholder}
      maxLength={80}
      value={value}
      className="h-8 min-w-0 ps-2.5 text-sm"
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          finish(true);
        } else if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          finish(false);
        }
      }}
    />
  );
};

const ThreadListProjectRow: FC<{
  folder: ThreadListProjectFolder;
  projects: ResolvedProjects;
  indices: number[];
  row: (index: number) => React.ReactNode;
}> = ({ folder, projects, indices, row }) => {
  const density = useContext(ThreadListDensityContext);
  const aui = useAui();
  const { labels } = projects;
  const activeId = useAuiState((s) => s.threads.mainThreadId);
  const threadIds = useAuiState((s) => s.threads.threadIds);
  const holdsActive = indices.some((index) => threadIds[index] === activeId);
  const [open, setOpen] = useState(holdsActive);
  const [showAll, setShowAll] = useState(false);
  const [mode, setMode] = useState<"idle" | "rename" | "confirm">("idle");
  const [dropping, setDropping] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // A chat opened from elsewhere (search, a new chat in this project) opens
  // its project so the person can see where it is.
  useEffect(() => {
    if (holdsActive) setOpen(true);
  }, [holdsActive]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowRight" && !open) {
      event.preventDefault();
      setOpen(true);
    } else if (event.key === "ArrowLeft" && open) {
      event.preventDefault();
      setOpen(false);
    }
  };

  const acceptsDrop = (event: DragEvent) =>
    projects.canMove && event.dataTransfer.types.includes(THREAD_DRAG_TYPE);
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    setDropping(false);
    if (!acceptsDrop(event)) return;
    event.preventDefault();
    const threadId = event.dataTransfer.getData(THREAD_DRAG_TYPE);
    if (!threadId) return;
    const item = aui.threads().item({ id: threadId });
    const custom = item.getState().custom;
    if (threadFolderId(custom) === folder.id) return;
    void item.updateCustom({ ...custom, folder_id: folder.id });
    setOpen(true);
  };

  const visible = showAll ? indices : indices.slice(0, PROJECT_PREVIEW_COUNT);
  const restoreFocus = useCallback(() => triggerRef.current?.focus(), []);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        data-slot="aui_thread-list-project"
        data-drop-target={dropping || undefined}
        className={cn("group data-[drop-target]:ring-ring/50 relative flex items-center transition-colors data-[drop-target]:ring-1", density === "compact" ? "h-9 min-h-9 rounded-lg" : "h-8")}
        onDragOver={(event) => {
          if (!acceptsDrop(event)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setDropping(true);
        }}
        onDragLeave={() => setDropping(false)}
        onDrop={onDrop}
      >
        {mode === "rename" ? (
          <ProjectNameField
            label={labels.rename}
            placeholder={labels.projectName}
            initial={folder.name}
            onDone={async (name) => {
              try {
                if (name) await projects.onRename?.(folder.id, name);
              } finally {
                setMode("idle");
                restoreFocus();
              }
            }}
          />
        ) : projects.onOpen ? (
          <>
            <button
              type="button"
              data-slot="aui_thread-list-project-open"
              onClick={() => projects.onOpen?.(folder.id)}
              className="focus-visible:ring-ring/50 flex h-full min-w-0 flex-1 items-center gap-2 rounded-[inherit] text-start outline-none group-hover:pe-16 group-has-focus-visible:pe-16 group-has-data-[state=open]:pe-16 focus-visible:ring-1"
            >
              <ProjectMark icon={folder.icon} color={folder.color} />
              <span data-slot="aui_thread-list-project-title" className="min-w-0 flex-1 truncate">
                {folder.name}
              </span>
            </button>
            <CollapsibleTrigger asChild>
              <button
                ref={triggerRef}
                type="button"
                data-slot="aui_thread-list-project-trigger"
                aria-label={labels.toggleChats}
                onKeyDown={onKeyDown}
                className="focus-visible:ring-ring/50 relative flex h-full w-7 shrink-0 items-center justify-center rounded-[inherit] outline-none focus-visible:ring-1"
              >
                <ChevronRightIcon
                  aria-hidden
                  data-slot="aui_thread-list-project-chevron"
                  className={cn(
                    "text-muted-foreground size-3.5 shrink-0 transition-transform motion-reduce:transition-none",
                    open && "rotate-90",
                  )}
                />
              </button>
            </CollapsibleTrigger>
          </>
        ) : (
          <CollapsibleTrigger asChild>
            <button
              ref={triggerRef}
              type="button"
              data-slot="aui_thread-list-project-trigger"
              onKeyDown={onKeyDown}
              className="focus-visible:ring-ring/50 flex h-full min-w-0 flex-1 items-center gap-2 rounded-[inherit] text-start outline-none group-hover:pe-9 group-has-focus-visible:pe-9 group-has-data-[state=open]:pe-9 focus-visible:ring-1"
            >
              <ProjectMark icon={folder.icon} color={folder.color} />
              <span data-slot="aui_thread-list-project-title" className="min-w-0 flex-1 truncate">
                {folder.name}
              </span>
              <ChevronRightIcon
                aria-hidden
                data-slot="aui_thread-list-project-chevron"
                className={cn(
                  "text-muted-foreground size-3.5 shrink-0 transition-transform motion-reduce:transition-none",
                  open && "rotate-90",
                )}
              />
            </button>
          </CollapsibleTrigger>
        )}
        {mode !== "rename" && (projects.onNewChat || projects.onEdit || projects.onPin || (projects.canManage && (projects.onRename || projects.onDelete))) ? (
          <DropdownMenuPrimitive.Root>
            <DropdownMenuPrimitive.Trigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-slot="aui_thread-list-project-more"
                className="data-[state=open]:bg-accent absolute end-1.5 top-1/2 size-6 -translate-y-1/2 p-0 opacity-0 group-hover:opacity-100 group-has-focus-visible:opacity-100 data-[state=open]:opacity-100 before:absolute before:-inset-3 before:content-['']"
              >
                <MoreHorizontalIcon className="size-3.5" />
                <span className="sr-only">{labels.projectOptions}</span>
              </Button>
            </DropdownMenuPrimitive.Trigger>
            <DropdownMenuPrimitive.Portal>
              <DropdownMenuPrimitive.Content
                side="right"
                align="start"
                sideOffset={6}
                data-slot="aui_thread-list-project-more-content"
                className={menuContentClass}
              >
                {projects.onNewChat ? (
                  <DropdownMenuPrimitive.Item className={menuItemClass} onSelect={() => projects.onNewChat?.(folder.id)}>
                    <PencilIcon className="size-4" />
                    {labels.newChatInProject}
                  </DropdownMenuPrimitive.Item>
                ) : null}
                {projects.canManage && projects.onEdit ? (
                  <DropdownMenuPrimitive.Item className={menuItemClass} onSelect={() => projects.onEdit?.(folder.id)}>
                    <PencilIcon className="size-4" />
                    {labels.editProject}
                  </DropdownMenuPrimitive.Item>
                ) : null}
                {projects.onPin ? (
                  <DropdownMenuPrimitive.Item className={menuItemClass} onSelect={() => projects.onPin?.(folder.id, !folder.pinned)}>
                    {folder.pinned ? <PinOffIcon className="size-4" /> : <PinIcon className="size-4" />}
                    {folder.pinned ? labels.unpinProject : labels.pinProject}
                  </DropdownMenuPrimitive.Item>
                ) : null}
                {projects.canManage && projects.onRename ? (
                  <DropdownMenuPrimitive.Item className={menuItemClass} onSelect={() => setMode("rename")}>
                    <PencilIcon className="size-4" />
                    {labels.rename}
                  </DropdownMenuPrimitive.Item>
                ) : null}
                {projects.canManage && projects.onDelete ? (
                  <DropdownMenuPrimitive.Item className={destructiveItemClass} onSelect={() => setMode("confirm")}>
                    <TrashIcon className="size-4" />
                    {labels.delete}
                  </DropdownMenuPrimitive.Item>
                ) : null}
              </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
          </DropdownMenuPrimitive.Root>
        ) : null}
      </div>
      {mode === "confirm" ? (
        <div
          role="group"
          aria-label={labels.confirmDelete}
          data-slot="aui_thread-list-project-confirm"
          className="flex flex-col gap-1.5 px-2.5 py-2 text-sm"
        >
          <span>{labels.confirmDelete}</span>
          <div className="flex gap-1.5">
            <Button
              variant="destructive"
              size="sm"
              autoFocus
              onClick={() => {
                setMode("idle");
                Promise.resolve(projects.onDelete?.(folder.id)).catch(() => {});
              }}
            >
              {labels.delete}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMode("idle");
                restoreFocus();
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setMode("idle");
                  restoreFocus();
                }
              }}
            >
              {labels.cancel}
            </Button>
          </div>
        </div>
      ) : null}
      <CollapsibleContent
        data-slot="aui_thread-list-project-items"
        className="overflow-hidden ps-4 data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down motion-reduce:animate-none"
      >
        <div className="flex flex-col gap-0.5 pt-0.5">
          {indices.length === 0 ? (
            <div data-slot="aui_thread-list-project-empty" className="text-muted-foreground px-2.5 py-1.5 text-xs">
              {labels.empty}
            </div>
          ) : (
            visible.map(row)
          )}
          {indices.length > PROJECT_PREVIEW_COUNT ? (
            <Button
              variant="ghost"
              data-slot="aui_thread-list-project-show-more"
              className="text-muted-foreground h-8 justify-start rounded-md px-2.5 text-sm font-normal"
              onClick={() => setShowAll((all) => !all)}
            >
              {showAll ? labels.showLess : labels.showMore}
            </Button>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const ThreadListNew = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof Button> & { labelClassName?: string; label?: string; density?: ThreadListDensity }
>(({ className, labelClassName, children, label = "New chat", density = "default", ...props }, ref) => {
  return (
    <ThreadListPrimitive.New asChild>
      <Button
        ref={ref}
        variant="ghost"
        data-slot="aui_thread-list-new"
        data-density={density}
        className={cn(
          "hover:bg-muted data-active:bg-muted justify-start text-sm font-normal",
          density === "compact"
            ? "relative h-9 min-h-9 gap-2.5 rounded-lg border-0 bg-transparent px-2.5 shadow-none before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-['']"
            : cn("h-8 gap-2 rounded-md px-2.5", hitArea(2)),
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
              {label}
            </span>
          </>
        )}
      </Button>
    </ThreadListPrimitive.New>
  );
});

ThreadListNew.displayName = "ThreadListNew";

const ThreadListSkeleton: FC = () => {
  const density = useContext(ThreadListDensityContext);
  return (
    <div className="flex flex-col gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          role="status"
          aria-label="Loading threads"
          data-slot="aui_thread-list-skeleton-wrapper"
          data-density={density}
          className={cn("flex items-center px-2.5", density === "compact" ? "h-9 min-h-9" : "h-8")}
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
  const density = useContext(ThreadListDensityContext);
  const isRunning = useAuiState((s) => s.threadListItem.isRunning);
  const projects = useContext(ThreadListProjectsContext);
  const threadId = useAuiState((s) => s.threadListItem.id);
  const pageRow = projects?.rowVariant === "page" ? projects.pageRows?.[threadId] : undefined;
  const draggable = Boolean(projects?.canMove && projects.folders.length > 0);
  const { pinnable } = useContext(ThreadListPinContext);
  const isPinned = useAuiState((s) => isThreadPinned(s.threadListItem.custom));
  const [isRenaming, setIsRenaming] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);

  useEffect(() => {
    if (isRenaming || !restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    triggerRef.current?.focus();
  }, [isRenaming]);

  return (
    <ThreadListItemPrimitive.Root
      draggable={draggable && !isRenaming ? true : undefined}
      onDragStart={
        draggable
          ? (event: DragEvent<HTMLDivElement>) => {
              event.dataTransfer.setData(THREAD_DRAG_TYPE, threadId);
              event.dataTransfer.effectAllowed = "move";
            }
          : undefined
      }
      data-slot="aui_thread-list-item"
      data-density={density}
      className={cn(
        "group hover:bg-muted focus-visible:bg-muted data-active:bg-muted has-focus-visible:bg-muted has-data-[state=open]:bg-muted relative flex items-center rounded-md transition-colors focus-visible:outline-none",
        pageRow ? "min-h-16" : density === "compact" ? "h-9 min-h-9 rounded-lg" : "h-8",
      )}
    >
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
          data-density={density}
          className={cn(
            "focus-visible:ring-ring/50 flex h-full min-w-0 flex-1 items-center px-2.5 text-start text-sm outline-none group-hover:pe-9 group-has-focus-visible:pe-9 group-has-data-[state=open]:pe-9 group-data-active:pe-9 focus-visible:ring-1",
            density === "compact" ? "rounded-lg" : "rounded-md",
            pageRow && "gap-3 py-2",
            density === "compact" ? "before:-inset-y-1.5 before:inset-x-0" : hitArea(2),
          )}
        >
          {pageRow?.projectIcon ? <ProjectMark icon={pageRow.projectIcon.icon} color={pageRow.projectIcon.color} /> : null}
          {pinnable && isPinned && (
            <PinIcon
              aria-hidden
              data-slot="aui_thread-list-item-pinned"
              className="text-muted-foreground me-1.5 size-3 shrink-0"
            />
          )}
          {isRunning && (
            <Loader2Icon
              aria-hidden
              data-slot="aui_thread-list-item-running"
              className="text-muted-foreground me-1.5 size-3.5 shrink-0 animate-spin"
            />
          )}
          {pageRow ? (
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span data-slot="aui_thread-list-item-title" className="truncate font-medium">
                <ThreadListItemPrimitive.Title fallback="New Chat" />
              </span>
              {pageRow.preview ? <span data-slot="aui_thread-list-item-preview" className="text-muted-foreground truncate text-sm">{pageRow.preview}</span> : null}
            </span>
          ) : (
            <span data-slot="aui_thread-list-item-title" className="min-w-0 flex-1 truncate">
              <ThreadListItemPrimitive.Title fallback="New Chat" />
            </span>
          )}
          {pageRow?.date ? <time data-slot="aui_thread-list-item-date" dateTime={pageRow.date} className="text-muted-foreground shrink-0 text-sm">{formatRelative(pageRow.date)}</time> : null}
          {isRunning && <span className="sr-only">Running</span>}
        </ThreadListItemPrimitive.Trigger>
      )}
      <ThreadListItemMore onRename={() => setIsRenaming(true)} />
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
      className="h-7 min-w-0 flex-1 ps-2.5 pe-9 text-sm"
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

const ThreadListItemMore: FC<{ onRename: () => void }> = ({ onRename }) => {
  const aui = useAui();
  const { pinnable, pin, unpin } = useContext(ThreadListPinContext);
  const isPinned = useAuiState((s) => isThreadPinned(s.threadListItem.custom));
  const projects = useContext(ThreadListProjectsContext);
  const folderId = useAuiState((s) => threadFolderId(s.threadListItem.custom));
  const [picking, setPicking] = useState(false);
  const canMove = Boolean(projects?.canMove);
  const moveTo = (next: string | null) => {
    const custom = aui.threadListItem().getState().custom;
    void aui.threadListItem().updateCustom({ ...custom, folder_id: next });
  };

  // updateCustom replaces the whole object, so keep the host's other keys.
  const togglePinned = () => {
    const custom = aui.threadListItem().getState().custom;
    void aui.threadListItem().updateCustom({ ...custom, pinned: !isPinned });
  };

  return (
    <ThreadListItemMorePrimitive.Root sharedFocusGroup onOpenChange={(open) => { if (!open) setPicking(false); }}>
      <ThreadListItemMorePrimitive.Trigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-slot="aui_thread-list-item-more"
          className="data-[state=open]:bg-accent absolute end-1.5 top-1/2 size-6 -translate-y-1/2 p-0 opacity-0 group-hover:opacity-100 group-has-focus-visible:opacity-100 group-data-active:opacity-100 data-[state=open]:opacity-100 before:absolute before:-inset-3 before:content-['']"
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
        className={menuContentClass}
      >
        {picking && projects ? (
          <>
            <ThreadListItemMorePrimitive.Item
              data-slot="aui_thread-list-item-more-item"
              className={menuItemClass}
              onSelect={(event) => {
                event.preventDefault();
                setPicking(false);
              }}
            >
              <ArrowLeftIcon className="size-4" />
              {projects.labels.back}
            </ThreadListItemMorePrimitive.Item>
            {projects.folders.map((folder) => (
              <ThreadListItemMorePrimitive.Item
                key={folder.id}
                data-slot="aui_thread-list-item-more-item"
                data-current={folder.id === folderId || undefined}
                disabled={folder.id === folderId}
                className={menuItemClass}
                onSelect={() => moveTo(folder.id)}
              >
                <FolderIcon className="size-4" />
                <span className="max-w-48 truncate">{folder.name}</span>
              </ThreadListItemMorePrimitive.Item>
            ))}
          </>
        ) : (
        <>
        <ThreadListItemMorePrimitive.Item
          data-slot="aui_thread-list-item-more-item"
          className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none"
          onSelect={onRename}
        >
          <PencilIcon className="size-4" />
          Rename
        </ThreadListItemMorePrimitive.Item>
        {pinnable && (
          <ThreadListItemMorePrimitive.Item
            data-slot="aui_thread-list-item-more-item"
            className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none"
            onSelect={togglePinned}
          >
            {isPinned ? (
              <PinOffIcon className="size-4" />
            ) : (
              <PinIcon className="size-4" />
            )}
            {isPinned ? unpin : pin}
          </ThreadListItemMorePrimitive.Item>
        )}
        {canMove && projects && projects.folders.length > 0 ? (
          <ThreadListItemMorePrimitive.Item
            data-slot="aui_thread-list-item-more-item"
            className={menuItemClass}
            onSelect={(event) => {
              event.preventDefault();
              setPicking(true);
            }}
          >
            <FolderInputIcon className="size-4" />
            {projects.labels.moveTo}
          </ThreadListItemMorePrimitive.Item>
        ) : null}
        {canMove && projects && folderId ? (
          <ThreadListItemMorePrimitive.Item
            data-slot="aui_thread-list-item-more-item"
            className={menuItemClass}
            onSelect={() => moveTo(null)}
          >
            <FolderMinusIcon className="size-4" />
            {projects.labels.removeFromProject}
          </ThreadListItemMorePrimitive.Item>
        ) : null}
        <ThreadListItemPrimitive.Archive asChild>
          <ThreadListItemMorePrimitive.Item
            data-slot="aui_thread-list-item-more-item"
            className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none"
          >
            <ArchiveIcon className="size-4" />
            Archive
          </ThreadListItemMorePrimitive.Item>
        </ThreadListItemPrimitive.Archive>
        <ThreadListItemPrimitive.Delete asChild>
          <ThreadListItemMorePrimitive.Item
            data-slot="aui_thread-list-item-more-item"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none"
          >
            <TrashIcon className="size-4" />
            Delete
          </ThreadListItemMorePrimitive.Item>
        </ThreadListItemPrimitive.Delete>
        </>
        )}
      </ThreadListItemMorePrimitive.Content>
    </ThreadListItemMorePrimitive.Root>
  );
};
