// One detector function per category (platform plan 4.3's eight): each
// takes normalized text (and minimal context) and returns the ids of the
// internal signals that fired. A category flags only when its own
// combination rule is satisfied (typically two independent signals AND'd
// together, or a strong direct-intent pattern), never on a single loose
// keyword match. This is the "deterministic multi-signal classifier" 4.3
// asks for: no model in the loop for the floor.
//
// This is a first-pass baseline, not a claim of state-of-the-art coverage.
// 4.3: "harvest the real failures and train on those" (borrowed from the
// wake-word training rule, CLAUDE.md) applies here too, the corpus in
// spec/safety/corpus/ is expected to grow as real misses turn up.
import remove from "confusables";
import {
  NATIVE_MINOR, NATIVE_SEXUAL, NATIVE_STANDALONE, MINOR_WORDS_I18N, SEXUAL_WORDS_I18N, STANDALONE_TERMS_I18N, TermSet, foldForSafety, hasMinorAge,
} from "./fold.js";

export interface SafetyContext {
  /** Is the speaker a minor (role teen or child)? Grooming detection is
   * scoped to this; self-harm's parent-notify policy reads it too, but
   * that decision lives in the caller (checkSafety), not here. */
  isMinor: boolean;
  /** CSAM-TEXT-01 (owner's ruling 2026-10-19, docs/design/child-safety-text-2026-10-19.md in the hub): how the `csam` category reads this
   * text. `floor` (the default, and always for a teen, a child, a robot and a generation prompt) is the full rule. `adult_message` is an
   * adult's chat message: only an explicit term or a request to produce the content refuses, so a question about a film or a pasted
   * news article passes. `adult_reply` is the model's reply to an adult: no `csam` word rule at all (discussion is not filtered; the
   * model's own refusals and the generation checks are the protection). Every other category reads the text the same way. */
  csamMode?: "floor" | "adult_message" | "adult_reply";
}

export interface CategorySignals {
  category: string;
  matched: string[];
}

// Issue #10: this used to be a bare toLowerCase(), so seven of the eight
// 4.3 categories (everything but csam, which had its own separate
// csamNormalize below) had no obfuscation resistance at all - including
// prompt_injection and jailbreak, which are adversarial by definition.
// Reproduced live: a Cyrillic "о" or Greek omicron standing in for a
// Latin "o" (or a zero-width space inside a word) walked straight past
// every detector, since NFKD has no compatibility mapping for a
// genuinely different character that merely LOOKS like Latin - that's a
// confusables (skeleton) problem, a different mechanism from the
// separator/diacritic obfuscation csamNormalize's own NFKD step defeats.
//
// One shared pipeline every detector now inherits, rather than a second
// hand-written homoglyph list beside csamNormalize's own: strip Unicode
// format characters (zero-width space/joiners, RTL/LTR overrides) first,
// fold confusables to their Latin skeleton via the `confusables` package
// (the actual Unicode confusables table, not a hand-rolled list - the
// org's own "a maintained library... beats hand-rolled logic doing the
// identical job" rule), then lowercase.
//
// The folded string is a MATCHING COPY ONLY: never stored, logged,
// forwarded to a model, or shown to a person. Folding is lossy by design
// (it exists to catch obfuscated ASCII lookalikes, not to transliterate
// real non-Latin text) - i18n will eventually bring genuine non-Latin
// household text through here, and this must never corrupt or replace
// what a person actually typed, only decide whether the FLOOR fires.
// Single-slot memo, not a bigger cache: classifier.ts's checkSafety()
// calls up to eight detectors back-to-back, every one of them normalizing
// the IDENTICAL `text` argument independently - a code review of the
// confusables fix (2026-09-06) found this had gone from a bare
// toLowerCase() to real per-codepoint work (the confusables package's own
// regex passes plus a table lookup per character), turning what used to
// be negligible into up to 8x redundant work on a hot path this file's
// own classifier.ts header calls out as running "before any model, and
// again on every streamed sentence." Safe as a single JS-thread-only
// slot: norm() has no `await` inside it, so nothing can interleave a
// second call between checking and setting these two variables.
let lastNormInput: string | undefined;
let lastNormOutput: string | undefined;
function norm(text: string): string {
  if (text === lastNormInput && lastNormOutput !== undefined) return lastNormOutput;
  const noFormatChars = text.replace(/\p{Cf}/gu, "");
  const result = remove(noFormatChars).toLowerCase();
  lastNormInput = text;
  lastNormOutput = result;
  return result;
}

