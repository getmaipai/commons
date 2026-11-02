import { useCallback, useContext, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { request } from "@/kit/http";
import { AsyncState } from "@/kit/primitives/AsyncState";
import { EmptyState } from "@/kit/primitives/EmptyState";
import { Button } from "@/kit/ui/button";
import { getIcon } from "@/kit/icons";
import { ResultFeed, feedDayLabel, type ResultFeedEntry, type ResultFeedFilter } from "@/kit/elements/result-feed";
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

  const rows = useFeedPolling({
    rows: query.data ?? EMPTY,
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
    const reasons: Partial<Record<FeedHandlerKey, string>> = {};
    const player: Record<string, unknown> = {
      status,
      prompt: words,
      src,
      poster: f.poster ? str(readField(row, f.poster)) : undefined,
      width: f.width ? num(readField(row, f.width)) : undefined,
      height: f.height ? num(readField(row, f.height)) : undefined,
      progress: f.progress ? num(readField(row, f.progress)) ?? null : undefined,
      phaseLabel: f.phase ? str(readField(row, f.phase)) : undefined,
      queuePosition: f.queue_position ? num(readField(row, f.queue_position)) ?? null : undefined,
      startedAt: f.started_at ? num(readField(row, f.started_at)) : undefined,
      error: f.error ? str(readField(row, f.error)) : undefined,
    };
    // The player's own built-in actions, one prop each (VIDEO-UI-02's names); a handler the page does not declare draws no button.
    const props: Record<FeedHandlerKey, string> = { stop: "onStop", retry: "onRetry", make_another: "onMakeAnother", render: "onRender", another_still: "onAnotherStill", edit_words: "onEditWords", favorite: "onFavorite" };
    for (const key of FEED_HANDLER_KEYS) {
      const handler = node.handlers?.[key];
      if (!handler) continue;
      const reason = notice(handler.starts);
      if (reason) reasons[key] = reason;
      player[props[key]] = () => { if (!reason) dispatch(handlerAction(handler), [row]); };
    }
    if (f.favorite) player.favorite = readField(row, f.favorite) === true;
    if (Object.keys(reasons).length > 0) player.disabledReasons = reasons;
    // K8: one visible line while any action that starts a picture or a video is disabled.
    const anyReason = Object.values(reasons)[0] ?? (node.actions ?? []).map((a) => notice(a.starts)).find(Boolean);
    if (anyReason) player.notice = anyReason;
    if (node.actions_variant === "icons") player.actionsVariant = "icons";
    if (node.actions_inline !== undefined) player.actionsInline = node.actions_inline;
    const extras = (node.actions ?? []).filter((a) => (a.when ?? ["ready"]).includes(status as "ready"));
    if (extras.length > 0) {
      player.actions = extras.map((a, i): ReactNode => {
        const Icon = a.icon ? getIcon(a.icon) : null;
        const reason = notice(a.starts);
        return (
          <Button key={i} type="button" variant="ghost" size="sm" disabled={Boolean(reason)} title={reason} onClick={() => dispatch(a.action, [row])}>
            {Icon ? <Icon aria-hidden /> : null}
            {fillTemplate(a.label, row)}
          </Button>
        );
      });
    }
    return {
      key: keyOf(row),
      words,
      tags: Array.isArray(tagsRaw) ? tagsRaw.filter((t): t is string => typeof t === "string" && t !== "") : undefined,
      references: Array.isArray(refsRaw)
        ? refsRaw.flatMap((r) => (r && typeof r === "object" && str((r as Row).label) ? [{ label: str((r as Row).label)!, thumb: str((r as Row).thumb) }] : []))
        : undefined,
      day: created ? feedDayLabel(created) : undefined,
      player: player as unknown as ResultFeedEntry["player"],
    };
  }

  return (
    <AsyncState data={query.data} error={query.isError} isFetching={query.isFetching} onRetry={() => query.refetch()} errorMessage="Could not load your results." isEmpty={() => false}>
      {() => (
        <>
          <ResultFeed
            entries={rows.map(entryFor)}
            filters={filters}
            grouping={grouping}
            empty={<EmptyState icon={node.empty_state?.icon ?? "film"} text={node.empty_state?.text ?? "Nothing here yet."} />}
          />
          {lastError ? <p role="alert" className="text-destructive text-sm">{lastError}</p> : null}
        </>
      )}
    </AsyncState>
  );
}

const EMPTY: Row[] = [];
