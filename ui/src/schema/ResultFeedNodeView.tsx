import { useCallback, useContext, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { request } from "@/kit/http";
import { i18n } from "@/kit/i18n";
import { AsyncState } from "@/kit/primitives/AsyncState";
import { EmptyState } from "@/kit/primitives/EmptyState";
import { type VideoPlayerProps, type VideoPlayerAction, type VideoPlayerControl, type VideoPlayerControlName, type VideoPlayerStatus } from "@/kit/elements/video-player";
import { ResultFeed, feedDayLabel, type ResultFeedEntry, type ResultFeedFilter, type ResultFeedLockedEntry } from "@/kit/elements/result-feed";
import { collapseLocked } from "@/kit/elements/adult-lock";
import { useBinding } from "@/kit/schema/binding";
import { useDispatchAction } from "@/kit/schema/actions";
import { fillTemplate, fillTemplateDeep, readField } from "@/kit/schema/fieldPath";
import { useFeedPolling } from "@/kit/schema/feedPolling";
import { MediaHostContext, type MediaHost } from "@/kit/schema/mediaHost";
import { PackageScopeContext, PageStateContext } from "@/kit/schema/packageScope";
import { FEED_HANDLER_KEYS, type Action, type FeedHandler, type FeedHandlerKey, type ResultFeedNode } from "@/kit/schema/types";

type Row = Record<string, unknown>;
type Starts = "picture" | "video";

/** K8: the host's one notice while pictures or video are not ready (`MediaHost.makingNotice`, fed by Home's
 * `useMakingAvailability`). Read through a local type until the shared `MediaHost` declares it. */
type HostWithNotice = MediaHost & { makingNotice?(kind: Starts): string | null | undefined };

const CONTROL_NAME: Record<FeedHandlerKey, VideoPlayerControlName> = {
  stop: "stop", retry: "retry", make_another: "makeAnother", render: "render", another_still: "anotherStill", edit_words: "editWords", favorite: "favorite",
};

const KNOWN = ["queued", "generating", "draft", "ready", "failed", "cancelled"] as const;

const str = (v: unknown): string | undefined => (typeof v === "string" && v !== "" ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined);

function toDate(v: unknown): Date | null {
  const n = typeof v === "number" ? v : typeof v === "string" && /^\d{10,}$/.test(v) ? Number(v) : undefined;
  const d = n !== undefined ? new Date(n) : typeof v === "string" ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

function handlerAction(handler: FeedHandler): Action {
  const action: Record<string, unknown> = { ...handler };
  delete action.starts;
  return action as Action;
}

/** VIDEO-UI-04 (K9, K10): `result_feed`. Rows come from the bound data call; the running ones are kept current by `poll_while`
 * (feedPolling.ts). The player's own built-in actions are mapped from `handlers`; `starts` ones are disabled with the host's notice. */
export function ResultFeedNodeView({ node, state }: { node: ResultFeedNode; state: Row }) {
  const writer = useContext(PageStateContext);
  const scope = useContext(PackageScopeContext);
  const host = useContext(MediaHostContext) as HostWithNotice | null;
  const queryClient = useQueryClient();
  const query = useBinding<Row[]>(node.bind, state);
  const { dispatch, lastError } = useDispatchAction();
  const f = node.fields;
  const keyField = f.key ?? "id";
  const keyOf = useCallback((row: Row) => String(readField(row, keyField)), [keyField]);
  const statusOf = useCallback((row: Row) => String(readField(row, f.status) ?? ""), [f.status]);

  const record = node.poll_while.record;
  const readRecord = useCallback(
    async (row: Row): Promise<Row | null> => {
      if (!scope) return null;
      const body = record.params ? fillTemplateDeep(record.params, row, true) : {};
      const reply = await request<unknown>(`/api/plugins/${scope.packageId}/data/${record.path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const rows = Array.isArray(reply) ? reply : [reply];
      const key = keyOf(row);
      const found = rows.find((r): r is Row => typeof r === "object" && r !== null && keyOf(r as Row) === key);
      return found ?? null;
    },
    [scope, record, keyOf],
  );

  // ADULT-LOCK-01: a locked row is `{ locked: true, making? }`; it is set aside before any other field is read, polled or drawn.
  const lockedField = f.locked ?? "locked";
  const makingField = f.making ?? "making";
  const { open: openRows, hasLocked, making: lockedMaking } = useMemo(
    () => collapseLocked(query.data ?? EMPTY, (row) => readField(row, lockedField) === true, (row) => readField(row, makingField) === true),
    [query.data, lockedField, makingField],
  );

  const rows = useFeedPolling({
    rows: openRows,
    keyOf,
    statusOf,
    runningStatuses: node.poll_while.statuses,
    readRecord,
    // A job that finished changes the list itself (a favorite, a new still): refresh it once.
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ["schema-binding"] }),
  });

  const filters: ResultFeedFilter[] = (node.filters ?? []).map((filter) =>
    filter.kind === "toggle"
      ? { kind: "toggle", id: filter.state, label: filter.label, value: state[filter.state] === true, onValueChange: (next) => writer?.merge({ [filter.state]: next }) }
      : {
          kind: "select",
          id: filter.state,
          label: filter.label,
          options: filter.options ?? [],
          value: String(state[filter.state] ?? filter.options?.[0]?.value ?? ""),
          onValueChange: (next) => writer?.merge({ [filter.state]: next }),
        },
  );
  const groupToggle = (node.filters ?? []).find((filter) => filter.kind === "toggle" && filter.group);
  const grouping = groupToggle && state[groupToggle.state] === true ? "words" : f.created_at ? "day" : "none";

  function notice(starts: Starts | undefined): string | undefined {
    return starts ? host?.makingNotice?.(starts) ?? undefined : undefined;
  }

  function entryFor(row: Row): ResultFeedEntry {
    const raw = statusOf(row);
    const src = f.src ? str(readField(row, f.src)) : undefined;
    const status = (KNOWN as readonly string[]).includes(raw) ? raw : src ? "ready" : "generating";
    const words = String(readField(row, f.words) ?? "");
    const created = f.created_at ? toDate(readField(row, f.created_at)) : null;
    const tagsRaw = f.tags ? readField(row, f.tags) : undefined;
    const refsRaw = f.references ? readField(row, f.references) : undefined;
    const player: Partial<VideoPlayerProps> = {
      status: status as VideoPlayerStatus,
      prompt: words,
      src,
      poster: f.poster ? str(readField(row, f.poster)) : undefined,
      // A feed entry uses the pane (design K10), not the Element's 576 px default.
      size: "lg",
      width: f.width ? num(readField(row, f.width)) : undefined,
      height: f.height ? num(readField(row, f.height)) : undefined,
      progress: f.progress ? num(readField(row, f.progress)) ?? null : undefined,
      phaseLabel: f.phase ? str(readField(row, f.phase)) : undefined,
      queuePosition: f.queue_position ? num(readField(row, f.queue_position)) ?? null : undefined,
      startedAt: f.started_at ? num(readField(row, f.started_at)) : undefined,
      error: f.error ? str(readField(row, f.error)) : undefined,
    };
    // The player's own built-in actions: a handler the page does not declare draws no button. K8: `controls.<name>.disabledReason`
    // disables the button and `starts` marks it for the host.
    const controls: Partial<Record<VideoPlayerControlName, VideoPlayerControl>> = {};
    const call = (key: FeedHandlerKey) => { const h = node.handlers?.[key]; return h ? () => dispatch(handlerAction(h), [row]) : undefined; };
    for (const key of FEED_HANDLER_KEYS) {
      const handler = node.handlers?.[key];
      if (!handler) continue;
      controls[CONTROL_NAME[key]] = { starts: handler.starts, disabledReason: notice(handler.starts) };
    }
    player.onStop = call("stop");
    player.onRetry = call("retry");
    player.onMakeAnother = call("make_another");
    player.onRender = call("render");
    player.onAnotherStill = call("another_still");
    player.onEditWords = call("edit_words");
    const favorite = call("favorite");
    if (favorite) player.onFavorite = favorite;
    if (f.favorite) player.favorite = readField(row, f.favorite) === true;
    // Keep each control's host default `starts` unless the handler names one.
    for (const key of Object.keys(controls) as VideoPlayerControlName[]) if (controls[key]!.starts === undefined) delete controls[key]!.starts;
    if (Object.keys(controls).length > 0) player.controls = controls;
    // K8: one visible line while any action that starts a picture or a video is disabled.
    const anyReason = Object.values(controls).map((c) => c.disabledReason).find(Boolean) ?? (node.actions ?? []).map((a) => notice(a.starts)).find(Boolean);
    if (anyReason) player.notice = anyReason;
    if (node.actions_variant === "icons") player.actionsVariant = "icons";
    if (node.actions_inline !== undefined) player.actionsInline = node.actions_inline;
    const items = node.actions ?? [];
    if (items.length > 0) {
      player.actionItems = items.map((a, i): VideoPlayerAction => ({
        key: `action-${i}`,
        label: fillTemplate(a.label, row),
        icon: a.icon,
        when: a.when,
        starts: a.starts,
        disabledReason: notice(a.starts),
        onSelect: () => dispatch(a.action, [row]),
      }));
    }
    return {
      key: keyOf(row),
      words,
      tags: Array.isArray(tagsRaw) ? tagsRaw.filter((t): t is string => typeof t === "string" && t !== "") : undefined,
      references: Array.isArray(refsRaw)
        ? refsRaw.flatMap((r) => (r && typeof r === "object" && str((r as Row).label) ? [{ label: str((r as Row).label)!, thumb: str((r as Row).thumb) }] : []))
        : undefined,
      day: created ? feedDayLabel(created) : undefined,
      player: player as ResultFeedEntry["player"],
    };
  }

  return (
    <AsyncState data={query.data} error={query.isError} isFetching={query.isFetching} onRetry={() => query.refetch()} errorMessage={i18n._({ id: "ui.Could not load your results.", message: "Could not load your results." })} isEmpty={() => false}>
      {() => (
        <>
          <ResultFeed
            entries={hasLocked ? [...rows.map(entryFor), { key: "locked", locked: true, making: lockedMaking } satisfies ResultFeedLockedEntry] : rows.map(entryFor)}
            filters={filters}
            grouping={grouping}
            look={node.look}
            filtersPresentation={node.filters_presentation}
            headingStyle={node.heading_style}
            empty={<EmptyState icon={node.empty_state?.icon ?? "film"} text={node.empty_state?.text ?? i18n._({ id: "ui.Nothing here yet.", message: "Nothing here yet." })} />}
          />
          {lastError ? <p role="alert" className="text-destructive text-sm">{lastError}</p> : null}
        </>
      )}
    </AsyncState>
  );
}

const EMPTY: Row[] = [];
