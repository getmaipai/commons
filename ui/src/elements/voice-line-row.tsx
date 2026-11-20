"use client";

import { useId } from "react";
import { AlertCircleIcon, PauseIcon, PlayIcon, RefreshCwIcon, ShuffleIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { Avatar } from "../primitives/Avatar";
import { SafeImage } from "../primitives/SafeImage";
import { i18n } from "@/kit/i18n";

export interface VoiceLineSpeaker {
  name: string;
  /** A picture of the speaker. Without it the row draws the name's first letters. */
  avatar?: string;
}

export interface VoiceLineRowProps {
  speaker: VoiceLineSpeaker;
  /** What the speaker says. */
  text: string;
  /** Plays or pauses this reading. Without it there is no play button. */
  onPlay?: () => void;
  playing?: boolean;
  /** Which reading this is: "Reading 1 of 2". */
  reading?: { index: number; count: number };
  /** Ask for a fresh reading of the same words. */
  onSayDifferently?: () => void;
  /** Switch to another reading already made. Disabled with a visible reason while there is only one. */
  onUseOtherReading?: () => void;
  /** "making" shows a calm shimmer line and locks the two reading actions. */
  status?: "ready" | "making";
  /** A small waveform for this reading: values from 0 to 1, drawn as bars. Decorative; the play button carries the meaning. */
  wave?: readonly number[];
  /** What went wrong and what to do next. */
  errorMessage?: string;
  /** Replaces the default words. */
  labels?: Partial<VoiceLineRowLabels>;
  className?: string;
}

export interface VoiceLineRowLabels {
  play: string;
  pause: string;
  sayDifferently: string;
  useOtherReading: string;
  makingReading: string;
  onlyOneReading: string;
}

function defaultLabels(name: string): VoiceLineRowLabels {
  return {
    play: i18n._({ id: "ui.Play {name}", message: "Play {name}", values: { name } }),
    pause: i18n._({ id: "ui.Pause {name}", message: "Pause {name}", values: { name } }),
    sayDifferently: i18n._({ id: "ui.Say it differently", message: "Say it differently" }),
    useOtherReading: i18n._({ id: "ui.Use the other reading", message: "Use the other reading" }),
    makingReading: i18n._({ id: "ui.Making a new reading", message: "Making a new reading" }),
    onlyOneReading: i18n._({ id: "ui.There is only one reading so far. Press Say it differently to make another.", message: "There is only one reading so far. Press Say it differently to make another." }),
  };
}

/** K4: one spoken line of a shot, with its speaker, a play button and the choices for a different reading. */
export function VoiceLineRow({ speaker, text, onPlay, playing = false, reading, onSayDifferently, onUseOtherReading, status = "ready", wave, errorMessage, labels, className }: VoiceLineRowProps) {
  const words = { ...defaultLabels(speaker.name), ...labels };
  const reasonId = useId();
  const making = status === "making";
  const onlyOne = reading ? reading.count < 2 : false;
  const otherBlocked = making || onlyOne || !onUseOtherReading;
  const bars = wave && wave.length > 0 ? wave : null;
  return (
    <div
      role="group"
      aria-label={speaker.name}
      aria-busy={making || undefined}
      data-slot="voice-line-row"
      data-status={status}
      data-playing={playing ? "" : undefined}
      className={cn("flex w-full min-w-0 flex-col gap-3 rounded-[var(--radius-card)] border border-border bg-card p-4 text-card-foreground sm:flex-row sm:items-start sm:gap-4", className)}
    >
      <div className="flex min-w-0 items-center gap-3 sm:w-40 sm:shrink-0 sm:flex-col sm:items-start">
        {speaker.avatar ? (
          <SafeImage src={speaker.avatar} alt="" kind="person" tintSeed={speaker.name} className="size-12 shrink-0 rounded-full object-cover" />
        ) : (
          <Avatar name={speaker.name} className="size-12 shrink-0" />
        )}
        <span data-slot="voice-line-speaker" className="min-w-0 flex-1 truncate text-base font-semibold sm:flex-none">{speaker.name}</span>
        {onPlay ? (
          <Button type="button" size="icon" variant="outline" className="size-12 shrink-0 rounded-full" aria-label={playing ? words.pause : words.play} onClick={onPlay}>
            {playing ? <PauseIcon aria-hidden className="size-5" /> : <PlayIcon aria-hidden className="size-5" />}
          </Button>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <p data-slot="voice-line-text" className="min-w-0 flex-1 text-base leading-relaxed">{text}</p>
        </div>

        {bars ? (
          <div data-slot="voice-line-wave" aria-hidden className="flex h-8 items-center gap-0.5">
            {bars.map((value, index) => (
              <span key={index} className={cn("w-1 shrink-0 rounded-full", playing ? "bg-primary" : "bg-muted-foreground/50")} style={{ height: `${Math.round(Math.min(1, Math.max(0.08, value)) * 100)}%` }} />
            ))}
          </div>
        ) : null}

        {making ? (
          <div role="status" data-slot="voice-line-making" className="flex flex-col gap-2">
            <Skeleton shape="line" animation="shimmer" tone="surface" className="w-full" />
            <p className="text-sm text-muted-foreground">{words.makingReading}</p>
          </div>
        ) : null}

        {reading ? (
          <p data-slot="voice-line-reading" className="text-sm text-muted-foreground">
            {i18n._({ id: "ui.Reading {index} of {count}", message: "Reading {index} of {count}", values: { index: reading.index, count: reading.count } })}
          </p>
        ) : null}

        {onSayDifferently || onUseOtherReading ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {onSayDifferently ? (
              <Button type="button" variant="outline" className="min-h-12" disabled={making} onClick={onSayDifferently}>
                <RefreshCwIcon aria-hidden className="size-4" />
                {words.sayDifferently}
              </Button>
            ) : null}
            {onUseOtherReading ? (
              <Button type="button" variant="outline" className="min-h-12" disabled={otherBlocked} aria-describedby={onlyOne ? reasonId : undefined} onClick={onUseOtherReading}>
                <ShuffleIcon aria-hidden className="size-4" />
                {words.useOtherReading}
              </Button>
            ) : null}
          </div>
        ) : null}
        {onUseOtherReading && onlyOne ? <p id={reasonId} data-slot="voice-line-reason" className="text-sm text-muted-foreground">{words.onlyOneReading}</p> : null}

        {errorMessage ? (
          <p role="alert" data-slot="voice-line-error" className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircleIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0">{errorMessage}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
