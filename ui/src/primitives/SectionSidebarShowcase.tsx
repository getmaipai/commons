// Kit showcase entry for SectionSidebar: the News-style column: pinned open, hidden with the Chat peek, and the icon rail.
import { useState } from "react";
import { SectionSidebar, SectionSidebarShowButton, type SectionSidebarGroup, type SectionSidebarItem } from "@/kit/primitives/SectionSidebar";

const groups: SectionSidebarGroup[] = [
  {
    id: "main",
    items: [
      { id: "today", label: "Today", icon: "newspaper", href: "#today", active: true },
      { id: "saved", label: "Saved", icon: "bookmark", href: "#saved", trailing: <span className="text-xs text-settings-helper">3</span>, dot: true },
    ],
  },
  {
    id: "topics",
    label: "Topics",
    items: [
      { id: "world", label: "World", icon: "globe", href: "#world" },
      { id: "science", label: "Science", icon: "flask-conical", href: "#science" },
    ],
  },
];
const footer: SectionSidebarItem[] = [{ id: "settings", label: "News settings", icon: "settings", href: "#settings" }];

function Demo({ title, style }: { title: string; style: "hidden" | "rail" }) {
  // Pinned is the Chat words for "not collapsed". The showcase starts hidden so the edge peek and the pin button can be tried at once.
  const [pinned, setPinned] = useState(style === "rail");
  const collapsed = !pinned;
  const [query, setQuery] = useState("");
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="flex h-96 overflow-y-auto rounded-lg border">
        {/* The column is drawn from the `lg` breakpoint up, like a real page; a narrow gallery shows the phone drawer rows instead. */}
        <SectionSidebar
          standalone
          title="News"
          groups={groups}
          footer={footer}
          pinned={pinned}
          onPinnedChange={setPinned}
          sidebarProps={{ id: `showcase-${style}` }}
          collapsedStyle={style}
          search={{ value: query, onChange: setQuery, label: "Search News" }}
        />
        <div className="flex flex-1 items-start gap-2 p-3">
          {collapsed && style === "hidden" ? <SectionSidebarShowButton onClick={() => setPinned(true)} controls={`showcase-${style}`} /> : null}
          <p className="text-sm text-muted-foreground">{style === "hidden" ? "Rest the pointer on the left edge (or on the show button) to peek the column; Escape or a link closes it; the pin button keeps it open." : "Page content"}</p>
        </div>
      </div>
    </section>
  );
}

export function SectionSidebarShowcase() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-4">
      <Demo title="Hides to an edge that peeks (the Chat column)" style="hidden" />
      <Demo title="Collapses to an icon rail" style="rail" />
    </div>
  );
}
