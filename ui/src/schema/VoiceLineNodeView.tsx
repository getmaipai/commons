import { useEffect, useMemo, useRef, useState } from "react";
import { AsyncState } from "@/kit/primitives/AsyncState";
import { VoiceLineRow } from "@/kit/elements/voice-line-row";
import { ConfirmDialog } from "@/kit/schema/ConfirmDialog";
import { useBinding } from "@/kit/schema/binding";
import { useDispatchAction } from "@/kit/schema/actions";
import { readField } from "@/kit/schema/fieldPath";
import { localPicture } from "@/kit/schema/mediaPath";
import type { VoiceLineNode } from "@/kit/schema/types";

type Row = Record<string, unknown>;

const str = (v: unknown): string | undefined => (typeof v === "string" && v !== "" ? v : undefined);
const whole = (v: unknown): number | undefined => (typeof v === "number" && Number.isInteger(v) && v >= 1 ? v : undefined);

/** Loudness samples (numbers from 0 up) as bars from 0 to 1, scaled to the loudest. */
function bars(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const clean = value.map((n) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0));
  const top = Math.max(0, ...clean);
  return clean.length > 0 && top > 0 ? clean.map((n) => n / top) : clean.length > 0 ? clean : undefined;
}

/** UI-BLOCKS-01: `voice_line`. The first row of `bind` is one spoken line. The node plays its `audio` (a same-origin file) itself; the two
 * reading actions fire with the row's own fields as placeholders. */
export function VoiceLineNodeView({ node, state }: { node: VoiceLineNode; state: Row }) {
  const query = useBinding<Row[]>(node.bind, state);
  const { dispatch, pendingConfirm, lastError } = useDispatchAction();
  const row = Array.isArray(query.data) ? query.data[0] : undefined;
  const audioSrc = row && node.audio ? localPicture(readField(row, node.audio)) ?? undefined : undefined;
  const wave = useMemo(() => (row && node.wave ? bars(readField(row, node.wave)) : undefined), [row, node.wave]);

  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  // Another reading is another file: the old one stops.
  useEffect(() => { setPlaying(false); }, [audioSrc]);
  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (!el.paused) { el.pause(); return; }
    try { void Promise.resolve(el.play()).catch(() => setPlaying(false)); } catch { setPlaying(false); }
  };

  return (
    <AsyncState data={query.data} error={query.isError} isFetching={query.isFetching} onRetry={() => query.refetch()} errorLayout="row" isEmpty={() => false}>
      {() => {
        if (!row) return null;
        const index = whole(readField(row, node.reading_index));
        const count = whole(readField(row, node.reading_count));
        const say = node.actions?.say_differently;
        const other = node.actions?.use_other_reading;
        return (
          <>
            <VoiceLineRow
              speaker={{ name: String(readField(row, node.speaker) ?? ""), avatar: node.speaker_picture ? localPicture(readField(row, node.speaker_picture)) ?? undefined : undefined }}
              text={String(readField(row, node.text) ?? "")}
              onPlay={audioSrc ? toggle : undefined}
              playing={playing}
              reading={index !== undefined && count !== undefined ? { index, count } : undefined}
              onSayDifferently={say ? () => dispatch(say.action, [row]) : undefined}
              onUseOtherReading={other ? () => dispatch(other.action, [row]) : undefined}
              status={readField(row, node.status) === "making" ? "making" : "ready"}
              wave={wave}
              errorMessage={(node.error ? str(readField(row, node.error)) : undefined) ?? lastError ?? undefined}
              labels={{ ...(say?.label ? { sayDifferently: say.label } : {}), ...(other?.label ? { useOtherReading: other.label } : {}) }}
            />
            {audioSrc ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption -- the words are on screen beside the play button; the file is the voice itself.
              <audio
                ref={audio}
                src={audioSrc}
                preload="none"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                onError={() => setPlaying(false)}
              />
            ) : null}
            {pendingConfirm ? <ConfirmDialog pendingConfirm={pendingConfirm} /> : null}
          </>
        );
      }}
    </AsyncState>
  );
}
