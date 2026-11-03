"use client";

// VIDEO-SETTINGS-07 story: the three phrase lists of the Style editor (trigger words, "also add" phrases,
// avoid with say instead), with the limits of the LoRA note. Rendered by hand to check 1440 and 390 in
// both themes. Takes no props and no data.
import { useState } from "react";
import { PhraseListField, PhrasePairsField, type PhrasePair } from "./PhraseListField";

export function PhraseListFieldShowcase({ disabled = false }: { disabled?: boolean }) {
  const [words, setWords] = useState(["inkwash", "paper boat"]);
  const [addIns, setAddIns] = useState(["soft rain on the window"]);
  const [pairs, setPairs] = useState<PhrasePair[]>([{ avoid: "dark", say: "lit by a warm lamp" }]);
  return (
    <section aria-label="Phrase lists" className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <PhraseListField label="Trigger words" help="Words that switch this style on. Press Enter or type a comma after each one." value={words} onChange={setWords} addLabel="Add a word" maxItems={12} maxItemChars={80} disabled={disabled} />
      <PhraseListField label="Also add" help="Phrases added to every prompt that uses this style." value={addIns} onChange={setAddIns} addLabel="Add a phrase" maxItems={8} maxItemChars={120} maxTotalChars={400} disabled={disabled} />
      <PhrasePairsField label="Avoid and say instead" help="Videos at Standard and Boost cannot use avoid words. Say the opposite instead." value={pairs} onChange={setPairs} firstLabel="Avoid" secondLabel="Say instead" addLabel="Add pair" maxItems={8} maxItemChars={120} maxTotalChars={400} disabled={disabled} />
    </section>
  );
}
