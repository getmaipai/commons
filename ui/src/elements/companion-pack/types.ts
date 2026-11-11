import type { VoiceLayerData } from "./voice-layer";
/** Clip data follows spec/gen/ts/companion-pack.ts; player needs only these fields. */
export type PackState = "idle" | "listen" | "think" | "speak";
export type GestureKind = "nod" | "tilt" | "glance" | "settle";
export type PackClip = {
  id: string;
  file: string;
  phone?: string;
  fps: number;
  frames: number;
  rest: { first: number; last: number };
  weight?: number;
  gesture?: { kind: GestureKind; amp: 1 | 2 | 3 };
  /** Per-frame head track (clips/<name>.track.json: affines `m` and a residual `res`), relative to the pack folder. */
  trackFile?: string;
};
export type CompanionPackData = {
  /** Absent for a still-plus-parts pack (MAKER-G): the player then draws `rest` (or `voice.base`) and the parts on a 2D canvas, with no video. */
  states?: Record<PackState, PackClip[]>;
  voice?: VoiceLayerData;
  rest: string;
  /** Frame the layer coordinates are pixels of (spec `source`); absent means { x0: 224, size: 576 }. */
  source?: { x0: number; size: number };
  /** Pack id; picks the speaking render profile (man, clay, pixar) when no profile is given. */
  id?: string;
  /** Speaking layers (PACK-05); every part is optional and a missing folder simply turns that layer off. */
  mouth?: { warp?: boolean; calm?: { dir: string }; shout?: { dir: string } };
  head?: { dir: string };
  eyes?: { dir: string };
  emotion?: { dir: string; kinds?: string[] };
  life?: Record<string, number>;
};
export type PlayerTier = "desktop" | "phone";
export type PlayerFrame = {
  gl: WebGLRenderingContext;
  canvas: HTMLCanvasElement;
  clipId: string;
  mediaTime: number;
  frameIndex: number;
  state: PackState;
  tier: PlayerTier;
};
export type PlayerLayer = { draw(frame: PlayerFrame): void; dispose?(): void };
