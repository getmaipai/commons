// Kit showcase entry for FileTile and FileGrid.
import { useState } from "react";
import { BatchBar, SelectModeToggle } from "@/kit/primitives/BatchBar";
import { cardSizeStyle, CardSizeSlider, useCardSize } from "@/kit/primitives/CardSizeSlider";
import { FileGrid } from "@/kit/primitives/FileGrid";
import type { FileTileData } from "@/kit/primitives/FileTile";
import { Button } from "@/kit/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/kit/ui/dropdown-menu";

// A small picture drawn inline so the showcase loads nothing from the network.
const PICTURE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b8def"/><stop offset="1" stop-color="#f0a35e"/></linearGradient></defs><rect width="320" height="240" fill="url(#g)"/></svg>',
  );

const people = [
  { id: "marlow", name: "Marlow", seed: "marlow" },
  { id: "nova", name: "Nova", seed: "nova" },
  { id: "iris", name: "Iris", seed: "iris" },
  { id: "quill", name: "Quill", seed: "quill" },
];

const files: FileTileData[] = [
  { id: "otters", name: "Otters in a kitchen", kind: "video", thumbnailUrl: PICTURE, durationSeconds: 8, secondary: "You · 9.4 MB", description: "you, 9.4 megabytes", sharedWith: people.slice(0, 2) },
  { id: "fox", name: "Fox in the snow", kind: "image", thumbnailUrl: PICTURE, secondary: "You · 1.2 MB", sharedWith: people },
  { id: "lullaby", name: "Moonlit lullaby", kind: "audio", durationSeconds: 134, secondary: "You · 3.1 MB" },
  { id: "plan", name: "Trip plan", kind: "document", extension: "pdf", secondary: "Iris · 240 KB" },
  { id: "broken", name: "A picture that did not load", kind: "image", thumbnailUrl: "https://example.com/missing.webp", secondary: "Nova · 2 MB" },
  { id: "notes", name: "Notes", kind: "other", secondary: "You · 3 KB" },
  { id: "garden", name: "Garden at dawn", kind: "image", thumbnailUrl: PICTURE, secondary: "Quill · 880 KB", sharedWith: people.slice(0, 1) },
  { id: "rover", name: "Rover running", kind: "video", thumbnailUrl: PICTURE, durationSeconds: 3725, secondary: "Marlow · 40 MB" },
];

export function FileGridShowcase() {
  const [selected, setSelected] = useState<string[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [size, setSize] = useCardSize("showcase-files");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4" style={cardSizeStyle(size)}>
      <div className="flex flex-wrap items-center gap-3">
        {selecting || selected.length > 0 ? (
          <BatchBar
            count={selected.length}
            onExit={() => {
              setSelecting(false);
              setSelected([]);
            }}
          >
            <Button variant="secondary" disabled={selected.length === 0}>
              Delete
            </Button>
          </BatchBar>
        ) : (
          <SelectModeToggle label="Select" onClick={() => setSelecting(true)} />
        )}
        <CardSizeSlider size={size} onChange={setSize} />
        <Button variant="ghost" onClick={() => setEmpty((v) => !v)}>
          {empty ? "Show files" : "Show the empty state"}
        </Button>
      </div>
      <FileGrid
        items={empty ? [] : files}
        label="Library files"
        density="slider"
        selectedIds={selected}
        onSelectionChange={setSelected}
        selectionMode={selecting}
        onExitSelectionMode={() => setSelecting(false)}
        onOpen={(id) => setMenuFor(`Opened ${id}`)}
        wrapActions={(id, button) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>{button}</DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setMenuFor(`Share ${id}`)}>Share</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setMenuFor(`Delete ${id}`)}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        empty={<p className="p-8 text-center text-base text-muted-foreground">Nothing here yet. Files you make or add show up here.</p>}
      />
      <p role="status" className="text-base text-muted-foreground">
        {menuFor ?? "Press a tile or open its menu."}
      </p>
    </div>
  );
}
