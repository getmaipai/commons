"use client";

// Story: VideoPlayer `overlayActions`. The row actions float as glass pills at the top end of the picture: wrapping, a disabled one with its
// reason, a busy one, a toggle, and a draft. Sample text goes through `d`; the picture is an inline SVG data URI.
import { useState } from "react";
import { VideoPlayer, type VideoPlayerAction } from "./video-player";

const d = (s: string) => s;

// Black at three opacities: a quiet grey picture with no color literal, so the pills' glass reads against something.
const still = () => "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="832" height="480" viewBox="0 0 832 480"><rect width="832" height="480" fill-opacity=".45"/><circle cx="600" cy="140" r="60" fill-opacity=".25"/><path d="M0 380 Q200 320 420 380 T832 360 V480 H0Z" fill-opacity=".6"/></svg>');
const POSTER = still();

export function VideoOverlayShowcase() {
  const [last, setLast] = useState(d("nothing chosen yet"));
  const [fav, setFav] = useState(false);
  const pick = (what: string) => () => setLast(what);
  const items: VideoPlayerAction[] = [
    { label: d("Another take"), icon: "sparkles", onSelect: pick(d("Another take")) },
    { label: d("Extend"), icon: "plus", disabledReason: d("Extend needs Final HD. This clip is a Quick draft."), onSelect: pick(d("Extend")) },
    { label: d("Enhance"), icon: "wand-sparkles", busy: true, onSelect: pick(d("Enhance")) },
    { label: d("Add music"), icon: "music", onSelect: pick(d("Add music")) },
    { label: d("Make a poster"), icon: "image", onSelect: pick(d("Make a poster")) },
  ];
  const base = { prompt: d("a paper boat in the rain"), poster: POSTER, ambient: false, overlayActions: true };
  return (
    <div className="flex flex-col gap-6 p-4" data-testid="video-overlay-showcase">
      <p role="status" className="text-muted-foreground text-sm">{d("Last action:")} {last}</p>
      <section className="flex flex-col gap-2">
        <h3 className="text-muted-foreground text-sm font-medium">{d("Ready clip: wrapping pills, one disabled, one busy")}</h3>
        <VideoPlayer {...base} status="ready" src="/none.mp4" actionItems={items} onShare={pick(d("Share"))} onFavorite={setFav} favorite={fav} />
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-muted-foreground text-sm font-medium">{d("Draft still")}</h3>
        <VideoPlayer {...base} status="draft" still={POSTER} onRender={pick(d("Make the video"))} onAnotherStill={pick(d("Another still"))} onEditWords={pick(d("Edit words"))} />
      </section>
    </div>
  );
}
