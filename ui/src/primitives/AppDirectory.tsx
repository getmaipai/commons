import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { getIcon } from "@/kit/icons";
import { EmptyState } from "@/kit/primitives/EmptyState";
import { Button } from "@/kit/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../dashboard/components/ui/input-group";
import { cn } from "@/kit/utils";

/** One app the host lists. `favorite` is the person's own choice; `builtIn` apps are always in the rail and have no
 * star. */
export interface DirectoryApp {
  id: string;
  name: string;
  /** The route the tile opens. */
  to: string;
  /** A kit icon name (`getIcon`). */
  icon: string;
  description?: string;
  category: string;
  keywords?: readonly string[];
  favorite: boolean;
  builtIn?: boolean;
}

export interface AppDirectoryProps {
  apps: readonly DirectoryApp[];
  onToggleFavorite: (app: DirectoryApp) => void;
  /** How many favorites the rail holds. At the limit a non-favorite's star is held with the reason. */
  favoritesLimit?: number;
  /** Disables the stars while the host saves. */
  busy?: boolean;
  /** The route of the page the person came from; its tile is marked. */
  currentTo?: string;
}

/** Every word of the query must appear in the app's name, description, category or keywords. */
export function matchesApp(app: DirectoryApp, query: string): boolean {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = `${app.name} ${app.description ?? ""} ${app.category} ${(app.keywords ?? []).join(" ")}`.toLocaleLowerCase();
  return words.every((word) => haystack.includes(word));
}

const byName = (a: DirectoryApp, b: DirectoryApp) => a.name.localeCompare(b.name);

/** The sections for an empty query: Favorites first (in the person's order), then one section per category,
 * alphabetical, built-in apps last. */
export function groupApps(apps: readonly DirectoryApp[]): Array<{ heading: string; apps: DirectoryApp[] }> {
  const favorites = apps.filter((app) => app.favorite && !app.builtIn);
  const rest = apps.filter((app) => !app.favorite || app.builtIn);
  const categories = new Map<string, DirectoryApp[]>();
  for (const app of rest.filter((a) => !a.builtIn)) categories.set(app.category, [...(categories.get(app.category) ?? []), app]);
  const sections = [...categories.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([heading, list]) => ({ heading, apps: list.sort(byName) }));
  const builtIn = rest.filter((app) => app.builtIn).sort(byName);
  return [
    ...(favorites.length ? [{ heading: "Favorites", apps: favorites }] : []),
    ...sections,
    ...(builtIn.length ? [{ heading: "Built in", apps: builtIn }] : []),
  ];
}

function Tile({ app, current, starDisabled, starReason, onToggle }: { app: DirectoryApp; current: boolean; starDisabled: boolean; starReason?: string; onToggle: () => void }) {
  const Icon = getIcon(app.icon);
  const StarIcon = getIcon("star");
  const starLabel = app.favorite ? `Remove ${app.name} from favorites` : starReason ? `Add ${app.name} to favorites (${starReason})` : `Add ${app.name} to favorites`;
  return (
    <li data-slot="app-directory-tile" className="relative min-w-0">
      <Link
        to={app.to}
        data-app-tile=""
        aria-current={current ? "page" : undefined}
        className={cn(
          "flex min-h-14 min-w-0 items-center gap-3 rounded-xl border border-border bg-card py-2 pl-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          app.builtIn ? "pr-3" : "pr-12",
          current && "bg-muted",
        )}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{app.name}</span>
          {app.description ? <span className="truncate text-xs text-muted-foreground">{app.description}</span> : null}
        </span>
      </Link>
      {app.builtIn ? null : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={starLabel}
          aria-pressed={app.favorite}
          disabled={starDisabled}
          onClick={onToggle}
          className="absolute top-1/2 right-1.5 -translate-y-1/2"
        >
          <StarIcon aria-hidden fill={app.favorite ? "currentColor" : "none"} />
        </Button>
      )}
    </li>
  );
}

/** APPS-DIRECTORY-01: every installed app on one page, built to stay usable with dozens. A search box (focused on
 * open) filters as you type; with no query, Favorites come first and the rest group by category; a star on each tile
 * adds or removes a favorite; arrow keys move between tiles. Content-agnostic: the host passes the apps and saves the
 * favorite. */
