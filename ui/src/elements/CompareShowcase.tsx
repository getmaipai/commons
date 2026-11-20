"use client";

// K8 story: the ClipCompare in its states. Stills are inline SVG data URIs (an original and a changed version of the same
// scene), so the two views, the phone width, loading and the load error can be looked at in both themes at 1440 and 375.
// The clips pair points at a file that does not exist, which is how the error line is shown.
import { useState } from "react";
import { ClipCompare, type ClipCompareMode, type ClipCompareSide } from "./clip-compare";

const d = (s: string) => s;

const scene = (hue: number, changed: boolean) => "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="832" height="468" viewBox="0 0 832 468"><rect width="832" height="468" fill="hsl(${hue} 38% 38%)"/>` +
  `<circle cx="640" cy="120" r="64" fill="hsl(${hue + 20} 45% 78%)" fill-opacity=".3"/>` +
  `<path d="M0 360 Q210 300 420 360 T832 340 V468 H0Z" fill="hsl(${hue + 20} 45% 78%)" fill-opacity=".5"/>` +
  `<rect x="150" y="150" width="150" height="190" rx="18" fill="hsl(${changed ? hue + 150 : hue + 20} ${changed ? 55 : 45}% ${changed ? 66 : 78}%)" fill-opacity=".7"/>` +
  `</svg>`,
);

const STILL_BEFORE: ClipCompareSide = { src: scene(20, false), kind: "image", label: d("Before") };
const STILL_AFTER: ClipCompareSide = { src: scene(20, true), kind: "image", label: d("After") };
const CLIP_BEFORE: ClipCompareSide = { src: "/none-before.mp4", kind: "video", label: d("Before"), poster: scene(20, false) };
const CLIP_AFTER: ClipCompareSide = { src: "/none-after.mp4", kind: "video", label: d("After"), poster: scene(20, true) };

const HEADINGS = {
  side: d("Side by side (default), stills"),
  wipe: d("Wipe, controlled"),
  phone: d("At 375 px: stacked panes, then one wipe frame"),
  named: d("Own labels"),
  loading: d("Loading"),
  error: d("A clip that did not load"),
};

function Heading({ children }: { children: string }) {
  return <h2 className="text-muted-foreground mt-6 mb-2 text-sm font-medium first:mt-0">{children}</h2>;
}

export function CompareShowcase() {
  const [mode, setMode] = useState<ClipCompareMode>("wipe");
  return (
    <div className="flex flex-col p-4" data-testid="compare-showcase">
      <Heading>{HEADINGS.side}</Heading>
      <ClipCompare before={STILL_BEFORE} after={STILL_AFTER} />
      <Heading>{HEADINGS.wipe}</Heading>
      <ClipCompare before={STILL_BEFORE} after={STILL_AFTER} mode={mode} onModeChange={setMode} />
      <p role="status" className="text-muted-foreground mt-2 text-sm">{mode}</p>
      <Heading>{HEADINGS.phone}</Heading>
      <div className="flex flex-col gap-6">
        <div className="w-[375px] max-w-full"><ClipCompare before={STILL_BEFORE} after={STILL_AFTER} /></div>
        <div className="w-[375px] max-w-full"><ClipCompare before={STILL_BEFORE} after={STILL_AFTER} mode="wipe" /></div>
      </div>
      <Heading>{HEADINGS.named}</Heading>
      <ClipCompare before={{ ...STILL_BEFORE, label: d("Original") }} after={{ ...STILL_AFTER, label: d("Swapped") }} mode="wipe" />
      <Heading>{HEADINGS.loading}</Heading>
      <ClipCompare before={CLIP_BEFORE} after={CLIP_AFTER} loading />
      <Heading>{HEADINGS.error}</Heading>
      <ClipCompare before={CLIP_BEFORE} after={CLIP_AFTER} />
    </div>
  );
}
