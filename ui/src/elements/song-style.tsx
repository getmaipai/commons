"use client";

import { useState, type ComponentProps } from "react";
import { PencilIcon } from "lucide-react";
import { cn } from "cn";
import { Input } from "@/kit/ui/input";
import { paper } from "./surfaces";
import { EditActions, EditField, TagsEdit, TextEdit, diffPatch, parseTags, pillButton, tagsText } from "./music-edit";
import { formatClock } from "./video-player";
import { i18n } from "@/kit/i18n";

export type SongStyleAction = "make_song" | "save" | "discard" | "open_app";
/** The fields an edit can change (action `edit_song_style`). A number the person clears is reported as null. */
export interface SongStylePatch { title?: string; sound?: string; genres?: string[]; instrumental?: boolean; bpm?: number | null; key?: string | null; length_s?: number | null }

const actionLabel = (action: SongStyleAction): string => {
  switch (action) {
    case "make_song": return i18n._({ id: "ui.make song", message: "make song" });
    case "save": return i18n._({ id: "ui.save", message: "save" });
    case "discard": return i18n._({ id: "ui.discard", message: "discard" });
    case "open_app": return i18n._({ id: "ui.open app", message: "open app" });
  }
};

const toNumber = (text: string): number | null => (text.trim() === "" || Number.isNaN(Number(text)) ? null : Math.round(Number(text)));

/**
 * MUSIC-STUDIO-EDIT: the chat card for a song style, a saved way a song should
 * sound: the style words (never lyrics), genre tags and a few knobs (vocals or
 * instrumental, tempo, key, length). Actions are semantic names.
 * `editable` adds an Edit button; `defaultEditing` opens it in edit mode.
 * Save calls `onEdit` with only the changed fields.
 */
export function SongStyleCard({ title, sound, genres = [], instrumental, bpm, musicKey, length_s, inspiredBy, actions, onAction, editable, defaultEditing, onEdit, className, ...props }: Omit<ComponentProps<"div">, "children" | "title" | "translate"> & {
  title: string; sound: string; genres?: readonly string[]; instrumental?: boolean; bpm?: number; musicKey?: string; length_s?: number; inspiredBy?: string;
  actions: readonly SongStyleAction[]; onAction?: (action: SongStyleAction) => void;
  editable?: boolean; defaultEditing?: boolean; onEdit?: (patch: SongStylePatch) => void;
}) {
  const [editing, setEditing] = useState(Boolean(editable && defaultEditing));
  const original = { title, sound, genres: [...genres], instrumental: Boolean(instrumental), bpm: bpm ?? null, key: musicKey ?? null, length_s: length_s ?? null };
  const fresh = () => ({ title, sound, genres: tagsText(genres), instrumental: Boolean(instrumental), bpm: bpm == null ? "" : String(bpm), key: musicKey ?? "", length_s: length_s == null ? "" : String(length_s) });
  const [draft, setDraft] = useState(fresh);
  const patch = diffPatch(original, { title: draft.title, sound: draft.sound, genres: parseTags(draft.genres), instrumental: draft.instrumental, bpm: toNumber(draft.bpm), key: draft.key.trim() || null, length_s: toNumber(draft.length_s) });
  const set = (key: "title" | "sound" | "genres" | "bpm" | "key" | "length_s") => (value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const save = () => { if (Object.keys(patch).length) onEdit?.(patch); setEditing(false); };
  const facts = [instrumental ? i18n._({ id: "ui.Instrumental", message: "Instrumental" }) : null, bpm != null ? i18n._({ id: "ui.{bpm} bpm", message: "{bpm} bpm", values: { bpm } }) : null, musicKey ?? null, length_s != null ? formatClock(length_s * 1000) : null].filter(Boolean) as string[];

  if (editable && editing) return <article data-slot="song-style" data-mode="edit" className={cn(paper, "flex w-full max-w-md flex-col gap-3 rounded-2xl p-4", className)} {...props}>
    <TextEdit label={i18n._({ id: "ui.Style name", message: "Style name" })} value={draft.title} onChange={set("title")} maxLength={80} />
    <TextEdit label={i18n._({ id: "ui.Sound", message: "Sound" })} value={draft.sound} onChange={set("sound")} maxLength={1000} multiline hint={i18n._({ id: "ui.Style words for the song. Never lyrics.", message: "Style words for the song. Never lyrics." })} />
    <TagsEdit value={draft.genres} onChange={set("genres")} />
    <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={draft.instrumental} onChange={(event) => setDraft((current) => ({ ...current, instrumental: event.target.checked }))} className="size-4" />{i18n._({ id: "ui.Instrumental, no singing", message: "Instrumental, no singing" })}</label>
    <div className="grid grid-cols-3 gap-2">
      <EditField label={i18n._({ id: "ui.Tempo (bpm)", message: "Tempo (bpm)" })}>{(id) => <Input id={id} inputMode="numeric" value={draft.bpm} onChange={(event) => set("bpm")(event.target.value)} />}</EditField>
      <EditField label={i18n._({ id: "ui.Key", message: "Key" })}>{(id) => <Input id={id} value={draft.key} placeholder={i18n._({ id: "ui.A minor", message: "A minor" })} onChange={(event) => set("key")(event.target.value)} />}</EditField>
      <EditField label={i18n._({ id: "ui.Seconds", message: "Seconds" })}>{(id) => <Input id={id} inputMode="numeric" value={draft.length_s} onChange={(event) => set("length_s")(event.target.value)} />}</EditField>
    </div>
    <EditActions onSave={save} onCancel={() => setEditing(false)} saveDisabled={!draft.title.trim() || !draft.sound.trim() || !Object.keys(patch).length} />
  </article>;

  return <article data-slot="song-style" className={cn(paper, "flex w-full max-w-md flex-col gap-3 rounded-2xl p-4", className)} {...props}>
    <div className="flex min-w-0 items-start gap-3">
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[16px] font-semibold">{title}</h3>
        {inspiredBy ? <p className="text-muted-foreground truncate text-xs">{i18n._({ id: "ui.Inspired by {inspiredBy}", message: "Inspired by {inspiredBy}", values: { inspiredBy } })}</p> : null}
      </div>
      {editable ? <button type="button" aria-label={i18n._({ id: "ui.Edit style", message: "Edit style" })} onClick={() => { setDraft(fresh()); setEditing(true); }} className={cn(pillButton, "flex shrink-0 items-center gap-1")}><PencilIcon className="size-3" aria-hidden="true" />{i18n._({ id: "ui.Edit", message: "Edit" })}</button> : null}
    </div>
    <p className="text-[14px] leading-relaxed">{sound}</p>
    {genres.length ? <ul aria-label={i18n._({ id: "ui.Style tags", message: "Style tags" })} className="flex flex-wrap gap-1.5">{genres.map((genre) => <li key={genre} className="bg-foreground/[0.06] rounded-full px-2.5 py-1 text-xs font-medium">{genre}</li>)}</ul> : null}
    {facts.length ? <p className="text-muted-foreground text-xs">{facts.join(" · ")}</p> : null}
    {actions.length ? <div className="flex flex-wrap gap-2 pt-1">{actions.map((action) => <button key={action} type="button" onClick={() => onAction?.(action)} disabled={!onAction} className={pillButton}>{actionLabel(action)}</button>)}</div> : null}
  </article>;
}
