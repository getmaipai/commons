import { useEffect, useMemo, useRef, useState } from "react";
import { i18n } from "@/kit/i18n";
import { Input } from "@/kit/ui/input";
import { cn } from "@/kit/utils";

/** One transcript paragraph: where it starts (seconds) and its text. */
export interface TranscriptLine {
  start_s: number;
  text: string;
}

/** Keeps well-formed lines, sorted by start. */
export function normalizeTranscript(lines: readonly TranscriptLine[] | undefined): TranscriptLine[] {
  return [...(lines ?? [])]
    .filter((l) => l && Number.isFinite(l.start_s) && l.start_s >= 0 && typeof l.text === "string" && l.text.trim() !== "")
    .sort((a, b) => a.start_s - b.start_s);
}

/** The index of the paragraph playing at `time` (the last one that started), or -1 before the first. */
export function transcriptIndexAt(lines: readonly TranscriptLine[], time: number): number {
  let found = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.start_s <= time) found = i;
    else break;
  }
  return found;
}

/** Lines whose text contains the query, case-insensitive. An empty query keeps all. */
export function filterTranscript(lines: readonly TranscriptLine[], query: string): TranscriptLine[] {
  const q = query.trim().toLowerCase();
  return q === "" ? [...lines] : lines.filter((l) => l.text.toLowerCase().includes(q));
}

function reducedMotion(): boolean {
  try { return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

/** PARITY-01: the transcript reader. Large text, the paragraph playing now bright and the others dim, a tap on a
 * paragraph seeks there, and a search box narrows the list. The current paragraph scrolls to the middle while the
 * search box is empty (instantly under reduced motion). `getMedia` lets the panel follow the element itself, so the
 * caller does not have to feed it the time. */
export function TranscriptPanel({ lines, currentTime, getMedia, onSeek, label, searchLabel, emptyText, className }: {
  lines: readonly TranscriptLine[] | undefined;
  currentTime?: number;
  getMedia?: () => HTMLMediaElement | null | undefined;
  onSeek: (seconds: number) => void;
  label?: string;
  searchLabel?: string;
  emptyText?: string;
  className?: string;
}) {
  const all = useMemo(() => normalizeTranscript(lines), [lines]);
  const [query, setQuery] = useState("");
  const [followed, setFollowed] = useState(0);
  useEffect(() => {
    if (!getMedia) return;
    const el = getMedia();
    if (!el) return;
    const tick = () => setFollowed(el.currentTime);
    tick();
    el.addEventListener("timeupdate", tick);
    el.addEventListener("seeked", tick);
    return () => { el.removeEventListener("timeupdate", tick); el.removeEventListener("seeked", tick); };
  }, [getMedia]);
  const time = currentTime ?? followed;
  const current = transcriptIndexAt(all, time);
  const shown = useMemo(() => filterTranscript(all, query), [all, query]);
  const currentRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (query.trim() !== "") return;
    currentRef.current?.scrollIntoView?.({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
  }, [current, query]);
  return (
    <section aria-label={label ?? i18n._({ id: "ui.Transcript", message: "Transcript" })} data-slot="transcript" className={cn("flex min-h-0 min-w-0 flex-col gap-3", className)}>
      <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} aria-label={searchLabel ?? i18n._({ id: "ui.Search the transcript", message: "Search the transcript" })} placeholder={searchLabel ?? i18n._({ id: "ui.Search the transcript", message: "Search the transcript" })} />
      {all.length === 0 || shown.length === 0 ? (
        <p role="status" className="text-muted-foreground text-base">{emptyText ?? (all.length === 0 ? i18n._({ id: "ui.No transcript for this episode yet.", message: "No transcript for this episode yet." }) : i18n._({ id: "ui.Nothing in the transcript matches.", message: "Nothing in the transcript matches." }))}</p>
      ) : (
        <ol className="flex min-h-0 flex-col gap-1 overflow-y-auto" data-slot="transcript-lines">
          {shown.map((line) => {
            const index = all.indexOf(line);
            const on = index === current;
            return (
              <li key={`${line.start_s}-${index}`}>
                <button
                  type="button"
                  ref={on ? currentRef : undefined}
                  aria-current={on ? "true" : undefined}
                  data-current={on ? "true" : "false"}
                  onClick={() => onSeek(line.start_s)}
                  className={cn("min-h-[44px] w-full rounded-[var(--radius-card)] px-2 py-2 text-start text-2xl leading-snug font-semibold text-pretty motion-safe:transition-colors", on ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  {line.text}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
