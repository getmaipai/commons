import { getIcon } from "@/kit/icons";
import { useState, type CSSProperties, type ReactNode } from "react";
import { Badge } from "@/kit/dashboard/components/ui/badge";
import { Button } from "@/kit/dashboard/components/ui/button";
import { AspectRatio } from "@/kit/dashboard/components/ui/aspect-ratio";
import { Card, CardAction, CardContent } from "@/kit/dashboard/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/kit/dashboard/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/kit/dashboard/components/ui/empty";
import { Item, ItemContent, ItemMedia, ItemTitle } from "@/kit/dashboard/components/ui/item";
import { Tabs, TabsList, TabsTrigger } from "@/kit/dashboard/components/ui/tabs";
import { RelativeTime } from "@/kit/ui/relative-time";
import { cn, HIT_AREA_ROW } from "@/kit/utils";
import { SafeImage } from "./SafeImage";

const BookmarkIcon = getIcon("bookmark");
const EllipsisIcon = getIcon("more-horizontal");
const NewspaperIcon = getIcon("newspaper");

/** One story as a card draws it (the spec's `news_story_card`). */
export interface StoryCardData {
  story_id: string;
  item_id: string;
  title: string;
  dek?: string;
  publisher: string;
  /** Optional publisher favicon URL, shown beside the source name. */
  sourceIconUrl?: string;
  site: string;
  published_at: string;
  outlets: number;
  topics: string[];
  image?: { w480: string; w1280: string; alt: string };
  saved: boolean;
  opened: boolean;
  open_url?: string;
  /** The hub's day group ("This morning"); consecutive rows with the same group draw under one heading. */
  group?: string;
  /** The hub-built line above the headline ("Top story · 4 outlets", "Science"). */
  kicker?: string;
}

/** How a section page arranges its stories (spec/news/topics.json `section_style`). */
export type SectionStyle = "top_stories" | "special" | "todays_news";

/** One topic chip under the header. An empty `id` means All. */
export interface StoryFilter { id: string; label: string; selected?: boolean }

/** The `story_feed` block's props. */
export interface StoryFeedData {
  layout: "today" | "channel" | "rows";
  /** NEWS-SECTION-STYLES-01: a channel page's arrangement, from the topic's `section_style`. Read only when `layout` is `channel`. */
  section_style?: SectionStyle;
  header?: { title: string; subtitle?: string; dateline?: string; channel?: { kind: "topic" | "source"; key: string; followed: boolean } };
  hero?: StoryCardData;
  featured?: StoryCardData[];
  shelves?: Array<{ title: string; channels?: Array<{ kind: "topic" | "source"; key: string; label: string }>; stories: StoryCardData[] }>;
  rows?: StoryCardData[];
  filters?: StoryFilter[];
  as_of: string;
}

/** What a card can ask for. The feed never names a route: the page's `actions` map says what each name does. */
export type StoryAction = "open" | "open_channel" | "save" | "follow" | "feedback_more" | "feedback_less" | "open_site" | "reset_mix" | "filter";
export type StoryActionIds = { story_id?: string; item_id?: string; channel_kind?: string; channel_key?: string; on?: boolean; url?: string; filter_id?: string };

export interface StoryFeedProps {
  data: StoryFeedData;
  /** Fired with the story's own ids. An action the page did not declare is simply absent from `available`. */
  onAction?: (action: StoryAction, ids: StoryActionIds) => void;
  /** Which actions the page declared; the menu and buttons show only these. Default: open only. */
  available?: readonly StoryAction[];
  className?: string;
}

const DEFAULT_AVAILABLE: readonly StoryAction[] = ["open"];

type Ctx = { onAction?: StoryFeedProps["onAction"]; available: readonly StoryAction[] };

