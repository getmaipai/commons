// The one obfuscation normaliser behind every minor-protection word floor (org principle 4: one definition).
// The chat classifier's `detectCsam` (signals.ts) and the pictures/videos prompt floor in Home
// (`lib/pictures/minorLine.ts`) both read text only through `foldForSafety`, and both match their term lists
// only through `TermSet` / `NativeSet`, so a trick that gets past one gets past neither.
//
// WHAT IT UNDOES (each is a separate form of the same text, matched against the same term lists):
//  - invisible characters (zero-width, bidi, soft hyphen, tag characters, filler letters) are removed, not spaced;
//  - width forms, ligatures, math alphabets (NFKD), diacritics, and look-alike letters from other scripts
//    (the Unicode confusables table) fold to plain Latin;
//  - separators inside a word ("c.h.i.l.d", "c-h-i-l-d", "c,h,i,l,d") and a spelled-out run of single letters
//    ("c h i l d") join into one word, at word edges only, so "stepped on" never contains "pedo" (getmaipai/home#100);
//  - leetspeak: digits and symbols read as letters in a second form, because a digit also means an age ("14yo"):
//    the base form keeps digits, the leet forms map 0 o, 1 i (and a second form 1 l), 3 e, 4 a, 5 s, 7 t, 8 b, @ a, $ s, ! i, | l, + t;
//  - repeated letters: a run of three or more collapses to one ("chiiild"), and, for terms with no doubled letter,
//    a run of two does too ("chiild"). Terms that have a doubled letter of their own ("school", "boobs") are never matched
//    against the all-collapsed form, so "Bob" is not "boob";
//  - masked letters ("ch*ld", "k#d"): an interior mask character stands for one to three letters (TermSet.testMasked);
//  - other languages: Spanish, French, German, Italian and Portuguese equivalents of the age words live in `MINOR_WORDS_I18N`
//    and the matching sexual or nudity words in `SEXUAL_WORDS_I18N`; native-script lists for Japanese, Chinese, Korean,
//    Russian and Arabic live in `NATIVE_MINOR_TERMS` / `NATIVE_SEXUAL_TERMS` / `NATIVE_STANDALONE_TERMS`.
//
// NON-LATIN SCRIPTS (documented plan, pinned by tests):
//  1. A token written entirely in one non-Latin script is real text, not an evasion: it is kept (NFKC) in the native
//     form and matched against the native lists. The same token is ALSO folded to Latin for the look-alike check, so
//     an all-Cyrillic spelling of a Latin word is still caught.
//  2. A token that mixes scripts is an evasion: it is folded to Latin.
//  3. A script with no list here (Thai, Hebrew, Devanagari and the rest) is not read. For CHAT the floor stays as it is.
//     For PICTURE and VIDEO prompts Home applies a fail-closed rule (`fold.mixedScripts`, minorLine.ts): a prompt that
//     mixes Latin letters with another script AND carries any age cue (Latin marker, native marker, or an age under 18)
//     is refused, because the other-script part could hold the sexual wording this module cannot read.
//     A prompt wholly in an unlisted script is a known gap; the finished-picture age check is its backstop.
// Folding is lossy on purpose and the folded copy is a MATCHING COPY ONLY: never stored, logged, sent to a model or shown.
import remove from "confusables";

// ---------------------------------------------------------------- shapes

export interface Form {
  /** Space-separated words. */
  readonly text: string;
  /**
   * n: as written. s1: runs of three or more collapsed to one letter (terms without a doubled letter match here).
   * s2: runs of three or more collapsed to two (terms WITH a doubled letter match here).
   * all: every run of two or more collapsed to one (terms without a doubled letter match here).
   */
  readonly kind: "n" | "s1" | "s2" | "all";
}

export interface SafetyFold {
  /** Latin-folded forms (plain, joined, leet, squeezed). The first is the plain base form: digits kept, no leet, no squeeze. */
  readonly forms: readonly Form[];
  /** The plain base form alone (digits kept): where numeric ages are read. */
  readonly plain: string;
  /** Latin-folded tokens that carry an interior mask character, with the mask characters turned into "?". */
  readonly maskedTokens: readonly string[];
  /** The native-script form: tokens with no Latin letter, NFKC, words separated by one space. Empty when the text has no non-Latin letter. */
  readonly nativePlain: string;
  /** The same tokens run together with nothing between (CJK text has no spaces and can be spaced out by a separator). */
  readonly nativeTight: string;
  /** True when the text has at least one letter from a script other than Latin. */
  readonly hasNonLatin: boolean;
  /** True when the text has at least one Latin letter. */
  readonly hasLatin: boolean;
  /** hasNonLatin && hasLatin: the case the picture floor fails closed on when an age cue is present. */
  readonly mixedScripts: boolean;
}

