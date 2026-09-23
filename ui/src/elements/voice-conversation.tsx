"use client";

import type { ComponentProps } from "react";
import { MicIcon, MicOffIcon, PhoneOffIcon } from "lucide-react";
import { cn } from "cn";
import { ghostButton, mono, paper } from "./surfaces";
import { clamp } from "./range";

export type VoiceMode = "connecting" | "listening" | "thinking" | "speaking";

export interface VoiceTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const CAPTION: Record<VoiceMode, string> = {
  connecting: "Connecting",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
};

const HINT: Record<VoiceMode, string> = {
  connecting: "Opening the mic",
  listening: "Listening for you",
  thinking: "Working on it",
  speaking: "Playing the reply",
};

export function VoiceConversation({
  mode,
  amplitude,
  transcript,
  muted,
  onToggleMute,
  onInterrupt,
  onEnd,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  | "children"
  | "mode"
  | "amplitude"
  | "transcript"
  | "muted"
  | "onToggleMute"
  | "onInterrupt"
  | "onEnd"
> & {
  mode: VoiceMode;
  amplitude: number;
  transcript: readonly VoiceTurn[];
  muted?: boolean;
  onToggleMute?: () => void;
  onInterrupt?: () => void;
  onEnd?: () => void;
}) {
  const level = clamp(amplitude, 0, 1);
  const active = mode === "listening" || mode === "speaking";
  const canInterrupt = mode === "speaking" && onInterrupt !== undefined;

  return (
    <div
      data-slot="voice-conversation"
      className={cn(
        paper,
        "flex w-full max-w-xs flex-col items-center gap-4 rounded-[28px] px-5 py-5",
        className,
      )}

      {...props}
    >
      {/* VOICE-LIVE-05 (2026-09-23, Jesse's own judgment of the first
          recording): the orb read too small and, in light theme, near-
          black - a dark grey disc, not a blue glow. Size: ChatGPT's own
          scale, roughly 160-200px on desktop (size-40/size-48 below,
          160px/192px - Tailwind's own scale lands exactly there), every
          ring scaled with it, keeping this component's own original
          ring-to-button ratios (ring2 70.8%, the core and ripple
          41.7%). Color: tokens.css's own --voice-accent, never
          --primary - see that token's own comment for why --primary
          alone wasn't safe (the vendored template's own competing
          :root definition won the cascade in light theme). */}
      <button
        type="button"
        onClick={onInterrupt}
        disabled={!canInterrupt}
        aria-label="Interrupt the assistant"
        className="focus-visible:ring-foreground/20 relative flex size-40 items-center justify-center rounded-full outline-none focus-visible:ring-1 disabled:cursor-default sm:size-48"
      >
        <span
          aria-hidden
          className={cn(
            "absolute size-40 rounded-full transition-[transform,opacity] duration-200 ease-out sm:size-48 motion-reduce:transition-none",
            mode === "speaking"
              ? "bg-radial from-voice-accent/16 to-voice-accent/4"
              : mode === "thinking"
                ? "bg-radial from-foreground/8 to-foreground/2 motion-safe:animate-[voice-hue-drift_4s_ease-in-out_infinite]"
                : "bg-foreground/[0.05]",
          )}
          style={{
            transform: `scale(${active ? 0.72 + level * 0.28 : 0.62})`,
            opacity: active ? 1 : 0.5,
          }}
        />
        <span
          aria-hidden
          className={cn(
            "absolute size-[113px] rounded-full transition-[transform,opacity,box-shadow] duration-150 ease-out sm:size-[136px] motion-reduce:transition-none",
            mode === "speaking"
              ? "bg-voice-accent/24 shadow-[0_0_1.25rem_color-mix(in_oklab,var(--color-voice-accent)_45%,transparent)]"
              : "bg-foreground/[0.08]",
          )}
          style={{
            transform: `scale(${active ? 0.8 + level * 0.22 : 0.7})`,
          }}
        />
        <span
          aria-hidden
          className={cn(
            "relative size-[67px] rounded-full transition-[transform,background-color] duration-150 ease-out sm:size-20 motion-reduce:transition-none",
            mode === "connecting" && "bg-foreground/20 animate-pulse",
            mode === "listening" && "bg-foreground/80",
            mode === "thinking" && "bg-foreground/30 animate-pulse",
            mode === "speaking" && "bg-voice-accent",
          )}
          style={{ transform: `scale(${active ? 0.9 + level * 0.2 : 0.85})` }}
        />
        {/* The first-spoken-word ripple: a single expanding, fading ring.
            The conditional render itself is what replays it every time -
            leaving "speaking" unmounts this span outright, so the next
            "speaking" entry is a genuinely fresh mount, restarting the
            CSS animation with no key needed. The flair the row asks for,
            costing nothing in per-frame JS (a CSS animation, not a rAF
            loop). */}
        {mode === "speaking" && (
          <span
            aria-hidden
            className="border-voice-accent/50 absolute size-[67px] rounded-full border motion-reduce:hidden motion-safe:animate-[voice-ripple_0.6s_ease-out] sm:size-20"
          />
        )}
      </button>

      <div className="flex flex-col items-center gap-1">
        <span className="text-[13.5px] font-medium">{CAPTION[mode]}</span>
        <span className={cn(mono, "text-foreground/35")}>
          {muted ? "Mic off" : canInterrupt ? "Tap to interrupt" : HINT[mode]}
        </span>
      </div>

      <div className="flex min-h-[4.5rem] w-full flex-col gap-1.5">
        {transcript.map((turn) => (
          <div
            key={turn.id}
            className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both flex gap-2 text-xs leading-relaxed duration-300"
          >
            <span
              className={cn(
                mono,
                "w-8 shrink-0",
                turn.role === "user"
                  ? "text-foreground/30"
                  : "text-voice-accent/70",
              )}
            >
              {turn.role === "user" ? "you" : "ai"}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 break-words",
                turn.role === "user"
                  ? "text-foreground/50"
                  : "text-foreground/80",
              )}
            >
              {turn.text}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={
            muted ? "Turn the microphone on" : "Turn the microphone off"
          }
          aria-pressed={muted}
          onClick={onToggleMute}
          disabled={!onToggleMute}
          className={cn(
            ghostButton,
            "size-10 disabled:pointer-events-none disabled:opacity-30",
            muted && "bg-foreground/[0.08] text-foreground/90",
          )}
        >
          {muted ? (
            <MicOffIcon className="size-4" />
          ) : (
            <MicIcon className="size-4" />
          )}
        </button>
        <button
          type="button"
          aria-label="End the call"
          onClick={onEnd}
          disabled={!onEnd}
          className="flex size-10 items-center justify-center rounded-full bg-red-500/90 text-white transition-[opacity,scale] duration-150 hover:opacity-90 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-30 motion-reduce:transition-none"
        >
          <PhoneOffIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
