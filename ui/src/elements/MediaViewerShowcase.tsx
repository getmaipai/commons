"use client";

// LIBRARY-REVAMP-06 slice B story: MediaViewer over six sample files, with a details panel and a toolbar of the
// host's actions. Pictures are drawn inline so the story loads nothing from the network; the video and song point at
// example.com and show the Player's own empty state. Names and sizes are samples.
import { useRef, useState } from "react";
import { DownloadIcon, PencilIcon, Share2Icon, Trash2Icon } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { MediaViewer, type MediaViewerItem } from "./media-viewer";
import { MusicTrack } from "./music-track";

function picture(from: string, to: string): string {
  return (
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="1600" height="1000" fill="url(#g)"/><circle cx="800" cy="500" r="220" fill="#ffffff" fill-opacity="0.35"/></svg>`,
    )
  );
}

const SAMPLE_ITEMS: (MediaViewerItem & { size: string; owner: string; added: string })[] = [
  { id: "fox", kind: "image", name: "Fox in the snow", url: picture("#5b8def", "#f0a35e"), mediaType: "image/png", size: "1.2 MB", owner: "You", added: "Oct 16" },
  { id: "garden", kind: "image", name: "Garden at dawn", url: picture("#2f9e6f", "#e8d36a"), mediaType: "image/jpeg", size: "880 KB", owner: "Quill", added: "Oct 9" },
  { id: "otters", kind: "video", name: "Otters in a kitchen", url: "https://example.com/files/otters.mp4", posterUrl: picture("#16a3b8", "#6a4bd8"), mediaType: "video/mp4", size: "9.4 MB", owner: "You", added: "Oct 17" },
  { id: "lullaby", kind: "audio", name: "Moonlit lullaby", url: "https://example.com/files/lullaby.m4a", posterUrl: picture("#a3481c", "#f0b429"), mediaType: "audio/mp4", size: "3.1 MB", owner: "You", added: "Oct 15" },
  { id: "plan", kind: "document", name: "Trip plan", url: "https://example.com/files/plan.pdf", mediaType: "application/pdf", size: "240 KB", owner: "Iris", added: "Oct 12" },
  { id: "broken", kind: "image", name: "A picture that did not load", url: "https://example.com/files/missing.png", mediaType: "image/png", size: "2 MB", owner: "Nova", added: "Oct 8" },
];

export function MediaViewerShowcase() {
  const [open, setOpen] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>("fox");
  const [note, setNote] = useState("Open the viewer.");
  const opener = useRef<HTMLButtonElement | null>(null);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <div className="flex flex-wrap gap-2">
        {SAMPLE_ITEMS.map((item) => (
          <Button
            key={item.id}
            ref={item.id === "fox" ? opener : undefined}
            variant="secondary"
            onClick={() => {
              setCurrentId(item.id);
              setOpen(true);
              setNote(`Opened ${item.name}.`);
            }}
          >
            {item.name}
          </Button>
        ))}
      </div>
      <p role="status" className="text-muted-foreground text-base">
        {note}
      </p>
      <section aria-label="Song card states" className="grid min-w-0 gap-3">
        <MusicTrack
          status="generating"
          title="Garden at dawn"
          description="Soft folk · making a song"
          stages={[{ id: "queue", label: "Queued" }, { id: "model", label: "Loading" }, { id: "plan", label: "Planning" }, { id: "music", label: "Making" }, { id: "mix", label: "Mixing" }, { id: "finish", label: "Finishing" }]}
          currentStage={3}
          progress={0.58}
          elapsedSeconds={42}
          etaSeconds={31}
          phaseLabel="Making the music"
          onStop={() => setNote("Stopped Garden at dawn.")}
        />
        <MusicTrack status="queued" title="Moonlit lullaby" waitingForMemory onStop={() => setNote("Stopped Moonlit lullaby.")} />
        <MusicTrack
          status="ready"
          title="Moonlit lullaby"
          description="Dream pop · 2:14"
          src="https://example.com/files/lullaby.m4a"
          cover={picture("#a3481c", "#f0b429")}
          coverAlt="Moonlit lullaby album art"
          defaultEditOpen
          quickSong
          onMakeFull={() => setNote("Making the full song.")}
          editModes={[
            { id: "song", label: "Change the song", content: <div className="grid gap-2"><Input aria-label="How should it change?" placeholder="Describe a change" /><Button type="button" onClick={() => setNote("Changing the song.")}>Make</Button></div> },
            { id: "cover", label: "New cover", content: <div className="grid gap-2"><Input aria-label="Describe the new cover" placeholder="Describe the new cover" /><Button type="button" onClick={() => setNote("Making a new cover.")}>Make</Button></div> },
          ]}
          onShare={() => setNote("Share Moonlit lullaby")}
        />
      </section>
      <MediaViewer
        open={open}
        onOpenChange={setOpen}
        items={SAMPLE_ITEMS}
        currentId={currentId}
        onCurrentIdChange={setCurrentId}
        onClose={() => setNote("Closed. A real page puts its address back here.")}
        details={(item, index) => {
          const full = SAMPLE_ITEMS[index]!;
          if (item.id === "lullaby") return (
            <MusicTrack
              status="ready"
              width="full"
              title={item.name}
              description="Dream pop · 2:14"
              src={item.url}
              cover={item.posterUrl ?? undefined}
              coverAlt="Moonlit lullaby album art"
              lyrics="Moonlight settles\nSoftly over us"
              timedLyrics={[{ t: 0, line: "Moonlight settles", section: "Verse" }, { t: 8, line: "Softly over us", section: "Verse" }]}
              versions={[{ id: "first", label: "First take" }, { id: "soft", label: "Soft mix" }]}
              currentId="soft"
              onSelectVersion={() => {}}
              quickSong
              onMakeFull={() => setNote("Making Moonlit lullaby full.")}
              editModes={[
                { id: "song", label: "Change the song", content: <div className="grid gap-2"><Input aria-label="How should the song change?" placeholder="Describe a change" /><Button type="button" variant="outline">Make</Button></div> },
                { id: "cover", label: "New cover", content: <div className="grid gap-2"><Input aria-label="Describe the new cover" placeholder="Describe the new cover" /><Button type="button" variant="outline">Make</Button></div> },
              ]}
              editPanelLabel="Edit Moonlit lullaby"
            />
          );
          return (
            <dl className="grid gap-3 text-base">
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd>{item.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Type</dt>
                <dd>{item.mediaType ?? item.kind}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Size</dt>
                <dd>{full.size}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Added</dt>
                <dd>{full.added}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Owner</dt>
                <dd>{full.owner}</dd>
              </div>
            </dl>
          );
        }}
        toolbar={(item) => (
          <>
            <Button variant="secondary" onClick={() => setNote(`Share ${item.name}`)}>
              <Share2Icon aria-hidden /> Share
            </Button>
            <Button variant="secondary" onClick={() => setNote(`Download ${item.name}`)}>
              <DownloadIcon aria-hidden /> Download
            </Button>
            {item.kind === "image" ? (
              <Button variant="secondary" onClick={() => setNote(`Edit ${item.name}`)}>
                <PencilIcon aria-hidden /> Edit
              </Button>
            ) : null}
            <Button variant="destructive" onClick={() => setNote(`Delete ${item.name}`)}>
              <Trash2Icon aria-hidden /> Delete
            </Button>
          </>
        )}
        unsupportedActions={(item) => (
          <Button variant="inverse" onClick={() => setNote(`Download ${item.name}`)}>
            <DownloadIcon aria-hidden /> Download
          </Button>
        )}
        returnFocusTo={() => opener.current}
      />
    </div>
  );
}
