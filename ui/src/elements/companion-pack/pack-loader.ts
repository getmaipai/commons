import type { Affine, Region } from "./geometry";
import type { CompanionPackData, PackClip } from "./types";

/** Straight RGBA pixels of a decoded picture. */
export type Raster = { w: number; h: number; data: Uint8ClampedArray };
export type PackIO = {
  bytes(url: string): Promise<Uint8Array>;
  raster(url: string): Promise<Raster>;
  inflate(data: Uint8Array): Promise<Uint8Array>;
};

async function inflateBrowser(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function rasterBrowser(url: string): Promise<Raster> {
  const image = new Image();
  image.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Could not load the picture ${url}. Check the pack folder is served.`));
    image.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("A 2D canvas is needed to read the pack pictures.");
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  return { w: pixels.width, h: pixels.height, data: pixels.data };
}
const browserIO: PackIO = {
  async bytes(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not load ${url} (${response.status}). Check the pack folder is served.`);
    return new Uint8Array(await response.arrayBuffer());
  },
  raster: rasterBrowser,
  inflate: inflateBrowser,
};
let io: PackIO = browserIO;
/** Tests and non-browser hosts replace the file, picture and inflate steps (the inflate fallback path). */
export function setPackIO(next: Partial<PackIO>): () => void {
  const previous = io; io = { ...io, ...next };
  return () => { io = previous; };
}

const join = (base: string, file: string) => new URL(file, new URL(base.endsWith("/") ? base : `${base}/`, pageBase())).href;
const pageBase = () => (typeof window !== "undefined" && /^https?:/.test(window.location.href) ? window.location.href : "http://localhost/");
const json = async <T>(url: string): Promise<T> => JSON.parse(new TextDecoder().decode(await io.bytes(url))) as T;
async function int16(url: string): Promise<Int16Array> {
  const raw = await io.inflate(await io.bytes(url));
  const copy = new Uint8Array(raw.length); copy.set(raw);
  return new Int16Array(copy.buffer, 0, copy.length >> 1);
}
const redPlane = (r: Raster): Float32Array => {
  const out = new Float32Array(r.w * r.h);
  for (let i = 0; i < out.length; i++) out[i] = r.data[i * 4]! / 255;
  return out;
};

export type Stat = { mean: number[]; sd: number };
type TileMeta = { tw: number; th: number; cols: number; base: number; ts: number[] };
export type WarpMouth = TileMeta & {
  kind: "warp"; tx: number; ty: number; region: Region; flowHalf: [number, number]; flowScale: number;
  atlas: Raster; weight: Float32Array; flow: Int16Array; rest: Raster; core: number[]; ring: number[];
};
export type TileMouth = TileMeta & {
  kind: "tile"; box: [number, number, number, number]; atlas: Raster; mask: Float32Array;
  ring: number[]; core: number[]; ringRef: Stat; coreRef: Stat; tile0: Uint8ClampedArray;
};
export type MouthSet = WarpMouth | TileMouth;
export type HeadData = { region: Region; flowHalf: [number, number]; flowScale: number; poses: string[]; weight: Float32Array; flow: Int16Array };
export type EyesData = { region: Region; closed: Raster; half: Raster; ref: Raster; pts: number[] };
export type EmotionKindData = { flow: Int16Array; patch: Raster; ease: [number, number]; full: number };
export type EmotionData = { region: Region; kinds: Record<string, EmotionKindData> };
export type Track = { m: Affine[]; res: number[] };
export type LoadedPack = {
  id: string; calm?: MouthSet; head?: HeadData; eyes?: EyesData; emotion?: EmotionData;
  tracks: Record<string, Track>; life: Record<string, number>; loadShout(): Promise<MouthSet | undefined>; shout?: MouthSet;
};

/** Mean and standard deviation of the luma over listed (x, y) pairs of an RGBA tile. */
export function tileStat(rgba: Uint8ClampedArray, tw: number, list: number[]): Stat {
  const mean = [0, 0, 0]; let l = 0; let ll = 0; const n = Math.max(1, list.length / 2);
  for (let i = 0; i < list.length; i += 2) {
    const q = (list[i + 1]! * tw + list[i]!) * 4;
    for (let ch = 0; ch < 3; ch++) mean[ch]! += rgba[q + ch]!;
    const v = 0.3 * rgba[q]! + 0.59 * rgba[q + 1]! + 0.11 * rgba[q + 2]!; l += v; ll += v * v;
  }
  return { mean: mean.map((v) => v / n), sd: Math.sqrt(Math.max(1, ll / n - (l / n) ** 2)) };
}

/** Copies tile 0 (the closed mouth) out of an atlas. */
function firstTile(atlas: Raster, tw: number, th: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(tw * th * 4);
  for (let y = 0; y < th; y++) out.set(atlas.data.subarray(y * atlas.w * 4, y * atlas.w * 4 + tw * 4), y * tw * 4);
  return out;
}

type WarpMeta = TileMeta & { tx: number; ty: number; region: Region; flowHalf: [number, number]; flowScale: number };
type CartoonMeta = TileMeta & { box: [number, number, number, number] };

