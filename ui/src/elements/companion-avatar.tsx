import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import { createCompanionAvatarMachine, pickWanted, type CompanionClips, type StateId } from "@/kit/elements/companion-avatar-machine";
import { StackedAlphaVideo } from "@/kit/elements/stacked-alpha-video";
import { SafeImage } from "@/kit/primitives/SafeImage";
import { Button } from "@/kit/ui/button";
import { icons } from "@/kit/icons";

type Wanted = Partial<Record<"needs_you" | "speaking" | "working" | "thinking" | "listening" | "sleeping", boolean>>;
type Props = { name: string; clips: CompanionClips; state?: StateId | undefined; wanted?: Wanted; once?: { state: StateId; nonce: number } | null; size?: "xs" | "sm" | "md" | "lg"; onFail?(): void; className?: string; placement?: "inline" | "corner"; hidden?: boolean; onHiddenChange?: (hidden: boolean) => void };
const SIZES = { xs: "size-7", sm: "size-16", md: "size-24", lg: "size-40" } as const;

export function CompanionAvatar({ name, clips, state, wanted, once, size = "md", onFail, className, placement = "inline", hidden = false, onHiddenChange }: Props) {
  const corner = placement === "corner";
  const wrapperClass = corner ? "group pointer-events-none absolute right-3 top-3 z-10" : "group relative";
  const ToggleIcon = hidden ? icons.eye : icons["eye-off"];
  const toggleLabel = hidden ? "Show the character" : "Hide the character";

  return <div className={cn(wrapperClass)}>
    {!hidden ? <CompanionAvatarVisual name={name} clips={clips} state={state} wanted={wanted} once={once} size={size} onFail={onFail} className={className} /> : null}
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

function CompanionAvatarVisual({ name, clips, state, wanted, once, size = "md", onFail, className }: Omit<Props, "placement" | "hidden" | "onHiddenChange">) {
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
  useEffect(() => {
    const video = videoRef.current;
    const canAv1 = !!clip.av1 && video?.canPlayType('video/mp4; codecs="av01.0.05M.08"') === "probably";
    setSource(h264Fallback || !canAv1 ? clip.h264 : clip.av1!);
  }, [clip.av1, clip.h264, h264Fallback]);
  useEffect(() => {
    const idle = clips.idle;
    const next = clips[wantedState] ?? idle;
    const links: HTMLLinkElement[] = [];
    for (const src of new Set([idle.h264, next.h264])) {
      const link = document.createElement("link");
      link.rel = "preload"; link.as = "video"; link.href = src;
      document.head.append(link);
      links.push(link);
    }
    return () => links.forEach((link) => link.remove());
  }, [clips, wantedState]);

  const handleEnded = useCallback(() => setCurrent(machine.onClipEnded(Date.now())), [machine]);
  const handleError = useCallback(() => {
    if (source !== clip.h264) { setH264Fallback(true); return; }
    const result = machine.onClipError();
    setCurrent(result.state);
    if (result.failed) { setFailed(true); onFail?.(); }
  }, [clip.h264, machine, onFail, source]);
  const movable = !reduced && documentVisible && !failed;
  return <div role="img" aria-label={name} className={cn(SIZES[size], "pointer-events-none relative", className)}>
    {movable && clip ? <div aria-hidden="true" className="size-full"><StackedAlphaVideo videoRef={videoRef} src={source || clip.h264} loop={clip.loop} label="" onEnded={handleEnded} onError={handleError} /></div> : <SafeImage src={clip.still} alt="" className="size-full object-contain" />}
  </div>;
}
