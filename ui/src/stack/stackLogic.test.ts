import { describe, expect, test } from "bun:test";
import { seedChoicesView } from "./fakeStackData";
import { anyInstalling, byPriority, cardState, headlineModel, labelIndex, levelsOf, lockFor, moveId, movePriority } from "./stackLogic";

const categories = seedChoicesView().categories;
const byId = (id: string) => categories.find((c) => c.id === id)!;

describe("priority", () => {
  const rows = [{ role: "a", priority: 100 }, { role: "b", priority: 100 }, { role: "c", priority: 100 }];
  test("equal priorities keep their order", () => {
    expect(byPriority(rows).map((r) => r.role)).toEqual(["a", "b", "c"]);
  });
  test("moving down renumbers everything 10, 20, 30 and writes only what changed", () => {
    expect(movePriority(rows, "a", 1)).toEqual({ b: 10, a: 20, c: 30 });
    expect(movePriority([{ role: "b", priority: 10 }, { role: "a", priority: 20 }, { role: "c", priority: 30 }], "c", -1)).toEqual({ c: 20, a: 30 });
  });
  test("the first cannot move up and the last cannot move down", () => {
    expect(movePriority(rows, "a", -1)).toEqual({});
    expect(movePriority(rows, "c", 1)).toEqual({});
    expect(movePriority(rows, "missing", 1)).toEqual({});
  });
  test("a model moves one place and stays put at the ends", () => {
    expect(moveId(["x", "y", "z"], "y", -1)).toEqual(["y", "x", "z"]);
    expect(moveId(["x", "y", "z"], "x", -1)).toEqual(["x", "y", "z"]);
  });
});

describe("what a feature's card says", () => {
  test("levels read from Reduced to Max, and the card headlines Standard", () => {
    expect(levelsOf(byId("chat")).map((r) => r.tier)).toEqual(["reduced", "standard", "boost", "max"]);
    expect(headlineModel(byId("chat"))?.candidate.label).toBe("Qwen3 8B");
  });
  test("worst first: off, a saved pick that stopped working, downloading, not downloaded, ready", () => {
    expect(cardState(byId("video")).state).toBe("off");
    expect(cardState(byId("pictures")).state).toBe("problem");
    expect(cardState(byId("stems")).state).toBe("missing");
    expect(cardState(byId("chat")).state).toBe("ready");
    const voice = structuredClone(byId("voice"));
    voice.tiers = voice.tiers.filter((t) => t.tier === "boost");
    expect(cardState(voice)).toEqual({ state: "downloading", percent: 42 });
  });
  test("a feature that is not available says so before anything else", () => {
    const chat = structuredClone(byId("chat"));
    chat.available = false;
    expect(cardState(chat).state).toBe("unavailable");
  });
  test("polling is wanted only while something downloads", () => {
    expect(anyInstalling(categories)).toBe(true);
    expect(anyInstalling(categories.filter((c) => c.id !== "voice"))).toBe(false);
  });
  test("a model id turns into its label for any sentence", () => {
    expect(labelIndex(categories).get("llama-33-70b-q4")).toBe("Llama 3.3 70B");
  });
});

describe("locks from the host", () => {
  test("a level key beats the feature key; no key means unlocked", () => {
    const locked = { chat: "Locked for this profile.", "chat:max": "Only an admin can change Max." };
    expect(lockFor(locked, "chat")).toBe("Locked for this profile.");
    expect(lockFor(locked, "chat", "boost")).toBe("Locked for this profile.");
    expect(lockFor(locked, "chat", "max")).toBe("Only an admin can change Max.");
    expect(lockFor(locked, "music")).toBeNull();
    expect(lockFor(undefined, "chat")).toBeNull();
  });
});
