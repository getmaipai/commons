import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ApiError, request } from "@/kit/http";
import { cardSizeGridTemplateColumns, useCardSize } from "@/kit/primitives/CardSizeSlider";
import { dayHeading, dayKey } from "@/kit/relativeTime";
import { Section } from "@/kit/primitives/Section";
import { cn } from "@/kit/utils";
import { List } from "@/kit/primitives/List";
import { CardGrid } from "@/kit/primitives/CardGrid";
import { MediaShelf } from "@/kit/primitives/MediaShelf";
import { LoopPoster } from "@/kit/primitives/LoopPoster";
import { CategoryTiles, QuickTiles, TopResultCard, TrackRows } from "@/kit/primitives/MusicBlocks";
import { Billboard } from "@/kit/primitives/Billboard";
import { ArtGradient } from "@/kit/primitives/ArtGradient";
import { Chip } from "@/kit/primitives/Chip";
import { TranscriptPanel, type TranscriptLine } from "@/kit/primitives/TranscriptPanel";
import { Player, type PlayerChapter, type PlayerTextTrack, type PlayerUpNext } from "@/kit/primitives/Player";
import { SafeImage, type ImageFallbackKind } from "@/kit/primitives/SafeImage";
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
import { Textarea } from "@/kit/ui/textarea";
import { useIsPhoneLayout } from "@/kit/hooks/useIsPhoneLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/kit/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/kit/ui/drawer";
import { Dropzone } from "@/kit/ui/dropzone";
import { FileGrid } from "@/kit/primitives/FileGrid";
import type { TimedLyricLine } from "@/kit/elements/lyrics-list";
import { Checkbox } from "@/kit/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/kit/ui/tabs";
import { Tabs as PillTabs, TabsList as PillTabsList, TabsTrigger as PillTabsTrigger } from "@/kit/dashboard/components/ui/tabs";
import { getIcon } from "@/kit/icons";
import { locationBlockedHelp } from "@/kit/geolocationHelp";
import { AnswerBlockView } from "@/kit/elements/answer-block";
import { CreationHeader } from "@/kit/elements/creation-header";
import { PromptBar } from "@/kit/elements/prompt-bar";
import type { TierId } from "@/kit/elements/tier-segment";
import { SharePanel } from "@/kit/elements/share-panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/kit/ui/select";
import { PackageScopeContext, PageSidebarContext, PageStateContext, resolveParams } from "@/kit/schema/packageScope";
import { MediaHostContext, type CastTarget, type MediaHost } from "@/kit/schema/mediaHost";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/kit/ui/dropdown-menu";
import type { Action } from "@/kit/schema/types";
import { useBinding } from "@/kit/schema/binding";
import { useDispatchAction } from "@/kit/schema/actions";
import { ConfirmDialog } from "@/kit/schema/ConfirmDialog";
import { ReorderFailure, type ReorderConfig } from "@/kit/primitives/reorder";
import { DeviceTiles, type DeviceCommand } from "@/kit/elements/device-tiles";
import { StudioNodeView } from "@/kit/schema/StudioNodeView";
import { ImageEditorNodeView } from "@/kit/schema/ImageEditorNodeView";
import { ResultFeedNodeView } from "@/kit/schema/ResultFeedNodeView";
import { ClipFeedNodeView } from "@/kit/schema/ClipFeedNodeView";
import { isOwnBlobUrl, localPicture } from "@/kit/schema/mediaPath";
import { evaluateCondition } from "@/kit/schema/condition";
import { fillTemplate, readField, writeField } from "@/kit/schema/fieldPath";
import { i18n } from "@/kit/i18n";
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
  WidgetTilesNode,
  ReorderSpec,
  AnswerBlocksNode,
  PickerNode,
  SearchNode,
  PromptBarNode,
  QuickTilesNode,
  TopResultNode,
  CategoryTilesNode,
  TrackRowsNode,
  TabsNode,
  CreationHeaderNode,
  ChoiceControl,
  DataState,
} from "@/kit/schema/types";
import { ActionSchema } from "@/kit/schema/types";
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
  if ("navigate" in action) return i18n._({ id: "ui.Go", message: "Go" });
  if ("call" in action) return i18n._({ id: "ui.Continue", message: "Continue" });
  if ("confirm" in action) return i18n._({ id: "ui.Continue", message: "Continue" });
  if ("ask" in action) return i18n._({ id: "ui.Continue", message: "Continue" });
  return i18n._({ id: "ui.Play", message: "Play" });
}

function ProgressNodeView({ node }: { node: ProgressNode }) {
  return <Progress mode={node.mode} />;
}

function CreationHeaderNodeView({ node, state }: { node: CreationHeaderNode; state: Row }) {
  const data = useBinding<Row | Row[]>(node.bind, state);
  const candidatesQuery = useBinding<Row | Row[]>(node.candidates_bind ?? node.bind, state);
  const { dispatch } = useDispatchAction();
  const [open, setOpen] = useState(false);
  const row = Array.isArray(data.data) ? data.data[0] : data.data;
  if (!row) return null;
  const creator = row.creator && typeof row.creator === "object" ? row.creator as Row : {};
  const rawVisibility = row.visibility && typeof row.visibility === "object" ? row.visibility as Row : {};
  const toPerson = (person: unknown) => {
    if (!person || typeof person !== "object") return null;
    const value = person as Row;
    if (typeof value.id !== "string") return null;
    const rawName = typeof value.name === "string" ? value.name.trim() : "";
    const name = !rawName || /\{[^{}]+\}/.test(rawName) ? i18n._({ id: "ui.Someone", message: "Someone" }) : rawName;
    const avatarUrl = typeof value.avatar_url === "string" && !/\{[^{}]+\}/.test(value.avatar_url) ? value.avatar_url : undefined;
    const avatarSeed = typeof value.avatar_seed === "string" && !/\{[^{}]+\}/.test(value.avatar_seed) ? value.avatar_seed : undefined;
    return { id: value.id, name, avatarUrl, avatarSeed };
  };
  const people = Array.isArray(rawVisibility.people) ? rawVisibility.people.map(toPerson).filter((person): person is NonNullable<typeof person> => person !== null) : [];
  const candidatesData = Array.isArray(candidatesQuery.data) ? candidatesQuery.data[0] : candidatesQuery.data;
  // QA-FINISH-01: a `candidates_bind` array is the candidate list ({id, name} rows); without one, an array from `bind` is the header row, never the candidates.
  const rawCandidates = node.candidates_bind && Array.isArray(candidatesQuery.data) ? candidatesQuery.data : Array.isArray(candidatesData?.candidates) ? candidatesData.candidates : Array.isArray(candidatesData?.rows) ? candidatesData.rows : people;
  const candidates = rawCandidates.map(toPerson).filter((person): person is NonNullable<typeof person> => person !== null);
  const mode = rawVisibility.mode === "shared" ? "shared" : "private";
  const base = { ...row };
  const fire = (action: Action, personId?: string) => dispatch(action, [{ ...base, ...(personId ? { person_id: personId } : {}) }]);
  const artValue = row[node.fields?.art ?? "art"];
  return (
    <div className={node.backdrop === "art_gradient" ? "relative isolate" : "contents"} data-slot={node.backdrop === "art_gradient" ? "creation-backdrop" : undefined}>
      {node.backdrop === "art_gradient" ? <ArtGradient art={typeof artValue === "string" ? localPicture(artValue) : null} /> : null}
      {node.variant === "studio" ? <CreationHeader
        title={typeof row.title === "string" ? row.title : null}
        headingLevel={node.heading_level}
        visibility={{ mode, people, canManage: false, onOpen: () => undefined }}
        variant="studio"
        eyebrow={node.eyebrow}
        art={typeof row[node.fields?.art ?? "art"] === "string" ? row[node.fields?.art ?? "art"] as string : null}
        locked={row[node.fields?.locked ?? "locked"] === true}
        primary={node.primary ? { ...node.primary, onSelect: () => fire(node.primary!.action) } : undefined}
        secondary={node.secondary ? { ...node.secondary, onSelect: () => fire(node.secondary!.action) } : undefined}
      /> : node.variant === "collection" && node.part === "footer" ? (Array.isArray(row[node.fields?.footer_lines ?? "footer_lines"]) ? row[node.fields?.footer_lines ?? "footer_lines"] as unknown[] : []).length ? <footer className="flex flex-col gap-1 text-sm text-muted-foreground">{(row[node.fields?.footer_lines ?? "footer_lines"] as unknown[]).map((line, index) => <p key={index}>{String(line)}</p>)}</footer> : null : node.variant === "collection" ? <CreationHeader
        title={typeof row.title === "string" ? row.title : null}
        creator={{ name: typeof creator.name === "string" ? creator.name : null, avatarUrl: typeof creator.avatar_url === "string" && !/\{[^{}]+\}/.test(creator.avatar_url) ? creator.avatar_url : null, avatarSeed: typeof creator.avatar_seed === "string" && !/\{[^{}]+\}/.test(creator.avatar_seed) ? creator.avatar_seed : null, label: typeof creator.label === "string" ? creator.label : null, href: typeof creator.href === "string" ? creator.href : null, linkLabel: typeof creator.link_label === "string" ? creator.link_label : null }}
        madeAt={typeof row.made_at === "string" ? row.made_at : null}
        description={typeof row.description === "string" ? row.description : null}
        headingLevel={node.heading_level}
        visibility={{ mode, people, canManage: rawVisibility.can_manage === true, onOpen: () => setOpen(true) }}
        variant="collection"
        art={typeof row[node.fields?.art ?? "art"] === "string" ? row[node.fields?.art ?? "art"] as string : null}
        meta={typeof row[node.fields?.meta ?? "meta"] === "string" ? row[node.fields?.meta ?? "meta"] as string : null}
        primary={node.primary ? { ...node.primary, onSelect: () => fire(node.primary!.action) } : undefined}
        shuffle={node.shuffle ? { ...node.shuffle, onSelect: () => fire(node.shuffle!.action) } : undefined}
        more={(node.more ?? []).map(item => ({ ...item, onSelect: () => fire(item.action) }))}
      />
      : <CreationHeader
        title={typeof row.title === "string" ? row.title : null}
        creator={{ name: typeof creator.name === "string" ? creator.name : null, avatarUrl: typeof creator.avatar_url === "string" && !/\{[^{}]+\}/.test(creator.avatar_url) ? creator.avatar_url : null, avatarSeed: typeof creator.avatar_seed === "string" && !/\{[^{}]+\}/.test(creator.avatar_seed) ? creator.avatar_seed : null, label: typeof creator.label === "string" ? creator.label : null, href: typeof creator.href === "string" ? creator.href : null, linkLabel: typeof creator.link_label === "string" ? creator.link_label : null }}
        madeAt={typeof row.made_at === "string" ? row.made_at : null} description={typeof row.description === "string" ? row.description : null} headingLevel={node.heading_level}
        visibility={{ mode, people, canManage: rawVisibility.can_manage === true, onOpen: () => setOpen(true) }} variant={node.variant === "byline" ? "byline" : "full"} />}
      <SharePanel open={open} onOpenChange={setOpen} people={people} candidates={candidates} canManage={rawVisibility.can_manage === true}
        onAdd={(id) => fire(node.share_change.add, id)} onRemove={(id) => fire(node.share_change.remove, id)} onMakePrivate={() => fire(node.share_change.make_private)} />
    </div>
  );
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
      case "discuss": return actions.discuss;
      default: return undefined;
    }
  };
  const names = ["open", "open_channel", "save", "follow", "feedback_more", "feedback_less", "summarize", "reset_mix", "listen", "discuss"];
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
  // The article toolbar's back button steps the browser history; with nothing behind this page it is not drawn.
  const canGoBack = typeof window !== "undefined" && window.history.length > 1;
  const goBack = () => window.history.back();
  const query = useBinding<PackageDataBody>(node.bind, state);
  const { dispatch, pendingConfirm, lastError } = useDispatchAction();
  const writer = useContext(PageStateContext);
  const news = newsActionsFor(node.actions, dispatch, node.filter_state && writer ? { state: node.filter_state, write: (patch) => writer.merge(patch) } : undefined);
  const kinds = node.kinds;
  const blocks = query.data
    ? (query.data.blocks ?? []).filter((block) => !kinds || kinds.includes(String((block as { kind?: unknown } | null)?.kind)))
    : undefined;
  const emptyText = node.empty_state?.text ?? i18n._({ id: "ui.Nothing to show right now.", message: "Nothing to show right now." });
  const stated = dataStateKey(query);
  const notice = stated ? node.states?.[stated] : undefined;
  if (notice && !(query.isFetching && query.data === undefined)) {
    return <DataStateNotice notice={notice} state={state} onRetry={() => query.refetch()} />;
  }
  return (
    <AsyncState
      errorLayout="row"
      data={query.isError ? null : blocks}
      error={query.isError}
      isFetching={query.isFetching}
      onRetry={() => query.refetch()}
      errorMessage={node.empty_state?.text ?? i18n._({ id: "ui.Could not load this. Try again.", message: "Could not load this. Try again." })}
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
            <AnswerBlockView key={String((block as { id?: unknown } | null)?.id ?? i)} block={block} wide news={news} onBack={canGoBack ? goBack : undefined} />
          ))}
        </div>
      )}
    </AsyncState>
  );
}



