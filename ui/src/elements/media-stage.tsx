"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "cn";
import { getIcon } from "@/kit/icons";
import { i18n } from "@/kit/i18n";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/kit/ui/dropdown-menu";
import { SafeImage } from "../primitives/SafeImage";
import { useMatches } from "./option-cards";

export type MediaStageState = "idle" | "looping" | "paused" | "loading" | "waiting" | "error";

export interface MediaStageMedia {
  /** The still picture. It is always drawn, under the loop, and stays when the loop cannot play. */
  still?: string;
  /** A resolved address of a short silent mp4. Plays muted and looped only in the `looping` state, and never under reduced motion. */
  loop?: string;
  /** CSS object-position of the picture ("50% 30%"), so the subject stays in view when the stage is cropped. */
  position?: string;
}

export interface MediaStagePill {
  id: string;
  /** The visible label on a wide screen; it is the accessible name when the label hides on a phone. */
  label: string;
  /** A kit icon name (see icons.ts). */
  icon?: string;
  onSelect: () => void;
  disabled?: boolean;
  /** Why the action is off, in plain words with the next step. Shown under the label in the More menu and as the tooltip of a disabled pill. */
  disabledReason?: string;
  /** A toggle pill (Favorite): drawn as pressed or not (`aria-pressed`). Absent: a plain button. */
  pressed?: boolean;
  /** Same as `disabledReason` (the name the result feed uses). */
  reason?: string;
  starts?: "video" | "picture";
  states?: MediaStageState[];
}

/** The phone width (the stage's own CSS breakpoint). Under it the first pill and a More menu stay in one row. */
const PHONE_QUERY = "(max-width: 859.98px)";

function PillButton({ pill }: { pill: MediaStagePill }) {
  const Icon = pill.icon ? getIcon(pill.icon) : null;
  return (
    <button type="button" data-slot="media-stage-pill" aria-label={pill.label} aria-pressed={pill.pressed} title={pill.disabled ? (pill.disabledReason ?? pill.reason) : undefined} disabled={pill.disabled} onClick={pill.onSelect}>
      {Icon ? <Icon aria-hidden className="size-4 shrink-0" /> : null}
      <span data-slot="media-stage-pill-label" data-iconless={Icon ? undefined : ""}>{pill.label}</span>
    </button>
  );
}

