"use client";

import { useId, useState } from "react";
import { AlertCircleIcon, CheckIcon, Loader2Icon, PencilIcon, SparklesIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { Textarea } from "../ui/textarea";
import { SafeImage } from "../primitives/SafeImage";
import { i18n } from "@/kit/i18n";

export type ProposalPictureBadge = "from_photo" | "guessed";

export interface ProposalPicture {
  id: string;
  src: string;
  alt: string;
  /** Where the picture came from. Drawn as a small pill with an icon and words, so color is never the only signal. */
  badge?: ProposalPictureBadge;
  caption?: string;
}

export interface ProposalAction {
  /** Replaces the default label. */
  label?: string;
  onSelect: () => void;
  disabled?: boolean;
  /** The action is running: the button shows a spinner and cannot be pressed again. */
  busy?: boolean;
}

export interface ProposalCardLabels {
  fromPhoto: string;
  guessed: string;
  making: string;
  saving: string;
  edit: string;
  editDescription: string;
  done: string;
  description: string;
  pictures: string;
}

export interface ProposalCardProps {
  title: string;
  description: string;
  /** Without this the description is plain text with no Edit button. */
  onDescriptionChange?: (value: string) => void;
  pictures: readonly ProposalPicture[];
  /** "making" shows placeholder pictures; "saving" shows the Save button busy and locks everything else. */
  status?: "ready" | "making" | "saving";
  /** Save this look (default label "Save this look"). */
  approve?: ProposalAction;
  /** Ask for another proposal (default label "Try another guess"). */
  change?: ProposalAction;
  /** Throw this proposal away (default label "Discard"). */
  discard?: ProposalAction;
  /** One sentence on what a match can and cannot prove. */
  note?: string;
  /** What went wrong and what to do next. */
  errorMessage?: string;
  /** How many placeholder pictures to draw while making. */
  placeholderCount?: number;
  labels?: Partial<ProposalCardLabels>;
  className?: string;
}

function defaultLabels(): ProposalCardLabels {
  return {
    fromPhoto: i18n._({ id: "ui.Matches your photo", message: "Matches your photo" }),
    guessed: i18n._({ id: "ui.Guessed by MaiPai", message: "Guessed by MaiPai" }),
    making: i18n._({ id: "ui.Making the pictures", message: "Making the pictures" }),
    saving: i18n._({ id: "ui.Saving", message: "Saving" }),
    edit: i18n._({ id: "ui.Edit", message: "Edit" }),
    editDescription: i18n._({ id: "ui.Edit description", message: "Edit description" }),
    done: i18n._({ id: "ui.Done", message: "Done" }),
    description: i18n._({ id: "ui.Description", message: "Description" }),
    pictures: i18n._({ id: "ui.Pictures", message: "Pictures" }),
  };
}

function gridCell(index: number) {
  return index === 0 ? "col-span-3" : "";
}

/** K3: a proposed look to review: pictures, an editable description and the choices to save, change or discard it. */
export function ProposalCard({ title, description, onDescriptionChange, pictures, status = "ready", approve, change, discard, note, errorMessage, placeholderCount = 3, labels, className }: ProposalCardProps) {
  const text = { ...defaultLabels(), ...labels };
  const headingId = useId();
  const noteId = useId();
  const [editing, setEditing] = useState(false);
  const making = status === "making";
  const saving = status === "saving";
  const locked = making || saving;
  const canEdit = Boolean(onDescriptionChange);
  const badgeText = (badge: ProposalPictureBadge) => (badge === "from_photo" ? text.fromPhoto : text.guessed);
  const run = (a: ProposalAction | undefined, fallback: string, extra = false) => {
    if (!a) return null;
    return { label: a.label ?? fallback, onSelect: a.onSelect, busy: Boolean(a.busy), disabled: Boolean(a.disabled) || locked || Boolean(a.busy) || extra };
  };
  const approveAction = run(approve, i18n._({ id: "ui.Save this look", message: "Save this look" }), pictures.length === 0);
  const changeAction = run(change, i18n._({ id: "ui.Try another guess", message: "Try another guess" }));
  const discardAction = run(discard, i18n._({ id: "ui.Discard", message: "Discard" }));
  const placeholders = Math.max(1, placeholderCount);

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={locked || undefined}
      data-slot="proposal-card"
      data-status={status}
      className={cn("flex w-full min-w-0 flex-col gap-4 rounded-[var(--radius-card)] border border-border bg-card p-4 text-card-foreground sm:p-5", className)}
    >
      <h3 id={headingId} className="min-w-0 text-lg font-semibold leading-snug">{title}</h3>

      {making ? (
        <div data-slot="proposal-card-pictures" role="status" className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: placeholders }, (_, index) => (
              <Skeleton key={index} animation="shimmer" tone="surface" className={cn(index === 0 ? "aspect-[4/3] w-full rounded-xl" : "aspect-square w-full rounded-xl", gridCell(index))} />
            ))}
          </div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon aria-hidden className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
            {text.making}
          </p>
        </div>
      ) : pictures.length > 0 ? (
        <ul data-slot="proposal-card-pictures" aria-label={text.pictures} className="grid list-none grid-cols-3 gap-x-2 gap-y-3 p-0">
          {pictures.map((picture, index) => (
            <li key={picture.id} data-slot="proposal-card-picture" className={cn("min-w-0", gridCell(index))}>
              <figure className="m-0 flex flex-col gap-1.5">
                <div className="relative overflow-hidden rounded-xl">
                  <SafeImage src={picture.src} alt={picture.alt} tintSeed={picture.alt} className={cn("w-full object-cover", index === 0 ? "aspect-[4/3]" : "aspect-square")} />
                </div>
                {picture.badge ? (
                  <span data-slot="proposal-card-badge" data-badge={picture.badge} className="inline-flex w-fit max-w-full items-start gap-1 text-xs font-medium leading-tight text-muted-foreground">
                    {picture.badge === "from_photo" ? <CheckIcon aria-hidden className="mt-px size-3 shrink-0 text-foreground" /> : <SparklesIcon aria-hidden className="mt-px size-3 shrink-0" />}
                    <span className="min-w-0">{badgeText(picture.badge)}</span>
                  </span>
                ) : null}
                {picture.caption ? <figcaption className="text-sm text-muted-foreground">{picture.caption}</figcaption> : null}
              </figure>
            </li>
          ))}
        </ul>
      ) : null}

      <div data-slot="proposal-card-description" className="flex flex-col gap-2">
        {editing && canEdit ? (
          <>
            <Textarea aria-label={text.description} value={description} disabled={locked} onChange={(event) => onDescriptionChange?.(event.target.value)} />
            <Button type="button" variant="outline" className="min-h-12 self-start" onClick={() => setEditing(false)}>
              <CheckIcon aria-hidden className="size-4" />
              {text.done}
            </Button>
          </>
        ) : (
          <>
            <p className="min-w-0 whitespace-pre-line text-base leading-relaxed">{description}</p>
            {canEdit ? (
              <Button type="button" variant="ghost" className="min-h-12 self-start" disabled={locked} aria-label={text.editDescription} onClick={() => setEditing(true)}>
                <PencilIcon aria-hidden className="size-4" />
                {text.edit}
              </Button>
            ) : null}
          </>
        )}
      </div>

      {note ? <p id={noteId} data-slot="proposal-card-note" className="text-sm text-muted-foreground">{note}</p> : null}

      {errorMessage ? (
        <p role="alert" data-slot="proposal-card-error" className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircleIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0">{errorMessage}</span>
        </p>
      ) : null}

      {approveAction || changeAction || discardAction ? (
        <div data-slot="proposal-card-actions" className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {approveAction ? (
            <Button type="button" className="min-h-12 px-6" disabled={approveAction.disabled} aria-busy={saving || approve?.busy || undefined} aria-describedby={note ? noteId : undefined} onClick={approveAction.onSelect}>
              {saving || approveAction.busy ? <Loader2Icon aria-hidden className="size-4 animate-spin motion-reduce:animate-none" /> : null}
              {saving ? text.saving : approveAction.label}
            </Button>
          ) : null}
          {changeAction ? (
            <Button type="button" variant="outline" className="min-h-12" disabled={changeAction.disabled} aria-busy={change?.busy || undefined} onClick={changeAction.onSelect}>
              {changeAction.busy ? <Loader2Icon aria-hidden className="size-4 animate-spin motion-reduce:animate-none" /> : null}
              {changeAction.label}
            </Button>
          ) : null}
          {discardAction ? (
            <Button type="button" variant="ghost" className="min-h-12" disabled={discardAction.disabled} aria-busy={discard?.busy || undefined} onClick={discardAction.onSelect}>
              {discardAction.busy ? <Loader2Icon aria-hidden className="size-4 animate-spin motion-reduce:animate-none" /> : null}
              {discardAction.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