export async function loadMouthSet(base: string, dir: string, warp: boolean): Promise<MouthSet> {
  const root = join(base, `${dir}/`);
  if (warp) {
    const meta = await json<WarpMeta>(join(root, "meta.json"));
    const [atlas, weightPic, rest, samples, flow] = await Promise.all([
      io.raster(join(root, "atlas.webp")), io.raster(join(root, "weight.webp")), io.raster(join(root, "rest.webp")),
      io.raster(join(root, "samples.webp")), int16(join(root, "flow.bin.z")),
    ]);
    const core: number[] = []; const ring: number[] = [];
    for (let y = 0; y < meta.th; y += 2) {
      for (let x = 0; x < meta.tw; x += 2) {
        const q = (y * meta.tw + x) * 4;
        if (samples.data[q]! > 128) core.push(x, y);
        if (samples.data[q + 1]! > 128) ring.push(x, y);
      }
    }
    return { kind: "warp", ...meta, atlas, weight: redPlane(weightPic), flow, rest, core, ring };
  }
  const meta = await json<CartoonMeta>(join(root, "meta.json"));
  const [atlas, alpha] = await Promise.all([io.raster(join(root, "atlas.webp")), io.raster(join(root, "alpha.webp"))]);
  const mask = redPlane(alpha); const ring: number[] = []; const core: number[] = [];
  for (let y = 2; y < meta.th - 2; y += 3) {
    for (let x = 2; x < meta.tw - 2; x += 3) {
      const a = mask[y * meta.tw + x]!;
      if (a < 0.01) ring.push(x, y); else if (a > 0.97) core.push(x, y);
    }
  }
  const tile0 = firstTile(atlas, meta.tw, meta.th);
  return { kind: "tile", ...meta, atlas, mask, ring, core, tile0, ringRef: tileStat(tile0, meta.tw, ring), coreRef: tileStat(tile0, meta.tw, core) };
}

export async function loadHead(base: string, dir: string): Promise<HeadData> {
  const root = join(base, `${dir}/`);
  const meta = await json<Omit<HeadData, "weight" | "flow">>(join(root, "meta.json"));
  const [weightPic, flow] = await Promise.all([io.raster(join(root, "weight.webp")), int16(join(root, "flow.bin.z"))]);
  return { region: meta.region, flowHalf: meta.flowHalf, flowScale: meta.flowScale, poses: meta.poses, weight: redPlane(weightPic), flow };
}

export async function loadEyes(base: string, dir: string): Promise<EyesData> {
  const root = join(base, `${dir}/`);
  const meta = await json<{ region: Region }>(join(root, "meta.json"));
  const [closed, half, ref, ring] = await Promise.all(["closed", "half", "ref", "ring"].map((name) => io.raster(join(root, `${name}.webp`))));
  const [, , W, H] = meta.region; const pts: number[] = [];
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (ring!.data[(y * W + x) * 4]! > 128) pts.push(x, y);
  return { region: meta.region, closed: closed!, half: half!, ref: ref!, pts };
}

export async function loadEmotion(base: string, dir: string, only?: string[]): Promise<EmotionData> {
  const root = join(base, `${dir}/`);
  const meta = await json<{ region: Region; kinds: Record<string, { resEase?: [number, number]; flowFull?: number }> }>(join(root, "meta.json"));
  const kinds: Record<string, EmotionKindData> = {};
  await Promise.all(Object.keys(meta.kinds).filter((kind) => !only || only.includes(kind)).map(async (kind) => {
    const [flow, patch] = await Promise.all([int16(join(root, `${kind}.flow.bin.z`)), io.raster(join(root, `${kind}.webp`))]);
    kinds[kind] = { flow, patch, ease: meta.kinds[kind]!.resEase ?? [0.15, 0.95], full: meta.kinds[kind]!.flowFull ?? 1 };
  }));
  return { region: meta.region, kinds };
}

const trackName = (clip: PackClip) => clip.trackFile ?? clip.file.replace(/\.phone\.mp4$|\.mp4$/, ".track.json");
export async function loadTracks(base: string, pack: CompanionPackData): Promise<Record<string, Track>> {
  const out: Record<string, Track> = {}; const byFile = new Map<string, Promise<Track | undefined>>();
  const clips = Object.values(pack.states).flat();
  await Promise.all(clips.map(async (clip) => {
    const file = trackName(clip);
    if (!byFile.has(file)) byFile.set(file, json<Track>(join(base, file)).catch(() => undefined));
    const track = await byFile.get(file);
    if (track) out[clip.id] = track;
  }));
  return out;
}

/**
 * Loads everything the speaking layers need. The calm mouth set, head, eyes, emotion pictures and head tracks load now;
 * the shout mouth set loads on demand (`loadShout`) because the cartoon atlases are tens of megabytes of pixels.
 * A missing optional folder logs one warning and that layer stays off.
 */
export async function loadPackLayers(pack: CompanionPackData, base: string, warn: (message: string) => void = () => undefined): Promise<LoadedPack> {
  const warp = Boolean(pack.mouth?.warp);
  const optional = async <T>(label: string, task: Promise<T> | undefined): Promise<T | undefined> => {
    try { return await task; } catch (error) { warn(`${label} layer off: ${String(error)}`); return undefined; }
  };
  const mouthDir = pack.mouth?.calm?.dir ?? "mouth/calm";
  const [calm, head, eyes, emotion, tracks] = await Promise.all([
    optional("mouth", loadMouthSet(base, mouthDir, warp)),
    pack.head ? optional("head", loadHead(base, pack.head.dir)) : undefined,
    pack.eyes ? optional("eyes", loadEyes(base, pack.eyes.dir)) : undefined,
    pack.emotion ? optional("emotion", loadEmotion(base, pack.emotion.dir, pack.emotion.kinds)) : undefined,
    loadTracks(base, pack),
  ]);
  let shoutTask: Promise<MouthSet | undefined> | undefined;
  const loaded: LoadedPack = {
    id: pack.id ?? "", calm, head, eyes, emotion, tracks, life: pack.life ?? {},
    loadShout() {
      if (!pack.mouth?.shout) return Promise.resolve(undefined);
      shoutTask ??= optional("shout mouth", loadMouthSet(base, pack.mouth.shout.dir, warp)).then((set) => { loaded.shout = set; return set; });
      return shoutTask;
    },
  };
  return loaded;
}
