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
  BrushIcon,
  CheckIcon,
  CircleIcon,
  ContrastIcon,
  CropIcon,
  DownloadIcon,
  EllipsisIcon,
  EraserIcon,
  FlipHorizontal2Icon,
  FlipVertical2Icon,
  HighlighterIcon,
  HistoryIcon,
  ImagePlusIcon,
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
  RotateCcwIcon,
  RotateCwIcon,
  ScalingIcon,
  Share2Icon,
  SquarePenIcon,
  SlidersHorizontalIcon,
  SquareIcon,
  Trash2Icon,
  TypeIcon,
  Undo2Icon,
  WandSparklesIcon,
  XIcon,
} from "lucide-react";
import { cn } from "cn";
import { SafeImage } from "../primitives/SafeImage";
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
import { i18n } from "@/kit/i18n";
import {
  ADJUST_KEYS,
  BRUSH_MAX,
  CROP_ASPECTS,
  BRUSH_MIN,
  MARKUP_SIZE_MAX,
  MARKUP_SIZE_MIN,
  NO_ADJUST,
  PALETTE,
  RESIZE_MAX,
  adjustChanged,
  adjustFilter,
  aspectRatioOf,
  compareBase,
  canRedoStroke,
  canUndoStroke,
  clampBrush,
  clampZoom,
  cropChanged,
  croppedPixels,
  emptyStrokes,
  fitZoom,
  fromPixels,
  initialCrop,
  linkedSide,
  markupStrokePx,
  parseWhole,
  pictureTransform,
  rectForAspect,
  resizeLabel,
  rotatedSize,
  stepBrush,
  stepVersion,
  stepZoom,
  strokesReducer,
  toPixels,
  turnCrop,
  validateResize,
  wheelZoom,
  type AdjustValues,
  type CropAspect,
  type CropRotation,
  type CropState,
  type MarkupTool,
  type Point,
  type Region,
  type ResizeUnit,
  type Size,
} from "./image-editor-state";
import { ImageEditorCompare } from "./image-editor-compare";
import { ImageEditorCrop } from "./image-editor-crop";
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

/** IMG-STUDIO-01: the tools the Studio adds. A host that does not pass them in `tools` never sees them. */
export type ImageEditorStudioToolKey = "crop" | "adjust";

/** One value of a host-listed operation's controls. */
export type ImageEditorOperationValue = number | string | boolean;

/** IMG-STUDIO-01: a one-click operation the host lists (from the backend registry); the kit names none of them. */
export interface ImageEditorExtraOperation {
  id: string;
  label: string;
  /** One plain line shown under the operation when it is chosen. */
  summary?: string;
  /** Optional inputs drawn before Run: a number is a slider, a choice is a row of buttons. */
  controls?: ReadonlyArray<
    | { kind: "number"; name: string; label: string; min: number; max: number; step?: number; default?: number }
    | { kind: "choice"; name: string; label: string; options: readonly string[]; default?: string }
  >;
  enabled: boolean;
  /** Why it is disabled, one line. Shown as its tooltip and in the status line; a disabled operation stays in the list. */
  reason?: string;
}

export type ImageEditorOperation =
  | { operation: "remove_background" }
  | { operation: "erase"; mask: Blob }
  | { operation: "upscale"; scale: 2 | 4 }
  | { operation: "resize"; width: number; height: number }
  /** Crop, rotate and flip. Rotate and flip apply first (rotate, then flip); `x`, `y`, `width`, `height` are fractions (0..1)
   * of the rotated and flipped picture. `aspect` is the preset the person chose (a hint; the rectangle is the truth). */
  | { operation: "crop"; x: number; y: number; width: number; height: number; aspect: CropAspect; rotate: CropRotation; flipHorizontal: boolean; flipVertical: boolean }
  /** Light and colour, each -100..100 (0 unchanged), the `picture.adjust` argument names. `auto` asks for auto tone (the four values are then 0). */
  | { operation: "adjust"; brightness: number; contrast: number; saturation: number; warmth: number; auto: boolean }
  /** One of the host's `operations`, by id, with the values of its controls. */
  | { operation: "custom"; id: string; args: Record<string, ImageEditorOperationValue> };

/** EDITOR-HANDOFF: one hand-off the host offers for the picture being shown. */
export interface ImageEditorAction {
  key: string;
  label: string;
  onSelect: (version: ImageEditorVersion) => void;
  /** Set when the hand-off cannot be used now: the button stays, looks off, and tapping it says this in one line. */
  disabledReason?: string;
}

/** A picture the person chose as a reference for a Comment. */
export interface ImageEditorReference {
  id: string;
  label: string;
}

/** What Comment sends: the words, a point or box (`region`) or a painted area (`mask`), and an optional reference picture. */
export interface ImageEditorCommentRequest {
  prompt: string;
  region: Region | null;
  /** A PNG the size of the picture, white where the change goes (Brush mode only). */
  mask?: Blob;
  reference?: ImageEditorReference;
}

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
  /** The five chat tools are required; `crop` and `adjust` (IMG-STUDIO-01) are drawn only when listed. */
  tools: Record<ImageEditorToolKey, ImageEditorToolState> & Partial<Record<ImageEditorStudioToolKey, ImageEditorToolState>>;
  /** IMG-STUDIO-01: extra one-click operations, listed by the host under a More tool. They run through `onRunOperation`
   * as `{ operation: "custom", id, args }` and come back as a preview like every other tool. Default none. */
  operations?: readonly ImageEditorExtraOperation[];
  /** IMG-STUDIO-01: which tool is open at first. A tool that is disabled or not listed is ignored. */
  initialTool?: ImageEditorToolKey | ImageEditorStudioToolKey;
  /** IMG-STUDIO-01: draw Compare (before and after the first version). Default false. */
  compare?: boolean;
  /** IMG-STUDIO-01: Comment gains a Brush mode that sends `mask`. Default false. */
  commentBrush?: boolean;
  /** IMG-STUDIO-01: the host's picker for a Comment's reference picture; Comment shows "Add a reference picture" when set. */
  onPickReference?: () => Promise<ImageEditorReference | null>;
  statusNote?: string | null;
  onRunOperation: (op: ImageEditorOperation, ctl: ImageEditorRunControl) => Promise<ImageEditorPending>;
  onApplyPending: (pending: ImageEditorPending, label: string) => Promise<ImageEditorVersion>;
  onSaveMarkup: (png: Blob) => Promise<ImageEditorVersion>;
  /** Sends the comment. The second argument carries the same cancel signal and progress callback a tool run gets.
   * A reply may also return `pending`, the picture the comment produced: the editor then shows it as a preview with
   * Apply and Discard, exactly as it does for Erase (additive; a reply with only `message` behaves as before). */
  onComment: (request: ImageEditorCommentRequest, ctl: ImageEditorRunControl) => Promise<{ message: string; pending?: ImageEditorPending }>;
  onShare?: (version: ImageEditorVersion) => void;
  /** EDITOR-07: opens the picture being shown in the host's full Studio (the chat canvas sets it for a picture that is a Library file). The editor draws "Open in Studio" beside Share when set. */
  onOpenInStudio?: (version: ImageEditorVersion) => void;
  /** EDITOR-HANDOFF: the host's own hand-offs for the picture being shown ("Make a video from this"). Each is a quiet header button that calls `onSelect` with the current version; the host opens its own form and starts nothing. */
  actions?: readonly ImageEditorAction[];
  downloadName?: string;
  onClose: () => void;
  errorMessage?: string | null;
}

