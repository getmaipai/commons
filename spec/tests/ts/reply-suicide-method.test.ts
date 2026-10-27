// A reply to a child or teen may tell that a person died by suicide; the sentence that names how, or the scene,
// is cut and a short fixed note follows. Written before the detector exists (it must fail until then).
// Plan: home data-scratch/reports/reply-suicide-method-check-plan.md. The caller applies this to minors only.
import { describe, expect, test } from "bun:test";
import { redactSuicideMethod } from "../../safety/ts/replyMethod.js";

const CUT: { id: string; reply: string; gone: RegExp; kept: RegExp }[] = [
  {
    id: "gunshot in the same sentence as self-inflicted",
    reply: "Kurt Cobain died by suicide on April 5, 1994. The official ruling was a self-inflicted gunshot wound to the head. His music still matters to many fans.",
    gone: /gunshot/i,
    kept: /died by suicide on April 5, 1994.*His music still matters/s,
  },
  {
    id: "method in a separate sentence from the suicide mention",
    reply: "Robin Williams died by suicide in August 2014. The coroner said the cause of death was hanging. He is remembered for his warmth and comedy.",
    gone: /hanging/i,
    kept: /died by suicide in August 2014.*warmth and comedy/s,
  },
  {
    id: "found hanged",
    reply: "Chester Bennington, the Linkin Park singer, died by suicide in 2017. He was found hanged at his home. The band later shared messages of support.",
    gone: /hanged/i,
    kept: /Linkin Park singer.*messages of support/s,
  },
  {
    id: "scene detail",
    reply: "He took his own life in 1994. A suicide note was found at the scene. Fans mourned around the world.",
    gone: /note was found at the scene/i,
    kept: /took his own life in 1994.*Fans mourned/s,
  },
  {
    id: "overdose method for a suicide",
    reply: "She ended her life in 1962. She died of a barbiturate overdose. Her films are still watched.",
    gone: /overdose/i,
    kept: /ended her life in 1962.*films are still watched/s,
  },
  {
    id: "taken her own life, rifle in a later sentence",
    reply: "She had taken her own life in 1962. Reports said she used a rifle. Her films are still watched.",
    gone: /rifle/i,
    kept: /taken her own life.*films are still watched/s,
  },
  {
    id: "shot himself, no suicide word",
    reply: "Ernest Hemingway shot himself in 1961. He is remembered for The Old Man and the Sea.",
    gone: /shot himself/i,
    kept: /Old Man and the Sea/,
  },
  {
    id: "drowning",
    reply: "He died by suicide in 1974. He died by drowning in a lake. His poems remain popular.",
    gone: /drowning/i,
    kept: /poems remain popular/,
  },
  {
    id: "gas fumes and the greenhouse",
    reply: "He died by suicide in 1994. He was found dead in the greenhouse above the garage. Gas fumes were noticed by an electrician. His music mattered.",
    gone: /greenhouse|fumes/i,
    kept: /music mattered/,
  },
  {
    id: "list items without end punctuation",
    reply: "He died by suicide in 1994.\n- Singer of a famous band\n- Found hanging at home\n- Loved by many fans",
    gone: /hanging/i,
    kept: /Singer of a famous band[\s\S]*Loved by many fans/,
  },
];

const KEEP: { id: string; reply: string }[] = [
  { id: "Elvis, no suicide mention", reply: "Elvis Presley died on August 16, 1977, at Graceland. The cause was cardiac arrhythmia linked to heart disease." },
  { id: "opioid crisis, overdose without suicide", reply: "The opioid crisis caused many overdose deaths in the 2010s. Laws now limit how pain pills are prescribed." },
  { id: "suicide prevention reply", reply: "I am sorry you feel this way. You are not alone. Please talk to a trusted adult, or call or text 988 any time." },
  { id: "Holocaust history", reply: "About six million Jews were murdered by the Nazis between 1941 and 1945. Many were killed in gas chambers at camps such as Auschwitz." },
  { id: "slavery history", reply: "Enslaved people were hanged for resisting in some colonies. Abolition came through war and law." },
  { id: "health class dose and overdose, no suicide", reply: "An adult dose of ibuprofen is on the label. Too much can cause an overdose that harms the stomach and kidneys, so ask a pharmacist." },
  { id: "empty reply", reply: "" },
  { id: "means restriction advice", reply: "If you are thinking about suicide, put away any pills or guns and tell a trusted adult." },
  { id: "means restriction fact", reply: "Suicide is a leading cause of death. Locking up guns lowers risk." },
  { id: "hanging out", reply: "Thoughts of suicide are serious. Keep hanging out with friends you trust." },
  { id: "Hungary", reply: "Suicide rates in Hungary fell after 2000." },
  { id: "gunman and gunpowder with suicide mention elsewhere", reply: "Suicide prevention matters. The gunman in the story hid gunpowder in a barrel." },
];

describe("redactSuicideMethod", () => {
  for (const c of CUT) {
    test(`cuts the method sentence: ${c.id}`, () => {
      const out = redactSuicideMethod(c.reply);
      expect(out.cut).toBe(true);
      expect(out.text).not.toMatch(c.gone);
      expect(out.text).toMatch(c.kept);
      expect(out.text).toContain("988");
      expect(out.text).toMatch(/left out/i);
    });
  }
  for (const k of KEEP) {
    test(`leaves the reply alone: ${k.id}`, () => {
      const out = redactSuicideMethod(k.reply);
      expect(out.cut).toBe(false);
      expect(out.text).toBe(k.reply);
    });
  }
  test("an Elvis-style reply with a method word but no suicide mention is untouched", () => {
    expect(redactSuicideMethod("The hero was hanged for treason in 1780.").cut).toBe(false);
  });

  test("a reply that is only the method sentence becomes just the note, with no leading blank lines", () => {
    const out = redactSuicideMethod("He died by suicide. He was found hanging.");
    expect(out.cut).toBe(true);
    expect(out.text).toMatch(/^He died by suicide\./);
    const only = redactSuicideMethod("She took her own life by overdose.");
    expect(only.cut).toBe(true);
    expect(only.text.startsWith("\n")).toBe(false);
  });
  test("the pieces of a split reply always join back to the reply when nothing is cut", () => {
    const reply = "Dr. Smith said 3.5 hours.\n\n- one\n- two\n\nDone.";
    expect(redactSuicideMethod(reply)).toEqual({ text: reply, cut: false });
  });
});
