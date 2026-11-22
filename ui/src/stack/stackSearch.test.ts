import { describe, expect, test } from "bun:test";
import { seedChoicesView } from "./fakeStackData";
import { normalize, queryWords, searchModels } from "./stackSearch";

const categories = seedChoicesView().categories;
const labels = (query: string) => searchModels(categories, query).map((hit) => hit.candidate.label);

describe("search words", () => {
  test("separators and case do not matter, a dot stays", () => {
    expect(normalize("  4-BIT,  Q4_K_M ")).toBe("4 bit q4 k m");
    expect(queryWords("3.8")).toEqual(["3.8"]);
    expect(queryWords("")).toEqual([]);
  });
});

describe("search finds a model by every field the Stack sends", () => {
  test("an empty query finds nothing, so the page shows the summary", () => {
    expect(labels("")).toEqual([]);
    expect(labels("   ")).toEqual([]);
  });
  test("name, in any case and with a part of it", () => {
    expect(labels("Whisper Large")).toEqual(["Whisper Large v3 Turbo"]);
    expect(labels("flux")).toEqual(["FLUX.1 schnell", "FLUX.1 dev"]);
    expect(labels("kokoro")).toEqual(["Kokoro 82M"]);
  });
  test("id", () => {
    expect(labels("qwen3-8b-q4")).toEqual(["Qwen3 8B"]);
    expect(labels("llama-33-70b")).toEqual(["Llama 3.3 70B"]);
  });
  test("repository", () => {
    expect(labels("black-forest-labs")).toEqual(["FLUX.1 schnell", "FLUX.1 dev"]);
    expect(labels("hexgrad/Kokoro-82M")).toEqual(["Kokoro 82M"]);
  });
  test("family", () => {
    expect(labels("Gemma")).toEqual(["Gemma 3 27B"]);
    expect(labels("demucs")).toEqual(["Demucs"]);
  });
  test("a version number matches that version, not a digit inside another one", () => {
    expect(labels("3.8")).toEqual(["Qwen3.8 Flash Next 177B"]);
    expect(labels("version 0.9.8")).toEqual([]);
    expect(labels("0.9.8")).toEqual(["LTX-Video 0.9.8"]);
    expect(labels("3.3")).toEqual(["Llama 3.3 70B"]);
  });
  test("precision, in plain words and as the catalog writes it", () => {
    expect(labels("4-bit")).toContain("Qwen3 8B");
    expect(labels("4 bit compact")).toContain("Gemma 3 27B");
    expect(labels("UD-Q4_K_XL")).toEqual(["Qwen3 30B (3B active)"]);
    expect(labels("q4_k_m")).toContain("Llama 3.3 70B");
    expect(labels("8-bit")).toContain("FLUX.1 dev");
  });
  test("licence", () => {
    expect(labels("Non-Commercial")).toEqual(["FLUX.1 dev"]);
    expect(labels("Gemma Terms")).toEqual(["Gemma 3 27B"]);
    expect(labels("llama 3.3 community")).toEqual(["Llama 3.3 70B"]);
  });
  test("engine", () => {
    expect(labels("whisper.cpp")).toEqual(["Whisper Large v3 Turbo", "Whisper Small (English)"]);
    expect(labels("stable-diffusion.cpp")).toContain("Wan 2.2 5B");
    expect(labels("mlx-audio")).toEqual(["Kokoro 82M", "Chatterbox Turbo"]);
  });
  test("a word from the description", () => {
    expect(labels("hands and text")).toEqual(["FLUX.1 dev"]);
    expect(labels("copies a voice")).toEqual(["VoxCPM2"]);
    expect(labels("find notes")).toEqual(["Nomic Embed Text v1.5"]);
  });
  test("the feature's name, so 'pictures' lists its models", () => {
    expect(labels("pictures flux")).toEqual(["FLUX.1 schnell", "FLUX.1 dev"]);
  });
  test("every word has to match", () => {
    expect(labels("flux apache")).toEqual(["FLUX.1 schnell"]);
    expect(labels("flux nonsense")).toEqual([]);
  });
  test("an older Stack without search_text is searched on the same fields", () => {
    const old = structuredClone(categories);
    for (const category of old) for (const candidate of category.candidates) candidate.search_text = "";
    expect(searchModels(old, "3.8").map((h) => h.candidate.label)).toEqual(["Qwen3.8 Flash Next 177B"]);
    expect(searchModels(old, "non commercial").map((h) => h.candidate.label)).toEqual(["FLUX.1 dev"]);
  });
});
