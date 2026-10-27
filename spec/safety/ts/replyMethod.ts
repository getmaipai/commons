// A reply to a child or teen may tell that a person died by suicide (history, news, a school project). The sentence that
// names how, or the scene, is left out and one short fixed note follows. The caller applies this to minors only; an adult's
// reply is the model's decision. Not part of checkSafety: a refusal there would replace the whole turn, and self_harm would
// alert a parent about a history question. Plan: home data-scratch/reports/reply-suicide-method-check-plan.md.
// Plain string matching, portable to the robot's Python port like the rest of safety/ts.

const REFLEXIVE = "(?:him|her|them)sel(?:f|ves)";
const SUICIDE = new RegExp(
  "\\b(?:suicid\\w*|(?:killed|kill|hurt|harmed|shot|hanged|hung|stabbed|drowned|poisoned|suffocated|strangled)\\s+" + REFLEXIVE
  + "|(?:took|taken|takes|take|taking|ended|ends|end|ending)\\s+(?:his|her|their)\\s+(?:own\\s+)?li(?:fe|ves)|self[- ]inflicted)",
  "i",
);

const METHOD = new RegExp(
  "\\b(?:gunshots?|shotguns?|rifles?|pistols?|revolvers?|firearms?|guns?|bullets?|shot\\s+" + REFLEXIVE
  + "|hang(?:ing(?!\\s+out)|ed|s)|hung|nooses?|overdos\\w*|barbiturates?|pills|poison\\w*|cyanide|knife|razor|stabb\\w*|drown\\w*|suffocat\\w*|strangl\\w*"
  + "|(?:jump(?:ed|ing)?|leap(?:t|ed)?|fell)\\s+(?:from|off|into|in\\s+front\\s+of)|asphyxia\\w*|carbon\\s+monoxide|(?:gas\\s+)?fumes|exhaust|slit|wrists?"
  + "|(?:suicide\\s+)?note\\s+(?:was\\s+)?(?:found|left)|at\\s+the\\s+scene"
  + "|found\\s+(?:dead\\s+)?(?:in|at|on|inside)\\s+(?:his|her|their|the)\\s+(?:garage|greenhouse|bathroom|bedroom|car|home|apartment|hotel|room|house|kitchen|basement|attic|closet|woods))\\b",
  "i",
);

// Help, prevention and means-restriction sentences ("put away any guns", "call or text 988") name the means to keep people safe.
const ADVICE = /\b(?:988|trusted adult|talk to|reach out|crisis|helpline|hotline|if you|put\s+away|lock(?:ing|ed)?\s+(?:up|away)|safely|please)\b/i;

export const SUICIDE_METHOD_NOTE =
  "How it happened is left out on purpose. If you or someone you know is struggling, call or text 988 any time.";

/** True when `sentence` names a method or scene of a suicide, read with the text that came before it in the same reply
 * (the suicide may be mentioned in an earlier sentence or in this one). */
export function namesSuicideMethod(sentence: string, before = ""): boolean {
  if (!METHOD.test(sentence) || ADVICE.test(sentence)) return false;
  return SUICIDE.test(before) || SUICIDE.test(sentence);
}

/** Splits a reply into sentences, keeping each one's trailing whitespace so the pieces concatenate back to the reply. */
function sentences(text: string): string[] {
  return text.match(/[^.!?\n]+(?:[.!?]+["')\]]*\s*|\n+|$)|[.!?]+\s*|\n+/g) ?? [];
}

export function redactSuicideMethod(reply: string): { text: string; cut: boolean } {
  let kept = "";
  let seen = "";
  let cut = false;
  for (const s of sentences(reply)) {
    if (namesSuicideMethod(s, seen)) cut = true;
    else kept += s;
    seen += s;
  }
  if (!cut) return { text: reply, cut: false };
  return { text: kept.trim() ? `${kept.trimEnd()}\n\n${SUICIDE_METHOD_NOTE}` : SUICIDE_METHOD_NOTE, cut: true };
}