function CardMenu({ story, ctx }: { story: StoryCardData; ctx: Ctx }) {
  const can = (a: StoryAction) => ctx.available.includes(a) && ctx.onAction !== undefined;
  const fire = (a: StoryAction, on?: boolean) => ctx.onAction?.(a, { story_id: story.story_id, item_id: story.item_id, ...(on === undefined ? {} : { on }), ...(a === "open_site" && story.open_url ? { url: story.open_url } : {}) });
  const entries: ReactNode[] = [];
  if (can("save")) entries.push(<DropdownMenuItem key="save" onClick={() => fire("save", !story.saved)}>{story.saved ? "Remove from Saved" : "Save"}</DropdownMenuItem>);
  if (can("feedback_more")) entries.push(<DropdownMenuItem key="more" onClick={() => fire("feedback_more")}>More like this</DropdownMenuItem>);
  if (can("feedback_less")) entries.push(<DropdownMenuItem key="less" onClick={() => fire("feedback_less")}>Less like this</DropdownMenuItem>);
  if (story.open_url && can("open_site")) entries.push(<DropdownMenuItem key="site" onClick={() => fire("open_site")}>Open original</DropdownMenuItem>);
  if (entries.length === 0) return null;
  return (
    <CardAction className="absolute top-2 right-2 z-10 rounded-full bg-background/85 backdrop-blur">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-lg" aria-label={`More for ${story.title}`} className={HIT_AREA_ROW} />}>
          <EllipsisIcon aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">{entries}</DropdownMenuContent>
      </DropdownMenu>
    </CardAction>
  );
}

function Kicker({ story }: { story: StoryCardData }) {
  if (!story.kicker) return null;
  return <p data-slot="story-kicker" className="text-kicker text-xs font-semibold tracking-wide uppercase">{story.kicker}</p>;
}

/** An opened story mutes its headline and source line; the card keeps full strength. */
function SourceLine({ story }: { story: StoryCardData }) {
  const [iconFailed, setIconFailed] = useState(false);
  return (
    <div data-slot="story-source" data-opened={story.opened ? "" : undefined} className={cn("flex flex-wrap items-center gap-x-2 text-xs", story.opened ? "text-muted-foreground" : "text-foreground")}>
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <SafeImage src={iconFailed ? undefined : story.sourceIconUrl} alt="" aria-hidden kind="picture" className="size-4 shrink-0 rounded bg-muted text-muted-foreground object-cover" onError={() => setIconFailed(true)} />
        <span>{story.publisher}</span>
      </span>
      <RelativeTime at={story.published_at} />
      {story.outlets > 1 ? <Badge variant="secondary">{story.outlets} sources</Badge> : null}
      {story.saved ? (
        <Badge variant="outline"><BookmarkIcon aria-hidden data-icon="inline-start" />Saved</Badge>
      ) : null}
    </div>
  );
}

/** The hero's picture ratio is the `--story-hero-ratio` token (default 2 / 1), set through the kit AspectRatio's own variable, and
 * its height stops at `--story-hero-max-h`; the picture covers the frame, so a tall portrait is cropped, never stretched. */
const HERO_RATIO_STYLE = { "--ratio": "var(--story-hero-ratio, 2 / 1)", maxHeight: "var(--story-hero-max-h, 26rem)" } as CSSProperties;
/** Every other card picture stops at `--story-card-max-h`, so a half-width card on a wide screen is not taller than it is useful.
 * The style carries its own `--ratio`: a `style` passed to the kit AspectRatio replaces the one that sets it, and a frame without it has no height. */
const cardStyle = (ratio: number): CSSProperties => ({ "--ratio": ratio, maxHeight: "var(--story-card-max-h, 18rem)" }) as CSSProperties;

