import { createContext, useContext, useEffect, useState, type ReactNode, type RefObject } from "react";
import { getIcon } from "@/kit/icons";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/kit/dashboard/components/ui/hover-card";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/kit/ui/table";
import { cn } from "@/kit/utils";

const ChevronIcon = getIcon("chevron-down");

/** What a link preview shows: the page's title, a short summary and, when the person may see pictures, a small picture. */
export interface ArticlePreview { title: string; summary: string; thumbnail?: { src: string; alt: string } }
export type ArticlePreviewLoader = (target: { book: string; path: string }) => Promise<ArticlePreview | null>;
/** READER-00: set by `ArticleView` when the page passes `loadPreview`; a book link then opens a hover-card summary. */
export const ArticlePreviewContext = createContext<ArticlePreviewLoader | null>(null);

export interface ArticleContentsItem { id: string; title: string; level: 2 | 3 | 4 }
export interface ArticleInfobox { title?: string; image?: { src: string; alt: string }; rows: Array<{ label: string; value: string }> }

const PHONE_QUERY = "(max-width: 767px)";
/** True on a phone-width screen. A browser without `matchMedia` counts as wide. */
export function usePhoneWidth(): boolean {
  const read = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(PHONE_QUERY).matches;
  const [phone, setPhone] = useState(read);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const list = window.matchMedia(PHONE_QUERY);
    const on = () => setPhone(list.matches);
    on();
    list.addEventListener?.("change", on);
    return () => list.removeEventListener?.("change", on);
  }, []);
  return phone;
}

/** The heading nearest the top of the reading area, measured where the scroll happens (any scroll container). */
const READING_LINE_PX = 120;
export function useActiveSection(bodyRef: RefObject<HTMLElement | null>, ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join("\n");
  useEffect(() => {
    if (ids.length === 0) { setActive(null); return; }
    const measure = () => {
      const body = bodyRef.current;
      if (!body) return;
      const headings = new Map((Array.from(body.querySelectorAll("h2,h3,h4")) as HTMLElement[]).map((h) => [h.id, h]));
      let current: string | null = null;
      for (const id of ids) {
        const heading = headings.get(id);
        if (heading && heading.getBoundingClientRect().top <= READING_LINE_PX) current = id;
      }
      setActive(current);
    };
    measure();
    document.addEventListener("scroll", measure, { capture: true, passive: true });
    window.addEventListener("resize", measure);
    return () => {
      document.removeEventListener("scroll", measure, { capture: true });
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, bodyRef]);
  return active;
}

/** A closed-on-a-phone, open-on-a-wide-screen box with a title row. */
function Disclosure({ slot, title, children, className }: { slot: string; title: string; children: ReactNode; className?: string }) {
  const phone = usePhoneWidth();
  const [openOnPhone, setOpenOnPhone] = useState(false);
  const open = phone ? openOnPhone : true;
  return (
    <details data-slot={slot} open={open} onToggle={(event) => { if (phone) setOpenOnPhone((event.currentTarget as HTMLDetailsElement).open); }} className={cn("group rounded-lg border bg-card text-card-foreground", className)}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 font-semibold md:cursor-default"><span className="min-w-0 break-words">{title}</span><ChevronIcon aria-hidden className="size-4 shrink-0 transition-transform group-open:rotate-180 md:hidden" /></summary>
      {children}
    </details>
  );
}

export function ArticleInfoboxCard({ infobox }: { infobox: ArticleInfobox }) {
  return (
    <aside data-slot="article-infobox" aria-label={infobox.title ?? "At a glance"}>
      <Disclosure slot="article-infobox-box" title={infobox.title ?? "At a glance"}>
        {infobox.image ? <img src={infobox.image.src} alt={infobox.image.alt} loading="lazy" className="mx-3 mb-2 w-[calc(100%-1.5rem)] rounded-md object-cover" /> : null}
        <Table className="text-sm">
          <TableBody>
            {infobox.rows.map((row, i) => <TableRow key={i}><TableHead scope="row" className="w-2/5 whitespace-normal align-top">{row.label}</TableHead><TableCell className="whitespace-normal break-words">{row.value}</TableCell></TableRow>)}
          </TableBody>
        </Table>
      </Disclosure>
    </aside>
  );
}

export function ArticleContentsNav({ items, activeId, onPick }: { items: readonly ArticleContentsItem[]; activeId: string | null; onPick: (id: string) => void }) {
  return (
    <nav data-slot="article-contents" aria-label="Contents">
      <Disclosure slot="article-contents-box" title="Contents">
        <ul className="flex flex-col gap-0.5 px-1 pb-2 text-sm">
          {items.map((item) => (
            <li key={item.id} style={{ paddingInlineStart: `${(item.level - 2) * 0.75}rem` }}>
              <a
                href={`#${item.id}`}
                aria-current={activeId === item.id ? "true" : undefined}
                onClick={(event) => { event.preventDefault(); onPick(item.id); }}
                className={cn("block rounded-md px-2 py-1 hover:bg-muted", activeId === item.id ? "bg-muted font-semibold" : "text-muted-foreground")}
              >{item.title}</a>
            </li>
          ))}
        </ul>
      </Disclosure>
    </nav>
  );
}

function PreviewBody({ target }: { target: { book: string; path: string } }) {
  const load = useContext(ArticlePreviewContext);
  const [state, setState] = useState<"loading" | "none" | ArticlePreview>("loading");
  useEffect(() => {
    let live = true;
    void Promise.resolve(load?.(target)).then((value) => { if (live) setState(value ?? "none"); }, () => { if (live) setState("none"); });
    return () => { live = false; };
  }, [load, target.book, target.path]);
  if (state === "loading") return <p className="text-muted-foreground" aria-live="polite">Loading…</p>;
  if (state === "none") return <p className="text-muted-foreground">No preview for this page.</p>;
  return (
    <div data-slot="article-preview" className="flex flex-col gap-2">
      {state.thumbnail ? <img src={state.thumbnail.src} alt={state.thumbnail.alt} loading="lazy" className="max-h-32 w-full rounded-md object-cover" /> : null}
      <p className="font-semibold">{state.title}</p>
      <p className="line-clamp-5">{state.summary}</p>
    </div>
  );
}

/** A book link with a hover-card summary when the page can load one; the link itself is the page's own drawing. */
export function PreviewLink({ target, children }: { target: { book: string; path: string }; children: ReactNode }) {
  const load = useContext(ArticlePreviewContext);
  if (!load) return <>{children}</>;
  return (
    <HoverCard>
      <HoverCardTrigger delay={400} closeDelay={100} render={<span />}>{children}</HoverCardTrigger>
      <HoverCardContent className="w-72"><PreviewBody target={target} /></HoverCardContent>
    </HoverCard>
  );
}
