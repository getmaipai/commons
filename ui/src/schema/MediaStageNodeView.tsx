import { useContext, type ReactNode } from "react";
import { AsyncState } from "@/kit/primitives/AsyncState";
import { MediaStage, MediaStageProgress, type MediaStagePill, type MediaStageState } from "@/kit/elements/media-stage";
import { Button } from "@/kit/ui/button";
import { getIcon } from "@/kit/icons";
import { i18n } from "@/kit/i18n";
import { ConfirmDialog } from "@/kit/schema/ConfirmDialog";
import { useBinding } from "@/kit/schema/binding";
import { usePollWhile } from "@/kit/schema/usePollWhile";
import { useDispatchAction } from "@/kit/schema/actions";
import { readField } from "@/kit/schema/fieldPath";
import { localPicture } from "@/kit/schema/mediaPath";
import { MediaHostContext, type MediaHost } from "@/kit/schema/mediaHost";
import type { MediaStageNode, UiNode } from "@/kit/schema/types";

type Row = Record<string, unknown>;

const STATES: readonly string[] = ["idle", "looping", "paused", "loading", "waiting", "error"];
type Starts = "video" | "picture";
type HostWithNotice = MediaHost & { makingNotice?(kind: Starts): string | null | undefined };
const str = (v: unknown): string | undefined => (typeof v === "string" && v !== "" ? v : undefined);

/** UI-BLOCKS-01: `media_stage`. The first row of `bind` is the stage. `children` (the page's own nodes, the composer) are drawn by
 * `renderChild`, the same renderer every container node uses (NodeRenderer passes it in, so this file never imports it back). */
export function MediaStageNodeView({ node, state, renderChild }: { node: MediaStageNode; state: Row; renderChild: (child: UiNode, index: number) => ReactNode }) {
  const query = useBinding<Row[]>(node.bind, state);
  const { dispatch, pendingConfirm, lastError } = useDispatchAction();
  const host = useContext(MediaHostContext) as HostWithNotice | null;
  const row = Array.isArray(query.data) ? query.data[0] : undefined;
  const polling = Boolean(node.poll_while && row && node.poll_while.values.includes(String(readField(row, node.poll_while.field) ?? "")));
  usePollWhile(polling, query.refetch);
  const text = (path: string | undefined): string | undefined => (row && path ? str(readField(row, path)) : undefined);
  const composer = node.children && node.children.length > 0 ? node.children.map(renderChild) : undefined;
  const loading = query.data === undefined;

  const rowState = row ? readField(row, node.state) : undefined;
  const stage: MediaStageState = loading ? "loading" : typeof rowState === "string" && STATES.includes(rowState) ? (rowState as MediaStageState) : "idle";
  const description = text(node.description) ?? (loading ? i18n._({ id: "ui.Loading", message: "Loading" }) : "");
  const title = text(node.title);
  const progress = row && node.progress ? readField(row, node.progress) : undefined;

  const notice = (starts: Starts | undefined) => starts ? host?.makingNotice?.(starts) ?? undefined : undefined;
  const pills: MediaStagePill[] | undefined = row ? node.pills?.map((pill, i) => { const reason = notice(pill.starts); return { id: String(i), label: pill.label, icon: pill.icon, starts: pill.starts, states: pill.states, disabledReason: reason, disabled: Boolean(reason), onSelect: () => dispatch(pill.action, [row]) }; }) : undefined;
  const errorActions = row && node.error_actions && node.error_actions.length > 0 ? (
    <>
      {node.error_actions.map((button, i) => {
        const Icon = button.icon ? getIcon(button.icon) : null;
        const reason = notice(button.starts);
        return (
          <Button key={i} type="button" variant={i === 0 ? "default" : "outline"} className="min-h-12" disabled={Boolean(reason)} title={reason} onClick={() => dispatch(button.action, [row])}>
            {Icon ? <Icon aria-hidden className="size-4" /> : null}
            {button.label}
          </Button>
        );
      })}
    </>
  ) : undefined;

  const waitingActions = row && node.waiting_actions && node.waiting_actions.length > 0 ? (
    <>
      {node.waiting_actions.map((button, i) => {
        const Icon = button.icon ? getIcon(button.icon) : null;
        return (
          <Button key={i} type="button" variant="outline" className="min-h-12" onClick={() => dispatch(button.action, [row])}>
            {Icon ? <Icon aria-hidden className="size-4" /> : null}
            {button.label}
          </Button>
        );
      })}
    </>
  ) : undefined;

  // The stage draws its own loading state; only a failed first answer gives way to the kit's retry line.
  if (query.data === undefined && query.isError) {
    return <AsyncState data={null} error isFetching={query.isFetching} onRetry={() => query.refetch()} errorLayout="row">{() => null}</AsyncState>;
  }
  return (
    <>
      <MediaStage
        size={node.size}
        scrim={node.scrim}
        compact={node.compact === true}
        ready={!loading}
        state={stage}
        aspect={node.aspect}
        description={description}
        media={{
          still: localPicture(row ? readField(row, node.media.still) : undefined) ?? undefined,
          loop: node.media.loop && row ? localPicture(readField(row, node.media.loop)) ?? undefined : undefined,
          position: text(node.media.position),
        }}
        eyebrow={text(node.eyebrow)}
        title={title}
        subtitle={text(node.subtitle)}
        titlePill={text(node.title_pill)}
        pills={pills}
        overlay={typeof progress === "number" && Number.isFinite(progress) ? <MediaStageProgress value={progress} label={title ?? description} /> : undefined}
        errorMessage={text(node.error_message)}
        errorActions={errorActions}
        waitingActions={waitingActions}
      >
        {composer}
      </MediaStage>
      {lastError ? <p role="alert" className="text-destructive px-4 text-sm">{lastError}</p> : null}
      {pendingConfirm ? <ConfirmDialog pendingConfirm={pendingConfirm} /> : null}
    </>
  );
}
