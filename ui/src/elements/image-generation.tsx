"use client";

import type { ComponentProps } from "react";
import { RefreshCwIcon, SquareIcon } from "lucide-react";
import { cn } from "cn";
import { ghostButton, mono, ShimmerLabel } from "./surfaces";
import { Progress } from "@/primitives/Progress";
import { GenerationStage } from "./generation-stage";

export function ImageGeneration({
  prompt,
  generating,
  onRegenerate,
  onStop,
  progress,
  statusLabel = "Generating",
  elapsedLabel,
  stopLabel = "Stop",
  sizeLabel = "1024 × 1024",
  size = "default",
  previewSrc,
  previewStep,
  steps,
  etaLabel,
  aspectRatio = "1 / 1",
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "prompt" | "generating" | "onRegenerate" | "onStop" | "progress" | "statusLabel" | "elapsedLabel" | "stopLabel" | "sizeLabel" | "size" | "previewSrc" | "previewStep" | "steps" | "etaLabel" | "aspectRatio"
> & {
  prompt: string;
  generating: boolean;
  onRegenerate?: () => void;
  /** While generating, a Stop button replaces the hidden regenerate button. */
  onStop?: () => void;
  /** 0 to 100 as the engine reports it; a thin bar on the card while generating. Unset draws no bar. */
  progress?: number;
  /** The caption while generating (the engine's step, "Waiting its turn"). Default "Generating". */
  statusLabel?: string;
  /** A clock beside the caption while generating ("12s"). */
  elapsedLabel?: string;
  stopLabel?: string;
  /** The size mark in the corner. Default "1024 × 1024". */
  sizeLabel?: string;
  /** `large` fills the width (up to 28rem) so the card matches a large gallery; default is the 13rem tile. */
  size?: "default" | "large";
  /** The engine's latest preview while generating. It cross-fades in over the shimmer, blurred early and sharper with each step. */
  previewSrc?: string;
  /** The step the preview shows, out of `steps`; sets how blurred it is (none on the last step). */
  previewStep?: number;
  steps?: number;
  /** How long is left ("about 1 minute left"), beside the elapsed clock while generating. */
  etaLabel?: string;
  /** CSS aspect-ratio of the picture area. Default "1 / 1". */
  aspectRatio?: string;
}) {
  return (
    <div
      data-slot="image-generation"
      className={cn("flex flex-col gap-2.5", size === "large" ? "w-full max-w-md" : "w-52", className)}

      {...props}
    >
      <GenerationStage
        generating={generating}
        previewSrc={previewSrc}
        previewStep={previewStep}
        steps={steps}
        aspectRatio={aspectRatio}
        className="rounded-2xl"
        underlay={
          <div
            aria-hidden
            className={cn(
              "absolute inset-0 transition-[opacity,filter] duration-1000 ease-out motion-reduce:transition-none",
              generating ? "opacity-0 blur-xl" : "blur-0 opacity-100",
            )}
            style={{
              background:
                "radial-gradient(120% 90% at 20% 100%, oklch(0.45 0.09 265) 0%, transparent 55%), radial-gradient(110% 80% at 85% 90%, oklch(0.62 0.1 300 / 0.8) 0%, transparent 60%), radial-gradient(130% 100% at 60% 0%, oklch(0.88 0.06 60) 0%, oklch(0.74 0.09 25 / 0.9) 45%, transparent 75%), linear-gradient(to top, oklch(0.35 0.06 275), oklch(0.82 0.07 50))",
            }}
          />
        }
      >
        <span
          className={cn(
            mono,
            "absolute end-2.5 top-2.5 tabular-nums",
            generating ? "text-muted-foreground" : "text-white/70",
          )}
        >
          {sizeLabel}
        </span>
        {generating && progress !== undefined ? (
          <div className="absolute inset-x-3 bottom-3">
            <Progress mode="determinate" value={progress} label={statusLabel} />
          </div>
        ) : null}
      </GenerationStage>
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground min-w-0 flex-1 truncate text-xs" title={prompt}>
          {generating ? (
            <>
              <ShimmerLabel className="relative">{statusLabel}</ShimmerLabel>
              {elapsedLabel ? <span className={cn(mono, "ms-2 tabular-nums")}>{elapsedLabel}</span> : null}
              {etaLabel ? <span className={cn(mono, "ms-2 tabular-nums")}>{etaLabel}</span> : null}
            </>
          ) : (
            prompt
          )}
        </p>
        {generating && onStop ? (
          <button type="button" aria-label={stopLabel} onClick={onStop} className={cn(ghostButton, "size-6 shrink-0")}>
            <SquareIcon className="size-3" />
          </button>
        ) : null}
        <button
          type="button"
          aria-label="Regenerate image"
          aria-hidden={generating || undefined}
          tabIndex={generating ? -1 : undefined}
          disabled={generating}
          onClick={onRegenerate}
          className={cn(
            ghostButton,
            "size-6 shrink-0",
            generating && "pointer-events-none opacity-0",
            generating && onStop && "hidden",
          )}
        >
          <RefreshCwIcon className="size-3" />
        </button>
      </div>
    </div>
  );
}
