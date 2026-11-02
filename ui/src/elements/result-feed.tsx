"use client";

import { type ComponentProps } from "react";
import { Badge } from "@/kit/ui/badge";
import { Label } from "@/kit/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/kit/ui/select";
import { Switch } from "@/kit/ui/switch";
import { SafeImage } from "@/kit/primitives/SafeImage";
import { DayDivider } from "./day-separator";
import { VideoPlayer } from "./video-player";

export interface ResultFeedReference {
  label: string;
  /** A same-origin picture path; a chip without one shows its label alone. */
  thumb?: string;
}

/** The props of one entry's `VideoPlayer`. Passed straight through, so the player's own built-in actions (Stop, Try again,
 * Make another, Render, Another still, Edit words, Favorite), `notice` and `disabledReason` arrive exactly as the Element names them. */
export type ResultFeedPlayerProps = ComponentProps<typeof VideoPlayer> | (Record<string, unknown> & { status: string; prompt: string });

export interface ResultFeedEntry {
  key: string;
  /** What the person asked for. */
  words: string;
  tags?: string[];
  references?: ResultFeedReference[];
  /** The day heading this entry sits under ("Today"); entries are newest first, so a day's entries are next to each other. */
  day?: string;
  player: ResultFeedPlayerProps;
}

export type ResultFeedFilter =
  | { kind: "toggle"; id: string; label: string; value: boolean; onValueChange(next: boolean): void }
  | { kind: "select"; id: string; label: string; value: string; options: { value: string; label: string }[]; onValueChange(next: string): void };

/** Day label for a date: Today, Yesterday, then "Mon, Nov 2" (the year only when it is not this year). */
export function feedDayLabel(date: Date, now: Date = new Date()): string {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((start(now) - start(date)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: date.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

function countLabel(n: number): string {
  return `${n} ${n === 1 ? "clip" : "clips"}`;
}

function shorten(text: string, max = 60): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

interface Group {
  key: string;
  label?: string;
  entries: ResultFeedEntry[];
}

/** Gathers entries, keeping the feed's newest-first order: by day, by their words, or not at all. */
export function groupFeedEntries(entries: ResultFeedEntry[], by: "day" | "words" | "none"): Group[] {
  const groups: Group[] = [];
  const index = new Map<string, Group>();
  for (const entry of entries) {
    const key = by === "words" ? `w:${entry.words}` : by === "day" ? `d:${entry.day ?? ""}` : "all";
    let group = index.get(key);
    if (!group) {
      const label = by === "words" ? entry.words : by === "day" ? entry.day : undefined;
      group = { key, label, entries: [] };
      index.set(key, group);
      groups.push(group);
    }
    group.entries.push(entry);
  }
  return groups;
}

/**
 * VIDEO-UI-04 (K10): a newest-first feed of generated clips. Each entry shows its words, tags and reference chips (a Start
 * frame with its thumbnail), then one `VideoPlayer` in whatever status the job has. A filter bar (toggles and selects)
 * sits above, and entries are gathered under `DayDivider` headings, or under their words. Pure: every entry, handler and
 * string is a prop; the schema node (`result_feed`) fills them and keeps running entries current (`poll_while`).
 */
export function ResultFeed({
  entries,
  filters = [],
  grouping = "day",
  label = "Results",
  empty,
}: {
  entries: ResultFeedEntry[];
  filters?: ResultFeedFilter[];
  grouping?: "day" | "words" | "none";
  /** The feed's accessible name. */
  label?: string;
  /** Shown instead of the list when there are no entries (the filter bar stays). */
  empty?: React.ReactNode;
}) {
  const groups = groupFeedEntries(entries, grouping);
  return (
    <section data-slot="result-feed" aria-label={label} className="flex w-full flex-col gap-4">
      {filters.length > 0 ? (
        <div data-slot="result-feed-filters" role="group" aria-label="Filter results" className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {filters.map((filter) =>
            filter.kind === "toggle" ? (
              <div key={filter.id} className="flex items-center gap-2">
                <Switch id={`result-feed-${filter.id}`} checked={filter.value} onCheckedChange={filter.onValueChange} />
                <Label htmlFor={`result-feed-${filter.id}`}>{filter.label}</Label>
              </div>
            ) : (
              <div key={filter.id} className="flex items-center gap-2">
                <Label htmlFor={`result-feed-${filter.id}`}>{filter.label}</Label>
                <Select value={filter.value} onValueChange={filter.onValueChange}>
                  <SelectTrigger id={`result-feed-${filter.id}`} aria-label={filter.label}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filter.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ),
          )}
        </div>
      ) : null}
      {entries.length === 0 ? empty ?? null : null}
      {groups.map((group) => (
        <div key={group.key} data-slot="result-feed-group" className="flex flex-col gap-4">
          {group.label ? <DayDivider label={grouping === "words" ? shorten(group.label) : `${group.label}, ${countLabel(group.entries.length)}`} /> : null}
          {group.entries.map((entry) => (
            <article key={entry.key} data-slot="result-feed-entry" data-status={entry.player.status} aria-label={shorten(entry.words)} className="flex flex-col gap-2">
              <p data-slot="result-feed-words" className="text-foreground line-clamp-3 text-sm">{entry.words}</p>
              {(entry.tags?.length ?? 0) > 0 || (entry.references?.length ?? 0) > 0 ? (
                <ul data-slot="result-feed-tags" aria-label="Details" className="flex flex-wrap items-center gap-1.5">
                  {entry.references?.map((ref, i) => (
                    <li key={`ref-${i}`}>
                      <Badge variant="outline">
                        {ref.thumb ? <SafeImage src={ref.thumb} alt="" kind="picture" className="size-4 rounded-full object-cover" /> : null}
                        {ref.label}
                      </Badge>
                    </li>
                  ))}
                  {entry.tags?.map((tag, i) => (
                    <li key={`tag-${i}`}>
                      <Badge variant="secondary">{tag}</Badge>
                    </li>
                  ))}
                </ul>
              ) : null}
              <VideoPlayer {...(entry.player as ComponentProps<typeof VideoPlayer>)} />
            </article>
          ))}
        </div>
      ))}
    </section>
  );
}
