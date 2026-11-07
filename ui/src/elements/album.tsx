"use client";

import { useState, type ComponentProps } from "react";
import { ChevronDownIcon, ChevronUpIcon, PencilIcon, PlayIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import { SafeImage } from "../primitives/SafeImage";
import { paper, pressable } from "./surfaces";
import { EditActions, TagsEdit, TextEdit, diffPatch, parseTags, pillButton, tagsText } from "./music-edit";
import { formatClock } from "./video-player";
import { i18n } from "@/kit/i18n";

export interface AlbumCover { src: string; alt: string }
export interface AlbumTrack { media_id: string; title: string; length_s?: number }
export type AlbumAction = "play_all" | "keep" | "remake_cover" | "discard" | "open_app";
/** The fields an edit can change. `track_ids` is the full new order with removed tracks left out (action `edit_album`). */
export interface AlbumPatch { title?: string; blurb?: string; look?: string; sound?: string; genres?: string[]; track_ids?: string[] }

/**
 * MUSIC-STUDIO-ALBUM: the chat card for an album the household made, in the
 * Apple Music / Spotify shape: a large rounded cover, the title, the band, a
 * round play button and a numbered track list where the number turns into a
 * play icon on hover. Playing a track reports its media id (`onPlayTrack`);
 * the card never carries a route.
 *
 * MUSIC-STUDIO-EDIT: `editable` adds an Edit button; `defaultEditing` opens the
 * card already in edit mode. Edit mode makes title, blurb, look, sound and
 * style tags fields, adds "New cover" (the `remake_cover` action) and lets each
 * track move up, move down or be removed from the album (the song stays).
 * Save calls `onEdit` with only the changed fields.
 */
function actionLabel(action: AlbumAction): string {
  switch (action) {
    case "play_all": return i18n._({ id: "ui.play all", message: "play all" });
    case "keep": return i18n._({ id: "ui.keep", message: "keep" });
    case "remake_cover": return i18n._({ id: "ui.remake cover", message: "remake cover" });
    case "discard": return i18n._({ id: "ui.discard", message: "discard" });
    case "open_app": return i18n._({ id: "ui.open app", message: "open app" });
  }
}

export function Album({ title, artist, blurb, genres = [], cover, look = "", sound = "", inspiredBy, tracks = [], actions, onAction, onPlayTrack, editable, defaultEditing, onEdit, resolveImageSrc, className, ...props }: Omit<ComponentProps<"div">, "children" | "title" | "translate"> & {
  title: string; artist?: string; blurb?: string; genres?: readonly string[]; cover?: AlbumCover; look?: string; sound?: string; inspiredBy?: string;
  tracks?: readonly AlbumTrack[]; actions: readonly AlbumAction[];
  onAction?: (action: AlbumAction) => void; onPlayTrack?: (mediaId: string) => void; resolveImageSrc?: (src: string) => string;
  editable?: boolean; defaultEditing?: boolean; onEdit?: (patch: AlbumPatch) => void;
}) {
  const url = (src: string) => (resolveImageSrc ? resolveImageSrc(src) : src);
  const [editing, setEditing] = useState(Boolean(editable && defaultEditing));
  const original = { title, blurb: blurb ?? "", look, sound, genres: [...genres], track_ids: tracks.map((t) => t.media_id) };
  const [draft, setDraft] = useState({ ...original, genres: tagsText(genres) });
  const patch = diffPatch(original, { ...draft, genres: parseTags(draft.genres) });
  const set = (key: "title" | "blurb" | "look" | "sound" | "genres") => (value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const open = () => { setDraft({ ...original, genres: tagsText(genres) }); setEditing(true); };
  const save = () => { if (Object.keys(patch).length) onEdit?.(patch); setEditing(false); };
  const byId = new Map(tracks.map((track) => [track.media_id, track]));
  const move = (index: number, by: -1 | 1) => setDraft((current) => {
    const ids = [...current.track_ids];
    const target = index + by;
    if (target < 0 || target >= ids.length) return current;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    return { ...current, track_ids: ids };
  });
  const remove = (index: number) => setDraft((current) => ({ ...current, track_ids: current.track_ids.filter((_, i) => i !== index) }));
  const subtitle = [artist, genres.length ? genres.join(" · ") : null].filter(Boolean).join(" · ");

  if (editable && editing) return <article data-slot="album" data-mode="edit" className={cn(paper, "flex w-full max-w-md flex-col gap-3 rounded-2xl p-4", className)} {...props}>
    <div className="flex items-center gap-3">
      {cover ? <SafeImage src={url(cover.src)} alt={cover.alt} className="size-20 shrink-0 rounded-lg object-cover" /> : null}
      <button type="button" onClick={() => onAction?.("remake_cover")} disabled={!onAction} className={pillButton}>{i18n._({ id: "ui.New cover", message: "New cover" })}</button>
    </div>
    <TextEdit label={i18n._({ id: "ui.Album title", message: "Album title" })} value={draft.title} onChange={set("title")} maxLength={120} />
    <TextEdit label={i18n._({ id: "ui.About the album", message: "About the album" })} value={draft.blurb} onChange={set("blurb")} maxLength={1000} multiline />
    <TextEdit label={i18n._({ id: "ui.Look", message: "Look" })} value={draft.look} onChange={set("look")} maxLength={1000} multiline hint={i18n._({ id: "ui.What the cover should look like.", message: "What the cover should look like." })} />
    <TextEdit label={i18n._({ id: "ui.Sound", message: "Sound" })} value={draft.sound} onChange={set("sound")} maxLength={1000} multiline hint={i18n._({ id: "ui.Style words for every song. Never lyrics.", message: "Style words for every song. Never lyrics." })} />
    <TagsEdit value={draft.genres} onChange={set("genres")} />
    {draft.track_ids.length ? <ol aria-label={i18n._({ id: "ui.Tracks", message: "Tracks" })} className="flex flex-col gap-1">{draft.track_ids.map((id, index) => <li key={id} data-slot="album-edit-track" className="bg-foreground/[0.04] flex min-w-0 items-center gap-1 rounded-lg py-1 pr-1 pl-3 dark:bg-foreground/[0.06]">
      <span className="text-muted-foreground w-5 shrink-0 text-xs tabular-nums">{index + 1}</span>
      <span className="min-w-0 flex-1 truncate text-[13px]">{byId.get(id)?.title ?? id}</span>
      <button type="button" aria-label={i18n._({ id: "ui.Move {title} up", message: "Move {title} up", values: { title: byId.get(id)?.title ?? i18n._({ id: "ui.track", message: "track" }) } })} disabled={index === 0} onClick={() => move(index, -1)} className={cn("flex size-8 items-center justify-center rounded-full disabled:opacity-30", pressable)}><ChevronUpIcon className="size-4" aria-hidden="true" /></button>
      <button type="button" aria-label={i18n._({ id: "ui.Move {title} down", message: "Move {title} down", values: { title: byId.get(id)?.title ?? i18n._({ id: "ui.track", message: "track" }) } })} disabled={index === draft.track_ids.length - 1} onClick={() => move(index, 1)} className={cn("flex size-8 items-center justify-center rounded-full disabled:opacity-30", pressable)}><ChevronDownIcon className="size-4" aria-hidden="true" /></button>
      <button type="button" aria-label={i18n._({ id: "ui.Remove {title} from the album", message: "Remove {title} from the album", values: { title: byId.get(id)?.title ?? i18n._({ id: "ui.track", message: "track" }) } })} onClick={() => remove(index)} className={cn("flex size-8 items-center justify-center rounded-full", pressable)}><XIcon className="size-4" aria-hidden="true" /></button>
    </li>)}</ol> : <p className="text-muted-foreground text-xs">{i18n._({ id: "ui.No tracks left on this album.", message: "No tracks left on this album." })}</p>}
    <EditActions onSave={save} onCancel={() => setEditing(false)} saveDisabled={!draft.title.trim() || !Object.keys(patch).length} />
  </article>;

  return <article data-slot="album" className={cn(paper, "flex w-full max-w-md flex-col gap-4 rounded-2xl p-4", className)} {...props}>
    <div className="flex flex-col items-center gap-3 text-center">
      {cover
        ? <SafeImage src={url(cover.src)} alt={cover.alt} className="aspect-square w-full max-w-60 rounded-xl object-cover shadow-lg" />
        : <div aria-hidden="true" className="bg-foreground/[0.06] aspect-square w-full max-w-60 rounded-xl" />}
      <div className="min-w-0 max-w-full">
        <h3 className="truncate text-xl font-bold tracking-tight">{title}</h3>
        {subtitle ? <p className="text-primary truncate text-[15px] font-medium">{subtitle}</p> : null}
        {inspiredBy ? <p className="text-muted-foreground truncate text-xs">{i18n._({ id: "ui.Inspired by {inspiredBy}", message: "Inspired by {inspiredBy}", values: { inspiredBy } })}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        {tracks.length ? <button type="button" aria-label={i18n._({ id: "ui.Play album", message: "Play album" })} onClick={() => onAction?.("play_all")} disabled={!onAction} className={cn("bg-foreground text-background flex size-12 items-center justify-center rounded-full hover:opacity-90 focus-visible:ring-ring outline-none focus-visible:ring-2 disabled:opacity-50", pressable)}><PlayIcon className="size-5 fill-current" aria-hidden="true" /></button> : null}
        {editable ? <button type="button" aria-label={i18n._({ id: "ui.Edit album", message: "Edit album" })} onClick={open} className={cn(pillButton, "flex items-center gap-1")}><PencilIcon className="size-3" aria-hidden="true" />{i18n._({ id: "ui.Edit", message: "Edit" })}</button> : null}
      </div>
    </div>
    {blurb ? <p className="text-[14px] leading-relaxed">{blurb}</p> : null}
    {tracks.length ? <ol aria-label={i18n._({ id: "ui.Tracks", message: "Tracks" })} className="flex flex-col">{tracks.map((track, index) => <li key={track.media_id} className="group border-border/40 flex min-w-0 items-center gap-3 border-t py-1 first:border-t-0">
      <button type="button" aria-label={i18n._({ id: "ui.Play {title}", message: "Play {title}", values: { title: track.title } })} onClick={() => onPlayTrack?.(track.media_id)} disabled={!onPlayTrack} className={cn("hover:bg-foreground/[0.05] focus-visible:ring-ring flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left outline-none focus-visible:ring-2 disabled:cursor-default", pressable)}>
        <span className="text-muted-foreground relative flex w-5 shrink-0 items-center justify-center text-xs tabular-nums"><span className="group-hover:invisible group-focus-within:invisible">{index + 1}</span><PlayIcon className="invisible absolute size-3.5 fill-current group-hover:visible group-focus-within:visible" aria-hidden="true" /></span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{track.title}</span>
        {track.length_s != null ? <span className="text-muted-foreground shrink-0 text-xs tabular-nums">{formatClock(track.length_s * 1000)}</span> : null}
      </button>
    </li>)}</ol> : null}
    {actions.filter((action) => action !== "play_all").length ? <div className="flex flex-wrap gap-2">{actions.filter((action) => action !== "play_all").map((action) => <button key={action} type="button" onClick={() => onAction?.(action)} disabled={!onAction} className={pillButton}>{actionLabel(action)}</button>)}</div> : null}
  </article>;
}
