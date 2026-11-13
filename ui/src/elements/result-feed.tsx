"use client";

import { i18n, kitLocaleTag } from "@/kit/i18n"
import { useState } from "react";
import { SlidersHorizontalIcon } from "lucide-react";
import { cn } from "cn";
import { useIsPhoneLayout } from "@/kit/hooks/useIsPhoneLayout";
import { Button } from "@/kit/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/kit/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/kit/ui/popover";
import { Badge } from "@/kit/ui/badge";
import { Label } from "@/kit/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/kit/ui/select";
import { Switch } from "@/kit/ui/switch";
import { SafeImage } from "@/kit/primitives/SafeImage";
import { DayDivider } from "./day-separator";
import { eyebrow } from "./surfaces";
import { VideoPlayer, type VideoPlayerProps } from "./video-player";
import { LockTile, type LockedRow } from "./adult-lock";
import { useInsertedKeys } from "@/kit/hooks/useInsertedKeys";

export interface ResultFeedReference {
  label: string;
  /** A same-origin picture path; a chip without one shows its label alone. */
  thumb?: string;
}

/** The props of one entry's `VideoPlayer`. Passed straight through, so the player's own built-in actions (Stop, Try again,
 * Make another, Render, Another still, Edit words, Favorite), `notice` and `disabledReason` arrive exactly as the Element names them. */
export type ResultFeedPlayerProps = VideoPlayerProps | (Record<string, unknown> & { status: string; prompt: string });

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

/** ADULT-LOCK-01: the redacted entry of a locked clip: `{ key, locked: true, making? }` and nothing else. The feed never reads
 * any other field of it and draws every locked entry as ONE lock tile after the open entries, whatever their number. */
export type ResultFeedLockedEntry = LockedRow & { key: string };

export type ResultFeedFilter =
  | { kind: "toggle"; id: string; label: string; value: boolean; onValueChange(next: boolean): void }
  | { kind: "select"; id: string; label: string; value: string; options: { value: string; label: string }[]; onValueChange(next: string): void };

