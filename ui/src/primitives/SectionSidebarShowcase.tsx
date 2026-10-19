// Kit showcase entry for SectionSidebar: the News-style column in its three states.
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
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="flex h-96 overflow-hidden rounded-lg border">
        {/* The column is drawn from the `lg` breakpoint up, like a real page; a narrow gallery shows the phone drawer rows instead. */}
        <SectionSidebar
          standalone
          title="News"
          groups={groups}
          footer={footer}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          collapsedStyle={style}
          search={{ value: query, onChange: setQuery, label: "Search News" }}
        />
        <div className="flex flex-1 items-start gap-2 p-3">
          {collapsed && style === "hidden" ? <SectionSidebarShowButton onClick={() => setCollapsed(false)} /> : null}
          <p className="text-sm text-muted-foreground">Page content</p>
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
