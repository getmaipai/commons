import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Button } from "@/kit/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/kit/ui/dropdown-menu";
import { getIcon } from "@/kit/icons";
import { openReader, type ReaderAppearance, type ReaderEngine, type ReaderPosition, type ReaderTocEntry } from "@/kit/primitives/readerEngines";
import { READER_DEBOUNCE_MS, READER_FONT_SIZES, readerLocator, readerShortcut, sameOriginBookUrl, type ReaderFormat, type ReaderLocator, type ReaderTheme } from "@/kit/primitives/readerLogic";

export type { ReaderFormat, ReaderLocator, ReaderTheme } from "@/kit/primitives/readerLogic";
export { READER_FONT_SIZES } from "@/kit/primitives/readerLogic";

export interface ReaderProps {
  src: string;
  format: ReaderFormat;
  /** Resume position, also accepts later changes for host-driven navigation. */
  locator?: ReaderLocator;
  /** Percent is 0 to 100. Reports settle for 250 ms and flush on close, hide and unmount. */
  onLocatorChange?: (locator: ReaderLocator, percent: number) => void;
  theme?: ReaderTheme;
  /** EPUB only: index 0 to 6 into READER_FONT_SIZES, default 1 (100%). */
  fontSize?: number;
  onClose?: () => void;
  title?: string;
}

function readAppearance(root: HTMLElement, step: number): ReaderAppearance {
  const style = getComputedStyle(root);
  return {
    background: style.getPropertyValue("--reader-background").trim(),
    foreground: style.getPropertyValue("--reader-foreground").trim(),
    pdfFilter: style.getPropertyValue("--reader-pdf-filter").trim(),
    fontPercent: READER_FONT_SIZES[Math.min(6, Math.max(0, Math.round(Number.isFinite(step) ? step : 1)))]!,
  };
}

