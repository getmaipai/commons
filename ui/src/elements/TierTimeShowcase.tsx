"use client";

// VIDEO-KIT-K2 story: the quality choice with a time line, in the segment and cards looks. Named by job, never by model.
import { useState } from "react";
import { TierSegment, type TierId, type TierOptionDef } from "./tier-segment";

// Demo words go through d() so the kit string scan reads them as sample data, not shipped copy.
const d = (text: string) => text;

const tiers: TierOptionDef[] = [
  { id: "standard", label: d("Quick draft"), hint: d("Fast"), time: d("about 1 minute") },
  { id: "boost", label: d("Final HD"), hint: d("Full HD"), time: d("about 8 minutes for 5 seconds") },
  { id: "max", label: d("Best"), hint: d("Slowest"), disabledReason: d("Not set up on this home yet. Ask an admin.") },
];

export function TierTimeShowcase() {
  const [a, setA] = useState<TierId>("standard");
  const [b, setB] = useState<TierId>("boost");
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <section><h2 className="text-muted-foreground mb-2 text-sm font-medium">{d("Segment with a time line")}</h2><TierSegment value={a} onValueChange={setA} tiers={tiers} label={d("Quality")} /></section>
      <section><h2 className="text-muted-foreground mb-2 text-sm font-medium">{d("Cards")}</h2><TierSegment presentation="cards" value={b} onValueChange={setB} tiers={tiers} label={d("Quality")} /></section>
    </div>
  );
}
