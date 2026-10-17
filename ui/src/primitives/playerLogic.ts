// MEDIA-PLAYER-01: the Player's pure rules, kept apart from the component so each one is tested without a media
// element. Media Chrome (media-chrome/react, the rule 9b pick) draws the controls; these decide what the kit adds
// on top: chapters and skip, FileTube's touch gestures, resume and the Up next countdown.

/** One chapter: where it starts, in seconds, and its title. A chapter ends where the next one starts. */
export interface PlayerChapter {
  start_s: number;
  title: string;
}

/** The playback rates the rate menu offers (0.5 to 2). */
export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

/** FileTube's gesture timings. */
export const DOUBLE_TAP_SKIP_S = 15;
export const TAP_CHAIN_MS = 800;
export const HOLD_MS = 500;
export const HOLD_RATE = 2;
export const PULL_DOCK_PX = 80;
/** The keyboard's arrow seek. */
export const ARROW_SEEK_S = 5;
/** onProgress cadence while playing. */
export const PROGRESS_INTERVAL_MS = 10_000;
/** How long the resume line stays when nothing holds it open. */
export const RESUME_LINE_MS = 2_000;
/** A resume point closer than this to the start or the end is not offered. */
export const RESUME_MIN_S = 5;

/** "12:40" or "1:02:03". Negative and non-finite values read as 0:00. */
export function formatTime(seconds: number): string {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = s.toString().padStart(2, "0");
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** Chapters sorted by start, with duplicates and negative starts dropped. */
export function normalizeChapters(chapters: readonly PlayerChapter[] | undefined): PlayerChapter[] {
  const seen = new Set<number>();
  return [...(chapters ?? [])]
    .filter((c) => Number.isFinite(c.start_s) && c.start_s >= 0 && c.title.trim() !== "")
    .sort((a, b) => a.start_s - b.start_s)
    .filter((c) => (seen.has(c.start_s) ? false : (seen.add(c.start_s), true)));
}

/** The index of the chapter playing at `time`, or -1 before the first one. */
export function chapterIndexAt(chapters: readonly PlayerChapter[], time: number): number {
  let index = -1;
  for (let i = 0; i < chapters.length; i++) {
    if (chapters[i]!.start_s <= time) index = i;
    else break;
  }
  return index;
}

const INTRO = /\b(intro|opening|recap|previously)\b/i;
const CREDITS = /\b(credits|end credits|closing|outro)\b/i;

export type SkipKind = "intro" | "credits";

/** When the chapter playing at `time` is an intro or the credits (by its title), what to offer and where it goes.
 * Skip intro jumps to the next chapter's start; Skip credits jumps to the end (`duration`), which lets Up next
 * take over. Null when the chapter is neither. */
export function skipOffer(
  chapters: readonly PlayerChapter[],
  time: number,
  duration: number,
): { kind: SkipKind; to: number } | null {
  const index = chapterIndexAt(chapters, time);
  if (index < 0) return null;
  const title = chapters[index]!.title;
  const next = chapters[index + 1];
  if (INTRO.test(title) && next) return { kind: "intro", to: next.start_s };
  if (CREDITS.test(title) && Number.isFinite(duration) && duration > time) return { kind: "credits", to: duration };
  return null;
}

/** A chapters track as WebVTT text, for Media Chrome's time range (chapter segments) and the preview's chapter name. */
export function chaptersToVtt(chapters: readonly PlayerChapter[], duration: number): string {
  const end = (i: number) => chapters[i + 1]?.start_s ?? (Number.isFinite(duration) && duration > 0 ? duration : chapters[i]!.start_s + 1);
  const stamp = (s: number) => {
    const ms = Math.round((s % 1) * 1000).toString().padStart(3, "0");
    const t = Math.floor(s);
    const hh = Math.floor(t / 3600).toString().padStart(2, "0");
    const mm = Math.floor((t % 3600) / 60).toString().padStart(2, "0");
    const ss = (t % 60).toString().padStart(2, "0");
    return `${hh}:${mm}:${ss}.${ms}`;
  };
  const cues = chapters.map((c, i) => `${i + 1}\n${stamp(c.start_s)} --> ${stamp(end(i))}\n${c.title.replace(/-->/g, "->")}`);
  return ["WEBVTT", ...cues].join("\n\n") + "\n";
}

/** Which third of the picture a tap landed in. */
export type TapZone = "left" | "center" | "right";
export function tapZone(x: number, width: number): TapZone {
  if (width <= 0) return "center";
  const f = x / width;
  return f < 1 / 3 ? "left" : f > 2 / 3 ? "right" : "center";
}

/** FileTube's double-tap chain: the second tap on a side within 800 ms skips 15 s, and every further tap on the same
 * side inside the window (measured from the previous tap) adds another 15 s. A tap on the other side, the centre or
 * after the window starts over. `tap` returns the seconds to skip now (negative for back), 0 when the tap only arms. */
export class TapChain {
  private last: { zone: TapZone; at: number } | null = null;
  private chained = 0;

  tap(zone: TapZone, now: number): number {
    const prev = this.last;
    this.last = { zone, at: now };
    if (zone === "center") {
      this.chained = 0;
      return 0;
    }
    const inChain = prev !== null && prev.zone === zone && now - prev.at <= TAP_CHAIN_MS;
    if (!inChain) {
      this.chained = 0;
      return 0;
    }
    this.chained += 1;
    return zone === "left" ? -DOUBLE_TAP_SKIP_S : DOUBLE_TAP_SKIP_S;
  }

  /** The total skipped by the running chain, for the "+30 s" label. */
  get total(): number {
    return this.chained * DOUBLE_TAP_SKIP_S;
  }

  reset(): void {
    this.last = null;
    this.chained = 0;
  }
}

/** Clamp a seek target into the playable range. */
export function clampTime(t: number, duration: number): number {
  const max = Number.isFinite(duration) && duration > 0 ? duration : Number.POSITIVE_INFINITY;
  return Math.min(Math.max(0, t), max);
}

/** Whether a stored position should be offered as a resume point. */
export function shouldResume(position: number | undefined, duration: number, completed = false): boolean {
  if (completed || position === undefined || !Number.isFinite(position) || position < RESUME_MIN_S) return false;
  if (Number.isFinite(duration) && duration > 0 && duration - position < RESUME_MIN_S) return false;
  return true;
}

/** Why onProgress fired. */
export type ProgressReason = "interval" | "pause" | "seek" | "unload" | "ended";
