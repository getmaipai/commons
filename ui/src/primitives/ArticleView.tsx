import { getIcon } from "@/kit/icons";
import { useState, type CSSProperties, type ReactNode } from "react";
import { Badge } from "@/kit/dashboard/components/ui/badge";
import { Button } from "@/kit/dashboard/components/ui/button";
import { AspectRatio } from "@/kit/dashboard/components/ui/aspect-ratio";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/kit/dashboard/components/ui/dropdown-menu";
import { Separator } from "@/kit/dashboard/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/kit/ui/table";
import { cn } from "@/kit/utils";
import { StoryFeed, type StoryAction, type StoryActionIds, type StoryCardData } from "./StoryFeed";
import { SafeImage } from "./SafeImage";
import { FocalImage } from "./FocalImage";

const ArrowLeftIcon = getIcon("arrow-left");
const BookmarkIcon = getIcon("bookmark");
const EllipsisIcon = getIcon("more-horizontal");
const ShareIcon = getIcon("share");
const TypeIcon = getIcon("a-large-small");
const NewspaperIcon = getIcon("newspaper");

/** The spec's `article_inline`: a run of text, or a link carrying a book `target` or an outbound `href`. */
export type ArticleInlineData =
  | { type: "text" | "emphasis" | "strong"; text: string }
  | { type: "link"; text: string; target?: { book: string; path: string }; href?: string };

/** The spec's `article_block`. */
export type ArticleBlockData =
  | { type: "heading"; level: 2 | 3 | 4; id: string; text: string }
  | { type: "paragraph"; inlines: ArticleInlineData[] }
  | { type: "list"; ordered: boolean; items: ArticleInlineData[][] }
  | { type: "rows"; rows: Array<{ label: string; value: string }> }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "figure"; src: string; alt: string; caption: string }
  | { type: "note"; text: string }
  | { type: "quote"; inlines: ArticleInlineData[]; cite?: string };

/** What the `article` block carries, with the news-only parts optional so another reader (Reference) can use the view. */
export interface ArticleViewData {
  title: string;
  kicker?: string;
  /** A plain line under the headline (Reference: the book's source label). */
  description?: string;
  byline?: { publisher: string; site: string; published_at: string; outlets: number; reading_s: number };
  sourceIconUrl?: string;
  image?: { w480: string; w1280: string; alt: string };
  key_points?: { text: string; band: "child" | "teen" | "adult" };
  blocks: ArticleBlockData[];
  also_covering?: StoryCardData[];
  open_url?: string;
  saved?: boolean;
}

export type ArticleAction = "listen" | "save" | "summarize" | "open_site" | "open";

export interface ArticleViewProps {
  data: ArticleViewData;
  /** Fired with the story's own ids (or an "Also covering" story's). */
  onAction?: (action: ArticleAction, ids: StoryActionIds) => void;
  /** Which actions the page declared; the action row shows only these. */
  available?: readonly ArticleAction[];
  ids?: StoryActionIds;
  /** Draws the toolbar's back button. The page owns where back goes; without it the button is not drawn. */
  onBack?: () => void;
  /** Draws a link that names a book page (Reference). Without it such a link is plain text. */
  renderTargetLink?: (target: { book: string; path: string }, text: string) => ReactNode;
  /** A line under the article (Reference: licence and snapshot date). */
  footer?: ReactNode;
  className?: string;
}

