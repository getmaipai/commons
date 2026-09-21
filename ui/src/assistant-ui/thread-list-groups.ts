// Pure grouping logic for the thread list (thread-list.aui.tsx's own
// `useThreadListGroups` wraps this in a `useMemo`) - kept in its own
// module, not inline in that file, specifically so it imports nothing
// from React or `@assistant-ui/react`: importing it from the same file as
// `ThreadList` would drag in that file's own heavy top-of-file imports
// (found live - a code review's own regression test for this function
// failed with an unrelated "Cannot find module 'assistant-cloud/ai-sdk'"
// error, a transitive `@assistant-ui/react` dependency this pure logic
// has nothing to do with, the moment it was imported from the same file).

const DAY_IN_MS = 86_400_000;

const dateGroupLabel = (date: Date | undefined, startOfToday: number): string => {
  if (!date || date.getTime() >= startOfToday) return "Today";
  if (date.getTime() >= startOfToday - DAY_IN_MS) return "Yesterday";
  return "Earlier";
};

export type ThreadListGroup = { label: string; indices: number[] };

/** The minimum a thread needs to carry for grouping - deliberately not
 * `ThreadListItemCoreState` itself, so this module's own tests don't need
 * a real assistant-ui runtime to construct one. */
export interface ThreadListGroupableItem {
  title?: string | undefined;
  lastMessageAt?: Date | undefined;
  custom?: Record<string, unknown> | undefined;
}

/**
 * The pure grouping logic `useThreadListGroups` wraps in a `useMemo` - kept
 * separate and exported so it's unit-testable without a real assistant-ui
 * runtime (a code review: no regression test existed for the exact bug
 * class this function was rewritten to fix, despite a sibling grouping
 * function elsewhere in this kit having one). Filters by title, sorts
 * pinned threads (read directly off `custom.pinned` when `pinnable` is
 * true - the same field `ThreadListItem` reads to draw its own pin
 * button, and `RemoteThreadListAdapter`'s own sanctioned per-thread
 * extension point, not something this function invented; a `pinnable`
 * caller's own stale or shared `custom` data is trusted the same way a
 * `pinnable=false` caller's is deliberately NOT, since it has no pin
 * control anywhere to explain or undo an unexpected "Pinned" section) into
 * their own "Pinned" group ahead of everything else, and buckets the rest
 * by last activity (Today, Yesterday, Earlier). `groups` is null only when
 * nothing is pinned AND no thread carries a date at all - the one state
 * with truly nothing to group by, where `filteredIndices` keeps the
 * runtime order and the caller renders it flat. Once anything is pinned,
 * every unpinned thread still gets a real group (a dateless one reads as
 * "Today," `dateGroupLabel`'s own default) rather than being silently
 * dropped, which an earlier version of this function did - a code review
 * caught it discarding every dateless unpinned thread the moment anything
 * else was pinned, since the two states used to be handled by two
 * different, not-quite-matching branches.
 *
 * `skipFilter` (a caller whose adapter already re-fetches server-side for
 * the same query, message bodies included): keeps every loaded thread and
 * only groups by date - filtering by title on top of an already-server-
 * filtered set would hide a message-body-only match whose title never
 * contained the query.
 *
 * `filteredIndices`'s own order: original thread order when `groups` is
 * null (nothing to sort by); pinned-then-unpinned, each time-descending,
 * whenever `groups` is non-null - a caller other than this file's own
 * `ThreadListItemGroups` (which only ever reads its length, or renders
 * `groups` directly) that depends on original order in the non-null case
 * should read `threadIds` itself instead.
 */
export function computeThreadListGroups(
  threadIds: readonly string[],
  itemsById: ReadonlyMap<string, ThreadListGroupableItem>,
  searchQuery = "",
  skipFilter = false,
  pinnable = false,
): { threadIds: readonly string[]; filteredIndices: number[]; groups: ThreadListGroup[] | null } {
  const query = searchQuery.trim().toLowerCase();
  // One pass over every thread (not one `.filter()` for the query, a
  // second for pinned, a third for unpinned, plus a per-comparison
  // re-lookup inside each sort - a code review flagged the redundant
  // `itemsById.get()` calls that produced): each index lands in
  // `filteredIndices`, in exactly one of the two partitions, and its own
  // sort time is computed once, here, not re-fetched by the comparator.
  const filteredIndices: number[] = [];
  const pinnedIndices: number[] = [];
  const unpinnedIndices: number[] = [];
  const timesByIndex = new Map<number, number>();
  const datesByIndex = new Map<number, Date | undefined>();
  let anyDate = false;
  threadIds.forEach((id, index) => {
    const item = itemsById.get(id);
    const matches = skipFilter || !query || (item?.title || "New Chat").toLowerCase().includes(query);
    if (!matches) return;
    filteredIndices.push(index);
    datesByIndex.set(index, item?.lastMessageAt);
    timesByIndex.set(index, item?.lastMessageAt?.getTime() ?? Number.MAX_SAFE_INTEGER);
    if (item?.lastMessageAt) anyDate = true;
    (pinnable && item?.custom?.pinned === true ? pinnedIndices : unpinnedIndices).push(index);
  });

  if (pinnedIndices.length === 0 && !anyDate) {
    return { threadIds, filteredIndices, groups: null };
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const byTimeDesc = (a: number, b: number) => timesByIndex.get(b)! - timesByIndex.get(a)!;
  const sortedPinned = [...pinnedIndices].sort(byTimeDesc);
  const sortedUnpinned = [...unpinnedIndices].sort(byTimeDesc);

  const groups: ThreadListGroup[] = sortedPinned.length > 0 ? [{ label: "Pinned", indices: sortedPinned }] : [];
  for (const index of sortedUnpinned) {
    const label = dateGroupLabel(datesByIndex.get(index), startOfToday);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.label === label) {
      lastGroup.indices.push(index);
    } else {
      groups.push({ label, indices: [index] });
    }
  }
  return { threadIds, filteredIndices: [...sortedPinned, ...sortedUnpinned], groups };
}
