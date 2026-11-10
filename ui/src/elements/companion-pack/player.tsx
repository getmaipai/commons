import { useEffect, useRef, useState } from "react";
import { createSequencer, planSwitch, restHoldMs } from "./sequencer";
import { stackedAlphaRendererFactory, type StackedAlphaRenderer } from "./stacked-alpha";
import type { CompanionPackData, PackClip, PackState, PlayerFrame, PlayerLayer, PlayerTier } from "./types";

export type CompanionPackPlayerProps = {
  pack: CompanionPackData;
  baseUrl: string;
  state: PackState;
  tier?: PlayerTier | "auto";
  size?: number | string;
  seed?: number;
  reducedMotion?: boolean;
  paused?: boolean;
  onStateSettled?: (state: PackState, clipId: string) => void;
  layers?: PlayerLayer[];
};

type LoadedClip = { clip: PackClip; video: HTMLVideoElement; state: PackState; ready: boolean };
type PendingSwitch = { item?: LoadedClip; state: PackState; untilFrame: number };
type Controller = { setState(state: PackState): void; setPaused(paused: boolean): void; setLayers(layers: PlayerLayer[]): void };
export let packVideoFactory = () => document.createElement("video");
export function setPackVideoFactory(factory: typeof packVideoFactory): () => void {
  const previous = packVideoFactory;
  packVideoFactory = factory;
  return () => { packVideoFactory = previous; };
}
const STATES: PackState[] = ["idle", "listen", "think", "speak"];
const EMPTY_LAYERS: PlayerLayer[] = [];
Object.freeze(EMPTY_LAYERS);
// A relative base ("/packs/man/") must resolve against the page, not fail as a bare URL base (a test or embedded page may be about:blank).
const pageBase = () => (typeof window !== "undefined" && /^https?:/.test(window.location.href) ? window.location.href : "http://localhost/");
const absolute = (base: string, file: string) => {
  const root = new URL(base.endsWith("/") ? base : `${base}/`, pageBase());
  return new URL(file, root).href;
};

