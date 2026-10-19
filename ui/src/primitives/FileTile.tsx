import { useState, type MouseEvent, type ReactElement, type ReactNode, type Ref } from "react";
import { Avatar } from "@/kit/primitives/Avatar";
import { Card } from "@/kit/primitives/Card";
import { getIcon } from "@/kit/icons";
import { Button } from "@/kit/ui/button";
import { Checkbox } from "@/kit/ui/checkbox";
import { AvatarGroup, AvatarGroupCount } from "@/kit/ui/avatar";
import { cn } from "@/kit/utils";
import { SafeImage } from "./SafeImage";

export type FileKind = "image" | "video" | "audio" | "document" | "other";

export interface FileTilePerson {
  id: string;
  name: string;
  /** `Person.avatar_seed`, as the kit `Avatar` takes it. */
  seed?: string | null;
}

/** What a tile shows. The caller maps its own record to this; the kit knows no Home type. */
export interface FileTileData {
  id: string;
  name: string;
  kind: FileKind;
  /** A picture address (a poster for a video, a cover for a song). Absent, or if it fails to load, the kind icon shows. */
  thumbnailUrl?: string | null;
  /** Shown under the icon when there is no picture, e.g. "PDF". */
  extension?: string;
  /** Seconds. Drawn as a badge for video and audio. */
  durationSeconds?: number | null;
  /** The second line under the name (size, date). */
  secondary?: ReactNode;
  /** The same detail as plain words for a screen reader, e.g. "9.4 megabytes". Defaults to `secondary` when that is a string. */
  description?: string;
  sharedWith?: readonly FileTilePerson[];
  /** The tile button's whole accessible name. Absent, it is built from name, kind, description, duration and who it is shared with. */
  label?: string;
}

export interface FileTileLabels {
  kind: Record<FileKind, string>;
  select: (name: string) => string;
  actions: (name: string) => string;
  sharedWith: (names: readonly string[]) => string;
  /** The name of the "+N" count after the avatars. */
  moreShared: (count: number) => string;
}

export const DEFAULT_FILE_TILE_LABELS: FileTileLabels = {
  kind: { image: "picture", video: "video", audio: "audio", document: "document", other: "file" },
  select: (name) => `Select ${name}`,
  actions: (name) => `Actions for ${name}`,
  sharedWith: (names) => `shared with ${listNames(names)}`,
  moreShared: (count) => `${count} more people`,
};

function listNames(names: readonly string[]): string {
  try {
    return new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(names);
  } catch {
    return names.join(", ");
  }
}

/** 75 becomes "1:15"; 3725 becomes "1:02:05". */
export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const rest = String(whole % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
}

export interface FileTileProps extends FileTileData {
  selected?: boolean;
  /** In selection mode the select box is always shown and pressing the tile toggles it. */
  selectionMode?: boolean;
  /** Pressing the tile (outside selection mode). */
  onOpen?: () => void;
  /** Given, the tile has a select box. `range` is true when Shift was held. */
  onToggleSelect?: (range: boolean) => void;
  /** Given (or `wrapActions`), the tile has an actions button. The kit owns no menu. */
  onActionsClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Wrap the kit's actions button, e.g. as a menu trigger with `asChild`. */
  wrapActions?: (button: ReactElement) => ReactElement;
  /** Avatars shown before "+N". Default 3. */
  maxAvatars?: number;
  labels?: Partial<FileTileLabels>;
  /** Defaults to `formatClock`. */
  formatDuration?: (seconds: number) => string;
  /** False takes the tile button out of the tab order (a grid keeps one tab stop). Default true. */
  tabbable?: boolean;
  /** False takes the select box and actions button out of the tab order. Default true. */
  controlsTabbable?: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
  onTileFocus?: () => void;
  className?: string;
}

const REVEAL =
  "pointer-events-none opacity-0 transition-opacity motion-reduce:transition-none group-hover/tile:pointer-events-auto group-hover/tile:opacity-100 group-focus-within/tile:pointer-events-auto group-focus-within/tile:opacity-100";
const SHOWN = "pointer-events-auto opacity-100";

/** One file in a grid: a 4:3 thumbnail with a kind-icon fallback, duration badge, shared avatars,
 * a select box and an actions button. The caller supplies words and handlers; copy has plain defaults. */