const GEOLOCATION_UNSUPPORTED = "unsupported";

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
        setNote(reason === GEOLOCATION_UNSUPPORTED ? i18n._({ id: "ui.This browser cannot share its location. Choose a saved place instead.", message: "This browser cannot share its location. Choose a saved place instead." }) : reason === "unavailable" ? i18n._({ id: "ui.Could not find your location just now. Try again, or choose a saved place.", message: "Could not find your location just now. Try again, or choose a saved place." }) : locationBlockedHelp());
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
/** PARITY-01: one-of-many neutral kit chips writing page state `control.state`; the first option is the default. */
function ChoiceChips({ control, state, slot }: { control: ChoiceControl; state: Row; slot: string }) {
  const writer = useContext(PageStateContext);
  const chosen = typeof state[control.state] === "string" ? (state[control.state] as string) : control.options[0]!.value;
  return (
    <div role="group" aria-label={control.label} data-slot={slot} className="flex min-w-0 items-center gap-2 overflow-x-auto [scrollbar-width:none]">
      {control.options.map((option) => (
        <Chip key={option.value} size="strip" tone="quiet" selected={chosen === option.value} onClick={() => writer?.merge({ [control.state]: option.value === control.options[0]!.value ? undefined : option.value })}>
          {option.label}
        </Chip>
      ))}
    </div>
  );
}