function StoryImage({ story, ratio, large, hero, thumbnail }: { story: StoryCardData; ratio: number; large?: boolean; hero?: boolean; thumbnail?: boolean }) {
  const style = hero ? HERO_RATIO_STYLE : thumbnail ? undefined : cardStyle(ratio);
  const src = large ? story.image?.w1280 : story.image?.w480;
  return (
    <AspectRatio ratio={ratio} style={thumbnail ? ({ "--ratio": ratio, width: "100%" } as CSSProperties) : style} className="overflow-hidden" data-slot="story-image">
      <SafeImage
        src={src}
        srcSet={thumbnail || !story.image ? undefined : `${story.image.w480} 480w, ${story.image.w1280} 1280w`}
        sizes={thumbnail ? undefined : large ? "(min-width: 1024px) 66vw, 100vw" : "(min-width: 1024px) 33vw, 100vw"}
        alt={story.image?.alt ?? ""}
        loading="lazy"
        className="absolute inset-0 size-full object-cover"
      />
    </AspectRatio>
  );
}

function StoryCard({ story, ctx, tier }: { story: StoryCardData; ctx: Ctx; tier: "hero" | "featured" | "half" | "shelf" | "tall" }) {
  const open = () => ctx.onAction?.("open", { story_id: story.story_id, item_id: story.item_id });
  const hero = tier === "hero";
  return (
    <Card
      data-slot="story-card"
      data-tier={tier}
      data-opened={story.opened ? "" : undefined}
      interactive
      className={cn("relative gap-0 py-0", tier === "hero" && "lg:col-span-8 lg:row-span-2", tier === "featured" && "lg:col-span-4", tier === "half" && "lg:col-span-6", tier === "shelf" && "w-64 shrink-0 snap-start")}
    >
      <StoryImage story={story} ratio={hero ? 16 / 9 : tier === "shelf" ? 4 / 3 : 16 / 9} large={hero} hero={hero} />
      <CardContent className="flex flex-col gap-2 py-4">
        <Kicker story={story} />
        <button
          type="button"
          onClick={open}
          data-opened={story.opened ? "" : undefined}
          className={cn("text-left font-semibold underline-offset-2 hover:underline focus-visible:underline after:absolute after:inset-0 after:content-['']", story.opened && "text-muted-foreground", hero ? "text-2xl leading-tight" : "text-base leading-snug")}
        >
          {story.title}
        </button>
        {story.dek && (hero || tier === "half") ? <p className="text-muted-foreground line-clamp-2 text-sm">{story.dek}</p> : null}
        <SourceLine story={story} />
      </CardContent>
      <CardMenu story={story} ctx={ctx} />
    </Card>
  );
}

/** A section page's lead story: one wide card, the picture beside the text, with the rest of the page a list under it. A section
 * (a topic or a source) reads differently from Today's editorial grid, the way a native news app's section pages do. */
function StoryLead({ story, ctx }: { story: StoryCardData; ctx: Ctx }) {
  const open = () => ctx.onAction?.("open", { story_id: story.story_id, item_id: story.item_id });
  return (
    <Card data-slot="story-card" data-tier="lead" data-opened={story.opened ? "" : undefined} interactive className="relative flex-col gap-0 overflow-hidden py-0 sm:flex-row">
      <div className="sm:w-3/5 sm:shrink-0">
        <StoryImage story={story} ratio={16 / 9} large />
      </div>
      <CardContent className="flex min-w-0 flex-1 flex-col justify-center gap-2 py-4">
        <Kicker story={story} />
        <button
          type="button"
          onClick={open}
          data-opened={story.opened ? "" : undefined}
          className={cn("text-left text-2xl leading-tight font-semibold underline-offset-2 hover:underline focus-visible:underline after:absolute after:inset-0 after:content-['']", story.opened && "text-muted-foreground")}
        >
          {story.title}
        </button>
        {story.dek ? <p className="text-muted-foreground line-clamp-3 text-sm">{story.dek}</p> : null}
        <SourceLine story={story} />
      </CardContent>
      <CardMenu story={story} ctx={ctx} />
    </Card>
  );
}