// ---------------------------------------------------------------- folding

const INVISIBLE = /[\p{Cf}ㅤᅟᅠ⠀]/gu;
const LATIN_LETTER = /\p{Script=Latin}/u;
const ANY_LETTER = /\p{L}/u;
const SEPARATORS_ONLY = /[^\p{L}\p{N}]+/gu;

const LEET: Record<string, string> = { "0": "o", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", "$": "s", "!": "i", "|": "l", "+": "t" };

function latinFold(noInvisible: string): string {
  return remove(noInvisible).toLowerCase().normalize("NFKD").replace(/\p{Mn}/gu, "");
}

/** Joins a run of two or more single-character words into one word ("c h i l d" is "child"). */
function joinSingleRuns(words: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    if (words[i]!.length === 1 && i + 1 < words.length && words[i + 1]!.length === 1) {
      let run = words[i]!;
      while (i + 1 < words.length && words[i + 1]!.length === 1) run += words[++i]!;
      out.push(run);
    } else {
      out.push(words[i]!);
    }
  }
  return out;
}

/** "a c h i l d" joins to "achild"; the real words "a" and "i" at the edge of a run are also tried apart. */
function joinSingleRunsApart(words: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    if (words[i]!.length === 1 && i + 1 < words.length && words[i + 1]!.length === 1) {
      const run: string[] = [words[i]!];
      while (i + 1 < words.length && words[i + 1]!.length === 1) run.push(words[++i]!);
      if (run[0] === "a" || run[0] === "i") { out.push(run[0]!); run.shift(); }
      const last = run[run.length - 1];
      const tail = (last === "a" || last === "i") && run.length > 2 ? run.pop() : undefined;
      if (run.length > 1) out.push(run.join("")); else if (run.length === 1) out.push(run[0]!);
      if (tail) out.push(tail);
    } else {
      out.push(words[i]!);
    }
  }
  return out;
}

function plainOf(folded: string): string {
  return folded.replace(SEPARATORS_ONLY, " ").trim();
}

/** Each whitespace token with its punctuation removed, single-letter runs joined: the "tight" reading of dotted and spaced letters. */
function tightOf(folded: string): string[] {
  const words = folded.split(/\s+/).map((token) => token.replace(SEPARATORS_ONLY, "")).filter((token) => token.length > 0);
  return [joinSingleRuns(words).join(" "), joinSingleRunsApart(words).join(" ")];
}

function applyLeet(folded: string, one: "i" | "l"): string {
  let out = "";
  for (const ch of folded) out += ch === "1" ? one : (LEET[ch] ?? ch);
  return out;
}

const squeeze1 = (s: string): string => s.replace(/(.)\1{2,}/gu, "$1");
const squeeze2 = (s: string): string => s.replace(/(.)\1{2,}/gu, "$1$1");
const squeezeAll = (s: string): string => s.replace(/(.)\1+/gu, "$1");

