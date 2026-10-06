"use client";

import type { ComponentProps } from "react";
import { AuiIf, ComposerPrimitive } from "@assistant-ui/react";
import { MicIcon, SquareIcon } from "lucide-react";
import { cn } from "cn";
import { ghostButton, inkButton, mono, ShimmerLabel } from "./surfaces";
import { clamp } from "./range";

/**
 * Runtime form of dictation, vendored from assistant-ui's `composer-voice`
 * Element. `DictationControl` only drives the thread's own `DictationAdapter`
 * (start and stop); it opens no microphone or network connection itself, and
 * renders nothing when no adapter is configured.
 */
export function DictationControl({
  startLabel = "Start voice input",
  stopLabel = "Stop voice input",
}: {
  startLabel?: string;
  stopLabel?: string;
}) {
  return (
    <AuiIf condition={(s) => s.thread.capabilities.dictation}>
      <AuiIf condition={(s) => s.composer.dictation == null}>
        <ComposerPrimitive.Dictate
          aria-label={startLabel}
          className={cn(ghostButton, "size-8")}
        >
          <MicIcon className="size-4" />
        </ComposerPrimitive.Dictate>
      </AuiIf>
      <AuiIf condition={(s) => s.composer.dictation != null}>
        <ComposerPrimitive.StopDictation
          aria-label={stopLabel}
          className={cn(
            inkButton,
            "flex size-8 items-center justify-center rounded-full",
          )}
        >
          <SquareIcon className="size-3 fill-current" />
        </ComposerPrimitive.StopDictation>
      </AuiIf>
    </AuiIf>
  );
}

/** The interim words, layered over the input while dictation runs. */
export function DictationTranscript({
  className,
  ...props
}: ComponentProps<typeof ComposerPrimitive.DictationTranscript>) {
  return (
    <ComposerPrimitive.DictationTranscript
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

const BAR_COUNT = 14;

/** Resample any number of 0..1 levels onto the bar count. */
export function barHeights(levels: readonly number[]): number[] {
  return Array.from({ length: BAR_COUNT }, (_, bar) => {
    if (levels.length === 0) return 3;
    const source = levels[Math.min(levels.length - 1, Math.floor((bar / BAR_COUNT) * levels.length))] ?? 0;
    return 3 + clamp(source, 0, 1) * 21;
  });
}

/**
 * A waveform that draws the levels it is given (0 to 1, any count) and
 * nothing else: the caller measures sound, this only paints it.
 */
export function ComposerVoiceLevels({
  levels,
  recording,
  seconds,
  transcribingLabel = "Transcribing",
  className,
  ...props
}: Omit<ComponentProps<"div">, "children"> & {
  levels: readonly number[];
  recording: boolean;
  seconds: number;
  transcribingLabel?: string;
}) {
  const heights = recording ? barHeights(levels) : barHeights([]);
  return (
    <div
      data-slot="composer-voice-levels"
      data-recording={recording || undefined}
      className={cn("flex min-h-11 items-center gap-3 ps-3", className)}
      {...props}
    >
      <div className="flex h-6 items-center gap-[3px]" aria-hidden>
        {heights.map((height, bar) => (
          <span
            key={bar}
            data-bar
            className={cn(
              "w-0.5 rounded-full transition-[height] duration-100 motion-reduce:transition-none",
              recording ? "bg-foreground/50" : "bg-foreground/25",
            )}
            style={{ height }}
          />
        ))}
      </div>
      {recording ? (
        <span className={cn(mono, "text-muted-foreground tabular-nums")}>
          0:{String(seconds).padStart(2, "0")}
        </span>
      ) : (
        <ShimmerLabel className="text-muted-foreground relative text-[13px]">
          {transcribingLabel}
        </ShimmerLabel>
      )}
    </div>
  );
}