/** A section page's picture-right card: the text beside a small picture, the card as wide as its column. */
function StorySide({ story, ctx }: { story: StoryCardData; ctx: Ctx }) {
  const open = () => ctx.onAction?.("open", { story_id: story.story_id, item_id: story.item_id });
  return (
    <Card data-slot="story-card" data-tier="side" data-opened={story.opened ? "" : undefined} interactive className="relative h-full flex-row gap-0 overflow-hidden py-0">
      <CardContent className="flex min-w-0 flex-1 flex-col gap-2 py-4">
        <Kicker story={story} />
        <button
          type="button"
          onClick={open}
          data-opened={story.opened ? "" : undefined}
          className={cn("text-left text-base leading-snug font-semibold underline-offset-2 hover:underline focus-visible:underline after:absolute after:inset-0 after:content-['']", story.opened && "text-muted-foreground")}
        >
          {story.title}
        </button>
        <SourceLine story={story} />
      </CardContent>
      <div className="w-2/5 shrink-0 self-stretch">
        <StoryImage story={story} ratio={1} />
      </div>
      <CardMenu story={story} ctx={ctx} />
    </Card>
  );
}

/** The counts and headings of each section style: `tall` large picture-over-text cards, then `side` picture-right cards, then
 * (todays_news only) one wide split card under its own heading. Whatever remains falls to the list. */
const SECTION_STYLES: Record<SectionStyle, { heading: string; tall: number; tallCols: string; side: number; sideCols: string; wide: number; wideHeading: string }> = {
  top_stories: { heading: "Top Stories", tall: 3, tallCols: "sm:grid-cols-2 lg:grid-cols-3", side: 3, sideCols: "sm:grid-cols-2 lg:grid-cols-3", wide: 0, wideHeading: "" },
  special: { heading: "Top Stories", tall: 2, tallCols: "sm:grid-cols-2", side: 2, sideCols: "sm:grid-cols-2", wide: 0, wideHeading: "" },
  todays_news: { heading: "Today's News", tall: 3, tallCols: "sm:grid-cols-2 lg:grid-cols-3", side: 0, sideCols: "", wide: 1, wideHeading: "More for you" },
};

/** The styled arrangement of a section page. Fewer stories than a style asks for fill what is there and draw no empty heading. */
function StyledSection({ style, stories, ctx }: { style: SectionStyle; stories: StoryCardData[]; ctx: Ctx }) {
  const plan = SECTION_STYLES[style];
  const tall = stories.slice(0, plan.tall);
  const side = stories.slice(plan.tall, plan.tall + plan.side);
  const wide = stories.slice(plan.tall + plan.side, plan.tall + plan.side + plan.wide);
  return (
    <div data-slot="story-section" data-section-style={style} className="flex min-w-0 flex-col gap-6">
      {tall.length > 0 ? (
        <section aria-label={plan.heading} className="flex min-w-0 flex-col gap-3">
          <h3 className="text-lg font-semibold">{plan.heading}</h3>
          <div data-slot="story-tall" className={cn("grid min-w-0 grid-cols-1 gap-4", plan.tallCols)}>
            {tall.map((story) => <StoryCard key={story.story_id} story={story} ctx={ctx} tier="tall" />)}
          </div>
          {side.length > 0 ? (
            <div data-slot="story-side" className={cn("grid min-w-0 grid-cols-1 gap-4", plan.sideCols)}>
              {side.map((story) => <StorySide key={story.story_id} story={story} ctx={ctx} />)}
            </div>
          ) : null}
        </section>
      ) : null}
      {wide.length > 0 ? (
        <section aria-label={plan.wideHeading} className="flex min-w-0 flex-col gap-3">
          <h3 className="text-lg font-semibold">{plan.wideHeading}</h3>
          {wide.map((story) => <StoryLead key={story.story_id} story={story} ctx={ctx} />)}
        </section>
      ) : null}
    </div>
  );
}