export function Reader({ src, format, locator, onLocatorChange, theme = "paper", fontSize = 1, onClose, title = "Reader" }: ReaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ReaderEngine | null>(null);
  const currentRef = useRef({ src, format, locator, onLocatorChange, theme, fontSize });
  useLayoutEffect(() => { currentRef.current = { src, format, locator, onLocatorChange, theme, fontSize }; });
  const flushRef = useRef<() => void>(() => {});
  const lastLocatorRef = useRef<string | undefined>(undefined);
  const [position, setPosition] = useState<ReaderPosition | null>(null);
  const [toc, setToc] = useState<ReaderTocEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [barVisible, setBarVisible] = useState(true);
  const key = (event: KeyboardEvent | ReactKeyboardEvent) => {
    const direction = readerShortcut(event);
    if (direction === null || !engineRef.current) return;
    event.preventDefault();
    void (direction === 1 ? engineRef.current.next() : engineRef.current.previous()).catch(() => setError(true));
  };

  useEffect(() => {
    const root = rootRef.current!;
    const container = viewportRef.current!;
    const controller = new AbortController();
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending: { position: ReaderPosition; report: ReaderProps["onLocatorChange"] } | undefined;
    const flush = () => {
      clearTimeout(timer);
      const report = pending;
      pending = undefined;
      report?.report?.(report.position.locator, report.position.percent);
    };
    flushRef.current = flush;
    engineRef.current = null;
    lastLocatorRef.current = undefined;
    setPosition(null);
    setToc([]);
    setReady(false);
    setError(false);
    setBarVisible(true);
    const tap = () => setBarVisible((visible) => !visible);
    container.addEventListener("click", tap);
    const hide = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", hide);
    const url = sameOriginBookUrl(src, document.baseURI);
    if (!url) setError(true);
    else void openReader(container, {
      src: url, format, signal: controller.signal,
      locator: readerLocator(currentRef.current.locator, format),
      appearance: readAppearance(root, currentRef.current.fontSize),
    }, {
      position: (value) => {
        if (disposed) return;
        const serialized = JSON.stringify(value.locator);
        setPosition(value);
        if (lastLocatorRef.current === serialized) return;
        lastLocatorRef.current = serialized;
        pending = { position: value, report: currentRef.current.onLocatorChange };
        clearTimeout(timer);
        timer = setTimeout(flush, READER_DEBOUNCE_MS);
      },
      toc: (entries) => { if (!disposed) setToc(entries); }, tap,
      key: (event) => {
        const direction = readerShortcut(event);
        if (direction !== null && engineRef.current) {
          event.preventDefault();
          void (direction === 1 ? engineRef.current.next() : engineRef.current.previous()).catch(() => { if (!disposed) setError(true); });
        }
      },
      error: () => { if (!disposed) setError(true); },
    }).then((engine) => {
      if (disposed) { engine.destroy(); return; }
      engineRef.current = engine;
      engine.appearance(readAppearance(root, currentRef.current.fontSize));
      const target = readerLocator(currentRef.current.locator, format);
      if (target && JSON.stringify(target) !== lastLocatorRef.current) void engine.goTo(target).catch(() => setError(true));
      setReady(true);
    }).catch(() => { if (!disposed) setError(true); });
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => engineRef.current?.resize());
    resize?.observe(container);
    return () => {
      disposed = true;
      flush();
      controller.abort();
      engineRef.current?.destroy();
      engineRef.current = null;
      resize?.disconnect();
      container.removeEventListener("click", tap);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [src, format]);

  useEffect(() => { if (rootRef.current) engineRef.current?.appearance(readAppearance(rootRef.current, fontSize)); }, [theme, fontSize]);
  const locatorKey = JSON.stringify(readerLocator(locator, format));
  useEffect(() => {
    const target = readerLocator(currentRef.current.locator, format);
    if (target && JSON.stringify(target) !== lastLocatorRef.current) void engineRef.current?.goTo(target).catch(() => setError(true));
  }, [locatorKey, format]);

  const move = (direction: -1 | 1) => {
    if (engineRef.current) void (direction === 1 ? engineRef.current.next() : engineRef.current.previous()).catch(() => setError(true));
  };
  const Close = getIcon("x");
  const Previous = getIcon("chevron-left");
  const Next = getIcon("chevron-right");
  const Contents = getIcon("layout-list");
  return (
    // A focusable region gives keyboard readers a page-turn target outside the EPUB iframe.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions
    <div ref={rootRef} data-slot="reader" data-reader-theme={theme} role="region" aria-label={title} tabIndex={0} onKeyDown={key}>
      <div data-slot="reader-topbar" hidden={!barVisible}>
        {onClose ? <Button variant="ghost" size="icon" aria-label="Close reader" onClick={() => { flushRef.current(); onClose(); }}><Close /></Button> : null}
        <span className="min-w-0 flex-1 truncate text-base font-semibold">{title}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Table of contents" disabled={!ready || toc.length === 0}><Contents /></Button></DropdownMenuTrigger>
          <DropdownMenuContent container={rootRef.current} data-reader-toc>
            {toc.map((entry) => <DropdownMenuItem key={entry.id} className="min-h-[48px]" style={{ paddingInlineStart: `${12 + entry.depth * 16}px` }} onSelect={() => { void engineRef.current?.goTo(entry.target).catch(() => setError(true)); }}>{entry.label}</DropdownMenuItem>)}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div ref={viewportRef} data-slot="reader-pages" aria-busy={!ready && !error} />
      {error ? <p role="alert" data-slot="reader-notice">Could not open this book. Close it and try again.</p> : !ready ? <p role="status" data-slot="reader-notice">Opening book...</p> : null}
      <div data-slot="reader-footer">
        <Button variant="ghost" size="icon" aria-label="Previous page" disabled={!ready || position?.atStart} onClick={() => move(-1)}><Previous /></Button>
        <span role="status" aria-live="polite" className="flex-1 text-center text-base tabular-nums">{position ? `${position.page ? `Page ${position.page} of ${position.pages} · ` : ""}${Math.round(position.percent)}%` : ""}</span>
        <Button variant="ghost" aria-label={barVisible ? "Hide reader toolbar" : "Show reader toolbar"} aria-expanded={barVisible} onClick={() => setBarVisible((visible) => !visible)}>Menu</Button>
        <Button variant="ghost" size="icon" aria-label="Next page" disabled={!ready || position?.atEnd} onClick={() => move(1)}><Next /></Button>
      </div>
    </div>
  );
}
