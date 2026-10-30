import { getIcon } from "@/kit/icons";
import { Fragment, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Badge } from "@/kit/dashboard/components/ui/badge";
import { Button } from "@/kit/dashboard/components/ui/button";
import { AspectRatio } from "@/kit/dashboard/components/ui/aspect-ratio";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/kit/dashboard/components/ui/dropdown-menu";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/kit/dashboard/components/ui/breadcrumb";
import { Separator } from "@/kit/dashboard/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/kit/ui/table";
import { cn } from "@/kit/utils";
import { StoryFeed, type StoryAction, type StoryActionIds, type StoryCardData } from "./StoryFeed";
import { SafeImage } from "./SafeImage";
import { FocalImage } from "./FocalImage";
import { ArticleSpeechContext } from "./articleSpeech";
import { ArticleContentsNav, ArticleInfoboxCard, ArticlePreviewContext, PreviewLink, useActiveSection, usePhoneWidth, type ArticleContentsItem, type ArticleInfobox, type ArticlePreviewLoader } from "./articleReader";

export { ArticleSpeechContext, type ArticleSpeech } from "./articleSpeech";
export type { ArticleContentsItem, ArticleInfobox, ArticlePreview, ArticlePreviewLoader } from "./articleReader";

const ChevronDownIcon = getIcon("chevron-down");
const ArrowLeftIcon = getIcon("arrow-left");
const PlayIcon = getIcon("play");
const BookmarkIcon = getIcon("bookmark");
const EllipsisIcon = getIcon("more-horizontal");
const ShareIcon = getIcon("share");
const TypeIcon = getIcon("a-large-small");
const HeadphonesIcon = getIcon("headphones");
const MessageIcon = getIcon("message-circle");
const SparklesIcon = getIcon("sparkles");
const LoaderIcon = getIcon("loader");
const AudioIcon = getIcon("audio-waveform");
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
  /** `chip` draws the kicker as a chip instead of small uppercase text. */
  kickerStyle?: "chip";
  /** Where the page sits: each item is plain text, or a button when it has `onClick`; the last item is the page itself. */
  breadcrumb?: Array<{ label: string; onClick?: () => void }>;
  /** The first figure floats at the left of the paragraphs that follow it, before the first section, on a wide screen. */
  floatFirstFigure?: boolean;
  /** A plain line under the headline (Reference: the book's source label). */
  description?: string;
  byline?: { publisher: string; site: string; published_at: string; outlets: number; reading_s: number };
  sourceIconUrl?: string;
  image?: { w480: string; w1280: string; alt: string; /** A short chip drawn on the picture (Reference: the picture's own caption). */ badge?: string; focal?: { x: number; y: number; aspect: number } };
  key_points?: { text: string; band: "child" | "teen" | "adult" };
  /** A bold standfirst before the body (Reference: the article's own first sentence). */
  lead?: string;
  /** Draws labelled Save, Listen and Share under the hero on a wide screen; the phone keeps the floating pill. */
  actionRow?: boolean | "top" | "under-hero";
  /** One fact in a card at the top of the rail (Reference). */
  quick_fact?: string;
  /** Other articles in the rail, each a title, an optional picture and a book link drawn by `renderTargetLink`. */
  related?: Array<{ target: { book: string; path: string }; title: string; thumbnail?: { src: string; alt: string } }>;
  /** A one-line "for other uses" note under the headline (Reference). */
  hatnote?: string;
  /** The article's facts box (Reference). Beside the text on a wide screen, a closed box above it on a phone. */
  infobox?: ArticleInfobox;
  /** The section list, with the section being read marked (Reference). Each id is a heading block's id. */
  contents?: ArticleContentsItem[];
  /** On a phone, every section after the lead folds closed and a tap on its heading opens it. A wide screen folds nothing. */
  foldSections?: boolean;
  blocks: ArticleBlockData[];
  also_covering?: StoryCardData[];
  open_url?: string;
  saved?: boolean;
}

