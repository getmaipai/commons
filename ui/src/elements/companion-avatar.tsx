import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import { createCompanionAvatarMachine, pickWanted, type CompanionClips, type StateId } from "@/kit/elements/companion-avatar-machine";
import { StackedAlphaVideo } from "@/kit/elements/stacked-alpha-video";
import { SafeImage } from "@/kit/primitives/SafeImage";
import { Button } from "@/kit/ui/button";
import { icons } from "@/kit/icons";
import { i18n } from "@/kit/i18n"
import { LIFE, levelMouthLetter, nextMouthLetter } from "./companion-avatar-motion";

type Wanted = Partial<Record<"needs_you" | "speaking" | "working" | "thinking" | "listening" | "sleeping", boolean>>;
type Letter = "A" | "B" | "C" | "D" | "E" | "F";
type Anchor = { x: number; y: number; w: number; h: number };
type Props = { name: string; clips: CompanionClips; state?: StateId | undefined; wanted?: Wanted; once?: { state: StateId; nonce: number } | null; size?: "xs" | "sm" | "md" | "lg" | "xl" | "header" | "fill"; onFail?(): void; className?: string; placement?: "inline" | "corner"; hidden?: boolean; onHiddenChange?: (hidden: boolean) => void; ring?: "idle" | "listening" | "thinking" | "speaking" | null; animated?: boolean; mouth?: { still: string; level: () => number; shapes?: Partial<Record<Letter, string>>; anchor?: Anchor; cue?: () => Letter | "X" | null; life?: number } | null; eyes?: { closed: string; half?: string; anchor: Anchor; random?: () => number } | null };
const SIZES = { xs: "size-7", sm: "size-16", md: "size-24", lg: "size-40", xl: "size-52", header: "size-10", fill: "size-full" } as const;

