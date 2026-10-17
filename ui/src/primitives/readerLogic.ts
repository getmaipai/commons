export type ReaderLocator =
  | { kind: "cfi"; cfi: string; spine_index?: number; block_index?: number }
  | { kind: "page"; page: number };
export type ReaderFormat = "epub" | "pdf";
export type ReaderTheme = "paper" | "sepia" | "night";
/** EPUB font sizes in percent. fontSize is an index into this list. */
export const READER_FONT_SIZES = [85, 100, 115, 130, 150, 175, 200] as const;
export const READER_DEBOUNCE_MS = 250;

export function readerLocator(value: unknown, format: ReaderFormat): ReaderLocator | undefined {
  if (!value || typeof value !== "object") return undefined;
  const v = value as Record<string, unknown>;
  if (format === "pdf") return v.kind === "page" && Number.isInteger(v.page) && Number(v.page) >= 1 ? { kind: "page", page: Number(v.page) } : undefined;
  if (v.kind !== "cfi" || typeof v.cfi !== "string" || !/^epubcfi\(.+\)$/.test(v.cfi)) return undefined;
  const locator: ReaderLocator = { kind: "cfi", cfi: v.cfi };
  for (const key of ["spine_index", "block_index"] as const) {
    if (Number.isInteger(v[key]) && Number(v[key]) >= 0) locator[key] = Number(v[key]);
  }
  return locator;
}

export function readerPercent(fraction: number): number {
  return Number.isFinite(fraction) ? Math.min(100, Math.max(0, fraction * 100)) : 0;
}

/** A one-page book is complete; otherwise page 1 starts at 0 and the final page is 100. */
export function pdfPercent(page: number, pages: number): number {
  return pages <= 1 ? 100 : readerPercent((page - 1) / (pages - 1));
}

export function sameOriginBookUrl(src: string, base: string): string | null {
  try {
    const url = new URL(src, base);
    const origin = new URL(base).origin;
    return src.trim() && /^https?:$/.test(url.protocol) && url.origin === origin && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function readerShortcut(event: { key: string; target: EventTarget | null; altKey: boolean; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }): -1 | 1 | null {
  // duck typing works for elements inside the EPUB's separate window too.
  const target = event.target as HTMLElement | null;
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || target?.closest?.("input, textarea, select, button, a, [contenteditable], [role=menu]")) return null;
  return event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : null;
}