export function FileTile({
  name,
  kind,
  thumbnailUrl,
  extension,
  durationSeconds,
  secondary,
  description,
  sharedWith = [],
  label,
  selected = false,
  selectionMode = false,
  onOpen,
  onToggleSelect,
  onActionsClick,
  wrapActions,
  maxAvatars = 3,
  labels,
  formatDuration = formatClock,
  tabbable = true,
  controlsTabbable = true,
  buttonRef,
  onTileFocus,
  className,
}: FileTileProps) {
  const copy: FileTileLabels = { ...DEFAULT_FILE_TILE_LABELS, ...labels, kind: { ...DEFAULT_FILE_TILE_LABELS.kind, ...labels?.kind } };
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPicture = Boolean(thumbnailUrl) && failedUrl !== thumbnailUrl;
  const PlayIcon = getIcon("play");
  const MoreIcon = getIcon("more-horizontal");

  const hasDuration = (kind === "video" || kind === "audio") && typeof durationSeconds === "number" && Number.isFinite(durationSeconds);
  const durationText = hasDuration ? formatDuration(durationSeconds) : null;
  const detail = description ?? (typeof secondary === "string" ? secondary : undefined);
  const accessibleName =
    label ??
    [
      name,
      copy.kind[kind],
      detail,
      durationText,
      sharedWith.length > 0 ? copy.sharedWith(sharedWith.map((person) => person.name)) : null,
    ]
      .filter(Boolean)
      .join(", ");

  const shown = sharedWith.slice(0, Math.max(0, maxAvatars));
  const extra = sharedWith.length - shown.length;
  const checkboxVisible = selectionMode || selected;

  function press(event: MouseEvent<HTMLButtonElement>) {
    if (onToggleSelect && (selectionMode || event.shiftKey || event.metaKey || event.ctrlKey)) onToggleSelect(event.shiftKey);
    else onOpen?.();
  }

  const actionsButton =
    onActionsClick || wrapActions ? (
      <Button
        type="button"
        variant="secondary"
        size="icon-sm"
        data-slot="file-tile-actions"
        aria-label={copy.actions(name)}
        tabIndex={controlsTabbable ? 0 : -1}
        onClick={onActionsClick}
        className={cn("absolute right-2 top-2 rounded-full [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100", REVEAL)}
      >
        <MoreIcon aria-hidden className="size-4" />
      </Button>
    ) : null;

  return (
    <Card
      selected={selected}
      className={cn(
        "group/tile relative",
        selected && "ring-2 ring-primary forced-colors:outline-2 forced-colors:outline-[Highlight]",
        className,
      )}
    >
      <div data-slot="file-tile" data-kind={kind} data-selected={selected ? "true" : undefined} className="contents">
        <button
          ref={buttonRef}
          type="button"
          data-slot="file-tile-main"
          aria-label={accessibleName}
          aria-pressed={selectionMode && onToggleSelect ? selected : undefined}
          tabIndex={tabbable ? 0 : -1}
          onClick={press}
          onFocus={onTileFocus}
          className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]"
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
            <SafeImage
              kind={kind === "audio" ? "music" : kind === "video" ? "video" : kind === "document" || kind === "other" ? "file" : "picture"}
              src={thumbnailUrl ?? undefined}
              alt=""
              width={320}
              height={240}
              loading="lazy"
              decoding="async"
              draggable={false}
              onError={() => setFailedUrl(thumbnailUrl ?? null)}
              className="absolute inset-0 size-full object-cover"
              fallbackAfterIcon={extension ? <span className="text-base font-semibold uppercase">{extension}</span> : null}
            />
            {showPicture && kind === "video" ? (
              <span aria-hidden className="absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground">
                <PlayIcon className="size-5" />
              </span>
            ) : null}
            {durationText ? (
              <span
                data-slot="file-tile-duration"
                aria-hidden
                className="absolute bottom-2 right-2 rounded-md bg-background/90 px-2 text-base tabular-nums text-foreground"
              >
                {durationText}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2 p-3">
            <div className="min-w-0 flex-1">
              <p data-slot="file-tile-name" className="truncate text-base font-medium text-card-foreground">
                {name}
              </p>
              {secondary ? (
                <p data-slot="file-tile-secondary" className="truncate text-base text-muted-foreground">
                  {secondary}
                </p>
              ) : null}
            </div>
            {shown.length > 0 ? (
              <AvatarGroup data-slot="file-tile-avatars" aria-hidden className="shrink-0">
                {shown.map((person) => (
                  <Avatar key={person.id} name={person.name} seed={person.seed} className="size-8 text-base" />
                ))}
                {extra > 0 ? (
                  <AvatarGroupCount data-slot="file-tile-avatar-count" title={copy.moreShared(extra)} className="text-base">
                    +{extra}
                  </AvatarGroupCount>
                ) : null}
              </AvatarGroup>
            ) : null}
          </div>
        </button>
        {onToggleSelect ? (
          <span className={cn("absolute left-3 top-3 flex size-6 items-center justify-center rounded-md bg-background", checkboxVisible ? SHOWN : REVEAL)}>
            <Checkbox
              data-slot="file-tile-select"
              aria-label={copy.select(name)}
              checked={selected}
              tabIndex={controlsTabbable ? 0 : -1}
              onClick={(event) => onToggleSelect(event.shiftKey)}
              className="bg-background"
            />
          </span>
        ) : null}
        {actionsButton ? (wrapActions ? wrapActions(actionsButton) : actionsButton) : null}
      </div>
    </Card>
  );
}