function maskedTokensOf(folded: string): string[] {
  const out: string[] = [];
  for (const token of folded.split(/\s+/)) {
    // "_" counts as a mask here ("ch_ld"); the other separators are dropped, and a mask at either edge is ordinary markup ("**kid**").
    const cleaned = token.replace(/_/g, "?").replace(/[^\p{L}\p{N}*#?%]/gu, "").replace(/^[*#?%]+|[*#?%]+$/g, "");
    if (cleaned.length < 3 || !/[*#?%]/.test(cleaned)) continue;
    if (cleaned.replace(/[*#?%]/g, "").length < 2) continue;
    out.push(cleaned.replace(/[*#?%]+/g, "?"));
  }
  return out;
}

function nativeTokensOf(noInvisible: string): string[] {
  const out: string[] = [];
  for (const token of noInvisible.split(/\s+/)) {
    if (!token) continue;
    let hasLatin = false;
    let hasOther = false;
    for (const ch of token) {
      if (!ANY_LETTER.test(ch)) continue;
      if (LATIN_LETTER.test(ch)) hasLatin = true;
      else hasOther = true;
    }
    if (hasLatin) continue;
    if (!hasOther && !/\p{N}/u.test(token)) continue;
    let t = token.normalize("NFKC").toLowerCase().replace(/ё/g, "е").replace(/[أإآ]/g, "ا").replace(/(?<=\p{Script=Arabic})\p{Mn}/gu, "");
    t = t.replace(/[^\p{L}\p{N}\p{M}]/gu, "");
    if (t) out.push(t);
  }
  return out;
}

let lastInput: string | undefined;
let lastFold: SafetyFold | undefined;

/** Folds text once into every form the floors match against. Single-slot memo: detectors call it back-to-back on the same text. */
export function foldForSafety(text: string): SafetyFold {
  if (text === lastInput && lastFold) return lastFold;
  const noInvisible = text.replace(INVISIBLE, "");
  let hasNonLatin = false;
  let hasLatin = false;
  for (const ch of noInvisible) {
    if (!ANY_LETTER.test(ch)) continue;
    if (LATIN_LETTER.test(ch)) hasLatin = true;
    else hasNonLatin = true;
  }
  const folded = latinFold(noInvisible);
  const bases = [folded, applyLeet(folded, "i"), applyLeet(folded, "l")];
  const seen = new Set<string>();
  const forms: Form[] = [];
  const add = (t: string, kind: Form["kind"]): void => {
    const key = `${kind}|${t}`;
    if (t && !seen.has(key)) {
      seen.add(key);
      forms.push({ text: t, kind });
    }
  };
  const plain = plainOf(folded);
  for (const base of bases) {
    for (const reading of [plainOf(base), ...tightOf(base)]) {
      add(reading, "n");
      const s1 = squeeze1(reading);
      if (s1 !== reading) add(s1, "s1");
      const s2 = squeeze2(reading);
      if (s2 !== reading) add(s2, "s2");
      const sa = squeezeAll(reading);
      if (sa !== reading) add(sa, "all");
    }
  }
  let nativePlain = "";
  let nativeTight = "";
  if (hasNonLatin) {
    const tokens = nativeTokensOf(noInvisible);
    nativePlain = tokens.join(" ");
    nativeTight = tokens.join("");
  }
  const fold: SafetyFold = {
    forms, plain, maskedTokens: maskedTokensOf(folded), nativePlain, nativeTight, hasNonLatin, hasLatin, mixedScripts: hasNonLatin && hasLatin,
  };
  lastInput = text;
  lastFold = fold;
  return fold;
}

/** A term in the same plain shape the forms use: lowercase, diacritics gone, punctuation as single spaces. */
export function foldTerm(term: string): string {
  return plainOf(term.toLowerCase().normalize("NFKD").replace(/\p{Mn}/gu, ""));
}

// ---------------------------------------------------------------- term matching

const WORD_CHAR = "[\\p{L}\\p{N}]";
const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasDoubled = (s: string): boolean => /(.)\1/u.test(s);

export interface TermSetOptions {
  /** Terms that match as the start of a word ("pedophil" finds "pedophile"). Everything else is a whole word (or whole phrase). */
  prefix?: (foldedTerm: string) => boolean;
}

/** A compiled list of Latin-script words and phrases, matched through every form of a fold. */
export class TermSet {
  private readonly everywhere: RegExp | null;
  private readonly noDoubled: RegExp | null;
  private readonly onlyDoubled: RegExp | null;
  private readonly singles: readonly string[];

  constructor(terms: readonly string[], options: TermSetOptions = {}) {
    const folded = new Set<string>();
    for (const raw of terms) {
      const t = foldTerm(raw);
      if (!t) continue;
      folded.add(t);
      // A phrase also matches when its words are run together ("underagesex" is one token): added whole, never as a sub-string of a bigger word.
      if (t.includes(" ")) folded.add(t.replace(/ /g, ""));
    }
    const prefix = options.prefix ?? (() => false);
    const build = (list: string[]): RegExp | null => {
      if (list.length === 0) return null;
      const whole = list.filter((t) => !prefix(t)).map(escapeRegex);
      const left = list.filter((t) => prefix(t)).map(escapeRegex);
      const parts: string[] = [];
      if (whole.length) parts.push(`(?:${whole.join("|")})(?!${WORD_CHAR})`);
      if (left.length) parts.push(`(?:${left.join("|")})`);
      return new RegExp(`(?<!${WORD_CHAR})(?:${parts.join("|")})`, "u");
    };
    const all = [...folded];
    this.everywhere = build(all);
    this.noDoubled = build(all.filter((t) => !hasDoubled(t)));
    this.onlyDoubled = build(all.filter((t) => hasDoubled(t)));
    this.singles = all.filter((t) => !t.includes(" ") && t.length >= 3);
  }

  /** True when any term is in the text in any of its forms. */
  test(fold: SafetyFold): boolean {
    for (const form of fold.forms) {
      const re = form.kind === "n" ? this.everywhere : form.kind === "s2" ? this.onlyDoubled : this.noDoubled;
      if (re && re.test(form.text)) return true;
    }
    return false;
  }

  /** True when a token with an interior mask character ("ch*ld") can be one of the single-word terms. */
  testMasked(fold: SafetyFold): boolean {
    for (const token of fold.maskedTokens) {
      const pattern = new RegExp(`^${token.split("?").map(escapeRegex).join("[a-z]{1,3}")}$`);
      if (this.singles.some((term) => term.length >= token.replace(/\?/g, "").length + 1 && pattern.test(term))) return true;
    }
    return false;
  }

  /** test plus testMasked: the one call the floors make. */
  matches(fold: SafetyFold): boolean {
    return this.test(fold) || this.testMasked(fold);
  }
}

const SUBSTRING_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

/** A compiled list of native-script terms. Han, kana and Hangul terms match anywhere (no spaces, particles stick on); other scripts match at the start of a word (stems). */
export class NativeSet {
  private readonly substrings: readonly string[];
  private readonly wordStart: RegExp | null;

  constructor(terms: readonly string[]) {
    const norm = [...new Set(terms.map((t) => t.normalize("NFKC").toLowerCase().replace(/ё/g, "е").replace(/[أإآ]/g, "ا")))];
    this.substrings = norm.filter((t) => SUBSTRING_SCRIPT.test(t));
    const stems = norm.filter((t) => !SUBSTRING_SCRIPT.test(t)).map(escapeRegex);
    this.wordStart = stems.length ? new RegExp(`(?<!${WORD_CHAR})(?:${stems.join("|")})`, "u") : null;
  }

  test(fold: SafetyFold): boolean {
    if (!fold.hasNonLatin) return false;
    if (this.substrings.some((t) => fold.nativeTight.includes(t))) return true;
    return this.wordStart !== null && this.wordStart.test(fold.nativePlain);
  }
}

// ---------------------------------------------------------------- shared word lists (non-English)

/** Age words in Spanish, French, German, Italian and Portuguese (diacritics are folded away before matching, so "niño" is "nino"). Ambiguous everyday words ("kind", "junge", "chico") are left out on purpose. */
export const MINOR_WORDS_I18N: readonly string[] = [
  // Spanish
  "nino", "ninos", "nina", "ninas", "menor", "menores", "bebe", "bebes", "infante", "infantes", "adolescente", "adolescentes", "colegiala", "colegialas", "escolar", "escolares", "chiquilla", "chiquillo", "menor de edad", "lolita",
  // French
  "enfant", "enfants", "mineur", "mineure", "mineurs", "mineures", "fillette", "fillettes", "garconnet", "petite fille", "petites filles", "petit garcon", "petits garcons", "ecoliere", "ecolieres", "ecolier", "collegienne", "bambin", "bambins", "nourrisson", "adolescent", "adolescents", "adolescentes",
  // German
  "kinder", "kleinkind", "kleinkinder", "minderjahrig", "minderjahrige", "jugendlich", "jugendliche", "jugendlicher", "schulmadchen", "schuler", "schulerin", "kleines madchen", "kleiner junge", "saugling", "baby", "babys", "teenager",
  // Italian
  "bambino", "bambina", "bambini", "bambine", "bimbo", "bimba", "bimbi", "minorenne", "minorenni", "ragazzina", "ragazzine", "ragazzino", "scolara", "scolaro", "neonato", "neonata", "infanti", "adolescenti", "pargolo",
  // Portuguese
  "crianca", "criancas", "menino", "menina", "meninos", "meninas", "menor de idade", "bebezinho", "adolescentes", "novinha", "colegial", "pequenina", "pequenino",
];

/** Mild nudity and sex words in the same languages. No slang or graphic terms are listed here: the picture floor's own lists cover English, and the finished-picture check is the backstop. */
export const SEXUAL_WORDS_I18N: readonly string[] = [
  "sexo", "sexual", "sexuales", "desnudo", "desnuda", "desnudos", "desnudas", "desnudez", "erotico", "erotica", "pornografia", "pornografico", "sin ropa",
  "sexe", "sexuel", "sexuelle", "nue", "nues", "nudite", "erotique", "pornographique", "pornographie", "sans vetements",
  "nackt", "nacktheit", "sexuell", "erotisch", "ohne kleidung", "ohne kleider",
  "nudo", "nuda", "nudi", "nude", "sessuale", "sessuali", "sesso", "pornografia", "senza vestiti",
  "pelado", "pelada", "nu em pelo", "sem roupa", "nudez", "nua", "nuas",
];

/** Terms that are child-sexual-abuse coded on their own, in other languages. */
export const STANDALONE_TERMS_I18N: readonly string[] = [
  "pedofilo", "pedofila", "pedofilia", "pedofil", "pedoporno", "pedopornographie", "kinderporno", "kinderpornografie", "pornografia infantil", "porno infantil", "pornographie enfantine", "porno enfantin", "pornografia minorile", "pornografia infanto juvenil",
];

/** Native-script age words (stems). */
export const NATIVE_MINOR_TERMS: readonly string[] = [
  // Japanese
  "子供", "子ども", "こども", "幼女", "少女", "少年", "児童", "未成年", "幼児", "赤ちゃん", "小学生", "中学生", "ロリ", "ショタ",
  // Chinese
  "儿童", "兒童", "小孩", "未成年", "萝莉", "蘿莉", "正太", "女童", "男童",
  // Korean
  "아이", "어린이", "소녀", "미성년", "아동", "초등학생", "로리",
  // Russian
  "ребен", "дети", "детей", "детск", "девочк", "мальчик", "малолет", "несовершеннолет", "школьниц", "школьник", "подросток", "малыш", "лоли",
  // Arabic
  "طفل", "اطفال", "طفلة", "قاصر", "مراهق", "رضيع",
];

/** Native-script nudity and sex words (stems). */
export const NATIVE_SEXUAL_TERMS: readonly string[] = [
  "裸", "ヌード", "全裸", "エロ", "性的", "セックス", "下着", "色情", "性爱", "情色", "누드", "알몸", "섹스", "야한", "성적",
  "гол", "голая", "голый", "обнаж", "секс", "эрот", "порно", "нагой",
  "عاري", "عارية", "جنس", "اباحي",
];

/** Native-script terms that are abuse-coded on their own. */
export const NATIVE_STANDALONE_TERMS: readonly string[] = [
  "ロリコン", "ロリータ", "ショタコン", "児童ポルノ", "儿童色情", "兒童色情", "萝莉控", "детское порно", "아동 포르노", "아청법",
];

export const NATIVE_MINOR = new NativeSet(NATIVE_MINOR_TERMS);
export const NATIVE_SEXUAL = new NativeSet(NATIVE_SEXUAL_TERMS);
export const NATIVE_STANDALONE = new NativeSet(NATIVE_STANDALONE_TERMS);

// ---------------------------------------------------------------- ages

const AGE_WORDS = "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen";
const AGE_NUMBER = "(?:[1-9]|1[0-7])";
const NUM_START = "(?<![\\p{L}\\p{N}])";

/** An age under 18 in any written form on the plain Latin reading: "14yo", "15 y o", "12 yr", "16 year old", "age of 12", "aged 9", "twelve years old", and "14 anos", "14 ans", "14 jahre alt", "14 anni". Whole numbers only, so 25 and 40 pass. */
export const MINOR_AGE = new RegExp(
  [
    `${NUM_START}${AGE_NUMBER}\\s?(?:yo|y o|yr|yrs)(?![\\p{L}\\p{N}])`,
    `${NUM_START}${AGE_NUMBER}\\s?(?:year|years|yr|yrs)\\s(?:old|olds|of age)(?![\\p{L}\\p{N}])`,
    `(?<![\\p{L}\\p{N}])age[sd]?\\s(?:of\\s)?${AGE_NUMBER}(?![\\p{L}\\p{N}])`,
    `(?<![\\p{L}\\p{N}])age[sd]?\\s(?:of\\s)?(?:${AGE_WORDS})(?![\\p{L}\\p{N}])`,
    `(?<![\\p{L}\\p{N}])(?:${AGE_WORDS})\\s(?:year|years|yr|yrs)\\s(?:old|of age)(?![\\p{L}\\p{N}])`,
    `(?<![\\p{L}\\p{N}])(?:${AGE_WORDS})\\s?(?:yo|y o)(?![\\p{L}\\p{N}])`,
    `${NUM_START}${AGE_NUMBER}\\s(?:anos|ans|anni|jahre|jahren|jahrig|jahre alt|jahre jung)(?![\\p{L}\\p{N}])`,
  ].join("|"),
  "u",
);

const NATIVE_MINOR_AGE = new RegExp(`${NUM_START}${AGE_NUMBER}\\s?(?:歳|才|岁|歲|살|лет|года|год|سنة|سنوات)`, "u");

/** True when the text states an age under 18, in Latin or native script. */
export function hasMinorAge(fold: SafetyFold): boolean {
  return MINOR_AGE.test(fold.plain) || (fold.hasNonLatin && NATIVE_MINOR_AGE.test(fold.nativePlain));
}
