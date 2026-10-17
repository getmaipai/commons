import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { Reader } from "@/kit/primitives/Reader";
import { openEpub, openPdf, type ReaderEvents, type ReaderPosition } from "@/kit/primitives/readerEngines";
import { pdfPercent, readerLocator, readerPercent, sameOriginBookUrl } from "@/kit/primitives/readerLogic";
import { cfis, epubInstances, epubFactory, epubToc, installReaderFixtureLibraries, makeEpub, makePdf, pdfFactory, pdfInstances, pdfPages } from "../../tests/readerFixtureLibraries";

installReaderFixtureLibraries();
const nativeContext = HTMLCanvasElement.prototype.getContext;
beforeEach(() => {
  const base = document.createElement("base");
  base.href = "http://localhost/";
  document.head.append(base);
  HTMLCanvasElement.prototype.getContext = mock(() => ({})) as unknown as typeof nativeContext;
});
afterEach(() => { cleanup(); document.head.querySelector("base")?.remove(); HTMLCanvasElement.prototype.getContext = nativeContext; });

const appearance = { background: "var(--reader-paper-background)", foreground: "var(--reader-paper-foreground)", fontPercent: 100, pdfFilter: "none" };
const events = (position: (p: ReaderPosition) => void = () => {}): ReaderEvents => ({ position, toc: mock(() => {}), tap: mock(() => {}), key: mock(() => {}), error: mock(() => {}) });
const latestEpub = () => epubInstances.at(-1)!;
const latestPdf = () => pdfInstances.at(-1)!;

