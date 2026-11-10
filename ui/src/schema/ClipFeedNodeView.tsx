import { useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { i18n } from "@/kit/i18n";
import { AsyncState } from "@/kit/primitives/AsyncState";
import { EmptyState } from "@/kit/primitives/EmptyState";
import { ClipFeed, type ClipFeedClip } from "@/kit/elements/clip-feed";
import { useBinding } from "@/kit/schema/binding";
import { useDispatchAction } from "@/kit/schema/actions";
import { readField } from "@/kit/schema/fieldPath";
import { localPicture } from "@/kit/schema/mediaPath";
import { MediaHostContext, type MediaHost } from "@/kit/schema/mediaHost";
import type { Action, ClipFeedNode, FeedHandler } from "@/kit/schema/types";

type Row = Record<string, unknown>;

/** The host's one notice while video is not ready (`MediaHost.makingNotice`, fed by Home's `useMakingAvailability`). */
type HostWithNotice = MediaHost & { makingNotice?(kind: "picture" | "video"): string | null | undefined };

/** The empty state's button words: the page's `action_label`, else a plain word for the kind of action (the same fallback the `empty_state` node uses). */
function emptyActionLabel(node: ClipFeedNode["empty_state"]): string | undefined {
  const action = node.action;
  if (!action) return undefined;
  if (node.action_label) return node.action_label;
  if ("navigate" in action) return i18n._({ id: "ui.Go", message: "Go" });
  if ("call" in action || "confirm" in action || "ask" in action) return i18n._({ id: "ui.Continue", message: "Continue" });
  return i18n._({ id: "ui.Play", message: "Play" });
}

const str = (v: unknown): string | undefined => (typeof v === "string" && v !== "" ? v : undefined);
const EMPTY: Row[] = [];

function handlerAction(handler: FeedHandler): Action {
  const action: Record<string, unknown> = { ...handler };
  delete action.starts;
  return action as Action;
}

/** CLIPS-FEED-01: `clip_feed`. Rows come from the bound package data call; the node maps them to the kit `ClipFeed`. */
export function ClipFeedNodeView({ node, state }: { node: ClipFeedNode; state: Row }) {
  const host = useContext(MediaHostContext) as HostWithNotice | null;
  const navigate = useNavigate();
  const query = useBinding<Row[]>(node.bind, state);
  const { dispatch, lastError } = useDispatchAction();
  const f = node.item_fields;
  const rows = Array.isArray(query.data) ? query.data : EMPTY;
  const clips = useMemo(
    () =>
      rows.flatMap((row): ClipFeedClip[] => {
        const src = localPicture(readField(row, f.src));
        const id = readField(row, f.id);
        // A row without a playable same-origin file or an id is skipped, never drawn half-empty.
        if (src === null || (typeof id !== "string" && typeof id !== "number")) return [];
        const duration = Number(readField(row, f.duration_s));
        return [{
          id: String(id),
          src,
          poster: localPicture(readField(row, f.poster)) ?? "",
          title: String(readField(row, f.title) ?? ""),
          subtitle: f.subtitle ? str(readField(row, f.subtitle)) : undefined,
          durationS: Number.isFinite(duration) && duration > 0 ? duration : 0,
          liked: f.liked ? readField(row, f.liked) === true : undefined,
        }];
      }),
    [rows, f],
  );
  const rowOf = (clip: ClipFeedClip): Row => rows.find((row) => String(readField(row, f.id)) === clip.id) ?? { id: clip.id };

  // The data call can turn autoplay off per person (a child band); the node's own switch turns it off for the page.
  const first = rows[0];
  const fieldSaysNo = node.autoplay_field && first ? readField(first, node.autoplay_field) === false : false;
  const autoplay = node.autoplay !== false && !fieldSaysNo;

  const like = node.actions?.like;
  const remake = node.actions?.remake;
  const notice = remake ? host?.makingNotice?.(remake.starts ?? "video") ?? undefined : undefined;

  return (
    <AsyncState
      data={query.data}
      error={query.isError}
      isFetching={query.isFetching}
      onRetry={() => query.refetch()}
      errorMessage={i18n._({ id: "ui.Could not load your clips.", message: "Could not load your clips." })}
      isEmpty={() => false}
    >
      {() => (
        <>
          <ClipFeed
            clips={clips}
            startId={node.start_id}
            autoplay={autoplay}
            onClose={() => (node.on_close ? dispatch(node.on_close) : navigate(-1))}
            onLike={like ? (clip, liked) => dispatch(handlerAction(like), [{ ...rowOf(clip), liked }], undefined, { quiet: true, typedArgs: true }) : undefined}
            onRemake={remake ? (clip) => dispatch(handlerAction(remake), [rowOf(clip)]) : undefined}
            remakeNotice={notice}
            empty={<EmptyState icon={node.empty_state.icon} text={node.empty_state.text} actionLabel={emptyActionLabel(node.empty_state)} onAction={node.empty_state.action ? () => dispatch(node.empty_state.action!) : undefined} />}
          />
          {lastError ? <p role="alert" className="text-destructive px-4 text-sm">{lastError}</p> : null}
        </>
      )}
    </AsyncState>
  );
}