// ----------------------------------------------------------------- helpers

const COMPACT_WIDTH = 640;
const DEFAULT_COLOR = "red";
const DEFAULT_MARKUP_SIZE = 4;
const DEFAULT_BRUSH = 40;

type Mode = ImageEditorToolKey | ImageEditorStudioToolKey | "more";

const toolMeta = (): ReadonlyArray<{ key: Mode; label: string; icon: ReactNode; text?: string }> => [
  { key: "markup", label: i18n._({ id: "ui.Markup", message: "Markup" }), icon: <PenLineIcon aria-hidden /> },
  { key: "comment", label: i18n._({ id: "ui.Comment", message: "Comment" }), icon: <MessageSquareIcon aria-hidden /> },
  { key: "remove_background", label: i18n._({ id: "ui.Remove BG", message: "Remove BG" }), icon: <WandSparklesIcon aria-hidden />, text: i18n._({ id: "ui.Remove BG", message: "Remove BG" }) },
  { key: "erase", label: i18n._({ id: "ui.Erase", message: "Erase" }), icon: <EraserIcon aria-hidden /> },
  { key: "resize", label: i18n._({ id: "ui.Resize", message: "Resize" }), icon: <ScalingIcon aria-hidden /> },
  { key: "crop", label: i18n._({ id: "ui.Crop", message: "Crop" }), icon: <CropIcon aria-hidden /> },
  { key: "adjust", label: i18n._({ id: "ui.Adjust", message: "Adjust" }), icon: <SlidersHorizontalIcon aria-hidden /> },
  { key: "more", label: i18n._({ id: "ui.More", message: "More" }), icon: <EllipsisIcon aria-hidden /> },
];

const ASPECT_LABEL = (aspect: CropAspect) => (aspect === "free" ? i18n._({ id: "ui.Free", message: "Free" }) : aspect === "original" ? i18n._({ id: "ui.Original", message: "Original" }) : aspect);
const ADJUST_LABEL = (key: keyof AdjustValues) =>
  ({
    brightness: i18n._({ id: "ui.Brightness", message: "Brightness" }),
    contrast: i18n._({ id: "ui.Contrast", message: "Contrast" }),
    saturation: i18n._({ id: "ui.Saturation", message: "Saturation" }),
    warmth: i18n._({ id: "ui.Warmth", message: "Warmth" }),
  })[key];

const markupTools = (): ReadonlyArray<{ key: MarkupTool; label: string; icon: ReactNode }> => [
  { key: "pen", label: i18n._({ id: "ui.Pen", message: "Pen" }), icon: <PenLineIcon aria-hidden /> },
  { key: "highlighter", label: i18n._({ id: "ui.Highlighter", message: "Highlighter" }), icon: <HighlighterIcon aria-hidden /> },
  { key: "arrow", label: i18n._({ id: "ui.Arrow", message: "Arrow" }), icon: <MoveUpRightIcon aria-hidden /> },
  { key: "rectangle", label: i18n._({ id: "ui.Rectangle", message: "Rectangle" }), icon: <SquareIcon aria-hidden /> },
  { key: "ellipse", label: i18n._({ id: "ui.Ellipse", message: "Ellipse" }), icon: <CircleIcon aria-hidden /> },
  { key: "text", label: i18n._({ id: "ui.Text", message: "Text" }), icon: <TypeIcon aria-hidden /> },
];

const messageOf = (error: unknown) =>
  error instanceof Error && error.message ? error.message : i18n._({ id: "ui.Something went wrong. Try again.", message: "Something went wrong. Try again." });

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

