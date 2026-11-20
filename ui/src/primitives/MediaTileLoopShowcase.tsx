"use client";

// Story: media tiles with a hover loop. Hover a tile for about 300 ms (or Tab to it) and the muted loop plays over the still; leave and it
// rewinds. Touch screens and reduced motion keep the still. The last tile has no loop and is drawn as before. Sample text goes through `d`;
// stills are inline SVG data URIs and the loop address is a placeholder, so nothing here reaches the network.
import { MediaShelf } from "./MediaShelf";
import { SafeImage } from "./SafeImage";

const d = (s: string) => s;

const still = (hue: number) => "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="hsl(${hue} 38% 40%)"/><circle cx="460" cy="100" r="52" fill="hsl(${hue + 20} 45% 80%)" fill-opacity=".3"/><path d="M0 260 Q160 200 320 260 T640 240 V360 H0Z" fill="hsl(${hue + 20} 45% 78%)" fill-opacity=".5"/></svg>`);

interface Clip { id: string; title: string; hue: number; loop?: string }
const CLIPS: Clip[] = [
  { id: "harbor", title: d("Harbor at dawn"), hue: 205, loop: "/none-harbor.mp4" },
  { id: "meadow", title: d("Meadow in wind"), hue: 140, loop: "/none-meadow.mp4" },
  { id: "rain", title: d("Paper boat in the rain"), hue: 260 },
];

export function MediaTileLoopShowcase() {
  return (
    <div className="flex flex-col gap-4 p-4" data-testid="media-tile-loop-showcase">
      <MediaShelf
        items={CLIPS}
        getKey={(c) => c.id}
        getLabel={(c) => c.title}
        getLoop={(c) => c.loop}
        onSelect={() => {}}
        heading={d("Clips")}
        variant="plain"
        aspect="wide"
        renderItem={(c) => <SafeImage src={still(c.hue)} alt={c.title} kind="video" className="size-full object-cover" />}
      />
    </div>
  );
}
