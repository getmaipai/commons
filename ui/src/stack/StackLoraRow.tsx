// STACK-LORAS-01. One style in the library or the trash, and the words for its size, status and date. Kit primitives and tokens only.
import { useState } from "react";
import { Button } from "@/kit/ui/button";
import { Card } from "@/kit/ui/card";
import { getIcon } from "@/kit/icons";
import { i18n, kitLocaleTag } from "@/kit/i18n";
import type { StackLora } from "./StackClient";
import { Pill } from "./StackParts";
import { gb } from "./stackWords";

const ImageIcon = getIcon("image");
const FilmIcon = getIcon("film");

export function sizeWord(bytes: number): string {
  if (bytes >= 1024 ** 3) return gb(bytes);
  const size = new Intl.NumberFormat(kitLocaleTag(), { maximumFractionDigits: 0 }).format(Math.max(1, Math.round(bytes / 1024 ** 2)));
  return i18n._({ id: "ui.{size} MB", message: "{size} MB", values: { size } });
}

/** A date in the person's own locale; the raw stamp is never shown. */
export function dateWord(iso: string | null): string {
  if (!iso) return "";
  try { return new Intl.DateTimeFormat(kitLocaleTag(), { dateStyle: "medium" }).format(new Date(iso)); } catch { return iso; }
}

export function mediaWord(media: StackLora["media"]): string {
  return media === "video" ? i18n._({ id: "ui.Video", message: "Video" }) : i18n._({ id: "ui.Pictures", message: "Pictures" });
}

/** The status line under a style: nothing when it is ready, a plain sentence with the fix otherwise. */
export function statusSentence(lora: StackLora): string | null {
  if (lora.status === "drive_missing") return i18n._({ id: "ui.Drive not connected. Plug in {drive}, then this style works again.", message: "Drive not connected. Plug in {drive}, then this style works again.", values: { drive: lora.disk_label } });
  if (lora.status === "failed") return lora.status_note ?? i18n._({ id: "ui.The download did not finish. Add the style again.", message: "The download did not finish. Add the style again." });
  if (lora.status === "installing") return i18n._({ id: "ui.Being added now.", message: "Being added now." });
  return null;
}

/** The preview picture, or an icon when there is none or it does not load. */
export function LoraThumb({ lora, url }: { lora: StackLora; url: string | null }) {
  const [broken, setBroken] = useState(false);
  const Icon = lora.media === "video" ? FilmIcon : ImageIcon;
  return <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted text-muted-foreground">
    {url && !broken ? <img src={url} alt="" loading="lazy" className="size-full object-cover" onError={() => setBroken(true)} /> : <Icon className="size-6" />}
  </span>;
}

export interface LoraRowActions { onEdit: (lora: StackLora) => void; onMove: (lora: StackLora) => void; onRemove: (lora: StackLora) => void }

export function StackLoraRow({ lora, url, locked, redacted, actions }: { lora: StackLora; url: string | null; locked: boolean; redacted: boolean; actions: LoraRowActions }) {
  const sentence = statusSentence(lora);
  const busy = lora.status === "installing";
  const tone = lora.status === "ready" ? "ok" : lora.status === "drive_missing" ? "warn" : lora.status === "failed" ? "bad" : "primary";
  const word = lora.status === "ready" ? i18n._({ id: "ui.Ready", message: "Ready" }) : lora.status === "drive_missing" ? i18n._({ id: "ui.Drive not connected", message: "Drive not connected" }) : lora.status === "failed" ? i18n._({ id: "ui.Failed", message: "Failed" }) : i18n._({ id: "ui.Adding", message: "Adding" });
  return <Card className="gap-0 py-0"><div className="flex min-w-0 flex-wrap items-start gap-3 p-3">
    <LoraThumb lora={lora} url={url} />
    <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
      <span className="font-medium break-words">{lora.name}</span>
      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
        <Pill tone={tone}>{word}</Pill>
        <Pill>{mediaWord(lora.media)}</Pill>
        {lora.classification === "adult-only" && !redacted && <Pill tone="warn">{i18n._({ id: "ui.Adults only", message: "Adults only" })}</Pill>}
      </span>
      <span className="text-sm text-muted-foreground break-words">{[lora.base_model, sizeWord(lora.bytes), lora.disk_label].filter(Boolean).join(" · ")}</span>
      {lora.trigger_words.length > 0 && <span className="text-sm text-muted-foreground break-words">{i18n._({ id: "ui.Trigger words: {words}", message: "Trigger words: {words}", values: { words: lora.trigger_words.join(", ") } })}</span>}
      {sentence && lora.status !== "ready" && <span role={lora.status === "failed" ? "alert" : undefined} className={lora.status === "failed" ? "text-sm text-destructive" : "text-sm text-status-warning"}>{sentence}</span>}
    </div>
    <div className="flex shrink-0 flex-wrap gap-1.5">
      <Button size="sm" variant="outline" disabled={locked || busy} aria-label={i18n._({ id: "ui.Edit {style}", message: "Edit {style}", values: { style: lora.name } })} onClick={() => actions.onEdit(lora)}>{i18n._({ id: "ui.Edit", message: "Edit" })}</Button>
      <Button size="sm" variant="outline" disabled={locked || busy || lora.status === "drive_missing"} aria-label={i18n._({ id: "ui.Move {style} to another drive", message: "Move {style} to another drive", values: { style: lora.name } })} onClick={() => actions.onMove(lora)}>{i18n._({ id: "ui.Move", message: "Move" })}</Button>
      <Button size="sm" variant="ghost" disabled={locked || busy} aria-label={i18n._({ id: "ui.Remove {style}", message: "Remove {style}", values: { style: lora.name } })} onClick={() => actions.onRemove(lora)}>{i18n._({ id: "ui.Remove", message: "Remove" })}</Button>
    </div>
  </div></Card>;
}
