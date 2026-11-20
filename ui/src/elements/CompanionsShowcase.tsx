"use client";

// Story: four small companions for the video screens. The VideoPlayer's overlay pills, the creation header's display variant, the facts line
// (on the header and on TierSegment), and the cover tile's progress bar and status tag. Sample text goes through `d`.
import { useState } from "react";
import { CreationHeader } from "./creation-header";
import { TierSegment, type TierId, type TierOptionDef } from "./tier-segment";
import { VideoOverlayShowcase } from "./VideoOverlayShowcase";

const d = (s: string) => s;
const noop = () => {};

const tiers: TierOptionDef[] = [
  { id: "standard", label: d("Quick draft"), hint: d("Fast") },
  { id: "boost", label: d("Final HD"), hint: d("Full HD") },
];

function Heading({ children }: { children: string }) {
  return <h2 className="text-muted-foreground mb-3 text-sm font-medium">{children}</h2>;
}

export function CompanionsShowcase() {
  const [tier, setTier] = useState<TierId>("boost");
  const facts = d("Full HD · 5 s · 1920×1088 · about 8 min");
  const visibility = { mode: "private" as const, people: [], canManage: false, onOpen: noop };
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10" data-testid="companions-showcase">
      <section><Heading>{d("1. Video player overlay actions")}</Heading><VideoOverlayShowcase /></section>
      <section>
        <Heading>{d("2 and 3. Display header with a facts line")}</Heading>
        <CreationHeader variant="display" title={d("Paper boat in the rain")} eyebrow={d("Video")} subtitle={d("Made from your words on Friday")} facts={facts} visibility={visibility} />
      </section>
      <section><Heading>{d("3. Facts line on the quality choice")}</Heading><TierSegment value={tier} onValueChange={setTier} tiers={tiers} label={d("Quality")} facts={facts} /></section>
    </div>
  );
}