function StoryRow({ story, ctx }: { story: StoryCardData; ctx: Ctx }) {
  const open = () => ctx.onAction?.("open", { story_id: story.story_id, item_id: story.item_id });
  return (
    <Item variant="outline" size="story" data-slot="story-row" data-opened={story.opened ? "" : undefined} className="relative">
      <ItemMedia variant="thumbnail">
        <StoryImage story={story} ratio={16 / 9} thumbnail />
      </ItemMedia>
      <ItemContent>
        <Kicker story={story} />
        <ItemTitle>
          <button
            type="button"
            onClick={open}
            data-opened={story.opened ? "" : undefined}
            className={cn("text-left underline-offset-2 hover:underline focus-visible:underline after:absolute after:inset-0 after:content-['']", story.opened && "text-muted-foreground")}
          >
            {story.title}
          </button>
        </ItemTitle>
        <SourceLine story={story} />
      </ItemContent>
    </Item>
  );
}

/** The topic chips: one row of kit pills; the chosen one is pressed. Drawn only when the page mapped `filter`. */
function FilterChips({ filters, ctx }: { filters: StoryFilter[]; ctx: Ctx }) {
  if (!ctx.onAction || !ctx.available.includes("filter") || filters.length === 0) return null;
  const chosen = filters.find((f) => f.selected);
  return (
    <Tabs value={chosen ? `f:${chosen.id}` : ""} onValueChange={(value) => ctx.onAction?.("filter", { filter_id: String(value).slice(2) })} className="min-w-0 max-w-full">
      <TabsList variant="pill" aria-label="Filter stories" data-slot="story-filters">
        {filters.map((filter) => (
          <TabsTrigger key={filter.id} value={`f:${filter.id}`} aria-pressed={filter.selected === true} className="min-h-[48px] min-w-[48px]">
            {filter.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/** Consecutive rows with the same `group` fall under one heading with a muted count; rows with no group stay ungrouped. */
function groupRows(rows: StoryCardData[]): Array<{ group?: string; stories: StoryCardData[] }> {
  const out: Array<{ group?: string; stories: StoryCardData[] }> = [];
  for (const story of rows) {
    const last = out[out.length - 1];
    if (last && last.group === story.group) last.stories.push(story);
    else out.push({ group: story.group, stories: [story] });
  }
  return out;
}

function ChannelHeader({ header, ctx }: { header: NonNullable<StoryFeedData["header"]>; ctx: Ctx }) {
  const channel = header.channel;
  const canFollow = channel !== undefined && ctx.available.includes("follow") && ctx.onAction !== undefined;
  const canReset = ctx.available.includes("reset_mix") && ctx.onAction !== undefined;
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-2xl font-semibold tracking-tight">{header.title}</h2>
        {header.subtitle ? <p className="text-muted-foreground text-sm">{header.subtitle}</p> : null}
        {header.dateline ? <p data-slot="story-dateline" className="text-muted-foreground text-xs">{header.dateline}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {canFollow ? (
          <Button
            variant={channel.followed ? "secondary" : "default"}
            aria-pressed={channel.followed}
            onClick={() => ctx.onAction?.("follow", { channel_kind: channel.kind, channel_key: channel.key, on: !channel.followed })}
          >
            {channel.followed ? "Following" : "Follow"}
          </Button>
        ) : null}
        {canReset ? (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-lg" aria-label="Page options" className={HIT_AREA_ROW} />}>
              <EllipsisIcon aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => ctx.onAction?.("reset_mix", {})}>Reset My Mix</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
}

function Shelf({ shelf, ctx }: { shelf: NonNullable<StoryFeedData["shelves"]>[number]; ctx: Ctx }) {
  return (
    <section data-slot="story-shelf" aria-label={shelf.title} className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">{shelf.title}</h3>
        {ctx.onAction && ctx.available.includes("open_channel") && shelf.channels?.length ? (
          <div className="flex flex-wrap gap-1">
            {shelf.channels.map((channel) => (
              <Button key={`${channel.kind}:${channel.key}`} variant="outline" size="sm" className={HIT_AREA_ROW} onClick={() => ctx.onAction?.("open_channel", { channel_kind: channel.kind, channel_key: channel.key })}>
                {channel.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
      <ul className="flex snap-x list-none gap-3 overflow-x-auto p-0 pb-2">
        {shelf.stories.map((story) => (
          <li key={story.story_id} className="shrink-0">
            <StoryCard story={story} ctx={ctx} tier="shelf" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * NEWS-01: the editorial story feed behind the `story_feed` answer-block kind. One hero over two rows with two
 * featured stories stacked beside it and the others at half width; horizontal shelves; thumbnail rows. One column
 * under 640 px, two to 960 px. Draws only what the hub sent, already floored for the viewer's band: it holds no
 * ranking, no fetch and no link of its own, and fires `onAction` with the story's own ids for the page to resolve.
 */
export function StoryFeed({ data, onAction, available = DEFAULT_AVAILABLE, className }: StoryFeedProps) {
  const ctx: Ctx = { onAction, available };
  const featured = data.featured ?? [];
  const section = data.layout === "channel";
  // A section page: the lead story wide, then everything else as one list (the featured stories join the rows).
  const styled = section && data.section_style !== undefined ? data.section_style : undefined;
  const lead = section ? [...(data.hero ? [data.hero] : []), ...featured, ...(data.rows ?? [])] : [];
  const used = styled ? SECTION_STYLES[styled].tall + SECTION_STYLES[styled].side + SECTION_STYLES[styled].wide : 0;
  const rows = styled ? lead.slice(used) : section ? [...featured, ...(data.rows ?? [])] : (data.rows ?? []);
  const empty = !data.hero && featured.length === 0 && rows.length === 0 && (data.shelves ?? []).every((s) => s.stories.length === 0);
  return (
    <section data-slot="story-feed" data-layout={data.layout} aria-label={data.header?.title ?? "Stories"} className={cn("flex min-w-0 flex-col gap-6", className)}>
      {data.header ? <ChannelHeader header={data.header} ctx={ctx} /> : null}
      <FilterChips filters={data.filters ?? []} ctx={ctx} />
      {empty ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><NewspaperIcon aria-hidden /></EmptyMedia>
            <EmptyTitle>No stories yet</EmptyTitle>
            <EmptyDescription>New stories from your sources show up here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      {styled ? <StyledSection style={styled} stories={lead} ctx={ctx} /> : null}
      {section && !styled && data.hero ? <StoryLead story={data.hero} ctx={ctx} /> : null}
      {data.layout !== "rows" && !section && (data.hero || featured.length > 0) ? (
        <div data-slot="story-grid" className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
          {data.hero ? <StoryCard story={data.hero} ctx={ctx} tier="hero" /> : null}
          {featured.map((story, index) => (
            <StoryCard key={story.story_id} story={story} ctx={ctx} tier={data.hero && index < 2 ? "featured" : "half"} />
          ))}
        </div>
      ) : null}
      {(data.shelves ?? []).filter((shelf) => shelf.stories.length > 0).map((shelf) => <Shelf key={shelf.title} shelf={shelf} ctx={ctx} />)}
      {styled && rows.length > 0 && !rows[0]!.group ? <h3 data-slot="story-more" className="-mb-3 text-lg font-semibold">More stories</h3> : null}
      {groupRows(rows).map((segment, index) => (
        <div key={`${segment.group ?? ""}:${index}`} data-slot="story-group" className="flex min-w-0 flex-col gap-2">
          {segment.group ? (
            <h3 className="text-lg font-semibold">
              {segment.group} <span className="text-muted-foreground text-sm font-normal">{segment.stories.length}</span>
            </h3>
          ) : null}
          <ul data-slot="story-rows" className="flex list-none flex-col gap-2 p-0">
            {segment.stories.map((story) => (
              <li key={story.story_id}><StoryRow story={story} ctx={ctx} /></li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
