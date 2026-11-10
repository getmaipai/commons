import { describe, expect, test } from "bun:test";
import { buildCues, cuesFromEnvelope, joinCues, provisionalCues } from "./cues";
import golden from "./fixtures/golden-fast-lines.json";
import { buildLoud, loudAt, loudMean, promoteLoud, shoutGain } from "./loud";
import { activeVocal, audioFeatures, detectEvents, mixSlot, splitTags, vocalMouth } from "./tags";
import { emotionFor, LIFE_CHARACTER_PROFILE, lifeAt, planLife, planMicro, PROFILE } from "./life";

const dictionary: Record<string, string[]> = {
  bob: ["B", "AA", "B"], sam: ["S", "AE", "M"], billy: ["B", "IH", "L", "IY"],
  tom: ["T", "AA", "M"], mom: ["M", "AH", "M"], bought: ["B", "AO", "T"],
  a: ["AH"], blue: ["B", "L", "UW"], boat: ["B", "OW", "T"], and: ["AE", "N", "D"],
  here: ["HH", "IH", "R"], was: ["W", "AA", "Z"], thinking: ["TH", "IH", "NG", "K", "IH", "NG"],
  that: ["DH", "AE", "T"], you: ["Y", "UW"], "wouldn't": ["W", "UH", "D", "N", "T"],
  finally: ["F", "AY", "N", "AH", "L", "IY"], fix: ["F", "IH", "K", "S"], it: ["IH", "T"],
};
const phonesFor = (word: string) => dictionary[word] ?? null;
const goldenPhonesFor = (words: { w: string; ph: string[] }[]) => (word: string) =>
  words.find((item) => item.w === word)?.ph ?? null;
function fixture(bursts: [number, number, number][]): Float32Array {
  const samples = new Float32Array(48_000);
  for (const [start, end, amplitude] of bursts) {
    for (let i = start * 240; i < end * 240; i++) samples[i] = amplitude * Math.sin(i * 0.11);
  }
  return samples;
}
const full = fixture([[0, 200, 0.2]]);

