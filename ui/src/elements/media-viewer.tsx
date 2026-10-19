"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  BoxIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FileTextIcon,
  FilmIcon,
  ImageIcon,
  InfoIcon,
  MusicIcon,
  RotateCcwIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import { cn } from "@/kit/utils";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { Skeleton } from "../ui/skeleton";
import { Player } from "../primitives/Player";
import { SafeImage } from "../primitives/SafeImage";
import type { FileKind } from "../primitives/FileTile";
import { SURFACE_MIN_WIDTH_PX } from "../responsive";
import { safeHref } from "./href";
import {
  clampPan,
  DEFAULT_MAX_SCALE,
  distance,
  doubleTapTarget,
  DOUBLE_TAP_MS,
  IDENTITY,
  KEY_PAN_PX,
  midpoint,
  pinchScale,
  swipeDirection,
  TAP_SLOP_PX,
  wheelFactor,
  zoomBy,
  zoomTo,
  ZOOM_STEP,
  type Point,
  type ViewTransform,
} from "./media-viewer-logic";

/**
 * LIBRARY-REVAMP-06 slice B. A full-screen viewer for a list of files: a zoomable picture stage, the kit `Player` for video
 * and audio, and a plain stage with the kind icon for anything else. It knows no Home type and fetches, routes and stores
 * nothing: the host passes the items, which one is current, and what to do when that changes or when the viewer closes.
 *
 * Close and the URL: the kit does no routing. `onOpenChange(false)` and then `onClose()` run whenever the person closes the
 * viewer (Escape, the close button, a click outside). They do not run when the host closes it by setting `open` to false, so
 * a host that restores the URL in `onClose` is never called for a close it started itself.
 */
export type MediaViewerKind = FileKind;

export interface MediaViewerItem {
  /** The host's own id for the file. Stable while the viewer is open. */
  id: string;
  kind: MediaViewerKind;
  /** Where the bytes are (a hub file route). A picture is drawn from this; a video or song plays from it. */
  url: string;
  /** The video poster, or a song's cover. */
  posterUrl?: string | null | undefined;
  /** The file's name. It is the viewer's accessible name while this item shows. */
  name: string;
  /** MIME type, when the address does not say it. */
  mediaType?: string | undefined;
}

export interface MediaViewerLabels {
  close: string;
  previous: string;
  next: string;
  zoomIn: string;
  zoomOut: string;
  resetZoom: string;
  /** The button that shows or hides the details, and the name of the details panel. */
  details: string;
  /** "3 of 24", drawn in the top bar. */
  counter: (position: number, total: number) => string;
  /** Said politely when the item changes. */
  announce: (name: string, position: number, total: number) => string;
  /** The dialog's description for screen readers. */
  help: string;
  loading: string;
  /** What went wrong and what to do about it. */
  loadFailed: (name: string) => string;
  retry: string;
  /** Under a file that cannot be previewed. */
  unsupported: string;
  /** The default affordance for a file that cannot be previewed. */
  open: string;
  kind: Record<MediaViewerKind, string>;
}

export const DEFAULT_MEDIA_VIEWER_LABELS: MediaViewerLabels = {
  close: "Close",
  previous: "Previous",
  next: "Next",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  resetZoom: "Fit to screen",
  details: "Details",
  counter: (position, total) => `${position} of ${total}`,
  announce: (name, position, total) => `${name}, ${position} of ${total}`,
  help: "Use the left and right arrow keys to move between files. Plus and minus zoom a picture. Escape closes.",
  loading: "Loading",
  loadFailed: (name) => `${name} could not be loaded. Check that Home is running, then try again.`,
  retry: "Try again",
  unsupported: "This file cannot be previewed here.",
  open: "Open",
  kind: { image: "picture", video: "video", audio: "audio", document: "document", other: "file" },
};

