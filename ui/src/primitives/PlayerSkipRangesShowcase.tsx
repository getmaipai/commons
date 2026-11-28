import { useState } from "react";
import { Player, type PlayerSkipRange } from "@/kit/primitives/Player";
import { Button } from "@/kit/ui/button";
import { i18n } from "@/kit/i18n";

const breaks: PlayerSkipRange[] = [
  { id: "ad-a", kind: "ad", startSec: 90, endSec: 120 },
  { id: "sponsor-a", kind: "sponsor", startSec: 360, endSec: 390, status: "confirmed" },
  { id: "bumper-a", kind: "bumper", startSec: 720, endSec: 735 },
];

export function PlayerSkipRangesShowcase() {
  const [selected, setSelected] = useState<string | null>(null);
  const overlay = <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted p-2 text-sm"><span>{i18n._({ id: "ui.Skipped time", message: "Skipped time" })} 2:15</span><Button type="button" variant="ghost" size="sm">{i18n._({ id: "ui.Undo", message: "Undo" })}</Button><Button type="button" variant="secondary" size="sm">{i18n._({ id: "ui.Skip", message: "Skip" })}</Button></div>;
  return <div className="mx-auto flex max-w-3xl flex-col gap-8 p-4">
    <section><h3 className="mb-2 font-semibold">{i18n._({ id: "ui.Empty plan", message: "Empty plan" })}</h3><Player src="/sample.mp3" kind="audio" title="A quiet episode" /></section>
    <section><h3 className="mb-2 font-semibold">{i18n._({ id: "ui.Three breaks and an intro", message: "Three breaks and an intro" })}</h3><Player src="/sample.mp3" kind="audio" title="Field Notes" subtitle="Episode 14" skipRanges={[...breaks, { id: "intro", kind: "intro", startSec: 0, endSec: 45 }]} onRangeSelect={setSelected} skipOverlay={overlay} timeline="skipped" skipMap={{ toSkipped: t => t - (t > 90 ? 30 : 0), toOriginal: t => t + 30 }} /><p className="text-muted-foreground text-sm">{i18n._({ id: "ui.Selected range", message: "Selected range" })}: {selected ?? "none"}</p></section>
    <section><h3 className="mb-2 font-semibold">{i18n._({ id: "ui.Held range · light theme · phone width · RTL", message: "Held range · light theme · phone width · RTL" })}</h3><div dir="rtl" className="mx-auto w-[320px] rounded-xl border bg-background p-3 text-foreground"><Player src="/sample.mp3" kind="audio" title="A held sponsor" skipRanges={[{ id: "held", kind: "sponsor", startSec: 240, endSec: 270, status: "held" }]} onRangeSelect={setSelected} skipOverlay={overlay} /></div></section>
    <section className="dark rounded-xl bg-muted p-4 text-foreground"><h3 className="mb-2 font-semibold">{i18n._({ id: "ui.Dark theme", message: "Dark theme" })}</h3><Player src="/sample.mp3" kind="audio" title="Dark theme episode" skipRanges={breaks} onRangeSelect={setSelected} /></section>
  </div>;
}