/** Day label for a date: Today, Yesterday, then "Mon, Nov 2" (the year only when it is not this year). */
export function feedDayLabel(date: Date, now: Date = new Date()): string {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((start(now) - start(date)) / 86_400_000);
  if (days === 0) return i18n._({ id: "ui.Today", message: "Today" });
  if (days === 1) return i18n._({ id: "ui.Yesterday", message: "Yesterday" });
  return date.toLocaleDateString(kitLocaleTag(), { weekday: "short", month: "short", day: "numeric", year: date.getFullYear() === now.getFullYear() ? undefined : "numeric" });
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

function FilterControls({ filters, idPrefix, headingStyle = "default" }: { filters: ResultFeedFilter[]; idPrefix: string; headingStyle?: "default" | "eyebrow" }) {
  const labelClass = headingStyle === "eyebrow" ? eyebrow : undefined;
  return (
    <>
      {filters.map((filter) =>
        filter.kind === "toggle" ? (
          <div key={filter.id} className="flex items-center gap-2">
            <Switch id={`${idPrefix}-${filter.id}`} checked={filter.value} onCheckedChange={filter.onValueChange} />
            <Label htmlFor={`${idPrefix}-${filter.id}`} className={labelClass}>{filter.label}</Label>
          </div>
        ) : (
          <div key={filter.id} className="flex items-center gap-2">
            <Label htmlFor={`${idPrefix}-${filter.id}`} className={labelClass}>{filter.label}</Label>
            <Select value={filter.value} onValueChange={filter.onValueChange}>
              <SelectTrigger id={`${idPrefix}-${filter.id}`} aria-label={filter.label}>
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
    </>
  );
}

/** How many filters are away from their starting value (a toggle on, a select not on its first option). */
function activeFilters(filters: ResultFeedFilter[]): number {
  return filters.filter((f) => (f.kind === "toggle" ? f.value : f.value !== f.options[0]?.value)).length;
}

/** VIDEO-UI-14 (item 6): the same controls behind one View button: a popover, and the kit's bottom sheet on a phone. */
function FilterView({ filters, headingStyle = "default" }: { filters: ResultFeedFilter[]; headingStyle?: "default" | "eyebrow" }) {
  const phone = useIsPhoneLayout();
  const [open, setOpen] = useState(false);
  const active = activeFilters(filters);
  const trigger = (
    <Button type="button" variant="outline" size="sm" data-slot="result-feed-view" aria-haspopup="dialog" aria-expanded={open} onClick={phone ? () => setOpen(true) : undefined}>
      <SlidersHorizontalIcon aria-hidden />
      {i18n._({ id: "ui.View", message: "View" })}
      {active > 0 ? <span data-slot="result-feed-view-count" aria-label={i18n._({ id: "ui.{active} on", message: "{active} on", values: { active } })} className="bg-primary text-primary-foreground inline-flex min-w-4 items-center justify-center rounded-full px-1 text-xs tabular-nums">{active}</span> : null}
    </Button>
  );
  const body = <div role="group" aria-label={i18n._({ id: "ui.Filter results", message: "Filter results" })} className="flex flex-col gap-4"><FilterControls filters={filters} idPrefix="result-feed-view" headingStyle={headingStyle} /></div>;
  return (
    <div data-slot="result-feed-filters" data-presentation="popover" className="flex min-w-0 items-center gap-3">
      {phone ? (
        <>
          {trigger}
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerContent aria-describedby={undefined}>
              <DrawerHeader><DrawerTitle>{i18n._({ id: "ui.View", message: "View" })}</DrawerTitle></DrawerHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">{body}</div>
            </DrawerContent>
          </Drawer>
        </>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          <PopoverContent width="auto" align="start" aria-label={i18n._({ id: "ui.View", message: "View" })} className="w-[min(92vw,20rem)]">{body}</PopoverContent>
        </Popover>
      )}
      <span className="text-muted-foreground min-w-0 truncate text-sm">{filters.map((f, i) => (i === 0 ? f.label : f.label.toLowerCase())).join(", ")}</span>
    </div>
  );
}

/**
 * VIDEO-UI-04 (K10): a newest-first feed of generated clips. Each entry shows its words, tags and reference chips (a Start
 * frame with its thumbnail), then one `VideoPlayer` in whatever status the job has. A filter bar (toggles and selects)
 * sits above, and entries are gathered under `DayDivider` headings, or under their words. Pure: every entry, handler and
 * string is a prop; the schema node (`result_feed`) fills them and keeps running entries current (`poll_while`).
 */
export function ResultFeed({
  entries: allEntries,
  filters = [],
  grouping = "day",
  label = i18n._({ id: "ui.Results", message: "Results" }),
  empty,
  look = "default",
  filtersPresentation = "inline",
  onUnlock,
  headingStyle = "default",
}: {
  entries: (ResultFeedEntry | ResultFeedLockedEntry)[];
  filters?: ResultFeedFilter[];
  grouping?: "day" | "words" | "none";
  /** The feed's accessible name. */
  label?: string;
  /** Shown instead of the list when there are no entries (the filter bar stays). */
  empty?: React.ReactNode;
  /** VIDEO-UI-14: `media` draws the feed picture first: the newest entry wide, the rest in a grid (two columns only while the feed's own
   * pane gives each at least 320 px, one otherwise), the tags on the picture, the words once under it, and the player's icon row over
   * the picture on hover or focus (always on touch). Default `default`: one column, the words above the player. */
  look?: "default" | "media";
  /** VIDEO-UI-14: `popover` puts the filters behind one View button (a sheet on a phone). Default `inline`. */
  filtersPresentation?: "inline" | "popover";
  /** ADULT-LOCK-01: called when the lock tile is pressed. Absent: the tile opens the page's passcode dialog (`AdultLockProvider`). */
  onUnlock?: () => void;
  /** VIDEO-STUDIO-03 (K5): `eyebrow` draws the day headings, and the filter labels, as a small uppercase tracked line. Default `default`. */
  headingStyle?: "default" | "eyebrow";
}) {
  const entries: ResultFeedEntry[] = [];
  let hasLocked = false;
  let making = false;
  for (const entry of allEntries) {
    if ((entry as { locked?: unknown }).locked === true) {
      hasLocked = true;
      if ((entry as ResultFeedLockedEntry).making === true) making = true;
    } else entries.push(entry as ResultFeedEntry);
  }
  const groups = groupFeedEntries(entries, grouping);
  const inserted = useInsertedKeys(entries.map((entry) => entry.key));
  const media = look === "media";
  return (
    <section data-slot="result-feed" aria-label={label} className={cn("flex w-full flex-col gap-4", media && "@container")} data-look={media ? "media" : undefined}>
      {filters.length > 0 && filtersPresentation === "popover" ? <FilterView filters={filters} headingStyle={headingStyle} /> : null}
      {filters.length > 0 && filtersPresentation !== "popover" ? (
        <div data-slot="result-feed-filters" role="group" aria-label={i18n._({ id: "ui.Filter results", message: "Filter results" })} className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <FilterControls filters={filters} idPrefix="result-feed" headingStyle={headingStyle} />
        </div>
      ) : null}
      {entries.length === 0 && !hasLocked ? empty ?? null : null}
      {groups.map((group) => (
        <div key={group.key} data-slot="result-feed-group" className="flex flex-col gap-4">
          {group.label ? (() => {
            const text = grouping === "words" ? shorten(group.label) : i18n._({ id: "ui.{label}, {count, plural, one {# clip} other {# clips}}", message: "{label}, {count, plural, one {# clip} other {# clips}}", values: { label: group.label, count: group.entries.length } });
            return headingStyle === "eyebrow" ? <h3 data-slot="result-feed-group-heading" className={eyebrow}>{text}</h3> : <DayDivider label={text} />;
          })() : null}
          {(() => {
            const articles = group.entries.map((entry) => {
              const first = media && entry.key === entries[0]?.key;
              const player = entry.player as VideoPlayerProps;
              const picked = [...(entry.references?.map((r) => r.label) ?? []), ...(entry.tags ?? [])];
              return (
                <article key={entry.key} data-slot="result-feed-entry" data-status={entry.player.status} data-first={first ? "true" : undefined} aria-label={shorten(entry.words)} className={cn("flex min-w-0 flex-col gap-2", first && "@2xl:col-span-2", inserted.has(entry.key) && "motion-list")}>
                  {media ? (
                    <>
                      <VideoPlayer {...player} size={first ? "xl" : "full"} caption={false} badges={picked} chrome="overlay" actionsReveal="hover" />
                      <p data-slot="result-feed-words" className="text-foreground line-clamp-2 text-sm">{entry.words}</p>
                    </>
                  ) : (
                    <>
                      <p data-slot="result-feed-words" className="text-foreground line-clamp-3 text-sm">{entry.words}</p>
                      {(entry.tags?.length ?? 0) > 0 || (entry.references?.length ?? 0) > 0 ? (
                        <ul data-slot="result-feed-tags" aria-label={i18n._({ id: "ui.Details", message: "Details" })} className="flex flex-wrap items-center gap-1.5">
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
                      <VideoPlayer {...player} />
                    </>
                  )}
                </article>
              );
            });
            // The media look gathers a group's entries in a grid; the default look keeps them as direct children of the group.
            return media ? <div data-slot="result-feed-grid" className="grid min-w-0 grid-cols-1 gap-4 @2xl:grid-cols-2">{articles}</div> : articles;
          })()}
        </div>
      ))}
      {hasLocked ? (
        <div data-slot="result-feed-locked" className="flex max-w-3xl flex-col gap-4">
          <LockTile shape="card" making={making} onUnlock={onUnlock} />
        </div>
      ) : null}
    </section>
  );
}
