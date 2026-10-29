import { expect, test } from "bun:test";
import { createCompanionAvatarMachine, emotionClip, pictureFor, pickWanted, resolveClip, type CompanionClips } from "./companion-avatar-machine";

const clip = (loop = true) => ({ h264: "x.mp4", still: "x.png", loop });
const allClips = (): CompanionClips => ({ idle: clip(), idle_look: clip(false), needs_you: clip(), speaking: clip(), working: clip(), thinking: clip(), listening: clip(), sleeping: clip(), greeting: clip(false), happy: clip(false), oops: clip(false), celebrate: clip(false) });

test("clip fallback follows the shared table", () => {
  expect(resolveClip("researching", ["thinking"])).toBe("thinking");
  expect(resolveClip("researching", [])).toBe("idle");
  expect(resolveClip("needs_you", ["listening"])).toBe("listening");
});

test("emotion clips follow child bands", () => {
  expect(emotionClip("sad", "child")).toBeNull();
  expect(emotionClip("sad", "adult")).toBe("sad");
  expect(emotionClip("happy", "child")).toBe("laughing");
  expect(emotionClip("excited", "child")).toBeNull();
});

test("picture fallback prefers keyframe, then still", () => {
  expect(pictureFor("thinking", { keyframe: "pose.png", still: "still.png" })).toBe("pose.png");
  expect(pictureFor("thinking", { still: "still.png" })).toBe("still.png");
  expect(pictureFor("thinking", {})).toBeNull();
});

 test("wanted priority follows the vocabulary priority table", () => {
  expect(pickWanted({ sleeping: true, listening: true, thinking: true, working: true, speaking: true, needs_you: true })).toBe("needs_you");
  expect(pickWanted({ sleeping: true, listening: true, thinking: true, working: true, speaking: true })).toBe("speaking");
  expect(pickWanted({ sleeping: true, listening: true, thinking: true, working: true })).toBe("working");
  expect(pickWanted({ sleeping: true, listening: true, thinking: true })).toBe("thinking");
  expect(pickWanted({ sleeping: true, listening: true })).toBe("listening");
  expect(pickWanted({ sleeping: true })).toBe("sleeping");
  expect(pickWanted({})).toBe("idle");
});

test("missing wanted state falls back to idle", () => {
  const clips = { idle: clip() } as CompanionClips;
  const machine = createCompanionAvatarMachine(clips);
  machine.want("thinking");
  expect(machine.onClipEnded()).toBe("idle");
});

test("a loop switches only when the current clip ends", () => {
  const machine = createCompanionAvatarMachine(allClips());
  machine.want("thinking");
  expect(machine.current()).toBe("idle");
  machine.onClipEnded();
  expect(machine.current()).toBe("thinking");
  machine.want("working");
  expect(machine.current()).toBe("thinking");
  expect(machine.onClipEnded()).toBe("working");
});

test("a one shot returns to the wanted state", () => {
  const machine = createCompanionAvatarMachine(allClips());
  machine.want("thinking"); machine.onClipEnded();
  machine.play("greeting"); machine.onClipEnded();
  expect(machine.current()).toBe("greeting");
  expect(machine.onClipEnded()).toBe("thinking");
});

test("play is ignored while needs_you or speaking is current or wanted", () => {
  const machine = createCompanionAvatarMachine(allClips());
  machine.want("needs_you"); machine.onClipEnded();
  machine.play("happy"); machine.onClipEnded();
  expect(machine.current()).toBe("needs_you");
  const second = createCompanionAvatarMachine(allClips());
  second.want("speaking"); second.play("happy"); second.onClipEnded();
  expect(second.current()).toBe("speaking");
});

test("higher wanted state waits for a loop end; needs_you and speaking interrupt a one shot", () => {
  const machine = createCompanionAvatarMachine(allClips());
  machine.want("thinking"); machine.onClipEnded(); machine.want("working");
  expect(machine.current()).toBe("thinking"); expect(machine.onClipEnded()).toBe("working");
  for (const urgent of ["needs_you", "speaking"] as const) {
    const oneShotMachine = createCompanionAvatarMachine(allClips());
    oneShotMachine.play("greeting"); oneShotMachine.onClipEnded();
    expect(oneShotMachine.current()).toBe("greeting"); oneShotMachine.want(urgent);
    expect(oneShotMachine.current()).toBe(urgent);
  }
});

test("idle look uses the injected interval and clock", () => {
  const machine = createCompanionAvatarMachine(allClips(), { idleLookMinMs: 10, idleLookMaxMs: 20, random: () => 0.5 });
  expect(machine.tick(100)).toBe("idle");
  expect(machine.tick(114)).toBe("idle");
  expect(machine.tick(115)).toBe("idle_look");
  expect(machine.onClipEnded(121)).toBe("idle");
});

test("idle look never runs outside idle or when its clip is missing", () => {
  const clips = allClips();
  const machine = createCompanionAvatarMachine(clips, { idleLookMinMs: 0, idleLookMaxMs: 0 });
  machine.want("thinking"); machine.onClipEnded();
  expect(machine.tick(100)).toBe("thinking");
  delete clips.idle_look;
  const noLook = createCompanionAvatarMachine(clips, { idleLookMinMs: 0, idleLookMaxMs: 0 });
  expect(noLook.tick(100)).toBe("idle");
});

test("clip errors make a non-idle state unavailable and idle errors report failure", () => {
  const machine = createCompanionAvatarMachine(allClips());
  machine.want("thinking"); machine.onClipEnded();
  expect(machine.onClipError()).toEqual({ state: "idle", failed: false });
  machine.want("thinking"); machine.onClipEnded();
  expect(machine.current()).toBe("idle");
  expect(machine.onClipError()).toEqual({ state: "idle", failed: true });
});
