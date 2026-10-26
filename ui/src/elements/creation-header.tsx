import { useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { getIcon } from "../icons";
import { absoluteTime } from "../format";
import { VisibilityChip, type VisibilityChipProps } from "./visibility-chip";
import { diceBearAvatarUri } from "../primitives/Avatar";

export interface CreationHeaderProps {
  title: string | null | undefined; // ignored when variant is "byline" (the host card already shows the title)
  creator?: { name?: string | null; avatarUrl?: string | null; avatarSeed?: string | null; label?: string | null; href?: string | null; linkLabel?: string | null } | null;
  madeAt?: string | null;
  description?: string | null;
  headingLevel?: "h1" | "h2";
  visibility: Omit<VisibilityChipProps, "onOpen"> & { onOpen: () => void };
  variant?: "full" | "byline";
}

function plain(value: string | null | undefined, fallback: string) {
  const result = typeof value === "string" ? value.trim() : "";
  return !result || /\{[^{}]+\}/.test(result) ? fallback : result;
}

function formattedDate(value?: string | null) {
  if (!value || /\{[^{}]+\}/.test(value)) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return absoluteTime(value);
}

export function CreationHeader({ title, creator, madeAt, description, headingLevel = "h1", visibility, variant = "full" }: CreationHeaderProps) {
  const [expanded, setExpanded] = useState(false);
  const homeLabel = plain(creator?.label, "Made at home");
  const creatorName = plain(creator?.name, homeLabel);
  const isHome = creatorName === homeLabel;
  const Icon = getIcon("home");
  const Heading = headingLevel;
  const date = formattedDate(madeAt);
  const detail = description?.trim() && !/\{[^{}]+\}/.test(description) ? description.trim() : null;
  const creatorHref = creator?.href && !/\{[^{}]+\}/.test(creator.href) ? creator.href : null;
  const identity = (
    <>
      {isHome ? <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground"><Icon className="size-4" /></span> : (
        <Avatar aria-hidden>
          {(() => {
            const src = creator?.avatarUrl ?? (creator?.avatarSeed ? diceBearAvatarUri(creator.avatarSeed) : null);
            return src ? <AvatarImage src={src} alt="" /> : null;
          })()}
          <AvatarFallback>{creatorName.trim().slice(0, 1).toUpperCase() || "?"}</AvatarFallback>
        </Avatar>
      )}
      <span className="truncate">{creatorName}</span>
    </>
  );
  return (
    <header data-slot="creation-header" data-variant={variant} className="grid gap-3">
      {variant === "full" ? <Heading className="text-3xl font-bold tracking-tight">{plain(title, "Untitled")}</Heading> : null}
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          {creatorHref && !isHome ? <Link to={creatorHref} aria-label={plain(creator?.linkLabel, `${creatorName}, open profile`)} className="inline-flex min-w-0 items-center gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">{identity}</Link> : identity}
          {date ? <><span aria-hidden>·</span><time dateTime={madeAt ?? undefined}>Made {date}</time></> : null}
        </span>
        <VisibilityChip {...visibility} />
      </div>
      {variant === "full" && detail ? (
        <div>
          <p className={expanded ? "text-base text-muted-foreground" : "line-clamp-3 text-base text-muted-foreground"}>{detail}</p>
          <Button type="button" variant="link" height="auto" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? "Show less" : "Show more"}</Button>
        </div>
      ) : null}
    </header>
  );
}
