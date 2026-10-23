import { useState } from "react";
import { CreationHeader } from "./creation-header";
import { SharePanel } from "./share-panel";
import type { VisibilityPerson } from "./visibility-chip";

const PEOPLE: VisibilityPerson[] = [
  { id: "marlow", name: "Marlow" },
  { id: "nova", name: "Nova" },
  { id: "iris", name: "Iris" },
  { id: "quill", name: "Quill" },
];

export function CreationKitShowcase() {
  const [open, setOpen] = useState(false);
  const [shared, setShared] = useState(["marlow", "nova"]);
  const [mode, setMode] = useState<"private" | "shared">("shared");
  const current = PEOPLE.filter((person) => shared.includes(person.id));
  return (
    <div className="max-w-3xl p-6">
      <CreationHeader title="Garden at dawn" creator={{ name: "Jesse Torres", label: "Made at home" }} madeAt="2026-10-19T12:00:00Z"
        description="A quiet garden picture from an early walk. This description is long enough to show how the header starts with a short preview and lets the reader open the full text."
        visibility={{ mode, people: current, canManage: true, onOpen: () => setOpen(true) }} />
      <SharePanel open={open} onOpenChange={setOpen} people={current} candidates={PEOPLE} canManage onAdd={(id) => setShared((ids) => [...new Set([...ids, id])])}
        onRemove={(id) => setShared((ids) => ids.filter((personId) => personId !== id))} onMakePrivate={() => { setMode("private"); setShared([]); }} />
    </div>
  );
}
