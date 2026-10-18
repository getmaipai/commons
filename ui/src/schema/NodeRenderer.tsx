import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ApiError, request } from "@/kit/http";
import { cardSizeGridTemplateColumns } from "@/kit/primitives/CardSizeSlider";
import { Section } from "@/kit/primitives/Section";
import { List } from "@/kit/primitives/List";
import { CardGrid } from "@/kit/primitives/CardGrid";
import { MediaShelf } from "@/kit/primitives/MediaShelf";
import { Billboard } from "@/kit/primitives/Billboard";
import { Player, type PlayerChapter, type PlayerTextTrack, type PlayerUpNext } from "@/kit/primitives/Player";
import { Reader } from "@/kit/primitives/Reader";
import { readerLocator, sameOriginBookUrl } from "@/kit/primitives/readerLogic";
import { formatTime } from "@/kit/primitives/playerLogic";
import { Badge } from "@/kit/ui/badge";
import { DetailPane } from "@/kit/primitives/DetailPane";
import { SplitView } from "@/kit/primitives/SplitView";
import { WidgetCard } from "@/kit/primitives/WidgetCard";
import { WidgetRow } from "@/kit/primitives/WidgetRow";
import { EmptyState } from "@/kit/primitives/EmptyState";
import { Progress } from "@/kit/primitives/Progress";
import { AsyncState } from "@/kit/primitives/AsyncState";
import { BatchBar, SelectModeToggle } from "@/kit/primitives/BatchBar";
import { Button } from "@/kit/ui/button";
import { Input } from "@/kit/ui/input";
import { Checkbox } from "@/kit/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/kit/ui/tabs";
import { Tabs as PillTabs, TabsList as PillTabsList, TabsTrigger as PillTabsTrigger } from "@/kit/dashboard/components/ui/tabs";
import { getIcon } from "@/kit/icons";
import { locationBlockedHelp } from "@/kit/geolocationHelp";
import { AnswerBlockView } from "@/kit/elements/answer-block";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/kit/ui/select";
import { PageSidebarContext, PageStateContext } from "@/kit/schema/packageScope";
import { MediaHostContext, type CastTarget, type MediaHost } from "@/kit/schema/mediaHost";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/kit/ui/dropdown-menu";
import type { Action } from "@/kit/schema/types";
import { useBinding } from "@/kit/schema/binding";
import { useDispatchAction } from "@/kit/schema/actions";
import { ConfirmDialog } from "@/kit/schema/ConfirmDialog";
import { evaluateCondition } from "@/kit/schema/condition";
import { fillTemplate, readField } from "@/kit/schema/fieldPath";
import type {
  UiNode,
  SectionNode,
  ListNode,
  CardGridNode,
  MediaShelfNode,
  BillboardNode,
  PlayerNode,
  ReaderNode,
  PlayerActionNode,
  DetailPaneNode,
  SplitViewNode,
  FormNode,
  EmptyStateNode,
  ProgressNode,
  WidgetCardNode,
  WidgetRowNode,
  AnswerBlocksNode,
  PickerNode,
  SearchNode,
  TabsNode,
  DataState,
} from "@/kit/schema/types";
import type { WidgetData, WidgetDescriptor } from "@/kit/widgets";

type Row = Record<string, unknown>;

// A list's bound rows, filtered before anything else sees them - not
// part of the declarative page shape (spec/ui/schema.json has no
// concept of this), but a real per-instance need: the chat "memory
// updated" chip's deep link (chatMemoryChip.tsx, step 4) filters
// Memory's list to specific ids via a ?ids= query param, which is
// exactly the kind of runtime, route-specific concern a JSON page
// describing STRUCTURE shouldn't need to know about. The thin-mount
// page component (MemoryPage.tsx) is the only real provider; absent a
// provider, every row passes through unchanged.
export const RowFilterContext = createContext<(row: Row) => boolean>(() => true);

function EmptyStateNodeView({ node }: { node: EmptyStateNode }) {
  const { dispatch } = useDispatchAction();
  return (
    <EmptyState
      icon={node.icon}
      text={node.text}
      actionLabel={node.action ? (node.action_label ?? actionLabel(node.action)) : undefined}
      onAction={node.action ? () => dispatch(node.action!) : undefined}
    />
  );
}

// A page-authored action has no fixed "label" property of its own
// (spec/ui/schema.json's action def is deliberately just the five kinds
// and their own arguments) - EmptyState's own primitive wants a button
// label, so this derives a plain one from whichever kind was declared.
// A page names its own words with `action_label` ("Add a folder"); this plain label is the fallback.
function actionLabel(action: EmptyStateNode["action"]): string {
  if (!action) return "";
  if ("navigate" in action) return "Go";
  if ("call" in action) return "Continue";
  if ("confirm" in action) return "Continue";
  if ("ask" in action) return "Continue";
  return "Play";
}

function ProgressNodeView({ node }: { node: ProgressNode }) {
  return <Progress mode={node.mode} />;
}

function SectionNodeView({ node, state }: { node: SectionNode; state: Row }) {
  // evaluateCondition throws on an unsupported operator (a code review,
  // 2026-09-05, made that loud on purpose - see condition.ts) - but this
  // runs inside render, with no ErrorBoundary anywhere in the app, so an
  // uncaught throw here would unmount the WHOLE page over one section's
  // bad condition string. Caught here so the mistake is still loud (the
  // console error), but contained to just this section staying hidden.
  let visible: boolean;
  try {
    visible = evaluateCondition(node.condition, state);
  } catch (e) {
    console.error(`kit/schema: section "${node.heading}" hidden - ${e instanceof Error ? e.message : e}`);
    visible = false;
  }
  if (!visible) return null;
  return (
    <Section heading={node.heading}>
      {node.children.map((child, i) => (
        <NodeRenderer key={i} node={child} state={state} />
      ))}
    </Section>
  );
}

interface PackageDataBody {
  blocks?: unknown[];
  rows?: Row[];
  degraded?: boolean;
  /** The data call needs the person to choose something first (`"place"`): not a failure, and no blocks. */
  needs?: string;
}

// APP-KIND-02. Draws the blocks a package data call returns, each through the kit's one
// answer-block dispatcher: it validates the block, draws the Element named by its `kind`,
// and falls back to the block's own `alt` sentence for a kind it does not know. Loading,
// failure (with a retry) and "nothing to show" are the kit's AsyncState, so a page never
// invents a fourth state.
/** NEWS-00: the page's `actions` map as the one handler the news blocks fire. A block names an action ("open", "save")
 * and hands over the story's own ids; this resolves the entry and dispatches it, so a block never names a route. */
