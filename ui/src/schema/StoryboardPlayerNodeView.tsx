import { useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { AsyncState } from "@/kit/primitives/AsyncState";
import { EmptyState } from "@/kit/primitives/EmptyState";
import { StoryboardPlayer, type StoryboardShot, type StoryboardShotStatus } from "@/kit/elements/storyboard-player";
import { useBinding } from "@/kit/schema/binding";
import { useDispatchAction } from "@/kit/schema/actions";
import { readField } from "@/kit/schema/fieldPath";
import { localPicture } from "@/kit/schema/mediaPath";
import { PageStateContext } from "@/kit/schema/packageScope";
import { ConfirmDialog } from "@/kit/schema/ConfirmDialog";
import { emptyActionLabel } from "@/kit/schema/ClipFeedNodeView";
import type { StoryboardPlayerNode } from "@/kit/schema/types";

type Row = Record<string, unknown>;

const EMPTY: Row[] = [];
const STATUSES: readonly string[] = ["ready", "no_picture", "changing"];

const str = (v: unknown): string | undefined => (typeof v === "string" && v !== "" ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** One row to one shot, or nothing: a row with no id is skipped, never drawn half-empty. Pictures, clips and voices load only from this origin. */
function shotOf(row: Row, f: StoryboardPlayerNode["item_fields"]): StoryboardShot | null {
  const id = readField(row, f.shot_id);
  if ((typeof id !== "string" || id === "") && typeof id !== "number") return null;
  const still = localPicture(readField(row, f.still)) ?? undefined;
  const raw = readField(row, f.status);
  const status = (typeof raw === "string" && STATUSES.includes(raw) ? raw : still ? "ready" : "no_picture") as StoryboardShotStatus;
  const speaker = f.line_speaker ? str(readField(row, f.line_speaker)) : undefined;
  const words = f.line_text ? str(readField(row, f.line_text)) : undefined;
  const wave = f.line_wave ? readField(row, f.line_wave) : undefined;
  const readingIndex = f.reading_index ? num(readField(row, f.reading_index)) : undefined;
  const readingCount = f.reading_count ? num(readField(row, f.reading_count)) : undefined;
  return {
    id: String(id),
    caption: String(readField(row, f.caption) ?? ""),
    durationSec: num(readField(row, f.duration_sec)) ?? 0,
    still,
    clip: f.clip ? localPicture(readField(row, f.clip)) ?? undefined : undefined,
    status,
    framing: f.framing ? str(readField(row, f.framing)) : undefined,
    place: f.place ? str(readField(row, f.place)) : undefined,
    roomSound: f.room_sound ? str(readField(row, f.room_sound)) : undefined,
    changedBy: f.changed_by ? str(readField(row, f.changed_by)) : undefined,
    reading: readingIndex !== undefined && readingCount !== undefined ? { index: readingIndex, count: readingCount } : undefined,
    line: speaker && words
      ? {
          speaker,
          text: words,
          startSec: f.line_start_sec ? num(readField(row, f.line_start_sec)) : undefined,
          audioSrc: f.line_audio ? localPicture(readField(row, f.line_audio)) ?? undefined : undefined,
          wave: Array.isArray(wave) ? wave.filter((n): n is number => typeof n === "number" && Number.isFinite(n)) : undefined,
        }
      : undefined,
  };
}

/** UI-BLOCKS-01: `storyboard_player`. One row per shot from the bound package data call, mapped through `item_fields` to the kit `StoryboardPlayer`.
 * The page-state name `selected` is written, and `on_select` fires, only when the person picks a shot (a press, a key or a drag on the
 * player), never when playback moves on by itself (a write per shot would also send the page back to the top, SchemaPage's rule for a choice). */
export function StoryboardPlayerNodeView({ node, state }: { node: StoryboardPlayerNode; state: Row }) {
  const writer = useContext(PageStateContext);
  const query = useBinding<Row[]>(node.bind, state);
  const { dispatch, pendingConfirm, lastError } = useDispatchAction();
  const f = node.item_fields;
  const rows = Array.isArray(query.data) ? query.data : EMPTY;
  const shots = useMemo(() => rows.flatMap((row) => { const shot = shotOf(row, f); return shot ? [shot] : []; }), [rows, f]);
  const bed = node.bed && rows[0] ? localPicture(readField(rows[0], node.bed)) ?? undefined : undefined;
  const note = node.note && rows[0] ? str(readField(rows[0], node.note)) : undefined;
  const affectedValue = node.affected && rows[0] ? readField(rows[0], node.affected) : undefined;
  const affectedShotIds = Array.isArray(affectedValue) ? affectedValue.filter((id): id is string => typeof id === "string") : undefined;

  // A person is "touching" the player from a press or key down until a moment after the release (a click follows its pointer up). A shot
  // change in that window is a pick; any other shot change is playback moving on, which must not write the state or fire `on_select`.
  const touching = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hold = useCallback(() => { clearTimeout(timer.current); touching.current = true; }, []);
  const letGo = useCallback(() => { clearTimeout(timer.current); timer.current = setTimeout(() => { touching.current = false; }, 100); }, []);
  useEffect(() => {
    window.addEventListener("pointerup", letGo);
    window.addEventListener("pointercancel", letGo);
    window.addEventListener("keyup", letGo);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener("pointerup", letGo);
      window.removeEventListener("pointercancel", letGo);
      window.removeEventListener("keyup", letGo);
    };
  }, [letGo]);

  const selectedName = node.selected;
  const onShot = useCallback(
    (shotId: string) => {
      if (!touching.current) return;
      if (selectedName) writer?.merge({ [selectedName]: shotId });
      if (!node.on_select) return;
      const shot = shots.find((s) => s.id === shotId);
      const row = rows.find((r) => String(readField(r, f.shot_id)) === shotId) ?? {};
      // The row's own keys, plus the mapped names (`{shot_id}`, `{caption}`, `{duration_sec}`, `{status}`).
      dispatch(node.on_select, [{ ...row, shot_id: shotId, caption: shot?.caption ?? "", duration_sec: shot?.durationSec ?? 0, status: shot?.status ?? "ready" }]);
    },
    [selectedName, writer, node.on_select, shots, rows, f.shot_id, dispatch],
  );
  const value = selectedName && typeof state[selectedName] === "string" ? (state[selectedName] as string) : undefined;

  if (query.data === undefined && query.isError) {
    return <AsyncState data={null} error isFetching={query.isFetching} onRetry={() => query.refetch()} errorLayout="row">{() => null}</AsyncState>;
  }
  const loading = query.data === undefined;
  if (!loading && shots.length === 0) {
    const empty = node.empty_state;
    return (
      <div data-slot="storyboard-player" data-state="empty" className="w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-card)]">
        <EmptyState icon={empty.icon} text={empty.text} actionLabel={emptyActionLabel(empty)} actionVariant={empty.action ? empty.action_variant : undefined} onAction={empty.action ? () => dispatch(empty.action!) : undefined} />
        {pendingConfirm ? <ConfirmDialog pendingConfirm={pendingConfirm} /> : null}
      </div>
    );
  }
  return (
    <>
      {/* A capture-phase listener on a wrapper that adds no box; the player's own buttons and scrub bar stay the only controls. */}
      <div
        className="contents"
        onPointerDownCapture={hold}
        onKeyDownCapture={hold}
        onClickCapture={() => { hold(); letGo(); }}
      >
        {/* A fresh player once the shots arrive: the kit starts on `value` only at mount. */}
        <StoryboardPlayer key={loading ? "loading" : "ready"} shots={shots} bedSrc={bed} affectedShotIds={affectedShotIds} note={note} value={value} onValueChange={onShot} loading={loading} labels={{ loading: node.loading_text }} />
      </div>
      {lastError ? <p role="alert" className="text-destructive px-4 text-sm">{lastError}</p> : null}
      {pendingConfirm ? <ConfirmDialog pendingConfirm={pendingConfirm} /> : null}
    </>
  );
}
