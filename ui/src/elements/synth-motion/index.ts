export type GestureKind = "nod" | "tilt" | "glance" | "settle";
export type GestureClip = { id: string; kind: GestureKind; amp: 1 | 2 | 3; frames: number; fps: number; weight?: number };
export type Accent = { t: number; strength: number; phraseStart: boolean };
export type ScheduledGesture = { at: number; clipId: string };
export const SETTINGS = { frameMs: 25, hopMs: 10, minHz: 70, maxHz: 400, voicedCorrelation: 0.5, rmsFloor: 0.008, smoothFrames: 5, baselineMs: 400, accentRise: 0.12, energyMedianMs: 200, minAccentGapMs: 350, phraseSilenceMs: 250, cooldownMs: 600, leadMs: 120, replyGuardMs: 200, idleMinMs: 8000, idleMaxMs: 15000 } as const;
export function pitchAccents(samples: Float32Array, sampleRate: number): Accent[] {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) return [];
  const frame = Math.round(sampleRate * SETTINGS.frameMs / 1000), hop = Math.round(sampleRate * SETTINGS.hopMs / 1000);
  const minLag = Math.floor(sampleRate / SETTINGS.maxHz), maxLag = Math.ceil(sampleRate / SETTINGS.minHz);
  const raw: { t: number; f0: number; rms: number }[] = [];
  for (let start = 0; start + frame <= samples.length; start += hop) {
    let energy = 0; for (let i = 0; i < frame; i++) energy += samples[start + i]! ** 2;
    const rms = Math.sqrt(energy / frame); let best = 0, lagBest = 0;
    if (rms >= SETTINGS.rmsFloor) for (let lag = minLag; lag <= Math.min(maxLag, frame - 1); lag++) {
      let ab = 0, aa = 0, bb = 0;
      for (let i = 0; i < frame - lag; i++) { const a = samples[start + i]!, b = samples[start + i + lag]!; ab += a * b; aa += a * a; bb += b * b; }
      const corr = ab / Math.sqrt((aa * bb) || 1);
      if (corr > best) { best = corr; lagBest = lag; }
    }
    raw.push({ t: start / sampleRate, f0: best > SETTINGS.voicedCorrelation && lagBest ? sampleRate / lagBest : 0, rms });
  }
  const smooth = raw.map((_, i) => { const vals = raw.slice(Math.max(0, i - 2), i + 3).map(x => x.f0).filter(Boolean).sort((a,b)=>a-b); return vals.length ? vals[Math.floor(vals.length/2)]! : 0; });
  const out: Accent[] = []; let lastVoiced = -Infinity, lastAccent = -Infinity;
  for (let i = 2; i < raw.length - 2; i++) {
    if (!smooth[i]) continue;
    const phraseStart = raw[i]!.t - lastVoiced >= SETTINGS.phraseSilenceMs / 1000; lastVoiced = raw[i]!.t;
    if (smooth[i]! < smooth[i - 1]! || smooth[i]! < smooth[i + 1]!) continue;
    const before = smooth.slice(Math.max(0, i - 40), i).filter(Boolean);
    if (before.length < 10) continue;
    const baseline = before.reduce((a,b)=>a+b,0)/before.length;
    const local = raw.slice(Math.max(0,i-10), i+11).map(x=>x.rms).sort((a,b)=>a-b);
    if (raw[i]!.rms < (local[Math.floor(local.length/2)] ?? 0) || raw[i]!.t-lastAccent < SETTINGS.minAccentGapMs/1000 || smooth[i]! < baseline*1.12) continue;
    const strength = Math.max(0, Math.min(1, (smooth[i]! / baseline - 1) / 0.5));
    out.push({ t: raw[i]!.t, strength, phraseStart }); lastAccent = raw[i]!.t;
  }
  return out;
}
export function createGesturePicker(clips: GestureClip[], rng: () => number = Math.random) {
  let lastId = ""; const kinds: GestureKind[] = [];
  return (options: { amp?: number; kinds?: GestureKind[] } = {}): GestureClip | undefined => {
    let choices = clips.filter(c => (options.amp === undefined || c.amp === options.amp) && (!options.kinds || options.kinds.includes(c.kind)));
    if (!choices.length) return;
    if (choices.length > 1) choices = choices.filter(c => c.id !== lastId);
    if (kinds.length >= 2 && kinds.at(-1) === kinds.at(-2)) { const valid = choices.filter(c => c.kind !== kinds.at(-1)); if (valid.length) choices = valid; }
    const sum = choices.reduce((n,c)=>n+(c.weight ?? 1),0); let x=rng()*sum;
    const selected = choices.find(c => (x -= c.weight ?? 1) < 0) ?? choices[0]!;
    lastId=selected.id; kinds.push(selected.kind); if(kinds.length>2) kinds.shift(); return selected;
  };
}
export function createGestureScheduler({ rng, clock, clips = [] }: { rng: () => number; clock: () => number; clips?: GestureClip[] }) {
  const pick = createGesturePicker(clips, rng); let lastAt = -Infinity;
  let nextIdle = clock() + 8000 + rng()*7000;
  return { plan(accents: Accent[], options: { speaking: boolean }): ScheduledGesture[] {
    const out: ScheduledGesture[] = [];
    if (options.speaking) for (const a of accents) {
      let kind: GestureKind | undefined;
      if (a.phraseStart && rng() < .2) kind = "nod";
      else { const draw = rng(); if (draw < .4) kind = "nod"; else if (draw < .55) kind = rng() < .5 ? "tilt" : "glance"; }
      const amp = a.strength < .4 ? 1 : a.strength < .75 ? 2 : 3;
      const clip = kind ? pick({ amp, kinds: [kind] }) : undefined;
      const at = Math.max(SETTINGS.replyGuardMs/1000, a.t - SETTINGS.leadMs/1000);
      if (clip && at - lastAt >= SETTINGS.cooldownMs/1000) { out.push({ at, clipId: clip.id }); lastAt=at; }
    }
    else if (clock() >= nextIdle) {
      const clip = pick({ amp: 1, kinds: ["nod", "glance", "settle"] });
      if (clip) out.push({ at: clock(), clipId: clip.id });
      nextIdle=clock()+SETTINGS.idleMinMs+rng()*(SETTINGS.idleMaxMs-SETTINGS.idleMinMs);
    }
    return out;
  }, idleDue() { const now=clock(); if(now<nextIdle)return false; nextIdle=now+8000+rng()*7000; return true; } };
}
