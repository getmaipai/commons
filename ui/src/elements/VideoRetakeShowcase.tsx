"use client";

// Story: the VideoPlayer's retake-from-a-time action and the per-clip actions (another take, extend, enhance) in every state: retake
// enabled, armed at 0:07, disabled with its reason, busy, and the three actions with notes. Sample text goes through `d`; the picture is an
// inline SVG data URI built from a hue. Rendered by hand to check 1440 and 375 in both themes.
import { useState } from "react";
import { VideoPlayer, type VideoPlayerAction } from "./video-player";

const d = (s: string) => s;

const still = (hue: number) => "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="832" height="480" viewBox="0 0 832 480"><rect width="832" height="480" fill="hsl(${hue} 38% 36%)"/><circle cx="600" cy="140" r="60" fill="hsl(${hue + 20} 45% 78%)" fill-opacity=".3"/><path d="M0 380 Q200 320 420 380 T832 360 V480 H0Z" fill="hsl(${hue + 20} 45% 78%)" fill-opacity=".5"/></svg>`);
const POSTER = still(210);
const CLIP = "/none.mp4";
const PROMPT = d("a paper boat in the rain");

function Heading({ children }: { children: string }) {
  return <h2 className="text-muted-foreground mt-6 mb-2 text-sm font-medium first:mt-0">{children}</h2>;
}

const TAKE_NOTES: VideoPlayerAction[] = [
  { label: d("Another take"), icon: "sparkles", note: d("Starts over with the same words. About 5 minutes.") },
  { label: d("Extend"), icon: "plus", note: d("Keeps the whole clip and adds a few seconds. About 8 minutes.") },
  { label: d("Enhance"), icon: "wand-sparkles", note: d("Keeps the story and sharpens the picture. About 10 minutes.") },
];

export function VideoRetakeShowcase() {
  const [last, setLast] = useState(d("nothing chosen yet"));
  const note = (what: string) => () => setLast(what);
  const items = TAKE_NOTES.map(item => ({ ...item, onSelect: note(item.label) }));
  const quick = d("Retake needs Final HD. This clip is a Quick draft.");
  const base = { status: "ready" as const, prompt: PROMPT, src: CLIP, poster: POSTER, durationSec: 12, ambient: false };
  return (
    <div className="flex flex-col p-4" data-testid="retake-showcase">
      <p role="status" className="text-muted-foreground mb-4 text-sm">{d("Last action:")} {last}</p>
      <Heading>{d("Retake enabled (scrub, then choose)")}</Heading>
      <VideoPlayer {...base} onRetakeFrom={t => setLast(`${d("Retake from")} ${t.toFixed(1)} s`)} controls={{ retake: { note: d("Keeps the opening. About 8 minutes.") } }} />
      <Heading>{d("Retake armed at 0:07")}</Heading>
      <VideoPlayer {...base} onRetakeFrom={note(d("Retake from 7.0 s"))} retakeArmedAt={7} controls={{ retake: { note: d("Keeps the opening. About 8 minutes.") } }} />
      <Heading>{d("Retake disabled with its reason")}</Heading>
      <VideoPlayer {...base} onRetakeFrom={note(d("Retake"))} controls={{ retake: { disabledReason: quick } }} />
      <Heading>{d("Retake busy")}</Heading>
      <VideoPlayer {...base} onRetakeFrom={note(d("Retake"))} retakeArmedAt={7} controls={{ retake: { busy: true, note: d("Working on it. About 8 minutes.") } }} />
      <Heading>{d("Another take, extend and enhance with notes")}</Heading>
      <VideoPlayer {...base} actionItems={items} />
      <Heading>{d("Another take busy, extend disabled with its reason, enhance ready")}</Heading>
      <VideoPlayer
        {...base}
        actionItems={[
          { ...items[0]!, busy: true },
          { ...items[1]!, disabledReason: d("Extend needs Final HD. This clip is a Quick draft.") },
          items[2]!,
        ]}
      />
      <Heading>{d("Everything together, icon row, at 375 px")}</Heading>
      <div className="w-[375px] max-w-full">
        <VideoPlayer {...base} actionsVariant="icons" onRetakeFrom={note(d("Retake"))} retakeArmedAt={7} controls={{ retake: { note: d("Keeps the opening. About 8 minutes.") } }} actionItems={items} />
      </div>
    </div>
  );
}
