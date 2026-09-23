"use client";

import type { ComponentProps } from "react";
import { MicIcon, MicOffIcon, PhoneOffIcon } from "lucide-react";
import { cn } from "cn";
import { mono, paper } from "./surfaces";
import { TooltipIconButton } from "../assistant-ui/tooltip-icon-button";
import { clamp } from "./range";

export type VoiceMode = "connecting" | "listening" | "thinking" | "speaking";

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
  | "muted"
  | "onToggleMute"
  | "onInterrupt"
  | "onEnd"
> & {
  mode: VoiceMode;
  amplitude: number;
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
        // VOICE-LIVE-05 follow-up (Jesse's own live read, 2026-09-23):
        // "the phone call look instead of the visualizer" - a call
        // screen, ChatGPT's own voice mode, not a floating card with a
        // running transcript. Below sm (640px, the kit's own mobile
        // breakpoint - Header.tsx's own Search fallback already hides
        // there): the surface grows to fill whatever it's given
        // (h-full w-full, no border, no rounding - edge to edge, the
        // caller's own fixed overlay is the only chrome); justify-
        // between plus the orb group's own flex-1 below centers the
        // orb in the space above the controls while the controls stay
        // pinned to the bottom, a real call screen's own layout. At sm
        // and up: the original small floating card (max-w-xs,
        // rounded-[28px], bordered via `paper`, sized to its own
        // content, everything back to plain top-to-bottom flow).
        "flex h-full w-full flex-col items-center justify-between gap-6 border-0 px-5 py-10 sm:h-auto sm:max-w-xs sm:justify-start sm:gap-4 sm:rounded-[28px] sm:border sm:px-5 sm:py-5",
        className,
      )}
      {...props}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-6 sm:flex-none sm:justify-start sm:gap-4">
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
      </div>

      {/* VOICE-LIVE-05 follow-up: "no running transcript list inside the
          card" - the turn already lands in the thread as text, the real
          record; a second copy printed here was the thing Jesse asked
          to drop, along with the "you"/"ai" labels it carried (with it
          goes the only place either ever appeared in this component). */}

      <div className="flex items-center gap-3">
        {/* "The kit's icon buttons": TooltipIconButton (the enhanced
            copy in assistant-ui/, a real 48px+ touch target regardless
            of the visual size override - the same component
            liveVoiceSession.tsx's own gear already uses), never a
            hand-styled <button>. */}
        <TooltipIconButton
          tooltip={muted ? "Turn the microphone on" : "Turn the microphone off"}
          aria-label={
            muted ? "Turn the microphone on" : "Turn the microphone off"
          }
          aria-pressed={muted}
          variant={muted ? "secondary" : "ghost"}
          size="icon"
          onClick={onToggleMute}
          disabled={!onToggleMute}
          className="size-12 rounded-full disabled:pointer-events-none disabled:opacity-30"
        >
          {muted ? (
            <MicOffIcon className="size-5" />
          ) : (
            <MicIcon className="size-5" />
          )}
        </TooltipIconButton>
        <TooltipIconButton
          tooltip="End the call"
          aria-label="End the call"
          variant="destructive"
          size="icon"
          onClick={onEnd}
          disabled={!onEnd}
          className="size-12 rounded-full disabled:pointer-events-none disabled:opacity-30"
        >
          <PhoneOffIcon className="size-5" />
        </TooltipIconButton>
      </div>
    </div>
  );
}
