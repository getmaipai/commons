"use client";

import { useState } from "react";
import { ThreadSearch, type SearchableThread } from "./thread-search";

const threads: SearchableThread[] = [
  { id: "garden", title: "Plan the spring garden", group: "Today", preview: "Seedlings and soil" },
  { id: "weekend", title: "Weekend ideas", group: "Yesterday", pinned: true },
  { id: "dinner", title: "Dinner for Friday", group: "Yesterday", preview: "Pasta and salad" },
];

export function ThreadSearchDensityShowcase() {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState("weekend");
  return (
    <div className="flex w-80 flex-col gap-3">
      <ThreadSearch
        threads={threads}
        query={query}
        activeId={activeId}
        onQueryChange={setQuery}
        onSelect={setActiveId}
        inputOnly
        density="compact"
      />
      <ThreadSearch
        threads={threads}
        query={query}
        activeId={activeId}
        onQueryChange={setQuery}
        onSelect={setActiveId}
        inputOnly
      />
    </div>
  );
}