function anyMatch(text: string, patterns: RegExp[]): RegExp | null {
  for (const p of patterns) if (p.test(text)) return p;
  return null;
}

// ── self_harm ──────────────────────────────────────────────────────────
// Never suppresses the whole reply (checkSafety maps this to
// allow_with_resources, never refuse): CLAUDE.md > Safety invariants,
// "Crisis resources: offer, never block."

const SELF_HARM_DIRECT = [
  /\bi\s*(?:'m| am)?\s*(?:want|wish|plan(?:ning)?|going)\s+to\s+(?:kill|end)\s+(?:myself|my\s+own\s+life|my\s+life)\b/,
  /\bi\s*(?:'m| am)\s+going\s+to\s+kill\s+myself\b/,
  /\bi\s+want\s+to\s+die\b/,
  /\bi\s+don'?t\s+want\s+to\s+(?:be\s+alive|live\s+anymore|exist\s+anymore|wake\s+up)\b/,
  /\bi'?m\s+(?:done|finished)\s+with\s+life\b/,
  // SAFETY-01 (the live chat of 2026-09-14, finding 26): the wordings
  // that were said and never matched.
  // "end it with him", "end things at work", "end it early" and "born
  // in July" are anybody's words (a review): "end it" needs a time and
  // no object, "end it all" and "end my life" stand alone.
  /\bi\s+(?:wish|wished)\s+i\s+(?:wasn'?t|weren'?t|was\s+not|were\s+not)\s+(?:alive|here\s+anymore|around\s+anymore)\b/,
  /\bi\s+don'?t\s+want\s+to\s+(?:be\s+here|go\s+on|carry\s+on|keep\s+going)\s+anymore\b/,
  /\bi\s*(?:'m| am)?\s*(?:going|mean|meaning|intend|intending|plan|planning)\s+to\s+end\s+(?:it\s+all|my\s+life)\b/,
  /\bi\s*(?:'m| am)?\s*(?:going|mean|meaning|intend|intending|plan|planning)\s+to\s+end\s+it\s+(?:tonight|today|now|this\s+week)\s*(?:[.!?]|$)/,
  /\b(?:tonight|today)\s+(?:is|'s)\s+the\s+night\s+i\s+end\s+(?:it|my\s+life)\b/,
];

const SELF_HARM_MEANS_SEEKING = [
  /\bhow\s+(?:many|much)\b.{0,20}\b(?:pills|tablets|painkillers)\b.{0,20}\b(?:kill|die|overdose)\b/,
  /\bpainless\s+way(?:s)?\s+to\s+die\b/,
  /\bhow\s+to\s+(?:kill\s+myself|end\s+my\s+life|commit\s+suicide)\b/,
  /\bbest\s+method\s+to\s+kill\s+myself\b/,
  // SAFETY-01: the means question as it was actually asked.
  // "best way to do it" and "way to go" stay out: on their own they
  // are anybody's question, and in the crisis state the overlay is on
  // every reply regardless.
  /\b(?:easiest|quickest|fastest|simplest|least\s+painful|most\s+painless|cleanest)\s+way(?:s)?\s+to\s+(?:die|kill\s+myself|end\s+(?:it\s+all|my\s+life))\b/,
  /\bhow\s+(?:do|can|could|would|should)\s+i\s+(?:kill\s+myself|end\s+my\s+life|end\s+it\s+all)\b/,
  /\bways?\s+to\s+(?:kill\s+myself|end\s+my\s+life|end\s+it\s+all)\b/,
  /\b(?:what|which)\s+(?:pills|drugs|medications?)\s+(?:would|could|will|can)\s+(?:kill|end)\s+(?:me|my\s+life)\b/,
];

const SELF_HARM_PASSIVE = [
  /\bi\s+wish\s+i\s+(?:was|were)\s+dead\b/,
  /\bbetter\s+off\s+dead\b/,
  /\bno\s+reason\s+to\s+live\b/,
  /\bnobody\s+would\s+(?:miss|notice)\s+(?:if\s+i\s+)?(?:was|were)\s+gone\b/,
];

// Hyperbole that must never flag: the direct/means-seeking/passive
// patterns above are worded specifically to avoid these. This list has no
// runtime behavior (it never suppresses anything at runtime, since the
// patterns above simply never match these phrases in the first place); a
// code review (2026-09-04) found an earlier version of this file computing
// a match against this list and then discarding the result in a dead
// if-block that looked like it did something. Its real job is as a
// regression fixture: spec/tests/ts/safety.test.ts asserts none of the
// patterns above ever match any phrase here, so this list is exported for
// that test rather than consulted at runtime.
export const SELF_HARM_IDIOMS = [
  /\bkill\s+me\s+now\b/,
  /\bthis\s+is\s+killing\s+me\b/,
  /\bdying\s+(?:of\s+)?laugh(?:ing|ter)\b/,
  /\bi\s+could\s+just\s+die\s+of\s+embarrassment\b/,
  /\bworked\s+myself\s+to\s+death\b/,
  /\bstarving\s+to\s+death\b/,
];

export const SELF_HARM_DIRECT_PATTERNS = [
  ...SELF_HARM_DIRECT,
  ...SELF_HARM_MEANS_SEEKING,
  ...SELF_HARM_PASSIVE,
];

// Self-injury, restriction and asphyxiation-game wordings that only a minor's message flags. An adult's wording is the model's
// decision, so detectSelfHarm applies these only when the speaker is a minor. Worded for intent or hiding so "I cut myself
// shaving", "cut my hair" and "a 2000 calorie day" never match.
const MINOR_SELF_HARM = [
  /\bhow\s+(?:do|can|could|should|to)\s+(?:i\s+)?(?:best\s+)?(?:cut|hurt|harm)\s+myself\b(?!\s+(?:a|an|some|the|another|more)\b)/,
  /\b(?:best|easiest|safest|quickest)\s+way\s+to\s+(?:cut|hurt|harm)\s+myself\b/,
  /\bi\s+(?:want|need|wanna)\s+to\s+(?:cut|hurt|harm)\s+myself\b/,
  /\b(?:cutting|hurting|harming)\s+myself\b/,
  /\bi\s+(?:cut|hurt|harm)\s+myself\s+on\s+purpose\b/,
  /\bhide\s+(?:my\s+)?(?:cuts?|scars?|self[- ]?harm|bruises)\s+from\b/,
  /\b(?:[5-9]\d{2}|1[0-4]\d{2})\s+cal(?:orie)?s?\s+(?:a|per|each)\s+day\b/,
  /\bstarve\s+myself\b/,
  /\bmake\s+myself\s+(?:throw\s+up|vomit|puke)\b/,
  /\b(?:how\s+(?:do|can|to)\s+(?:i\s+)?(?:do|play|try|get)|(?:want|wanna|let'?s|try)\s+to\s+(?:do|play|try))\b[^.?!]{0,25}\b(?:choking|pass(?:ing)?[\s-]?out|blackout|fainting)\s+(?:challenge|game)\b/,
];

export function detectSelfHarm(rawText: string, isMinor = false): CategorySignals {
  const text = norm(rawText);
  const matched: string[] = [];
  if (anyMatch(text, SELF_HARM_DIRECT)) matched.push("self_harm.direct_intent_phrase");
  if (anyMatch(text, SELF_HARM_MEANS_SEEKING)) matched.push("self_harm.means_seeking");
  if (anyMatch(text, SELF_HARM_PASSIVE)) matched.push("self_harm.passive_ideation");
  if (isMinor && anyMatch(text, MINOR_SELF_HARM)) matched.push("self_harm.minor_injury_restriction_or_game");
  return { category: "self_harm", matched };
}

// ── harmful_request ────────────────────────────────────────────────────
// Two independent signals required: a dangerous topic AND an actionable
// "give me the steps" framing. A bare mention of the topic (a history
// question, a news reference) never flags alone.

const HARMFUL_TOPIC = [
  /\b(?:pipe\s+bomb|explosive\s+device|homemade\s+bomb|nail\s+bomb)\b/,
  /\b(?:sarin|nerve\s+gas|ricin|homemade\s+poison)\b/,
  /\b(?:untraceable|3d[- ]printed|ghost)\s+(?:gun|firearm)\b/,
  /\bransomware\s+to\s+(?:encrypt|lock)\b/,
  /\bmalware\s+to\s+steal\b/,
  /\bddos\s+attack\s+(?:script|tool)\b/,
];

const HARMFUL_ACTIONABLE = [
  /\bhow\s+(?:do\s+i|to)\s+(?:make|build|synthesi[sz]e|construct)\b/,
  /\bstep[- ]by[- ]step\s+instructions?\b/,
  /\bgive\s+me\s+(?:the\s+)?(?:exact\s+)?(?:instructions|recipe|steps)\b/,
  /\bwalk\s+me\s+through\s+(?:building|making)\b/,
  /\bexact\s+(?:ratio|quantities|amounts)\b/,
];

const HARMFUL_ACADEMIC_FRAMING = [
  /\bfor\s+(?:a\s+)?(?:novel|story|screenplay|class|research\s+paper)\b/,
  /\bhistorically\b/,
  /\bpurely\s+(?:academic|hypothetical)\b/,
];

export function detectHarmfulRequest(rawText: string): CategorySignals {
  const text = norm(rawText);
  const matched: string[] = [];
  const topic = anyMatch(text, HARMFUL_TOPIC);
  const actionable = anyMatch(text, HARMFUL_ACTIONABLE);
  if (topic && actionable) {
    matched.push("harmful_request.dangerous_topic", "harmful_request.actionable_instruction_ask");
    // Framing is recorded, never treated as a bypass: CLAUDE.md > Safety
    // invariants, these protections are non-removable for any reason.
    if (anyMatch(text, HARMFUL_ACADEMIC_FRAMING)) {
      matched.push("harmful_request.academic_framing_present");
    }
  }
  return { category: "harmful_request", matched };
}

// ── credible_threat ────────────────────────────────────────────────────
// A direct first-person threat verb+target, PLUS either a method/weapon or
// an explicit plan marker, distinguishes a credible threat from angry
// hyperbole ("I'll kill you if you touch my fries"). Target is restricted
// to a real personal pronoun, not any word: a code review (2026-09-04)
// empirically ran this against "I'm going to beat up this boss tomorrow
// in the game" and got a false credible_threat refuse, because the
// earlier `[a-z]+` catch-all target matched "boss" same as it would match
// a real person. Ordinary gaming/fiction talk names its target as a noun
// ("boss", "dragon", a monster name); a pronoun is far more likely to
// refer to an actual person in conversational text. This trades recall
// (a threat phrased with a named target, "I'm going to hurt Sage
// tomorrow", is missed) for precision; a known limitation, not a claim
// this closes the gap completely.
const THREAT_DIRECT = [
  /\bi(?:'m| am)?\s+going\s+to\s+(?:kill|hurt|attack|stab|shoot|beat\s+up)\s+(?:him|her|them|you)\b/,
  /\bi\s+will\s+(?:kill|hurt|attack|stab|shoot)\s+(?:him|her|them|you)\b/,
  /\bi'?m\s+gonna\s+shoot\s+up\b/,
];

const THREAT_METHOD_OR_PLAN = [
  /\b(?:with\s+(?:my|a|the)\s+(?:gun|knife|dad'?s\s+gun))\b/,
  /\b(?:tonight|tomorrow|when\s+i\s+see\s+(?:him|her|them)|when\s+they\s+get\s+home|at\s+school)\b/,
  /\bi\s+have\s+a\s+plan\b/,
];

export function detectCredibleThreat(rawText: string): CategorySignals {
  const text = norm(rawText);
  const matched: string[] = [];
  const direct = anyMatch(text, THREAT_DIRECT);
  const method = anyMatch(text, THREAT_METHOD_OR_PLAN);
  if (direct && method) {
    matched.push("credible_threat.direct_threat_with_target", "credible_threat.method_or_plan");
  }
  return { category: "credible_threat", matched };
}

// ── csam ───────────────────────────────────────────────────────────────
// Always refuse, no framing exception, regardless of band (CLAUDE.md >
// Safety invariants: non-removable). Adapted from the legacy hub's
// lib/safety/csamGuard.ts screenPrompt() (principle 8: this is exactly
// the "hard-won logic" carve-out, a real-world-hardened term-intersection
// blocklist, not feature scope or UI). The legacy file is honest about
// its own limits ("a blocklist is evadable... responsible defense in
// depth... not a guarantee"); that caveat carries over unchanged.

// Terms that are CSAM-coded on their own: block regardless of context.
// Split into single tokens (matched with a LEFT word boundary only, so a
// deliberate stem like "pedophil" still catches "pedophile"/"pedophilia")
// and multi-word phrases (matched as a whole word sequence on both
// sides). "cp " used to be here as a bare two-letter term: a code review
// (2026-09-04) ran this against "set up my MCP server" and got a false
// CSAM refuse, because the trailing space meant to mark a word boundary
// was being stripped before matching, and even fixed, a 2-letter
// abbreviation is too ambiguous (MCP, CPU, cp the shell command) to be a
// safe standalone signal at all. Removed rather than patched.
const STANDALONE_SINGLE_TERMS = [
  "loli", "lolicon", "shota", "shotacon", "lolita",
  "csam", "jailbait", "pedo", "pedophil", "childporn",
];
const STANDALONE_PHRASES = ["child porn", "underage sex", "underage porn", "preteen sex"];

// Indicators that a depicted or described person is (or appears to be) a minor.
const AGE_TERMS = [
  "child", "children", "kid", "kids", "toddler", "infant", "baby", "babies",
  "preteen", "pre-teen", "tween", "pubescent", "prepubescent", "pre-pubescent",
  "underage", "under-age", "underaged", "minor", "minors", "juvenile",
  "schoolgirl", "schoolboy", "school girl", "school boy", "schoolkid",
  "elementary school", "middle school", "grade school", "kindergarten",
  "little girl", "little boy", "young girl", "young boy", "small girl", "small boy",
  "newborn", "baby girl", "baby boy",
  "childlike", "child-like", "childish", "baby-faced", "babyface", "baby face",
  "infantile", "childlike face", "child face", "childlike body",
];

// Sexual / explicit indicators.
const SEXUAL_TERMS = [
  "sex", "sexual", "sexy", "nude", "naked", "nudity", "nsfw", "porn", "porno",
  "explicit", "erotic", "lewd", "hentai", "ecchi", "ahegao", "fetish",
  "genital", "genitalia", "penis", "vagina", "pussy", "cock", "dick",
  "breast", "breasts", "boob", "nipple", "areola",
  "cum", "creampie", "penetration", "penetrated", "intercourse", "fellatio",
  "masturbat", "orgasm", "spread legs", "spreading legs", "topless", "bottomless",
  "lingerie", "panties", "undress", "undressing", "molest",
];

// Words that are sexual only in some uses ("the seductive fantasy of violent redemption", "kids in bikinis at the beach",
// "in bed with a cold"). Next to a minor indicator in ONE sentence they still refuse; anywhere else in a longer reply they
// do not, so a film's plot summary is not refused for a young character's age in one paragraph and "seductive" in another.
// The strong terms above keep the whole-reply rule (a claim split across sentences). Owner-approved 2026-10-19.
const AMBIGUOUS_SEXUAL_TERMS = ["seductive", "suggestive", "provocative", "in heat", "in bed", "bikini", "thong", "cleavage"];

// The obfuscation handling (separators, leetspeak, repeated and masked letters, look-alike letters, invisible
// characters, other languages and scripts) lives in ONE place, ./fold.ts, shared with the pictures prompt floor in
// Home (principle 4). This file keeps only the English term lists and the combination rule.
//
// Deliberate stems meant to match as a PREFIX, not a whole word: "pedophil" still catches "pedophile",
// "masturbat" catches "masturbating". Every other single term is a whole word ("cum" must not match "cumin"), and
// multi-word phrases match from their left edge ("middle school" matches "middle schooler").
const PREFIX_STEM_TERMS = new Set(["pedophil", "masturbat", "pedofil"]);
const prefixOrPhrase = (term: string): boolean => PREFIX_STEM_TERMS.has(term) || term.includes(" ");

const STANDALONE_SET = new TermSet([...STANDALONE_SINGLE_TERMS, ...STANDALONE_PHRASES, ...STANDALONE_TERMS_I18N], { prefix: prefixOrPhrase });
const AGE_SET = new TermSet([...AGE_TERMS, ...MINOR_WORDS_I18N], { prefix: prefixOrPhrase });
const SEXUAL_SET = new TermSet([...SEXUAL_TERMS, ...SEXUAL_WORDS_I18N], { prefix: prefixOrPhrase });
const AMBIGUOUS_SET = new TermSet(AMBIGUOUS_SEXUAL_TERMS, { prefix: prefixOrPhrase });
const SENTENCE_BREAK = /(?<=[.!?])\s+|\n+/;

export function detectCsam(rawText: string): CategorySignals {
  const fold = foldForSafety(rawText);
  const matched: string[] = [];

  if (STANDALONE_SET.matches(fold) || NATIVE_STANDALONE.test(fold)) {
    matched.push("csam.standalone_term");
    return { category: "csam", matched };
  }

  const hasAge = AGE_SET.matches(fold) || hasMinorAge(fold) || NATIVE_MINOR.test(fold);
  const hasSexual = SEXUAL_SET.matches(fold) || NATIVE_SEXUAL.test(fold);
  if (hasAge && hasSexual) {
    matched.push("csam.minor_indicator_with_sexual_term");
    return { category: "csam", matched };
  }

  // An ambiguous word counts only in the same sentence as the minor indicator.
  if (hasAge && AMBIGUOUS_SET.matches(fold)) {
    for (const sentence of rawText.split(SENTENCE_BREAK)) {
      if (!sentence.trim()) continue;
      const part = foldForSafety(sentence);
      const sentenceAge = AGE_SET.matches(part) || hasMinorAge(part) || NATIVE_MINOR.test(part);
      if (sentenceAge && AMBIGUOUS_SET.matches(part)) {
        matched.push("csam.minor_indicator_with_ambiguous_term_same_sentence");
        break;
      }
    }
  }

  return { category: "csam", matched };
}

// CSAM-TEXT-01: what an ADULT's chat message is refused for. An explicit term that names the content itself (not the words news and
// advice use, such as "csam", "pedophile" or "Lolita") in a sentence that asks for something, and a request to produce it: one sentence that asks for writing, a
// description, a picture or a role-play (with the sentence before it) AND holds a minor indicator AND a sexual term. Discussion, news, fiction, health and advice
// pass; the pairing anywhere else in the text is not a refusal.
const ADULT_EXPLICIT_TERMS = ["loli", "lolicon", "shota", "shotacon", "jailbait", "childporn", "child porn", "underage sex", "underage porn", "preteen sex"];
const ADULT_EXPLICIT_SET = new TermSet([...ADULT_EXPLICIT_TERMS, ...STANDALONE_TERMS_I18N], { prefix: prefixOrPhrase });
const REQUEST_VERBS = [
  "write", "describe", "draw", "show", "imagine", "roleplay", "role play", "role-play", "pretend", "generate", "create", "make it", "make her", "make him", "make them", "make this", "make that",
  "depict", "paint", "illustrate", "narrate", "tell me", "give me", "i want", "looking for", "find me", "send me", "picture a", "picture an",
  "what does", "how does",
];
const REQUEST_SET = new TermSet(REQUEST_VERBS, { prefix: prefixOrPhrase });

export function detectCsamAdultMessage(rawText: string): CategorySignals {
  const matched: string[] = [];
  const fold = foldForSafety(rawText);
  // An explicit term counts when the sentence asks for something ("show me loli content"); news and advice that merely name it
  // ("child porn was found on his devices") pass, as the leading assistants' discussion allowances do.
  const sentenceList = rawText.split(SENTENCE_BREAK).filter((x) => x.trim());
  for (const sentence of sentenceList) {
    const part = foldForSafety(sentence);
    if ((ADULT_EXPLICIT_SET.matches(part) || NATIVE_STANDALONE.test(part)) && REQUEST_SET.matches(part)) {
      matched.push("csam.explicit_term");
      return { category: "csam", matched };
    }
  }
  // A request sentence, read together with the sentence before it ("She is 11. Describe her naked."): the verb must sit in the
  // later sentence, and the minor indicator and the sexual term must both be in the pair.
  const sentences = sentenceList;
  for (let i = 0; i < sentences.length; i++) {
    if (!REQUEST_SET.matches(foldForSafety(sentences[i]!))) continue;
    const part = foldForSafety(i > 0 ? `${sentences[i - 1]} ${sentences[i]}` : sentences[i]!);
    const age = AGE_SET.matches(part) || hasMinorAge(part) || NATIVE_MINOR.test(part);
    const sexual = SEXUAL_SET.matches(part) || AMBIGUOUS_SET.matches(part) || NATIVE_SEXUAL.test(part);
    if (age && sexual) {
      matched.push("csam.request_to_generate");
      break;
    }
  }
  return { category: "csam", matched };
}

// ── grooming ───────────────────────────────────────────────────────────
// Only evaluated when the speaker is a minor (4.3: "grooming and
// attachment or romance patterns toward a minor speaker").

const GROOMING_PATTERNS = [
  /\byou'?re\s+my\s+(?:girlfriend|boyfriend)\s+now\b/,
  /\bi\s+love\s+you\s+like\s+a\s+(?:girlfriend|boyfriend)\b/,
  /\bthis\s+is\s+our\s+secret,?\s+don'?t\s+tell\s+your\s+parents\b/,
  /\bkeep\s+this\s+between\s+us\b/,
  /\byou'?re\s+so\s+mature\s+for\s+your\s+age\b/,
  /\bi'?ll\s+(?:buy|get)\s+you\s+(?:gifts|presents)\s+if\s+you\b/,
];

export function detectGrooming(rawText: string, ctx: SafetyContext): CategorySignals {
  const matched: string[] = [];
  if (ctx.isMinor) {
    const text = norm(rawText);
    if (anyMatch(text, GROOMING_PATTERNS)) matched.push("grooming.romance_or_secrecy_pattern");
  }
  return { category: "grooming", matched };
}

// ── pii_extraction ─────────────────────────────────────────────────────
// A request for another named person's sensitive data. First-person ("my
// own SSN") never flags: that's the person's own data, not extraction.

const SENSITIVE_DATA_NOUN = [
  /\b(?:social\s+security\s+number|ssn)\b/,
  /\bpassword\b/,
  /\b(?:home\s+address|street\s+address)\b/,
  /\bcredit\s+card\s+number\b/,
  /\bpassport\s+number\b/,
];

const THIRD_PARTY_REQUEST = [
  /\b(?:what(?:'s| is)|give\s+me|find|tell\s+me|get\s+me)\b[^.?!]{0,40}\b(?!my\b|our\b)([a-z]+)'s\b/,
];

export function detectPiiExtraction(rawText: string): CategorySignals {
  const text = norm(rawText);
  const matched: string[] = [];
  if (anyMatch(text, SENSITIVE_DATA_NOUN) && anyMatch(text, THIRD_PARTY_REQUEST)) {
    matched.push("pii_extraction.third_party_sensitive_data_request");
  }
  return { category: "pii_extraction", matched };
}

// ── prompt_injection ───────────────────────────────────────────────────

const INJECTION_PATTERNS = [
  /\bignore\s+(?:all\s+)?(?:previous|prior)\s+instructions\b/,
  /\bdisregard\s+the\s+system\s+prompt\b/,
  /\byou\s+are\s+now\s+[a-z0-9 ]{2,30}\b/,
  /\bnew\s+instructions?\s*:/,
  /\bthe\s+following\s+is\s+a\s+new\s+directive\b/,
  /\bforget\s+(?:all\s+)?(?:your\s+)?(?:prior\s+)?rules\b/,
];

export function detectPromptInjection(rawText: string): CategorySignals {
  const text = norm(rawText);
  const matched: string[] = [];
  if (anyMatch(text, INJECTION_PATTERNS)) matched.push("prompt_injection.override_phrasing");
  return { category: "prompt_injection", matched };
}

// ── jailbreak ──────────────────────────────────────────────────────────

const JAILBREAK_PATTERNS = [
  /\bdan\s+mode\b/,
  /\bdeveloper\s+mode\s+enabled\b/,
  /\bpretend\s+you\s+have\s+no\s+restrictions\b/,
  /\bact\s+as\s+an?\s+ai\s+(?:without|with\s+no)\s+(?:content\s+policy|filters?|restrictions?)\b/,
  /\byou\s+have\s+no\s+filter\b/,
  /\bignore\s+your\s+guidelines\s+and\s+just\s+answer\b/,
  /\broleplay\s+as\s+an?\s+unrestricted\s+ai\b/,
];

export function detectJailbreak(rawText: string): CategorySignals {
  const text = norm(rawText);
  const matched: string[] = [];
  if (anyMatch(text, JAILBREAK_PATTERNS)) matched.push("jailbreak.restriction_bypass_framing");
  return { category: "jailbreak", matched };
}
