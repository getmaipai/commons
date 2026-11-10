import { FRAME_SECONDS, GAZE_MAX_SECONDS, GAZE_MIN_SECONDS } from "./constants";
import type { Cue } from "./cues";

export type LifeEvent = { channel: "brow" | "nod" | "gaze"; direction?: "L" | "R" | "U"; t0: number; duration: number; amp: number };
function rng(seed: number): () => number {
  let state = seed * 2654435761 >>> 0;
  return () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
}

export function planLife(cues: Cue[], loudness: Float32Array, seed: number): LifeEvent[] {
  const random = rng(seed); const events: LifeEvent[] = [];
  const stress = cues.filter((cue) => cue.p !== "_" && "CDEFH".includes(cue.l));
  for (const cue of stress) {
    if (random() < 0.4) continue;
    const loud = loudness[Math.floor(cue.t0 / FRAME_SECONDS)] ?? 0;
    if (random() < 0.12) {
      const jitter = 0.7 + random() * 0.6;
      events.push({ channel: "brow", t0: Math.max(0, cue.t0 - 0.06 * jitter), duration: 0.5, amp: 0.25 + random() * 0.2 });
    } else if (cue.t0 >= 0.6 && random() < (loud > 0.4 ? 0.15 : 0.07)) {
      events.push({ channel: "nod", t0: cue.t0 + 0.06 * (0.7 + random() * 0.6), duration: 1.05, amp: 0.14 + random() * 0.08 });
    }
  }
  const duration = cues[cues.length - 1]?.t1 ?? 0;
  const pauses = cues.slice(1).filter((cue, i) => cue.t0 - cues[i]!.t1 > 0.22).map((cue) => cues[cues.indexOf(cue) - 1]!.t1);
  let time = 1.2 + random() * 0.3;
  let lastDirection: string | undefined;
  while (time < duration - 0.8) {
    const snapped = pauses.find((pause) => pause > 0.6 && Math.abs(pause - time) < 1.2);
    const direction = (["L", "R", "U"] as const)[Math.floor(random() * 3)]!;
    const safeDirection = lastDirection === "L" && direction === "R" ? "U"
      : lastDirection === "R" && direction === "L" ? "U" : direction;
    events.push({ channel: "gaze", direction: safeDirection, t0: snapped ?? time, duration: 1.2, amp: 0.3 + random() * 0.12 });
    lastDirection = safeDirection;
    time = (snapped ?? time) + GAZE_MIN_SECONDS + random() * (GAZE_MAX_SECONDS - GAZE_MIN_SECONDS);
  }
  return events.sort((a, b) => a.t0 - b.t0);
}

const EMOTION_WORDS: Record<string, RegExp> = {
  angry: /\b(stop|get out|shut up|enough|how dare|hate|damn|idiot|furious|angry|leave me|back off|don't you|mad)\b/i,
  excited: /\b(yes|wow|awesome|amazing|great|congrat|love|won|finally|hooray|yay|fantastic|let's go|incredible)\b/i,
  alarmed: /\b(help|look out|watch out|run|fire|danger|oh no|careful|behind you|quick|hurry|no no|emergency)\b/i,
  sad: /\b(sorry|miss you|please|cry|sad|lost|gone|alone|wish|goodbye)\b/i,
};

export function emotionFor(text: string, tags: string[] = [], loud = false): "angry" | "excited" | "alarmed" | "sad" | null {
  const taggedText = `${text} ${tags.join(" ")}`;
  for (const kind of ["alarmed", "angry", "sad", "excited"] as const) {
    const pattern = EMOTION_WORDS[kind];
    if (pattern && pattern.test(taggedText)) return kind;
  }
  return loud ? "excited" : null;
}
