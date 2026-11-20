"use client";

// K9 story: the MediaStage in every state (hero with a stand-in composer, a hero with a result below, stage with progress, looping, waiting,
// loading, error, phone width). Sample text goes through `d`; stills are inline SVG data URIs built from a hue and the loop address is a
// placeholder, so nothing here reaches the network. Rendered by hand to check 1440 and 375 in both themes.
import { MediaStage, MediaStageProgress, type MediaStageMedia, type MediaStagePill } from "./media-stage";

const d = (s: string) => s;

const still = (hue: number) => "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="656" viewBox="0 0 1280 656"><rect width="1280" height="656" fill="hsl(${hue} 38% 40%)"/><circle cx="900" cy="190" r="96" fill="hsl(${hue + 20} 45% 80%)" fill-opacity=".3"/><path d="M0 470 Q320 380 640 470 T1280 440 V656 H0Z" fill="hsl(${hue + 20} 45% 78%)" fill-opacity=".5"/></svg>`);
const MEDIA: MediaStageMedia = { still: still(205), loop: "/none-loop.mp4", position: "55% 40%" };
const NOOP = () => {};

const PILLS: MediaStagePill[] = [
  { id: "share", label: d("Share"), icon: "share", onSelect: NOOP },
  { id: "download", label: d("Download"), icon: "download", onSelect: NOOP },
  { id: "again", label: d("Another take"), icon: "sparkles", onSelect: NOOP },
];

function Heading({ children }: { children: string }) {
  return <h2 className="text-muted-foreground mt-6 mb-2 text-sm font-medium first:mt-0">{children}</h2>;
}

/** A stand-in for the composer, so the glass panel can be looked at without the real one. */
function FakeComposer() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="min-w-0 flex-1 basis-48 text-base">{d("A paper boat in the rain")}</p>
      <button type="button" className="bg-primary text-primary-foreground min-h-12 rounded-full px-6 text-sm font-medium">{d("Make video")}</button>
    </div>
  );
}

function RetryButton() {
  return <button type="button" className="bg-primary text-primary-foreground min-h-12 rounded-full px-5 text-sm font-medium">{d("Try again")}</button>;
}

export function MediaStageShowcase() {
  return (
    <div className="flex flex-col p-4" data-testid="media-stage-showcase">
      <Heading>{d("Hero with the composer")}</Heading>
      <MediaStage size="hero" media={MEDIA} description={d("A paper boat drifting on a rainy pond")} eyebrow={d("New video")} title={d("What should we make today?")} subtitle={d("Describe a scene and Juniper will film it.")} pills={PILLS.slice(0, 1)}>
        <FakeComposer />
      </MediaStage>
      <Heading>{d("Hero, a result shows below (compact)")}</Heading>
      <MediaStage size="hero" compact media={MEDIA} scrim="strong" description={d("A paper boat drifting on a rainy pond")} title={d("What should we make today?")}>
        <FakeComposer />
      </MediaStage>
      <Heading>{d("Stage with progress")}</Heading>
      <MediaStage size="stage" media={MEDIA} description={d("A paper boat drifting on a rainy pond")} titlePill={d("Chapter 2")} pills={PILLS} eyebrow={d("Playing")} title={d("The boat leaves the shore")} overlay={<MediaStageProgress value={42} label={d("Video progress")} />} playButton={{ label: d("Play"), onSelect: NOOP }} />
      <Heading>{d("Looping (the loop plays muted, no drift)")}</Heading>
      <MediaStage size="stage" state="looping" media={MEDIA} description={d("A paper boat drifting on a rainy pond")} title={d("The boat leaves the shore")} overlay={<MediaStageProgress value={70} label={d("Video progress")} />} />
      <Heading>{d("Paused (still only)")}</Heading>
      <MediaStage size="stage" state="paused" media={MEDIA} description={d("A paper boat drifting on a rainy pond")} title={d("The boat leaves the shore")} />
      <Heading>{d("Waiting")}</Heading>
      <MediaStage size="stage" state="waiting" media={MEDIA} description={d("A paper boat drifting on a rainy pond")} title={d("Waiting its turn")} subtitle={d("About 5 minutes left.")} overlay={<MediaStageProgress value={0} label={d("Video progress")} />} />
      <Heading>{d("Loading")}</Heading>
      <MediaStage size="stage" state="loading" description={d("The video is loading")} />
      <Heading>{d("Error")}</Heading>
      <MediaStage size="stage" state="error" media={MEDIA} description={d("A paper boat drifting on a rainy pond")} eyebrow={d("Could not finish")} title={d("Your video is still within reach")} errorMessage={d("The video could not be made. The scene may need a little more detail. Try changing the words, or give it another moment before you try again.")} errorActions={<><RetryButton /><button type="button">{d("Change the words")}</button></>} />
      <Heading>{d("At 375 px")}</Heading>
      <div className="w-[375px] max-w-full">
        <MediaStage size="hero" media={MEDIA} description={d("A paper boat drifting on a rainy pond")} eyebrow={d("New video")} title={d("What should we make today?")} pills={PILLS}>
          <FakeComposer />
        </MediaStage>
        <div className="mt-4" />
        <MediaStage size="stage" media={MEDIA} description={d("A paper boat drifting on a rainy pond")} title={d("The boat leaves the shore")} pills={PILLS} overlay={<MediaStageProgress value={42} label={d("Video progress")} />} />
      </div>
      <Heading>{d("At 375 px, three actions (one row and a More menu)")}</Heading>
      <div className="w-[375px] max-w-full" data-testid="media-stage-three-actions">
        <MediaStage size="stage" media={MEDIA} description={d("A paper boat drifting on a rainy pond")} title={d("The boat leaves the shore")} pills={PILLS} overlay={<MediaStageProgress value={42} label={d("Video progress")} />} />
      </div>
    </div>
  );
}