function Inlines({ values, renderTargetLink }: { values: ArticleInlineData[]; renderTargetLink?: ArticleViewProps["renderTargetLink"] }) {
  return (
    <>
      {values.map((value, i) => {
        if (value.type === "strong") return <strong key={i}>{value.text}</strong>;
        if (value.type === "emphasis") return <em key={i}>{value.text}</em>;
        if (value.type === "link") {
          // A child's copy carries neither `href` nor `target`, so it falls through to plain text here.
          if (value.href) return <a key={i} href={value.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{value.text}</a>;
          if (value.target && renderTargetLink) return <span key={i}>{renderTargetLink(value.target, value.text)}</span>;
        }
        return <span key={i}>{value.text}</span>;
      })}
    </>
  );
}

function Block({ block, renderTargetLink }: { block: ArticleBlockData; renderTargetLink?: ArticleViewProps["renderTargetLink"] }) {
  switch (block.type) {
    case "heading": {
      const Tag = `h${Math.min(4, Math.max(2, block.level))}` as "h2" | "h3" | "h4";
      return <Tag id={block.id} className="scroll-mt-6 font-semibold">{block.text}</Tag>;
    }
    case "paragraph":
      return <p><Inlines values={block.inlines} renderTargetLink={renderTargetLink} /></p>;
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag className={cn("list-inside", block.ordered ? "list-decimal" : "list-disc")}>
          {block.items.map((item, i) => <li key={i}><Inlines values={item} renderTargetLink={renderTargetLink} /></li>)}
        </Tag>
      );
    }
    case "rows":
      return (
        <Table>
          <TableBody>
            {block.rows.map((row, i) => (
              <TableRow key={i}><TableHead scope="row">{row.label}</TableHead><TableCell>{row.value}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      );
    case "table":
      return (
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader><TableRow>{block.headers.map((head, i) => <TableHead key={i}>{head}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {block.rows.map((row, i) => <TableRow key={i}>{row.map((cell, j) => <TableCell key={j}>{cell}</TableCell>)}</TableRow>)}
            </TableBody>
          </Table>
        </div>
      );
    case "figure":
      return (
        <figure className="min-w-0">
          <FocalImage src={block.src} alt={block.alt} loading="lazy" className="max-w-full" />
          {block.caption ? <figcaption className="text-muted-foreground text-sm">{block.caption}</figcaption> : null}
        </figure>
      );
    case "note":
      return <aside className="bg-muted rounded-lg p-3 text-sm">{block.text}</aside>;
    case "quote":
      return (
        <blockquote className="border-border border-l-4 pl-4 italic">
          <Inlines values={block.inlines} renderTargetLink={renderTargetLink} />
          {block.cite ? <footer className="text-muted-foreground mt-1 text-sm not-italic">{block.cite}</footer> : null}
        </blockquote>
      );
  }
}

/** The reading size, per viewer in this browser: three steps on the body only, never the headline or the page. */
const TEXT_SIZES = [
  { id: "small", label: "Smaller", className: "text-base" },
  { id: "medium", label: "Default", className: "text-lg" },
  { id: "large", label: "Larger", className: "text-xl" },
] as const;
type TextSizeId = (typeof TEXT_SIZES)[number]["id"];
/** One tap steps the size: Default, then Larger, then Smaller, then Default again. */
const NEXT_SIZE: Record<TextSizeId, TextSizeId> = { medium: "large", large: "small", small: "medium" };
const TEXT_SIZE_KEY = "maipai.article.text-size";

function readTextSize(): TextSizeId {
  try {
    const stored = window.localStorage.getItem(TEXT_SIZE_KEY);
    if (TEXT_SIZES.some((size) => size.id === stored)) return stored as TextSizeId;
  } catch { /* storage can be blocked: the default size is fine */ }
  return "medium";
}

function minutes(seconds: number): string {
  const m = Math.max(1, Math.round(seconds / 60));
  return `${m} min read`;
}

/**
 * NEWS-01: the one reader behind the `article` answer-block kind and the Reference page. Kicker, headline, byline,
 * action row, picture, Key points, the typed block list, "Also covering" and a footer slot. It trusts the hub: a link
 * appears only when the copy it was handed carries an `href` (teens and adults) or a book `target` the page can draw,
 * so a child's article renders every link as plain text. Buttons fire `onAction` with the story's own ids.
 */
export function ArticleView({ data, onAction, available = [], ids, onBack, renderTargetLink, footer, className }: ArticleViewProps) {
  const can = (a: ArticleAction) => onAction !== undefined && available.includes(a);
  const fire = (a: ArticleAction, extra?: Partial<StoryActionIds>) => onAction?.(a, { ...ids, ...extra });
  const [textSize, setTextSize] = useState<TextSizeId>(readTextSize);
  const [iconFailed, setIconFailed] = useState(false);
  const chooseSize = (id: TextSizeId) => {
    setTextSize(id);
    try { window.localStorage.setItem(TEXT_SIZE_KEY, id); } catch { /* not kept this time */ }
  };
  const bodySize = TEXT_SIZES.find((size) => size.id === textSize)!.className;
  const canShare = can("open_site") && !!data.open_url && typeof navigator !== "undefined" && typeof navigator.share === "function";
  const hasMore = can("listen") || (can("summarize") && !data.key_points) || (can("open_site") && !!data.open_url);
  const hasToolbar = onBack !== undefined || can("save") || canShare || hasMore || data.blocks.length > 0;
  return (
    <article data-slot="article-view" className={cn("flex w-full min-w-0 flex-col", className)}>
      <div data-slot="article-sticky-header" className="sticky top-0 z-30 -mb-14 flex flex-col">
      {hasToolbar ? (
        <div data-slot="article-toolbar" className="flex h-14 items-center gap-1 bg-transparent px-0 py-1">
          {onBack ? <Button variant="ghost" size="icon-lg" aria-label="Back" className="rounded-full" onClick={onBack}><ArrowLeftIcon aria-hidden /></Button> : null}
          <div data-slot="article-actions" className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-lg"
              className="rounded-full"
              aria-label="Text size"
              title={`Text size: ${TEXT_SIZES.find((size) => size.id === textSize)!.label}. Tap to change.`}
              onClick={() => chooseSize(NEXT_SIZE[textSize])}
            >
              <TypeIcon aria-hidden />
            </Button>
            {canShare ? <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="Share" onClick={() => { void navigator.share({ title: data.title, url: data.open_url }).catch(() => {}); }}><ShareIcon aria-hidden /></Button> : null}
            {can("save") ? (
              <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label={data.saved ? "Saved" : "Save"} aria-pressed={data.saved === true} onClick={() => fire("save", { on: !data.saved })}>
                <BookmarkIcon aria-hidden fill={data.saved ? "currentColor" : "none"} />
              </Button>
            ) : null}
            {hasMore ? (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="More" />}><EllipsisIcon aria-hidden /></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {can("open_site") && data.open_url ? <DropdownMenuItem onClick={() => fire("open_site", { url: data.open_url })}>Open original</DropdownMenuItem> : null}
                  {can("listen") ? <DropdownMenuItem onClick={() => fire("listen")}>Listen</DropdownMenuItem> : null}
                  {can("summarize") && !data.key_points ? <DropdownMenuItem onClick={() => fire("summarize")}>Key points</DropdownMenuItem> : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      ) : null}
      </div>
      {data.byline ? (
        <div data-slot="article-provider" className="flex min-h-16 w-full items-center justify-center gap-3 px-0 py-2 text-center text-2xl font-semibold">
          <SafeImage src={iconFailed ? undefined : data.sourceIconUrl} alt="" aria-hidden className="size-11 shrink-0 rounded-xl" onError={() => setIconFailed(true)} fallbackContent={<NewspaperIcon aria-hidden className="size-5 text-muted-foreground" />} />
          <span>{data.byline.publisher}</span>
        </div>
      ) : null}
      <div data-slot="article-column" className="mx-auto flex w-full min-w-0 max-w-[72ch] flex-col gap-4 px-4 md:px-6 lg:px-8">
      <header className="flex flex-col gap-2">
        {data.byline ? <p className="text-muted-foreground text-sm">{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(data.byline.published_at))} · {data.byline.publisher} · {minutes(data.byline.reading_s)}</p> : null}
        {data.kicker ? <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{data.kicker}</p> : null}
        <h2 data-slot="article-title" className="text-4xl leading-[1.05] font-extrabold tracking-[-0.03em] md:text-5xl">{data.title}</h2>
        {data.description ? <p data-slot="article-dek" className="text-muted-foreground text-sm">{data.description}</p> : null}
        {data.byline && data.byline.outlets > 1 ? <Badge variant="secondary" className="w-fit">{data.byline.outlets} sources</Badge> : null}
      </header>
      {data.image ? (
        <div data-slot="article-lead">
          <AspectRatio ratio={16 / 9} className="mx-auto w-full max-w-[1100px] overflow-hidden rounded-lg" style={{ "--ratio": 16 / 9, maxHeight: "var(--article-lead-max-h, 24rem)" } as CSSProperties}>
            <FocalImage aspectRatio={16 / 9} src={data.image.w1280} srcSet={`${data.image.w480} 480w, ${data.image.w1280} 1280w`} sizes="(min-width: 768px) 720px, 100vw" alt={data.image.alt} className="absolute inset-0 size-full object-cover" />
          </AspectRatio>
        </div>
      ) : null}
      {data.key_points ? (
        <section data-slot="key-points" aria-label="Key points" className="mx-auto flex w-full max-w-[72ch] flex-col gap-1 rounded-lg bg-muted p-4">
          <h3 className="text-sm font-semibold">Key points</h3>
          <p className="whitespace-pre-line">{data.key_points.text}</p>
          <p className="text-muted-foreground text-xs">Written on this hub from the article.</p>
        </section>
      ) : null}
      <div data-slot="article-body" data-text-size={textSize} className={cn("flex w-full min-w-0 flex-col gap-4 font-serif leading-[1.6] [&[data-text-size=medium]]:text-xl", bodySize)}>
        {data.blocks.map((block, index) => <Block key={index} block={block} renderTargetLink={renderTargetLink} />)}
      </div>
      {data.also_covering && data.also_covering.length > 0 ? (
        <section data-slot="also-covering" className="flex flex-col gap-2">
          <Separator />
          <h3 className="text-lg font-semibold">Also covering this story</h3>
          <StoryFeed
            data={{ layout: "rows", rows: data.also_covering, as_of: data.byline?.published_at ?? new Date(0).toISOString() }}
            available={["open"]}
            onAction={onAction && ((action: StoryAction, storyIds) => { if (action === "open") onAction("open", storyIds); })}
          />
        </section>
      ) : null}
      {footer ? <div className="border-t pt-4 text-sm text-muted-foreground">{footer}</div> : null}
      </div>
    </article>
  );
}