describe("companion pack cue builder", () => {
  test("matches demo golden cue timing and holds shape change rates", () => {
    for (const [index, line] of golden.entries()) {
      const cues = cuesFromEnvelope({ text: line.text, env: new Float32Array(line.env),
        phonesFor: goldenPhonesFor(line.phones) });
      const expected = line.cues.filter((cue) => cue.l !== "A");
      const actual = cues.filter((cue) => cue.l !== "A");
      expect(Math.abs(actual.length - expected.length), `${line.text}: cue count`).toBeLessThanOrEqual(3);
      const count = Math.min(actual.length, expected.length);
      let worst = 0; let equal = 0;
      for (let i = 0; i < count; i++) {
        const a = actual[i]!; const e = expected[i]!;
        if (a.l === e.l) equal++;
        worst = Math.max(worst, Math.abs(a.t0 - e.t0), Math.abs(a.t1 - e.t1));
      }
      expect(equal / Math.max(1, count), `${line.text}: ordered letter match`).toBeGreaterThanOrEqual(0.9);
      expect(worst, `${line.text}: worst boundary offset ${(worst * 1000).toFixed(1)} ms`).toBeLessThanOrEqual(0.03);
      const rate = actual.slice(1).filter((cue, i) => cue.l !== actual[i]!.l).length / line.duration;
      const goldenRate = expected.slice(1).filter((cue, i) => cue.l !== expected[i]!.l).length / line.duration;
      const limit = index === 2 ? 5.5 : goldenRate * 1.1;
      expect(rate, `${line.text}: ${rate.toFixed(2)} changes/sec <= ${limit.toFixed(2)}`).toBeLessThanOrEqual(limit);
    }
  });
  test("keeps M/B/P as closures and weak vowels as B", () => {
    const cues = buildCues({ text: "Mom", samples: full, sampleRate: 24_000, phonesFor });
    expect(cues.some((cue) => cue.p === "M" && cue.l === "A")).toBe(true);
    expect(cues.some((cue) => cue.p === "AH" && cue.l === "B")).toBe(true);
  });
  test("enforces the D percentile and spacing rule", () => {
    const audio = fixture([[0, 20, 0.1], [40, 70, 0.8], [80, 90, 0.8], [120, 150, 0.8], [170, 200, 0.1]]);
    const cues = buildCues({ text: "Bob Sam Billy", samples: audio, sampleRate: 24_000, phonesFor });
    const Ds = cues.filter((cue) => cue.l === "D");
    expect(Ds.every((cue, i) => i === 0 || cue.t0 - Ds[i - 1]!.t0 >= 0.7)).toBe(true);
  });
  test("merges short cues and chooses fast mode from the 4.2 threshold", () => {
    const fast = buildCues({ text: "Bob Sam Billy Tom", samples: full, sampleRate: 24_000, phonesFor });
    const normal = buildCues({ text: "Bob", samples: full, sampleRate: 24_000, phonesFor, fast: false });
    expect(fast.length).toBeLessThan(24);
    expect(normal.length).toBeGreaterThan(0);
  });
  test("provisional and final cues join at a stable boundary", () => {
    const provisional = provisionalCues("Bob Sam", phonesFor);
    const final = buildCues({ text: "Bob Sam", samples: full, sampleRate: 24_000, phonesFor });
    const joined = joinCues(provisional, final, 0.3);
    expect(joined.filter((cue) => cue.t0 < 0.3).map((cue) => cue.l))
      .toEqual(provisional.filter((cue) => cue.t0 < 0.3).map((cue) => cue.l));
    expect(joined.filter((cue) => cue.t0 < 0.3).at(-1)?.t1).toBe(0.3);
    expect(joined.every((cue) => cue.t1 >= cue.t0)).toBe(true);
  });
});

