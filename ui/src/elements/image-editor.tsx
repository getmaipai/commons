"use client";

/**
 * ImageEditor: a ChatGPT-style picture editor. A stage shows the current
 * version over a transparency checkerboard; a floating toolbar switches between
 * Markup, Comment, Remove BG, Erase and Resize; every result is a preview the
 * person Applies (a NEW version) or Undoes. All I/O goes through props: no
 * fetch, no server. Built from kit parts (Button, ToggleGroup, Toggle, Slider,
 * Tooltip, Popover, Input, Textarea, Progress, Alert, Badge, Card, Label,
 * Separator) and lucide icons, coloured by tokens only. The one hand-drawn
 * piece, the canvas, lives in `image-editor-surface.tsx`.
 */

import {
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  AlertCircleIcon,
  CheckIcon,
  CircleIcon,
  DownloadIcon,
  EraserIcon,
  HighlighterIcon,
  HistoryIcon,
  InfoIcon,
  LockIcon,
  LockOpenIcon,
  MaximizeIcon,
  MessageSquareIcon,
  MinusIcon,
  MoveUpRightIcon,
  PenLineIcon,
  PlusIcon,
  Redo2Icon,
  ScalingIcon,
  Share2Icon,
  SquareIcon,
  Trash2Icon,
  TypeIcon,
  Undo2Icon,
  WandSparklesIcon,
  XIcon,
} from "lucide-react";
import { cn } from "cn";
import { Alert, AlertDescription } from "@/kit/ui/alert";
import { Badge } from "@/kit/ui/badge";
import { Button } from "@/kit/ui/button";
import { Card, CardContent } from "@/kit/ui/card";
import { Label } from "@/kit/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/kit/ui/popover";
import { Progress } from "@/kit/ui/progress";
import { Separator } from "@/kit/ui/separator";
import { Slider } from "@/kit/ui/slider";
import { Toggle } from "@/kit/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/kit/ui/toggle-group";
import { Input } from "@/elements/ui/input";
import { Textarea } from "@/elements/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/elements/ui/tooltip";
import { formatRelative } from "../relativeTime";
import {
  BRUSH_MAX,
  BRUSH_MIN,
  MARKUP_SIZE_MAX,
  MARKUP_SIZE_MIN,
  PALETTE,
  RESIZE_MAX,
  canRedoStroke,
  canUndoStroke,
  clampBrush,
  clampZoom,
  emptyStrokes,
  fitZoom,
  fromPixels,
  linkedSide,
  markupStrokePx,
  parseWhole,
  resizeLabel,
  stepBrush,
  stepVersion,
  stepZoom,
  strokesReducer,
  toPixels,
  validateResize,
  wheelZoom,
  type MarkupTool,
  type Point,
  type Region,
  type ResizeUnit,
  type Size,
} from "./image-editor-state";
import { ImageEditorSurface, renderMarkupPng, renderMaskPng, resolveColor } from "./image-editor-surface";

// ------------------------------------------------------------------- types

export type ImageEditorToolKey = "markup" | "comment" | "remove_background" | "erase" | "resize";

export interface ImageEditorToolState {
  enabled: boolean;
  /** Shown in the tooltip and a status line when disabled (plain words). */
  reason?: string;
}

export interface ImageEditorVersion {
  id: string;
  url: string;
  label: string;
  createdAt?: string;
  width?: number;
  height?: number;
}

export interface ImageEditorPending {
  token: string;
  previewUrl: string;
  width: number;
  height: number;
  transparent?: boolean;
}

export type ImageEditorOperation =
  | { operation: "remove_background" }
  | { operation: "erase"; mask: Blob }
  | { operation: "upscale"; scale: 2 | 4 }
  | { operation: "resize"; width: number; height: number };

export interface ImageEditorRunControl {
  signal: AbortSignal;
  onProgress: (progress: { percent: number | null; label: string }) => void;
}

export interface ImageEditorProps {
  /** `pane` fills its parent; `screen` is fixed inset-0 (phone) with the toolbar at the bottom. */
  variant?: "pane" | "screen";
  title: string;
  /** Oldest first, includes the current one. */
  versions: ImageEditorVersion[];
  currentVersionId: string;
  onSelectVersion: (id: string) => void;
  tools: Record<ImageEditorToolKey, ImageEditorToolState>;
  statusNote?: string | null;
  onRunOperation: (op: ImageEditorOperation, ctl: ImageEditorRunControl) => Promise<ImageEditorPending>;
  onApplyPending: (pending: ImageEditorPending, label: string) => Promise<ImageEditorVersion>;
  onSaveMarkup: (png: Blob) => Promise<ImageEditorVersion>;
  /** Sends the comment. The second argument carries the same cancel signal and progress callback a tool run gets.
   * A reply may also return `pending`, the picture the comment produced: the editor then shows it as a preview with
   * Apply and Discard, exactly as it does for Erase (additive; a reply with only `message` behaves as before). */
  onComment: (request: { prompt: string; region: Region | null }, ctl: ImageEditorRunControl) => Promise<{ message: string; pending?: ImageEditorPending }>;
  onShare?: (version: ImageEditorVersion) => void;
  downloadName?: string;
  onClose: () => void;
  errorMessage?: string | null;
}