export function CompanionPackPlayer({
  pack, baseUrl, state, tier = "auto", size, seed = 1, reducedMotion, paused = false,
  onStateSettled, layers = EMPTY_LAYERS,
}: CompanionPackPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<Controller | null>(null);
  const stateRef = useRef(state);
  const pausedRef = useRef(paused);
  const layersRef = useRef(layers);
  const settledRef = useRef(onStateSettled);
  const seedRef = useRef(seed);
  stateRef.current = state;
  pausedRef.current = paused;
  layersRef.current = layers;
  settledRef.current = onStateSettled;
  seedRef.current = seed;
  const [staticMode, setStaticMode] = useState(Boolean(reducedMotion) || paused || (typeof size === "number" && size <= 36));
  const [ready, setReady] = useState(false);
  const [currentClipId, setCurrentClipId] = useState("");
  const tierRef = useRef<PlayerTier>("desktop");

  useEffect(() => {
    const query = window.matchMedia("(max-width: 640px)");
    const update = () => {
      tierRef.current = tier === "auto"
        ? (query.matches || window.devicePixelRatio * window.innerWidth <= 640 ? "phone" : "desktop")
        : tier;
      setStaticMode(Boolean(reducedMotion) || paused || (typeof size === "number" && size <= 36));
    };
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, [tier, reducedMotion, paused, size]);

  useEffect(() => {
    if (staticMode) { setReady(true); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    // The video tile is square (480 desktop, 320 phone): size the drawing buffer to it, the css size only scales it.
    canvas.width = canvas.height = tierRef.current === "phone" ? 320 : 480;
    let renderer: StackedAlphaRenderer;
    try { renderer = stackedAlphaRendererFactory(canvas, absolute(baseUrl, pack.rest)); }
    catch {
      const still = new Image();
      still.onload = () => canvas.getContext("2d")?.drawImage(still, 0, 0, canvas.width, canvas.height);
      still.src = absolute(baseUrl, pack.rest);
      setReady(true);
      return () => { still.onload = null; };
    }
    if (!renderer.gl) {
      const still = new Image();
      still.src = absolute(baseUrl, pack.rest);
      still.onload = () => {
        const context = canvas.getContext("2d");
        context?.drawImage(still, 0, 0, canvas.width, canvas.height);
      };
      setReady(true);
      renderer.dispose();
      return () => renderer.dispose();
    }

    const clips: LoadedClip[] = [];
    const sequencer = createSequencer(pack.states, seedRef.current);
    let active: LoadedClip | undefined;
    let pending: PendingSwitch | undefined;
    let raf = 0;
    let hidden = document.hidden;
    let isPaused = pausedRef.current;
    let disposed = false;
    let loading = 0;
    let holdingUntil = 0;
    let holding = false;
    let lastDrawTime = -Infinity;
    let lastVideoTime = -1;
    let frameArrived = false;
    let layersToDispose = new Set<PlayerLayer>();
    let requestedState = stateRef.current;
    let initializedState = requestedState;
    const frameCap = () => tierRef.current === "phone" ? 30 : 60;

    const targetFile = (clip: PackClip) => tierRef.current === "phone" && clip.phone ? clip.phone : clip.file;
    const createVideo = (clip: PackClip, clipState: PackState) => {
      if (clips.some((item) => item.clip.id === clip.id && item.state === clipState)) return;
      const video = packVideoFactory();
      video.dataset.packFile = targetFile(clip);
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      try {
        if (new URL(baseUrl, window.location.href).origin !== window.location.origin) video.crossOrigin = "anonymous";
      } catch { /* Relative paths inherit the document origin. */ }
      const item: LoadedClip = { clip, video, state: clipState, ready: false };
      clips.push(item);
      if (video.readyState >= 2) item.ready = true;
      loading += 1;
      const loaded = () => { item.ready = true; loading = Math.max(0, loading - 1); setReady(true); };
      const failed = () => { loading = Math.max(0, loading - 1); };
      video.addEventListener("canplay", loaded, { once: true });
      video.addEventListener("canplay", () => {
        if (pending?.item === item && active) {
          const urgent = pending.state === "speak" || pending.state === "listen";
          if (urgent) {
            const frame = Math.round(active.video.currentTime * active.clip.fps);
            const plan = planSwitch({ frame, clip: active.clip, nextClip: item.clip, fps: active.clip.fps, urgent: true });
            pending.untilFrame = plan.untilFrame;
            active.video.playbackRate = plan.speedUp;
          } else pending.untilFrame = active.clip.frames - 1;
        }
      });
      video.addEventListener("error", failed, { once: true });
      video.setAttribute("src", absolute(baseUrl, targetFile(clip)));
      video.load();
    };
    const pump = () => {
      for (const clipState of STATES) {
        if (loading >= 2) break;
        for (const clip of pack.states[clipState]) {
          if (loading >= 2) break;
          if (!clips.some((item) => item.clip.id === clip.id && item.state === clipState)) createVideo(clip, clipState);
        }
      }
    };
    const availableFor = (clipState: PackState) => clips.filter((item) => item.state === clipState);
    const readyFor = (clipState: PackState) => clips.filter((item) => item.state === clipState && item.ready);
    const selectReady = (clipState: PackState) => {
      const available = availableFor(clipState);
      if (!available.length) return undefined;
      const attempts = pack.states[clipState]?.length ?? 0;
      for (let index = 0; index < attempts; index += 1) {
        const proposed = sequencer.next(clipState);
        const selected = available.find((item) => item.clip.id === proposed?.id);
        if (selected) return selected;
      }
      return available[0];
    };
    const startClip = (item: LoadedClip, clipState: PackState) => {
      active?.video.pause();
      active = item;
      pending = undefined;
      holding = false;
      holdingUntil = 0;
      item.state = clipState;
      item.video.playbackRate = 1;
      item.video.currentTime = item.clip.rest.first / item.clip.fps;
      if (item.video.requestVideoFrameCallback) item.video.requestVideoFrameCallback(() => { frameArrived = true; });
      lastVideoTime = -1;
      frameArrived = true;
      setCurrentClipId(item.clip.id);
      if (!hidden && !pausedRef.current) void item.video.play().catch(() => undefined);
      settledRef.current?.(clipState, item.clip.id);
    };
    const requestChange = (nextState: PackState) => {
      requestedState = nextState;
      pending = undefined;
      if (active) active.video.playbackRate = 1;
      const next = selectReady(nextState);
      if (!next) {
        pending = { state: nextState, untilFrame: active?.clip.rest.last ?? 0 };
        if (active && (nextState === "speak" || nextState === "listen")) active.video.playbackRate = 8;
        pump();
        return;
      }
      if (!next.ready) { pending = { state: nextState, untilFrame: active?.clip.rest.last ?? 0 }; pump(); return; }
      if (!active || holding) { startClip(next, nextState); return; }
      if (!active.ready) { pending = { item: next, state: nextState, untilFrame: active.clip.rest.last }; return; }
      const frame = Math.round(active.video.currentTime * active.clip.fps);
      const urgent = nextState === "speak" || nextState === "listen";
      if (!urgent) {
        pending = { item: next, state: nextState, untilFrame: active.clip.frames - 1 };
        return;
      }
      const plan = planSwitch({ frame, clip: active.clip, nextClip: next.clip, fps: active.clip.fps, urgent });
      pending = { item: next, state: nextState, untilFrame: plan.untilFrame };
      active.video.playbackRate = plan.speedUp;
    };
    const drawFrame = (now: number) => {
      if (!active || !renderer.gl) return;
      const video = active.video;
      const frameIndex = Math.round(video.currentTime * active.clip.fps);
      const hasNewFrame = video.currentTime !== lastVideoTime || frameArrived;
      if (video.readyState >= 2 && hasNewFrame && now - lastDrawTime >= 1000 / frameCap()) {
        renderer.draw(video);
        lastDrawTime = now;
        lastVideoTime = video.currentTime;
        frameArrived = false;
        const frame: PlayerFrame = {
          gl: renderer.gl, canvas, clipId: active.clip.id, mediaTime: video.currentTime,
          frameIndex, state: active.state, tier: tierRef.current,
        };
        layersRef.current.forEach((layer) => layer.draw(frame));
      }
      if (pending && !pending.item && (frameIndex >= pending.untilFrame || readyFor(pending.state).length > 0)) {
        const next = selectReady(pending.state);
        if (next) startClip(next, pending.state);
        else pump();
      }
      if (pending?.item && frameIndex >= pending.untilFrame) startClip(pending.item, pending.state);
      if (frameIndex >= active.clip.rest.last && (!pending || pending.untilFrame > active.clip.rest.last)) {
        active.video.currentTime = active.clip.rest.last / active.clip.fps;
        active.video.pause();
        active.video.playbackRate = 1;
        holding = true;
        if (!holdingUntil) holdingUntil = now + restHoldMs(active.state);
      }
      if (holding && pending?.item && frameIndex >= pending.untilFrame) startClip(pending.item, pending.state);
      if (holding && now >= holdingUntil) {
        const nextState = requestedState;
        const next = selectReady(nextState);
        if (next) startClip(next, nextState);
        else pump();
      }
    };
    const tick = (now: number) => {
      raf = 0;
      if (disposed || hidden || isPaused) return;
      drawFrame(now);
      raf = window.requestAnimationFrame(tick);
    };
    const onVisibility = () => {
      hidden = document.hidden;
      if (hidden) clips.forEach(({ video }) => video.pause());
      else if (!isPaused) active?.video.play().catch(() => undefined);
      if (hidden && raf) window.cancelAnimationFrame(raf);
      if (!hidden && !isPaused && !raf) raf = window.requestAnimationFrame(tick);
    };
    const firstIdle = sequencer.next("idle") ?? pack.states.idle[0];
    if (firstIdle) createVideo(firstIdle, "idle");
    const first = clips[0];
    first?.video.addEventListener("canplay", () => {
      if (!active) {
        const item = clips.find((clip) => clip.ready && clip.state === "idle");
        if (item) startClip(item, "idle");
      }
      pump();
    });
    document.addEventListener("visibilitychange", onVisibility);
    pump();
    const controller: Controller = {
      setState(nextState) {
        if (nextState === initializedState) return;
        initializedState = nextState;
        requestChange(nextState);
      },
      setPaused(nextPaused) {
        isPaused = nextPaused;
        if (nextPaused) {
          clips.forEach(({ video }) => video.pause());
          if (raf) window.cancelAnimationFrame(raf);
          raf = 0;
        } else if (!hidden) {
          active?.video.play().catch(() => undefined);
          if (!raf) raf = window.requestAnimationFrame(tick);
        }
      },
      setLayers(nextLayers) {
        const nextSet = new Set(nextLayers);
        layersToDispose.forEach((layer) => { if (!nextSet.has(layer)) layer.dispose?.(); });
        layersToDispose = nextSet;
      },
    };
    layersToDispose = new Set(layersRef.current);
    controllerRef.current = controller;
    if (!hidden && !pausedRef.current) raf = window.requestAnimationFrame(tick);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (raf) window.cancelAnimationFrame(raf);
      clips.forEach(({ video }) => { video.pause(); video.removeAttribute("src"); video.load(); });
      layersToDispose.forEach((layer) => layer.dispose?.());
      renderer.dispose();
      controllerRef.current = null;
    };
  }, [pack, baseUrl, staticMode, tier]);

  useEffect(() => {
    controllerRef.current?.setState(state);
    controllerRef.current?.setPaused(paused);
    controllerRef.current?.setLayers(layers);
  }, [state, paused, layers]);

  const stillUrl = absolute(baseUrl, pack.rest);
  const dimension = typeof size === "number" ? `${size}px` : size ?? "100%";
  return <div style={{ width: dimension, height: dimension, position: "relative" }} data-pack-player data-clip={currentClipId}>
    {staticMode ? <img src={stillUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <canvas ref={canvasRef} aria-hidden="true" style={{ width: "100%", height: "100%", display: "block" }} data-ready={ready} />}
  </div>;
}
