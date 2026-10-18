// Kit showcase entry for StorageBar.
import { StorageBar } from "@/kit/primitives/StorageBar";

const GB = 1024 ** 3;
const MB = 1024 ** 2;

export function StorageBarShowcase() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 p-4">
      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">Against a 20 GB limit</h3>
        <StorageBar
          capacityBytes={20 * GB}
          segments={[
            { id: "pictures", label: "Pictures", bytes: 4.6 * GB },
            { id: "videos", label: "Videos", bytes: 3.1 * GB },
            { id: "songs", label: "Songs", bytes: 1.2 * GB },
            { id: "documents", label: "Documents", bytes: 640 * MB },
          ]}
        />
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">No limit set</h3>
        <StorageBar
          segments={[
            { id: "pictures", label: "Pictures", bytes: 4.6 * GB },
            { id: "videos", label: "Videos", bytes: 3.1 * GB },
          ]}
        />
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">A very small kind stays visible</h3>
        <StorageBar
          capacityBytes={20 * GB}
          segments={[
            { id: "videos", label: "Videos", bytes: 9 * GB },
            { id: "notes", label: "Notes", bytes: 12 * 1024 },
          ]}
        />
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">Nothing stored yet</h3>
        <StorageBar capacityBytes={20 * GB} segments={[{ id: "pictures", label: "Pictures", bytes: 0 }]} />
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">Many kinds: the legend wraps</h3>
        <StorageBar
          segments={["Pictures", "Videos", "Songs", "Documents", "Podcasts", "Books", "Backups", "Other"].map((label, index) => ({
            id: label.toLowerCase(),
            label,
            bytes: (index + 1) * 300 * MB,
          }))}
        />
      </section>
    </div>
  );
}
