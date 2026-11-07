import { useCallback, useContext, useMemo, useState } from "react";
import { request } from "@/kit/http";
import { i18n } from "@/kit/i18n";
import { AsyncState } from "@/kit/primitives/AsyncState";
import { VideoPlayer, type VideoPlayerAction, type VideoPlayerProps, type VideoPlayerStatus } from "@/kit/elements/video-player";
import { LockTile } from "@/kit/elements/adult-lock";
import { TrackStudio, type StudioAdded, type StudioMakeMore, type StudioPlan } from "@/kit/elements/track-studio";
import { useBinding } from "@/kit/schema/binding";
import { useDispatchAction } from "@/kit/schema/actions";
import { fillTemplateDeep, readField } from "@/kit/schema/fieldPath";
import { useFeedPolling } from "@/kit/schema/feedPolling";
import { MediaHostContext, type MediaHost } from "@/kit/schema/mediaHost";
import { PackageScopeContext, PageStateContext } from "@/kit/schema/packageScope";
import type { Action, FeedHandler, StudioNode } from "@/kit/schema/types";

type Row = Record<string, unknown>;
type HostWithNotice = MediaHost & { makingNotice?(kind: "picture" | "video"): string | null | undefined };

const str = (v: unknown): string | undefined => (typeof v === "string" && v !== "" ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined);
const KNOWN = ["queued", "generating", "draft", "ready", "failed", "cancelled"] as const;

function handlerAction(handler: FeedHandler): Action {
  const action: Record<string, unknown> = { ...handler };
  delete action.starts;
  return action as Action;
}

/** The page-state key the export call's reply `id` is written to, so `export_result.bind.params` can read `$state.export_id`. */
export const EXPORT_STATE_KEY = "export_id";

/** VIDEO-STUDIO-04 and -05 (K3): `studio`. Reads one clip row, hands the Element its lanes, and maps `handlers`, `make_more` and `export_result`.
 * A row whose `locked` path is true is set aside before anything else is read: one lock tile, no lanes, no request. */
export function StudioNodeView({ node, state }: { node: StudioNode; state: Row }) {
  const query = useBinding<Row | Row[]>(node.bind, state);
  const row = Array.isArray(query.data) ? query.data[0] : query.data;
  return (
    <AsyncState data={query.data} error={query.isError} isFetching={query.isFetching} onRetry={() => query.refetch()} errorMessage={i18n._({ id: "ui.Could not open this clip.", message: "Could not open this clip." })} isEmpty={() => !row} emptyIcon="film" emptyText={i18n._({ id: "ui.Pick a clip to open it in the Studio.", message: "Pick a clip to open it in the Studio." })}>
      {() => (row ? <StudioRow node={node} state={state} row={row} /> : null)}
    </AsyncState>
  );
}

function StudioRow({ node, state, row }: { node: StudioNode; state: Row; row: Row }) {
  const f = node.fields ?? {};
  const locked = readField(row, f.locked ?? "locked") === true;
  // A locked clip: ONE tile and nothing else is read (not the title, the poster or a single lane).
  if (locked) return <TrackStudio locked lockedMaking={readField(row, "making") === true} lanes={[]} />;
  return <StudioOpen node={node} state={state} row={row} />;
}

function StudioOpen({ node, state, row }: { node: StudioNode; state: Row; row: Row }) {
  const f = node.fields ?? {};
  const host = useContext(MediaHostContext) as HostWithNotice | null;
  const writer = useContext(PageStateContext);
  const { dispatch, lastError } = useDispatchAction();
  const key = String(readField(row, f.key ?? "id") ?? "clip");
  const title = str(readField(row, f.title ?? "title"));
  const poster = str(readField(row, f.poster ?? "poster"));
  const lanes = readField(row, f.lanes ?? "lanes");
  const [exportOpen, setExportOpen] = useState(false);

  const exportAction = node.handlers?.export;
  const addAction = node.handlers?.add;

  const onExport = useCallback(
    (plan: StudioPlan) => {
      if (!exportAction) return;
      setExportOpen(true);
      dispatch(handlerAction(exportAction), [{ clip: key, plan }], undefined, {
        typedArgs: true,
        onReply: (reply) => {
          const id = reply && typeof reply === "object" ? (reply as Row).id : undefined;
          if (typeof id === "string" || typeof id === "number") writer?.merge({ [EXPORT_STATE_KEY]: String(id) });
        },
        onError: () => setExportOpen(false),
      });
    },
    [exportAction, dispatch, key, writer, setExportOpen],
  );

  const onAdd = useMemo(() => {
    if (!addAction) return undefined;
    return async (kind: "clip" | "voice" | "music"): Promise<StudioAdded | null> => {
      // The host's picker (the Library) names the file; without one the add call chooses for itself.
      const picked = host?.pickMedia ? await host.pickMedia(kind === "clip" ? "video" : "audio") : undefined;
      if (host?.pickMedia && !picked) return null;
      return new Promise<StudioAdded | null>((resolve, reject) => {
        dispatch(handlerAction(addAction), [{ clip: key, kind, ref: picked?.id ?? "" }], undefined, {
          typedArgs: true,
          onReply: (reply) => {
            const r = reply && typeof reply === "object" ? (reply as Row) : {};
            const src = str(r.src);
            const duration = num(r.duration_s);
            if (!src || duration === undefined) { reject(new Error(i18n._({ id: "ui.That could not be added. Try again.", message: "That could not be added. Try again." }))); return; }
            resolve({ ref: String(r.ref ?? picked?.id ?? kind), src, label: str(r.label), duration_s: duration, poster: str(r.poster) });
          },
          onError: (message) => reject(new Error(message)),
        });
      });
    };
  }, [addAction, host, dispatch, key]);

  const makeMore: StudioMakeMore[] = (node.make_more ?? []).map((m, i) => ({
    key: `more-${i}`,
    label: m.label,
    badge: m.badge,
    disabledReason: m.starts ? host?.makingNotice?.(m.starts) ?? undefined : undefined,
    onSelect: ({ piece, at_s }) => dispatch(m.action, [{ clip: key, piece: piece?.ref ?? "", at_s }]),
  }));

  return (
    <>
      <TrackStudio
        resetKey={key}
        title={title}
        poster={poster}
        kind={node.kind}
        lanes={lanes}
        tools={node.tools}
        toolReasons={node.tool_reasons}
        panels={node.panels}
        limits={node.limits}
        levelSteps={node.level_steps}
        exportLabel={node.export_label}
        exportDisabledReason={node.export_disabled_reason}
        onExport={exportAction ? onExport : undefined}
        onAdd={onAdd}
        makeMore={makeMore}
        exportCard={exportOpen && node.export_result ? <ExportCard result={node.export_result} state={state} /> : undefined}
        onKeepEditing={() => setExportOpen(false)}
      />
      {lastError ? <p role="alert" className="text-destructive text-sm">{lastError}</p> : null}
    </>
  );
}