// The row condenses once the headline is this close to it, and goes back only after the headline has moved clearly away (no flicker at the line).
const CONDENSE_LEAD_PX = 12;
const CONDENSE_RELEASE_PX = 64;
const SUMMARY_RETRIES = 6;
const SUMMARY_RETRY_MS = 10_000;

export type ArticleAction = "listen" | "save" | "summarize" | "open_site" | "open" | "discuss";

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
  /** Gives every book link a hover-card summary. Called only when a card opens; the page owns the request. */
  loadPreview?: ArticlePreviewLoader;
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
          if (value.target && renderTargetLink) return <span key={i}><PreviewLink target={value.target}>{renderTargetLink(value.target, value.text)}</PreviewLink></span>;
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

/** Words are found by their text, never re-rendered: the Custom Highlight API paints the spoken range and the current word over the
 * body as it stands, so reading never costs a re-render per word. A browser without it just shows the Listen state. */
function useSpokenHighlight(bodyRef: React.RefObject<HTMLElement | null>, active: boolean, progress: number) {
  useEffect(() => {
    const registry = (globalThis as { CSS?: { highlights?: Map<string, unknown> } }).CSS?.highlights;
    const HighlightCtor = (globalThis as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight;
    const clear = () => { registry?.delete("article-spoken"); registry?.delete("article-speaking"); };
    const root = bodyRef.current;
    if (!active || !registry || !HighlightCtor || !root) { clear(); return; }
    const words: Array<{ node: Text; start: number; end: number }> = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (node) => (node.parentElement?.closest("figcaption,table,script,style") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      for (const match of node.data.matchAll(/\S+/g)) words.push({ node, start: match.index, end: match.index + match[0].length });
    }
    if (words.length === 0) { clear(); return; }
    const at = Math.min(words.length - 1, Math.max(0, Math.floor(progress * words.length)));
    const first = words[0]!;
    const current = words[at]!;
    const spoken = new Range();
    spoken.setStart(first.node, first.start);
    spoken.setEnd(current.node, current.start);
    const now = new Range();
    now.setStart(current.node, current.start);
    now.setEnd(current.node, current.end);
    registry.set("article-spoken", new HighlightCtor(spoken));
    registry.set("article-speaking", new HighlightCtor(now));
    // Keep the spoken word on screen without fighting a reader who scrolled away on purpose: only move when it left the middle band.
    const rect = now.getBoundingClientRect();
    if (rect.height > 0 && (rect.top < 140 || rect.bottom > window.innerHeight - 160)) current.node.parentElement?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [bodyRef, active, progress]);
  useEffect(() => () => {
    const registry = (globalThis as { CSS?: { highlights?: Map<string, unknown> } }).CSS?.highlights;
    registry?.delete("article-spoken");
    registry?.delete("article-speaking");
  }, []);
}

const KEY_POINTS_SHOWN = 3;

/** The hub writes Key points as one short lead line and then lines that start with a bullet. They read as a lead and a short list, not a
 * block of text; past the first few the rest wait behind "Show all". */
function KeyPoints({ text, loading }: { text?: string; loading: boolean }) {
  const [all, setAll] = useState(false);
  const lines = (text ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const bulletOf = (line: string) => /^[•*-]\s+/.test(line) ? line.replace(/^[•*-]\s+/, "") : null;
  const lead = lines.filter((line) => bulletOf(line) === null).join(" ");
  const bullets = lines.map(bulletOf).filter((line): line is string => line !== null);
  const shown = all ? bullets : bullets.slice(0, KEY_POINTS_SHOWN);
  return (
    <section data-slot="key-points" aria-label="Key points" className="bg-muted/60 border-border flex w-full flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-center gap-2">
        <SparklesIcon aria-hidden className="text-primary size-4" />
        <h3 className="text-sm font-semibold">Key points</h3>
      </div>
      {text ? (
        <>
          {lead ? <p className="text-[15px] leading-snug font-medium">{lead}</p> : null}
          {shown.length > 0 ? (
            <ul className="flex flex-col gap-2.5">
              {shown.map((point, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-snug">
                  <span aria-hidden className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" />
                  <span className="text-foreground/90 min-w-0">{point}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {bullets.length > KEY_POINTS_SHOWN ? (
            <Button variant="ghost" size="sm" className="-ml-2 w-fit" aria-expanded={all} onClick={() => setAll((was) => !was)}>{all ? "Show fewer" : `Show all ${bullets.length}`}</Button>
          ) : null}
        </>
      ) : loading ? <p className="text-muted-foreground text-sm" aria-live="polite">Writing the key points…</p> : null}
    </section>
  );
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
/** A row with no picture (or one that failed to load) shows the title's first letter on a quiet tile, never an empty square. */
function RelatedInitial({ title }: { title: string }) {
  return <span aria-hidden data-slot="article-related-initial" className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center text-lg font-semibold">{Array.from(title.trim())[0]?.toUpperCase() ?? ""}</span>;
}

/** The rail's Related list: a thumbnail and a title per row; the title is the book link and stretches over the row. */
function ArticleRelated({ items, renderTargetLink }: { items: NonNullable<ArticleViewData["related"]>; renderTargetLink?: ArticleViewProps["renderTargetLink"] }) {
  return (
    <section data-slot="article-related" aria-label="Related" className="flex flex-col gap-2">
      <h3 className="text-lg font-semibold">Related</h3>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={`${item.target.book}/${item.target.path}`} className="bg-card text-card-foreground hover:bg-muted relative flex items-center gap-3 overflow-hidden rounded-lg border">
            {item.thumbnail ? <SafeImage src={item.thumbnail.src} alt={item.thumbnail.alt} loading="lazy" className="size-12 shrink-0 object-cover" fallbackContent={<RelatedInitial title={item.title} />} /> : <RelatedInitial title={item.title} />}
            <span className="min-w-0 flex-1 truncate text-sm [&_a]:after:absolute [&_a]:after:inset-0">{renderTargetLink ? renderTargetLink(item.target, item.title) : item.title}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The lead (everything before the first section heading) stays open; each level-2 section folds on a phone. */
function FoldedBody({ blocks, renderTargetLink, open, onToggle }: { blocks: ArticleBlockData[]; renderTargetLink?: ArticleViewProps["renderTargetLink"]; open: ReadonlySet<string>; onToggle: (id: string) => void }) {
  const firstHeading = blocks.findIndex((b) => b.type === "heading" && b.level === 2);
  if (firstHeading === -1) return <>{blocks.map((block, index) => <Block key={index} block={block} renderTargetLink={renderTargetLink} />)}</>;
  const sections: Array<{ heading: Extract<ArticleBlockData, { type: "heading" }>; rest: ArticleBlockData[] }> = [];
  for (const block of blocks.slice(firstHeading)) {
    if (block.type === "heading" && block.level === 2) sections.push({ heading: block, rest: [] });
    else sections[sections.length - 1]!.rest.push(block);
  }
  return (
    <>
      {blocks.slice(0, firstHeading).map((block, index) => <Block key={`lead-${index}`} block={block} renderTargetLink={renderTargetLink} />)}
      {sections.map(({ heading, rest }) => {
        const isOpen = open.has(heading.id);
        return (
          <section key={heading.id} data-slot="article-section" data-state={isOpen ? "open" : "closed"} className="flex flex-col gap-4 border-b pb-2">
            <h2 id={heading.id} className="scroll-mt-6 font-semibold">
              <button type="button" aria-expanded={isOpen} onClick={() => onToggle(heading.id)} className="flex w-full items-center justify-between gap-2 py-2 text-left">
                <span className="min-w-0">{heading.text}</span>
                <ChevronDownIcon aria-hidden className={cn("size-5 shrink-0 transition-transform", isOpen && "rotate-180")} />
              </button>
            </h2>
            <div hidden={!isOpen} className="flex flex-col gap-4">
              {rest.map((block, index) => <Block key={index} block={block} renderTargetLink={renderTargetLink} />)}
            </div>
          </section>
        );
      })}
    </>
  );
}

export function ArticleView({ data, onAction, available = [], ids, onBack, renderTargetLink, footer, loadPreview, className }: ArticleViewProps) {
  const can = (a: ArticleAction) => onAction !== undefined && available.includes(a);
  const fire = (a: ArticleAction, extra?: Partial<StoryActionIds>) => onAction?.(a, { ...ids, ...extra });
  const [textSize, setTextSize] = useState<TextSizeId>(readTextSize);
  const [iconFailed, setIconFailed] = useState(false);
  // Save answers at once: the page's own answer arrives a moment later and wins whenever it differs.
  const [saved, setSaved] = useState(data.saved === true);
  useEffect(() => { setSaved(data.saved === true); }, [data.saved]);
  const speech = useContext(ArticleSpeechContext);
  const speakingThis = speech.storyId !== null && speech.storyId === ids?.story_id;
  const bodyRef = useRef<HTMLDivElement>(null);
  const phone = usePhoneWidth();
  const folding = data.foldSections === true && phone;
  const [openSections, setOpenSections] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => { setOpenSections(new Set()); }, [data.title]);
  const toggleSection = (id: string) => setOpenSections((was) => { const next = new Set(was); if (!next.delete(id)) next.add(id); return next; });
  const activeSection = useActiveSection(bodyRef, (data.contents ?? []).map((item) => item.id));
  const pickSection = (id: string) => {
    if (folding) setOpenSections((was) => new Set(was).add(id));
    window.requestAnimationFrame(() => bodyRef.current?.querySelector(`[id="${id}"]`)?.scrollIntoView?.({ block: "start" }));
  };
  useSpokenHighlight(bodyRef, speakingThis && speech.phase === "playing", speech.progress);
  // Once the headline has scrolled up under the pinned row, the row names the story instead of the publisher.
  const titleRef = useRef<HTMLHeadingElement>(null);
  const providerRef = useRef<HTMLDivElement>(null);
  const [condensed, setCondensed] = useState(false);
  useEffect(() => {
    // Measured against the pinned row itself, so it holds in any scroll container (the shell scrolls an inner pane, not the window).
    const measure = () => {
      const title = titleRef.current;
      const row = providerRef.current;
      if (!title || !row) return;
            const rowBottom = row.getBoundingClientRect().bottom;
      const gap = title.getBoundingClientRect().bottom - rowBottom;
      setCondensed((was) => rowBottom > 0 && (was ? gap < CONDENSE_RELEASE_PX : gap < CONDENSE_LEAD_PX));
    };
    measure();
    document.addEventListener("scroll", measure, { capture: true, passive: true });
    window.addEventListener("resize", measure);
    return () => {
      document.removeEventListener("scroll", measure, { capture: true });
      window.removeEventListener("resize", measure);
    };
  }, [data.title]);
  const chooseSize = (id: TextSizeId) => {
    setTextSize(id);
    try { window.localStorage.setItem(TEXT_SIZE_KEY, id); } catch { /* not kept this time */ }
  };
  const bodySize = TEXT_SIZES.find((size) => size.id === textSize)!.className;
  const canShare = can("open_site") && !!data.open_url && typeof navigator !== "undefined" && typeof navigator.share === "function";
  const hasMore = can("open_site") && !!data.open_url;
  const hasAssist = can("listen") || can("discuss");
  // The key points write themselves: opening a story that has none yet asks for them once.
  const summarizing = can("summarize") && !data.key_points;
  const askedFor = useRef<string | null>(null);
  const askKey = `${ids?.item_id ?? ""}|${ids?.story_id ?? ""}|${data.title}`;
  // Not ready yet is never an error: the rail keeps showing progress and the ask repeats quietly a few times.
  useEffect(() => {
    if (!summarizing) return;
    if (askedFor.current !== askKey) { askedFor.current = askKey; fire("summarize"); }
    let tries = 0;
    const again = window.setInterval(() => {
      tries += 1;
      if (tries > SUMMARY_RETRIES) { window.clearInterval(again); return; }
      fire("summarize");
    }, SUMMARY_RETRY_MS);
    return () => window.clearInterval(again);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summarizing, askKey]);
  const listenLoading = speakingThis && speech.phase === "loading";
  const listenText = listenLoading ? "Starting…" : speakingThis && speech.phase === "playing" ? "Listening" : speakingThis && speech.phase === "paused" ? "Paused" : "Listen";
  const shareNow = () => { void navigator.share({ title: data.title, url: data.open_url }).catch(() => {}); };
  const rowPlace = data.actionRow === "top" ? "top" : data.actionRow ? "under-hero" : null;
  const hasActionRow = rowPlace !== null && (can("save") || can("listen") || canShare);
  const hasToolbar = onBack !== undefined || can("save") || canShare || hasMore || data.blocks.length > 0;
  const floatAt = data.floatFirstFigure ? data.blocks.findIndex((b) => b.type === "figure") : -1;
  const firstSection = data.blocks.findIndex((b) => b.type === "heading" && b.level === 2);
  const floatEnd = firstSection === -1 ? data.blocks.length : firstSection;
  const plainBlocks = floatAt !== -1 && floatAt < floatEnd ? (
    <>
      {data.blocks.slice(0, floatAt).map((block, index) => <Block key={`pre-${index}`} block={block} renderTargetLink={renderTargetLink} />)}
      <div data-slot="article-floated" className="flow-root [&>*+*]:mt-4">
        <div className="mb-3 md:float-left md:mr-5 md:mb-2 md:w-[34%]"><Block block={data.blocks[floatAt]!} renderTargetLink={renderTargetLink} /></div>
        {data.blocks.slice(floatAt + 1, floatEnd).map((block, index) => <Block key={`flo-${index}`} block={block} renderTargetLink={renderTargetLink} />)}
      </div>
      {data.blocks.slice(floatEnd).map((block, index) => <Block key={`post-${index}`} block={block} renderTargetLink={renderTargetLink} />)}
    </>
  ) : data.blocks.map((block, index) => <Block key={index} block={block} renderTargetLink={renderTargetLink} />);
  const actionRowEl = hasActionRow ? (
        <div data-slot="article-action-row" role="group" aria-label="Article actions" className={cn("hidden items-center gap-2 md:flex", rowPlace === "under-hero" && "border-b pb-2")}>
      {can("save") ? <Button variant="ghost" aria-pressed={saved} onClick={() => { setSaved(!saved); fire("save", { on: !saved }); }}><BookmarkIcon aria-hidden fill={saved ? "currentColor" : "none"} />{saved ? "Saved" : "Save"}</Button> : null}
      {can("listen") ? <Button variant="ghost" aria-busy={listenLoading} onClick={() => fire("listen")}>{listenLoading ? <LoaderIcon aria-hidden className="animate-spin" /> : speakingThis && speech.phase ? <AudioIcon aria-hidden className="text-primary" /> : <PlayIcon aria-hidden />}{listenText}</Button> : null}
      {canShare ? <Button variant="ghost" onClick={shareNow}><ShareIcon aria-hidden />Share</Button> : null}
    </div>
  ) : null;
  return (
    <ArticlePreviewContext.Provider value={loadPreview ?? null}><article data-slot="article-view" className={cn("flex w-full min-w-0 flex-col", className)}>
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
            {canShare ? <Button variant="ghost" size="icon-lg" className={cn("rounded-full", hasActionRow && "md:hidden")} aria-label="Share" onClick={shareNow}><ShareIcon aria-hidden /></Button> : null}
            {can("save") ? (
              <Button variant="ghost" size="icon-lg" className={cn("rounded-full", hasActionRow && "md:hidden")} aria-label={saved ? "Saved" : "Save"} aria-pressed={saved} onClick={() => { setSaved(!saved); fire("save", { on: !saved }); }}>
                <BookmarkIcon aria-hidden fill={saved ? "currentColor" : "none"} className={cn("transition-transform duration-200", saved && "text-primary scale-110")} />
              </Button>
            ) : null}
            {hasMore ? (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="More" />}><EllipsisIcon aria-hidden /></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {can("open_site") && data.open_url ? <DropdownMenuItem onClick={() => fire("open_site", { url: data.open_url })}>Open original</DropdownMenuItem> : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      ) : null}
      </div>
      {data.byline ? (
        <div ref={providerRef} data-slot="article-provider" data-condensed={condensed ? "true" : undefined} className={cn("sticky top-0 z-20 flex h-14 w-full items-center justify-center gap-3 bg-muted py-0 text-center text-2xl font-semibold", "transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]", condensed ? "px-16 md:px-48" : "px-4")}>
          <SafeImage src={iconFailed ? undefined : data.sourceIconUrl} alt="" aria-hidden className={cn("shrink-0 rounded-xl transition-[width,height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]", condensed ? "size-8" : "size-11")} onError={() => setIconFailed(true)} fallbackContent={<NewspaperIcon aria-hidden className="size-5 text-muted-foreground" />} />
          <span key={condensed ? "title" : "publisher"} data-slot="article-provider-label" className={cn("min-w-0", condensed && "truncate text-lg leading-tight")}>{condensed ? data.title : data.byline.publisher}</span>
        </div>
      ) : null}
      <div data-slot="article-column" className={cn("mx-auto flex w-full min-w-0 max-w-[72ch] flex-col gap-4 px-4 md:px-6", hasToolbar && data.breadcrumb && data.breadcrumb.length > 0 ? "pt-16 lg:pt-6" : "pt-6", "lg:grid lg:max-w-none lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-x-12 lg:gap-y-0 lg:px-8 lg:[&>*]:mb-4 lg:[&>*:not([data-slot=article-rail])]:col-start-1 lg:[&>*:not([data-slot=article-rail])]:w-full lg:[&>*:not([data-slot=article-rail])]:max-w-[80ch] lg:[&>*:not([data-slot=article-rail])]:justify-self-center")}>
      <header className="flex flex-col gap-2">
        {data.breadcrumb && data.breadcrumb.length > 0 ? (
          <Breadcrumb data-slot="article-breadcrumb" aria-label="Breadcrumb">
            <BreadcrumbList>
              {data.breadcrumb.map((item, i) => {
                const last = i === data.breadcrumb!.length - 1;
                return (
                  <Fragment key={i}>
                    <BreadcrumbItem>
                      {last ? <BreadcrumbPage>{item.label}</BreadcrumbPage> : item.onClick ? <BreadcrumbLink render={<button type="button" onClick={item.onClick} />}>{item.label}</BreadcrumbLink> : <span>{item.label}</span>}
                    </BreadcrumbItem>
                    {last ? null : <BreadcrumbSeparator />}
                  </Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        ) : null}
        {(data.kicker && data.kickerStyle === "chip") || (hasActionRow && rowPlace === "top") ? (
          <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
            {data.kicker && data.kickerStyle === "chip" ? <Badge data-slot="article-kicker-chip" variant="outline" className="tracking-wide uppercase">{data.kicker}</Badge> : <span />}
            {hasActionRow && rowPlace === "top" ? actionRowEl : null}
          </div>
        ) : null}
        {data.byline ? <p className="text-muted-foreground text-sm">{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(data.byline.published_at))} · {data.byline.publisher} · {minutes(data.byline.reading_s)}</p> : null}
        {data.kicker && data.kickerStyle !== "chip" ? <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{data.kicker}</p> : null}
        <h2 ref={titleRef} data-slot="article-title" className="text-4xl leading-[1.05] font-extrabold tracking-[-0.03em] md:text-5xl">{data.title}</h2>
        {data.hatnote ? <p data-slot="article-hatnote" className="text-muted-foreground text-sm italic">{data.hatnote}</p> : null}
        {data.description ? <p data-slot="article-dek" className="text-muted-foreground text-sm">{data.description}</p> : null}
        {data.byline && data.byline.outlets > 1 ? <Badge variant="secondary" className="w-fit">{data.byline.outlets} sources</Badge> : null}
      </header>
      {hasAssist || data.key_points || summarizing || data.quick_fact || (data.related && data.related.length > 0) || data.infobox || (data.contents && data.contents.length > 0) ? (
        <div data-slot="article-rail" className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start lg:[grid-row:1/span_99] lg:col-start-2">
        {hasAssist ? (
          <div data-slot="article-assist" role="group" aria-label="Read it another way" className="flex gap-2 [&>*]:flex-1">
            {can("listen") ? (
              <Button variant="outline" size="sm" className={hasActionRow ? "md:hidden" : undefined} aria-busy={speakingThis && speech.phase === "loading"} data-state={speakingThis ? speech.phase ?? undefined : undefined} onClick={() => fire("listen")}>
                {speakingThis && speech.phase === "loading" ? <LoaderIcon aria-hidden className="animate-spin" /> : speakingThis && speech.phase ? <AudioIcon aria-hidden className="text-primary" /> : <HeadphonesIcon aria-hidden />}
                {speakingThis && speech.phase === "loading" ? "Starting…" : speakingThis && speech.phase === "playing" ? "Listening" : speakingThis && speech.phase === "paused" ? "Paused" : "Listen"}
              </Button>
            ) : null}
            {can("discuss") ? <Button variant="outline" size="sm" onClick={() => fire("discuss")}><MessageIcon aria-hidden />Discuss</Button> : null}
          </div>
        ) : null}
        {data.key_points || summarizing ? <KeyPoints text={data.key_points?.text} loading={summarizing} /> : null}
        {data.quick_fact ? <section data-slot="article-quick-fact" aria-label="Quick fact" className="flex flex-col gap-1 rounded-lg border bg-card p-4 text-card-foreground"><h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Quick fact</h3><p className="text-lg leading-snug">{data.quick_fact}</p></section> : null}
        {data.related && data.related.length > 0 ? <ArticleRelated items={data.related} renderTargetLink={renderTargetLink} /> : null}
        {data.infobox && data.infobox.rows.length > 0 ? <ArticleInfoboxCard infobox={data.infobox} /> : null}
        {data.contents && data.contents.length > 0 ? <ArticleContentsNav items={data.contents} activeId={activeSection} onPick={pickSection} /> : null}
        </div>
      ) : null}
      {data.image ? (
        <div data-slot="article-lead">
          <AspectRatio ratio={16 / 9} className="mx-auto w-full max-w-[1100px] overflow-hidden rounded-lg" style={{ "--ratio": 16 / 9, maxHeight: "var(--article-lead-max-h, 24rem)" } as CSSProperties}>
            {data.image.badge ? <Badge data-slot="article-image-badge" variant="secondary" className="absolute top-3 left-3 z-10 max-w-[70%] truncate">{data.image.badge}</Badge> : null}
            <FocalImage aspectRatio={16 / 9} src={data.image.w1280} srcSet={`${data.image.w480} 480w, ${data.image.w1280} 1280w`} sizes="(min-width: 768px) 720px, 100vw" alt={data.image.alt} focal={data.image.focal} className="absolute inset-0 size-full object-cover" />
          </AspectRatio>
        </div>
      ) : null}
      {hasActionRow && rowPlace === "under-hero" ? actionRowEl : null}
      {data.lead ? <p data-slot="article-standfirst" className="text-2xl leading-snug font-semibold">{data.lead}</p> : null}
      <div ref={bodyRef} data-slot="article-body" data-text-size={textSize} className={cn("flex w-full min-w-0 flex-col gap-4 font-serif leading-[1.6] [&[data-text-size=medium]]:text-xl", bodySize)}>
        {folding ? <FoldedBody blocks={data.blocks} renderTargetLink={renderTargetLink} open={openSections} onToggle={toggleSection} /> : plainBlocks}
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
    </article></ArticlePreviewContext.Provider>
  );
}