function newsActionsFor(
  actions: AnswerBlocksNode["actions"],
  dispatch: (action: Action, items?: Row[]) => void,
  filter?: { state: string; write: (patch: Record<string, unknown>) => void },
): { available: string[]; onAction: (action: string, ids: Row) => void } | undefined {
  if (!actions && !filter) return undefined;
  const entry = (name: string): Action | undefined => {
    if (!actions) return undefined;
    switch (name) {
      case "open": return actions.open;
      case "open_channel": return actions.open_channel;
      case "save": return actions.save;
      case "follow": return actions.follow;
      case "feedback_more":
      case "feedback_less": return actions.feedback;
      case "summarize": return actions.summarize;
      case "reset_mix": return actions.reset_mix;
      case "listen": return actions.listen;
      default: return undefined;
    }
  };
  const names = ["open", "open_channel", "save", "follow", "feedback_more", "feedback_less", "summarize", "reset_mix", "listen"];
  return {
    available: [...names.filter((name) => entry(name) !== undefined), "open_site", ...(filter ? ["filter"] : [])],
    onAction: (name, ids) => {
      if (name === "filter") {
        // NEWS-LOOK-02: a chip writes its id to the page's state and nothing else; the page's bind params read it back.
        if (filter) filter.write({ [filter.state]: typeof ids.filter_id === "string" ? ids.filter_id : "" });
        return;
      }
      if (name === "open_site") {
        const url = ids.url;
        if (typeof url === "string" && /^https?:\/\//i.test(url)) window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
      const action = entry(name);
      if (!action) return;
      const extra = name === "feedback_more" ? { kind: "more" } : name === "feedback_less" ? { kind: "less" } : {};
      dispatch(action, [{ ...ids, ...extra }]);
    },
  };
}

/** Which stated reason (if any) a failed or empty data call came with. The hub answers `{needs: "place"}` with no
 * blocks, or fails with `code` "needs_place", "down" or "timed_out". Anything else keeps the generic states. */
function dataStateKey(query: { data?: PackageDataBody; error: unknown }): "needs_place" | "down" | "timed_out" | null {
  if (query.data?.needs === "place") return "needs_place";
  const code = query.error instanceof ApiError ? query.error.code : undefined;
  return code === "needs_place" || code === "down" || code === "timed_out" ? code : null;
}

function DataStateNotice({ notice, state, onRetry }: { notice: DataState; state: Row; onRetry: () => void }) {
  const { dispatch, lastError } = useDispatchAction();
  const locateState = notice.actions?.flatMap((a) => ("locate" in a ? [a.locate.state] : []))[0] ?? "place";
  const location = useDeviceLocation(locateState, state);
  const Icon = getIcon(notice.icon ?? "map-pin");
  return (
    <div data-slot="data-state" className="mx-auto flex w-full max-w-md min-w-0 flex-col items-center gap-3 px-2 py-10 text-center">
      <Icon className="size-10 text-muted-foreground" aria-hidden />
      {notice.title ? <h2 className="text-lg font-medium">{notice.title}</h2> : null}
      <p className="text-base text-muted-foreground">{notice.text}</p>
      {notice.actions?.length ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {notice.actions.map((action, i) => {
            const ActionIcon = action.icon ? getIcon(action.icon) : null;
            return (
              <Button
                key={i}
                type="button"
                variant={i === 0 ? "default" : "secondary"}
                disabled={"locate" in action && location.busy}
                onClick={() => {
                  if ("navigate" in action) dispatch({ navigate: action.navigate });
                  else if ("locate" in action) location.locate("current");
                  else onRetry();
                }}
              >
                {ActionIcon ? <ActionIcon aria-hidden="true" /> : null}
                {action.label}
              </Button>
            );
          })}
        </div>
      ) : null}
      {location.note ? <p role="status" className="text-sm text-muted-foreground">{location.note}</p> : null}
      {lastError ? <p role="status" className="text-sm text-destructive">{lastError}</p> : null}
    </div>
  );
}

function AnswerBlocksNodeView({ node, state }: { node: AnswerBlocksNode; state: Row }) {
  const query = useBinding<PackageDataBody>(node.bind, state);
  const { dispatch, pendingConfirm, lastError } = useDispatchAction();
  const writer = useContext(PageStateContext);
  const news = newsActionsFor(node.actions, dispatch, node.filter_state && writer ? { state: node.filter_state, write: (patch) => writer.merge(patch) } : undefined);
  const kinds = node.kinds;
  const blocks = query.data
    ? (query.data.blocks ?? []).filter((block) => !kinds || kinds.includes(String((block as { kind?: unknown } | null)?.kind)))
    : undefined;
  const emptyText = node.empty_state?.text ?? "Nothing to show right now.";
  const stated = dataStateKey(query);
  const notice = stated ? node.states?.[stated] : undefined;
  if (notice && !(query.isFetching && query.data === undefined)) {
    return <DataStateNotice notice={notice} state={state} onRetry={() => query.refetch()} />;
  }
  return (
    <AsyncState
      data={query.isError ? null : blocks}
      error={query.isError}
      isFetching={query.isFetching}
      onRetry={() => query.refetch()}
      errorMessage={node.empty_state?.text ?? "Could not load this. Try again."}
      isEmpty={(list) => list.length === 0}
      emptyIcon={node.empty_state?.icon ?? "inbox"}
      emptyText={emptyText}
      emptyActionLabel={node.empty_state?.action ? (node.empty_state.action_label ?? actionLabel(node.empty_state.action)) : undefined}
      onEmptyAction={node.empty_state?.action ? () => dispatch(node.empty_state!.action!) : undefined}
    >
      {(list) => (
        <div className="flex min-w-0 flex-col gap-4">
          <ConfirmDialog pendingConfirm={pendingConfirm} />
          {lastError ? <p className="text-base text-destructive">{lastError}</p> : null}
          {list.map((block, i) => (
            <AnswerBlockView key={String((block as { id?: unknown } | null)?.id ?? i)} block={block} wide news={news} />
          ))}
        </div>
      )}
    </AsyncState>
  );
}



const GEOLOCATION_UNSUPPORTED = "This browser cannot share its location. Choose a saved place instead.";

// The device location, on the choice that asked for it and never before. Two decimals is
// about a kilometre, which is all a forecast needs; the hub coarsens further for a child.
function currentPosition(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error(GEOLOCATION_UNSUPPORTED));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: Number(position.coords.latitude.toFixed(2)), lon: Number(position.coords.longitude.toFixed(2)) }),
      (error) => reject(new Error(error?.code === 2 || error?.code === 3 ? "unavailable" : "denied")),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
    );
  });
}

/** The device location written to page state on the choice that asked for it (never before): the value under
 * `stateName`, the coordinates under `<stateName>_geo`. A refusal sets `note` with the browser's own steps. */
function useDeviceLocation(stateName: string, state: Row) {
  const writer = useContext(PageStateContext);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const latest = useRef(0);
  const counterRef = useRef(0);
  counterRef.current = typeof state[`${stateName}_geo_n`] === "number" ? (state[`${stateName}_geo_n`] as number) : 0;

  function locate(value: string) {
    setNote(null);
    const ticket = ++latest.current;
    setBusy(true);
    currentPosition()
      .then((position) => {
        if (ticket !== latest.current) return;
        writer?.merge({ [stateName]: value, [`${stateName}_geo`]: position, [`${stateName}_geo_n`]: counterRef.current + 1 });
      })
      .catch((e: unknown) => {
        if (ticket !== latest.current) return;
        const reason = e instanceof Error ? e.message : "";
        setNote(reason === GEOLOCATION_UNSUPPORTED ? GEOLOCATION_UNSUPPORTED : reason === "unavailable" ? "Could not find your location just now. Try again, or choose a saved place." : locationBlockedHelp());
      })
      .finally(() => {
        if (ticket === latest.current) setBusy(false);
      });
  }
  /** Cancels a request in flight and clears the note (a named place was chosen instead). */
  function cancel() {
    latest.current += 1;
    setBusy(false);
    setNote(null);
  }
  return { locate, cancel, busy, note };
}

