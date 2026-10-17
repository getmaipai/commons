// Library boundary doubles for happy-dom, which cannot paginate iframes or draw
// PDF canvases. These read the actual fixtures; they do not claim engine rendering QA.
import { mock } from "bun:test";
import { readFileSync } from "node:fs";
import type { EpubBook, PdfDocument, PdfLoadingTask } from "@/kit/primitives/readerEngines";

const epubPath = `${import.meta.dir}/fixtures/reader/clockwork-garden.epub`;
const entry = (name: string) => {
  const result = Bun.spawnSync(["unzip", "-p", epubPath, name]);
  if (result.exitCode !== 0) throw new Error(`Cannot read EPUB fixture entry ${name}`);
  return new TextDecoder().decode(result.stdout);
};
const xml = new DOMParser().parseFromString(entry("OEBPS/nav.xhtml"), "application/xhtml+xml");
export const epubToc = Array.from(xml.querySelectorAll("nav a")).map((a, i) => ({ id: `c${i + 1}`, label: a.textContent!, href: a.getAttribute("href")! }));
export const cfis = epubToc.map((_, i) => `epubcfi(/6/${(i + 1) * 2}[c${i + 1}]!/4/2/1:0)`);
const pdfBytes = readFileSync(`${import.meta.dir}/fixtures/reader/moon-rivets.pdf`, "latin1");
export const pdfPages = [...pdfBytes.matchAll(/\/Type\s*\/Page\b/g)].length;
export const epubInstances: Array<ReturnType<typeof makeEpub>> = [];
export const pdfInstances: Array<ReturnType<typeof makePdf>> = [];

export function makeEpub() {
  let index = 0;
  let cfi = cfis[0]!;
  const handlers = new Map<string, (...args: never[]) => void>();
  const emit = (name: string, value: unknown) => handlers.get(name)?.(value as never);
  const relocated = () => emit("relocated", { start: { cfi, index }, atStart: index === 0, atEnd: index === epubToc.length - 1 });
  const rendition = {
    display: mock(async (target?: string) => {
      const found = target?.startsWith("epubcfi(") ? cfis.indexOf(target) : epubToc.findIndex((t) => t.href === target);
      index = found !== undefined && found >= 0 ? found : 0;
      cfi = target?.startsWith("epubcfi(") ? target : cfis[index]!;
      relocated();
    }),
    next: mock(async () => { index = Math.min(epubToc.length - 1, index + 1); cfi = cfis[index]!; relocated(); }),
    prev: mock(async () => { index = Math.max(0, index - 1); cfi = cfis[index]!; relocated(); }),
    resize: mock(() => {}),
    on: (name: string, handler: (...args: never[]) => void) => { handlers.set(name, handler); },
    themes: { default: mock((_: Record<string, Record<string, string>>) => {}), fontSize: mock((_: string) => {}) },
  };
  const book: EpubBook = {
    ready: Promise.resolve(), loaded: { navigation: Promise.resolve({ toc: epubToc }) },
    locations: { generate: mock(async (_: number) => {}), percentageFromCfi: (value) => Math.max(0, cfis.indexOf(value)) / (cfis.length - 1) },
    renderTo: mock((_: HTMLElement, _options: Record<string, unknown>) => rendition), destroy: mock(() => {}),
  };
  const instance = { book, rendition, emit };
  return instance;
}

export function makePdf() {
  const getPage = mock(async (_: number) => ({
    getViewport: ({ scale }: { scale: number }) => ({ width: 612 * scale, height: 792 * scale }),
    render: mock(() => ({ promise: Promise.resolve(), cancel: mock(() => {}) })), cleanup: mock(() => {}),
  }));
  const doc: PdfDocument = {
    numPages: pdfPages, getPage,
    // The supplied PDF has no outline: synthesized destinations exercise both documented forms.
    getOutline: mock(async () => [{ title: "Moon Rivets", dest: "chapter-two", items: [{ title: "Page one", dest: [0, { name: "Fit" }], items: [] }] }]),
    getDestination: mock(async (_: string) => [{ num: 7, gen: 0 }, { name: "Fit" }]),
    getPageIndex: mock(async (_: unknown) => 1),
  };
  const task: PdfLoadingTask = { promise: Promise.resolve(doc), destroy: mock(async () => {}) };
  const instance = { doc, task, getPage };
  return instance;
}

export const epubFactory = mock((_src: string, _options: { openAs: string }) => {
  const instance = makeEpub();
  epubInstances.push(instance);
  return instance.book;
});
export const pdfFactory = mock((_options: { url: string; isEvalSupported: boolean }) => {
  const instance = makePdf();
  pdfInstances.push(instance);
  return instance.task;
});
export function installReaderFixtureLibraries() {
  mock.module("epubjs", () => ({ default: epubFactory }));
  mock.module("pdfjs-dist", () => ({ GlobalWorkerOptions: { workerSrc: "" }, getDocument: pdfFactory }));
  mock.module("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({ default: "/assets/pdf.worker.min.mjs" }));
}
