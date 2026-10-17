import { pdfPercent, readerPercent, type ReaderFormat, type ReaderLocator } from "@/kit/primitives/readerLogic";

export interface ReaderAppearance { background: string; foreground: string; fontPercent: number; pdfFilter: string }
export interface ReaderTocEntry { id: string; label: string; target: string; depth: number }
export interface ReaderPosition { locator: ReaderLocator; percent: number; page?: number; pages?: number; atStart: boolean; atEnd: boolean }
export interface ReaderEvents {
  position(position: ReaderPosition): void;
  toc(entries: ReaderTocEntry[]): void;
  tap(): void;
  key(event: KeyboardEvent): void;
  error(error: unknown): void;
}
export interface ReaderEngine {
  next(): Promise<void>;
  previous(): Promise<void>;
  goTo(target: ReaderLocator | string): Promise<void>;
  appearance(value: ReaderAppearance): void;
  resize(): void;
  destroy(): void;
}
export interface ReaderOpenOptions { src: string; format: ReaderFormat; locator?: ReaderLocator; appearance: ReaderAppearance; signal: AbortSignal }

interface EpubNav { id: string; label: string; href: string; subitems?: EpubNav[] }
interface EpubLocation {
  start: { cfi: string; index: number; displayed?: { page: number; total: number } };
  atStart: boolean;
  atEnd: boolean;
}
interface EpubRendition {
  display(target?: string): Promise<unknown>;
  next(): Promise<unknown>;
  prev(): Promise<unknown>;
  resize(width?: number, height?: number): void;
  on(name: string, callback: (...args: never[]) => void): void;
  themes: { default(rules: Record<string, Record<string, string>>): void; fontSize(value: string): void };
}
export interface EpubBook {
  ready: Promise<unknown>;
  loaded: { navigation: Promise<{ toc: EpubNav[] }> };
  locations: { generate(chars: number): Promise<unknown>; percentageFromCfi(cfi: string): number };
  renderTo(element: HTMLElement, options: Record<string, unknown>): EpubRendition;
  destroy(): void;
}
type PdfDestination = string | unknown[];
interface PdfOutline { title: string; dest: PdfDestination | null; items: PdfOutline[] }
interface PdfPage {
  getViewport(options: { scale: number }): { width: number; height: number };
  render(options: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }): { promise: Promise<unknown>; cancel(): void };
  cleanup(): void;
}
export interface PdfDocument {
  numPages: number;
  getPage(page: number): Promise<PdfPage>;
  getOutline(): Promise<PdfOutline[] | null>;
  getDestination(name: string): Promise<unknown[] | null>;
  getPageIndex(ref: unknown): Promise<number>;
}
export interface PdfLoadingTask { promise: Promise<PdfDocument>; destroy(): Promise<void> }

function alive(signal: AbortSignal) { signal.throwIfAborted(); }

export async function openEpub(
  container: HTMLElement, options: ReaderOpenOptions, events: ReaderEvents,
  load = () => import("epubjs"),
): Promise<ReaderEngine> {
  const { default: ePub } = await load();
  alive(options.signal);
  const book = ePub(options.src, { openAs: "epub" });
  let destroyed = false;
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    options.signal.removeEventListener("abort", destroy);
    book.destroy();
  };
  options.signal.addEventListener("abort", destroy, { once: true });
  try {
    await book.ready;
    alive(options.signal);
    const rendition = book.renderTo(container, { width: "100%", height: "100%", flow: "paginated", spread: "none", allowScriptedContent: false });
    let lastLocator = options.locator;
    const appearance = (value: ReaderAppearance) => {
      rendition.themes.default({ body: { color: `${value.foreground} !important`, background: `${value.background} !important` }, a: { color: "inherit !important" } });
      rendition.themes.fontSize(`${value.fontPercent}%`);
    };
    appearance(options.appearance);
    rendition.on("relocated", (location: EpubLocation) => {
      if (destroyed) return;
      const locator: ReaderLocator = {
        kind: "cfi", cfi: location.start.cfi, spine_index: location.start.index,
        ...(lastLocator?.kind === "cfi" && lastLocator.cfi === location.start.cfi && lastLocator.block_index !== undefined ? { block_index: lastLocator.block_index } : {}),
      };
      lastLocator = locator;
      events.position({ locator, percent: location.atEnd ? 100 : readerPercent(book.locations.percentageFromCfi(locator.cfi)), atStart: location.atStart, atEnd: location.atEnd });
    });
    rendition.on("click", (event: MouseEvent) => {
      if (!(event.target as HTMLElement | null)?.closest?.("a, button, input, textarea, select")) events.tap();
    });
    rendition.on("keydown", events.key);
    // Location generation is independent of font size, so a CFI's percentage stays stable after reflow.
    await book.locations.generate(1000);
    alive(options.signal);
    const navigation = await book.loaded.navigation;
    alive(options.signal);
    const entries: ReaderTocEntry[] = [];
    const walk = (items: EpubNav[], depth: number) => items.forEach((item) => {
      entries.push({ id: `${entries.length}`, label: item.label.trim(), target: item.href, depth });
      walk(item.subitems ?? [], depth + 1);
    });
    walk(navigation.toc, 0);
    events.toc(entries);
    await rendition.display(options.locator?.kind === "cfi" ? options.locator.cfi : undefined);
    alive(options.signal);
    return {
      next: async () => { await rendition.next(); }, previous: async () => { await rendition.prev(); },
      goTo: async (target) => {
        if (typeof target !== "string" && target.kind !== "cfi") return;
        lastLocator = typeof target === "string" ? undefined : target;
        await rendition.display(typeof target === "string" ? target : target.cfi);
      },
      appearance, resize: () => rendition.resize(container.clientWidth, container.clientHeight), destroy,
    };
  } catch (error) { destroy(); throw error; }
}

