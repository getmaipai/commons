// The shared obfuscation normaliser (safety/ts/fold.ts). Probes use the plain word "child" and the mild word "naked";
// the point is that every disguised spelling reaches the SAME form the blocklists see.
import { describe, expect, test } from "bun:test";
import { NativeSet, NATIVE_MINOR, TermSet, foldForSafety, hasMinorAge } from "../../safety/ts/fold.js";
import { detectCsam } from "../../safety/ts/signals.js";

const CHILD = new TermSet(["child", "children"]);
const hit = (text: string): boolean => CHILD.matches(foldForSafety(text));

const DISGUISES: Record<string, string> = {
  plain: "child",
  fullwidth: "ｃｈｉｌｄ",
  zeroWidth: "ch​i‍l­d",
  bidi: "‮child‬",
  cyrillicLookalike: "chіld",
  allCyrillicLookalike: "сһіӏԁ",
  leetI: "ch1ld",
  leetL: "chi1d",
  dotted: "c.h.i.l.d",
  dashed: "c-h-i-l-d",
  spaced: "c h i l d",
  commas: "c,h,i,l,d",
  masked: "ch*ld",
  maskedDouble: "ch**ld",
  hash: "c#ild",
  underscoreMask: "ch_ld",
  repeated3: "chiiild",
  repeated2: "chhiilldd",
  spanish: "niño",
  spanishPlural: "NIÑAS",
  french: "enfant",
  german: "kinder",
  italian: "bambino",
  portuguese: "criança",
};

describe("fold: every disguise reaches the blocklist as the same word", () => {
  for (const spanishLike of ["spanish", "spanishPlural", "french", "german", "italian", "portuguese"]) {
    test(`${spanishLike} age word is in the multilingual list`, () => {
      const i18n = new TermSet(["nino", "ninas", "enfant", "kinder", "bambino", "crianca"]);
      expect(i18n.matches(foldForSafety(DISGUISES[spanishLike]!))).toBe(true);
    });
  }
  for (const [name, text] of Object.entries(DISGUISES)) {
    if (["spanish", "spanishPlural", "french", "german", "italian", "portuguese"].includes(name)) continue;
    test(`${name}: ${JSON.stringify(text)}`, () => expect(hit(`a ${text} in a park`)).toBe(true));
  }
  test("the disguise is inside a longer sentence and still found", () => {
    expect(hit("draw me a very c h i l d like creature")).toBe(true);
  });
});

describe("fold: ordinary text is not turned into a term", () => {
  for (const text of ["stepped on the rug", "hello little one", "Bob", "a chill day", "childhood memories", "a chilled drink", "the 5 cities", "1 2 3 go"]) {
    test(text, () => expect(hit(text)).toBe(false));
  }
  test("a term with its own doubled letter is not matched by a collapsed word", () => {
    expect(new TermSet(["boobs"]).matches(foldForSafety("bobs"))).toBe(false);
    expect(new TermSet(["boobs"]).matches(foldForSafety("booobs"))).toBe(true);
  });
  test("a stem matches as a prefix only when listed", () => {
    const stem = new TermSet(["pedophil"], { prefix: () => true });
    expect(stem.matches(foldForSafety("pedophilia"))).toBe(true);
    expect(new TermSet(["cum"]).matches(foldForSafety("cumin"))).toBe(false);
  });
});

describe("fold: ages", () => {
  for (const text of ["14yo", "she is 15 y o", "12 years old", "age of 9", "aged twelve", "14 anos", "14 ans", "14 anni", "14 jahre alt", "14歳", "12 лет", "14살", "13岁"]) {
    test(`under 18: ${text}`, () => expect(hasMinorAge(foldForSafety(text))).toBe(true));
  }
  for (const text of ["25 years old", "40yo", "age 18", "in 2020", "14 apples"]) {
    test(`not under 18: ${text}`, () => expect(hasMinorAge(foldForSafety(text))).toBe(false));
  }
});

describe("fold: detectCsam sees every disguise of the age word beside a listed sexual word", () => {
  for (const [name, text] of Object.entries(DISGUISES)) {
    test(name, () => expect(detectCsam(`${text} naked`).matched.length).toBeGreaterThan(0));
  }
  test("a disguised sexual word beside the plain age word", () => {
    for (const naked of ["n4ked", "n.a.k.e.d", "n a k e d", "nak*d", "nakeeed", "n​aked"]) {
      expect(detectCsam(`child ${naked}`).matched.length).toBeGreaterThan(0);
    }
  });
  test("an age word alone, or a sexual word alone, still passes", () => {
    expect(detectCsam("a child with a balloon").matched).toEqual([]);
    expect(detectCsam("naked mole rat documentary").matched).toEqual([]);
  });
});

describe("fold: non-Latin scripts (documented behaviour)", () => {
  test("a real native word is kept, not mangled by the look-alike fold", () => {
    expect(NATIVE_MINOR.test(foldForSafety("子供が公園で遊ぶ"))).toBe(true);
    expect(NATIVE_MINOR.test(foldForSafety("ребёнок играет"))).toBe(true);
    expect(NATIVE_MINOR.test(foldForSafety("아이가 놀아요"))).toBe(true);
    expect(NATIVE_MINOR.test(foldForSafety("طفل يلعب"))).toBe(true);
  });
  test("native age cue plus native nudity word reaches the chat floor", () => {
    expect(detectCsam("子供 ヌード").matched.length).toBeGreaterThan(0);
    expect(detectCsam("ребенок голый").matched.length).toBeGreaterThan(0);
    expect(detectCsam("子 供 ヌ ー ド".replace(/ /g, "​")).matched.length).toBeGreaterThan(0);
  });
  test("native text alone passes the chat floor", () => {
    expect(detectCsam("子供が公園で遊ぶ").matched).toEqual([]);
    expect(detectCsam("ребёнок играет в парке").matched).toEqual([]);
  });
  test("mixedScripts flags Latin plus another script, and only that", () => {
    expect(foldForSafety("a child 公園").mixedScripts).toBe(true);
    expect(foldForSafety("a child in a park").mixedScripts).toBe(false);
    expect(foldForSafety("公園で遊ぶ").mixedScripts).toBe(false);
  });
  test("an unlisted script is not read (known gap, left to the picture check)", () => {
    expect(new NativeSet(["子供"]).test(foldForSafety("เด็ก"))).toBe(false);
  });
});