// ----------------------------------------------------------------- helpers

const COMPACT_WIDTH = 640;
const DEFAULT_COLOR = "red";
const DEFAULT_MARKUP_SIZE = 4;
const DEFAULT_BRUSH = 40;

const TOOL_META: ReadonlyArray<{ key: ImageEditorToolKey; label: string; icon: ReactNode; text?: string }> = [
  { key: "markup", label: "Markup", icon: <PenLineIcon aria-hidden /> },
  { key: "comment", label: "Comment", icon: <MessageSquareIcon aria-hidden /> },
  { key: "remove_background", label: "Remove BG", icon: <WandSparklesIcon aria-hidden />, text: "Remove BG" },
  { key: "erase", label: "Erase", icon: <EraserIcon aria-hidden /> },
  { key: "resize", label: "Resize", icon: <ScalingIcon aria-hidden /> },
];

const MARKUP_TOOLS: ReadonlyArray<{ key: MarkupTool; label: string; icon: ReactNode }> = [
  { key: "pen", label: "Pen", icon: <PenLineIcon aria-hidden /> },
  { key: "highlighter", label: "Highlighter", icon: <HighlighterIcon aria-hidden /> },
  { key: "arrow", label: "Arrow", icon: <MoveUpRightIcon aria-hidden /> },
  { key: "rectangle", label: "Rectangle", icon: <SquareIcon aria-hidden /> },
  { key: "ellipse", label: "Ellipse", icon: <CircleIcon aria-hidden /> },
  { key: "text", label: "Text", icon: <TypeIcon aria-hidden /> },
];

const messageOf = (error: unknown) =>
  error instanceof Error && error.message ? error.message : "Something went wrong. Try again.";

const isEditable = (target: EventTarget | null) =>
  target instanceof Element && target.closest("input, textarea, select, [contenteditable='true']") !== null;

const pill = "bg-popover text-popover-foreground border-border flex items-center gap-1 rounded-full border p-1 shadow-lg";

/** Transparency checkerboard from kit tokens. */
const checkerboard = {
  backgroundColor: "var(--card)",
  backgroundImage:
    "conic-gradient(var(--border) 25%, transparent 0 50%, var(--border) 0 75%, transparent 0)",
  backgroundSize: "16px 16px",
} as const;

function ToolButton({ label, children, side = "top", ...rest }: ComponentProps<typeof Button> & { label: string; side?: "top" | "bottom" }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={label} {...rest}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}

function download(url: string, name: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
}

// -------------------------------------------------------------- sub-bars

function ResizeBar({
  base,
  locked,
  onResize,
  onUpscale,
}: {
  base: Size;
  locked: boolean;
  onResize: (width: number, height: number) => void;
  onUpscale: (scale: 2 | 4) => void;
}) {
  const ids = { w: useId(), h: useId() };
  const [unit, setUnit] = useState<ResizeUnit>("px");
  const [lock, setLock] = useState(true);
  const [wText, setWText] = useState(String(base.width));
  const [hText, setHText] = useState(String(base.height));
  const check = validateResize(wText, hText, unit, base);
  const unchanged = check.ok && check.width === base.width && check.height === base.height;

  const change = (side: "width" | "height", text: string) => {
    if (side === "width") setWText(text);
    else setHText(text);
    const n = parseWhole(text);
    if (lock && n !== null) {
      const other = String(linkedSide(side, n, base, unit));
      if (side === "width") setHText(other);
      else setWText(other);
    }
  };

  const changeUnit = (next: ResizeUnit) => {
    if (next === unit) return;
    const w = parseWhole(wText);
    const h = parseWhole(hText);
    const px = w !== null && h !== null ? toPixels(w, h, unit, base) : base;
    const shown = fromPixels(px, next, base);
    setUnit(next);
    setWText(String(shown.width));
    setHText(String(shown.height));
  };

  return (
    <div className="flex flex-wrap items-end justify-center gap-x-3 gap-y-2" data-slot="image-editor-resize">
      <div className="flex items-end gap-2">
        <div className="grid gap-1">
          <Label htmlFor={ids.w} className="text-xs">Width</Label>
          <Input
            id={ids.w}
            type="number"
            inputMode="numeric"
            min={1}
            max={unit === "px" ? RESIZE_MAX : undefined}
            step={1}
            value={wText}
            disabled={locked}
            aria-invalid={!check.ok}
            onChange={(event) => change("width", event.target.value)}
            className="w-24"
          />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              pressed={lock}
              onPressedChange={setLock}
              aria-label="Keep proportions"
              variant="outline"
              disabled={locked}
            >
              {lock ? <LockIcon aria-hidden /> : <LockOpenIcon aria-hidden />}
            </Toggle>
          </TooltipTrigger>
          <TooltipContent side="top">Keep proportions</TooltipContent>
        </Tooltip>
        <div className="grid gap-1">
          <Label htmlFor={ids.h} className="text-xs">Height</Label>
          <Input
            id={ids.h}
            type="number"
            inputMode="numeric"
            min={1}
            max={unit === "px" ? RESIZE_MAX : undefined}
            step={1}
            value={hText}
            disabled={locked}
            aria-invalid={!check.ok}
            onChange={(event) => change("height", event.target.value)}
            className="w-24"
          />
        </div>
      </div>
      <ToggleGroup
        type="single"
        variant="outline"
        aria-label="Resize unit"
        value={unit}
        onValueChange={(value) => {
          if (value === "px" || value === "%") changeUnit(value);
        }}
        spacing={0}
      >
        <ToggleGroupItem value="px" aria-label="Pixels" disabled={locked}>px</ToggleGroupItem>
        <ToggleGroupItem value="%" aria-label="Percent" disabled={locked}>%</ToggleGroupItem>
      </ToggleGroup>
      <Button
        type="button"
        size="sm"
        disabled={locked || !check.ok || unchanged}
        onClick={() => {
          if (check.ok) onResize(check.width, check.height);
        }}
      >
        Resize
      </Button>
      <Separator orientation="vertical" className="hidden h-6 sm:block" />
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={locked} onClick={() => onUpscale(2)}>
          Upscale 2x
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={locked} onClick={() => onUpscale(4)}>
          Upscale 4x
        </Button>
      </div>
      <p className="text-muted-foreground w-full text-center text-xs">
        Upscaling adds detail the picture did not have; faces may change.
      </p>
      {!check.ok ? (
        <p className="text-destructive w-full text-center text-xs" data-slot="image-editor-resize-error">
          {check.error}
        </p>
      ) : null}
    </div>
  );
}