const PinIcon = getIcon("map-pin");

function PickerControl({ node, state, rows }: { node: PickerNode; state: Row; rows: Row[] }) {
  const writer = useContext(PageStateContext);
  const location = useDeviceLocation(node.state, state);
  const leading = node.leading ?? [];
  const current = state[node.state];
  const { busy, note } = location;

  function choose(value: string) {
    const option = leading.find((o) => o.value === value);
    if (option?.needs !== "geolocation") {
      // A named place never travels with stale coordinates.
      location.cancel();
      writer?.merge({ [node.state]: value, [`${node.state}_geo`]: undefined, [`${node.state}_geo_n`]: undefined });
      return;
    }
    location.locate(value);
  }

  if (node.variant === "pill") {
    return (
      <div className="flex min-w-0 max-w-full flex-col gap-2">
        <PillTabs
          className="min-w-0 max-w-full"
          value={current == null ? "" : String(current)}
          onValueChange={(value) => { if (value != null) choose(String(value)); }}
        >
          <PillTabsList variant="pill" aria-label={node.label}>
            {leading.map((option) => {
              const Icon = option.icon ? getIcon(option.icon) : null;
              return (
                <PillTabsTrigger key={`lead:${option.value}`} value={option.value} disabled={busy} className="min-h-[48px] min-w-[48px]">
                  {Icon ? <Icon aria-hidden="true" /> : null}{option.label}
                </PillTabsTrigger>
              );
            })}
            {rows.map((row) => {
              const key = String(readField(row, node.item_key_field ?? "id"));
              return (
                <PillTabsTrigger key={`row:${key}`} value={key} disabled={busy} className="min-h-[48px] min-w-[48px]">
                  {String(readField(row, node.item_label_field ?? "label"))}
                </PillTabsTrigger>
              );
            })}
          </PillTabsList>
        </PillTabs>
        {note ? <p role="status" className="text-sm text-muted-foreground">{note}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 max-w-sm flex-col gap-2">
      <Select value={typeof current === "string" ? current : ""} onValueChange={choose} disabled={busy}>
        <SelectTrigger aria-label={node.label} width="full">
          <span className="flex min-w-0 items-center gap-2">
            <PinIcon aria-hidden="true" className="text-muted-foreground" />
            <SelectValue placeholder={node.placeholder ?? node.label} />
          </span>
        </SelectTrigger>
        <SelectContent>
          {leading.map((option) => {
            const Icon = option.icon ? getIcon(option.icon) : null;
            return (
              <SelectItem key={`lead:${option.value}`} value={option.value}>
                {Icon ? <Icon aria-hidden="true" /> : null}
                {option.label}
              </SelectItem>
            );
          })}
          {rows.map((row) => {
            const key = String(readField(row, node.item_key_field ?? "id"));
            return (
              <SelectItem key={`row:${key}`} value={key}>
                {String(readField(row, node.item_label_field ?? "label"))}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {note ? (
        <p role="status" className="text-sm text-muted-foreground">
          {note}
        </p>
      ) : null}
    </div>
  );
}

function BoundPickerView({ node, state }: { node: PickerNode & { bind: NonNullable<PickerNode["bind"]> }; state: Row }) {
  const query = useBinding<PackageDataBody>(node.bind, state);
  // A failed list of saved places never blocks the fixed options: the picker still opens.
  return <PickerControl node={node} state={state} rows={query.data?.rows ?? []} />;
}

const SEARCH_DEBOUNCE_MS = 250;

/** NEWS-LOOK-02: the typed text goes to page state after a short pause; Enter fires `submit` with {q}. Recents (a bound
 * list of rows) show as chips while the field is empty. This node sends nothing itself: every request is the page's
 * own data call (it reads the state) or the declared action. */
function SearchControl({ node, state, recents }: { node: SearchNode; state: Row; recents: Row[] }) {
  const writer = useContext(PageStateContext);
  const { dispatch, lastError } = useDispatchAction();
  const key = node.state ?? "q";
  const fromState = typeof state[key] === "string" ? (state[key] as string) : "";
  const [text, setText] = useState(fromState);
  const written = useRef(fromState);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A change from outside (arriving on the page with a query) shows in the field.
  if (fromState !== written.current) {
    written.current = fromState;
    if (fromState !== text) setText(fromState);
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function write(value: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    written.current = value;
    writer?.merge({ [key]: value === "" ? undefined : value });
  }
  function change(value: string) {
    setText(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => write(value), SEARCH_DEBOUNCE_MS);
  }
  function submit(value: string) {
    const q = value.trim();
    if (q === "") return;
    write(value);
    if (node.submit) dispatch(node.submit, [{ q }]);
  }
  const keyField = node.item_key_field ?? "key";
  const labelField = node.item_label_field ?? "label";
  const chips = text === "" ? recents.map((row) => ({ key: String(readField(row, keyField) ?? ""), label: String(readField(row, labelField) ?? "") })).filter((c) => c.label !== "") : [];
  return (
    <div role="search" data-slot="search-node" className="flex min-w-0 flex-col gap-2">
      <Input
        type="search"
        value={text}
        aria-label={node.label ?? "Search"}
        placeholder={node.placeholder}
        autoComplete="off"
        onChange={(e) => change(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(text); } }}
      />
      {chips.length > 0 ? (
        <div data-slot="search-recents" className="flex min-w-0 flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <Button
              key={chip.key || chip.label}
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => { setText(chip.label); submit(chip.label); }}
            >
              {chip.label}
            </Button>
          ))}
          {node.clear_recents ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => dispatch(node.clear_recents!, [{}])}>Clear</Button>
          ) : null}
        </div>
      ) : null}
      {lastError ? <p role="status" className="text-sm text-destructive">{lastError}</p> : null}
    </div>
  );
}

function BoundSearchView({ node, state }: { node: SearchNode & { recents: NonNullable<SearchNode["recents"]> }; state: Row }) {
  const query = useBinding<{ rows?: Row[] }>(node.recents, state);
  return <SearchControl node={node} state={state} recents={query.data?.rows ?? []} />;
}

function SearchNodeView({ node, state }: { node: SearchNode; state: Row }) {
  const sidebar = useContext(PageSidebarContext);
  const view = node.recents ? <BoundSearchView node={{ ...node, recents: node.recents }} state={state} /> : <SearchControl node={node} state={state} recents={[]} />;
  // NEWS-SIDEBAR-01: beside an app's own sidebar a plain search box (no recents to keep) is the sidebar's box again: wide screens hide it.
  return sidebar && !node.recents ? <div data-slot="search-under-sidebar" className="lg:hidden">{view}</div> : view;
}

