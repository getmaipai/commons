// VIDEO-STUDIO-04 (K4): what TrackStudio draws inside itself from the sources the host hands it: waveform peaks (decodeAudioData) and a
// strip of thumbnails (a scratch <video> seeking and drawing to a canvas). Everything here is owned by the Element's lifetime: the
// scratch video is removed and every result dropped when the Element unmounts or the clip relocks.

/** One bar per this many seconds of source. */
export const PEAKS_PER_SECOND = 20;
export const PEAKS_MAX = 3000;
/** One thumbnail per this many seconds of source, 96 by 54 pixels. */
export const THUMB_STEP_S = 1;
export const THUMB_W = 96;
export const THUMB_H = 54;
export const THUMBS_MAX = 120;

/** The loudest sample of each of `bars` equal slices, scaled so the loudest bar is 1. A silent file stays flat (all zeros). */
export function computePeaks(samples: Float32Array, bars: number): number[] {
  const n = Math.max(1, Math.floor(bars));
  const out = new Array<number>(n).fill(0);
  if (samples.length === 0) return out;
  const per = samples.length / n;
  let max = 0;
  for (let i = 0; i < n; i++) {
    const from = Math.floor(i * per);
    const to = Math.min(samples.length, Math.max(from + 1, Math.floor((i + 1) * per)));
    let peak = 0;
    for (let j = from; j < to; j++) { const v = Math.abs(samples[j]!); if (v > peak) peak = v; }
    out[i] = peak;
    if (peak > max) max = peak;
  }
  return max > 0 ? out.map((v) => v / max) : out;
}

/** The bars of `peaks` (covering the whole source) between `inS` and `outS`, resampled to `count` bars. */
export function sliceBars(peaks: readonly number[], sourceS: number, inS: number, outS: number, count: number): number[] {
  const n = Math.max(0, Math.floor(count));
  if (n === 0 || peaks.length === 0 || sourceS <= 0) return new Array<number>(n).fill(0);
  const per = peaks.length / sourceS;
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const a = (inS + ((outS - inS) * i) / n) * per;
    const b = (inS + ((outS - inS) * (i + 1)) / n) * per;
    const from = Math.max(0, Math.floor(a));
    const to = Math.min(peaks.length, Math.max(from + 1, Math.ceil(b)));
    let peak = 0;
    for (let j = from; j < to; j++) if (peaks[j]! > peak) peak = peaks[j]!;
    out[i] = peak;
  }
  return out;
}

export interface DecodedPeaks { peaks: number[]; duration: number }

/** Fetch a source and cut its sound to peaks. Rejects when the file cannot be fetched or decoded (the lane then says so; it still plays). */
export async function decodePeaks(src: string, signal: AbortSignal): Promise<DecodedPeaks> {
  const reply = await fetch(src, { signal, credentials: "same-origin" });
  if (!reply.ok) throw new Error(`peaks: ${reply.status}`);
  const bytes = await reply.arrayBuffer();
  if (signal.aborted) throw new DOMException("aborted", "AbortError");
  const Offline = typeof OfflineAudioContext !== "undefined" ? OfflineAudioContext : (globalThis as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (!Offline) throw new Error("peaks: no audio decoder");
  const ctx = new Offline(1, 1, 44100);
  const buffer = await ctx.decodeAudioData(bytes);
  if (signal.aborted) throw new DOMException("aborted", "AbortError");
  const bars = Math.min(PEAKS_MAX, Math.max(8, Math.ceil(buffer.duration * PEAKS_PER_SECOND)));
  // Fold every channel into one by taking the loudest sample at each position.
  const length = buffer.length;
  const folded = new Float32Array(length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) { const v = Math.abs(data[i]!); if (v > folded[i]!) folded[i] = v; }
  }
  return { peaks: computePeaks(folded, bars), duration: buffer.duration };
}

export interface ThumbRun { frames: string[]; duration: number; ms: number }

/** Draw a strip for one source: a scratch <video> seeks to the middle of each second and a canvas keeps a 96 by 54 JPEG. `onFrame` fires after each frame so
 * the strip fills in as it is made. The scratch video is removed at the end, whatever the result. */
export async function makeThumbnails(src: string, signal: AbortSignal, onFrame: (index: number, url: string, duration: number) => void, now: () => number = () => performance.now()): Promise<ThumbRun> {
  const started = now();
  const video = document.createElement("video");
  video.muted = true;
  video.preload = "auto";
  video.playsInline = true;
  video.disablePictureInPicture = true;
  video.disableRemotePlayback = true;
  video.setAttribute("aria-hidden", "true");
  video.hidden = true;
  const canvas = document.createElement("canvas");
  canvas.width = THUMB_W;
  canvas.height = THUMB_H;
  const ctx = canvas.getContext("2d");
  const frames: string[] = [];
  const cleanup = () => { try { video.pause(); } catch { /* gone */ } video.removeAttribute("src"); try { video.load(); } catch { /* jsdom */ } video.remove(); };
  try {
    if (!ctx) throw new Error("thumbs: no canvas");
    document.body.appendChild(video);
    video.src = src;
    await once(video, "loadedmetadata", signal);
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const count = Math.min(THUMBS_MAX, Math.max(1, Math.ceil(duration / THUMB_STEP_S)));
    for (let i = 0; i < count; i++) {
      if (signal.aborted) throw new DOMException("aborted", "AbortError");
      video.currentTime = Math.min(Math.max(0, duration - 0.05), (i + 0.5) * THUMB_STEP_S);
      await once(video, "seeked", signal);
      // Cover the 96 by 54 box without stretching the picture.
      const vw = video.videoWidth || THUMB_W;
      const vh = video.videoHeight || THUMB_H;
      const scale = Math.max(THUMB_W / vw, THUMB_H / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      ctx.drawImage(video, (THUMB_W - dw) / 2, (THUMB_H - dh) / 2, dw, dh);
      const url = canvas.toDataURL("image/jpeg", 0.6);
      frames.push(url);
      onFrame(i, url, duration);
    }
    return { frames, duration, ms: Math.round(now() - started) };
  } finally {
    cleanup();
  }
}

function once(el: HTMLMediaElement, name: string, signal: AbortSignal, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => finish(new DOMException("aborted", "AbortError"));
    const onError = () => finish(new Error(`media: ${el.error?.message ?? "error"}`));
    const timer = setTimeout(() => finish(new Error("media: timed out")), timeoutMs);
    function finish(err?: Error) {
      clearTimeout(timer);
      el.removeEventListener(name, ok);
      el.removeEventListener("error", onError);
      signal.removeEventListener("abort", onAbort);
      if (err) reject(err); else resolve();
    }
    const ok = () => finish();
    el.addEventListener(name, ok, { once: true });
    el.addEventListener("error", onError, { once: true });
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
