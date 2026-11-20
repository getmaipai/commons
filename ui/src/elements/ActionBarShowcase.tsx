"use client";

// VIDEO-KIT-K6 story: the sticky action bar in its four states (estimate, busy, blocked, quiet).
import { useState } from "react";
import { ActionBar } from "./action-bar";

// Demo words go through d() so the kit string scan (i18nLints) reads them as sample data, not shipped copy.
const d = (text: string) => text;

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-muted-foreground mb-2 text-sm font-medium">{title}</h2>
      <div className="overflow-hidden rounded-xl border border-border">{children}</div>
    </section>
  );
}

export function ActionBarShowcase() {
  const [busy, setBusy] = useState(false);
  return (
    <div className="mx-auto max-w-3xl">
      <Frame title={d("Ready, with the server's estimate")}>
        <ActionBar sticky={false} estimate={d("About 45 minutes to render")} primary={{ label: d("Render film"), onSelect: () => {} }} secondary={{ label: d("Save as draft"), onSelect: () => {} }} />
      </Frame>
      <Frame title={d("Busy (press the button)")}>
        <ActionBar sticky={false} estimate={d("About 45 minutes to render")} primary={{ label: d("Render film"), busy, busyLabel: d("Starting the render"), onSelect: () => { setBusy(true); setTimeout(() => setBusy(false), 2500); } }} secondary={{ label: d("Save as draft"), onSelect: () => {}, disabled: busy }} />
      </Frame>
      <Frame title={d("Not available, with the reason")}>
        <ActionBar sticky={false} reason={d("Shot 3 has no picture yet. Make its picture, then render.")} primary={{ label: d("Render film"), onSelect: () => {} }} secondary={{ label: d("Save as draft"), onSelect: () => {} }} />
      </Frame>
      <Frame title={d("Action only")}>
        <ActionBar sticky={false} primary={{ label: d("Render film"), onSelect: () => {} }} />
      </Frame>
    </div>
  );
}
