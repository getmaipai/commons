/** Clip data follows spec/gen/ts/companion-pack.ts; player needs only these fields. */
export type PackState = "idle" | "listen" | "think" | "speak";
export type PackClip = {
  id: string;
  file: string;
  phone?: string;
  fps: number;
  frames: number;
  rest: { first: number; last: number };
  weight?: number;
};
export type CompanionPackData = {
  states: Record<PackState, PackClip[]>;
  rest: string;
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