describe("companion pack loudness, tags and life", () => {
  test("loudness is silent when off and promotes shapes by the loud table", () => {
    expect([...buildLoud(full, 24_000, 0.1)]).toEqual(new Array(200).fill(0));
    expect(promoteLoud("A", 1)).toBe("A");
    expect(promoteLoud("B", 0.6)).toBe("C");
    expect(promoteLoud("C", 0.9)).toBe("D");
    expect(promoteLoud("E", 0.9)).toBe("D");
  });
  test("tags parse and always get a detection or prior window", () => {
    const parsed = splitTags("Bob [laugh] and [gasp]");
    const events = detectEvents(new Float32Array(48_000), 24_000, parsed.plain, parsed.tags, phonesFor);
    expect(parsed.tags.map((tag) => tag.type)).toEqual(["laugh", "gasp"]);
    expect(events).toHaveLength(2);
    expect(events.every((event) => event.t1 > event.t0)).toBe(true);
  });
  test("life is seeded, avoids opposing gaze pairs, and delays nods", () => {
    const cues = Array.from({ length: 80 }, (_, i) => ({ l: "D" as const, p: "AA", t0: i * 0.12, t1: i * 0.12 + 0.1 }));
    const a = planLife(cues, new Float32Array(1000), 17);
    expect(planLife(cues, new Float32Array(1000), 17)).toEqual(a);
    expect(a.filter((event) => event.channel === "nod").every((event) => event.t0 >= 0.6)).toBe(true);
    const gaze = a.filter((event) => event.channel === "gaze");
    expect(gaze.some((event, i) => i > 0 && event.direction !== gaze[i - 1]!.direction
      && ["L", "R"].includes(event.direction ?? "") && ["L", "R"].includes(gaze[i - 1]!.direction ?? ""))).toBe(false);
  });
  test("emotion words follow the demo table", () => {
    expect(emotionFor("How dare you")).toBe("angry");
    expect(emotionFor("Wow, we won")).toBe("excited");
    expect(emotionFor("Help, look out")).toBe("alarmed");
    expect(emotionFor("Sorry, I miss you")).toBe("sad");
    expect(emotionFor("ordinary words", [], true)).toBe("excited");
    expect(emotionFor("ordinary words")).toBeNull();
  });
  test("shout processing, attack and release follow the demo envelope", () => {
    const samples = fixture([[0, 200, 0.6]]);
    const loud = buildLoud(samples, 24_000, 0.1, true);
    expect(loud.at(-1)).toBeGreaterThan(0.9);
    expect(loudAt(loud, 1.9)).toBe(1);
    expect(loudMean(loud, 1.9, 2)).toBe(1);
    const processed = shoutGain(new Float32Array([0.2, -0.2, 0.4, -0.4]));
    expect(processed[0]).toBeGreaterThan(0.4);
    expect(processed[1]).toBeLessThan(-0.4);
    expect([...shoutGain(new Float32Array([0.2, -0.2, 0.4, -0.4]))]).toEqual([...processed]);
  });
  test("audio events reject voiced harmonics and detect noisy vocal bursts", () => {
    const harmonic = new Float32Array(4_800);
    for (let i = 0; i < harmonic.length; i++) harmonic[i] = 0.2 * Math.sin(i * 0.17);
    const parsed = splitTags("[cough]");
    expect(detectEvents(new Float32Array(), 24_000, parsed.plain, parsed.tags, phonesFor)[0]?.src).toBe("text");
    expect(audioFeatures(harmonic, 24_000).har.some((value) => value > 0.55)).toBe(true);
    expect(detectEvents(harmonic, 24_000, parsed.plain, parsed.tags, phonesFor)[0]?.src).toBe("text");
    let state = 7;
    const noisy = Float32Array.from({ length: 4_800 }, () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return ((state / 4294967296) * 2 - 1) * 0.2;
    });
    expect(detectEvents(noisy, 24_000, parsed.plain, parsed.tags, phonesFor)[0]?.src).toBe("audio");
  });
  test("vocal mouth targets and character life tracks stay deterministic", () => {
    const morph = { base: 8, ts: [0.25, 0.5, 0.75] };
    expect(mixSlot(morph, 0, 4, 0.5)).toEqual({ l: "E", slot: 21, between: true });
    const laugh = { type: "laugh", t0: 1, t1: 2, src: "text" as const, tagIdx: 0, peaks: [1.5] };
    expect(activeVocal([laugh], 0.96)).toBe(laugh);
    expect(vocalMouth(laugh, 1.5)?.to).toBe(3);
    expect(vocalMouth(laugh, 1.03, morph)?.mix?.between).toBe(true);
    expect(PROFILE(0.1, 0.1, 0.1, 0.1)).toBe(1);
    const cues = Array.from({ length: 80 }, (_, i) => ({ l: "D" as const, p: "AA", t0: i * 0.12, t1: i * 0.12 + 0.1 }));
    const life = planLife(cues, new Float32Array(1000), 17, "clay");
    expect(life).toEqual(planLife(cues, new Float32Array(1000), 17, "clay"));
    expect(life.micro.length).toBeGreaterThan(0);
    expect(life.blinks.length).toBeGreaterThan(0);
    expect(lifeAt(life, life.blinks[0]!.t0 + 0.06).blink.close).toBeGreaterThan(0);
    expect(life.shoulderPct).toBe(LIFE_CHARACTER_PROFILE("clay").shoulderPct!);
    expect(planMicro(cues, new Float32Array(1000), cues.at(-1)!.t1, 17)).toEqual(life.micro);
  });
  test("laugh and chuckle tags map to excitement", () => {
    expect(emotionFor("ordinary", ["[laugh]"])).toBe("excited");
    expect(emotionFor("ordinary", ["chuckle"])).toBe("excited");
  });
});
