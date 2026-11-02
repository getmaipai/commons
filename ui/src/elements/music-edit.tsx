"use client";

import { useId, type ReactNode } from "react";
import { cn } from "cn";
import { Input } from "@/kit/ui/input";
import { Textarea } from "@/kit/ui/textarea";
import { pressable } from "./surfaces";

/**
 * MUSIC-STUDIO-EDIT: the one set of inline-edit parts the Band, Album and SongStyle
 * cards share (one definition). A card in edit mode keeps a draft, and Save reports
 * only the fields that changed (`diffPatch`), so chat can run the edit tool with
 * exactly what the person touched.
 */

export const MAX_GENRES = 8;

/** "lo-fi, dream pop" -> ["lo-fi", "dream pop"]: trimmed, no empties, no repeats, at most eight, each at most 40 characters. */
export function parseTags(text: string): string[] {
  const seen = new Set<string>();
  for (const part of text.split(",")) {
    const tag = part.trim().slice(0, 40);
    if (tag) seen.add(tag);
  }
  return [...seen].slice(0, MAX_GENRES);
}

export const tagsText = (tags: readonly string[] | undefined) => (tags ?? []).join(", ");

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** The entries of `draft` that differ from `original`. An empty object means nothing changed. */
export function diffPatch<T extends Record<string, unknown>>(original: T, draft: T): Partial<T> {
  const patch: Partial<T> = {};
  for (const key of Object.keys(draft) as (keyof T)[]) if (!same(original[key], draft[key])) patch[key] = draft[key];
  return patch;
}

export const pillButton = cn("border-border/70 hover:bg-foreground/[0.05] focus-visible:ring-ring rounded-full border px-3 py-1.5 text-xs font-medium outline-none focus-visible:ring-2 disabled:cursor-default", pressable);
export const inkPill = cn("bg-foreground text-background hover:opacity-90 focus-visible:ring-ring rounded-full px-4 py-1.5 text-xs font-medium outline-none focus-visible:ring-2 disabled:cursor-default disabled:opacity-50", pressable);

export function EditField({ label, hint, children }: { label: string; hint?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return <div data-slot="edit-field" className="flex min-w-0 flex-col gap-1">
    <label htmlFor={id} className="text-xs font-medium">{label}</label>
    {children(id)}
    {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
  </div>;
}

export function TextEdit({ label, value, onChange, maxLength, multiline, hint }: { label: string; value: string; onChange: (value: string) => void; maxLength?: number; multiline?: boolean; hint?: string }) {
  return <EditField label={label} hint={hint}>{(id) => multiline
    ? <Textarea id={id} value={value} maxLength={maxLength} rows={3} maxRows={8} onChange={(event) => onChange(event.target.value)} />
    : <Input id={id} value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} />}</EditField>;
}

export function TagsEdit({ label = "Style tags", value, onChange }: { label?: string; value: string; onChange: (value: string) => void }) {
  return <TextEdit label={label} value={value} onChange={onChange} hint="Separate with commas. Up to eight." />;
}

export function EditActions({ onSave, onCancel, saveDisabled, saveLabel = "Save", cancelLabel = "Cancel" }: { onSave: () => void; onCancel: () => void; saveDisabled?: boolean; saveLabel?: string; cancelLabel?: string }) {
  return <div data-slot="edit-actions" className="flex flex-wrap justify-end gap-2 pt-1">
    <button type="button" onClick={onCancel} className={pillButton}>{cancelLabel}</button>
    <button type="button" onClick={onSave} disabled={saveDisabled} className={inkPill}>{saveLabel}</button>
  </div>;
}