/** The export job's own card: a bound row drawn by the shipped `VideoPlayer`, polled while it is queued or generating. */
function ExportCard({ result, state }: { result: NonNullable<StudioNode["export_result"]>; state: Row }) {
  const scope = useContext(PackageScopeContext);
  const { dispatch } = useDispatchAction();
  const query = useBinding<Row | Row[]>(result.bind, state);
  const f = result.fields;
  const keyField = f.key ?? "id";
  const rows = useMemo<Row[]>(() => (Array.isArray(query.data) ? query.data : query.data ? [query.data] : []), [query.data]);
  const keyOf = useCallback((r: Row) => String(readField(r, keyField)), [keyField]);
  const statusOf = useCallback((r: Row) => String(readField(r, f.status) ?? ""), [f.status]);
  const record = result.poll_while.record;
  const readRecord = useCallback(
    async (r: Row): Promise<Row | null> => {
      if (!scope) return null;
      const body = record.params ? fillTemplateDeep(record.params, r, true) : {};
      const reply = await request<unknown>(`/api/plugins/${scope.packageId}/data/${record.path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const list = Array.isArray(reply) ? reply : [reply];
      return (list.find((x): x is Row => typeof x === "object" && x !== null && keyOf(x as Row) === keyOf(r)) as Row | undefined) ?? null;
    },
    [scope, record, keyOf],
  );
  const polled = useFeedPolling({ rows, keyOf, statusOf, runningStatuses: result.poll_while.statuses, readRecord });
  const row = polled[0];
  if (!row) return <p className="text-muted-foreground p-3 text-sm">{i18n._({ id: "ui.Starting the export.", message: "Starting the export." })}</p>;
  if (f.locked && readField(row, f.locked) === true) return <LockTile making={f.making ? readField(row, f.making) === true : false} shape="card" />;
  const raw = statusOf(row);
  const src = f.src ? str(readField(row, f.src)) : undefined;
  const status = (KNOWN as readonly string[]).includes(raw) ? raw : src ? "ready" : "generating";
  const player: Partial<VideoPlayerProps> = {
    status: status as VideoPlayerStatus,
    prompt: f.words ? String(readField(row, f.words) ?? "") : "",
    src,
    poster: f.poster ? str(readField(row, f.poster)) : undefined,
    size: "lg",
    progress: f.progress ? num(readField(row, f.progress)) ?? null : undefined,
    phaseLabel: f.phase ? str(readField(row, f.phase)) : undefined,
    queuePosition: f.queue_position ? num(readField(row, f.queue_position)) ?? null : undefined,
    startedAt: f.started_at ? num(readField(row, f.started_at)) : undefined,
    error: f.error ? str(readField(row, f.error)) : undefined,
    caption: false,
  };
  if (result.handlers?.stop) player.onStop = () => dispatch(handlerAction(result.handlers!.stop!), [row]);
  if (result.handlers?.retry) player.onRetry = () => dispatch(handlerAction(result.handlers!.retry!), [row]);
  if (result.actions && result.actions.length > 0) {
    player.actionItems = result.actions.map((a, i): VideoPlayerAction => ({ key: `export-action-${i}`, label: a.label, when: ["ready"], onSelect: () => dispatch(a.action, [row]) }));
  }
  return <VideoPlayer {...(player as VideoPlayerProps)} />;
}