/** The single More button of a phone stage: a real button with a name that opens the kit's menu; every item runs the same action as its pill. */
function MorePills({ pills }: { pills: readonly MediaStagePill[] }) {
  const MoreIcon = getIcon("ellipsis");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" data-slot="media-stage-pill" data-more="" aria-label={i18n._({ id: "ui.More", message: "More" })}>
          <MoreIcon aria-hidden className="size-4 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" data-slot="media-stage-more-menu">
        {pills.map((pill) => {
          const Icon = pill.icon ? getIcon(pill.icon) : null;
          return (
            <DropdownMenuItem key={pill.id} disabled={pill.disabled} onSelect={() => pill.onSelect()}>
              {Icon ? <Icon aria-hidden /> : null}
              <span className="flex min-w-0 flex-col">
                <span>{pill.label}</span>
                {pill.disabled && pill.disabledReason ? <span className="text-muted-foreground text-sm">{pill.disabledReason}</span> : null}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface MediaStageProps {
  /** "hero" is a page's top stage with the composer on it; "stage" is a player or progress stage. */
  size?: "hero" | "stage";
  media?: MediaStageMedia;
  /** How much of the bottom the picture fades under: "soft" (default) or "strong" for busy pictures. */
  scrim?: "soft" | "strong";
  /** The waiting look: the picture goes quiet (filter only). `state="waiting"` sets it too. */
  dim?: boolean;
  /** Named ratio (wide by default); custom CSS ratios are also accepted. Wide and standard are 4 / 3 on phones; short is 16 / 9. */
  aspect?: "wide" | "standard" | "short" | (string & {});
  /** idle: still with a slow drift. looping: the loop plays, no drift. paused: still only. loading: skeleton. waiting: dimmed still. error: still plus the message. */
  state?: MediaStageState;
  /** Names the picture for assistive tech (what the stage shows). */
  description: string;
  eyebrow?: ReactNode;
  title?: ReactNode;
  /** The heading level of `title`; default 2. */
  titleLevel?: 1 | 2 | 3;
  subtitle?: ReactNode;
  /** The bottom strip: progress, captions, actions. Replaced by the error message in the `error` state. */
  overlay?: ReactNode;
  /** Floating actions at the top right. On a wide screen they wrap and take at most 80% of the width; under 860 px they stay in one row
   * (never down over the title) and, from the third on, move into one "More" menu. */
  pills?: readonly MediaStagePill[];
  /** A small label at the top left. */
  titlePill?: ReactNode;
  /** The composer (hero). It sits on a glass panel at the bottom. */
  children?: ReactNode;
  /** An optional centered play button. */
  playButton?: { label: string; onSelect: () => void };
  /** The plain error line, with the next step, shown in the `error` state. */
  errorMessage?: ReactNode;
  errorActions?: ReactNode;
  /** Buttons under the progress strip while the stage state is `waiting` (for example Stop). */
  waitingActions?: ReactNode;
  /** The hero has its full height (420, 560 on a wide screen). Default true; set false while the page is not ready. */
  ready?: boolean;
  /** A result shows below, so the hero gives up its minimum height. */
  compact?: boolean;
  className?: string;
}

/** The loop video of a stage (a tile would use preload "none"), drawn over the still. It stays hidden until it is really playing, and a failed loop leaves the still alone. */
function LoopVideo({ src, position }: { src: string; position?: string }) {
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setPlaying(false); setFailed(false); }, [src]);
  if (failed) return null;
  return (
    <video
      data-slot="media-stage-loop"
      data-playing={playing ? "" : undefined}
      ref={(el) => { if (el) { el.muted = true; el.defaultMuted = true; } }}
      src={src}
      muted
      loop
      autoPlay
      playsInline
      preload="auto"
      style={position ? { objectPosition: position } : undefined}
      aria-hidden="true"
      tabIndex={-1}
      onPlaying={() => setPlaying(true)}
      onError={() => setFailed(true)}
    />
  );
}

/** A thin progress strip for the stage overlay; the fill and head use the progress ink token. */
export function MediaStageProgress({ value, label }: { value: number; label: string }) {
  const pct = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  return (
    <div data-slot="media-stage-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
      <span data-slot="media-stage-progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * VIDEO-KIT-K9: the big picture stage. A still with a slow drift (or a muted loop), a token scrim, a title block, floating pills,
 * an optional composer on a glass panel and a bottom overlay. The picture is a `role="img"` layer with `description` as its name;
 * the controls stay outside it so assistive tech can reach them. Every source is a prop; nothing here reaches the network.
 */
export function MediaStage({
  size = "stage",
  media,
  scrim = "soft",
  dim = false,
  aspect,
  state = "idle",
  description,
  eyebrow,
  title,
  titleLevel = 2,
  subtitle,
  overlay,
  pills,
  titlePill,
  children,
  playButton,
  errorMessage,
  errorActions,
  waitingActions,
  ready = true,
  compact = false,
  className,
}: MediaStageProps) {
  const reduced = useMatches("(prefers-reduced-motion: reduce)");
  const phone = useMatches(PHONE_QUERY);
  const loading = state === "loading";
  const error = state === "error";
  const waiting = dim || state === "waiting";
  const looping = state === "looping" && !reduced && Boolean(media?.loop);
  const drifting = state === "idle" && !reduced;
  const Heading = `h${titleLevel}` as "h1" | "h2" | "h3";
  const aspectValue = aspect ?? "wide";
  const style = ({ "--media-stage-aspect": aspectValue === "wide" ? "16 / 8.2" : aspectValue === "standard" ? "16 / 9" : aspectValue === "short" ? "21 / 6" : aspectValue } as CSSProperties);
  const visiblePills = (pills ?? []).filter((pill) => pill.states ? pill.states.includes(state) : !["loading", "waiting", "error"].includes(state));
  const PlayIcon = getIcon("play");
  const hasTitle = Boolean(eyebrow || title || subtitle);
  return (
    <section
      data-slot="media-stage"
      data-size={size}
      data-state={state}
      data-aspect={aspectValue === "wide" || aspectValue === "standard" || aspectValue === "short" ? aspectValue : undefined}
      data-scrim={scrim}
      data-dim={waiting ? "" : undefined}
      data-looping={looping ? "" : undefined}
      data-drift={drifting ? "" : undefined}
      data-ready={size === "hero" && ready && !compact ? "" : undefined}
      data-compact={compact ? "" : undefined}
      aria-busy={loading ? true : undefined}
      className={cn(className)}
      style={style}
    >
      <div data-slot="media-stage-picture" role="img" aria-label={description}>
        {loading ? (
          <div data-slot="media-stage-skeleton" className="animate-pulse motion-reduce:animate-none" />
        ) : (
          <>
            <div data-slot="media-stage-drift">
              <SafeImage src={media?.still} alt="" kind="video" loading="eager" draggable={false} data-slot="media-stage-still" style={media?.position ? { objectPosition: media.position } : undefined} className="size-full object-cover" />
            </div>
            {looping && media?.loop ? <LoopVideo src={media.loop} position={media.position} /> : null}
          </>
        )}
      </div>
      <div data-slot="media-stage-scrim" aria-hidden="true" />
      {loading ? <span className="sr-only" role="status">{i18n._({ id: "ui.Loading", message: "Loading" })}</span> : null}
      {titlePill ? <div data-slot="media-stage-title-pill">{titlePill}</div> : null}
      {visiblePills.length > 0 ? (
        <div data-slot="media-stage-pills">
          {phone && visiblePills.length > 1 ? (
            <>
              {visiblePills.slice(0, 1).map((pill) => <PillButton key={pill.id} pill={pill} />)}
              <MorePills pills={visiblePills.slice(1)} />
            </>
          ) : (
            visiblePills.map((pill) => <PillButton key={pill.id} pill={pill} />)
          )}
        </div>
      ) : null}
      {playButton && !error && !loading ? (
        <button type="button" data-slot="media-stage-play" aria-label={playButton.label} onClick={playButton.onSelect}>
          <PlayIcon aria-hidden className="size-7" />
        </button>
      ) : null}
      <div data-slot="media-stage-content">
        {hasTitle ? (
          <div data-slot="media-stage-heading">
            {eyebrow ? <p data-slot="media-stage-eyebrow">{eyebrow}</p> : null}
            {title ? <Heading data-slot="media-stage-title">{title}</Heading> : null}
            {subtitle ? <p data-slot="media-stage-subtitle">{subtitle}</p> : null}
          </div>
        ) : null}
        {children ? <div data-slot="media-stage-composer">{children}</div> : null}
        {error ? (
          <div data-slot="media-stage-overlay" data-error="">
            {errorMessage ? <p data-slot="media-stage-error" role="alert">{errorMessage}</p> : null}
            {errorActions ? <div data-slot="media-stage-error-actions">{errorActions}</div> : null}
          </div>
        ) : overlay || (state === "waiting" && waitingActions) ? (
          <div data-slot="media-stage-overlay">
            {overlay}
            {state === "waiting" && waitingActions ? <div data-slot="media-stage-waiting-actions">{waitingActions}</div> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
