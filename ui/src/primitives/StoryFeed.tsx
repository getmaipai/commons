import { getIcon } from "@/kit/icons";
import type { ReactNode } from "react";
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
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/kit/dashboard/components/ui/item";
import { RelativeTime } from "@/kit/ui/relative-time";
import { cn, HIT_AREA_ROW } from "@/kit/utils";

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
  site: string;
  published_at: string;
  outlets: number;
  topics: string[];
  image?: { w480: string; w1280: string; alt: string };
  saved: boolean;
  opened: boolean;
  open_url?: string;
}

/** The `story_feed` block's props. */
export interface StoryFeedData {
  layout: "today" | "channel" | "rows";
  header?: { title: string; subtitle?: string; channel?: { kind: "topic" | "source"; key: string; followed: boolean } };
  hero?: StoryCardData;
  featured?: StoryCardData[];
  shelves?: Array<{ title: string; channels?: Array<{ kind: "topic" | "source"; key: string; label: string }>; stories: StoryCardData[] }>;
  rows?: StoryCardData[];
  as_of: string;
}

/** What a card can ask for. The feed never names a route: the page's `actions` map says what each name does. */
export type StoryAction = "open" | "save" | "follow" | "feedback_more" | "feedback_less" | "open_site" | "reset_mix";
export type StoryActionIds = { story_id?: string; item_id?: string; channel_kind?: string; channel_key?: string; on?: boolean; url?: string };

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
  if (story.open_url && can("open_site")) entries.push(<DropdownMenuItem key="site" onClick={() => fire("open_site")}>Open on {story.site}</DropdownMenuItem>);
  if (entries.length === 0) return null;
  return (
    <CardAction>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-lg" aria-label={`More for ${story.title}`} className={HIT_AREA_ROW} />}>
          <EllipsisIcon aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">{entries}</DropdownMenuContent>
      </DropdownMenu>
    </CardAction>
  );
}

function SourceLine({ story }: { story: StoryCardData }) {
  return (
    <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
      <span>{story.publisher}</span>
      <RelativeTime at={story.published_at} />
      {story.outlets > 1 ? <Badge variant="secondary">{story.outlets} sources</Badge> : null}
      {story.saved ? (
        <Badge variant="outline"><BookmarkIcon aria-hidden data-icon="inline-start" />Saved</Badge>
      ) : null}
    </p>
  );
}

function StoryImage({ story, ratio, large }: { story: StoryCardData; ratio: number; large?: boolean }) {
  if (!story.image) {
    return (
      <AspectRatio ratio={ratio} className="bg-muted text-muted-foreground flex items-center justify-center" data-slot="story-image" data-empty="">
        <NewspaperIcon aria-hidden className="size-8" />
      </AspectRatio>
    );
  }
  return (
    <AspectRatio ratio={ratio} data-slot="story-image">
      <img
        src={large ? story.image.w1280 : story.image.w480}
        srcSet={`${story.image.w480} 480w, ${story.image.w1280} 1280w`}
        sizes={large ? "(min-width: 1024px) 66vw, 100vw" : "(min-width: 1024px) 33vw, 100vw"}
        alt={story.image.alt}
        loading="lazy"
        className="size-full object-cover"
      />
    </AspectRatio>
  );
}

function StoryCard({ story, ctx, tier }: { story: StoryCardData; ctx: Ctx; tier: "hero" | "featured" | "half" | "shelf" }) {
  const open = () => ctx.onAction?.("open", { story_id: story.story_id, item_id: story.item_id });
  const hero = tier === "hero";
  return (
    <Card
      data-slot="story-card"
      data-tier={tier}
      data-opened={story.opened ? "" : undefined}
      interactive
      className={cn("relative", story.opened && "opacity-70", tier === "hero" && "lg:col-span-8 lg:row-span-2", tier === "featured" && "lg:col-span-4", tier === "half" && "lg:col-span-6", tier === "shelf" && "w-64 shrink-0 snap-start")}
    >
      <StoryImage story={story} ratio={hero || tier === "half" ? 16 / 9 : 4 / 3} large={hero} />
      <CardContent className="flex flex-col gap-2">
        <button
          type="button"
          onClick={open}
          className={cn("text-left font-semibold underline-offset-2 hover:underline focus-visible:underline after:absolute after:inset-0 after:content-['']", hero ? "text-2xl leading-tight" : "text-base leading-snug")}
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

function StoryRow({ story, ctx }: { story: StoryCardData; ctx: Ctx }) {
  const open = () => ctx.onAction?.("open", { story_id: story.story_id, item_id: story.item_id });
  return (
    <Item variant="outline" data-slot="story-row" data-opened={story.opened ? "" : undefined} className={cn("relative", story.opened && "opacity-70")}>
      <ItemMedia variant="image" className="size-20">
        {story.image ? (
          <img src={story.image.w480} alt={story.image.alt} loading="lazy" className="size-full object-cover" />
        ) : (
          <NewspaperIcon aria-hidden className="text-muted-foreground size-6" />
        )}
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          <button type="button" onClick={open} className="text-left underline-offset-2 hover:underline focus-visible:underline after:absolute after:inset-0 after:content-['']">
            {story.title}
          </button>
        </ItemTitle>
        <ItemDescription className="line-clamp-1">{story.publisher}</ItemDescription>
        <SourceLine story={{ ...story, publisher: story.site }} />
      </ItemContent>
    </Item>
  );
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
        {ctx.onAction && shelf.channels?.length ? (
          <div className="flex flex-wrap gap-1">
            {shelf.channels.map((channel) => (
              <Button key={`${channel.kind}:${channel.key}`} variant="outline" size="sm" className={HIT_AREA_ROW} onClick={() => ctx.onAction?.("open", { channel_kind: channel.kind, channel_key: channel.key })}>
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
  const rows = data.rows ?? [];
  const empty = !data.hero && featured.length === 0 && rows.length === 0 && (data.shelves ?? []).every((s) => s.stories.length === 0);
  return (
    <section data-slot="story-feed" data-layout={data.layout} aria-label={data.header?.title ?? "Stories"} className={cn("flex min-w-0 flex-col gap-6", className)}>
      {data.header ? <ChannelHeader header={data.header} ctx={ctx} /> : null}
      {empty ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><NewspaperIcon aria-hidden /></EmptyMedia>
            <EmptyTitle>No stories yet</EmptyTitle>
            <EmptyDescription>New stories from your sources show up here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      {data.layout !== "rows" && (data.hero || featured.length > 0) ? (
        <div data-slot="story-grid" className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
          {data.hero ? <StoryCard story={data.hero} ctx={ctx} tier="hero" /> : null}
          {featured.map((story, index) => (
            <StoryCard key={story.story_id} story={story} ctx={ctx} tier={data.hero && index < 2 ? "featured" : "half"} />
          ))}
        </div>
      ) : null}
      {(data.shelves ?? []).filter((shelf) => shelf.stories.length > 0).map((shelf) => <Shelf key={shelf.title} shelf={shelf} ctx={ctx} />)}
      {rows.length > 0 ? (
        <ul data-slot="story-rows" className="flex list-none flex-col gap-2 p-0">
          {rows.map((story) => (
            <li key={story.story_id}><StoryRow story={story} ctx={ctx} /></li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
