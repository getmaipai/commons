import { useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { getIcon } from "../icons";
import { absoluteTime } from "../format";
import { LightMarkdown } from "./light-markdown";
import { VisibilityChip, type VisibilityChipProps } from "./visibility-chip";
import { diceBearAvatarUri } from "../primitives/Avatar";
import { SafeImage } from "../primitives/SafeImage";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";

export interface CreationHeaderProps {
  title: string | null | undefined; // ignored when variant is "byline" (the host card already shows the title)
  creator?: { name?: string | null; avatarUrl?: string | null; avatarSeed?: string | null; label?: string | null; href?: string | null; linkLabel?: string | null } | null;
  madeAt?: string | null;
  description?: string | null;
  headingLevel?: "h1" | "h2";
  visibility: Omit<VisibilityChipProps, "onOpen"> & { onOpen: () => void };
  variant?: "full" | "byline" | "collection";
  art?: string | null;
  meta?: string | null;
  primary?: { label: string; icon?: string; onSelect: () => void };
  shuffle?: { label: string; onSelect: () => void };
  more?: Array<{ label: string; icon?: string; onSelect: () => void }>;
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

export function CreationHeader({ title, creator, madeAt, description, headingLevel = "h1", visibility, variant = "full", art, meta, primary, shuffle, more = [] }: CreationHeaderProps) {
  const [expanded, setExpanded] = useState(false);
  const homeLabel = plain(creator?.label, "Made at home");
  const creatorName = plain(creator?.name, homeLabel);
  const isHome = creatorName === homeLabel;
  const creatorHref = creator?.href && !/\{[^{}]+\}/.test(creator.href) ? creator.href : null;
  const Icon = getIcon("home");
  const Heading = headingLevel;
  const date = formattedDate(madeAt);
  const detail = description?.trim() && !/\{[^{}]+\}/.test(description) ? description.trim() : null;
  if (variant === "collection") return (
    <header data-slot="creation-header" data-variant="collection" className="grid gap-5 sm:grid-cols-[15rem_minmax(0,1fr)] sm:items-end">
      <SafeImage src={art ?? undefined} kind="picture" alt="" className="mx-auto aspect-square w-60 rounded-[var(--art-radius)] object-cover sm:mx-0" />
      <div className="flex min-w-0 flex-col items-center gap-3 text-center sm:items-start sm:text-start">
        <Heading className="text-3xl font-bold tracking-tight text-foreground">{plain(title, "Untitled")}</Heading>
        <span className="inline-flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          {creatorHref && !isHome ? <Link to={creatorHref} aria-label={plain(creator?.linkLabel, `${creatorName}, open profile`)} className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">{creatorName}</Link> : <span>{creatorName}</span>}
        </span>
        {meta ? <p className="text-sm text-muted-foreground">{meta}</p> : null}
        <VisibilityChip {...visibility} />
        {detail ? <div><div className={expanded ? "text-base text-muted-foreground" : "line-clamp-3 text-base text-muted-foreground"}><LightMarkdown text={detail} /></div><Button type="button" variant="link" height="auto" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "Show less" : "Show more"}</Button></div> : null}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          {primary ? <Button type="button" onClick={primary.onSelect}>{primary.icon ? (() => { const ActionIcon = getIcon(primary.icon); return <ActionIcon aria-hidden className="size-4" />; })() : null}{primary.label}</Button> : null}
          {shuffle ? (() => { const ShuffleIcon = getIcon("shuffle"); return <Button type="button" variant="outline" size="icon" aria-label={shuffle.label} onClick={shuffle.onSelect}><ShuffleIcon aria-hidden /></Button>; })() : null}
          {more.length ? <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" size="icon" aria-label="More">{(() => { const MoreIcon = getIcon("more-horizontal"); return <MoreIcon aria-hidden />; })()}</Button></DropdownMenuTrigger><DropdownMenuContent align="start">{more.map((item, index) => <DropdownMenuItem key={`${item.label}-${index}`} onSelect={item.onSelect}>{item.icon ? (() => { const MoreIcon = getIcon(item.icon); return <MoreIcon aria-hidden className="size-4" />; })() : null}{item.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu> : null}
        </div>
      </div>
    </header>
  );
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
          <div className={expanded ? "text-base text-muted-foreground" : "line-clamp-3 text-base text-muted-foreground"}><LightMarkdown text={detail} /></div>
          <Button type="button" variant="link" height="auto" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? "Show less" : "Show more"}</Button>
        </div>
      ) : null}
    </header>
  );
}