export function AppDirectory({ apps, onToggleFavorite, favoritesLimit, busy, currentTo }: AppDirectoryProps) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const SearchIcon = getIcon("search");
  useEffect(() => { searchRef.current?.focus(); }, []);

  const trimmed = query.trim();
  const results = useMemo(() => apps.filter((app) => matchesApp(app, query)).sort((a, b) => Number(b.favorite) - Number(a.favorite) || byName(a, b)), [apps, query]);
  const sections = useMemo(() => (trimmed ? [{ heading: "Results", apps: results }] : groupApps(apps)), [apps, results, trimmed]);
  const favoriteCount = apps.filter((app) => app.favorite && !app.builtIn).length;
  const full = favoritesLimit !== undefined && favoriteCount >= favoritesLimit;

  function tiles(): HTMLElement[] {
    return [...(gridRef.current?.querySelectorAll<HTMLElement>("[data-app-tile]") ?? [])];
  }
  function focusTile(index: number) {
    const list = tiles();
    list[Math.max(0, Math.min(list.length - 1, index))]?.focus();
  }
  /** The tile whose centre is nearest above or below the current one in the same column, by geometry, so the keys
   * follow the real grid at any width. */
  function vertical(from: HTMLElement, direction: 1 | -1): HTMLElement | undefined {
    const rect = from.getBoundingClientRect();
    const candidates = tiles().filter((el) => {
      const r = el.getBoundingClientRect();
      return direction === 1 ? r.top > rect.top + rect.height / 2 : r.bottom < rect.bottom - rect.height / 2;
    });
    const column = (el: HTMLElement) => Math.abs(el.getBoundingClientRect().left - rect.left);
    const rowOf = (el: HTMLElement) => Math.abs(el.getBoundingClientRect().top - rect.top);
    return candidates.sort((a, b) => rowOf(a) - rowOf(b) || column(a) - column(b))[0];
  }
  function onGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (!target.hasAttribute("data-app-tile")) return;
    const list = tiles();
    const index = list.indexOf(target);
    const move = (el: HTMLElement | undefined) => { if (el) { event.preventDefault(); el.focus(); } };
    switch (event.key) {
      case "ArrowRight": move(list[index + 1]); break;
      case "ArrowLeft": if (index > 0) move(list[index - 1]); else { event.preventDefault(); searchRef.current?.focus(); } break;
      case "ArrowDown": move(vertical(target, 1)); break;
      case "ArrowUp": { const up = vertical(target, -1); if (up) move(up); else { event.preventDefault(); searchRef.current?.focus(); } break; }
      case "Home": event.preventDefault(); focusTile(0); break;
      case "End": event.preventDefault(); focusTile(list.length - 1); break;
      default:
    }
  }

  return (
    <div data-slot="app-directory" className="flex min-w-0 flex-col gap-5">
      <div className="sticky top-0 z-10 -mx-1 flex flex-col gap-2 bg-[var(--page,var(--background))] px-1 pt-1 pb-3">
        <h1 className="text-3xl font-bold tracking-tight">All apps</h1>
        <InputGroup className="h-11 max-w-xl">
          <InputGroupAddon><SearchIcon aria-hidden /></InputGroupAddon>
          <InputGroupInput
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query) { event.preventDefault(); setQuery(""); }
              if (event.key === "ArrowDown") { event.preventDefault(); focusTile(0); }
              if (event.key === "Enter" && trimmed && results.length === 1) tiles()[0]?.click();
            }}
            placeholder="Search apps"
            aria-label="Search apps"
            autoComplete="off"
            className="text-base"
          />
        </InputGroup>
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          {trimmed ? `${results.length} ${results.length === 1 ? "app matches" : "apps match"} "${trimmed}"` : `${apps.length} ${apps.length === 1 ? "app" : "apps"}`}
        </p>
      </div>

      {trimmed && results.length === 0 ? (
        <EmptyState icon="search" text={`No apps match "${trimmed}". Check the spelling or try a shorter word.`} actionLabel="Clear search" onAction={() => { setQuery(""); searchRef.current?.focus(); }} />
      ) : (
        <div ref={gridRef} role="presentation" onKeyDown={onGridKeyDown} className="flex min-w-0 flex-col gap-7">
          {sections.map((section) => (
            <section key={section.heading} aria-label={section.heading} className="flex min-w-0 flex-col gap-3">
              <h2 className="flex items-baseline gap-2 text-sm font-semibold text-muted-foreground">
                {section.heading}
                {section.heading === "Favorites" && favoritesLimit !== undefined ? <span className="font-normal">{favoriteCount} of {favoritesLimit} in the left rail</span> : null}
              </h2>
              <ul className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-3">
                {section.apps.map((app) => (
                  <Tile
                    key={app.id}
                    app={app}
                    current={currentTo === app.to}
                    starDisabled={busy === true || (!app.favorite && full)}
                    starReason={!app.favorite && full ? "the rail is full, remove one first" : undefined}
                    onToggle={() => onToggleFavorite(app)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