export async function openPdf(
  container: HTMLElement, options: ReaderOpenOptions, events: ReaderEvents,
  load: () => Promise<{ getDocument(options: { url: string; isEvalSupported: boolean }): PdfLoadingTask }> = async () => {
    const [pdf, worker] = await Promise.all([import("pdfjs-dist"), import("pdfjs-dist/build/pdf.worker.min.mjs?url")]);
    pdf.GlobalWorkerOptions.workerSrc = worker.default;
    return pdf;
  },
): Promise<ReaderEngine> {
  const pdf = await load();
  alive(options.signal);
  const loading = pdf.getDocument({ url: options.src, isEvalSupported: false });
  let destroyed = false;
  let generation = 0;
  let rendering: ReturnType<PdfPage["render"]> | undefined;
  let drawnPage: PdfPage | undefined;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("role", "img");
  canvas.style.maxWidth = "100%";
  canvas.style.filter = options.appearance.pdfFilter;
  container.append(canvas);
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    generation++;
    rendering?.cancel();
    options.signal.removeEventListener("abort", destroy);
    canvas.remove();
    void loading.destroy().catch(() => {});
  };
  options.signal.addEventListener("abort", destroy, { once: true });
  try {
    const doc = await loading.promise;
    alive(options.signal);
    let current = options.locator?.kind === "page" ? Math.min(doc.numPages, options.locator.page) : 1;
    const draw = async (page: number) => {
      if (destroyed) return;
      const token = ++generation;
      current = Math.min(doc.numPages, Math.max(1, Math.round(page)));
      const requested = current;
      const previousRender = rendering;
      rendering = undefined;
      previousRender?.cancel();
      await previousRender?.promise.catch(() => {});
      const pageObject = await doc.getPage(requested);
      if (destroyed || token !== generation) { pageObject.cleanup(); return; }
      drawnPage?.cleanup();
      drawnPage = pageObject;
      const base = pageObject.getViewport({ scale: 1 });
      const width = container.clientWidth || base.width;
      const height = container.clientHeight || base.height;
      const scale = Math.min(width / base.width, height / base.height);
      const ratio = window.devicePixelRatio || 1;
      const viewport = pageObject.getViewport({ scale: scale * ratio });
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.style.width = `${viewport.width / ratio}px`;
      canvas.style.height = `${viewport.height / ratio}px`;
      canvas.setAttribute("aria-label", `Page ${requested} of ${doc.numPages}`);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is not available.");
      const task = pageObject.render({ canvasContext: context, viewport });
      rendering = task;
      try { await task.promise; } catch (error) { if (token === generation && !destroyed) throw error; return; }
      if (token !== generation || destroyed) return;
      events.position({ locator: { kind: "page", page: requested }, percent: pdfPercent(requested, doc.numPages), page: requested, pages: doc.numPages, atStart: requested === 1, atEnd: requested === doc.numPages });
    };
    const destinations = new Map<string, PdfDestination>();
    const entries: ReaderTocEntry[] = [];
    const outline = await doc.getOutline();
    alive(options.signal);
    const walk = (items: PdfOutline[], depth: number) => items.forEach((item) => {
      if (item.dest) {
        const id = `${entries.length}`;
        entries.push({ id, target: id, label: item.title, depth });
        destinations.set(id, item.dest);
      }
      walk(item.items ?? [], depth + 1);
    });
    walk(outline ?? [], 0);
    events.toc(entries);
    await draw(current);
    alive(options.signal);
    return {
      next: () => draw(current + 1), previous: () => draw(current - 1),
      goTo: async (target) => {
        if (typeof target !== "string") { if (target.kind === "page") await draw(target.page); return; }
        let dest = destinations.get(target);
        if (typeof dest === "string") dest = await doc.getDestination(dest) ?? undefined;
        if (!Array.isArray(dest)) return;
        const ref = dest[0];
        const index = typeof ref === "number" ? ref : await doc.getPageIndex(ref);
        if (!destroyed) await draw(index + 1);
      },
      appearance: (value) => { canvas.style.filter = value.pdfFilter; },
      resize: () => { void draw(current).catch(events.error); }, destroy,
    };
  } catch (error) { destroy(); throw error; }
}

export function openReader(container: HTMLElement, options: ReaderOpenOptions, events: ReaderEvents) {
  return options.format === "epub" ? openEpub(container, options, events) : openPdf(container, options, events);
}