/** PARITY-01: a sort control (kit select) writing page state `control.state`; the first option is the default. */
function SortSelect({ control, state }: { control: ChoiceControl; state: Row }) {
  const writer = useContext(PageStateContext);
  const chosen = typeof state[control.state] === "string" ? (state[control.state] as string) : control.options[0]!.value;
  return (
    <Select value={chosen} onValueChange={(value) => writer?.merge({ [control.state]: value })}>
      <SelectTrigger aria-label={control.label} data-slot="shelf-sort" className="w-auto min-w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {control.options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

const SUGGEST_ROWS_DEBOUNCE_MS = 250;
type SearchSuggestion = { key: string; label: string };

/** MEDIA-PARITY-02: search suggestions. Asks the bound package data call about 250 ms after typing stops, from `min_chars`
 * characters (default 2), reading the typed text as `$state.<state>`; keeps only the newest answer, and a failed or malformed
 * answer is no suggestions. */
function useSearchSuggestions(config: SearchNode["suggest"], text: string, state: Row, stateKey: string): SearchSuggestion[] {
  const scope = useContext(PackageScopeContext);
  const [found, setFound] = useState<SearchSuggestion[]>([]);
  const trimmed = text.trim();
  const packageId = scope?.packageId;
  const minChars = config?.min_chars ?? 2;
  const max = config?.max ?? 6;
  const keyField = config?.item_key_field ?? "key";
  const labelField = config?.item_label_field ?? "label";
  const signature = JSON.stringify(config ? resolveParams(config.bind.params, { ...state, [stateKey]: trimmed }).body : null);
  useEffect(() => {
    if (!config || !packageId || trimmed.length < minChars) { setFound([]); return; }
    let current = true;
    const timer = setTimeout(() => {
      const { body } = resolveParams(config.bind.params, { ...state, [stateKey]: trimmed });
      request<unknown>(`/api/plugins/${packageId}/data/${config.bind.path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(
        (answer) => {
          if (!current) return;
          const rows = Array.isArray(answer) ? answer : Array.isArray((answer as { rows?: unknown } | null)?.rows) ? (answer as { rows: unknown[] }).rows : [];
          const clean: SearchSuggestion[] = [];
          for (const row of rows as Row[]) {
            if (!row || typeof row !== "object") continue;
            const label = readField(row, labelField);
            if (typeof label !== "string" || label === "") continue;
            const key = readField(row, keyField);
            clean.push({ key: typeof key === "string" || typeof key === "number" ? String(key) : label, label });
          }
          setFound(clean.slice(0, max));
        },
        () => { if (current) setFound([]); },
      );
    }, SUGGEST_ROWS_DEBOUNCE_MS);
    return () => { current = false; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- trimmed text and the resolved body are the change signals
  }, [config, packageId, trimmed, signature, minChars, max, keyField, labelField]);
  return found;
}

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
  // MEDIA-PARITY-02: suggestions under the field while typing; arrow keys move, Enter takes the active one, a tap fills and submits.
  const suggestions = useSearchSuggestions(node.suggest, text, state, key);
  const [suggestOpen, setSuggestOpen] = useState(true);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const showSuggestions = node.suggest !== undefined && suggestOpen && suggestions.length > 0 && text.trim().length >= (node.suggest.min_chars ?? 2);
  function pick(label: string) {
    setText(label);
    setActive(-1);
    setSuggestOpen(false);
    submit(label);
  }
  const chips = text === "" ? recents.map((row) => ({ key: String(readField(row, keyField) ?? ""), label: String(readField(row, labelField) ?? "") })).filter((c) => c.label !== "") : [];
  return (
    <div role="search" data-slot="search-node" className="flex min-w-0 flex-col gap-2">
      <Input
        type="search"
        value={text}
        aria-label={node.label ?? i18n._({ id: "ui.Search", message: "Search" })}
        placeholder={node.placeholder}
        autoComplete="off"
        onChange={(e) => { setSuggestOpen(true); setActive(-1); change(e.target.value); }}
        role={node.suggest ? "combobox" : undefined}
        aria-expanded={node.suggest ? showSuggestions : undefined}
        aria-controls={showSuggestions ? listId : undefined}
        aria-autocomplete={node.suggest ? "list" : undefined}
        aria-activedescendant={showSuggestions && active >= 0 ? `${listId}-${active}` : undefined}
        onKeyDown={(e) => {
          if (showSuggestions && e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % suggestions.length); return; }
          if (showSuggestions && e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1)); return; }
          if (showSuggestions && e.key === "Escape") { e.preventDefault(); setSuggestOpen(false); setActive(-1); return; }
          if (e.key === "Enter") {
            e.preventDefault();
            if (showSuggestions && active >= 0 && suggestions[active]) pick(suggestions[active]!.label);
            else { setSuggestOpen(false); submit(text); }
          }
        }}
      />
      {showSuggestions ? (
        <ul id={listId} role="listbox" data-slot="search-suggestions" aria-label={i18n._({ id: "ui.Suggestions", message: "Suggestions" })} className="m-0 flex min-w-0 list-none flex-col overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface-2)] p-1 ring-1 ring-inset ring-[var(--hairline)]">
          {suggestions.map((suggestion, i) => (
            <li
              key={suggestion.key}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              data-active={i === active ? "true" : undefined}
              className="min-h-11 cursor-pointer truncate rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-muted data-[active=true]:bg-muted"
              // The mouse down stays off the field so the list is still there when the click lands.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(suggestion.label)}
              onKeyDown={(e) => { if (e.key === "Enter") pick(suggestion.label); }}
            >
              {suggestion.label}
            </li>
          ))}
        </ul>
      ) : null}
      {node.type_chips ? <ChoiceChips control={node.type_chips} state={state} slot="search-type-chips" /> : null}
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
            <Button type="button" variant="ghost" size="sm" onClick={() => dispatch(node.clear_recents!, [{}])}>{i18n._({ id: "ui.Clear", message: "Clear" })}</Button>
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

/** VIDEO-LORA-09: whether a chip cannot be used at the chosen level: always when it has a `disabled_reason` and no `enabled_tiers`, else at a level outside `enabled_tiers`. */
function chipUnusable(chip: PromptBarNode["chips"] extends (infer C)[] | undefined ? C : never, tier: TierId): boolean {
  if (chip.enabled_tiers) return !chip.enabled_tiers.includes(tier);
  return Boolean(chip.disabled_reason);
}

const SUGGEST_DEBOUNCE_MS = 500;
const SUGGEST_MIN_CHARS = 3;
type Suggested = { id: string; name: string; kind: "style" | "character" };

/** STYLES-04: the suggested styles for what is typed. Asks the bound list about 500 ms after typing stops, from 3 characters, and
 * keeps only the newest answer. A failed or malformed answer is no chips. Nothing leaves the package's own data route. */
function useStyleSuggestions(node: PromptBarNode, text: string, state: Row, promptKey: string): Suggested[] {
  const scope = useContext(PackageScopeContext);
  const config = node.style_suggest;
  const [found, setFound] = useState<Suggested[]>([]);
  const trimmed = text.trim();
  const packageId = scope?.packageId;
  const stateSignature = JSON.stringify(config ? resolveParams(config.rows.params, { ...state, [promptKey]: trimmed }).body : null);
  useEffect(() => {
    if (!config || !packageId || trimmed.length < SUGGEST_MIN_CHARS) { setFound([]); return; }
    let current = true;
    const timer = setTimeout(() => {
      const { body } = resolveParams(config.rows.params, { ...state, [promptKey]: trimmed });
      request<unknown>(`/api/plugins/${packageId}/data/${config.rows.path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(
        (answer) => {
          if (!current) return;
          // The package data route answers a bare list; `{ rows }` is accepted too.
          const rows = Array.isArray(answer) ? answer : Array.isArray((answer as { rows?: unknown } | null)?.rows) ? (answer as { rows: unknown[] }).rows : [];
          const clean: Suggested[] = [];
          for (const row of rows as Array<Record<string, unknown>>) {
            if (row && typeof row.id === "string" && row.id !== "" && typeof row.name === "string" && row.name !== "" && (row.kind === "style" || row.kind === "character")) clean.push({ id: row.id, name: row.name, kind: row.kind });
          }
          setFound(clean);
        },
        () => { if (current) setFound([]); },
      );
    }, SUGGEST_DEBOUNCE_MS);
    return () => { current = false; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- trimmed text and the resolved body are the change signals
  }, [config, packageId, trimmed, stateSignature]);
  return found;
}

/** VIDEO-CREATE-01: the prompt bar as a schema node. Chip and tier choices go to page state as they change, the prompt text
 * when Make is pressed; Make fires `submit` once with {prompt, <chip states>, <tier state>}. The node sends nothing itself. */
function PromptBarNodeView({ node, state }: { node: PromptBarNode; state: Row }) {
  const writer = useContext(PageStateContext);
  const host = useContext(MediaHostContext);
  const scope = useContext(PackageScopeContext);
  const assetSrc = (path: string | undefined): string | undefined => {
    if (!path) return undefined;
    if (host?.assetUrl && scope) return host.assetUrl(scope.packageId, path);
    return scope ? `/api/plugins/${scope.packageId}/assets/${path}` : undefined;
  };
  const refs = node.references ?? [];
  const [filled, setFilled] = useState<Record<string, { id: string; thumb?: string }>>(() => {
    const out: Record<string, { id: string; thumb?: string }> = {};
    for (const ref of refs) { const v = state[ref.state]; if (typeof v === "string" && v) out[ref.state] = { id: v }; }
    return out;
  });
  const { dispatch, lastError } = useDispatchAction();
  const promptKey = node.prompt_state ?? "prompt";
  const chips = node.chips ?? [];
  const initial: Record<string, string | number> = {};
  for (const chip of chips) {
    const fromState = state[chip.state];
    const known = chip.options.find((o) => o.value === fromState || String(o.value) === String(fromState));
    initial[chip.state] = known ? known.value : (chip.default ?? chip.options[0]!.value);
  }
  const [text, setText] = useState(typeof state[promptKey] === "string" ? (state[promptKey] as string) : "");
  const [picked, setPicked] = useState<Record<string, string | number>>(initial);
  const modeConfig = node.mode_selector;
  const [mode, setMode] = useState(() => {
    const fromState = modeConfig ? state[modeConfig.state] : undefined;
    return typeof fromState === "string" && modeConfig?.options.some((option) => option.value === fromState)
      ? fromState
      : modeConfig?.default ?? modeConfig?.options[0]?.value ?? "";
  });
  const [tier, setTier] = useState<TierId>(() => {
    const fromState = node.tier ? state[node.tier.state] : undefined;
    return node.tier?.tiers.find((t) => t.id === fromState)?.id ?? node.tier?.default ?? node.tier?.tiers[0]?.id ?? "standard";
  });
  const [busy, setBusy] = useState(false);

  // STYLES-04: suggested chips. A chip showing is ON for the submit; a hand pick (a value other than the quiet one) always wins.
  const suggestCfg = node.style_suggest;
  const suggestStates = { style: suggestCfg?.style_state ?? "style", character: suggestCfg?.character_state ?? "character" };
  const fetched = useStyleSuggestions(node, text, state, promptKey);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const handPicked = (kind: "style" | "character"): boolean => {
    const key = suggestStates[kind];
    const chip = chips.find((c) => c.state === key);
    if (chip) {
      if (chipUnusable(chip, tier)) return true;
      const quiet = chip.quiet_value ?? chip.default ?? chip.options[0]!.value;
      return String(picked[key]) !== String(quiet);
    }
    return Boolean(filled[key]);
  };
  const suggested: Suggested[] = suggestCfg ? fetched.filter((row) => !dismissed.includes(row.id) && !handPicked(row.kind)).slice(0, suggestCfg.max ?? 2) : [];

  // VIDEO-UI-03 (K6): a `navigate` that arrives at this page again (Remix) writes new values into the page state while the bar is
  // mounted. A value that differs from what the bar holds is taken over, so the bar follows the page, not only its first render.
  const fromPrompt = state[promptKey];
  useEffect(() => { if (typeof fromPrompt === "string" && fromPrompt !== "") setText((prev) => (prev === fromPrompt ? prev : fromPrompt)); }, [fromPrompt]);
  const chipSignature = chips.map((chip) => `${chip.state}=${String(state[chip.state] ?? "")}`).join("&");
  useEffect(() => {
    const next: Record<string, string | number> = {};
    for (const chip of chips) {
      const known = chip.options.find((o) => o.value === state[chip.state] || (state[chip.state] !== undefined && String(o.value) === String(state[chip.state])));
      if (known) next[chip.state] = known.value;
    }
    if (Object.keys(next).length > 0) setPicked((prev) => (Object.entries(next).every(([k, v]) => prev[k] === v) ? prev : { ...prev, ...next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chipSignature is the change signal for chips read from state
  }, [chipSignature]);
  const fromTier = node.tier ? state[node.tier.state] : undefined;
  useEffect(() => {
    const known = node.tier?.tiers.find((t) => t.id === fromTier)?.id;
    if (known) setTier(known);
  }, [fromTier, node.tier]);
  const refSignature = refs.map((ref) => `${ref.state}=${String(state[ref.state] ?? "")}`).join("&");
  useEffect(() => {
    setFilled((prev) => {
      let changed = false;
      const out = { ...prev };
      for (const ref of refs) {
        const v = state[ref.state];
        if (typeof v === "string" && v && prev[ref.state]?.id !== v) { out[ref.state] = { id: v }; changed = true; }
      }
      return changed ? out : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refSignature is the change signal for references read from state
  }, [refSignature]);

  // K8: the host's one line while the engine this bar starts is not ready; it stops the bar and is shown instead of an error.
  const modeAction = node.mode_actions?.[mode];
  const notice = node.starts && !modeAction ? host?.makingNotice?.(node.starts) : undefined;

  const detailValue = node.submit_detail ? (node.submit_detail.state === node.tier?.state ? tier : picked[node.submit_detail.state]) : undefined;
  const submitDetail = node.submit_detail && detailValue !== undefined ? node.submit_detail.labels[String(detailValue)] : undefined;

  function submit() {
    const item: Record<string, unknown> = { ...picked, [promptKey]: text.trim() };
    // VIDEO-LORA-09: a chip that cannot be used at the chosen level sends nothing.
    for (const chip of chips) if (chipUnusable(chip, tier)) delete item[chip.state];
    if (node.tier) item[node.tier.state] = tier;
    for (const ref of refs) { const f = filled[ref.state]; if (f) item[ref.state] = f.id; }
    // STYLES-04: a suggested chip left on is the person's yes. Only the submit carries the id (never page state, so never the address).
    const taken = new Set<"style" | "character">();
    for (const row of suggested) if (!taken.has(row.kind)) { taken.add(row.kind); item[suggestStates[row.kind]] = row.id; }
    writer?.merge({ [promptKey]: text.trim() });
    setDismissed([]);
    setBusy(true);
    if (modeConfig) item[modeConfig.state] = mode;
    dispatch(modeAction ?? node.submit, [item], () => setBusy(false), { typedArgs: true });
  }
  return (
    <PromptBar
      label={node.label}
      placeholder={node.placeholder}
      maxLength={node.max_length}
      value={text}
      onValueChange={setText}
      submitLabel={node.submit_label}
      placement={node.placement}
      layout={node.layout}
      chatDistribution={node.chat_distribution}
      modeSelector={modeConfig ? {
        label: modeConfig.label,
        value: mode,
        options: modeConfig.options,
        onValueChange: (next) => { setMode(next); writer?.merge({ [modeConfig.state]: next }); },
      } : undefined}
      fieldSize={node.field_size}
      suggestions={node.suggestions}
      submitDetail={submitDetail}
      submitDetailPlacement={node.submit_detail?.placement}
      disabledReason={notice}
      busy={busy}
      error={lastError}
      onSubmit={submit}
      suggestedStyles={suggested}
      onDismissSuggestion={(id) => setDismissed((prev) => (prev.includes(id) ? prev : [...prev, id]))}
      chips={chips.map((chip) => {
        // VIDEO-LORA-09: a chip that works only at some levels is disabled at the others, with its one plain line.
        const unusable = chipUnusable(chip, tier);
        return {
          id: chip.state,
          label: chip.label,
          variant: chip.variant,
          presentation: chip.presentation,
          group: chip.group,
          align: chip.align,
          iconOnly: chip.icon_only,
          fold: chip.fold,
          trigger: chip.trigger,
          popoverSize: chip.popover_size,
          ...(unusable && chip.disabled_reason ? { disabledReason: chip.disabled_reason } : {}),
          ...(chip.quiet_value !== undefined ? { quietValue: chip.quiet_value } : {}),
          options: [
            ...chip.options.map((o) => ({ value: o.value, label: o.label, media: assetSrc(o.media), icon: o.icon, ...(o.note ? { note: o.note } : {}) })),
            ...(chip.locked === true && !unusable ? [{ locked: true as const }] : []),
          ],
          value: unusable && chip.quiet_value !== undefined ? chip.quiet_value : picked[chip.state]!,
          onValueChange: (value: string | number) => {
            setPicked((prev) => ({ ...prev, [chip.state]: value }));
            writer?.merge({ [chip.state]: value });
          },
        };
      })}
      references={refs.map((ref) => ({
        id: ref.state,
        label: ref.label,
        kind: ref.kind,
        placement: ref.placement,
        hint: ref.hint,
        value: filled[ref.state]?.id ?? null,
        thumb: filled[ref.state]?.thumb,
        disabled: !host?.pickMedia,
        onPick: () => {
          if (!host?.pickMedia) return;
          void host.pickMedia(ref.kind).then((got) => {
            if (!got) return;
            setFilled((prev) => ({ ...prev, [ref.state]: got }));
            writer?.merge({ [ref.state]: got.id });
          }, () => {});
        },
        onRemove: () => {
          setFilled((prev) => { const next = { ...prev }; delete next[ref.state]; return next; });
          writer?.merge({ [ref.state]: undefined });
        },
      }))}
      tier={node.tier ? {
        value: tier,
        label: node.tier.label,
        presentation: node.tier.presentation,
        details: node.submit_detail && node.submit_detail.state === node.tier.state ? node.submit_detail.labels : undefined,
        tiers: node.tier.tiers.map((t) => ({ id: t.id, label: t.label, hint: t.hint, disabledReason: t.disabled_reason, confirm: t.confirm })),
        onValueChange: (next) => { setTier(next); writer?.merge({ [node.tier!.state]: next }); },
      } : undefined}
    />
  );
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
function pictureKind(value: unknown): ImageFallbackKind {
  if (["podcast", "podcast_show"].includes(String(value))) return "podcast";
  if (["audio", "track", "podcast_episode", "audiobook", "chapter"].includes(String(value))) return "music";
  if (["video", "episode", "film"].includes(String(value))) return "video";
  if (["document", "file", "book"].includes(String(value))) return "file";
  return value === "person" ? "person" : "picture";
}

function RowMedia({ value, kind }: { value: unknown; kind: unknown }) {
  if (typeof value !== "string" || value === "") return <SafeImage kind={pictureKind(kind)} alt="" className="size-8 shrink-0 rounded-md object-cover" />;
  if ((value.startsWith("/") && !value.startsWith("//")) || isOwnBlobUrl(value)) return <SafeImage src={value} kind={pictureKind(kind)} alt="" className="size-8 shrink-0 rounded-md object-cover" />;
  if (/^[a-z0-9-]+$/i.test(value)) {
    const Icon = getIcon(value);
    return Icon ? <Icon className="text-muted-foreground size-6 shrink-0" aria-hidden /> : null;
  }
  return <SafeImage kind={pictureKind(kind)} alt="" className="size-8 shrink-0 rounded-md object-cover" />;
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

  // QA-FINISH-01: a list that hides when empty draws nothing, not even its empty text. A load error still shows.
  if (node.hide_when_empty && query.data && !query.isError && !hasRows) return null;

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
          <SelectModeToggle label={node.batch.select_label ?? i18n._({ id: "ui.Select", message: "Select" })} onClick={() => setSelectMode(true)} />
        )
      ) : null}

      <AsyncState
      errorLayout="row"
        data={filteredRows}
        error={query.isError}
        isFetching={query.isFetching}
        onRetry={() => query.refetch()}
        errorMessage={i18n._({ id: "ui.Could not load this list.", message: "Could not load this list." })}
        isEmpty={(rows) => rows.length === 0}
        emptyIcon={node.empty_state?.icon ?? "inbox"}
        emptyText={node.empty_state?.text ?? i18n._({ id: "ui.Nothing here yet.", message: "Nothing here yet." })}
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
              // A list that names a row action opens the row on a click anywhere on it, not only on the action's own button
              // (which stays, for the keyboard and for a screen reader). A row toggle's own button is outside this area.
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
              <div
                className={cn("flex min-w-0 flex-1 items-center gap-3", node.row_action && !selectMode && "cursor-pointer")}
                data-slot={node.row_action && !selectMode ? "list-row-open" : undefined}
                onClick={node.row_action && !selectMode ? () => dispatch(node.row_action!.action, [row]) : undefined}
              >
                {selectMode ? (
                  <Checkbox
                    checked={selected.has(keyOf(row))}
                    onCheckedChange={() => toggle(keyOf(row))}
                    aria-label={i18n._({ id: "ui.Select {name}", message: "Select {name}", values: { name: String(readField(row, node.item_label_field)) } })}
                    className="shrink-0"
                  />
                ) : null}
                {node.item_media_field ? <RowMedia value={readField(row, node.item_media_field)} kind={readField(row, "kind")} /> : null}
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
      errorLayout="row"
      data={query.data}
      error={query.isError}
      isFetching={query.isFetching}
      onRetry={() => query.refetch()}
      errorMessage={i18n._({ id: "ui.Could not load this grid.", message: "Could not load this grid." })}
      isEmpty={(rows) => rows.length === 0}
      emptyIcon={node.empty_state?.icon ?? "inbox"}
      emptyText={node.empty_state?.text ?? i18n._({ id: "ui.Nothing here yet.", message: "Nothing here yet." })}
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
/** VIDEO-UI-14: a same-origin clip path (starting with one `/`), else none; the tile then shows its poster alone. */
function localVideo(value: unknown): string | null {
  return localPicture(value);
}

/** Each row's day group key, in order. A row with no readable date joins the group before it (the first one, "undated"). */
function dayGroupKeys(rows: readonly Row[], field: string): Map<Row, string> {
  const keys = new Map<Row, string>();
  let last = "undated";
  for (const row of rows) {
    last = dayKey(readField(row, field)) ?? last;
    keys.set(row, last);
  }
  return keys;
}

/** MEDIA-PARITY-02: turns a node's `reorder` spec into the kit's `ReorderConfig`. After a move the action fires once with the whole
 * new key order under `id_param`; on failure the old order is put back (`revert`) and `failure` is a status card to draw. */
function useReorderWiring(spec: ReorderSpec | undefined): { config: ReorderConfig | undefined; failure: ReactNode } {
  const { dispatch } = useDispatchAction();
  const [error, setError] = useState<string | null>(null);
  if (!spec || !("call" in spec.call)) return { config: undefined, failure: null };
  const call = spec.call.call;
  const config: ReorderConfig = {
    onReorder: (keys, revert) => {
      setError(null);
      // The ordered keys travel as a typed array: the whole-string placeholder keeps the item's own value.
      const action = { call: { ...call, args: { ...call.args, [spec.id_param]: `{${spec.id_param}}` } } };
      dispatch(action, [{ [spec.id_param]: keys }], undefined, {
        typedArgs: true,
        onError: (message) => { revert(); setError(message || i18n._({ id: "ui.Something went wrong.", message: "Something went wrong." })); },
      });
    },
  };
  return { config, failure: error ? <ReorderFailure message={error} onDismiss={() => setError(null)} /> : null };
}

/** MEDIA-PARITY-02: `item_badge_presentation: "dot"`: a truthy badge field is a small accent dot (an unplayed mark). A string field is its accessible name. */
function badgeDot(value: unknown): ReactNode {
  const on = value === true || (typeof value === "string" && value !== "") || (typeof value === "number" && value > 0);
  if (!on) return null;
  const name = typeof value === "string" ? value : i18n._({ id: "ui.Not played yet", message: "Not played yet" });
  return <span role="img" aria-label={name} data-slot="media-tile-badge-dot" className="block size-2.5 rounded-full bg-primary ring-2 ring-background" />;
}

/** PARITY-01: the sort select and filter chips sit outside the shelf's loading and empty states, so a filter that
 * matches nothing can still be changed back. */
function MediaShelfNodeView({ node, state }: { node: MediaShelfNode; state: Row }) {
  if (!node.sort && !node.chips) return <MediaShelfBody node={node} state={state} />;
  return (
    <div className="flex min-w-0 flex-col gap-3" data-slot="shelf-with-controls">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2" data-slot="shelf-controls">
        {node.chips ? <ChoiceChips control={node.chips} state={state} slot="shelf-chips" /> : <span />}
        {node.sort ? <SortSelect control={node.sort} state={state} /> : null}
      </div>
      <MediaShelfBody node={node} state={state} />
    </div>
  );
}

function MediaShelfBody({ node, state }: { node: MediaShelfNode; state: Row }) {
  const query = useBinding<Row[]>(node.bind, state);
  const { dispatch, lastError, pendingConfirm } = useDispatchAction();
  const reorderWiring = useReorderWiring(node.reorder);
  // The slider's size is per shelf and per device (the card-size hook's own storage), whether or not a slider is drawn.
  const [tileSize, setTileSize] = useCardSize(`shelf:${node.bind.path}`);
  // The heart turns at once; the action's refresh then brings the stored value, which is the truth (a failed call puts it back).
  const [pressed, setPressed] = useState<Record<string, boolean>>({});
  function keyOf(row: Row): string {
    return String(readField(row, node.item_key_field));
  }
  return (
    <AsyncState
      errorLayout="row"
      data={query.data}
      error={query.isError}
      isFetching={query.isFetching}
      onRetry={() => query.refetch()}
      errorMessage={i18n._({ id: "ui.Could not load this shelf.", message: "Could not load this shelf." })}
      // MEDIA-POLISH-01: a shelf that hides when empty gets its rows either way and draws nothing for none.
      isEmpty={(rows) => rows.length === 0 && !node.hide_when_empty}
      emptyIcon={node.empty_state?.icon ?? "inbox"}
      emptyText={node.empty_state?.text ?? i18n._({ id: "ui.Nothing here yet.", message: "Nothing here yet." })}
      emptyActionLabel={node.empty_state?.action ? (node.empty_state.action_label ?? actionLabel(node.empty_state.action)) : undefined}
      onEmptyAction={node.empty_state?.action ? () => dispatch(node.empty_state!.action!) : undefined}
    >
      {(rows) => {
        const groupKeys = node.group_by_field ? dayGroupKeys(rows, node.group_by_field) : undefined;
        const noun = node.group_noun ?? { one: i18n._({ id: "ui.item", message: "item" }), other: i18n._({ id: "ui.items", message: "items" }) };
        const favoriteOn = (row: Row) => pressed[keyOf(row)] ?? readField(row, node.favorite!.field) === true;
        const pinned = node.pinned_field ? rows.filter((row) => readField(row, node.pinned_field!) === true).slice(0, node.pinned_max ?? 6) : [];
        const rest = pinned.length > 0 ? rows.filter((row) => !pinned.includes(row)) : rows;
        const shelf = (items: Row[], pinnedRow: boolean) => (
          <MediaShelf
            items={items}
            getKey={keyOf}
            groupBy={groupKeys && !pinnedRow
              ? { getKey: (row) => groupKeys.get(row) ?? "undated", label: (key, count) => i18n._({ id: "ui.{day}, {count} {noun}", message: "{day}, {count} {noun}", values: { day: key === "undated" ? i18n._({ id: "ui.Earlier", message: "Earlier" }) : dayHeading(key), count, noun: count === 1 ? noun.one : noun.other } }) }
              : undefined}
            sizeControl={node.size_control && !pinnedRow ? { size: tileSize, onChange: setTileSize } : undefined}
            favorite={node.favorite
              ? {
                  isOn: favoriteOn,
                  label: (row) => i18n._({ id: "ui.Favorite {name}", message: "Favorite {name}", values: { name: String(readField(row, node.item_label_field)) } }),
                  onToggle: (row) => {
                    const id = keyOf(row);
                    const next = !favoriteOn(row);
                    setPressed((prev) => ({ ...prev, [id]: next }));
                    dispatch(node.favorite!.action, [writeField(row, node.favorite!.field, next)], () => {
                      setPressed((prev) => {
                        const rest = { ...prev };
                        delete rest[id];
                        return rest;
                      });
                    });
                  },
                }
              : undefined}
            isLocked={(row) => readField(row, node.locked_field ?? "locked") === true}
            isMaking={(row) => readField(row, node.making_field ?? "making") === true}
            aspect={node.aspect}
            look={node.look}
            heading={pinnedRow ? (node.pinned_heading ?? i18n._({ id: "ui.Pinned", message: "Pinned" })) : node.heading}
            headingStyle={node.heading_style}
            variant={pinnedRow ? "plain" : node.variant}
            orientation={pinnedRow ? "horizontal" : node.orientation}
            layout={pinnedRow ? "rail" : node.layout}
            artShape={node.art_shape}
            density={node.density}
            cardRadius={node.card_radius}
            pressScale={node.press_scale}
            reorder={pinnedRow || pinned.length > 0 ? undefined : reorderWiring.config}
            getReorderLabel={(row) => String(readField(row, node.item_label_field) ?? "")}
            onPlay={node.on_play ? (row) => dispatch(node.on_play!, [row]) : undefined}
            getPlayLabel={node.play_label ? (row) => fillTemplate(node.play_label!, row) : undefined}
            isHighlighted={node.item_highlight_field ? (row) => readField(row, node.item_highlight_field!) === true : undefined}
            renderIndex={node.item_index_field
              ? (row) => {
                  const value = readField(row, node.item_index_field!);
                  return typeof value === "string" || typeof value === "number" ? value : null;
                }
              : undefined}
            renderActions={node.row_actions?.length && !pinnedRow
              ? (row) => node.row_actions!.map((button, i) => {
                  if (button.show_when_field && !readField(row, button.show_when_field)) return null;
                  if (button.hide_when_field && readField(row, button.hide_when_field)) return null;
                  const Icon = getIcon(button.icon);
                  const fieldLabel = button.label_field ? readField(row, button.label_field) : undefined;
                  const label = typeof fieldLabel === "string" && fieldLabel !== "" ? fieldLabel : fillTemplate(button.label, row);
                  const iconOnly = button.icon === "play";
                  return (
                    <Button
                      key={i}
                      type="button"
                      data-slot="row-action"
                      title={label}
                      variant={iconOnly ? "inverse" : "outline"}
                      size={iconOnly ? "icon" : "default"}
                      className={iconOnly ? "size-[48px] rounded-full" : "h-auto min-h-[48px] rounded-full whitespace-normal"}
                      aria-label={`${label}: ${String(readField(row, node.item_label_field))}`}
                      onClick={() => dispatch(button.action, [row])}
                    >
                      <Icon aria-hidden="true" />{iconOnly ? null : <span data-slot="row-action-label">{label}</span>}
                    </Button>
                  );
                })
              : undefined}
            hideWhenEmpty={node.hide_when_empty}
            seeAll={node.see_all ? { label: node.see_all.label, onSelect: () => dispatch(node.see_all!.action) } : undefined}
            onSelect={node.on_select ? (row) => dispatch(node.on_select!, [row]) : undefined}
            getLabel={(row) => String(readField(row, node.item_label_field))}
            renderCaption={(row) => {
              const avatar = node.item_avatar_field ? localPicture(readField(row, node.item_avatar_field)) : null;
              const words = (
                <span className="flex min-w-0 flex-col">
                  <span className={node.orientation === "vertical" && node.density !== "compact" ? "line-clamp-2 text-sm font-semibold" : "truncate text-sm font-semibold"}>{String(readField(row, node.item_label_field))}</span>
                  {node.item_subtitle_field ? (
                    <span className="text-muted-foreground truncate text-sm">{fillTemplate(node.item_subtitle_field, row)}</span>
                  ) : null}
                </span>
              );
              return avatar ? (
                <span className="flex min-w-0 items-center gap-2" data-slot="shelf-avatar-caption">
                  <SafeImage src={avatar} kind="music" alt="" className="size-9 shrink-0 rounded-full object-cover" />
                  {words}
                </span>
              ) : words;
            }}
            renderItem={(row) => {
              const src = localPicture(readField(row, node.item_media_field));
              if (node.media_loop && node.item_loop_field) return <LoopPoster poster={src} loop={localVideo(readField(row, node.item_loop_field))} kind={pictureKind(readField(row, "kind"))} />;
              return <SafeImage src={src} kind={pictureKind(readField(row, "kind"))} tintSeed={String(readField(row, node.item_label_field) ?? "")} alt="" className="h-full w-full object-cover" />;
            }}
            getProgress={node.item_progress_field ? (row) => Number(readField(row, node.item_progress_field!)) : undefined}
            renderBadge={
              node.item_badge_field
                ? (row) => {
                    const text = readField(row, node.item_badge_field!);
                    if (node.item_badge_presentation === "dot") return badgeDot(text);
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
        );
        return (
        <>
          {pinned.length > 0 ? shelf(pinned, true) : null}
          {rest.length > 0 || pinned.length === 0 ? shelf(rest, false) : null}
          {reorderWiring.failure}
          {lastError ? <p role="status" className="text-base text-destructive">{lastError}</p> : null}
          <ConfirmDialog pendingConfirm={pendingConfirm} />
        </>
        );
      }}
    </AsyncState>
  );
}

/** MUSIC-KIT-01: the loading, error and empty states the four music blocks share; `children` gets the rows. */
function MusicBlockState({ bind, state, hideWhenEmpty, emptyState, errorMessage, children }: {
  bind: MediaShelfNode["bind"];
  state: Row;
  hideWhenEmpty: boolean;
  emptyState: MediaShelfNode["empty_state"];
  errorMessage: string;
  children: (rows: Row[], dispatch: ReturnType<typeof useDispatchAction>["dispatch"]) => ReactNode;
}) {
  const query = useBinding<Row[]>(bind, state);
  const { dispatch, lastError, pendingConfirm } = useDispatchAction();
  return (
    <AsyncState
      errorLayout="row"
      data={query.data}
      error={query.isError}
      isFetching={query.isFetching}
      onRetry={() => query.refetch()}
      errorMessage={errorMessage}
      isEmpty={(rows) => rows.length === 0 && !hideWhenEmpty}
      emptyIcon={emptyState?.icon ?? "music"}
      emptyText={emptyState?.text ?? i18n._({ id: "ui.Nothing here yet.", message: "Nothing here yet." })}
      emptyActionLabel={emptyState?.action ? (emptyState.action_label ?? actionLabel(emptyState.action)) : undefined}
      onEmptyAction={emptyState?.action ? () => dispatch(emptyState.action!) : undefined}
    >
      {(rows) => (
        <>
          {children(rows, dispatch)}
          {lastError ? <p role="status" className="text-base text-destructive">{lastError}</p> : null}
          <ConfirmDialog pendingConfirm={pendingConfirm} />
        </>
      )}
    </AsyncState>
  );
}

function stringField(row: Row, path: string | undefined): string | undefined {
  if (!path) return undefined;
  const value = readField(row, path);
  return typeof value === "string" && value !== "" ? value : undefined;
}

/** A colour the category tile may mix into its card: a hex value or an rgb(), hsl() or oklch() function. Nothing else
 * (no url(), no var(), no second declaration) reaches a style attribute. */
export function safeTileColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(text)) return text;
  return /^(?:rgb|hsl|oklch)\([0-9a-z\s.,%/-]{1,60}\)$/i.test(text) ? text : undefined;
}

function musicArt(row: Row, path: string | undefined) {
  return <SafeImage src={path ? localPicture(readField(row, path)) : null} kind={pictureKind(readField(row, "kind"))} tintSeed={String(readField(row, "title") ?? readField(row, "name") ?? "")} alt="" className="h-full w-full object-cover" />;
}

function QuickTilesNodeView({ node, state }: { node: QuickTilesNode; state: Row }) {
  return (
    <MusicBlockState bind={node.bind} state={state} hideWhenEmpty={node.hide_when_empty} emptyState={node.empty_state} errorMessage={i18n._({ id: "ui.Could not load these tiles.", message: "Could not load these tiles." })}>
      {(rows, dispatch) => (
        <QuickTiles
          items={rows}
          label={node.label}
          max={node.max}
          getKey={(row) => String(readField(row, node.item_key_field))}
          getTitle={(row) => String(readField(row, node.item_label_field))}
          renderArt={(row) => musicArt(row, node.item_media_field)}
          onSelect={node.on_select ? (row) => dispatch(node.on_select!, [row]) : undefined}
          onPlay={node.on_play ? (row) => dispatch(node.on_play!, [row]) : undefined}
          getPlayLabel={node.play_label ? (row) => fillTemplate(node.play_label!, row) : undefined}
        />
      )}
    </MusicBlockState>
  );
}

function TopResultNodeView({ node, state }: { node: TopResultNode; state: Row }) {
  return (
    <MusicBlockState bind={node.bind} state={state} hideWhenEmpty={node.hide_when_empty} emptyState={node.empty_state} errorMessage={i18n._({ id: "ui.Could not load the top result.", message: "Could not load the top result." })}>
      {(rows, dispatch) => {
        const row = rows[0];
        if (!row) return null;
        return (
          <TopResultCard
            title={String(readField(row, node.item_label_field))}
            eyebrow={node.item_eyebrow_field ? fillTemplate(node.item_eyebrow_field, row) || undefined : undefined}
            subtitle={node.item_subtitle_field ? fillTemplate(node.item_subtitle_field, row) || undefined : undefined}
            art={node.item_media_field ? musicArt(row, node.item_media_field) : undefined}
            circle={node.art_shape === "circle"}
            onSelect={node.on_select ? () => dispatch(node.on_select!, [row]) : undefined}
            onPlay={node.on_play ? () => dispatch(node.on_play!, [row]) : undefined}
            playLabel={node.play_label ? fillTemplate(node.play_label, row) : undefined}
          />
        );
      }}
    </MusicBlockState>
  );
}

function CategoryTilesNodeView({ node, state }: { node: CategoryTilesNode; state: Row }) {
  return (
    <MusicBlockState bind={node.bind} state={state} hideWhenEmpty={node.hide_when_empty} emptyState={node.empty_state} errorMessage={i18n._({ id: "ui.Could not load these categories.", message: "Could not load these categories." })}>
      {(rows, dispatch) => {
        const byId = new Map(rows.map((row) => [String(readField(row, node.item_key_field)), row]));
        return (
          <CategoryTiles
            label={node.label}
            items={rows.map((row) => ({
              id: String(readField(row, node.item_key_field)),
              title: String(readField(row, node.item_label_field)),
              color: safeTileColor(node.item_color_field ? readField(row, node.item_color_field) : undefined),
              art: node.item_media_field && localPicture(readField(row, node.item_media_field)) ? musicArt(row, node.item_media_field) : undefined,
            }))}
            onSelect={node.on_select ? (tile) => { const row = byId.get(tile.id); if (row) dispatch(node.on_select!, [row]); } : undefined}
          />
        );
      }}
    </MusicBlockState>
  );
}

function TrackRowsNodeView({ node, state }: { node: TrackRowsNode; state: Row }) {
  const reorderWiring = useReorderWiring(node.reorder);
  return (
    <>
    <MusicBlockState bind={node.bind} state={state} hideWhenEmpty={node.hide_when_empty} emptyState={node.empty_state} errorMessage={i18n._({ id: "ui.Could not load these tracks.", message: "Could not load these tracks." })}>
      {(rows, dispatch) => (
        <TrackRows
          items={rows}
          label={node.label}
          getKey={(row) => String(readField(row, node.item_key_field))}
          getTitle={(row) => String(readField(row, node.item_label_field))}
          getSubtitle={node.item_subtitle_field ? (row) => fillTemplate(node.item_subtitle_field!, row) || undefined : undefined}
          getNumber={node.item_number_field
            ? (row, i) => {
                const value = readField(row, node.item_number_field!);
                return typeof value === "string" || typeof value === "number" ? value : i + 1;
              }
            : undefined}
          getMeta={node.item_meta_field
            ? (row) => {
                const meta = readField(row, node.item_meta_field!);
                if (typeof meta === "number" && Number.isFinite(meta) && meta > 0) return formatTime(meta);
                return typeof meta === "string" && meta !== "" ? meta : null;
              }
            : undefined}
          getGroup={node.item_group_field ? (row) => stringField(row, node.item_group_field) : undefined}
          isPlaying={node.item_highlight_field ? (row) => readField(row, node.item_highlight_field!) === true : undefined}
          onPlay={(row) => dispatch(node.on_play, [row])}
          getPlayLabel={node.play_label ? (row) => fillTemplate(node.play_label!, row) : undefined}
          reorder={reorderWiring.config}
          renderActions={node.row_actions?.length
            ? (row) => node.row_actions!.map((button, i) => {
                const Icon = getIcon(button.icon);
                return (
                  <Button
                    key={i}
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`${fillTemplate(button.label, row)}: ${String(readField(row, node.item_label_field))}`}
                    onClick={() => dispatch(button.action, [row])}
                  >
                    <Icon aria-hidden="true" />
                  </Button>
                );
              })
            : undefined}
          renderMenu={node.row_actions?.length
            ? (row) => node.row_actions!.map((button, i) => {
                const Icon = getIcon(button.icon);
                return (
                  <DropdownMenuItem key={i} className="min-h-11" onSelect={() => dispatch(button.action, [row])}>
                    <Icon aria-hidden="true" />
                    {fillTemplate(button.label, row)}
                  </DropdownMenuItem>
                );
              })
            : undefined}
        />
      )}
    </MusicBlockState>
    {reorderWiring.failure}
    </>
  );
}

function BillboardNodeView({ node, state }: { node: BillboardNode; state: Row }) {
  const query = useBinding<Row[]>(node.bind, state);
  const { dispatch, lastError } = useDispatchAction();
  const host = useContext(MediaHostContext);
  const rows = query.data ?? [];
  const playingSnapshot = () => rows.flatMap((row) => {
    const action = node.primary.action;
    if (!action || !("play" in action) || !action.play?.media_id) return [];
    const id = fillTemplate(action.play.media_id, row);
    return host?.playback?.isPlaying(id) ? [id] : [];
  }).join("|");
  const subscribePlayback = useCallback((listener: () => void) => host?.playback ? host.playback.subscribe(listener) : () => {}, [host?.playback]);
  useSyncExternalStore(subscribePlayback, playingSnapshot, playingSnapshot);
  return (
    <AsyncState
      errorLayout="row"
      data={query.data}
      error={query.isError}
      isFetching={query.isFetching}
      onRetry={() => query.refetch()}
      errorMessage={i18n._({ id: "ui.Could not load the featured items.", message: "Could not load the featured items." })}
      isEmpty={(rows) => rows.length === 0 && !node.hide_when_empty}
      emptyIcon={node.empty_state?.icon ?? "film"}
      emptyText={node.empty_state?.text ?? i18n._({ id: "ui.Nothing featured yet.", message: "Nothing featured yet." })}
      emptyActionLabel={node.empty_state?.action ? (node.empty_state.action_label ?? actionLabel(node.empty_state.action)) : undefined}
      onEmptyAction={node.empty_state?.action ? () => dispatch(node.empty_state!.action!) : undefined}
    >
      {(rows) => rows.length === 0 ? null : (
        <>
          <Billboard
            label={node.label ?? i18n._({ id: "ui.Featured", message: "Featured" })}
            size={node.size}
            autoplay={node.autoplay}
            slides={rows.map((row) => ({
              id: String(readField(row, node.item_key_field)),
              kind: readField(row, "kind") ? pictureKind(readField(row, "kind")) : undefined,
              title: String(readField(row, node.item_title_field) ?? ""),
              subtitle: node.item_subtitle_field ? fillTemplate(node.item_subtitle_field, row) : undefined,
              eyebrow: node.item_eyebrow_field ? fillTemplate(node.item_eyebrow_field, row) : undefined,
              art: node.item_art_field ? (localPicture(readField(row, node.item_art_field)) ?? undefined) : undefined,
              primary: (() => {
                const action = node.primary.action;
                const mediaId = action && "play" in action && action.play?.media_id ? fillTemplate(action.play.media_id, row) : undefined;
                if (mediaId && host?.playback?.isPlaying(mediaId)) return { label: i18n._({ id: "ui.Pause", message: "Pause" }), icon: "pause", onSelect: () => host.playback!.pause(mediaId) };
                return { label: node.primary.label, icon: node.primary.icon, onSelect: () => dispatch(action, [row]) };
              })(),
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
      errorLayout="row"
      data={item === undefined && query.data !== undefined ? null : item}
      error={query.isError} isFetching={query.isFetching} onRetry={() => query.refetch()}
      errorMessage={i18n._({ id: "ui.Could not load this book.", message: "Could not load this book." })}
      isEmpty={(row) => {
        const src = readField(row, field("src"));
        return row === null || typeof src !== "string" || !sameOriginBookUrl(src, document.baseURI) || !["epub", "pdf"].includes(String(formatFor(row)));
      }}
      emptyIcon={node.empty_state?.icon ?? "book"} emptyText={node.empty_state?.text ?? i18n._({ id: "ui.This book is not available.", message: "This book is not available." })}
      emptyActionLabel={node.empty_state?.action ? (node.empty_state.action_label ?? actionLabel(node.empty_state.action)) : undefined}
      onEmptyAction={node.empty_state?.action ? () => dispatch(node.empty_state!.action!) : undefined}
    >
      {(row) => {
        const r = row as Row;
        const format = formatFor(r) as "epub" | "pdf";
        return <>
          <Reader key={String(readField(r, field("id")) ?? readField(r, field("src")))} src={String(readField(r, field("src")))} format={format}
            title={String(readField(r, field("title")) ?? i18n._({ id: "ui.Reader", message: "Reader" }))} theme={node.theme} fontSize={node.font_size}
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
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const phone = useIsPhoneLayout();
  const [editOpen, setEditOpen] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});
  const [editError, setEditError] = useState<string | null>(null);
  useEffect(() => { if (lastError !== null && editOpen) setEditError(i18n._({ id: "ui.Could not save. Check that you are online, then try again.", message: "Could not save. Check that you are online, then try again." })); }, [lastError, editOpen]);
  const field = (name: keyof NonNullable<PlayerNode["fields"]>, fallback: string) => node.fields?.[name] ?? fallback;
  const item = Array.isArray(query.data) ? query.data[0] : query.data;
  return (
    <AsyncState
      errorLayout="row"
      data={item === undefined && query.data !== undefined ? null : item}
      error={query.isError}
      isFetching={query.isFetching}
      onRetry={() => query.refetch()}
      errorMessage={i18n._({ id: "ui.Could not load this item.", message: "Could not load this item." })}
      isEmpty={(row) => row === null || localPicture(readField(row, field("src", "src"))) === null}
      emptyIcon={node.empty_state?.icon ?? "film"}
      emptyText={node.empty_state?.text ?? i18n._({ id: "ui.This item is not available.", message: "This item is not available." })}
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
        const lyricText = readField(r, field("lyrics", "lyrics"));
        const timedLines = readField(r, field("timed_lyrics", "timed_lyrics"));
        const nestedLyrics = readField(r, "lyrics");
        const lyrics = { text: typeof lyricText === "string" ? lyricText : typeof nestedLyrics === "object" && nestedLyrics !== null && typeof (nestedLyrics as Row).text === "string" ? (nestedLyrics as Row).text as string : undefined,
          lines: (Array.isArray(timedLines) ? timedLines : typeof nestedLyrics === "object" && nestedLyrics !== null ? (nestedLyrics as Row).timed : undefined) as TimedLyricLine[] | undefined };
        const hasLyrics = Boolean(lyrics.text || lyrics.lines?.length);
        const audioLayout = node.layout ? node.layout === "audio" : node.kind === "audio";
        const canEdit = node.edit && readField(r, node.edit.visible_field ?? "can_edit") === true;
        const editButton = canEdit && node.edit ? <Button type="button" variant="secondary" size="sm" className="shrink-0 rounded-full px-4" onClick={() => { setEditError(null); setEditValues(Object.fromEntries(node.edit!.fields.map(f => [f.name, readField(r, f.name) ?? ""]))); setEditOpen(true); }}>{node.edit.label}</Button> : null;
        // MEDIA-POLISH-01: the host may own the element, so playback outlives this page (the docked mini bar).
        // ADULT-LOCK-01: an adult-only item is never offered to the host: it plays in this page's own element and stops with the page.
        const adultOnly = readField(r, "adult_only") === true;
        const mediaItem = { id: String(readField(r, field("id", "id")) ?? ""), src, kind: node.kind, title, subtitle, poster };
        const external = adultOnly ? null : host?.mediaFor?.(mediaItem) ?? null;
        const voiceover = adultOnly ? undefined : host?.voiceoverFor?.(mediaItem);
        return (
          <>
            <Player
              live={r.live === true}
              media={external}
              voiceover={voiceover}
              mediaRef={mediaEl}
              castSlot={
                host?.castTargets && host.castTo ? (
                  <PlayerCastMenu host={host} item={r} getPosition={() => mediaEl.current?.currentTime ?? 0} onError={setCastError} />
                ) : undefined
              }
              src={src}
              mediaSession={!adultOnly}
              kind={node.kind}
              layout={node.layout}
              title={String(readField(r, field("title", "title")) ?? "")}
              subtitle={(readField(r, field("subtitle", "subtitle")) as string | undefined) ?? undefined}
              poster={localPicture(readField(r, field("poster", "poster"))) ?? undefined}
              lyrics={hasLyrics || node.lyrics_enabled ? lyrics : undefined}
              lyricsLabel={i18n._({ id: "ui.Lyrics", message: "Lyrics" })}
              artSpring={node.art_spring}
              lyricsBlur={node.lyrics_blur}
              lyricsEmptyText={node.lyrics_empty_text}
              lyricsLoading={lyricsLoading}
              onLyricsOpen={node.on_lyrics_open ? () => {
                setLyricsLoading(true);
                dispatch(node.on_lyrics_open!, [r], () => setLyricsLoading(false), { onSuccess: () => { setLyricsLoading(false); void query.refetch(); } });
              } : undefined}
              chapters={(readField(r, field("chapters", "chapters")) as PlayerChapter[] | undefined) ?? undefined}
              captions={(readField(r, field("captions", "captions")) as PlayerTextTrack[] | undefined) ?? undefined}
              thumbnails={localPicture(readField(r, field("thumbnails", "thumbnails"))) ?? undefined}
              resumeFrom={typeof position === "number" ? position : undefined}
              completed={readField(r, field("completed", "completed")) === true}
              upNext={upNext && typeof upNext.id === "string" ? upNext : undefined}
              autoplayNext={node.autoplay_next}
              shuffle={audioLayout ? host?.playMode?.shuffle : undefined}
              repeat={audioLayout ? host?.playMode?.repeat : undefined}
              onShuffle={audioLayout && host?.playMode ? () => host.playMode!.onShuffle() : undefined}
              onRepeat={audioLayout && host?.playMode ? () => host.playMode!.onRepeat() : undefined}
              onQueue={audioLayout && host?.openQueue ? () => host.openQueue!() : undefined}
              rate={node.rate ? (() => { const saved = node.rate.field ? readField(r, node.rate.field) : undefined; return typeof saved === "number" && saved > 0 ? saved : node.rate.value; })() : undefined}
              onRateChange={node.rate?.on_change ? (rate) => dispatch(node.rate!.on_change!, [{ ...r, rate }], undefined, { quiet: true, typedArgs: true }) : undefined}
              sleepTimer={node.sleep_timer}
              skip={node.skip}
              doubleTapSeek={node.double_tap_seek}
              longPressSpeed={node.long_press_speed}
              pip={node.pip}
              onProgress={
                node.on_progress
                  ? (p) =>
                      dispatch(node.on_progress!, [{ ...r, ...p }], undefined, { quiet: true, keepalive: p.reason === "unload" })
                  : undefined
              }
              onNext={node.on_next && upNext ? () => dispatch(node.on_next!, [upNext as unknown as Row]) : undefined}
              actionsSlot={audioLayout ? editButton : undefined}
            />
            {node.details ? (
              <PlayerDetails
                title={title}
                subtitle={subtitle}
                facts={(readField(r, field("facts", "facts")) as string | undefined) ?? undefined}
                description={(readField(r, field("description", "description")) as string | undefined) ?? undefined}
                chapters={(readField(r, field("chapters", "chapters")) as PlayerChapter[] | undefined) ?? undefined}
                seek={(time) => { if (mediaEl.current) mediaEl.current.currentTime = time; }}
                show={node.details_show}
                transcript={node.details_show?.includes("transcript") ? { bind: node.transcript_bind, state, fallback: readField(r, field("transcript", "transcript")), getMedia: () => mediaEl.current, phone } : undefined}
              />
            ) : null}
            {node.actions && node.actions.length > 0 || (editButton && !audioLayout) ? <PlayerActions actions={node.actions ?? []} item={r} dispatch={dispatch} wrap={node.actions_wrap === true}>{!audioLayout ? editButton : null}</PlayerActions> : null}
            {node.edit ? <EditPlayerSheet open={editOpen} onOpenChange={setEditOpen} phone={phone} definition={node.edit} item={r} values={editValues} setValues={setEditValues} error={editError} onSave={() => { const id = readField(r, field("id", "id")); const changed = Object.fromEntries(node.edit!.fields.filter(f => JSON.stringify(editValues[f.name] ?? "") !== JSON.stringify(readField(r, f.name) ?? "")).map(f => [f.name, editValues[f.name]])); if (!Object.keys(changed).length) { setEditOpen(false); return; } setEditError(null); const save = node.edit!.on_save; const action: Action = "call" in save ? { call: { ...save.call, args: { ...changed, id } } } : save; dispatch(action, [{ ...changed, id }], undefined, { onSuccess: () => setEditOpen(false) }); }} /> : null}
            {lastError ? <p role="status" className="text-base text-destructive">{lastError}</p> : null}
            {castError ? <p role="status" className="text-base text-destructive">{castError}</p> : null}
          </>
        );
      }}
    </AsyncState>
  );
}

const castLoadFailed = () => i18n._({ id: "ui.Could not look for other screens. Check that you are online, then open the menu again.", message: "Could not look for other screens. Check that you are online, then open the menu again." });
const castSendFailed = () => i18n._({ id: "ui.Could not play this on the other screen. Make sure it is on and signed in, then try again.", message: "Could not play this on the other screen. Make sure it is on and signed in, then try again." });

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
      .catch((e) => onError(e instanceof Error && e.message ? e.message : castSendFailed()));
  };
  return (
    <DropdownMenu onOpenChange={load}>
      <DropdownMenuTrigger asChild>
        <Button ref={trigger} variant="ghost" size="icon" aria-label={i18n._({ id: "ui.Play on another screen", message: "Play on another screen" })} data-slot="player-cast-targets">
          {Glyph ? <Glyph /> : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent container={trigger.current?.closest<HTMLElement>('[data-slot="player"]') ?? undefined} align="end">
        <DropdownMenuLabel>{i18n._({ id: "ui.Play on another screen", message: "Play on another screen" })}</DropdownMenuLabel>
        {targets === null ? (
          <DropdownMenuItem disabled>{i18n._({ id: "ui.Looking for screens", message: "Looking for screens" })}</DropdownMenuItem>
        ) : loadFailed ? (
          <DropdownMenuItem disabled>{castLoadFailed()}</DropdownMenuItem>
        ) : targets.length === 0 ? (
          <DropdownMenuItem disabled>{i18n._({ id: "ui.No other screens are on", message: "No other screens are on" })}</DropdownMenuItem>
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

/** MEDIA-DETAIL-01: the watch page's title, facts and expandable description under the picture. */
function toTranscriptLines(value: unknown): TranscriptLine[] {
  const rows = Array.isArray(value) ? value : value && typeof value === "object" && Array.isArray((value as Row).rows) ? (value as Row).rows as unknown[] : [];
  return rows.filter((row): row is TranscriptLine => !!row && typeof row === "object" && typeof (row as Row).start_s === "number" && typeof (row as Row).text === "string");
}

function BoundTranscript({ bind, state, ...rest }: { bind: NonNullable<PlayerNode["transcript_bind"]>; state: Row; getMedia: () => HTMLMediaElement | null | undefined; onSeek: (s: number) => void }) {
  const query = useBinding<unknown>(bind, state);
  if (query.isError) return <p role="status" className="text-base text-destructive">{i18n._({ id: "ui.Could not load the transcript. Check that you are online, then try again.", message: "Could not load the transcript. Check that you are online, then try again." })}</p>;
  return <TranscriptPanel lines={toTranscriptLines(query.data)} {...rest} />;
}

/** PARITY-01: the Transcript button under the player; it opens the reader in a dialog (a sheet on a phone). */
function TranscriptButton({ transcript, seek }: { transcript: NonNullable<Parameters<typeof PlayerDetails>[0]["transcript"]>; seek: (time: number) => void }) {
  const [open, setOpen] = useState(false);
  const label = i18n._({ id: "ui.Transcript", message: "Transcript" });
  const body = open ? (
    <div className="flex max-h-[70dvh] min-h-0 flex-col p-4">
      {transcript.bind
        ? <BoundTranscript bind={transcript.bind} state={transcript.state} getMedia={transcript.getMedia} onSeek={seek} />
        : <TranscriptPanel lines={toTranscriptLines(transcript.fallback)} getMedia={transcript.getMedia} onSeek={seek} />}
    </div>
  ) : null;
  return (
    <>
      <Button type="button" variant="secondary" size="sm" className="self-start rounded-full px-4" data-slot="player-transcript-open" onClick={() => setOpen(true)}>{label}</Button>
      {transcript.phone
        ? <Drawer open={open} onOpenChange={setOpen}><DrawerContent><DrawerHeader><DrawerTitle>{label}</DrawerTitle></DrawerHeader>{body}</DrawerContent></Drawer>
        : <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{label}</DialogTitle></DialogHeader>{body}</DialogContent></Dialog>}
    </>
  );
}

function PlayerDetails({ title, subtitle, facts, description, chapters, seek, show, transcript }: {
  transcript?: { bind?: PlayerNode["transcript_bind"]; state: Row; fallback: unknown; getMedia: () => HTMLMediaElement | null | undefined; phone: boolean };
  title: string;
  subtitle?: string;
  facts?: string;
  description?: string;
  chapters?: PlayerChapter[];
  seek: (time: number) => void;
  show?: Array<"title" | "facts" | "description" | "chapters" | "transcript">;
}) {
  const [expanded, setExpanded] = useState(false);
  const detail = description?.trim() && !/\{[^{}]+\}/.test(description) ? description.trim() : null;
  const factLine = facts || subtitle;
  return (
    <div className="flex min-w-0 flex-col gap-1" data-slot="player-details">
      {(show ?? ["title", "facts", "description", "chapters"]).includes("title") ? <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2> : null}
      {(show ?? ["title", "facts", "description", "chapters"]).includes("facts") && factLine ? <p className="truncate whitespace-nowrap text-sm text-muted-foreground">{factLine}</p> : null}
      {(show ?? ["title", "facts", "description", "chapters"]).includes("description") && detail ? (
        <div>
          <p className={expanded ? "text-base text-muted-foreground" : "line-clamp-2 text-base text-muted-foreground"}>{detail}</p>
          <Button type="button" variant="link" height="auto" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? i18n._({ id: "ui.Show less", message: "Show less" }) : i18n._({ id: "ui.Show more", message: "Show more" })}</Button>
          {expanded && (show ?? ["title", "facts", "description", "chapters"]).includes("chapters") && chapters?.length ? (
            <div className="flex flex-col" aria-label={i18n._({ id: "ui.Chapters", message: "Chapters" })}>
              {chapters.map((chapter) => <Button key={`${chapter.start_s}-${chapter.title}`} type="button" variant="ghost" size="sm" className="justify-start" onClick={() => seek(chapter.start_s)}>{formatTime(chapter.start_s)} {chapter.title}</Button>)}
            </div>
          ) : null}
        </div>
      ) : null}
      {transcript ? <TranscriptButton transcript={transcript} seek={seek} /> : null}
      {(show ?? ["title", "facts", "description", "chapters"]).includes("chapters") && !detail && chapters?.length ? <div className="flex flex-col" aria-label={i18n._({ id: "ui.Chapters", message: "Chapters" })}>{chapters.map((chapter) => <Button key={`${chapter.start_s}-${chapter.title}`} type="button" variant="ghost" size="sm" className="justify-start" onClick={() => seek(chapter.start_s)}>{formatTime(chapter.start_s)} {chapter.title}</Button>)}</div> : null}
    </div>
  );
}

/** MEDIA-POLISH-01: the actions row under the title (Like, Watch later): pill buttons in one row that scrolls sideways
 * on a phone. A button with a `field` is a toggle, pressed while that field of the item is true. */
function PlayerActions({ actions, item, dispatch, wrap, children }: { actions: PlayerActionNode[]; item: Row; dispatch: ReturnType<typeof useDispatchAction>["dispatch"]; wrap?: boolean; children?: ReactNode }) {
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <div className={wrap ? "flex min-w-0 flex-wrap gap-2 pb-1" : "flex min-w-0 items-center gap-2 pb-1"} role="group" aria-label={i18n._({ id: "ui.Actions", message: "Actions" })} data-slot="player-actions">
      {/* The buttons scroll sideways in their own strip; the trailing child (Edit) sits outside it so it is never scrolled away. */}
      <div className={wrap ? "contents" : "flex min-w-0 flex-1 touch-pan-x gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain py-1 [scrollbar-width:none]"} data-slot="player-actions-strip">
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
            disabled={busy !== null && a.busy_label !== undefined && busy === a.label}
            onClick={() => {
              if (a.busy_label) setBusy(a.label);
              dispatch(a.action, [a.field ? { ...item, on: !on } : item], a.busy_label ? () => setBusy(null) : undefined);
            }}
          >
            {Glyph ? <Glyph aria-hidden className={on ? "fill-current" : undefined} /> : null}
            {busy === a.label && a.busy_label ? a.busy_label : on && a.on_label ? a.on_label : a.label}
          </Button>
        );
      })}
      </div>
      {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
    </div>
  );
}

function EditPlayerSheet({ open, onOpenChange, phone, definition, item, values, setValues, error, onSave }: {
  open: boolean; onOpenChange: (open: boolean) => void; phone: boolean; definition: NonNullable<PlayerNode["edit"]>; item: Row;
  values: Record<string, unknown>; setValues: (values: Record<string, unknown>) => void; error: string | null; onSave: () => void;
}) {
  const { dispatch } = useDispatchAction();
  const body = <div className="grid gap-4 p-4">
    {definition.fields.map(field => <div key={field.name} className="grid gap-2">
      <label className="text-sm font-medium" htmlFor={`player-edit-${field.name}`}>{field.label}</label>
      {field.kind === "cover" ? <>
        <FileGrid label={field.label} density="compact" selectionMode items={((readField(item, definition.cover_choices_field ?? "cover_choices") as Array<{file_id:string;url:string;alt?:string}>) ?? []).map(choice => ({ id: choice.file_id, name: choice.alt ?? i18n._({ id: "ui.Cover", message: "Cover" }), kind: "image" as const, thumbnailUrl: choice.url, label: choice.alt ?? i18n._({ id: "ui.Cover", message: "Cover" }) }))} selectedIds={values[field.name] ? [String(values[field.name])] : []} onSelectionChange={ids => setValues({ ...values, [field.name]: ids[0] ?? "" })} />
        {definition.on_upload ? <Dropzone accept="image/*" label={i18n._({ id: "ui.Add a picture", message: "Add a picture" })} onFile={async file => { const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); }); const upload = definition.on_upload!; const action: Action = "call" in upload ? { call: { ...upload.call, args: { ...upload.call.args, file: "{file}" } } } : upload; dispatch(action, [{ ...item, file: { name: file.name, type: file.type, size: file.size, data_url: dataUrl } }], undefined, { typedArgs: true }); }} /> : null}
      </> : field.kind === "textarea" ? <Textarea id={`player-edit-${field.name}`} value={String(values[field.name] ?? "")} onChange={event => setValues({ ...values, [field.name]: event.currentTarget.value })} /> : <Input id={`player-edit-${field.name}`} value={String(values[field.name] ?? "")} onChange={event => setValues({ ...values, [field.name]: event.currentTarget.value })} />}
    </div>)}
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{i18n._({ id: "ui.Cancel", message: "Cancel" })}</Button><Button type="button" onClick={onSave}>{i18n._({ id: "ui.Save", message: "Save" })}</Button></div>
  </div>;
  return phone ? <Drawer open={open} onOpenChange={onOpenChange}><DrawerContent><DrawerHeader><DrawerTitle>{definition.title ?? definition.label}</DrawerTitle></DrawerHeader>{body}</DrawerContent></Drawer> : <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{definition.title ?? definition.label}</DialogTitle></DialogHeader>{body}</DialogContent></Dialog>;
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
      errorLayout="row"
      data={list.data}
      error={list.isError}
      isFetching={list.isFetching}
      onRetry={() => list.refetch()}
      errorMessage={errorMessage}
      isEmpty={(widgets) => widgets.filter((w) => w.size === size).length === 0}
      emptyIcon="sparkles"
      emptyText={i18n._({ id: "ui.Nothing here yet.", message: "Nothing here yet." })}
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
      errorMessage={i18n._({ id: "ui.Could not load today's cards.", message: "Could not load today's cards." })}
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
      errorMessage={i18n._({ id: "ui.Could not load today's rows.", message: "Could not load today's rows." })}
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

/** MEDIA-PARITY-02: one tap action for a device row. The row's own `actions[<command>]` wins over its `action`; the slider or setpoint
 * value joins the row as `value` for the call's `{value}` placeholders. */
function deviceAction(row: Row, command: DeviceCommand) {
  const per = row.actions && typeof row.actions === "object" ? (row.actions as Row)[command] : undefined;
  const parsed = ActionSchema.safeParse(per ?? row.action);
  return parsed.success ? parsed.data : null;
}

function WidgetTilesNodeView({ node, state }: { node: WidgetTilesNode; state: Row }) {
  const list = useBinding<Row[]>(node.bind, state);
  const { dispatch, lastError } = useDispatchAction();
  const onCommand = (row: Row, command: DeviceCommand, value?: number) => {
    const action = deviceAction(row, command);
    if (action) dispatch(action, [value === undefined ? row : { ...row, value }]);
  };
  return (
    <AsyncState
      errorLayout="row"
      data={list.data}
      error={list.isError}
      isFetching={list.isFetching}
      onRetry={() => list.refetch()}
      errorMessage={i18n._({ id: "ui.Could not load these devices.", message: "Could not load these devices." })}
      isEmpty={(rows) => !Array.isArray(rows) || rows.length === 0 || rows.every((r) => r.package !== undefined && r.size !== "tiles")}
      emptyIcon="sparkles"
      emptyText={i18n._({ id: "ui.Nothing here yet.", message: "Nothing here yet." })}
    >
      {(rows) => {
        // A widget list (`size: "tiles"` descriptors, each with its own data) or the device rows themselves.
        const widgets = rows.filter((r) => r.package !== undefined && r.size === "tiles") as unknown as WidgetDescriptor[];
        return (
          <div className="flex min-w-0 flex-col gap-3" data-slot="widget-tiles">
            {widgets.length > 0
              ? widgets.map((widget) => <WidgetTilesInstance key={`${widget.package}/${widget.id}`} widget={widget} onCommand={onCommand} />)
              : <DeviceTiles devices={rows} onCommand={onCommand} />}
            {lastError ? <p role="status" className="text-base text-destructive">{lastError}</p> : null}
          </div>
        );
      }}
    </AsyncState>
  );
}

function WidgetTilesInstance({ widget, onCommand }: { widget: WidgetDescriptor; onCommand: (row: Row, command: DeviceCommand, value?: number) => void }) {
  const data = useWidgetData(widget);
  const devices = (data.data?.items ?? []) as unknown as Row[];
  if (devices.length === 0) return null;
  return <DeviceTiles devices={devices} onCommand={onCommand} label={widget.title} />;
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
  const phone = useIsPhoneLayout();
  const [asideOpen, setAsideOpen] = useState(false);
  const [hasAside, setHasAside] = useState(false);
  const probeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const probe = probeRef.current;
    if (!probe) return;
    const update = () => setHasAside(probe.childElementCount > 0);
    update();
    const observer = new MutationObserver(update);
    observer.observe(probe, { childList: true, subtree: true });
    return () => observer.disconnect();
  });
  if ("main" in node) {
    const aside = node.aside.map((child, i) => <NodeRenderer key={i} node={child} state={state} />);
    if (node.aside_sheet === "phone" && phone) {
      const label = node.aside_label ?? i18n._({ id: "ui.More", message: "More" });
      const ChevronUp = getIcon("chevron-up");
      return <div data-slot="split-view" data-layout="main-aside"><div className="flex min-w-0 flex-col gap-4">{node.main.map((child, i) => <NodeRenderer key={i} node={child} state={state} />)}<div hidden ref={probeRef}>{aside}</div>{hasAside ? <Button type="button" variant="ghost" className="w-full justify-between" onClick={() => setAsideOpen(true)}>{label}<ChevronUp aria-hidden="true" /></Button> : null}<Drawer open={asideOpen} onOpenChange={setAsideOpen}><DrawerContent><DrawerHeader><DrawerTitle>{label}</DrawerTitle></DrawerHeader><div className="overflow-y-auto p-4">{aside}</div></DrawerContent></Drawer></div></div>;
    }
    return (
      <SplitView
        main={node.main.map((child, i) => <NodeRenderer key={i} node={child} state={state} />)}
        aside={aside}
        asideLabel={node.aside_label}
        asideSide={node.aside_side}
        asideWidth={node.aside_width}
        mainSurface={node.main_surface}
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
            aria-label={field.placeholder ?? field.name}
            placeholder={field.placeholder ?? field.name}
            value={String(values[field.name] ?? "")}
            onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
            disabled={submitting}
          />
        );
      })}
      <Button type="submit" disabled={submitting}>
        {submitting ? i18n._({ id: "ui.Working…", message: "Working…" }) : i18n._({ id: "ui.Submit", message: "Submit" })}
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
    case "page": {
      const body = node.body.map((child, i) => <NodeRenderer key={i} node={child} state={state} />);
      // VIDEO-STUDIO-02 (K1b): the studio pane carries the token scope on its own element, so it outranks the selected look. Full bleed on a phone.
      if (node.surface === "studio") {
        return <div data-surface="studio" className="bg-background text-foreground -mx-4 flex min-h-0 flex-1 flex-col gap-4 px-4 py-4 lg:mx-0 lg:rounded-3xl lg:px-6">{body}</div>;
      }
      return <>{body}</>;
    }
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
    case "widget_tiles":
      return <WidgetTilesNodeView node={node} state={state} />;
    case "answer_blocks":
      return <AnswerBlocksNodeView node={node} state={state} />;
    case "picker":
      return <PickerNodeView node={node} state={state} />;
    case "search":
      return <SearchNodeView node={node} state={state} />;
    case "prompt_bar":
      return <PromptBarNodeView node={node} state={state} />;
    case "quick_tiles":
      return <QuickTilesNodeView node={node} state={state} />;
    case "top_result":
      return <TopResultNodeView node={node} state={state} />;
    case "category_tiles":
      return <CategoryTilesNodeView node={node} state={state} />;
    case "track_rows":
      return <TrackRowsNodeView node={node} state={state} />;
    case "result_feed":
      return <ResultFeedNodeView node={node} state={state} />;
    case "clip_feed":
      return <ClipFeedNodeView node={node} state={state} />;
    case "studio":
      return <StudioNodeView node={node} state={state} />;
    case "image_editor":
      return <ImageEditorNodeView node={node} state={state} />;
    case "tabs":
      return <TabsNodeView node={node} state={state} />;
    case "form":
      return <FormNodeView node={node} />;
    case "empty_state":
      return <EmptyStateNodeView node={node} />;
    case "progress":
      return <ProgressNodeView node={node} />;
    case "creation_header":
      return <CreationHeaderNodeView node={node} state={state} />;
    case "message_thread":
      return <ExternallyMountedNodeView label="message_thread" />;
    case "settings_editor":
      return <ExternallyMountedNodeView label="settings_editor" />;
  }
}