function PickerNodeView({ node, state }: { node: PickerNode; state: Row }) {
  return node.bind ? <BoundPickerView node={{ ...node, bind: node.bind }} state={state} /> : <PickerControl node={node} state={state} rows={[]} />;
}

// NEWS-00: peer views of one page. The active tab is page state (default `tab`), mirrored in the URL's query so a
// reload or a shared link lands on the same tab; an id that matches no tab falls back to the first.
function TabsNodeView({ node, state }: { node: TabsNode; state: Row }) {
  const name = node.state ?? "tab";
  const [params, setParams] = useSearchParams();
  const writer = useContext(PageStateContext);
  const wanted = params.get(name);
  const active = node.tabs.some((tab) => tab.id === wanted) ? wanted! : node.tabs[0]!.id;
  return (
    <Tabs
      value={active}
      onValueChange={(value) => {
        const next = new URLSearchParams(params);
        next.set(name, String(value));
        setParams(next, { replace: true });
        writer?.merge({ [name]: String(value) });
      }}
    >
      <TabsList>
        {node.tabs.map((tab) => <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>)}
      </TabsList>
      {node.tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id}>
          {active === tab.id ? tab.body.map((child, i) => <NodeRenderer key={i} node={child} state={state} />) : null}
        </TabsContent>
      ))}
    </Tabs>
  );
}

/** A list row's leading media: a lucide icon by name, or a same-origin image path. An address with a scheme or a host
 * is never loaded, so a row cannot pull a picture from another site. */
function RowMedia({ value }: { value: unknown }) {
  if (typeof value !== "string" || value === "") return null;
  if (value.startsWith("/") && !value.startsWith("//")) return <img src={value} alt="" className="size-8 shrink-0 rounded-md object-cover" />;
  if (/^[a-z0-9-]+$/i.test(value)) {
    const Icon = getIcon(value);
    return Icon ? <Icon className="text-muted-foreground size-6 shrink-0" aria-hidden /> : null;
  }
  return null;
}

function ListNodeView({ node }: { node: ListNode }) {
  const query = useBinding<Row[]>(node.bind);
  const rowFilter = useContext(RowFilterContext);
  const filteredRows = query.data?.filter(rowFilter);
  const hasRows = (filteredRows?.length ?? 0) > 0;
  const { dispatch, pendingConfirm, lastError } = useDispatchAction();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function keyOf(row: Row): string {
    return String(readField(row, node.item_key_field));
  }
  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  const RowActionIcon = node.row_action ? getIcon(node.row_action.icon) : null;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <ConfirmDialog pendingConfirm={pendingConfirm} />
      {lastError ? <p className="text-base text-destructive">{lastError}</p> : null}
      {node.batch && hasRows ? (
        selectMode ? (
          <BatchBar count={selected.size} onExit={exitSelectMode}>
            {node.batch.actions.map((batchAction, i) => (
              <Button
                key={i}
                variant={batchAction.variant === "destructive" ? "destructive" : "secondary"}
                disabled={batchAction.scope === "selected" && selected.size === 0}
                onClick={() => {
                  const rows = filteredRows ?? [];
                  const items =
                    batchAction.scope === "all" ? rows : rows.filter((row) => selected.has(keyOf(row)));
                  // exitSelectMode as onSettled, not called synchronously
                  // here: a code review (2026-09-05) found the selection
                  // being cleared the instant this action was dispatched,
                  // including a confirm-wrapped one - the confirm dialog
                  // then asked its question over a list that had already
                  // silently dropped out of select mode, and cancelling
                  // lost the selection for nothing. Now it only clears
                  // once the action actually runs; a scope:"all" action
                  // never had a selection to lose in the first place, so
                  // it keeps not bothering.
                  dispatch(batchAction.action, items, batchAction.scope !== "all" ? exitSelectMode : undefined);
                }}
              >
                {batchAction.label}
              </Button>
            ))}
          </BatchBar>
        ) : (
          <SelectModeToggle label={node.batch.select_label ?? "Select"} onClick={() => setSelectMode(true)} />
        )
      ) : null}

      <AsyncState
        data={filteredRows}
        error={query.isError}
        isFetching={query.isFetching}
        onRetry={() => query.refetch()}
        errorMessage="Could not load this list."
        isEmpty={(rows) => rows.length === 0}
        emptyIcon={node.empty_state?.icon ?? "inbox"}
        emptyText={node.empty_state?.text ?? "Nothing here yet."}
        emptyActionLabel={node.empty_state?.action ? (node.empty_state.action_label ?? actionLabel(node.empty_state.action)) : undefined}
        onEmptyAction={node.empty_state?.action ? () => dispatch(node.empty_state!.action!) : undefined}
      >
        {(rows) => (
          <List
            items={rows}
            getKey={keyOf}
            label={node.item_label_field}
            isSelected={selectMode ? (row) => selected.has(keyOf(row)) : undefined}
            renderItem={(row) => (
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {selectMode ? (
                  <Checkbox
                    checked={selected.has(keyOf(row))}
                    onCheckedChange={() => toggle(keyOf(row))}
                    aria-label={`Select ${String(readField(row, node.item_label_field))}`}
                    className="shrink-0"
                  />
                ) : null}
                {node.item_media_field ? <RowMedia value={readField(row, node.item_media_field)} /> : null}
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-base">{String(readField(row, node.item_label_field))}</span>
                  {node.item_subtitle_field ? (
                    <span className="text-sm text-muted-foreground">
                      {fillTemplate(node.item_subtitle_field, row)}
                      {node.item_badge_field && readField(row, node.item_badge_field) ? ` · ${node.item_badge_label ?? ""}` : ""}
                    </span>
                  ) : null}
                </div>
              </div>
            )}
            renderAction={
              (node.row_action || node.row_toggle) && !selectMode
                ? (row) => {
                    const toggle = node.row_toggle;
                    const on = toggle ? readField(row, toggle.field) === true : false;
                    return (
                      <div className="flex items-center gap-1">
                        {toggle ? (
                          <Button
                            variant={on ? "secondary" : "outline"}
                            size="sm"
                            aria-pressed={on}
                            onClick={() => dispatch(toggle.action, [{ ...row, on: !on }])}
                          >
                            {on ? toggle.on_label : toggle.off_label}
                          </Button>
                        ) : null}
                        {node.row_action ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={fillTemplate(node.row_action.label, row)}
                            onClick={() => dispatch(node.row_action!.action, [row])}
                          >
                            {RowActionIcon ? <RowActionIcon className="h-5 w-5" aria-hidden /> : null}
                          </Button>
                        ) : null}
                      </div>
                    );
                  }
                : undefined
            }
          />
        )}
      </AsyncState>
    </div>
  );
}

