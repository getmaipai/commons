import { useEffect, useRef, useState } from "react";
import type { SpeechInput } from "./speech";
import type { CompanionPackData, PackState } from "./types";
import { cueEnergyAt, drawVoiceFrame, envelopeAt, VoiceRuntime } from "./voice-layer";
import type { VoiceImages } from "./voice-layer";

export type StillPartsPlayerProps = {
  pack: CompanionPackData;
  baseUrl: string;
  state: PackState;
  size?: number | string;
  reducedMotion?: boolean;
  paused?: boolean;
  speech?: SpeechInput;
  /** Milliseconds one frame took to draw. */
  onSpeechFrame?: (ms: number) => void;
  tier?: "desktop" | "phone" | "auto";
};

/** Loads a picture; tests replace it so no network or image decoder is needed. */
export let loadVoiceImage = (url: string): Promise<CanvasImageSource> => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error(`Could not load ${url}; check the pack folder has this picture.`));
  image.src = url;
});
export function setVoiceImageLoader(loader: typeof loadVoiceImage): () => void {
  const previous = loadVoiceImage;
  loadVoiceImage = loader;
  return () => { loadVoiceImage = previous; };
}

const TILE = 480;
const pageBase = () => (typeof window !== "undefined" && /^https?:/.test(window.location.href) ? window.location.href : "http://localhost/");
const absolute = (base: string, file: string) => new URL(file, new URL(base.endsWith("/") ? base : `${base}/`, pageBase())).href;

/**
 * Renders a still-plus-parts pack (no `states`): the base picture and the voice layer's parts on one 2D canvas, driven by the same
 * `state` and `speech` props as the video player. Reduced motion, pause and tiny sizes show the plain `rest` picture. No video, no WebGL.
 */
export function StillPartsPlayer({ pack, baseUrl, state, size, reducedMotion, paused = false, speech, onSpeechFrame, tier = "auto" }: StillPartsPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const speechRef = useRef(speech);
  const frameRef = useRef(onSpeechFrame);
  const pausedRef = useRef(paused);
  stateRef.current = state; speechRef.current = speech; frameRef.current = onSpeechFrame; pausedRef.current = paused;
  const runtimeRef = useRef<VoiceRuntime | null>(null);
  const staticMode = Boolean(reducedMotion) || paused || (typeof size === "number" && size <= 36) || !pack.voice;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const layer = pack.voice;
    const canvas = canvasRef.current;
    if (staticMode || !layer || !canvas) return;
    const phone = tier === "phone" || (tier === "auto" && window.matchMedia?.("(max-width: 640px)").matches);
    const side = phone ? 320 : TILE;
    canvas.width = canvas.height = side;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let disposed = false;
    let raf = 0;
    let last = -Infinity;
    const runtime = new VoiceRuntime(layer);
    runtimeRef.current = runtime;
    runtime.setState(stateRef.current, 0);
    let seen: PackState = stateRef.current;
    let images: VoiceImages | undefined;
    void Promise.all([
      loadVoiceImage(absolute(baseUrl, layer.base ?? pack.rest)),
      ...layer.parts.map(async (part) => [part.id, await loadVoiceImage(absolute(baseUrl, part.file))] as const),
    ]).then(([base, ...parts]) => {
      if (disposed) return;
      images = { base: base as CanvasImageSource, parts: Object.fromEntries(parts as [string, CanvasImageSource][]) };
      setReady(true);
    }).catch(() => undefined);

    const tick = (now: number) => {
      raf = window.requestAnimationFrame(tick);
      if (document.hidden || pausedRef.current || !images) return;
      const line = speechRef.current;
      const quiet = !line && stateRef.current === "idle";
      if (now - last < (phone || quiet ? 1000 / 30 : 1000 / 60) - 1) return;
      last = now;
      const t0 = performance.now();
      if (stateRef.current !== seen) { seen = stateRef.current; runtime.setState(seen, now); }
      const clock = line ? line.clock() : -1;
      const poses = runtime.step(now, {
        level: envelopeAt(line?.envelope ?? line?.loudness, clock),
        cue: cueEnergyAt(line?.cues, clock),
      });
      drawVoiceFrame(ctx, side, TILE, layer, images, poses);
      frameRef.current?.(performance.now() - t0);
    };
    raf = window.requestAnimationFrame(tick);
    return () => { disposed = true; if (raf) window.cancelAnimationFrame(raf); runtimeRef.current = null; };
  }, [pack, baseUrl, staticMode, tier]);

  const dimension = typeof size === "number" ? `${size}px` : size ?? "100%";
  return <div style={{ width: dimension, height: dimension, position: "relative" }} data-pack-player data-voice-layer>
    {staticMode
      ? <img src={absolute(baseUrl, pack.rest)} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      : <canvas ref={canvasRef} aria-hidden="true" data-ready={ready} style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", display: "block" }} />}
  </div>;
}