/** `hint` is the key that does the same thing, named in the tooltip (the accessible name stays the label). */
function ToolButton({ label, children, side = "top", hint, ...rest }: ComponentProps<typeof Button> & { label: string; side?: "top" | "bottom"; hint?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={label} aria-keyshortcuts={hint ? hint.replace(/^Ctrl\+/, "Control+") : undefined} {...rest}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side={side}>{hint ? `${label} (${hint})` : label}</TooltipContent>
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
          <Label htmlFor={ids.w} className="text-xs">{i18n._({ id: "ui.Width", message: "Width" })}</Label>
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
              aria-label={i18n._({ id: "ui.Keep proportions", message: "Keep proportions" })}
              variant="outline"
              disabled={locked}
            >
              {lock ? <LockIcon aria-hidden /> : <LockOpenIcon aria-hidden />}
            </Toggle>
          </TooltipTrigger>
          <TooltipContent side="top">{i18n._({ id: "ui.Keep proportions", message: "Keep proportions" })}</TooltipContent>
        </Tooltip>
        <div className="grid gap-1">
          <Label htmlFor={ids.h} className="text-xs">{i18n._({ id: "ui.Height", message: "Height" })}</Label>
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
        aria-label={i18n._({ id: "ui.Resize unit", message: "Resize unit" })}
        value={unit}
        onValueChange={(value) => {
          if (value === "px" || value === "%") changeUnit(value);
        }}
        spacing={0}
      >
        <ToggleGroupItem value="px" aria-label={i18n._({ id: "ui.Pixels", message: "Pixels" })} disabled={locked}>px</ToggleGroupItem>
        <ToggleGroupItem value="%" aria-label={i18n._({ id: "ui.Percent", message: "Percent" })} disabled={locked}>%</ToggleGroupItem>
      </ToggleGroup>
      <Button
        type="button"
        size="sm"
        disabled={locked || !check.ok || unchanged}
        onClick={() => {
          if (check.ok) onResize(check.width, check.height);
        }}
      >
        {i18n._({ id: "ui.Resize (verb)", message: "Resize" })}
      </Button>
      <Separator orientation="vertical" className="hidden h-6 sm:block" />
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={locked} onClick={() => onUpscale(2)}>
          {i18n._({ id: "ui.Upscale 2x", message: "Upscale 2x" })}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={locked} onClick={() => onUpscale(4)}>
          {i18n._({ id: "ui.Upscale 4x", message: "Upscale 4x" })}
        </Button>
      </div>
      <p className="text-muted-foreground w-full text-center text-xs">
        {i18n._({ id: "ui.Upscaling adds detail the picture did not have; faces may change.", message: "Upscaling adds detail the picture did not have; faces may change." })}
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
  operations,
  initialTool,
  compare = false,
  commentBrush = false,
  onPickReference,
  statusNote,
  onRunOperation,
  onApplyPending,
  onSaveMarkup,
  onComment,
  onShare,
  onOpenInStudio,
  actions,
  downloadName,
  onClose,
  errorMessage,
}: ImageEditorProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const keyHandlerRef = useRef<(event: KeyboardEvent) => void>(() => {});
  const zoomRef = useRef(100);

  const [mode, setMode] = useState<Mode | null>(() => {
    if (!initialTool || initialTool === "remove_background") return null;
    const state = tools[initialTool];
    return state?.enabled ? initialTool : null;
  });
  const [crop, setCrop] = useState<CropState>(initialCrop);
  const [adjust, setAdjust] = useState<AdjustValues>(NO_ADJUST);
  const [comparing, setComparing] = useState(false);
  const [moreChoice, setMoreChoice] = useState<string | null>(null);
  const [moreArgs, setMoreArgs] = useState<Record<string, ImageEditorOperationValue>>({});
  const [commentTool, setCommentTool] = useState<"point" | "brush">("point");
  const [reference, setReference] = useState<ImageEditorReference | null>(null);
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
    setCrop(initialCrop);
    setAdjust(NO_ADJUST);
    setComparing(false);
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
  // While the crop frame is up, the picture is shown turned and flipped, so the box and Fit follow the turned frame.
  const cropping = mode === "crop" && busy === null && pending === null;
  const frameNatural: Size | null = natural && cropping ? rotatedSize(natural, crop.rotate) : natural;
  const zoom = fit && frameNatural && stageSize ? fitZoom(stageSize, frameNatural) : fit ? 100 : zoomState;
  const scale = zoom / 100;
  const locked = busy !== null;
  const interactive = !locked && !pending;
  const brushing = mode === "erase" || (mode === "comment" && commentBrush && commentTool === "brush");
  const layer = mode === "markup" ? markup : brushing ? mask : null;
  const original = compareBase(versions, currentVersionId, natural, pending !== null, (version) => naturalByUrl[version.url] ?? null) ?? undefined;
  const canCompare = compare && !!original && !!current;
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
    setCrop(initialCrop);
    setAdjust(NO_ADJUST);
    setReference(null);
    setMoreChoice(null);
    setMoreArgs({});
  };

  async function run(op: ImageEditorOperation, label: string) {
    setError(null);
    setNotice(null);
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy({ percent: null, label: i18n._({ id: "ui.Working on it", message: "Working on it" }), cancelable: true });
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
    setNotice(i18n._({ id: "ui.Cancelled. Nothing was changed.", message: "Cancelled. Nothing was changed." }));
  }

  async function applyPending() {
    if (!pending) return;
    setError(null);
    setBusy({ percent: null, label: i18n._({ id: "ui.Saving the new version", message: "Saving the new version" }), cancelable: false });
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
      failWith(new Error(i18n._({ id: "ui.The area to erase could not be prepared. Try drawing it again.", message: "The area to erase could not be prepared. Try drawing it again." })));
      return;
    }
    await run({ operation: "erase", mask: blob }, i18n._({ id: "ui.Object erased", message: "Object erased" }));
  }

  /** Crop, rotate and flip: the request carries the rectangle of the rotated and flipped picture; the host returns a preview. */
  async function runCrop() {
    if (!natural || !cropChanged(crop)) return;
    const size = croppedPixels(crop, natural);
    await run(
      { operation: "crop", x: crop.rect.x, y: crop.rect.y, width: crop.rect.width, height: crop.rect.height, aspect: crop.aspect, rotate: crop.rotate, flipHorizontal: crop.flipHorizontal, flipVertical: crop.flipVertical },
      i18n._({ id: "ui.Cropped to {width} x {height}", message: "Cropped to {width} x {height}", values: { width: size.width, height: size.height } }),
    );
  }

  async function runAdjust(auto: boolean) {
    await run(
      { operation: "adjust", ...(auto ? NO_ADJUST : adjust), auto },
      auto ? i18n._({ id: "ui.Auto tone", message: "Auto tone" }) : i18n._({ id: "ui.Light and colour adjusted", message: "Light and colour adjusted" }),
    );
  }

  function chooseOperation(operation: ImageEditorExtraOperation) {
    if (!operation.enabled) {
      setNotice(operation.reason ?? i18n._({ id: "ui.That is not available right now.", message: "That is not available right now." }));
      return;
    }
    setNotice(null);
    const defaults: Record<string, ImageEditorOperationValue> = {};
    for (const control of operation.controls ?? []) {
      defaults[control.name] = control.kind === "number" ? control.default ?? control.min : control.default ?? control.options[0] ?? "";
    }
    setMoreArgs(defaults);
    if (!operation.controls || operation.controls.length === 0) {
      setMoreChoice(null);
      void run({ operation: "custom", id: operation.id, args: {} }, operation.label);
    } else {
      setMoreChoice(operation.id);
    }
  }

  async function saveMarkup() {
    if (!natural || !current || markup.strokes.length === 0) return;
    setError(null);
    setBusy({ percent: null, label: i18n._({ id: "ui.Saving the markup", message: "Saving the markup" }), cancelable: false });
    try {
      const blob = await renderMarkupPng(current.url, markup.strokes, natural, (key) => resolveColor(key, rootRef.current));
      if (!blob) throw new Error(i18n._({ id: "ui.The markup could not be saved on this picture. Try again.", message: "The markup could not be saved on this picture. Try again." }));
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
    const request: ImageEditorCommentRequest = { prompt: comment.prompt.trim(), region: comment.region };
    if (commentBrush && commentTool === "brush" && natural && mask.strokes.length > 0) {
      const png = await renderMaskPng(mask.strokes, natural);
      if (!png) {
        failWith(new Error(i18n._({ id: "ui.The painted area could not be prepared. Try painting it again.", message: "The painted area could not be prepared. Try painting it again." })));
        return;
      }
      request.mask = png;
      request.region = null;
    }
    if (reference) request.reference = reference;
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy({ percent: null, label: i18n._({ id: "ui.Sending your comment", message: "Sending your comment" }), cancelable: true });
    try {
      const answer = await onComment(request, {
        signal: controller.signal,
        onProgress: (progress) => {
          if (!controller.signal.aborted) setBusy({ percent: progress.percent, label: progress.label, cancelable: true });
        },
      });
      if (controller.signal.aborted) return;
      setReply(answer.message);
      if (answer.pending) setPending({ value: answer.pending, label: i18n._({ id: "ui.Changed as described", message: "Changed as described" }) });
      if (request.region) setPins((existing) => [...existing, request.region as Region]);
      setReference(null);
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
    const key = value as Mode;
    const state: ImageEditorToolState | undefined = key === "more" ? { enabled: true } : tools[key];
    if (!state || !state.enabled) {
      setNotice(state?.reason ?? i18n._({ id: "ui.That tool is not available right now.", message: "That tool is not available right now." }));
      return;
    }
    if (!interactive) {
      setNotice(i18n._({ id: "ui.Finish or cancel the current step first.", message: "Finish or cancel the current step first." }));
      return;
    }
    setNotice(null);
    setError(null);
    clearLayers();
    setComparing(false);
    setMode(key);
    if (key === "remove_background") void run({ operation: "remove_background" }, i18n._({ id: "ui.Background removed", message: "Background removed" }));
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
    else if (comparing) setComparing(false);
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
      if (mode === "crop" && interactive && (event.key === "[" || event.key === "]")) {
        event.preventDefault();
        if (natural) setCrop((state) => turnCrop(state, event.key === "]" ? 1 : -1, natural));
        return;
      }
      if (brushing && (event.key === "[" || event.key === "]")) {
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
        } else if ((event.key === "c" || event.key === "C") && canCompare && !locked) {
          event.preventDefault();
          setComparing((on) => !on);
        }
      }
    };
  });

  // ------------------------------------------------------------------ views

  const canUndo = !locked && (pending !== null || (layer !== null && canUndoStroke(layer)) || previous !== null);
  const canRedo = !locked && !pending && ((layer !== null && canRedoStroke(layer)) || next !== null);
  const strokeLayerDispatch = mode === "markup" ? dispatchMarkup : dispatchMask;

  const undoRedo = (
    <div className={pill} role="group" aria-label={i18n._({ id: "ui.History", message: "History" })}>
      <ToolButton label={i18n._({ id: "ui.Undo", message: "Undo" })} hint="Ctrl+Z" disabled={!canUndo} onClick={undo}>
        <Undo2Icon aria-hidden />
      </ToolButton>
      <ToolButton label={i18n._({ id: "ui.Redo", message: "Redo" })} hint="Ctrl+Shift+Z" disabled={!canRedo} onClick={redo}>
        <Redo2Icon aria-hidden />
      </ToolButton>
    </div>
  );

  const header = (
    <header className="flex items-center gap-2 px-2 py-1" data-slot="image-editor-header">
      <ToolButton label={i18n._({ id: "ui.Close editor", message: "Close editor" })} hint={i18n._({ id: "ui.Esc", message: "Esc" })} side="bottom" onClick={onClose}>
        <XIcon aria-hidden />
      </ToolButton>
      <h2 className="min-w-0 flex-1 truncate text-sm font-medium">{title}</h2>
      {compact ? undoRedo : null}
      <Popover open={versionsOpen} onOpenChange={setVersionsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size={compact ? "icon-sm" : "sm"} aria-label={i18n._({ id: "ui.Versions", message: "Versions" })}>
                <HistoryIcon aria-hidden />
                {compact ? null : i18n._({ id: "ui.Versions", message: "Versions" })}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">{i18n._({ id: "ui.Versions", message: "Versions" })}</TooltipContent>
        </Tooltip>
        <PopoverContent align="end" width="auto" className="w-72 max-w-[calc(100vw-2rem)]">
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-1" aria-label={i18n._({ id: "ui.Versions", message: "Versions" })}>
            {versions.map((version) => (
              <li key={version.id} className="min-w-0">
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
                  <SafeImage src={version.url} alt="" className="size-10 shrink-0 rounded-sm object-cover" draggable={false} />
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
          <ToolButton label={i18n._({ id: "ui.Download", message: "Download" })} side="bottom" onClick={() => download(current.url, downloadName ?? title)}>
            <DownloadIcon aria-hidden />
          </ToolButton>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={() => download(current.url, downloadName ?? title)}>
            <DownloadIcon aria-hidden />
            {i18n._({ id: "ui.Download", message: "Download" })}
          </Button>
        )
      ) : null}
      {onOpenInStudio && current ? (
        compact ? (
          <ToolButton label={i18n._({ id: "ui.Open in Studio", message: "Open in Studio" })} side="bottom" onClick={() => onOpenInStudio(current)}>
            <SquarePenIcon aria-hidden />
          </ToolButton>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenInStudio(current)}>
            <SquarePenIcon aria-hidden />
            {i18n._({ id: "ui.Open in Studio", message: "Open in Studio" })}
          </Button>
        )
      ) : null}
      {current ? (actions ?? []).map((action) => (
        <Button key={action.key} type="button" variant="ghost" size="sm" data-slot="image-editor-action" aria-disabled={action.disabledReason ? true : undefined} title={action.disabledReason} className={action.disabledReason ? "opacity-50" : undefined} onClick={() => (action.disabledReason ? setNotice(action.disabledReason) : action.onSelect(current))}>
          {action.label}
        </Button>
      )) : null}
      {onShare && current ? (
        compact ? (
          <ToolButton label={i18n._({ id: "ui.Share", message: "Share" })} side="bottom" onClick={() => onShare(current)}>
            <Share2Icon aria-hidden />
          </ToolButton>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={() => onShare(current)}>
            <Share2Icon aria-hidden />
            {i18n._({ id: "ui.Share", message: "Share" })}
          </Button>
        )
      ) : null}
    </header>
  );

  const toolbar = (
    <ToggleGroup
      type="single"
      role="toolbar"
      aria-label={i18n._({ id: "ui.Picture editing tools", message: "Picture editing tools" })}
      variant="default"
      spacing={1}
      value={mode ?? ""}
      onValueChange={chooseMode}
      className={cn(pill, "max-w-full overflow-x-auto")}
    >
      {toolMeta().map((tool) => {
        // Crop and Adjust are drawn only when the host lists them; More only when it lists operations.
        if ((tool.key === "crop" || tool.key === "adjust") && !tools[tool.key]) return null;
        if (tool.key === "more" && !(operations && operations.length > 0)) return null;
        const state: ImageEditorToolState = tool.key === "more" ? { enabled: true } : tools[tool.key]!;
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
                {tool.text && !(compact && (tools.crop || tools.adjust)) ? <span>{tool.text}</span> : null}
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side={compact ? "top" : "bottom"}>
              {state.enabled ? tool.label : i18n._({ id: "ui.{tool}: {reason}", message: "{tool}: {reason}", values: { tool: tool.label, reason: state.reason ?? i18n._({ id: "ui.Not available right now.", message: "Not available right now." }) } })}
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
        aria-label={i18n._({ id: "ui.Markup tool", message: "Markup tool" })}
        spacing={1}
        value={markupTool}
        onValueChange={(value) => {
          if (value) setMarkupTool(value as MarkupTool);
        }}
      >
        {markupTools().map((tool) => (
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
              <Button type="button" variant="ghost" size="icon-sm" aria-label={i18n._({ id: "ui.Color: {color}", message: "Color: {color}", values: { color: selectedColor.label } })} disabled={locked}>
                <span
                  aria-hidden
                  className="border-border size-5 rounded-full border"
                  style={{ backgroundColor: `var(${selectedColor.cssVar})` }}
                />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side={compact ? "top" : "bottom"}>{i18n._({ id: "ui.Color", message: "Color" })}</TooltipContent>
        </Tooltip>
        <PopoverContent width="auto" align="center">
          <div role="group" aria-label={i18n._({ id: "ui.Colors", message: "Colors" })} className="grid grid-cols-4 gap-1">
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
        aria-label={i18n._({ id: "ui.Stroke size", message: "Stroke size" })}
        min={MARKUP_SIZE_MIN}
        max={MARKUP_SIZE_MAX}
        step={1}
        value={[markupSize]}
        disabled={locked}
        onValueChange={([value]) => setMarkupSize(value ?? DEFAULT_MARKUP_SIZE)}
        className="mx-2 w-24"
      />
      <ToolButton label={i18n._({ id: "ui.Undo stroke", message: "Undo stroke" })} disabled={locked || !canUndoStroke(markup)} onClick={() => dispatchMarkup({ type: "undo" })}>
        <Undo2Icon aria-hidden />
      </ToolButton>
      <ToolButton label={i18n._({ id: "ui.Redo stroke", message: "Redo stroke" })} disabled={locked || !canRedoStroke(markup)} onClick={() => dispatchMarkup({ type: "redo" })}>
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
        {i18n._({ id: "ui.Clear", message: "Clear" })}
      </Button>
      <Button type="button" size="sm" disabled={locked || markup.strokes.length === 0} onClick={() => void saveMarkup()}>
        {i18n._({ id: "ui.Save", message: "Save" })}
      </Button>
    </div>
  );

  const eraseBar = (
    <div className={cn(pill, "max-w-full flex-wrap justify-center overflow-x-auto rounded-2xl")} data-slot="image-editor-erase-bar">
      <span className="text-muted-foreground px-2 text-xs">{i18n._({ id: "ui.Paint over what to erase", message: "Paint over what to erase" })}</span>
      <Slider
        aria-label={i18n._({ id: "ui.Brush size", message: "Brush size" })}
        min={BRUSH_MIN}
        max={BRUSH_MAX}
        step={1}
        value={[brush]}
        disabled={locked}
        onValueChange={([value]) => setBrush(clampBrush(value ?? DEFAULT_BRUSH))}
        className="mx-2 w-28"
      />
      <span className="text-muted-foreground w-14 text-xs tabular-nums" data-slot="image-editor-brush-size">{brush} px</span>
      <ToolButton label={i18n._({ id: "ui.Undo stroke", message: "Undo stroke" })} disabled={locked || !canUndoStroke(mask)} onClick={() => dispatchMask({ type: "undo" })}>
        <Undo2Icon aria-hidden />
      </ToolButton>
      <ToolButton label={i18n._({ id: "ui.Redo stroke", message: "Redo stroke" })} disabled={locked || !canRedoStroke(mask)} onClick={() => dispatchMask({ type: "redo" })}>
        <Redo2Icon aria-hidden />
      </ToolButton>
      <Button type="button" variant="ghost" size="sm" disabled={locked || mask.strokes.length === 0} onClick={() => dispatchMask({ type: "clear" })}>
        <Trash2Icon aria-hidden />
        {i18n._({ id: "ui.Clear", message: "Clear" })}
      </Button>
      <Button type="button" size="sm" disabled={locked || mask.strokes.length === 0} onClick={() => void runErase()}>
        {i18n._({ id: "ui.Erase", message: "Erase" })}
      </Button>
    </div>
  );

  const commentBar = (
    <div className={cn(pill, "max-w-full flex-wrap justify-center rounded-2xl")} data-slot="image-editor-comment-bar">
      {commentBrush ? (
        <ToggleGroup
          type="single"
          variant="outline"
          aria-label={i18n._({ id: "ui.Comment on", message: "Comment on" })}
          value={commentTool}
          spacing={0}
          onValueChange={(value) => {
            if (value !== "point" && value !== "brush") return;
            setCommentTool(value);
            setComment(null);
            setReply(null);
          }}
        >
          <ToggleGroupItem value="point" disabled={locked} aria-label={i18n._({ id: "ui.Point or box", message: "Point or box" })}>
            <MessageSquareIcon aria-hidden />
            {i18n._({ id: "ui.Point or box", message: "Point or box" })}
          </ToggleGroupItem>
          <ToggleGroupItem value="brush" disabled={locked} aria-label={i18n._({ id: "ui.Brush", message: "Brush" })}>
            <BrushIcon aria-hidden />
            {i18n._({ id: "ui.Brush", message: "Brush" })}
          </ToggleGroupItem>
        </ToggleGroup>
      ) : null}
      {brushing ? (
        <>
          <span className="text-muted-foreground px-2 text-xs">{i18n._({ id: "ui.Paint where the change goes", message: "Paint where the change goes" })}</span>
          <Slider
            aria-label={i18n._({ id: "ui.Brush size", message: "Brush size" })}
            min={BRUSH_MIN}
            max={BRUSH_MAX}
            step={1}
            value={[brush]}
            disabled={locked}
            onValueChange={([value]) => setBrush(clampBrush(value ?? DEFAULT_BRUSH))}
            className="mx-2 w-28 shrink-0"
          />
          <ToolButton label={i18n._({ id: "ui.Undo stroke", message: "Undo stroke" })} disabled={locked || !canUndoStroke(mask)} onClick={() => dispatchMask({ type: "undo" })}>
            <Undo2Icon aria-hidden />
          </ToolButton>
          <Button type="button" variant="ghost" size="sm" disabled={locked || mask.strokes.length === 0} onClick={() => dispatchMask({ type: "clear" })}>
            <Trash2Icon aria-hidden />
            {i18n._({ id: "ui.Clear", message: "Clear" })}
          </Button>
        </>
      ) : (
        <span className="text-muted-foreground px-2 text-xs">{i18n._({ id: "ui.Click a spot or drag a box on the picture", message: "Click a spot or drag a box on the picture" })}</span>
      )}
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
        {i18n._({ id: "ui.Whole picture", message: "Whole picture" })}
      </Button>
    </div>
  );

  const removeBar = (
    <div className={cn(pill, "max-w-full flex-wrap justify-center rounded-2xl")} data-slot="image-editor-remove-bar">
      <Button type="button" size="sm" disabled={locked} onClick={() => void run({ operation: "remove_background" }, i18n._({ id: "ui.Background removed", message: "Background removed" }))}>
        <WandSparklesIcon aria-hidden />
        {i18n._({ id: "ui.Remove background", message: "Remove background" })}
      </Button>
    </div>
  );

  const cropFrame = natural ? rotatedSize(natural, crop.rotate) : null;
  const cropBar = (
    <div className={cn(pill, "max-w-full flex-wrap justify-center rounded-2xl")} data-slot="image-editor-crop-bar">
      <ToggleGroup
        type="single"
        variant="outline"
        aria-label={i18n._({ id: "ui.Crop shape", message: "Crop shape" })}
        value={crop.aspect}
        spacing={0}
        onValueChange={(value) => {
          if (!value || !cropFrame) return;
          const aspect = value as CropAspect;
          const ratio = aspectRatioOf(aspect, cropFrame);
          setCrop((state) => ({ ...state, aspect, rect: ratio === null ? state.rect : rectForAspect(ratio, cropFrame) }));
        }}
      >
        {CROP_ASPECTS.map((aspect) => (
          <ToggleGroupItem key={aspect} value={aspect} disabled={locked} aria-label={ASPECT_LABEL(aspect)} data-aspect={aspect} className="px-2.5 text-xs">
            {ASPECT_LABEL(aspect)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Separator orientation="vertical" className="hidden h-6 sm:block" />
      <ToolButton label={i18n._({ id: "ui.Rotate left", message: "Rotate left" })} hint="[" disabled={locked} onClick={() => natural && setCrop((state) => turnCrop(state, -1, natural))}>
        <RotateCcwIcon aria-hidden />
      </ToolButton>
      <ToolButton label={i18n._({ id: "ui.Rotate right", message: "Rotate right" })} hint="]" disabled={locked} onClick={() => natural && setCrop((state) => turnCrop(state, 1, natural))}>
        <RotateCwIcon aria-hidden />
      </ToolButton>
      <ToolButton label={i18n._({ id: "ui.Flip horizontal", message: "Flip horizontal" })} disabled={locked} aria-pressed={crop.flipHorizontal} onClick={() => setCrop((state) => ({ ...state, flipHorizontal: !state.flipHorizontal }))}>
        <FlipHorizontal2Icon aria-hidden />
      </ToolButton>
      <ToolButton label={i18n._({ id: "ui.Flip vertical", message: "Flip vertical" })} disabled={locked} aria-pressed={crop.flipVertical} onClick={() => setCrop((state) => ({ ...state, flipVertical: !state.flipVertical }))}>
        <FlipVertical2Icon aria-hidden />
      </ToolButton>
      {natural && cropChanged(crop) ? (
        <span className="text-muted-foreground px-1 text-xs tabular-nums" data-slot="image-editor-crop-size">
          {i18n._({ id: "ui.{width} x {height}", message: "{width} x {height}", values: { width: croppedPixels(crop, natural).width, height: croppedPixels(crop, natural).height } })}
        </span>
      ) : null}
      <Button type="button" variant="ghost" size="sm" disabled={locked || !cropChanged(crop)} onClick={() => setCrop(initialCrop)}>
        {i18n._({ id: "ui.Reset", message: "Reset" })}
      </Button>
      <Button type="button" size="sm" disabled={locked || !cropChanged(crop)} onClick={() => void runCrop()}>
        {i18n._({ id: "ui.Preview", message: "Preview" })}
      </Button>
    </div>
  );

  const adjustBar = (
    <div className={cn(pill, "max-w-full flex-wrap justify-center gap-x-3 rounded-2xl px-3 py-2")} data-slot="image-editor-adjust-bar">
      {ADJUST_KEYS.map((key) => (
        <div key={key} className="grid min-w-32 flex-1 gap-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span>{ADJUST_LABEL(key)}</span>
            <span className="text-muted-foreground tabular-nums" data-slot={`image-editor-adjust-${key}`}>{adjust[key]}</span>
          </div>
          <Slider
            aria-label={ADJUST_LABEL(key)}
            min={-100}
            max={100}
            step={1}
            value={[adjust[key]]}
            disabled={locked}
            onValueChange={([value]) => setAdjust((state) => ({ ...state, [key]: value ?? 0 }))}
          />
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" size="sm" variant="outline" disabled={locked} onClick={() => void runAdjust(true)}>
              <WandSparklesIcon aria-hidden />
              {i18n._({ id: "ui.Auto", message: "Auto" })}
            </Button>
          </TooltipTrigger>
          <TooltipContent side={compact ? "top" : "bottom"}>{i18n._({ id: "ui.Fix light and colour for me", message: "Fix light and colour for me" })}</TooltipContent>
        </Tooltip>
        <Button type="button" variant="ghost" size="sm" disabled={locked || !adjustChanged(adjust)} onClick={() => setAdjust(NO_ADJUST)}>
          {i18n._({ id: "ui.Reset", message: "Reset" })}
        </Button>
        <Button type="button" size="sm" disabled={locked || !adjustChanged(adjust)} onClick={() => void runAdjust(false)}>
          {i18n._({ id: "ui.Preview", message: "Preview" })}
        </Button>
      </div>
    </div>
  );

  const chosenOperation = operations?.find((operation) => operation.id === moreChoice) ?? null;
  const moreBar = (
    <div className={cn(pill, "max-w-full flex-col items-stretch rounded-2xl px-3 py-2")} data-slot="image-editor-more-bar">
      <div className="flex flex-wrap items-center justify-center gap-1">
        {(operations ?? []).map((operation) => (
          <Tooltip key={operation.id}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant={moreChoice === operation.id ? "default" : "outline"}
                aria-disabled={operation.enabled ? undefined : true}
                data-operation={operation.id}
                className={operation.enabled ? "" : "opacity-50"}
                disabled={locked}
                onClick={() => chooseOperation(operation)}
              >
                {operation.label}
              </Button>
            </TooltipTrigger>
            <TooltipContent side={compact ? "top" : "bottom"}>
              {operation.enabled ? operation.summary ?? operation.label : i18n._({ id: "ui.{tool}: {reason}", message: "{tool}: {reason}", values: { tool: operation.label, reason: operation.reason ?? i18n._({ id: "ui.Not available right now.", message: "Not available right now." }) } })}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      {chosenOperation ? (
        <div className="flex flex-wrap items-end justify-center gap-x-3 gap-y-2" data-slot="image-editor-more-controls">
          {chosenOperation.summary ? <p className="text-muted-foreground w-full text-center text-xs">{chosenOperation.summary}</p> : null}
          {(chosenOperation.controls ?? []).map((control) =>
            control.kind === "number" ? (
              <div key={control.name} className="grid min-w-32 flex-1 gap-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span>{control.label}</span>
                  <span className="text-muted-foreground tabular-nums">{String(moreArgs[control.name] ?? control.min)}</span>
                </div>
                <Slider
                  aria-label={control.label}
                  min={control.min}
                  max={control.max}
                  step={control.step ?? 1}
                  value={[Number(moreArgs[control.name] ?? control.min)]}
                  disabled={locked}
                  onValueChange={([value]) => setMoreArgs((args) => ({ ...args, [control.name]: value ?? control.min }))}
                />
              </div>
            ) : (
              <ToggleGroup
                key={control.name}
                type="single"
                variant="outline"
                spacing={0}
                aria-label={control.label}
                value={String(moreArgs[control.name] ?? control.options[0] ?? "")}
                onValueChange={(value) => {
                  if (value) setMoreArgs((args) => ({ ...args, [control.name]: value }));
                }}
              >
                {control.options.map((option) => (
                  <ToggleGroupItem key={option} value={option} disabled={locked} aria-label={option}>
                    {option}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            ),
          )}
          <Button
            type="button"
            size="sm"
            disabled={locked}
            onClick={() => void run({ operation: "custom", id: chosenOperation.id, args: moreArgs }, chosenOperation.label)}
          >
            {i18n._({ id: "ui.Preview", message: "Preview" })}
          </Button>
        </div>
      ) : null}
    </div>
  );

  const pendingBar = pending ? (
    <div className={cn(pill, "max-w-full flex-wrap justify-center rounded-2xl")} data-slot="image-editor-pending-bar">
      <span className="px-2 text-sm" role="status">
        {i18n._({ id: "ui.Preview: {label}", message: "Preview: {label}", values: { label: pending.label } })}
        {pending.value.transparent ? " " + i18n._({ id: "ui.(transparent areas show as a checkerboard)", message: "(transparent areas show as a checkerboard)" }) : ""}
      </span>
      <Button type="button" size="sm" disabled={locked} onClick={() => void applyPending()}>
        {i18n._({ id: "ui.Apply", message: "Apply" })}
      </Button>
      <Button type="button" size="sm" variant="outline" aria-label={i18n._({ id: "ui.Undo preview", message: "Undo preview" })} disabled={locked} onClick={discardPending}>
        {i18n._({ id: "ui.Undo", message: "Undo" })}
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
      case "crop":
        return tools.crop ? cropBar : null;
      case "adjust":
        return tools.adjust ? adjustBar : null;
      case "more":
        return operations && operations.length > 0 ? moreBar : null;
      case "resize":
        return natural && current ? (
          <div className={cn(pill, "max-w-full rounded-2xl px-3 py-2")}>
            <ResizeBar
              key={`${current.id}:${natural.width}x${natural.height}`}
              base={natural}
              locked={locked}
              onResize={(width, height) => void run({ operation: "resize", width, height }, resizeLabel(width, height))}
              onUpscale={(factor) => void run({ operation: "upscale", scale: factor }, i18n._({ id: "ui.Upscaled {factor}x", message: "Upscaled {factor}x", values: { factor } }))}
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
              {i18n._({ id: "ui.Cancel", message: "Cancel" })}
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
                {i18n._({ id: "ui.Try again", message: "Try again" })}
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
            {commentBrush && commentTool === "brush" && comment.region === null && mask.strokes.length === 0 ? (
              <p className="text-muted-foreground text-xs">{i18n._({ id: "ui.Nothing is painted, so this changes the whole picture.", message: "Nothing is painted, so this changes the whole picture." })}</p>
            ) : null}
            <Textarea
              aria-label={i18n._({ id: "ui.Describe the change", message: "Describe the change" })}
              placeholder={i18n._({ id: "ui.Describe the change", message: "Describe the change" })}
              value={comment.prompt}
              disabled={locked}
              autoFocus
              onChange={(event) => setComment({ ...comment, prompt: event.target.value })}
            />
            {onPickReference ? (
              <div className="flex flex-wrap items-center gap-2" data-slot="image-editor-reference">
                {reference ? (
                  <Badge variant="secondary" className="gap-1">
                    <ImagePlusIcon aria-hidden />
                    <span className="max-w-40 truncate">{reference.label}</span>
                    <button type="button" aria-label={i18n._({ id: "ui.Remove the reference picture", message: "Remove the reference picture" })} className="rounded-full" disabled={locked} onClick={() => setReference(null)}>
                      <XIcon aria-hidden className="size-3" />
                    </button>
                  </Badge>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={locked}
                    onClick={() => {
                      void onPickReference().then((picked) => {
                        if (picked) setReference(picked);
                      }).catch((err) => failWith(err));
                    }}
                  >
                    <ImagePlusIcon aria-hidden />
                    {i18n._({ id: "ui.Add a reference picture", message: "Add a reference picture" })}
                  </Button>
                )}
              </div>
            ) : null}
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
                {i18n._({ id: "ui.Cancel", message: "Cancel" })}
              </Button>
              <Button type="button" size="sm" disabled={locked || comment.prompt.trim().length === 0} onClick={() => void sendComment()}>
                {i18n._({ id: "ui.Send", message: "Send" })}
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
    <div className={pill} role="group" aria-label={i18n._({ id: "ui.Zoom", message: "Zoom" })}>
      <ToolButton label={i18n._({ id: "ui.Zoom out", message: "Zoom out" })} hint="-" disabled={zoom <= 10} onClick={() => setZoom(stepZoom(zoom, -1))}>
        <MinusIcon aria-hidden />
      </ToolButton>
      <span className="min-w-12 text-center text-sm tabular-nums" data-slot="image-editor-zoom" aria-label={i18n._({ id: "ui.Zoom {zoom} percent", message: "Zoom {zoom} percent", values: { zoom } })}>
        {zoom}%
      </span>
      <ToolButton label={i18n._({ id: "ui.Zoom in", message: "Zoom in" })} hint="+" disabled={zoom >= 400} onClick={() => setZoom(stepZoom(zoom, 1))}>
        <PlusIcon aria-hidden />
      </ToolButton>
      <Button type="button" variant="ghost" size="sm" aria-pressed={fit} onClick={() => setFit(true)}>
        <MaximizeIcon aria-hidden />
        {i18n._({ id: "ui.Fit", message: "Fit" })}
      </Button>
    </div>
  );

  const boxW = frameNatural ? Math.max(1, Math.round(frameNatural.width * scale)) : undefined;
  const boxH = frameNatural ? Math.max(1, Math.round(frameNatural.height * scale)) : undefined;
  const adjusting = mode === "adjust" && busy === null && pending === null && adjustChanged(adjust);
  const imageStyle =
    cropping && natural
      ? { position: "absolute" as const, left: "50%", top: "50%", width: natural.width * scale, height: natural.height * scale, maxWidth: "none", transform: pictureTransform(crop) }
      : adjusting
        ? { filter: adjustFilter(adjust) }
        : undefined;

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
        aria-label={i18n._({ id: "ui.Picture stage", message: "Picture stage" })}
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
              <SafeImage
                key={displayUrl}
                src={displayUrl}
                alt={title}
                draggable={false}
                className={cn("select-none", cropping ? "" : "absolute inset-0 size-full")}
                style={imageStyle}
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
                mode={interactive && !comparing ? (brushing ? "erase" : mode === "markup" || mode === "comment" ? mode : "none") : "none"}
                markupTool={markupTool}
                color={colorKey}
                strokePx={strokePx}
                brushPx={brush}
                // While a preview waits for Apply or Undo, the painted area is not drawn: the picture shown is the result, and the
                // paint over it made an erased object look still there. Undo brings the strokes back for another go.
                strokes={layer && !pending ? layer.strokes : []}
                onStroke={(stroke) => {
                  strokeLayerDispatch({ type: "add", stroke });
                  // A painted comment area opens the same words box a point or box does.
                  if (mode === "comment") {
                    setReply(null);
                    setComment((existing) => existing ?? { region: null, prompt: "" });
                  }
                }}
                onTextAt={(at) => setTextDraft({ at, value: "" })}
                onRegion={(region) => {
                  setReply(null);
                  setComment({ region, prompt: comment?.prompt ?? "" });
                }}
              />
            ) : null}
            {cropping && cropFrame ? (
              <ImageEditorCrop rect={crop.rect} ratio={aspectRatioOf(crop.aspect, cropFrame)} frame={cropFrame} onChange={(rect) => setCrop((state) => ({ ...state, rect }))} />
            ) : null}
            {comparing && canCompare && original ? <ImageEditorCompare beforeUrl={original.url} afterUrl={displayUrl} alt={title} /> : null}
            {pins.map((region, index) => regionBox(region, index + 1, `pin-${index}`))}
            {mode === "comment" && comment?.region ? regionBox(comment.region, pins.length + 1, "active-region") : null}
            {textDraft && natural ? (
              <div
                className="absolute z-10 w-44"
                style={{ left: `${(textDraft.at.x / natural.width) * 100}%`, top: `${(textDraft.at.y / natural.height) * 100}%` }}
              >
                <Input
                  autoFocus
                  aria-label={i18n._({ id: "ui.Text to add", message: "Text to add" })}
                  placeholder={i18n._({ id: "ui.Type, then press Enter", message: "Type, then press Enter" })}
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
        aria-label={i18n._({ id: "ui.Edit picture: {title}", message: "Edit picture: {title}", values: { title } })}
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
          {compare ? (
            <Tooltip>
              <TooltipTrigger asChild>
                {/* A span carries the tooltip when the button is disabled (a disabled button gets no pointer events). */}
                <span tabIndex={canCompare ? undefined : 0}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-pressed={comparing}
                    aria-keyshortcuts="C"
                    disabled={!canCompare || locked}
                    data-slot="image-editor-compare-toggle"
                    onClick={() => setComparing((on) => !on)}
                  >
                    <ContrastIcon aria-hidden />
                    {i18n._({ id: "ui.Compare", message: "Compare" })}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                {canCompare
                  ? original && versions[0]?.id === original.id
                    ? i18n._({ id: "ui.Compare with the original (C)", message: "Compare with the original (C)" })
                    : i18n._({ id: "ui.Compare with the earlier version (C)", message: "Compare with the earlier version (C)" })
                  : current && versions[0]?.id === current.id
                    ? i18n._({ id: "ui.Nothing to compare yet: this is the original picture.", message: "Nothing to compare yet: this is the original picture." })
                    : i18n._({ id: "ui.Nothing the same shape to compare with yet.", message: "Nothing the same shape to compare with yet." })}
              </TooltipContent>
            </Tooltip>
          ) : null}
          {compact ? null : undoRedo}
        </div>
        {compact ? toolArea : null}
      </section>
    </TooltipProvider>
  );
}