// -------------------------------------------------------------- component

export function ImageEditor({
  variant = "pane",
  title,
  versions,
  currentVersionId,
  onSelectVersion,
  tools,
  statusNote,
  onRunOperation,
  onApplyPending,
  onSaveMarkup,
  onComment,
  onShare,
  downloadName,
  onClose,
  errorMessage,
}: ImageEditorProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const keyHandlerRef = useRef<(event: KeyboardEvent) => void>(() => {});
  const zoomRef = useRef(100);

  const [mode, setMode] = useState<ImageEditorToolKey | null>(null);
  const [markupTool, setMarkupTool] = useState<MarkupTool>("pen");
  const [colorKey, setColorKey] = useState(DEFAULT_COLOR);
  const [colorOpen, setColorOpen] = useState(false);
  const [markupSize, setMarkupSize] = useState(DEFAULT_MARKUP_SIZE);
  const [brush, setBrush] = useState(DEFAULT_BRUSH);
  const [markup, dispatchMarkup] = useReducer(strokesReducer, emptyStrokes);
  const [mask, dispatchMask] = useReducer(strokesReducer, emptyStrokes);

  const [zoomState, setZoomState] = useState(100);
  const [fit, setFit] = useState(true);
  const [stageSize, setStageSize] = useState<Size | null>(null);
  const [rootWidth, setRootWidth] = useState(0);
  const [naturalByUrl, setNaturalByUrl] = useState<Record<string, Size>>({});

  const [pending, setPending] = useState<{ value: ImageEditorPending; label: string } | null>(null);
  const [busy, setBusy] = useState<{ percent: number | null; label: string; cancelable: boolean } | null>(null);
  const [error, setError] = useState<{ message: string; retry?: () => void } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [textDraft, setTextDraft] = useState<{ at: Point; value: string } | null>(null);
  const [comment, setComment] = useState<{ region: Region | null; prompt: string } | null>(null);
  const [pins, setPins] = useState<Region[]>([]);
  const [reply, setReply] = useState<string | null>(null);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [seenVersion, setSeenVersion] = useState(currentVersionId);

  const current = versions.find((version) => version.id === currentVersionId) ?? versions[0];
  const previous = stepVersion(versions, currentVersionId, -1);
  const next = stepVersion(versions, currentVersionId, 1);

  // A different version is on screen: transient work belongs to the old one.
  if (seenVersion !== currentVersionId) {
    setSeenVersion(currentVersionId);
    setPending(null);
    setTextDraft(null);
    setComment(null);
    setPins([]);
    setReply(null);
    dispatchMarkup({ type: "clear" });
    dispatchMask({ type: "clear" });
  }

  const compact = variant === "screen" || (rootWidth > 0 && rootWidth < COMPACT_WIDTH);
  const displayUrl = pending ? pending.value.previewUrl : (current?.url ?? "");
  const natural: Size | null =
    naturalByUrl[displayUrl] ??
    (pending
      ? { width: pending.value.width, height: pending.value.height }
      : current?.width && current?.height
        ? { width: current.width, height: current.height }
        : null);
  const zoom = fit && natural && stageSize ? fitZoom(stageSize, natural) : fit ? 100 : zoomState;
  const scale = zoom / 100;
  const locked = busy !== null;
  const interactive = !locked && !pending;
  const layer = mode === "markup" ? markup : mode === "erase" ? mask : null;
  const strokePx = natural ? markupStrokePx(markupSize, natural) : 4;
  const selectedColor = PALETTE.find((color) => color.key === colorKey) ?? PALETTE[0]!;

  useEffect(() => {
    zoomRef.current = zoom;
  });

  // Focus: take the stage on open, hand focus back on close.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    stageRef.current?.focus({ preventScroll: true });
    return () => {
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
      abortRef.current?.abort();
    };
  }, []);

  // Measure the stage (for Fit) and the editor (for the phone layout).
  useEffect(() => {
    const stage = stageRef.current;
    const root = rootRef.current;
    if (!stage || !root) return;
    const measure = () => {
      const s = stage.getBoundingClientRect();
      if (s.width > 0 && s.height > 0) setStageSize({ width: s.width, height: s.height });
      setRootWidth(root.getBoundingClientRect().width);
    };
    measure();
    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(measure);
      observer.observe(stage);
      observer.observe(root);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Ctrl/Cmd + wheel zooms; a plain wheel scrolls the stage.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setFit(false);
      setZoomState(wheelZoom(zoomRef.current, event.deltaY));
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, []);

  // Keyboard shortcuts, scoped to this editor.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const listener = (event: KeyboardEvent) => keyHandlerRef.current(event);
    root.addEventListener("keydown", listener);
    return () => root.removeEventListener("keydown", listener);
  }, []);

  // ---------------------------------------------------------------- actions

  const setZoom = (percent: number) => {
    setFit(false);
    setZoomState(clampZoom(percent));
  };

  const failWith = (err: unknown, retry?: () => void) => {
    setError({ message: messageOf(err), ...(retry ? { retry } : {}) });
  };

  const clearLayers = () => {
    dispatchMarkup({ type: "clear" });
    dispatchMask({ type: "clear" });
    setTextDraft(null);
    setComment(null);
    setReply(null);
  };

  async function run(op: ImageEditorOperation, label: string) {
    setError(null);
    setNotice(null);
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy({ percent: null, label: "Working on it", cancelable: true });
    try {
      const result = await onRunOperation(op, {
        signal: controller.signal,
        onProgress: (progress) => {
          if (!controller.signal.aborted) setBusy({ percent: progress.percent, label: progress.label, cancelable: true });
        },
      });
      if (!controller.signal.aborted) setPending({ value: result, label });
    } catch (err) {
      if (!controller.signal.aborted) failWith(err, () => void run(op, label));
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setBusy(null);
      }
    }
  }

  function cancelRun() {
    const controller = abortRef.current;
    if (!controller) return;
    controller.abort();
    abortRef.current = null;
    setBusy(null);
    setNotice("Cancelled. Nothing was changed.");
  }

  async function applyPending() {
    if (!pending) return;
    setError(null);
    setBusy({ percent: null, label: "Saving the new version", cancelable: false });
    try {
      const version = await onApplyPending(pending.value, pending.label);
      setPending(null);
      clearLayers();
      onSelectVersion(version.id);
    } catch (err) {
      failWith(err, () => void applyPending());
    } finally {
      setBusy(null);
    }
  }

  function discardPending() {
    setPending(null);
    setError(null);
  }

  async function runErase() {
    if (!natural || mask.strokes.length === 0) return;
    const blob = await renderMaskPng(mask.strokes, natural);
    if (!blob) {
      failWith(new Error("The area to erase could not be prepared. Try drawing it again."));
      return;
    }
    await run({ operation: "erase", mask: blob }, "Object erased");
  }

  async function saveMarkup() {
    if (!natural || !current || markup.strokes.length === 0) return;
    setError(null);
    setBusy({ percent: null, label: "Saving the markup", cancelable: false });
    try {
      const blob = await renderMarkupPng(current.url, markup.strokes, natural, (key) => resolveColor(key, rootRef.current));
      if (!blob) throw new Error("The markup could not be saved on this picture. Try again.");
      const version = await onSaveMarkup(blob);
      clearLayers();
      onSelectVersion(version.id);
    } catch (err) {
      failWith(err, () => void saveMarkup());
    } finally {
      setBusy(null);
    }
  }

  async function sendComment() {
    if (!comment || comment.prompt.trim().length === 0) return;
    const request = { prompt: comment.prompt.trim(), region: comment.region };
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy({ percent: null, label: "Sending your comment", cancelable: true });
    try {
      const answer = await onComment(request, {
        signal: controller.signal,
        onProgress: (progress) => {
          if (!controller.signal.aborted) setBusy({ percent: progress.percent, label: progress.label, cancelable: true });
        },
      });
      if (controller.signal.aborted) return;
      setReply(answer.message);
      if (answer.pending) setPending({ value: answer.pending, label: "Changed as described" });
      if (request.region) setPins((existing) => [...existing, request.region as Region]);
      setComment({ region: request.region, prompt: "" });
    } catch (err) {
      if (!controller.signal.aborted) failWith(err, () => void sendComment());
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setBusy(null);
      }
    }
  }

  function chooseMode(value: string) {
    if (value === "") {
      if (interactive) {
        setMode(null);
        clearLayers();
      }
      return;
    }
    const key = value as ImageEditorToolKey;
    const state = tools[key];
    if (!state.enabled) {
      setNotice(state.reason ?? "That tool is not available right now.");
      return;
    }
    if (!interactive) {
      setNotice("Finish or cancel the current step first.");
      return;
    }
    setNotice(null);
    setError(null);
    clearLayers();
    setMode(key);
    if (key === "remove_background") void run({ operation: "remove_background" }, "Background removed");
  }

  function undo() {
    if (locked) return;
    if (pending) discardPending();
    else if (layer && canUndoStroke(layer)) (mode === "markup" ? dispatchMarkup : dispatchMask)({ type: "undo" });
    else if (previous) onSelectVersion(previous.id);
  }

  function redo() {
    if (locked || pending) return;
    if (layer && canRedoStroke(layer)) (mode === "markup" ? dispatchMarkup : dispatchMask)({ type: "redo" });
    else if (next) onSelectVersion(next.id);
  }

  function escape() {
    if (busy?.cancelable) cancelRun();
    else if (locked) return;
    else if (textDraft) setTextDraft(null);
    else if (comment) {
      setComment(null);
      setReply(null);
    } else if (pending) discardPending();
    else if (mode) {
      setMode(null);
      clearLayers();
    } else onClose();
  }

  function commitText() {
    if (!textDraft) return;
    const text = textDraft.value.trim();
    if (text.length > 0) {
      dispatchMarkup({
        type: "add",
        stroke: { kind: "text", at: textDraft.at, text, size: Math.max(12, strokePx * 4), color: colorKey },
      });
    }
    setTextDraft(null);
  }

  // Latest-render key handler (the native listener above calls through the ref).
  useEffect(() => {
    keyHandlerRef.current = (event: KeyboardEvent) => {
      const editable = isEditable(event.target);
      const modifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (event.key === "Escape") {
        if (event.defaultPrevented) return;
        event.preventDefault();
        escape();
        return;
      }
      if (modifier && key === "z" && !editable) {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (event.ctrlKey && key === "y" && !editable) {
        event.preventDefault();
        redo();
        return;
      }
      if (editable || modifier || event.altKey) return;
      if (mode === "erase" && (event.key === "[" || event.key === "]")) {
        event.preventDefault();
        setBrush((size) => stepBrush(size, event.key === "]" ? 1 : -1));
        return;
      }
      if (event.target === stageRef.current) {
        if (event.key === "+" || event.key === "=") {
          event.preventDefault();
          setZoom(stepZoom(zoom, 1));
        } else if (event.key === "-" || event.key === "_") {
          event.preventDefault();
          setZoom(stepZoom(zoom, -1));
        } else if (event.key === "0") {
          event.preventDefault();
          setFit(true);
        }
      }
    };
  });

  // ------------------------------------------------------------------ views

  const canUndo = !locked && (pending !== null || (layer !== null && canUndoStroke(layer)) || previous !== null);
  const canRedo = !locked && !pending && ((layer !== null && canRedoStroke(layer)) || next !== null);
  const strokeLayerDispatch = mode === "markup" ? dispatchMarkup : dispatchMask;

  const undoRedo = (
    <div className={pill} role="group" aria-label="History">
      <ToolButton label="Undo" disabled={!canUndo} onClick={undo}>
        <Undo2Icon aria-hidden />
      </ToolButton>
      <ToolButton label="Redo" disabled={!canRedo} onClick={redo}>
        <Redo2Icon aria-hidden />
      </ToolButton>
    </div>
  );

  const header = (
    <header className="flex items-center gap-2 px-2 py-1" data-slot="image-editor-header">
      <ToolButton label="Close editor" side="bottom" onClick={onClose}>
        <XIcon aria-hidden />
      </ToolButton>
      <h2 className="min-w-0 flex-1 truncate text-sm font-medium">{title}</h2>
      {compact ? undoRedo : null}
      <Popover open={versionsOpen} onOpenChange={setVersionsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size={compact ? "icon-sm" : "sm"} aria-label="Versions">
                <HistoryIcon aria-hidden />
                {compact ? null : "Versions"}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Versions</TooltipContent>
        </Tooltip>
        <PopoverContent align="end" width="auto" className="w-72 max-w-[calc(100vw-2rem)]">
          <ul className="grid gap-1" aria-label="Versions">
            {versions.map((version) => (
              <li key={version.id}>
                <Button
                  type="button"
                  variant="ghost"
                  align="start"
                  height="auto"
                  width="full"
                  aria-current={version.id === currentVersionId ? "true" : undefined}
                  onClick={() => {
                    setVersionsOpen(false);
                    if (version.id !== currentVersionId) onSelectVersion(version.id);
                  }}
                >
                  <img src={version.url} alt="" className="size-10 shrink-0 rounded-sm object-cover" draggable={false} />
                  <span className="min-w-0 flex-1 truncate text-left">{version.label}</span>
                  {version.createdAt ? (
                    <span className="text-muted-foreground shrink-0 text-xs">{formatRelative(version.createdAt)}</span>
                  ) : null}
                  {version.id === currentVersionId ? <CheckIcon aria-hidden className="shrink-0" /> : null}
                </Button>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
      {current ? (
        compact ? (
          <ToolButton label="Download" side="bottom" onClick={() => download(current.url, downloadName ?? title)}>
            <DownloadIcon aria-hidden />
          </ToolButton>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={() => download(current.url, downloadName ?? title)}>
            <DownloadIcon aria-hidden />
            Download
          </Button>
        )
      ) : null}
      {onShare && current ? (
        compact ? (
          <ToolButton label="Share" side="bottom" onClick={() => onShare(current)}>
            <Share2Icon aria-hidden />
          </ToolButton>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={() => onShare(current)}>
            <Share2Icon aria-hidden />
            Share
          </Button>
        )
      ) : null}
    </header>
  );

  const toolbar = (
    <ToggleGroup
      type="single"
      role="toolbar"
      aria-label="Picture editing tools"
      variant="default"
      spacing={1}
      value={mode ?? ""}
      onValueChange={chooseMode}
      className={cn(pill, "max-w-full overflow-x-auto")}
    >
      {TOOL_META.map((tool) => {
        const state = tools[tool.key];
        return (
          <Tooltip key={tool.key}>
            <TooltipTrigger asChild>
              <ToggleGroupItem
                value={tool.key}
                aria-label={tool.label}
                aria-disabled={state.enabled ? undefined : true}
                data-tool={tool.key}
                className={cn("rounded-full", state.enabled ? "" : "opacity-50")}
              >
                {tool.icon}
                {tool.text ? <span>{tool.text}</span> : null}
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side={compact ? "top" : "bottom"}>
              {state.enabled ? tool.label : `${tool.label}: ${state.reason ?? "Not available right now."}`}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </ToggleGroup>
  );

  const markupBar = (
    <div className={cn(pill, "max-w-full flex-wrap justify-center overflow-x-auto rounded-2xl")} data-slot="image-editor-markup-bar">
      <ToggleGroup
        type="single"
        aria-label="Markup tool"
        spacing={1}
        value={markupTool}
        onValueChange={(value) => {
          if (value) setMarkupTool(value as MarkupTool);
        }}
      >
        {MARKUP_TOOLS.map((tool) => (
          <Tooltip key={tool.key}>
            <TooltipTrigger asChild>
              <ToggleGroupItem value={tool.key} aria-label={tool.label} disabled={locked} className="rounded-full">
                {tool.icon}
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side={compact ? "top" : "bottom"}>{tool.label}</TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>
      <Popover open={colorOpen} onOpenChange={setColorOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Color: ${selectedColor.label}`} disabled={locked}>
                <span
                  aria-hidden
                  className="border-border size-5 rounded-full border"
                  style={{ backgroundColor: `var(${selectedColor.cssVar})` }}
                />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side={compact ? "top" : "bottom"}>Color</TooltipContent>
        </Tooltip>
        <PopoverContent width="auto" align="center">
          <div role="group" aria-label="Colors" className="grid grid-cols-4 gap-1">
            {PALETTE.map((color) => (
              <Toggle
                key={color.key}
                pressed={color.key === colorKey}
                aria-label={color.label}
                onPressedChange={() => {
                  setColorKey(color.key);
                  setColorOpen(false);
                }}
              >
                <span
                  aria-hidden
                  className="border-border size-6 rounded-full border"
                  style={{ backgroundColor: `var(${color.cssVar})` }}
                />
              </Toggle>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <Slider
        aria-label="Stroke size"
        min={MARKUP_SIZE_MIN}
        max={MARKUP_SIZE_MAX}
        step={1}
        value={[markupSize]}
        disabled={locked}
        onValueChange={([value]) => setMarkupSize(value ?? DEFAULT_MARKUP_SIZE)}
        className="mx-2 w-24"
      />
      <ToolButton label="Undo stroke" disabled={locked || !canUndoStroke(markup)} onClick={() => dispatchMarkup({ type: "undo" })}>
        <Undo2Icon aria-hidden />
      </ToolButton>
      <ToolButton label="Redo stroke" disabled={locked || !canRedoStroke(markup)} onClick={() => dispatchMarkup({ type: "redo" })}>
        <Redo2Icon aria-hidden />
      </ToolButton>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={locked || markup.strokes.length === 0}
        onClick={() => dispatchMarkup({ type: "clear" })}
      >
        <Trash2Icon aria-hidden />
        Clear
      </Button>
      <Button type="button" size="sm" disabled={locked || markup.strokes.length === 0} onClick={() => void saveMarkup()}>
        Save
      </Button>
    </div>
  );

  const eraseBar = (
    <div className={cn(pill, "max-w-full flex-wrap justify-center overflow-x-auto rounded-2xl")} data-slot="image-editor-erase-bar">
      <span className="text-muted-foreground px-2 text-xs">Paint over what to erase</span>
      <Slider
        aria-label="Brush size"
        min={BRUSH_MIN}
        max={BRUSH_MAX}
        step={1}
        value={[brush]}
        disabled={locked}
        onValueChange={([value]) => setBrush(clampBrush(value ?? DEFAULT_BRUSH))}
        className="mx-2 w-28"
      />
      <span className="text-muted-foreground w-14 text-xs tabular-nums" data-slot="image-editor-brush-size">{brush} px</span>
      <ToolButton label="Undo stroke" disabled={locked || !canUndoStroke(mask)} onClick={() => dispatchMask({ type: "undo" })}>
        <Undo2Icon aria-hidden />
      </ToolButton>
      <ToolButton label="Redo stroke" disabled={locked || !canRedoStroke(mask)} onClick={() => dispatchMask({ type: "redo" })}>
        <Redo2Icon aria-hidden />
      </ToolButton>
      <Button type="button" variant="ghost" size="sm" disabled={locked || mask.strokes.length === 0} onClick={() => dispatchMask({ type: "clear" })}>
        <Trash2Icon aria-hidden />
        Clear
      </Button>
      <Button type="button" size="sm" disabled={locked || mask.strokes.length === 0} onClick={() => void runErase()}>
        Erase
      </Button>
    </div>
  );

  const commentBar = (
    <div className={cn(pill, "max-w-full flex-wrap justify-center rounded-2xl")} data-slot="image-editor-comment-bar">
      <span className="text-muted-foreground px-2 text-xs">Click a spot or drag a box on the picture</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={locked}
        onClick={() => {
          setReply(null);
          setComment({ region: null, prompt: comment?.prompt ?? "" });
        }}
      >
        Whole picture
      </Button>
    </div>
  );

  const removeBar = (
    <div className={cn(pill, "max-w-full flex-wrap justify-center rounded-2xl")} data-slot="image-editor-remove-bar">
      <Button type="button" size="sm" disabled={locked} onClick={() => void run({ operation: "remove_background" }, "Background removed")}>
        <WandSparklesIcon aria-hidden />
        Remove background
      </Button>
    </div>
  );

  const pendingBar = pending ? (
    <div className={cn(pill, "max-w-full flex-wrap justify-center rounded-2xl")} data-slot="image-editor-pending-bar">
      <span className="px-2 text-sm" role="status">
        Preview: {pending.label}
        {pending.value.transparent ? " (transparent areas show as a checkerboard)" : ""}
      </span>
      <Button type="button" size="sm" disabled={locked} onClick={() => void applyPending()}>
        Apply
      </Button>
      <Button type="button" size="sm" variant="outline" aria-label="Undo preview" disabled={locked} onClick={discardPending}>
        Undo
      </Button>
    </div>
  ) : null;

  const subBar = pendingBar ?? (() => {
    switch (mode) {
      case "markup":
        return markupBar;
      case "erase":
        return eraseBar;
      case "comment":
        return commentBar;
      case "remove_background":
        return removeBar;
      case "resize":
        return natural && current ? (
          <div className={cn(pill, "max-w-full rounded-2xl px-3 py-2")}>
            <ResizeBar
              key={`${current.id}:${natural.width}x${natural.height}`}
              base={natural}
              locked={locked}
              onResize={(width, height) => void run({ operation: "resize", width, height }, resizeLabel(width, height))}
              onUpscale={(factor) => void run({ operation: "upscale", scale: factor }, `Upscaled ${factor}x`)}
            />
          </div>
        ) : null;
      default:
        return null;
    }
  })();

  const notices = (
    <div className="flex flex-col items-center gap-2 px-3 empty:hidden" data-slot="image-editor-notices">
      {busy ? (
        <div role="status" className="bg-popover border-border flex w-full max-w-md items-center gap-3 rounded-2xl border p-3" data-slot="image-editor-busy">
          <div className="grid min-w-0 flex-1 gap-2">
            <p className="truncate text-sm">
              {busy.label}
              {busy.percent !== null ? ` ${Math.round(busy.percent)}%` : ""}
            </p>
            <Progress
              value={busy.percent}
              aria-label={busy.label}
              aria-valuenow={busy.percent === null ? undefined : Math.round(busy.percent)}
              className={
                busy.percent === null
                  ? "[&>*]:animate-pulse [&>*]:transform-none! motion-reduce:[&>*]:animate-none"
                  : undefined
              }
            />
          </div>
          {busy.cancelable ? (
            <Button type="button" size="sm" variant="outline" onClick={cancelRun}>
              Cancel
            </Button>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <Alert variant="destructive" className="w-full max-w-md">
          <AlertCircleIcon aria-hidden />
          <AlertDescription className="col-start-2 flex flex-wrap items-center gap-2">
            <span>{error.message}</span>
            {error.retry ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const retry = error.retry;
                  setError(null);
                  retry?.();
                }}
              >
                Try again
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
      {errorMessage ? (
        <Alert variant="destructive" className="w-full max-w-md">
          <AlertCircleIcon aria-hidden />
          <AlertDescription className="col-start-2">{errorMessage}</AlertDescription>
        </Alert>
      ) : null}
      {mode === "comment" && comment ? (
        <Card className="w-full max-w-md py-3" data-slot="image-editor-comment-card">
          <CardContent className="grid gap-2 px-3">
            <Textarea
              aria-label="Describe the change"
              placeholder="Describe the change"
              value={comment.prompt}
              disabled={locked}
              autoFocus
              onChange={(event) => setComment({ ...comment, prompt: event.target.value })}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setComment(null);
                  setReply(null);
                }}
              >
                Cancel
              </Button>
              <Button type="button" size="sm" disabled={locked || comment.prompt.trim().length === 0} onClick={() => void sendComment()}>
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
      {reply ? (
        <Alert role="status" className="w-full max-w-md" data-reply="true">
          <InfoIcon aria-hidden />
          <AlertDescription className="col-start-2">{reply}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );

  const statusLine = (
    <p role="status" className="text-muted-foreground min-h-4 px-3 text-center text-xs empty:hidden" data-slot="image-editor-status">
      {notice ?? statusNote ?? ""}
    </p>
  );

  const zoomControl = (
    <div className={pill} role="group" aria-label="Zoom">
      <ToolButton label="Zoom out" disabled={zoom <= 10} onClick={() => setZoom(stepZoom(zoom, -1))}>
        <MinusIcon aria-hidden />
      </ToolButton>
      <span className="min-w-12 text-center text-sm tabular-nums" data-slot="image-editor-zoom" aria-label={`Zoom ${zoom} percent`}>
        {zoom}%
      </span>
      <ToolButton label="Zoom in" disabled={zoom >= 400} onClick={() => setZoom(stepZoom(zoom, 1))}>
        <PlusIcon aria-hidden />
      </ToolButton>
      <Button type="button" variant="ghost" size="sm" aria-pressed={fit} onClick={() => setFit(true)}>
        <MaximizeIcon aria-hidden />
        Fit
      </Button>
    </div>
  );

  const boxW = natural ? Math.max(1, Math.round(natural.width * scale)) : undefined;
  const boxH = natural ? Math.max(1, Math.round(natural.height * scale)) : undefined;

  const regionBox = (region: Region, number: number, key: string) => (
    <div
      key={key}
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{
        left: `${region.x * 100}%`,
        top: `${region.y * 100}%`,
        width: `${region.width * 100}%`,
        height: `${region.height * 100}%`,
      }}
    >
      {region.width > 0 && region.height > 0 ? (
        <div className="border-primary absolute inset-0 rounded-sm border-2" />
      ) : null}
      <Badge className="absolute -top-3 -left-3 size-6 justify-center rounded-full p-0">{number}</Badge>
    </div>
  );

  const stage = (
    <div className="relative min-h-0 flex-1">
      {/* A scrollable, keyboard-zoomable region has to be focusable. */}
      <div
        ref={stageRef}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        role="region"
        aria-label="Picture stage"
        data-slot="image-editor-stage"
        className="bg-muted focus-visible:ring-ring/50 absolute inset-0 overflow-auto outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
      >
        <div className="flex min-h-full min-w-full p-6">
          <div
            data-slot="image-editor-picture"
            className="relative m-auto shrink-0"
            style={{ ...checkerboard, ...(boxW && boxH ? { width: boxW, height: boxH } : { width: 256, height: 192 }) }}
          >
            {displayUrl ? (
              <img
                key={displayUrl}
                src={displayUrl}
                alt={title}
                draggable={false}
                className="absolute inset-0 size-full select-none"
                onLoad={(event) => {
                  const { naturalWidth, naturalHeight } = event.currentTarget;
                  if (naturalWidth > 0 && naturalHeight > 0) {
                    setNaturalByUrl((known) => {
                      const existing = known[displayUrl];
                      if (existing && existing.width === naturalWidth && existing.height === naturalHeight) return known;
                      return { ...known, [displayUrl]: { width: naturalWidth, height: naturalHeight } };
                    });
                  }
                }}
              />
            ) : null}
            {natural ? (
              <ImageEditorSurface
                natural={natural}
                scale={scale}
                mode={interactive && (mode === "markup" || mode === "erase" || mode === "comment") ? mode : "none"}
                markupTool={markupTool}
                color={colorKey}
                strokePx={strokePx}
                brushPx={brush}
                // While a preview waits for Apply or Undo, the painted area is not drawn: the picture shown is the result, and the
                // paint over it made an erased object look still there. Undo brings the strokes back for another go.
                strokes={layer && !pending ? layer.strokes : []}
                onStroke={(stroke) => strokeLayerDispatch({ type: "add", stroke })}
                onTextAt={(at) => setTextDraft({ at, value: "" })}
                onRegion={(region) => {
                  setReply(null);
                  setComment({ region, prompt: comment?.prompt ?? "" });
                }}
              />
            ) : null}
            {pins.map((region, index) => regionBox(region, index + 1, `pin-${index}`))}
            {mode === "comment" && comment?.region ? regionBox(comment.region, pins.length + 1, "active-region") : null}
            {textDraft && natural ? (
              <div
                className="absolute z-10 w-44"
                style={{ left: `${(textDraft.at.x / natural.width) * 100}%`, top: `${(textDraft.at.y / natural.height) * 100}%` }}
              >
                <Input
                  autoFocus
                  aria-label="Text to add"
                  placeholder="Type, then press Enter"
                  value={textDraft.value}
                  onChange={(event) => setTextDraft({ ...textDraft, value: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitText();
                    }
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  const toolArea = (
    <div className="flex flex-col items-center gap-2 px-2 py-2" data-slot="image-editor-tools">
      {compact ? null : toolbar}
      {subBar}
      {compact ? toolbar : null}
      {statusLine}
    </div>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <section
        ref={rootRef}
        aria-label={`Edit picture: ${title}`}
        data-slot="image-editor"
        data-variant={variant}
        data-layout={compact ? "compact" : "wide"}
        className={cn(
          "bg-background text-foreground flex min-h-0 flex-col",
          variant === "screen" ? "fixed inset-0 z-50" : "size-full",
        )}
      >
        {header}
        {notices}
        {compact ? null : toolArea}
        {stage}
        <div className="flex items-center justify-between gap-2 px-2 py-2" data-slot="image-editor-footer">
          {zoomControl}
          {compact ? null : undoRedo}
        </div>
        {compact ? toolArea : null}
      </section>
    </TooltipProvider>
  );
}
