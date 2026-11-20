"use client";

// K4 story: the VoiceLineRow in every state (two readings, one reading, playing, making, error, with and without a
// picture or waveform). Fictional pictures and persona names only; check at 375 and desktop in both themes.
import { useState, type ReactNode } from "react";
import { VoiceLineRow } from "./voice-line-row";
import { i18n } from "@/kit/i18n";

const AVATAR = "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="currentColor"><circle cx="48" cy="38" r="18" fill-opacity=".5"/><path d="M12 96 Q48 40 84 96Z" fill-opacity=".4"/></svg>`);
const WAVE = [0.2, 0.5, 0.8, 0.4, 0.9, 0.6, 0.3, 0.7, 1, 0.5, 0.3, 0.6, 0.8, 0.4, 0.2, 0.5, 0.7, 0.3];
const noop = () => {};
// Sample words live in plain constants: they are story data, not kit text.
const LINE = {
  juniper: "We should get going before the rain comes back.",
  atlas: "Wait here. I will be back before the lantern burns down.",
  willow: "The garden looks different in the morning.",
  sage: "Take your time. Nothing here is in a hurry.",
};

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 mt-6 text-sm font-medium text-muted-foreground first:mt-0">{children}</h2>;
}

export function VoiceLineRowShowcase() {
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(1);
  return (
    <div className="flex max-w-3xl flex-col gap-3 p-6">
      <Heading>{i18n._({ id: "ui.Two readings, you can play and switch", message: "Two readings, you can play and switch" })}</Heading>
      <VoiceLineRow speaker={{ name: "Juniper", avatar: AVATAR }} text={LINE.juniper} playing={playing} onPlay={() => setPlaying((p) => !p)} wave={WAVE}
        reading={{ index, count: 2 }} onSayDifferently={noop} onUseOtherReading={() => setIndex((i) => (i === 1 ? 2 : 1))} />
      <Heading>{i18n._({ id: "ui.One reading, no picture", message: "One reading, no picture" })}</Heading>
      <VoiceLineRow speaker={{ name: "Atlas" }} text={LINE.atlas} onPlay={noop}
        reading={{ index: 1, count: 1 }} onSayDifferently={noop} onUseOtherReading={noop} />
      <Heading>{i18n._({ id: "ui.Making a new reading", message: "Making a new reading" })}</Heading>
      <VoiceLineRow speaker={{ name: "Willow" }} text={LINE.willow} onPlay={noop} wave={WAVE} status="making"
        reading={{ index: 1, count: 2 }} onSayDifferently={noop} onUseOtherReading={noop} />
      <Heading>{i18n._({ id: "ui.Error", message: "Error" })}</Heading>
      <VoiceLineRow speaker={{ name: "Sage" }} text={LINE.sage} onPlay={noop}
        reading={{ index: 1, count: 1 }} onSayDifferently={noop} onUseOtherReading={noop}
        errorMessage="MaiPai could not make a new reading. Press Say it differently to try again." />
    </div>
  );
}