function CardGridNodeView({ node }: { node: CardGridNode }) {
  const query = useBinding<Row[]>(node.bind);
  const { dispatch } = useDispatchAction();
  function keyOf(row: Row): string {
    return String(readField(row, node.item_key_field));
  }
  return (
    <AsyncState
      data={query.data}
      error={query.isError}
      isFetching={query.isFetching}
      onRetry={() => query.refetch()}
      errorMessage="Could not load this grid."
      isEmpty={(rows) => rows.length === 0}
      emptyIcon={node.empty_state?.icon ?? "inbox"}
      emptyText={node.empty_state?.text ?? "Nothing here yet."}
      emptyActionLabel={node.empty_state?.action ? (node.empty_state.action_label ?? actionLabel(node.empty_state.action)) : undefined}
      onEmptyAction={node.empty_state?.action ? () => dispatch(node.empty_state!.action!) : undefined}
    >
      {(rows) => (
        <CardGrid
          items={rows}
          getKey={keyOf}
          onSelect={node.on_select ? (row) => dispatch(node.on_select!, [row]) : undefined}
          getLabel={(row) => String(readField(row, node.item_label_field))}
          renderItem={(row) => <span className="text-base">{String(readField(row, node.item_label_field))}</span>}
        />
      )}
    </AsyncState>
  );
}

