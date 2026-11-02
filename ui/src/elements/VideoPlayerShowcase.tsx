"use client";

// VIDEO-UI-02 story: the VideoPlayer in every status, the way the Create feed draws it (icon row, More menu,
// Favorite, notice) next to the chat card's default look. Rendered by hand to check 1440 and 390 in both themes.
import { useState } from "react";
import { VideoPlayer, type VideoPlayerAction } from "./video-player";

const STILL = "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="832" height="480" viewBox="0 0 832 480"><rect width="832" height="480" fill="currentColor" fill-opacity=".35"/><circle cx="600" cy="140" r="60" fill="currentColor" fill-opacity=".2"/><path d="M0 380 Q200 320 420 380 T832 360 V480 H0Z" fill="currentColor" fill-opacity=".5"/></svg>`);

const trim: VideoPlayerAction = {
  label: "Trim",
  icon: "scissors",
  sheet: { title: "Trim this clip", submitLabel: "Trim", fields: [{ name: "start", label: "Start (seconds)", kind: "number", min: 0, defaultValue: 0 }, { name: "end", label: "End (seconds)", kind: "number", min: 1, max: 10, required: true }] },
};
const join: VideoPlayerAction = {
  label: "Join",
  icon: "film",
  sheet: { title: "Join clips", submitLabel: "Join", fields: [{ name: "clips", label: "Clips", kind: "clips", required: true, options: [{ value: "a", label: "Paper boat in the rain" }, { value: "b", label: "A fox in the snow" }, { value: "c", label: "City lights at dusk" }] }] },
};

function Heading({ children }: { children: string }) {
  return <h2 className="text-muted-foreground mt-6 mb-2 text-sm font-medium first:mt-0">{children}</h2>;
}

export function VideoPlayerShowcase({ size = "default", disabled = false }: { size?: "default" | "lg" | "xl" | "full"; disabled?: boolean }) {
  const [favorite, setFavorite] = useState(false);
  const [last, setLast] = useState("nothing pressed yet");
  const note = (what: string) => () => setLast(what);
  const reason = disabled ? "Videos are not ready yet. Open Settings to finish setting them up." : undefined;
  const feedItems: VideoPlayerAction[] = [
    { label: "Remix", icon: "pencil", placement: "start", onSelect: note("Remix") },
    { label: "Make it Max", icon: "sparkles", starts: "video", disabledReason: reason, onSelect: note("Make it Max") },
    { ...trim, onSubmit: values => setLast(`Trim ${JSON.stringify(values)}`) },
    { ...join, onSubmit: values => setLast(`Join ${JSON.stringify(values)}`) },
  ];
  const feed = {
    size,
    actionsVariant: "icons" as const,
    actionsInline: 4,
    notice: reason,
    favorite,
    onFavorite: setFavorite,
  };
  return (
    <div className="flex flex-col p-4" data-testid="showcase">
      <p role="status" className="text-muted-foreground mb-4 text-sm">Last action: {last}</p>
      <Heading>Chat card, default (unchanged)</Heading>
      <VideoPlayer status="ready" prompt="a paper boat in the rain" src="/none.mp4" poster={STILL} onMakeAnother={note("Make another")} onShare={note("Share")} />
      <Heading>Feed entry, draft</Heading>
      <VideoPlayer {...feed} status="draft" prompt="a paper boat in the rain" still={STILL} onRender={note("Render")} onAnotherStill={note("Another still")} onEditWords={note("Edit words")} onStop={note("Cancel")} controls={{ render: { disabledReason: reason }, anotherStill: { disabledReason: reason } }} />
      <Heading>Feed entry, queued</Heading>
      <VideoPlayer {...feed} status="queued" prompt="a fox in the snow" queuePosition={2} startedAt={Date.now() - 20_000} onStop={note("Stop")} hint="Videos are 5 seconds and take about 2 minutes" />
      <Heading>Feed entry, generating</Heading>
      <VideoPlayer {...feed} status="generating" prompt="a fox in the snow" progress={58} startedAt={Date.now() - 95_000} phaseLabel="Drawing the frames" etaLabel="about 1 minute left" onStop={note("Stop")} />
      <Heading>Feed entry, ready</Heading>
      <VideoPlayer {...feed} status="ready" prompt="a paper boat in the rain" src="/none.mp4" poster={STILL} onShare={note("Share")} onMakeAnother={note("Another take")} controls={{ makeAnother: { disabledReason: reason } }} actionItems={feedItems} />
      <Heading>Feed entry, failed</Heading>
      <VideoPlayer {...feed} status="failed" prompt="city lights at dusk" error="I couldn't make that video. The engine stopped partway. Try again." onRetry={note("Retry")} controls={{ retry: { disabledReason: reason } }} />
      <Heading>Feed entry, cancelled</Heading>
      <VideoPlayer {...feed} status="cancelled" prompt="city lights at dusk" onMakeAnother={note("Make another")} controls={{ makeAnother: { disabledReason: reason } }} />
    </div>
  );
}