describe("Reader", () => {
  test("fixture locators round-trip as JSON with optional EPUB indices, and percent stays within 0 to 100", () => {
    expect(epubToc).toHaveLength(2);
    expect(pdfPages).toBe(2);
    for (const [format, locator] of [["epub", { kind: "cfi", cfi: cfis[1]!, spine_index: 1, block_index: 0 }], ["pdf", { kind: "page", page: pdfPages }]] as const) {
      expect(readerLocator(JSON.parse(JSON.stringify(locator)), format)).toEqual(locator);
    }
    expect(readerLocator({ kind: "page", page: 0 }, "pdf")).toBeUndefined();
    expect(readerLocator({ kind: "page", page: 1.5 }, "pdf")).toBeUndefined();
    expect(readerLocator({ kind: "page", page: 2 }, "epub")).toBeUndefined();
    expect(readerLocator({ kind: "cfi", cfi: "bad" }, "epub")).toBeUndefined();
    expect([pdfPercent(1, 2), pdfPercent(2, 2), pdfPercent(1, 1), pdfPercent(3, 5)]).toEqual([0, 100, 100, 50]);
    expect([readerPercent(0.42), readerPercent(-1), readerPercent(2), readerPercent(NaN)]).toEqual([42, 0, 100, 0]);
  });

  test("only same-origin http URLs are accepted", () => {
    const base = "https://reader.example/apps/books";
    expect(sameOriginBookUrl("/book.epub", base)).toBe("https://reader.example/book.epub");
    for (const src of ["https://outside.example/b", "//outside.example/b", "javascript:alert(1)", "data:x", "", "https://person:secret@reader.example/b"]) expect(sameOriginBookUrl(src, base)).toBeNull();
  });

  test("EPUB adapter restores CFI and optional block index, generates stable percent and navigates nested TOC targets", async () => {
    const reports: ReaderPosition[] = [];
    const instance = makeEpub();
    const callbacks = events((p) => reports.push(p));
    const engine = await openEpub(document.createElement("div"), { src: "/clockwork-garden.epub", format: "epub", locator: { kind: "cfi", cfi: cfis[1]!, spine_index: 1, block_index: 3 }, appearance, signal: new AbortController().signal }, callbacks, async () => ({ default: () => instance.book }));
    expect(reports.at(-1)).toMatchObject({ locator: { kind: "cfi", cfi: cfis[1], spine_index: 1, block_index: 3 }, percent: 100 });
    expect(instance.book.renderTo).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ flow: "paginated", allowScriptedContent: false }));
    expect(callbacks.toc).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ label: epubToc[1]!.label, target: "ch2.xhtml" })]));
    await engine.previous();
    expect(reports.at(-1)?.percent).toBe(0);
    await engine.goTo("ch2.xhtml");
    expect(reports.at(-1)?.locator).toMatchObject({ cfi: cfis[1] });
    engine.destroy();
    expect(instance.book.destroy).toHaveBeenCalledTimes(1);
  });

  test("PDF adapter restores and clamps pages, computes percentage and resolves named and explicit outline destinations", async () => {
    const instance = makePdf();
    const reports: ReaderPosition[] = [];
    const callbacks = events((p) => reports.push(p));
    const engine = await openPdf(document.createElement("div"), { src: "/moon-rivets.pdf", format: "pdf", locator: { kind: "page", page: 99 }, appearance, signal: new AbortController().signal }, callbacks, async () => ({ GlobalWorkerOptions: { workerSrc: "" }, getDocument: () => instance.task }));
    expect(reports.at(-1)).toMatchObject({ locator: { kind: "page", page: 2 }, percent: 100, pages: pdfPages });
    await engine.previous();
    expect(reports.at(-1)).toMatchObject({ locator: { kind: "page", page: 1 }, percent: 0 });
    await engine.goTo("0");
    expect(instance.doc.getDestination).toHaveBeenCalledWith("chapter-two");
    expect(instance.doc.getPageIndex).toHaveBeenCalledWith({ num: 7, gen: 0 });
    expect(reports.at(-1)?.locator).toEqual({ kind: "page", page: 2 });
    await engine.goTo("1");
    expect(reports.at(-1)?.locator).toEqual({ kind: "page", page: 1 });
    engine.destroy();
    expect(instance.task.destroy).toHaveBeenCalledTimes(1);
  });

  test("EPUB page turns debounce progress, flush on close, and iframe shortcuts/taps reach the reader", async () => {
    const report = mock(() => {});
    const close = mock(() => {});
    const view = render(<Reader src="/clockwork-garden.epub" format="epub" title="The Clockwork Garden" onLocatorChange={report} onClose={close} />);
    await waitFor(() => expect(view.getByRole("button", { name: "Next page" }).hasAttribute("disabled")).toBe(false));
    const instance = latestEpub();
    fireEvent.click(view.getByRole("button", { name: "Next page" }));
    await waitFor(() => expect(view.getByRole("status").textContent).toBe("100%"));
    expect(report).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole("button", { name: "Close reader" }));
    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith({ kind: "cfi", cfi: cfis[1], spine_index: 1 }, 100);
    expect(close).toHaveBeenCalled();
    const key = new KeyboardEvent("keydown", { key: "ArrowLeft", cancelable: true });
    act(() => instance.emit("keydown", key));
    await waitFor(() => expect(view.getByRole("status").textContent).toBe("0%"));
    expect(key.defaultPrevented).toBe(true);
    act(() => instance.emit("click", new MouseEvent("click")));
    expect(view.getByRole("button", { name: "Show reader toolbar" })).toBeTruthy();
    fireEvent.click(view.getByRole("button", { name: "Show reader toolbar" }));
    expect(view.getByRole("button", { name: "Close reader" })).toBeTruthy();
  });

  test("PDF keyboard, page indicator, live locator changes, blank outline, and source disposal", async () => {
    const report = mock(() => {});
    const view = render(<Reader src="/moon-rivets.pdf" format="pdf" locator={{ kind: "page", page: 1 }} onLocatorChange={report} />);
    await waitFor(() => expect(view.getByRole("status").textContent).toBe("Page 1 of 2 · 0%"));
    const first = latestPdf();
    fireEvent.keyDown(view.getByRole("region"), { key: "ArrowRight" });
    await waitFor(() => expect(view.getByRole("status").textContent).toBe("Page 2 of 2 · 100%"));
    await waitFor(() => expect(report).toHaveBeenCalledWith({ kind: "page", page: 2 }, 100));
    view.rerender(<Reader src="/moon-rivets.pdf" format="pdf" locator={{ kind: "page", page: 1 }} onLocatorChange={report} />);
    // A changed host locator is distinct from a repeated value. Go to 2 then 1.
    view.rerender(<Reader src="/moon-rivets.pdf" format="pdf" locator={{ kind: "page", page: 2 }} onLocatorChange={report} />);
    view.rerender(<Reader src="/moon-rivets.pdf" format="pdf" locator={{ kind: "page", page: 1 }} onLocatorChange={report} />);
    await waitFor(() => expect(view.getByRole("status").textContent).toBe("Page 1 of 2 · 0%"));
    fireEvent.keyDown(view.getByRole("button", { name: "Next page" }), { key: "ArrowRight" });
    expect(view.getByRole("status").textContent).toBe("Page 1 of 2 · 0%");
    fireEvent.click(view.container.querySelector("canvas")!);
    expect(view.getByRole("button", { name: "Show reader toolbar" })).toBeTruthy();
    view.rerender(<Reader src="/clockwork-garden.epub" format="epub" />);
    await waitFor(() => expect(latestEpub().book.renderTo).toHaveBeenCalled());
    expect(first.task.destroy).toHaveBeenCalledTimes(1);
  });

  test("TOC menu selection calls the EPUB rendition", async () => {
    const view = render(<Reader src="/clockwork-garden.epub" format="epub" />);
    await waitFor(() => expect(view.getByRole("button", { name: "Table of contents" }).hasAttribute("disabled")).toBe(false));
    fireEvent.pointerDown(view.getByRole("button", { name: "Table of contents" }), { button: 0, ctrlKey: false, pointerType: "mouse" });
    fireEvent.click(await view.findByRole("menuitem", { name: epubToc[1]!.label }));
    await waitFor(() => expect(latestEpub().rendition.display).toHaveBeenCalledWith("ch2.xhtml"));
    expect(view.getByRole("status").textContent).toBe("100%");
  });

  test("themes use tokens and EPUB font steps reflow without reopening the book", async () => {
    const nativeComputed = globalThis.getComputedStyle;
    globalThis.getComputedStyle = ((el: Element, pseudo?: string | null) => {
      if (el.getAttribute("data-slot") !== "reader") return nativeComputed(el, pseudo);
      const tone = el.getAttribute("data-reader-theme");
      return { getPropertyValue: (name: string) => `var(--reader-${tone}-${name === "--reader-background" ? "background" : name === "--reader-foreground" ? "foreground" : "pdf-filter"})` } as CSSStyleDeclaration;
    }) as typeof getComputedStyle;
    try {
      const view = render(<Reader src="/clockwork-garden.epub" format="epub" theme="paper" />);
      await waitFor(() => expect(view.getByRole("button", { name: "Next page" }).hasAttribute("disabled")).toBe(false));
      const instance = latestEpub();
      for (const tone of ["paper", "sepia", "night"] as const) {
        view.rerender(<Reader src="/clockwork-garden.epub" format="epub" theme={tone} fontSize={3} />);
        expect(view.getByRole("region").getAttribute("data-reader-theme")).toBe(tone);
        expect(instance.rendition.themes.default).toHaveBeenLastCalledWith(expect.objectContaining({ body: { color: `var(--reader-${tone}-foreground) !important`, background: `var(--reader-${tone}-background) !important` } }));
        expect(instance.rendition.themes.fontSize).toHaveBeenLastCalledWith("130%");
      }
      expect(latestEpub()).toBe(instance);
      const css = readFileSync(`${import.meta.dir}/../tokens.css`, "utf8");
      for (const tone of ["paper", "sepia", "night"]) expect(css).toContain(`--reader-background: var(--reader-${tone}-background)`);
      expect(css).toContain("height: 100dvh");
    } finally { globalThis.getComputedStyle = nativeComputed; }
  });

  test("unmount flushes pending progress and cross-origin sources never initialize an engine", async () => {
    const report = mock(() => {});
    const view = render(<Reader src="/moon-rivets.pdf" format="pdf" locator={{ kind: "page", page: 2 }} onLocatorChange={report} />);
    await waitFor(() => expect(view.getByRole("status").textContent).toContain("100%"));
    const before = [epubFactory.mock.calls.length, pdfFactory.mock.calls.length];
    view.unmount();
    expect(report).toHaveBeenCalledWith({ kind: "page", page: 2 }, 100);
    const blocked = render(<Reader src="https://outside.example/book.pdf" format="pdf" />);
    await blocked.findByRole("alert");
    expect([epubFactory.mock.calls.length, pdfFactory.mock.calls.length]).toEqual(before);
  });

  test("an aborted import never creates a book, and a failed EPUB open destroys its resources", async () => {
    const controller = new AbortController();
    controller.abort();
    const create = mock(() => makeEpub().book);
    await expect(openEpub(document.createElement("div"), { src: "/book.epub", format: "epub", appearance, signal: controller.signal }, events(), async () => ({ default: create }))).rejects.toBeTruthy();
    expect(create).not.toHaveBeenCalled();
    const instance = makeEpub();
    instance.book.ready = Promise.reject(new Error("Broken EPUB"));
    await expect(openEpub(document.createElement("div"), { src: "/book.epub", format: "epub", appearance, signal: new AbortController().signal }, events(), async () => ({ default: () => instance.book }))).rejects.toThrow("Broken EPUB");
    expect(instance.book.destroy).toHaveBeenCalledTimes(1);
  });

  test("PDF accepts a missing outline and updates its theme without reopening", async () => {
    const instance = makePdf();
    instance.doc.getOutline = async () => null;
    const container = document.createElement("div");
    const callbacks = events();
    const engine = await openPdf(container, { src: "/moon-rivets.pdf", format: "pdf", appearance, signal: new AbortController().signal }, callbacks, async () => ({ GlobalWorkerOptions: { workerSrc: "" }, getDocument: () => instance.task }));
    expect(callbacks.toc).toHaveBeenCalledWith([]);
    engine.appearance({ ...appearance, pdfFilter: "var(--reader-night-pdf-filter)" });
    expect(container.querySelector("canvas")?.style.filter).toBe("var(--reader-night-pdf-filter)");
    engine.destroy();
    expect(container.childElementCount).toBe(0);
  });

  test("source changes flush pending progress to the previous book's callback", async () => {
    const first = mock(() => {});
    const second = mock(() => {});
    const view = render(<Reader src="/moon-rivets.pdf" format="pdf" locator={{ kind: "page", page: 2 }} onLocatorChange={first} />);
    await waitFor(() => expect(view.getByRole("status").textContent).toContain("100%"));
    view.rerender(<Reader src="/clockwork-garden.epub" format="epub" onLocatorChange={second} />);
    expect(first).toHaveBeenCalledWith({ kind: "page", page: 2 }, 100);
    expect(second).not.toHaveBeenCalled();
    await waitFor(() => expect(view.getByRole("button", { name: "Next page" }).hasAttribute("disabled")).toBe(false));
    view.unmount();
    expect(second).toHaveBeenCalledWith({ kind: "cfi", cfi: cfis[0], spine_index: 0 }, 0);
  });
});