/** A same-origin picture path, or nothing: an address with a scheme or a host is never loaded (RowMedia's rule). */
function localPicture(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

function MediaShelfNodeView({ node, state }: { node: MediaShelfNode; state: Row }) {
  const query = useBinding<Row[]>(node.bind, state);
  const { dispatch, lastError, pendingConfirm } = useDispatchAction();
  function keyOf(row: Row): string {
    return String(readField(row, node.item_key_field));
  }
  return (
    <AsyncState
      data={query.data}
      error={query.isError}
      isFetching={query.isFetching}
      onRetry={() => query.refetch()}
      errorMessage="Could not load this shelf."
      // MEDIA-POLISH-01: a shelf that hides when empty gets its rows either way and draws nothing for none.
      isEmpty={(rows) => rows.length === 0 && !node.hide_when_empty}
      emptyIcon={node.empty_state?.icon ?? "inbox"}
      emptyText={node.empty_state?.text ?? "Nothing here yet."}
      emptyActionLabel={node.empty_state?.action ? (node.empty_state.action_label ?? actionLabel(node.empty_state.action)) : undefined}
      onEmptyAction={node.empty_state?.action ? () => dispatch(node.empty_state!.action!) : undefined}
    >
      {(rows) => (
        <>
          <MediaShelf
            items={rows}
            getKey={keyOf}
            aspect={node.aspect}
            heading={node.heading}
            variant={node.variant}
            orientation={node.orientation}
            layout={node.layout}
            artShape={node.art_shape}
            density={node.density}
            isHighlighted={node.item_highlight_field ? (row) => readField(row, node.item_highlight_field!) === true : undefined}
            renderIndex={node.item_index_field
              ? (row) => {
                  const value = readField(row, node.item_index_field!);
                  return typeof value === "string" || typeof value === "number" ? value : null;
                }
              : undefined}
            renderActions={node.row_actions?.length
              ? (row) => node.row_actions!.map((button, i) => {
                  const Icon = getIcon(button.icon);
                  const fieldLabel = button.label_field ? readField(row, button.label_field) : undefined;
                  const label = typeof fieldLabel === "string" && fieldLabel !== "" ? fieldLabel : fillTemplate(button.label, row);
                  const iconOnly = button.icon === "play";
                  return (
                    <Button
                      key={i}
                      type="button"
                      variant={iconOnly ? "inverse" : "outline"}
                      size={iconOnly ? "icon" : "default"}
                      className={iconOnly ? "size-[48px] rounded-full" : "h-auto min-h-[48px] rounded-full whitespace-normal"}
                      aria-label={`${label}: ${String(readField(row, node.item_label_field))}`}
                      onClick={() => dispatch(button.action, [row])}
                    >
                      <Icon aria-hidden="true" />{iconOnly ? null : label}
                    </Button>
                  );
                })
              : undefined}
            hideWhenEmpty={node.hide_when_empty}
            seeAll={node.see_all ? { label: node.see_all.label, onSelect: () => dispatch(node.see_all!.action) } : undefined}
            onSelect={node.on_select ? (row) => dispatch(node.on_select!, [row]) : undefined}
            getLabel={(row) => String(readField(row, node.item_label_field))}
            renderCaption={(row) => (
              <span className="flex min-w-0 flex-col">
                <span className={node.orientation === "vertical" && node.density !== "compact" ? "line-clamp-2 text-sm font-semibold" : "truncate text-sm font-semibold"}>{String(readField(row, node.item_label_field))}</span>
                {node.item_subtitle_field ? (
                  <span className="text-muted-foreground truncate text-sm">{fillTemplate(node.item_subtitle_field, row)}</span>
                ) : null}
              </span>
            )}
            renderItem={(row) => {
              const src = localPicture(readField(row, node.item_media_field));
              return src ? <img src={src} alt="" className="h-full w-full object-cover" /> : null;
            }}
            getProgress={node.item_progress_field ? (row) => Number(readField(row, node.item_progress_field!)) : undefined}
            renderBadge={
              node.item_badge_field
                ? (row) => {
                    const text = readField(row, node.item_badge_field!);
                    return typeof text === "string" && text !== "" ? <Badge variant="secondary">{text}</Badge> : null;
                  }
                : undefined
            }
            renderMeta={
              node.item_meta_field
                ? (row) => {
                    const meta = readField(row, node.item_meta_field!);
                    if (typeof meta === "number" && Number.isFinite(meta) && meta > 0) return formatTime(meta);
                    return typeof meta === "string" && meta !== "" ? meta : null;
                  }
                : undefined
            }
          />
          {lastError ? <p role="status" className="text-base text-destructive">{lastError}</p> : null}
          <ConfirmDialog pendingConfirm={pendingConfirm} />
        </>
      )}
    </AsyncState>
  );
}

function BillboardNodeView({ node, state }: { node: BillboardNode; state: Row }) {
  const query = useBinding<Row[]>(node.bind, state);
  const { dispatch, lastError } = useDispatchAction();
  return (
    <AsyncState
      data={query.data}
      error={query.isError}
      isFetching={query.isFetching}
      onRetry={() => query.refetch()}
      errorMessage="Could not load the featured items."
      isEmpty={(rows) => rows.length === 0 && !node.hide_when_empty}
      emptyIcon={node.empty_state?.icon ?? "film"}
      emptyText={node.empty_state?.text ?? "Nothing featured yet."}
      emptyActionLabel={node.empty_state?.action ? (node.empty_state.action_label ?? actionLabel(node.empty_state.action)) : undefined}
      onEmptyAction={node.empty_state?.action ? () => dispatch(node.empty_state!.action!) : undefined}
    >
      {(rows) => rows.length === 0 ? null : (
        <>
          <Billboard
            label={node.label ?? "Featured"}
            size={node.size}
            autoplay={node.autoplay}
            slides={rows.map((row) => ({
              id: String(readField(row, node.item_key_field)),
              title: String(readField(row, node.item_title_field) ?? ""),
              subtitle: node.item_subtitle_field ? fillTemplate(node.item_subtitle_field, row) : undefined,
              eyebrow: node.item_eyebrow_field ? fillTemplate(node.item_eyebrow_field, row) : undefined,
              art: node.item_art_field ? (localPicture(readField(row, node.item_art_field)) ?? undefined) : undefined,
              primary: { label: node.primary.label, icon: node.primary.icon, onSelect: () => dispatch(node.primary.action, [row]) },
              secondary: node.secondary?.map((b) => ({ label: b.label, icon: b.icon, onSelect: () => dispatch(b.action, [row]) })),
            }))}
          />
          {lastError ? <p role="status" className="text-base text-destructive">{lastError}</p> : null}
        </>
      )}
    </AsyncState>
  );
}

function ReaderNodeView({ node, state }: { node: ReaderNode; state: Row }) {
  const query = useBinding<Row | Row[]>(node.bind, state);
  const { dispatch, lastError, pendingConfirm } = useDispatchAction();
  const field = (name: keyof NonNullable<ReaderNode["fields"]>) => node.fields?.[name] ?? name;
  const item = Array.isArray(query.data) ? query.data[0] : query.data;
  const formatFor = (row: unknown) => node.format ?? readField(row, field("format"));
  return (
    <AsyncState
      data={item === undefined && query.data !== undefined ? null : item}
      error={query.isError} isFetching={query.isFetching} onRetry={() => query.refetch()}
      errorMessage="Could not load this book."
      isEmpty={(row) => {
        const src = readField(row, field("src"));
        return row === null || typeof src !== "string" || !sameOriginBookUrl(src, document.baseURI) || !["epub", "pdf"].includes(String(formatFor(row)));
      }}
      emptyIcon={node.empty_state?.icon ?? "book"} emptyText={node.empty_state?.text ?? "This book is not available."}
      emptyActionLabel={node.empty_state?.action ? (node.empty_state.action_label ?? actionLabel(node.empty_state.action)) : undefined}
      onEmptyAction={node.empty_state?.action ? () => dispatch(node.empty_state!.action!) : undefined}
    >
      {(row) => {
        const r = row as Row;
        const format = formatFor(r) as "epub" | "pdf";
        return <>
          <Reader key={String(readField(r, field("id")) ?? readField(r, field("src")))} src={String(readField(r, field("src")))} format={format}
            title={String(readField(r, field("title")) ?? "Reader")} theme={node.theme} fontSize={node.font_size}
            locator={readerLocator(readField(r, field("locator")), format)}
            onLocatorChange={node.on_locator ? (locator, percent) => dispatch(node.on_locator!, [{ ...r, locator, percent }], undefined, { quiet: true, keepalive: true, typedArgs: true }) : undefined}
            onClose={node.on_close ? () => dispatch(node.on_close!, [r]) : undefined} />
          {pendingConfirm ? <ConfirmDialog pendingConfirm={pendingConfirm} /> : null}
          {lastError ? <p role="status" className="text-base text-destructive">{lastError}</p> : null}
        </>;
      }}
    </AsyncState>
  );
}

function PlayerNodeView({ node, state }: { node: PlayerNode; state: Row }) {
  const query = useBinding<Row | Row[]>(node.bind, state);
  const { dispatch, lastError } = useDispatchAction();
  const host = useContext(MediaHostContext);
  const mediaEl = useRef<HTMLMediaElement | null>(null);
  const [castError, setCastError] = useState<string | null>(null);
  const field = (name: keyof NonNullable<PlayerNode["fields"]>, fallback: string) => node.fields?.[name] ?? fallback;
  const item = Array.isArray(query.data) ? query.data[0] : query.data;
  return (
    <AsyncState
      data={item === undefined && query.data !== undefined ? null : item}
      error={query.isError}
      isFetching={query.isFetching}
      onRetry={() => query.refetch()}
      errorMessage="Could not load this item."
      isEmpty={(row) => row === null || localPicture(readField(row, field("src", "src"))) === null}
      emptyIcon={node.empty_state?.icon ?? "film"}
      emptyText={node.empty_state?.text ?? "This item is not available."}
      emptyActionLabel={node.empty_state?.action ? (node.empty_state.action_label ?? actionLabel(node.empty_state.action)) : undefined}
      onEmptyAction={node.empty_state?.action ? () => dispatch(node.empty_state!.action!) : undefined}
    >
      {(row) => {
        const r = row as Row;
        const upNext = readField(r, field("up_next", "up_next")) as PlayerUpNext | undefined;
        const position = readField(r, field("position", "position_s"));
        const src = localPicture(readField(r, field("src", "src")))!;
        const title = String(readField(r, field("title", "title")) ?? "");
        const subtitle = (readField(r, field("subtitle", "subtitle")) as string | undefined) ?? undefined;
        const poster = localPicture(readField(r, field("poster", "poster"))) ?? undefined;
        // MEDIA-POLISH-01: the host may own the element, so playback outlives this page (the docked mini bar).
        const external = host?.mediaFor?.({ id: String(readField(r, field("id", "id")) ?? ""), src, kind: node.kind, title, subtitle, poster }) ?? null;
        return (
          <>
            <Player
              media={external}
              mediaRef={mediaEl}
              castSlot={
                host?.castTargets && host.castTo ? (
                  <PlayerCastMenu host={host} item={r} getPosition={() => mediaEl.current?.currentTime ?? 0} onError={setCastError} />
                ) : undefined
              }
              src={src}
              kind={node.kind}
              layout={node.layout}
              title={String(readField(r, field("title", "title")) ?? "")}
              subtitle={(readField(r, field("subtitle", "subtitle")) as string | undefined) ?? undefined}
              poster={localPicture(readField(r, field("poster", "poster"))) ?? undefined}
              chapters={(readField(r, field("chapters", "chapters")) as PlayerChapter[] | undefined) ?? undefined}
              captions={(readField(r, field("captions", "captions")) as PlayerTextTrack[] | undefined) ?? undefined}
              thumbnails={localPicture(readField(r, field("thumbnails", "thumbnails"))) ?? undefined}
              resumeFrom={typeof position === "number" ? position : undefined}
              completed={readField(r, field("completed", "completed")) === true}
              upNext={upNext && typeof upNext.id === "string" ? upNext : undefined}
              autoplayNext={node.autoplay_next}
              onProgress={
                node.on_progress
                  ? (p) =>
                      dispatch(node.on_progress!, [{ ...r, ...p }], undefined, { quiet: true, keepalive: p.reason === "unload" })
                  : undefined
              }
              onNext={node.on_next && upNext ? () => dispatch(node.on_next!, [upNext as unknown as Row]) : undefined}
            />
            {node.details ? <PlayerDetails title={title} subtitle={subtitle} /> : null}
            {node.actions && node.actions.length > 0 ? <PlayerActions actions={node.actions} item={r} dispatch={dispatch} /> : null}
            {lastError ? <p role="status" className="text-base text-destructive">{lastError}</p> : null}
            {castError ? <p role="status" className="text-base text-destructive">{castError}</p> : null}
          </>
        );
      }}
    </AsyncState>
  );
}

const CAST_LOAD_FAILED = "Could not look for other screens. Check that you are online, then open the menu again.";
const CAST_SEND_FAILED = "Could not play this on the other screen. Make sure it is on and signed in, then try again.";

/** HANDOFF-01c: the Player's `castSlot`: the kit's own DropdownMenu listing the household's other screens. Targets load
 * each time the menu opens. Choosing one sends the item with the player's current time. */
function PlayerCastMenu({ host, item, getPosition, onError }: { host: MediaHost; item: Row; getPosition: () => number; onError: (message: string | null) => void }) {
  const [targets, setTargets] = useState<CastTarget[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const Glyph = getIcon("cast");
  const load = (open: boolean) => {
    if (!open) return;
    setTargets(null);
    setLoadFailed(false);
    onError(null);
    Promise.resolve()
      .then(() => host.castTargets!(item))
      .then((list) => setTargets(Array.isArray(list) ? list : []))
      .catch(() => {
        setTargets([]);
        setLoadFailed(true);
      });
  };
  const send = (target: CastTarget) => {
    onError(null);
    Promise.resolve()
      .then(() => host.castTo!(target.id, item, getPosition()))
      .catch((e) => onError(e instanceof Error && e.message ? e.message : CAST_SEND_FAILED));
  };
  return (
    <DropdownMenu onOpenChange={load}>
      <DropdownMenuTrigger asChild>
        <Button ref={trigger} variant="ghost" size="icon" aria-label="Play on another screen" data-slot="player-cast-targets">
          {Glyph ? <Glyph /> : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent container={trigger.current?.closest<HTMLElement>('[data-slot="player"]') ?? undefined} align="end">
        <DropdownMenuLabel>Play on another screen</DropdownMenuLabel>
        {targets === null ? (
          <DropdownMenuItem disabled>Looking for screens</DropdownMenuItem>
        ) : loadFailed ? (
          <DropdownMenuItem disabled>{CAST_LOAD_FAILED}</DropdownMenuItem>
        ) : targets.length === 0 ? (
          <DropdownMenuItem disabled>No other screens are on</DropdownMenuItem>
        ) : (
          targets.map((t) => (
            <DropdownMenuItem key={t.id} onSelect={() => send(t)}>
              {t.name}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** MEDIA-POLISH-01: a watch page's title block under the picture: the title, then the subtitle line (the channel). */
function PlayerDetails({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1" data-slot="player-details">
      <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
      {subtitle ? <p className="text-muted-foreground text-base">{subtitle}</p> : null}
    </div>
  );
}

/** MEDIA-POLISH-01: the actions row under the title (Like, Watch later): pill buttons in one row that scrolls sideways
 * on a phone. A button with a `field` is a toggle, pressed while that field of the item is true. */
function PlayerActions({ actions, item, dispatch }: { actions: PlayerActionNode[]; item: Row; dispatch: ReturnType<typeof useDispatchAction>["dispatch"] }) {
  return (
    <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="group" aria-label="Actions" data-slot="player-actions">
      {actions.map((a) => {
        const on = a.field ? readField(item, a.field) === true : false;
        const Glyph = a.icon ? getIcon(a.icon) : null;
        return (
          <Button
            key={a.label}
            variant="secondary"
            size="sm"
            className="shrink-0 rounded-full px-4"
            aria-pressed={a.field ? on : undefined}
            onClick={() => dispatch(a.action, [a.field ? { ...item, on: !on } : item])}
          >
            {Glyph ? <Glyph aria-hidden className={on ? "fill-current" : undefined} /> : null}
            {on && a.on_label ? a.on_label : a.label}
          </Button>
        );
      })}
    </div>
  );
}

// The widgets list (`GET /api/widgets`, D to E's contract) rather than
// `useBinding(node.bind)` on purpose: `api.widgets()` swallows a 404 as
// "no widgets yet" (the route genuinely doesn't exist until D ships it,
// docs/BACKLOG.md's `app`-kind item), which the generic binding
// interpreter has no reason to do for every other page's bindings. A
// deliberately DIFFERENT query key from `useBinding`'s own
// `["schema-binding", path]` convention, not the same one: the two
// hooks would otherwise cache under an identical key with different
// `queryFn`s (one throws on 404, one swallows it), and whichever query
// populated the cache first would silently decide the other's behavior
// for any page that ever binds a generic node to this same path
// (a code review, 2026-09-06, caught this before anything used it).
// GET /api/widgets swallows a 404 as "no widgets yet" (a route that
// genuinely doesn't exist until a product ships it) rather than
// surfacing a red error banner - any other status still throws.
function fetchWidgetList(): Promise<WidgetDescriptor[]> {
  return request<WidgetDescriptor[]>("/api/widgets").catch((e: unknown) => {
    if (e instanceof ApiError && e.status === 404) return [];
    throw e;
  });
}

function fetchWidgetData(pkg: string, id: string): Promise<WidgetData> {
  return request<WidgetData>(`/api/widgets/${encodeURIComponent(pkg)}/${encodeURIComponent(id)}/data`).catch((e: unknown) => {
    if (e instanceof ApiError && e.status === 404) return { as_of: new Date().toISOString(), items: [] };
    throw e;
  });
}

function useWidgetList(node: { bind: { path: string } }) {
  return useQuery({
    queryKey: ["widget-list", node.bind.path],
    queryFn: fetchWidgetList,
  });
}

// One widget's own data (`GET /api/widgets/:package/:id/data`), on its
// own `refresh_s` poll - a second, per-widget-instance fetch the schema
// itself has no field for (spec/ui/schema.json's widget_card/widget_row
// comment), since the list route and the data route are two different
// calls by design. `refresh_s: 0` means "fetch once, never poll," not
// "poll every 0ms" - TanStack Query only disables polling on `false`,
// not a numeric zero (a code review, 2026-09-06, caught this before any
// package could plausibly ship it).
// A pure function, exported for a direct test: TanStack Query only
// disables polling on the literal `false`, not a numeric `0` (a code
// review, 2026-09-06, caught `refresh_s: 0` scheduling an immediate,
// repeating timer instead of "fetch once, never poll").
export function widgetRefetchInterval(refreshS: number): number | false {
  return refreshS > 0 ? refreshS * 1000 : false;
}

function useWidgetData(widget: WidgetDescriptor) {
  return useQuery({
    queryKey: ["widget-data", widget.package, widget.id],
    queryFn: () => fetchWidgetData(widget.package, widget.id),
    refetchInterval: widgetRefetchInterval(widget.refresh_s),
  });
}

// Shared by WidgetCardNodeView/WidgetRowNodeView below: identical
// fetch-filter-render shape (a code review, 2026-09-06, found the two
// near-duplicated by hand), differing only in which `size` they keep and
// how they lay out what's left.
function WidgetsNodeView({
  node,
  size,
  errorMessage,
  renderWidgets,
}: {
  node: { bind: { path: string } };
  size: "card" | "row";
  errorMessage: string;
  renderWidgets: (widgets: WidgetDescriptor[]) => React.ReactElement;
}) {
  const list = useWidgetList(node);
  return (
    <AsyncState
      data={list.data}
      error={list.isError}
      isFetching={list.isFetching}
      onRetry={() => list.refetch()}
      errorMessage={errorMessage}
      isEmpty={(widgets) => widgets.filter((w) => w.size === size).length === 0}
      emptyIcon="sparkles"
      emptyText="Nothing here yet."
    >
      {(widgets) => renderWidgets(widgets.filter((w) => w.size === size))}
    </AsyncState>
  );
}

function WidgetCardNodeView({ node }: { node: WidgetCardNode }) {
  return (
    <WidgetsNodeView
      node={node}
      size="card"
      errorMessage="Could not load today's cards."
      renderWidgets={(widgets) => (
        <ul className="grid list-none gap-3 p-0" style={{ gridTemplateColumns: cardSizeGridTemplateColumns() }}>
          {widgets.map((widget) => (
            <li key={`${widget.package}/${widget.id}`} className="min-w-0">
              <WidgetCardInstance widget={widget} />
            </li>
          ))}
        </ul>
      )}
    />
  );
}

function WidgetCardInstance({ widget }: { widget: WidgetDescriptor }) {
  const data = useWidgetData(widget);
  return <WidgetCard title={widget.title} items={data.data?.items} isLoading={data.isLoading} />;
}

function WidgetRowNodeView({ node }: { node: WidgetRowNode }) {
  return (
    <WidgetsNodeView
      node={node}
      size="row"
      errorMessage="Could not load today's rows."
      renderWidgets={(widgets) => (
        <div className="flex flex-col gap-2">
          {widgets.map((widget) => (
            <WidgetRowInstance key={`${widget.package}/${widget.id}`} widget={widget} />
          ))}
        </div>
      )}
    />
  );
}

function WidgetRowInstance({ widget }: { widget: WidgetDescriptor }) {
  const data = useWidgetData(widget);
  return <WidgetRow title={widget.title} items={data.data?.items} isLoading={data.isLoading} />;
}

function DetailPaneNodeView({ node, state }: { node: DetailPaneNode; state: Row }) {
  return (
    <DetailPane title={node.title} subtitle={node.subtitle}>
      {node.body.map((child, i) => (
        <NodeRenderer key={i} node={child} state={state} />
      ))}
    </DetailPane>
  );
}

function SplitViewNodeView({ node, state }: { node: SplitViewNode; state: Row }) {
  if ("main" in node) {
    return (
      <SplitView
        main={node.main.map((child, i) => <NodeRenderer key={i} node={child} state={state} />)}
        aside={node.aside.map((child, i) => <NodeRenderer key={i} node={child} state={state} />)}
        asideLabel={node.aside_label}
      />
    );
  }
  return (
    <SplitView
      list={<NodeRenderer node={node.list} state={state} />}
      detail={<NodeRenderer node={node.detail} state={state} />}
    />
  );
}

// No page this session builds uses a `form` node (Chat's own composer is
// now assistant-ui's, step 4; Memory needs no create-form) - kept minimal
// and honest about it: "select"/"duration"/"time"/"entity"/"area"/
// "person"/"media" have no real widget built yet (step 7 is where
// SettingField, the other place these same selector names come from,
// gains several of them) and fall back to a plain text input rather than
// pretending to support something unbuilt.
function FormNodeView({ node }: { node: FormNode }) {
  const { dispatch } = useDispatchAction();
  const [values, setValues] = useState<Row>({});
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="flex max-w-sm flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitting(true);
        dispatch(node.on_submit, [values], () => setSubmitting(false));
      }}
    >
      {node.fields.map((field) => {
        if (field.selector === "boolean") {
          return (
            <label key={field.name} className="flex items-center gap-2 text-base">
              <Checkbox
                checked={Boolean(values[field.name])}
                onCheckedChange={(checked) => setValues((v) => ({ ...v, [field.name]: checked }))}
              />
              {field.placeholder ?? field.name}
            </label>
          );
        }
        return (
          <Input
            key={field.name}
            type={field.selector === "number" ? "number" : "text"}
            placeholder={field.placeholder ?? field.name}
            value={String(values[field.name] ?? "")}
            onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
            disabled={submitting}
          />
        );
      })}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Working…" : "Submit"}
      </Button>
    </form>
  );
}

/** Mount points for a pattern component that owns a whole, framework-
 * driven subsystem in React (assistant-ui's runtime for Chat, the
 * settings registry's own renderer for Settings) rather than anything
 * a generic bind/action interpreter renders. `spec/ui/pages/chat.json`
 * and a future settings.json are conformance fixtures ajv validates
 * (spec/tests/ts/ui-schema.test.ts) but this interpreter never actually
 * receives at runtime - ChatPage.tsx and SettingsPage.tsx mount their
 * own real components directly, keyed off the route rather than a
 * SchemaPage render (docs/dev.md's A2UI entry has the full reasoning).
 * These two views exist only so the catalog/schema agreement test
 * (catalog.test.ts) has something real to check against every declared
 * node type, not because either is reachable through NodeRenderer in
 * the running app. */
function ExternallyMountedNodeView({ label }: { label: string }) {
  return (
    <p className="text-sm text-muted-foreground">
      {label} mounts its own page component directly (see NodeRenderer.tsx's own comment).
    </p>
  );
}

export function NodeRenderer({ node, state = {} }: { node: UiNode; state?: Row }): React.ReactElement | null {
  switch (node.type) {
    case "page":
      return (
        <>
          {node.body.map((child, i) => (
            <NodeRenderer key={i} node={child} state={state} />
          ))}
        </>
      );
    case "section":
      return <SectionNodeView node={node} state={state} />;
    case "list":
      return <ListNodeView node={node} />;
    case "card_grid":
      return <CardGridNodeView node={node} />;
    case "media_shelf":
      return <MediaShelfNodeView node={node} state={state} />;
    case "billboard":
      return <BillboardNodeView node={node} state={state} />;
    case "player":
      return <PlayerNodeView node={node} state={state} />;
    case "reader":
      return <ReaderNodeView node={node} state={state} />;
    case "detail_pane":
      return <DetailPaneNodeView node={node} state={state} />;
    case "split_view":
      return <SplitViewNodeView node={node} state={state} />;
    case "widget_card":
      return <WidgetCardNodeView node={node} />;
    case "widget_row":
      return <WidgetRowNodeView node={node} />;
    case "answer_blocks":
      return <AnswerBlocksNodeView node={node} state={state} />;
    case "picker":
      return <PickerNodeView node={node} state={state} />;
    case "search":
      return <SearchNodeView node={node} state={state} />;
    case "tabs":
      return <TabsNodeView node={node} state={state} />;
    case "form":
      return <FormNodeView node={node} />;
    case "empty_state":
      return <EmptyStateNodeView node={node} />;
    case "progress":
      return <ProgressNodeView node={node} />;
    case "message_thread":
      return <ExternallyMountedNodeView label="message_thread" />;
    case "settings_editor":
      return <ExternallyMountedNodeView label="settings_editor" />;
  }
}
