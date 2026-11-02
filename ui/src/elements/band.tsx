"use client";

import { useState, type ComponentProps } from "react";
import { PencilIcon } from "lucide-react";
import { cn } from "cn";
import { SafeImage } from "../primitives/SafeImage";
import { paper } from "./surfaces";
import { EditActions, TagsEdit, TextEdit, diffPatch, parseTags, pillButton, tagsText } from "./music-edit";

export interface BandImage { src: string; alt: string }
export interface BandMember { name: string; role: string; portrait?: BandImage }
export type BandAction = "make_album" | "remake_logo" | "remake_portrait" | "keep" | "remake" | "discard" | "open_app";
/** The fields an edit can change. Save reports only the ones that changed (action `edit_band`). */
export interface BandPatch { name?: string; backstory?: string; look?: string; sound?: string; genres?: string[] }

/**
 * MUSIC-LISTEN-C5: the chat card for a band the household made. A portrait,
 * the logo, the name, a short back story, the members and the first single
 * to judge. Actions are semantic names; the card never carries a route.
 * Names and stories are a person's own words: the card only shows them.
 *
 * MUSIC-STUDIO-EDIT: `editable` adds an Edit button; `defaultEditing` opens the
 * card already in edit mode. Edit mode makes name, back story, look, sound and
 * style tags fields, and the portrait and logo get "New picture" buttons that
 * report the existing `remake_portrait` and `remake_logo` actions. Save calls
 * `onEdit` with only the changed fields.
 */
export function Band({ name, backstory, genres = [], portrait, logo, members = [], inspiredBy, singleTitle, look = "", sound = "", actions, onAction, editable, defaultEditing, onEdit, resolveImageSrc, className, ...props }: Omit<ComponentProps<"div">, "children" | "title" | "translate"> & {
  name: string; backstory?: string; genres?: readonly string[]; portrait?: BandImage; logo?: BandImage;
  members?: readonly BandMember[]; inspiredBy?: string; singleTitle?: string; look?: string; sound?: string; actions: readonly BandAction[];
  onAction?: (action: BandAction) => void; resolveImageSrc?: (src: string) => string;
  editable?: boolean; defaultEditing?: boolean; onEdit?: (patch: BandPatch) => void;
}) {
  const url = (src: string) => (resolveImageSrc ? resolveImageSrc(src) : src);
  const [editing, setEditing] = useState(Boolean(editable && defaultEditing));
  const original = { name, backstory: backstory ?? "", look, sound, genres: [...genres] };
  const [draft, setDraft] = useState({ ...original, genres: tagsText(genres) });
  const patch = diffPatch(original, { ...draft, genres: parseTags(draft.genres) });
  const set = (key: keyof typeof draft) => (value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const open = () => { setDraft({ ...original, genres: tagsText(genres) }); setEditing(true); };
  const save = () => { if (Object.keys(patch).length) onEdit?.(patch); setEditing(false); };
  const remake = (action: BandAction, label: string) => <button type="button" onClick={() => onAction?.(action)} disabled={!onAction} className={pillButton}>{label}</button>;

  if (editable && editing) return <article data-slot="band" data-mode="edit" className={cn(paper, "flex w-full max-w-md flex-col gap-3 rounded-2xl p-4", className)} {...props}>
    <TextEdit label="Band name" value={draft.name} onChange={set("name")} maxLength={120} />
    <TextEdit label="About the band" value={draft.backstory} onChange={set("backstory")} maxLength={4000} multiline />
    <TextEdit label="Look" value={draft.look} onChange={set("look")} maxLength={1000} multiline hint="What the band picture and logo should look like." />
    <TextEdit label="Sound" value={draft.sound} onChange={set("sound")} maxLength={1000} multiline hint="Style words for every song. Never lyrics." />
    <TagsEdit value={draft.genres} onChange={set("genres")} />
    <div className="flex flex-wrap gap-2">{remake("remake_portrait", "New band picture")}{remake("remake_logo", "New logo")}</div>
    <EditActions onSave={save} onCancel={() => setEditing(false)} saveDisabled={!draft.name.trim() || !Object.keys(patch).length} />
  </article>;

  return <article data-slot="band" className={cn(paper, "flex w-full max-w-md flex-col gap-3 rounded-2xl p-4", className)} {...props}>
    {portrait ? <SafeImage src={url(portrait.src)} alt={portrait.alt} className="aspect-[4/3] w-full rounded-xl object-cover" /> : null}
    <div className="flex min-w-0 items-center gap-3">
      {logo ? <SafeImage src={url(logo.src)} alt={logo.alt} className="size-14 shrink-0 rounded-xl object-cover" /> : null}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[16px] font-semibold">{name}</h3>
        {genres.length ? <p className="text-muted-foreground truncate text-xs">{genres.join(" · ")}</p> : null}
        {inspiredBy ? <p className="text-muted-foreground truncate text-xs">Inspired by {inspiredBy}</p> : null}
      </div>
      {editable ? <button type="button" aria-label="Edit band" onClick={open} className={cn(pillButton, "flex shrink-0 items-center gap-1")}><PencilIcon className="size-3" aria-hidden="true" />Edit</button> : null}
    </div>
    {backstory ? <p className="text-[14px] leading-relaxed">{backstory}</p> : null}
    {members.length ? <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs">{members.map((member) => <li key={`${member.name}:${member.role}`} className="flex min-w-0 items-center gap-2">
      {member.portrait ? <SafeImage src={url(member.portrait.src)} alt={member.portrait.alt} className="size-8 shrink-0 rounded-full object-cover" /> : null}
      <span className="min-w-0"><span className="block truncate font-medium">{member.name}</span><span className="text-muted-foreground block truncate">{member.role}</span></span>
    </li>)}</ul> : null}
    {singleTitle ? <p data-slot="band-single" className="border-border/70 rounded-xl border px-3 py-2 text-xs"><span className="text-muted-foreground">First single</span> <span className="font-medium">{singleTitle}</span></p> : null}
    {actions.length ? <div className="flex flex-wrap gap-2 pt-1">{actions.map((action) => <button key={action} type="button" onClick={() => onAction?.(action)} disabled={!onAction} className={pillButton}>{action.replaceAll("_", " ")}</button>)}</div> : null}
  </article>;
}
