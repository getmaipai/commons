"use client";
import { SafeImage } from "@/kit/primitives/SafeImage";

// LIBRARY-REVAMP-06 slice B story: the Library's list view. DataTable with row selection and a thumbnail in the
// first column, drawn with the table's own `cell` render (no new cell API is needed). Words and sizes are samples.
import { useState } from "react";
import { FileTextIcon, FilmIcon, ImageIcon, MusicIcon } from "lucide-react";
import { BatchBar, SelectModeToggle } from "../primitives/BatchBar";
import { Button } from "../ui/button";
import { DataTable, type DataTableColumn } from "./data-table";

type SampleFile = {
  id: string;
  name: string;
  kind: "image" | "video" | "audio" | "document";
  thumbnailUrl?: string;
  type: string;
  size: string;
  owner: string;
  modified: string;
};

// A small picture drawn inline so the showcase loads nothing from the network.
const PICTURE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b8def"/><stop offset="1" stop-color="#f0a35e"/></linearGradient></defs><rect width="96" height="96" fill="url(#g)"/></svg>',
  );

const FILES: SampleFile[] = [
  { id: "otters", name: "Otters in a kitchen", kind: "video", thumbnailUrl: PICTURE, type: "MP4", size: "9.4 MB", owner: "You", modified: "Oct 17" },
  { id: "fox", name: "Fox in the snow", kind: "image", thumbnailUrl: PICTURE, type: "PNG", size: "1.2 MB", owner: "You", modified: "Oct 16" },
  { id: "lullaby", name: "Moonlit lullaby", kind: "audio", type: "M4A", size: "3.1 MB", owner: "You", modified: "Oct 15" },
  { id: "plan", name: "Trip plan", kind: "document", type: "PDF", size: "240 KB", owner: "Iris", modified: "Oct 12" },
  { id: "garden", name: "Garden at dawn", kind: "image", thumbnailUrl: PICTURE, type: "JPG", size: "880 KB", owner: "Quill", modified: "Oct 9" },
];

const KIND_ICON = { image: ImageIcon, video: FilmIcon, audio: MusicIcon, document: FileTextIcon } as const;

/** One cell: a 48 px thumbnail (or the kind icon when there is none) then the name. */
function NameCell({ file }: { file: SampleFile }) {
  const Icon = KIND_ICON[file.kind];
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md">
        {file.thumbnailUrl ? (
          <SafeImage src={file.thumbnailUrl} alt="" width={48} height={48} loading="lazy" decoding="async" className="size-full object-cover" />
        ) : (
          <Icon aria-hidden className="size-5" />
        )}
      </span>
      <span className="text-foreground min-w-0 truncate text-base font-medium">{file.name}</span>
    </span>
  );
}

const COLUMNS: DataTableColumn<SampleFile>[] = [
  { id: "name", header: "Name", cell: (file) => <NameCell file={file} /> },
  { id: "type", header: "Type", minWidth: 72 },
  { id: "size", header: "Size", align: "end", minWidth: 88 },
  { id: "owner", header: "Owner", minWidth: 88 },
  { id: "modified", header: "Modified", minWidth: 96 },
];

export function DataTableSelectionShowcase() {
  const [selected, setSelected] = useState<string[]>([]);
  const [selecting, setSelecting] = useState(false);
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4">
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
      </div>
      <DataTable
        rows={FILES}
        columns={COLUMNS}
        caption="Library files"
        getRowId={(file) => file.id}
        getRowLabel={(file) => file.name}
        selectedIds={selected}
        onSelectionChange={setSelected}
        selectionMode={selecting}
      />
    </div>
  );
}
