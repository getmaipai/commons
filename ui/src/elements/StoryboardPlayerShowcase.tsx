"use client";

// K5 story: the StoryboardPlayer in every state (paused, playing, controlled, loading, empty) with six fictional shots, one with
// no picture and one being changed. Stills are inline SVG data URIs. Rendered by hand to check 1440 and 375 in both themes.
import { useEffect, useRef, useState } from "react";
import { StoryboardPlayer, type StoryboardShot } from "./storyboard-player";

const still = (art: string, hue: number) => "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="832" height="468" viewBox="0 0 832 468"><rect width="832" height="468" fill="hsl(${hue} 38% 38%)"/>${art.replaceAll("currentColor", `hsl(${hue + 20} 45% 78%)`)}</svg>`);
const ART = [
  `<circle cx="620" cy="130" r="64" fill="currentColor" fill-opacity=".25"/><path d="M0 360 Q210 300 420 360 T832 340 V468 H0Z" fill="currentColor" fill-opacity=".5"/>`,
  `<rect x="120" y="120" width="220" height="220" rx="24" fill="currentColor" fill-opacity=".3"/><rect x="400" y="180" width="300" height="160" rx="24" fill="currentColor" fill-opacity=".5"/>`,
  `<path d="M0 468 L260 160 L420 340 L560 220 L832 468Z" fill="currentColor" fill-opacity=".5"/><circle cx="660" cy="100" r="40" fill="currentColor" fill-opacity=".25"/>`,
  `<circle cx="416" cy="234" r="140" fill="currentColor" fill-opacity=".35"/><circle cx="416" cy="234" r="70" fill="currentColor" fill-opacity=".3"/>`,
  `<rect x="0" y="300" width="832" height="168" fill="currentColor" fill-opacity=".45"/><rect x="180" y="110" width="120" height="190" rx="12" fill="currentColor" fill-opacity=".3"/><rect x="520" y="150" width="140" height="150" rx="12" fill="currentColor" fill-opacity=".3"/>`,
  `<path d="M0 200 Q200 120 416 200 T832 180 V468 H0Z" fill="currentColor" fill-opacity=".4"/>`,
];
const wave = (seed: number) => Array.from({ length: 40 }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin((i + seed) * 0.7) * Math.cos((i + seed) * 0.23)));

function shot(id: string, caption: string, durationSec: number, art: number, who?: string, said?: string, status?: StoryboardShot["status"]): StoryboardShot {
  return {
    id, caption, durationSec, status,
    still: status === "no_picture" ? undefined : still(ART[art]!, 20 + art * 55),
    line: who ? { speaker: who, text: said ?? "", startSec: 0.5, wave: wave(art * 7) } : undefined,
  };
}

export const SHOWCASE_SHOTS: StoryboardShot[] = [
  shot("s1", "Juniper at the window at dawn", 6, 0, "Juniper", "Morning, Atlas. The garden woke up before we did."),
  shot("s2", "Atlas opens the shed", 5, 1, "Atlas", "I found the old lantern. It still works."),
  shot("s3", "The hill behind the house", 7, 2),
  shot("s4", "Willow arrives", 5, 3, "Willow", "Sorry I'm late. The path was longer than I remembered.", "no_picture"),
  shot("s5", "Sage lights the lantern", 6, 4, "Sage", "Hold it steady and the whole porch glows.", "changing"),
  shot("s6", "All four on the porch", 6, 5, "Juniper", "Stay a while. The tea is still warm."),
];

const HEADINGS = [
  ["paused", "Paused, first shot"],
  ["playing", "Playing"],
  ["controlled", "Controlled by a shot id"],
  ["phone", "At 375 px"],
  ["loading", "Loading"],
  ["empty", "Empty list"],
] as const;

function Heading({ children }: { children: string }) {
  return <h2 className="text-muted-foreground mt-6 mb-2 text-sm font-medium first:mt-0">{children}</h2>;
}

/** Presses Play once after it mounts, so the playing state can be looked at without a click. */
function AutoPlay({ children }: { children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { box.current?.querySelector<HTMLButtonElement>("button[aria-label]")?.click(); }, []);
  return <div ref={box}>{children}</div>;
}

export function StoryboardPlayerShowcase() {
  const [picked, setPicked] = useState("s3");
  const [secs, setSecs] = useState(0);
  const head = Object.fromEntries(HEADINGS) as Record<(typeof HEADINGS)[number][0], string>;
  return (
    <div className="flex flex-col p-4" data-testid="storyboard-showcase">
      <Heading>{head.paused}</Heading>
      <StoryboardPlayer shots={SHOWCASE_SHOTS} />
      <Heading>{head.playing}</Heading>
      <AutoPlay><StoryboardPlayer shots={SHOWCASE_SHOTS} onTimeChange={setSecs} /></AutoPlay>
      <p role="status" className="text-muted-foreground mt-2 text-sm">{secs.toFixed(1)}</p>
      <Heading>{head.controlled}</Heading>
      <StoryboardPlayer shots={SHOWCASE_SHOTS} value={picked} onValueChange={setPicked} />
      <p role="status" className="text-muted-foreground mt-2 text-sm">{picked}</p>
      <Heading>{head.phone}</Heading>
      <div className="w-[375px] max-w-full"><StoryboardPlayer shots={SHOWCASE_SHOTS} /></div>
      <Heading>{head.loading}</Heading>
      <StoryboardPlayer shots={[]} loading />
      <Heading>{head.empty}</Heading>
      <StoryboardPlayer shots={[]} />
    </div>
  );
}
