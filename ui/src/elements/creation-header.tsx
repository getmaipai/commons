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
import { Cover } from "../ui/media-tiles";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { i18n } from "@/kit/i18n"

export interface CreationHeaderProps {
  title: string | null | undefined; // ignored when variant is "byline" (the host card already shows the title)
  creator?: { name?: string | null; avatarUrl?: string | null; avatarSeed?: string | null; label?: string | null; href?: string | null; linkLabel?: string | null } | null;
  madeAt?: string | null;
  description?: string | null;
  headingLevel?: "h1" | "h2";
  visibility: Omit<VisibilityChipProps, "onOpen"> & { onOpen: () => void };
  variant?: "full" | "byline" | "collection" | "studio" | "hero";
  art?: string | null;
  meta?: string | null;
  primary?: { label: string; icon?: string; onSelect: () => void };
  shuffle?: { label: string; onSelect: () => void; /** An icon name from the kit set. Default "shuffle". */ icon?: string; /** Draw the label beside the icon (an outline pill), not an icon alone. */ labeled?: boolean };
  more?: Array<{ label: string; icon?: string; onSelect: () => void }>;
  /** VIDEO-STUDIO-03 (`variant: "studio"` only): the small uppercase line above the title. */
  eyebrow?: string | null;
  /** VIDEO-STUDIO-03 (`variant: "studio"` only): a quiet pill beside `primary` on the end side. */
  secondary?: { label: string; icon?: string; onSelect: () => void };
  /** VIDEO-STUDIO-03 (`variant: "studio"` only): draw no art, eyebrow or title (an adult-only item while the lock is on); the actions stay. */
  locked?: boolean;
  stats?: { label: string; value: string }[];
  accent?: string;
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

export function CreationHeader({ title, creator, madeAt, description, headingLevel = "h1", visibility, variant = "full", art, meta, primary, shuffle, more = [], eyebrow, secondary, locked = false, stats, accent = "var(--accent-hero)" }: CreationHeaderProps) {
  const [expanded, setExpanded] = useState(false);
  const homeLabel = plain(creator?.label, i18n._({ id: "ui.Made at home", message: "Made at home" }));
  const creatorName = plain(creator?.name, homeLabel);
  const isHome = creatorName === homeLabel;
  const creatorHref = creator?.href && !/\{[^{}]+\}/.test(creator.href) ? creator.href : null;
  const Icon = getIcon("home");
  const Heading = headingLevel;
  const date = formattedDate(madeAt);
  const detail = description?.trim() && !/\{[^{}]+\}/.test(description) ? description.trim() : null;
  if (variant === "hero") {
    const artSrc = art && !/\{[^{}]+\}/.test(art) ? art : null;
    const HeroShuffle = shuffle ? getIcon(shuffle.icon ?? "shuffle") : null;
    const HeroMore = getIcon("more-horizontal");
    const creatorLine = [creator?.name, madeAt, meta].filter((part): part is string => Boolean(part?.trim())).join(" · ");
    return <header data-slot="creation-header" data-variant="hero" className="relative isolate flex min-h-[26rem] flex-col justify-end overflow-hidden px-6 pb-8 pt-20 md:min-h-[22rem]">
      <div data-slot="creation-header-art" aria-hidden className="absolute inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: artSrc ? `url(${JSON.stringify(artSrc).slice(1, -1)})` : `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 45%, transparent))` }} />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[image:var(--scrim-hero)]" />
      <div className="flex flex-col items-start gap-3">
        {eyebrow ? <span className="text-[13px] text-[color:var(--art-foreground)]/75">{eyebrow}</span> : null}
        <Heading className="text-[length:var(--font-size-hero)] font-[var(--font-weight-hero)] tracking-tight text-[color:var(--art-foreground)]">{plain(title, i18n._({ id: "ui.Untitled", message: "Untitled" }))}</Heading>
        {creatorLine ? <p className="text-sm text-[color:var(--art-foreground)]/75">{creatorLine}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          {primary ? <Button type="button" variant="inverse" shape="pill" onClick={primary.onSelect}>{primary.icon ? (() => { const ActionIcon = getIcon(primary.icon); return <ActionIcon aria-hidden className="size-4" />; })() : null}{primary.label}</Button> : null}
          {shuffle && HeroShuffle ? <Button type="button" variant="glass" size="icon-control" aria-label={shuffle.label} onClick={shuffle.onSelect}><HeroShuffle aria-hidden /></Button> : null}
          {more.length ? <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="glass" size="icon-control" aria-label={more[0]?.label ?? i18n._({ id: "ui.More", message: "More" })}><HeroMore aria-hidden /></Button></DropdownMenuTrigger><DropdownMenuContent align="start">{more.map((item, index) => <DropdownMenuItem key={`${item.label}-${index}`} onSelect={item.onSelect}>{item.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu> : null}
        </div>
        {stats?.length ? <div className="flex flex-wrap gap-x-8 gap-y-3">{stats.map((stat, index) => <div key={`${stat.label}-${index}`} className="flex flex-col"><span className="text-xl font-semibold text-[color:var(--art-foreground)]">{stat.value}</span><span className="text-[13px] text-[color:var(--art-foreground)]/75">{stat.label}</span></div>)}</div> : null}
      </div>
    </header>;
  }
  if (variant === "studio") {
    const eyebrowText = eyebrow?.trim() && !/\{[^{}]+\}/.test(eyebrow) ? eyebrow.trim() : null;
    const artSrc = art && !/\{[^{}]+\}/.test(art) ? art : null;
    const pill = (action: NonNullable<CreationHeaderProps["primary"]>, kind: "default" | "secondary") => {
      const ActionIcon = action.icon ? getIcon(action.icon) : null;
      return <Button type="button" variant={kind} size="lg" shape="pill" onClick={action.onSelect}>{ActionIcon ? <ActionIcon aria-hidden className="size-4" /> : null}{action.label}</Button>;
    };
    return (
      <header data-slot="creation-header" data-variant="studio" data-locked={locked ? "true" : undefined} className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-3">
        {!locked && artSrc ? <div data-slot="creation-header-art" aria-hidden className="size-14 shrink-0 overflow-hidden rounded-xl sm:size-[4.5rem]"><Cover id={artSrc} title="" url={artSrc} bare /></div> : null}
        {locked ? null : (
          <div className="flex min-w-0 flex-1 basis-60 flex-col gap-1">
            {eyebrowText ? <span data-slot="creation-header-eyebrow" className="text-muted-foreground text-xs font-semibold">{eyebrowText}</span> : null}
            <Heading className="text-foreground min-w-0 text-2xl leading-tight font-semibold tracking-tight break-words sm:text-3xl">{plain(title, i18n._({ id: "ui.Untitled", message: "Untitled" }))}</Heading>
          </div>
        )}
        {primary || secondary ? <div data-slot="creation-header-actions" className="ms-auto flex flex-wrap items-center gap-2">{secondary ? pill(secondary, "secondary") : null}{primary ? pill(primary, "default") : null}</div> : null}
      </header>
    );
  }
  if (variant === "collection") return (
    <header data-slot="creation-header" data-variant="collection" className="grid gap-5 sm:grid-cols-[15rem_minmax(0,1fr)] sm:items-end">
      <SafeImage src={art ?? undefined} kind="picture" alt="" className="mx-auto aspect-square w-60 rounded-[var(--art-radius)] object-cover sm:mx-0" />
      <div className="flex min-w-0 flex-col items-center gap-3 text-center sm:items-start sm:text-start">
        <Heading className="text-3xl font-bold tracking-tight text-foreground">{plain(title, i18n._({ id: "ui.Untitled", message: "Untitled" }))}</Heading>
        <span className="inline-flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          {creatorHref && !isHome ? <Link to={creatorHref} aria-label={plain(creator?.linkLabel, i18n._({ id: "ui.{creatorName}, open profile", message: "{creatorName}, open profile", values: { creatorName } }))} className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">{creatorName}</Link> : <span>{creatorName}</span>}
        </span>
        {meta ? <p className="text-sm text-muted-foreground">{meta}</p> : null}
        <VisibilityChip {...visibility} />
        {detail ? <div><div className={expanded ? "text-base text-muted-foreground" : "line-clamp-3 text-base text-muted-foreground"}><LightMarkdown text={detail} /></div><Button type="button" variant="link" height="auto" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? i18n._({ id: "ui.Show less", message: "Show less" }) : i18n._({ id: "ui.Show more", message: "Show more" })}</Button></div> : null}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          {primary ? <Button type="button" onClick={primary.onSelect}>{primary.icon ? (() => { const ActionIcon = getIcon(primary.icon); return <ActionIcon aria-hidden className="size-4" />; })() : null}{primary.label}</Button> : null}
          {shuffle ? (() => { const ShuffleIcon = getIcon(shuffle.icon ?? "shuffle"); return shuffle.labeled
            ? <Button type="button" variant="outline" onClick={shuffle.onSelect}><ShuffleIcon aria-hidden />{shuffle.label}</Button>
            : <Button type="button" variant="outline" size="icon" aria-label={shuffle.label} onClick={shuffle.onSelect}><ShuffleIcon aria-hidden /></Button>; })() : null}
          {more.length ? <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" size="icon" aria-label={i18n._({ id: "ui.More", message: "More" })}>{(() => { const MoreIcon = getIcon("more-horizontal"); return <MoreIcon aria-hidden />; })()}</Button></DropdownMenuTrigger><DropdownMenuContent align="start">{more.map((item, index) => <DropdownMenuItem key={`${item.label}-${index}`} onSelect={item.onSelect}>{item.icon ? (() => { const MoreIcon = getIcon(item.icon); return <MoreIcon aria-hidden className="size-4" />; })() : null}{item.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu> : null}
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
      {variant === "full" ? <Heading className="text-3xl font-bold tracking-tight">{plain(title, i18n._({ id: "ui.Untitled", message: "Untitled" }))}</Heading> : null}
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          {creatorHref && !isHome ? <Link to={creatorHref} aria-label={plain(creator?.linkLabel, i18n._({ id: "ui.{creatorName}, open profile", message: "{creatorName}, open profile", values: { creatorName } }))} className="inline-flex min-w-0 items-center gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">{identity}</Link> : identity}
          {date ? <><span aria-hidden>·</span><time dateTime={madeAt ?? undefined}>{i18n._({ id: "ui.Made {date}", message: "Made {date}", values: { date } })}</time></> : null}
        </span>
        <VisibilityChip {...visibility} />
      </div>
      {variant === "full" && detail ? (
        <div>
          <div className={expanded ? "text-base text-muted-foreground" : "line-clamp-3 text-base text-muted-foreground"}><LightMarkdown text={detail} /></div>
          <Button type="button" variant="link" height="auto" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? i18n._({ id: "ui.Show less", message: "Show less" }) : i18n._({ id: "ui.Show more", message: "Show more" })}</Button>
        </div>
      ) : null}
    </header>
  );
}