export interface MediaViewerProps {
  open: boolean;
  /** The viewer asked to open or close (Escape, the close button, a click outside). */
  onOpenChange: (open: boolean) => void;
  /** The files, in the order previous and next move through them. */
  items: readonly MediaViewerItem[];
  /** The id of the file on screen. Controlled. An id that is not in `items` draws nothing: close the viewer or pick another. */
  currentId: string | null;
  /** Previous, next, a swipe or an arrow key moved to this id. */
  onCurrentIdChange: (id: string) => void;
  /** A stable callback for the person closing the viewer by any means, called after `onOpenChange(false)`. A host restores the URL here. */
  onClose?: (() => void) | undefined;
  /** What the details panel shows for this file. A side panel from 960 px wide, a bottom sheet below. Given, the top bar has a Details button. */
  details?: ReactNode | ((item: MediaViewerItem, index: number) => ReactNode);
  /** Whether the details are showing. Controlled. Unset: open on a wide screen and closed on a phone, then the person's choice. */
  detailsOpen?: boolean | undefined;
  onDetailsOpenChange?: ((open: boolean) => void) | undefined;
  /** Actions for the current file (Share, Download, Delete, Edit), drawn in the top bar. Buttons here are held to a 48 px target. */
  toolbar?: ReactNode | ((item: MediaViewerItem, index: number) => ReactNode);
  /** Under a file that cannot be previewed: the Open or Download affordance. Unset: an Open link to the file's address. */
  unsupportedActions?: ((item: MediaViewerItem) => ReactNode) | undefined;
  /** The element focus returns to on close, when the one that opened the viewer is gone (a grid that redrew). Unset: the opener. */
  returnFocusTo?: (() => HTMLElement | null | undefined) | undefined;
  /** The most a picture zooms, as a multiple of its fitted size. Default 4. */
  maxZoom?: number | undefined;
  labels?: Partial<MediaViewerLabels> | undefined;
}

const DESKTOP_QUERY = `(min-width: ${SURFACE_MIN_WIDTH_PX.desktop}px)`;

