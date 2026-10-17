import { describe, expect, test } from "bun:test";
import {
  chapterIndexAt,
  chaptersToVtt,
  clampTime,
  formatTime,
  normalizeChapters,
  PLAYBACK_RATES,
  shouldResume,
  skipOffer,
  TAP_CHAIN_MS,
  TapChain,
  tapZone,
} from "@/kit/primitives/playerLogic";

const CHAPTERS = normalizeChapters([
  { start_s: 90, title: "The kiln" },
  { start_s: 0, title: "Intro" },
  { start_s: 30, title: "Laying the firebrick" },
  { start_s: 1100, title: "End credits" },
  { start_s: 30, title: "duplicate start" },
]);

describe("playerLogic", () => {
  test("formatTime reads m:ss and h:mm:ss", () => {
    expect(formatTime(760)).toBe("12:40");
    expect(formatTime(3723)).toBe("1:02:03");
    expect(formatTime(-4)).toBe("0:00");
    expect(formatTime(Number.NaN)).toBe("0:00");
  });

  test("rates run 0.5 to 2", () => {
    expect(PLAYBACK_RATES[0]).toBe(0.5);
    expect(PLAYBACK_RATES.at(-1)).toBe(2);
  });

  test("chapters sort, drop duplicates and find the current one", () => {
    expect(CHAPTERS.map((c) => c.start_s)).toEqual([0, 30, 90, 1100]);
    expect(chapterIndexAt(CHAPTERS, 45)).toBe(1);
    expect(chapterIndexAt([{ start_s: 10, title: "a" }], 5)).toBe(-1);
  });

  test("skip intro goes to the next chapter, skip credits to the end, others offer nothing", () => {
    expect(skipOffer(CHAPTERS, 5, 1200)).toEqual({ kind: "intro", to: 30 });
    expect(skipOffer(CHAPTERS, 1150, 1200)).toEqual({ kind: "credits", to: 1200 });
    expect(skipOffer(CHAPTERS, 60, 1200)).toBeNull();
  });

  test("chaptersToVtt writes one cue per chapter ending at the next start or the duration", () => {
    const vtt = chaptersToVtt(CHAPTERS, 1200);
    expect(vtt.startsWith("WEBVTT")).toBe(true);
    expect(vtt).toContain("00:00:00.000 --> 00:00:30.000\nIntro");
    expect(vtt).toContain("00:18:20.000 --> 00:20:00.000\nEnd credits");
  });

  test("tapZone splits the picture in thirds", () => {
    expect(tapZone(10, 300)).toBe("left");
    expect(tapZone(150, 300)).toBe("center");
    expect(tapZone(290, 300)).toBe("right");
  });

  test("the double-tap chain: second tap skips 15, each further tap in 800 ms adds 15", () => {
    const chain = new TapChain();
    expect(chain.tap("right", 0)).toBe(0);
    expect(chain.tap("right", 300)).toBe(15);
    expect(chain.tap("right", 300 + TAP_CHAIN_MS)).toBe(15);
    expect(chain.total).toBe(30);
    // Too late: starts over.
    expect(chain.tap("right", 300 + TAP_CHAIN_MS * 3)).toBe(0);
    expect(chain.tap("left", 300 + TAP_CHAIN_MS * 3 + 100)).toBe(0);
    expect(chain.tap("left", 300 + TAP_CHAIN_MS * 3 + 200)).toBe(-15);
    expect(chain.tap("center", 300 + TAP_CHAIN_MS * 3 + 300)).toBe(0);
  });

  test("resume is offered only between 5 s from either end and never when completed", () => {
    expect(shouldResume(760, 1200)).toBe(true);
    expect(shouldResume(3, 1200)).toBe(false);
    expect(shouldResume(1198, 1200)).toBe(false);
    expect(shouldResume(760, 1200, true)).toBe(false);
    expect(shouldResume(undefined, 1200)).toBe(false);
  });

  test("clampTime keeps a seek in range", () => {
    expect(clampTime(-3, 100)).toBe(0);
    expect(clampTime(140, 100)).toBe(100);
    expect(clampTime(50, Number.NaN)).toBe(50);
  });
});