export function CompanionAvatar({ name, clips, state, wanted, once, size = "md", onFail, className, placement = "inline", hidden = false, onHiddenChange, ring = null, animated = true, mouth = null, eyes = null }: Props) {
  const corner = placement === "corner";
  const wrapperClass = corner ? "group pointer-events-none absolute right-3 top-3 z-10" : size === "fill" ? "group relative size-full" : "group relative";
  const ToggleIcon = hidden ? icons.eye : icons["eye-off"];
  const toggleLabel = hidden ? i18n._({ id: "ui.Show the character", message: "Show the character" }) : i18n._({ id: "ui.Hide the character", message: "Hide the character" });

  return <div className={cn(wrapperClass)}>
    {!hidden ? <CompanionAvatarVisual name={name} clips={clips} state={state} wanted={wanted} once={once} size={size} onFail={onFail} className={className} ring={ring} animated={animated} mouth={mouth} eyes={eyes} /> : null}
    {onHiddenChange ? <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={toggleLabel}
      onClick={() => onHiddenChange(!hidden)}
      className={cn("pointer-events-auto absolute right-0 top-0", hidden ? "" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100")}
    ><ToggleIcon aria-hidden="true" /></Button> : null}
  </div>;
}

function CompanionAvatarVisual({ name, clips, state, wanted, once, size = "md", onFail, className, ring = null, animated = true, mouth = null, eyes = null }: Omit<Props, "placement" | "hidden" | "onHiddenChange">) {
  const machine = useMemo(() => createCompanionAvatarMachine(clips), [clips]);
  const [current, setCurrent] = useState<StateId>(state ?? "idle");
  const [failed, setFailed] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(() => typeof document === "undefined" || !document.hidden);
  const [source, setSource] = useState("");
  const [h264Fallback, setH264Fallback] = useState(false);
  const lastNonce = useRef<number | undefined>(undefined);
  const wantedState = state ?? pickWanted(wanted ?? {});
  const onceNonce = once?.nonce;
  const onceState = once?.state;
  useEffect(() => { machine.want(wantedState); }, [machine, wantedState]);
  useEffect(() => {
    if (onceNonce === undefined || !onceState || lastNonce.current === onceNonce) return;
    lastNonce.current = onceNonce;
    machine.play(onceState);
    setCurrent(machine.current());
  }, [machine, onceNonce, onceState]);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update(); query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  useEffect(() => {
    const update = () => setDocumentVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    if (state) { setCurrent(state); return; }
    const timer = window.setInterval(() => setCurrent(machine.tick(Date.now())), 250);
    return () => window.clearInterval(timer);
  }, [machine, state]);
  useEffect(() => { setFailed(false); machine.want(wantedState); }, [machine, clips, wantedState]);
  useEffect(() => { setH264Fallback(false); }, [current]);

  const clip = clips[current] ?? clips.idle;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mouthLayerRef = useRef<HTMLImageElement | null>(null);
  const mouthContainerRef = useRef<HTMLDivElement | null>(null);
  const shapeState = useRef<{ letter: Letter | null; changedAt: number }>({ letter: null, changedAt: 0 });
  const [shapeLetter, setShapeLetter] = useState<Letter | null>(null);
  const [blink, setBlink] = useState<"half" | "closed" | null>(null);
  const mouthActive = Boolean(mouth && wantedState === "speaking" && animated && !reduced && documentVisible && !failed && size !== "header");
  const shapeMode = Boolean(mouth?.shapes && mouth.anchor);
  useEffect(() => {
    if (!mouthActive || !mouth || size === "header" || mouth.life === 0) { if (mouthContainerRef.current) mouthContainerRef.current.style.transform = "none"; return; }
    let frame = 0; let smoothLevel = 0; const startedAt = performance.now();
    const update = (now: number) => {
      const container = mouthContainerRef.current; if (!container) return;
      let reading = 0; try { reading = mouth.level(); } catch { /* Missing analyser data means closed. */ }
      if (!Number.isFinite(reading)) reading = 0;
      const lv = Math.max(0, Math.min(1, reading)); smoothLevel += (lv - smoothLevel) * (lv > smoothLevel ? 0.4 : 0.9);
      const t = (now - startedAt) / 1000; const amount = mouth.life ?? 1;
      const scale = 1 + amount * (LIFE.breathAmplitude * Math.sin(2 * Math.PI * t / LIFE.breathPeriod) + LIFE.levelScale * smoothLevel);
      const rotate = amount * (LIFE.swayAmplitude * Math.sin(2 * Math.PI * t / LIFE.swayPeriod) + LIFE.swaySecondAmplitude * Math.sin(2 * Math.PI * t / LIFE.swaySecondPeriod + 1) + LIFE.levelSwayAmplitude * (smoothLevel - 0.3) * Math.sin(2 * Math.PI * t / LIFE.levelSwayPeriod));
      const x = amount * LIFE.driftXAmplitude * Math.sin(2 * Math.PI * t / LIFE.driftXPeriod);
      const y = amount * (LIFE.driftYAmplitude * Math.sin(2 * Math.PI * t / LIFE.driftYPeriod + 2) - LIFE.levelDriftY * smoothLevel);
      container.style.transformOrigin = "50% 85%"; container.style.transform = `translate(${x}%, ${y}%) rotate(${rotate}deg) scale(${scale})`;
      frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    return () => { window.cancelAnimationFrame(frame); if (mouthContainerRef.current) mouthContainerRef.current.style.transform = "none"; };
  }, [mouthActive, mouth, size]);
  useEffect(() => {
    if (!mouthActive || !mouth || shapeMode || !mouthLayerRef.current) return;
    let frame = 0;
    const update = () => {
      const layer = mouthLayerRef.current;
      if (!layer) return;
      let level = 0;
      try {
        const reading = mouth.level();
        if (Number.isFinite(reading)) level = reading;
      } catch { /* A missing analyser reading means a closed mouth. */ }
      layer.style.opacity = String(Math.min(1, Math.max(0, level * 2.5)));
      frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [mouthActive, mouth, shapeMode]);
  useEffect(() => {
    if (!mouthActive || !mouth || !shapeMode) { setShapeLetter(null); return; }
    let frame = 0;
    shapeState.current = { letter: null, changedAt: performance.now() };
    const update = () => {
      let chosen: Letter | null = null;
      let fromCue = false;
      let cueClosed = false;
      try {
        const cue = mouth.cue?.();
        if (cue && cue !== "X") { chosen = cue; fromCue = true; }
        else if (cue === "X") cueClosed = true;
        else if (!cue) {
          const value = mouth.level();
          if (Number.isFinite(value)) chosen = levelMouthLetter(value, Boolean(mouth.shapes?.A));
        }
      } catch { /* Missing audio data leaves the base still visible. */ }
      const now = performance.now(); const current = shapeState.current.letter;
      const next = fromCue || cueClosed ? chosen : nextMouthLetter(current, chosen, now - shapeState.current.changedAt);
      if (next !== current) { shapeState.current = { letter: next, changedAt: now }; setShapeLetter(next); }
      frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [mouthActive, mouth, shapeMode]);
  const blinkTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(blinkTimer.current);
    blinkTimer.current = undefined;
    setBlink(null);
    const active = Boolean(eyes && mouthActive && animated && !reduced && documentVisible && !failed && wantedState === "speaking" && size !== "header");
    if (!active || !eyes) return () => window.clearTimeout(blinkTimer.current);
    let phase: number | undefined;
    const schedule = () => {
      const random = eyes.random ?? Math.random;
      blinkTimer.current = window.setTimeout(() => {
        if (eyes.half) { setBlink("half"); phase = window.setTimeout(() => { setBlink("closed"); phase = window.setTimeout(() => { setBlink(null); schedule(); }, 110); }, 50); }
        else { setBlink("closed"); phase = window.setTimeout(() => { setBlink(null); schedule(); }, 110); }
      }, 3000 + Math.floor(Math.max(0, Math.min(0.999999, random())) * 3001));
    };
    schedule();
    return () => { window.clearTimeout(blinkTimer.current); window.clearTimeout(phase); blinkTimer.current = undefined; };
    }, [eyes, mouthActive, animated, reduced, documentVisible, failed, wantedState, size]);
  useEffect(() => {
    const video = videoRef.current;
    const canAv1 = !!clip.av1 && video?.canPlayType('video/mp4; codecs="av01.0.05M.08"') === "probably";
    setSource(h264Fallback || !canAv1 ? (clip.h264 ?? "") : clip.av1!);
  }, [clip.av1, clip.h264, h264Fallback]);
  useEffect(() => {
    const idle = clips.idle;
    const next = clips[wantedState] ?? idle;
    const links: HTMLLinkElement[] = [];
    for (const src of new Set([idle.h264, next.h264])) {
      if (!src) continue;
      const link = document.createElement("link");
      link.rel = "preload"; link.as = "video"; link.href = src;
      document.head.append(link);
      links.push(link);
    }
    return () => links.forEach((link) => link.remove());
  }, [clips, wantedState]);

  const handleEnded = useCallback(() => setCurrent(machine.onClipEnded(Date.now())), [machine]);
  const handleError = useCallback(() => {
    if (clip.h264 && source !== clip.h264) { setH264Fallback(true); return; }
    const result = machine.onClipError();
    setCurrent(result.state);
    if (result.failed) { setFailed(true); onFail?.(); }
  }, [clip.h264, machine, onFail, source]);
  const movable = animated && !reduced && documentVisible && !failed && Boolean(clip?.h264 || clip?.av1);
  const cropStyle = (anchor: Anchor) => ({ left: `${anchor.x * 100}%`, top: `${anchor.y * 100}%`, width: `${anchor.w * 100}%`, height: `${anchor.h * 100}%` });
  // Four rings that differ in shape and motion, not only colour: idle is a thin dotted ring, listening a solid ring with an outward ripple,
  // thinking a dashed ring that turns slowly, speaking a thick solid ring with a pulsing glow. Reduced motion keeps every shape, still.
  const ringClass = ring === "idle" ? "-inset-1 border-2 border-dotted border-muted-foreground/60"
    : ring === "listening" ? "-inset-1.5 border-2 border-solid border-primary"
    : ring === "thinking" ? cn("-inset-1.5 border-4 border-dashed border-primary/80", !reduced && "animate-[spin_6s_linear_infinite]")
    : ring === "speaking" ? cn("-inset-1.5 rounded-full border-4 border-solid border-primary shadow-lg shadow-primary/50", !reduced && "animate-pulse") : "";
  return <div role="img" aria-label={ring ? i18n._({ id: "ui.{name}, {ring}", message: "{name}, {ring}", values: { name, ring } }) : name} data-ring={ring ?? undefined} className={cn(SIZES[size], "pointer-events-none relative", className)}>
    {ring ? <span aria-hidden="true" className={cn("absolute rounded-full", ringClass)} /> : null}
    {ring === "listening" && !reduced ? <span aria-hidden="true" data-ring-ripple="" className="absolute -inset-1.5 animate-ping rounded-full border-2 border-primary/50" /> : null}
    {mouthActive && mouth ? <div ref={mouthContainerRef} aria-hidden="true" data-mouth="active" className="relative size-full"><SafeImage src={clips.idle.still} alt="" className="size-full object-contain" />{shapeMode && mouth.shapes && mouth.anchor ? <>{(Object.entries(mouth.shapes) as [Letter, string][]).map(([letter, src]) => <SafeImage key={letter} src={src} alt="" data-mouth-shape={letter} className="absolute object-contain transition-opacity duration-[60ms]" style={{ ...cropStyle(mouth.anchor!), opacity: shapeLetter === letter ? 1 : 0 }} />)}</> : <SafeImage imageRef={mouthLayerRef} src={mouth.still} alt="" className="absolute inset-0 size-full object-contain transition-opacity duration-[60ms]" style={{ opacity: 0 }} />}{eyes && mouthActive && size !== "header" ? <SafeImage src={blink === "half" ? eyes.half ?? eyes.closed : blink === "closed" ? eyes.closed : ""} alt="" className={cn("absolute object-contain", blink ? "" : "hidden")} style={cropStyle(eyes.anchor)} /> : null}</div>
      : movable && clip ? <div aria-hidden="true" className="size-full"><StackedAlphaVideo videoRef={videoRef} src={source || clip.h264 || ""} loop={clip.loop} label="" onEnded={handleEnded} onError={handleError} /></div> : <SafeImage src={clip.still} alt="" className="size-full object-contain" />}
  </div>;
}