function subscribeDesktop(onChange: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribeDesktop,
    () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

const KIND_ICON = { image: ImageIcon, video: FilmIcon, audio: MusicIcon, document: FileTextIcon, other: BoxIcon } as const;

const EDITABLE = "input, textarea, select, [contenteditable='true'], [role='combobox'], [role='listbox'], [role='menu'], [role='slider'], [role='textbox']";

const OVERLAY_BUTTON =
  "absolute top-1/2 z-10 size-12 -translate-y-1/2 rounded-full bg-[var(--art-overlay)] text-[var(--art-foreground)] hover:bg-[var(--art-overlay)] hover:text-[var(--art-foreground)] disabled:opacity-30 forced-colors:border forced-colors:border-[ButtonText]";

function resolve<T>(slot: T | ((item: MediaViewerItem, index: number) => T) | undefined, item: MediaViewerItem, index: number): T | undefined {
  return typeof slot === "function" ? (slot as (item: MediaViewerItem, index: number) => T)(item, index) : slot;
}

/** A full-screen viewer for pictures, video, audio and files that cannot be previewed, with previous and next, zoom, a
 * details slot and a toolbar slot for the host's actions. */
export function MediaViewer({
  open,
  onOpenChange,
  items,
  currentId,
  onCurrentIdChange,
  onClose,
  details,
  detailsOpen,
  onDetailsOpenChange,
  toolbar,
  unsupportedActions,
  returnFocusTo,
  maxZoom = DEFAULT_MAX_SCALE,
  labels,
}: MediaViewerProps) {
  const copy: MediaViewerLabels = { ...DEFAULT_MEDIA_VIEWER_LABELS, ...labels, kind: { ...DEFAULT_MEDIA_VIEWER_LABELS.kind, ...labels?.kind } };
  const ids = useId();
  const isDesktop = useIsDesktop();
  const index = items.findIndex((candidate) => candidate.id === currentId);
  const item = index >= 0 ? items[index] : undefined;
  const total = items.length;

  const [view, setView] = useState<ViewTransform>(IDENTITY);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const [detailsChoice, setDetailsChoice] = useState<boolean | null>(null);
  const [shownId, setShownId] = useState<string | null>(item?.id ?? null);

  // A new file starts fitted and loading. Adjusted while rendering so no frame shows the last file's zoom.
  if ((item?.id ?? null) !== shownId) {
    setShownId(item?.id ?? null);
    setView(IDENTITY);
    setStatus("loading");
    setAttempt(0);
  }

  const stageRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef({ start: { x: 0, y: 0 }, pinchDistance: 0, pinchStart: 1, multi: false, type: "mouse" });
  const lastTap = useRef<{ at: number; x: number; y: number } | null>(null);

  const attachImage = useCallback((node: HTMLImageElement | null) => {
    imageRef.current = node;
    // A cached picture can finish before React attaches its handler.
    if (node?.complete && node.naturalWidth > 0) setStatus((current) => (current === "loading" ? "ready" : current));
  }, []);

  const kind = item?.kind;
  const zoomable = kind === "image" && status === "ready";
  const showDetails = details !== undefined && (detailsOpen ?? detailsChoice ?? isDesktop);

  // Say where we are when the person moves, never on first draw (the dialog's name says that).
  const announcedId = useRef<string | null>(null);
  useEffect(() => {
    if (!open || !item) {
      announcedId.current = null;
      setAnnouncement("");
      return;
    }
    if (announcedId.current !== null && announcedId.current !== item.id) setAnnouncement(copy.announce(item.name, index + 1, total));
    announcedId.current = item.id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id]);

  const sizes = useCallback(() => {
    const stage = stageRef.current;
    const image = imageRef.current;
    return {
      stage: { width: stage?.clientWidth ?? 0, height: stage?.clientHeight ?? 0 },
      content: { width: image?.offsetWidth ?? 0, height: image?.offsetHeight ?? 0 },
    };
  }, []);

  const place = useCallback(
    (next: ViewTransform) => {
      const { stage, content } = sizes();
      setView(clampPan(next, stage, content));
    },
    [sizes],
  );

  const centreOf = useCallback((clientX: number, clientY: number): Point => {
    const rect = stageRef.current?.getBoundingClientRect();
    return rect ? { x: clientX - (rect.left + rect.width / 2), y: clientY - (rect.top + rect.height / 2) } : { x: 0, y: 0 };
  }, []);

  const zoomStep = useCallback(
    (factor: number) => {
      if (!zoomable) return;
      place(zoomBy(view, factor, maxZoom));
    },
    [maxZoom, place, view, zoomable],
  );

  const go = useCallback(
    (to: number) => {
      const target = items[to];
      if (target && to !== index) onCurrentIdChange(target.id);
    },
    [index, items, onCurrentIdChange],
  );

  // The wheel zooms the picture. It needs a non-passive listener to stop the page behind from scrolling.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !zoomable) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const anchor = centreOf(event.clientX, event.clientY);
      setView((current) => {
        const { stage: stageSize, content } = sizes();
        return clampPan(zoomBy(current, wheelFactor(event.deltaY, event.deltaMode, event.ctrlKey), maxZoom, anchor), stageSize, content);
      });
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [centreOf, maxZoom, sizes, zoomable, item?.id, open]);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) onClose?.();
  }

  function setDetails(next: boolean) {
    setDetailsChoice(next);
    onDetailsOpenChange?.(next);
  }

  function toggleZoomAt(point: Point) {
    place(zoomTo(view, doubleTapTarget(view, maxZoom), maxZoom, point));
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (kind === "video" || kind === "audio") return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button, a")) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // A pointer that is already gone cannot be captured.
    }
    const g = gesture.current;
    g.type = event.pointerType || "mouse";
    if (pointers.current.size === 1) {
      g.start = { x: event.clientX, y: event.clientY };
      g.multi = false;
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()] as [Point, Point];
      g.multi = true;
      g.pinchDistance = distance(a, b);
      g.pinchStart = view.scale;
    }
    setDragging(true);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const before = pointers.current.get(event.pointerId);
    if (!before || !zoomable) {
      if (before) pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      return;
    }
    const now = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, now);
    const g = gesture.current;
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()] as [Point, Point];
      const mid = midpoint(a, b);
      const anchor = centreOf(mid.x, mid.y);
      const target = pinchScale(g.pinchStart, g.pinchDistance, distance(a, b), maxZoom);
      setView((current) => {
        const { stage, content } = sizes();
        return clampPan(zoomTo(current, target, maxZoom, anchor), stage, content);
      });
    } else if (view.scale > 1) {
      const dx = now.x - before.x;
      const dy = now.y - before.y;
      setView((current) => {
        const { stage, content } = sizes();
        return clampPan({ scale: current.scale, x: current.x + dx, y: current.y + dy }, stage, content);
      });
    }
  }

  function onPointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.delete(event.pointerId);
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      // Already released.
    }
    if (pointers.current.size > 0) return;
    setDragging(false);
    const g = gesture.current;
    if (event.type !== "pointerup" || g.multi || g.type === "mouse") return;
    const dx = event.clientX - g.start.x;
    const dy = event.clientY - g.start.y;
    if (Math.hypot(dx, dy) < TAP_SLOP_PX) {
      const previous = lastTap.current;
      const at = Date.now();
      if (previous && at - previous.at < DOUBLE_TAP_MS && Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < TAP_SLOP_PX * 3) {
        lastTap.current = null;
        if (zoomable) toggleZoomAt(centreOf(event.clientX, event.clientY));
      } else {
        lastTap.current = { at, x: event.clientX, y: event.clientY };
      }
      return;
    }
    lastTap.current = null;
    if (view.scale > 1) return;
    const direction = swipeDirection(dx, dy);
    if (direction === "next") go(index + 1);
    else if (direction === "previous") go(index - 1);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    // Keys typed in the details sheet (a portal) or in a field are theirs.
    if (!event.currentTarget.contains(event.target as Node)) return;
    const target = event.target as HTMLElement;
    if (target.closest(EDITABLE)) return;
    const inPlayer = Boolean(target.closest("[data-slot='player']"));
    const zoomed = view.scale > 1;
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowRight": {
        if (inPlayer) return;
        event.preventDefault();
        if (zoomed) place({ ...view, x: view.x + (event.key === "ArrowLeft" ? KEY_PAN_PX : -KEY_PAN_PX) });
        else go(index + (event.key === "ArrowLeft" ? -1 : 1));
        return;
      }
      case "ArrowUp":
      case "ArrowDown":
        if (!zoomed || inPlayer) return;
        event.preventDefault();
        place({ ...view, y: view.y + (event.key === "ArrowUp" ? KEY_PAN_PX : -KEY_PAN_PX) });
        return;
      case "+":
      case "=":
        if (!zoomable) return;
        event.preventDefault();
        zoomStep(ZOOM_STEP);
        return;
      case "-":
      case "_":
        if (!zoomable) return;
        event.preventDefault();
        zoomStep(1 / ZOOM_STEP);
        return;
      case "0":
        if (!zoomable) return;
        event.preventDefault();
        setView(IDENTITY);
        return;
      case "i":
      case "I":
        if (details === undefined) return;
        event.preventDefault();
        setDetails(!showDetails);
        return;
      default:
    }
  }

  if (!item) return null;

  const KindIcon = KIND_ICON[item.kind];
  const toolbarContent = resolve(toolbar, item, index);
  const detailsContent = details === undefined ? null : resolve(details, item, index);
  const canPrevious = index > 0;
  const canNext = index < total - 1;
  const detailsId = `${ids}-details`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        data-slot="media-viewer"
        data-kind={item.kind}
        showCloseButton={false}
        onKeyDown={onKeyDown}
        onOpenAutoFocus={(event) => {
          const active = document.activeElement;
          opener.current = active instanceof HTMLElement && active !== document.body ? active : null;
          // Focus lands on the stage so the arrow keys work at once.
          event.preventDefault();
          stageRef.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          const target = returnFocusTo?.() ?? (opener.current && document.contains(opener.current) ? opener.current : null);
          opener.current = null;
          if (!target) return;
          event.preventDefault();
          target.focus();
        }}
        onEscapeKeyDown={(event) => {
          // Escape leaves the zoom first, then the viewer.
          if (view.scale > 1) {
            event.preventDefault();
            setView(IDENTITY);
          }
        }}
        className={cn(
          "dark top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-background p-0 text-foreground shadow-none sm:max-w-none",
          "data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 motion-reduce:animate-none motion-reduce:duration-0",
        )}
      >
        <header data-slot="media-viewer-bar" className="flex shrink-0 flex-wrap items-center gap-2 p-2">
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon" data-slot="media-viewer-close" aria-label={copy.close}>
              <XIcon aria-hidden />
            </Button>
          </DialogClose>
          <DialogTitle data-slot="media-viewer-title" className="min-w-0 flex-1 truncate text-base font-medium">
            {item.name}
          </DialogTitle>
          {total > 1 ? (
            <span data-slot="media-viewer-counter" aria-hidden className="text-muted-foreground text-base tabular-nums">
              {copy.counter(index + 1, total)}
            </span>
          ) : null}
          {zoomable || toolbarContent ? (
            // One row with the title from 640 px wide; on a phone it drops to its own row that scrolls sideways, so the
            // title, counter and Details button keep the first row.
            <div data-slot="media-viewer-actions" className="order-last flex w-full items-center gap-2 overflow-x-auto sm:order-none sm:w-auto sm:overflow-visible">
              {zoomable ? (
                <div role="group" aria-label={`${copy.zoomIn} / ${copy.zoomOut}`} data-slot="media-viewer-zoom" className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" aria-label={copy.zoomOut} disabled={view.scale <= 1} onClick={() => zoomStep(1 / ZOOM_STEP)}>
                    <ZoomOutIcon aria-hidden />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label={copy.zoomIn} disabled={view.scale >= maxZoom} onClick={() => zoomStep(ZOOM_STEP)}>
                    <ZoomInIcon aria-hidden />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label={copy.resetZoom} disabled={view.scale <= 1} onClick={() => setView(IDENTITY)}>
                    <RotateCcwIcon aria-hidden />
                  </Button>
                </div>
              ) : null}
              {toolbarContent ? (
                <div data-slot="media-viewer-toolbar" className="flex items-center gap-2 sm:flex-wrap [&_a]:min-h-12 [&_button]:min-h-12 [&_button]:min-w-12">
                  {toolbarContent}
                </div>
              ) : null}
            </div>
          ) : null}
          {details !== undefined ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              data-slot="media-viewer-details-toggle"
              aria-label={copy.details}
              aria-expanded={showDetails}
              aria-controls={detailsId}
              onClick={() => setDetails(!showDetails)}
            >
              <InfoIcon aria-hidden />
            </Button>
          ) : null}
        </header>

        <DialogDescription className="sr-only">{copy.help}</DialogDescription>
        <p data-slot="media-viewer-announcement" role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>

        <div className="flex min-h-0 flex-1">
          <div
            ref={stageRef}
            tabIndex={-1}
            role="group"
            aria-label={item.name}
            data-slot="media-viewer-stage"
            data-zoom={view.scale > 1 ? "true" : undefined}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onDoubleClick={(event) => {
              if (zoomable && gesture.current.type === "mouse" && !(event.target as HTMLElement).closest("button, a")) toggleZoomAt(centreOf(event.clientX, event.clientY));
            }}
            className={cn(
              "relative flex min-w-0 flex-1 items-center justify-center overflow-hidden bg-[var(--art-surface)] outline-none",
              (item.kind === "image" || item.kind === "document" || item.kind === "other") && "touch-none select-none",
              zoomable && (view.scale > 1 ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"),
            )}
          >
            <button
              type="button"
              data-slot="media-viewer-previous"
              aria-label={copy.previous}
              disabled={!canPrevious}
              onClick={() => go(index - 1)}
              className={cn(OVERLAY_BUTTON, "left-3 inline-flex items-center justify-center")}
            >
              <ChevronLeftIcon aria-hidden className="size-6" />
            </button>
            <button
              type="button"
              data-slot="media-viewer-next"
              aria-label={copy.next}
              disabled={!canNext}
              onClick={() => go(index + 1)}
              className={cn(OVERLAY_BUTTON, "right-3 inline-flex items-center justify-center")}
            >
              <ChevronRightIcon aria-hidden className="size-6" />
            </button>

            {item.kind === "image" ? (
              <>
                {status === "error" ? (
                  <div role="alert" data-slot="media-viewer-error" className="text-[var(--art-foreground)] flex max-w-md flex-col items-center gap-4 p-6 text-center">
                    <SafeImage src={undefined} kind="picture" alt={item.name} className="size-24 rounded-lg" />
                    <p className="text-base">{copy.loadFailed(item.name)}</p>
                    <Button
                      type="button"
                      variant="inverse"
                      onClick={() => {
                        setStatus("loading");
                        setAttempt((n) => n + 1);
                      }}
                    >
                      {copy.retry}
                    </Button>
                  </div>
                ) : (
                  <>
                    {status === "loading" ? (
                      <>
                        <Skeleton data-slot="media-viewer-loading" className="absolute inset-12 motion-reduce:animate-none" />
                        <p role="status" className="sr-only">
                          {copy.loading}
                        </p>
                      </>
                    ) : null}
                    <SafeImage
                      key={`${item.id}:${attempt}`}
                      ref={attachImage}
                      src={item.url}
                      alt={item.name}
                      draggable={false}
                      decoding="async"
                      onLoad={() => setStatus("ready")}
                      onError={() => setStatus("error")}
                      data-slot="media-viewer-image"
                      style={{ transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})` }}
                      className={cn(
                        "max-h-full max-w-full object-contain will-change-transform",
                        !dragging && "transition-transform duration-150 motion-reduce:transition-none",
                        status === "loading" && "opacity-0",
                      )}
                    />
                  </>
                )}
              </>
            ) : item.kind === "video" || item.kind === "audio" ? (
              <div data-slot="media-viewer-player" className="flex size-full items-center justify-center overflow-auto p-4 sm:px-20">
                <div className="w-full max-w-5xl">
                  <Player
                    key={item.id}
                    src={item.url}
                    kind={item.kind}
                    layout={item.kind === "audio" ? "audio" : "video"}
                    title={item.name}
                    {...(item.posterUrl ? { poster: item.posterUrl } : {})}
                    {...(item.mediaType ? { type: item.mediaType } : {})}
                    mediaSession={false}
                  />
                </div>
              </div>
            ) : (
              <div data-slot="media-viewer-unsupported" className="flex max-w-md flex-col items-center gap-4 p-6 text-center">
                <KindIcon aria-hidden className="size-24 text-[var(--art-foreground)]" />
                <p className="text-base font-medium">{item.name}</p>
                <p className="text-muted-foreground text-base">
                  {copy.kind[item.kind]}
                  {item.mediaType ? `, ${item.mediaType}` : ""}
                </p>
                <p className="text-muted-foreground text-base">{copy.unsupported}</p>
                <div data-slot="media-viewer-unsupported-actions" className="flex flex-wrap items-center justify-center gap-2">
                  {unsupportedActions ? (
                    unsupportedActions(item)
                  ) : safeHref(item.url) ? (
                    <Button asChild variant="inverse">
                      <a href={safeHref(item.url)} target="_blank" rel="noopener noreferrer">
                        {copy.open}
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {showDetails && isDesktop ? (
            <aside id={detailsId} data-slot="media-viewer-details" aria-label={copy.details} className="bg-card text-card-foreground w-80 shrink-0 overflow-y-auto border-l p-4 xl:w-96">
              {detailsContent}
            </aside>
          ) : null}
        </div>

        {details !== undefined && !isDesktop ? (
          <Sheet open={showDetails} onOpenChange={setDetails}>
            <SheetContent id={detailsId} side="bottom" data-slot="media-viewer-details" aria-describedby={undefined} className="max-h-[70dvh] overflow-y-auto rounded-t-lg">
              <SheetHeader>
                <SheetTitle>{copy.details}</SheetTitle>
              </SheetHeader>
              <div className="p-4 pt-0">{detailsContent}</div>
            </SheetContent>
          </Sheet>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
