import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { AlarmClock, BookOpen, Bot, Brain, Clapperboard, FileText, Globe, LayoutGrid, MessageCircle, Search as SearchIcon, Settings, SquareTerminal, Users } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { cn } from "../../../../lib/utils";
import { CommandPaletteDialog, type PaletteCommand, type PaletteTab } from "../../../../../elements/command-palette";
import SidebarContent, { type ChildItem } from "../../vertical/sidebar/sidebaritems";
import { hitArea } from "../../../../../utils";

interface FlatItem {
  key: string;
  name: string;
  url: string;
  icon?: ChildItem["icon"];
}

/** SHELL-SEARCH-02 (home, 2026-09-23): the generic shape of a caller's
 * own search results, kept deliberately app-agnostic (never home's own
 * conversation/person/app/setting record shapes) - the kit knows only
 * that a result is a labeled pointer to somewhere the caller's own app
 * can navigate, never what a result IS. `kind` is a plain label, not a
 * discriminant that changes the other fields - every result carries the
 * same shape whatever it points to. */
export interface SearchResult {
  kind: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  /** [start, end) of the first match in `title`, emphasized in the row. */
  match?: [number, number];
  /** Up to two lines of text under the title (a message excerpt, an article summary). */
  snippet?: string;
  /** Where the result lives, shown small above the title ("Wikipedia", "Library"). */
  source?: string;
  /** A line of facts under the snippet ("PDF · 24 MB · Feb 3"). */
  meta?: string;
  /** A picture URL shown at the end of the row. */
  thumbnail?: string;
  /** Text of the button shown on the highlighted row ("Open"). */
  action?: string;
}

/** What a caller's web search answers: result rows (kind "web", `href` an outside address) and, when it gave none, a plain-words
 * reason from the caller's own server ("Web search is off for this household"). The kit never works the reason out itself. */
export interface WebSearchResponse {
  results: SearchResult[];
  note?: string;
}

export interface SearchGroup {
  kind: string;
  heading: string;
  results: SearchResult[];
}

/** The same recursive descent `Search.tsx`'s own `searchItems()` already
 * makes over `SidebarContent` (a `ChildItem` may itself carry nested
 * `items`, per that type's own shape) - reused here as a flat list, not
 * a second traversal invented for this file, since the actual query
 * matching below is `cmdk`'s own (the template's own logic, not a
 * hand-rolled `.includes()`): `CommandInput`/`CommandList` filter their
 * `CommandItem` children by each one's own `value` automatically. */
function flatten(items: ChildItem[] | undefined): FlatItem[] {
  if (!items) return [];
  return items.flatMap((item) => [
    ...(item.url ? [{ key: String(item.id ?? item.url), name: item.name, url: item.url, icon: item.icon }] : []),
    ...flatten(item.items),
  ]);
}

export interface HeaderSearchProps {
  /** A caller's own search over whatever else it wants findable. Runs after two characters, 200 ms debounced; the previous
   * groups stay on screen while a new fetch is in flight. Results arrive already filtered and ranked and are shown in the
   * caller's order. A rejected promise is swallowed. */
  remote?: (query: string) => Promise<SearchGroup[]>;
  /** Shown under the empty query as "Recent": pointers the caller already ranks (e.g. the person's recent chats). */
  recents?: SearchResult[];
  /** When given, a Web tab appears. It runs this only when the person presses Enter on that tab, never while they type, so a
   * query leaves the house only by their choice. A rejected promise shows a plain "did not answer" line. */
  webSearch?: (query: string) => Promise<WebSearchResponse>;
  /** When given, a typed query gets a last "Ask" row that calls this with the text. */
  onAsk?: (query: string) => void;
  /** The app rail draws this same button as a rail icon; merged over the header's own classes. */
  triggerClassName?: string;
  /** "lg" (the default) is the ChatGPT-proportioned dialog; "default" is the small one. */
  size?: "default" | "lg";
}

/** Defaults for `recents` and `onAsk`, so an app sets them once around its layout instead of threading props through the
 * header and the rail. A prop given to `HeaderSearch` itself wins. */
export interface HeaderSearchOptions {
  recents?: SearchResult[];
  webSearch?: (query: string) => Promise<WebSearchResponse>;
  onAsk?: (query: string) => void;
}
export const HeaderSearchOptionsContext = createContext<HeaderSearchOptions>({});

const KIND_ICONS: Record<string, ReactNode> = {
  person: <Users />,
  conversation: <MessageCircle />,
  setting: <Settings />,
  app: <LayoutGrid />,
  media: <Clapperboard />,
  memory: <Brain />,
  alarm: <AlarmClock />,
  companion: <Bot />,
  command: <SquareTerminal />,
  file: <FileText />,
  reference: <BookOpen />,
  web: <Globe />,
};

const ASK_ID = "ask";
const WEB_TAB: PaletteTab = { id: "web", label: "Web", submit: true };
const WEB_HINT = "Press Enter to search the web";
const WEB_IDLE = "Nothing is sent to the web until you press Enter.";
const WEB_FAILED = "Web search did not answer. Try again in a moment.";
type WebState = { status: "idle" } | { status: "loading" | "done"; query: string; results: SearchResult[]; note?: string };

// A result's kind decides its tab; every kind not named here is a page or record in Home.
const TABS: readonly PaletteTab[] = [
  { id: "all", label: "All" },
  { id: "chats", label: "Chats" },
  { id: "files", label: "Files" },
  { id: "wikipedia", label: "Wikipedia" },
  { id: "home", label: "Home" },
];
const KIND_TAB: Record<string, string> = { conversation: "chats", file: "files", reference: "wikipedia" };
const tabOf = (kind: string) => KIND_TAB[kind] ?? "home";

function richOf(result: SearchResult): Partial<PaletteCommand> {
  return {
    ...(result.match ? { match: result.match } : {}),
    ...(result.snippet ? { description: result.snippet } : {}),
    ...(result.source ? { source: result.source } : {}),
    ...(result.meta ? { meta: result.meta } : {}),
    ...(result.thumbnail ? { thumbnailUrl: result.thumbnail } : {}),
    ...(result.action ? { actionLabel: result.action } : {}),
  };
}

/** The header's one global search: an icon button opening the kit's command-palette Element over the sidebar's pages, the
 * caller's recents and the caller's remote results. */
const HeaderSearch = ({ remote, recents: recentsProp, onAsk: onAskProp, webSearch: webSearchProp, triggerClassName, size = "lg" }: HeaderSearchProps = {}) => {
  const options = useContext(HeaderSearchOptionsContext);
  const recents = recentsProp ?? options.recents;
  const onAsk = onAskProp ?? options.onAsk;
  const webSearch = webSearchProp ?? options.webSearch;
  const [web, setWeb] = useState<WebState>({ status: "idle" });
  const webRequestRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState("");
  const [tab, setTab] = useState("all");
  const [remoteGroups, setRemoteGroups] = useState<SearchGroup[]>([]);
  const navigate = useNavigate();
  // Only the response matching the current request is applied, so a slow answer to a shorter query never overwrites a newer one.
  const requestIdRef = useRef(0);
  // The debounce effect depends on `query` only; the ref always holds the latest `remote` so an inline arrow never restarts the timer.
  const remoteRef = useRef(remote);
  remoteRef.current = remote;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!remoteRef.current) return;
    if (query.trim().length < 2) {
      requestIdRef.current += 1;
      setRemoteGroups([]);
      return;
    }
    const id = ++requestIdRef.current;
    const timer = setTimeout(() => {
      // Promise.resolve().then turns a synchronous throw from a non-async `remote` into a rejection the catch sees.
      Promise.resolve()
        .then(() => remoteRef.current!(query))
        .then((groups) => {
          if (requestIdRef.current === id) setRemoteGroups(groups);
        })
        .catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const pages = useMemo(
    () => SidebarContent.flatMap((section) => flatten(section.items).map((item) => ({ item, heading: section.heading ?? "" }))),
    [],
  );

  const { commands, hrefs } = useMemo(() => {
    const out: PaletteCommand[] = [];
    const to = new Map<string, string>();
    const trimmed = query.trim().toLowerCase();
    if (trimmed !== "" && tab === "web") {
      if (web.status === "done" && web.query.toLowerCase() === trimmed) {
        for (const result of web.results) {
          const id = `web:${result.id}`;
          out.push({ id, label: result.title, group: "Web", keys: [], icon: <Globe />, ...richOf(result) });
          to.set(id, result.href);
        }
      }
      return { commands: out, hrefs: to };
    }
    if (trimmed === "") {
      for (const { item, heading } of pages) {
        out.push({ id: `page:${item.key}`, label: item.name, group: heading || "Pages", keys: [], icon: item.icon ? <item.icon /> : undefined });
        to.set(`page:${item.key}`, item.url);
      }
      for (const result of recents ?? []) {
        out.push({ id: `recent:${result.id}`, label: result.title, group: "Recent", keys: [], subtitle: result.subtitle, icon: KIND_ICONS[result.kind] });
        to.set(`recent:${result.id}`, result.href);
      }
      return { commands: out, hrefs: to };
    }
    for (const { item } of tab === "all" || tab === "home" ? pages : []) {
      const at = item.name.toLowerCase().indexOf(trimmed);
      if (at < 0) continue;
      out.push({ id: `page:${item.key}`, label: item.name, group: "Pages", keys: [], icon: item.icon ? <item.icon /> : undefined, match: [at, at + trimmed.length] });
      to.set(`page:${item.key}`, item.url);
    }
    for (const group of remoteGroups) {
      for (const result of group.results) {
        const id = `${group.kind}:${result.id}`;
        if (tab !== "all" && tabOf(result.kind) !== tab) continue;
        out.push({ id, label: result.title, group: group.heading, keys: [], subtitle: result.subtitle, icon: KIND_ICONS[result.kind] ?? <SearchIcon />, ...richOf(result) });
        to.set(id, result.href);
      }
    }
    if (onAsk && tab === "all") out.push({ id: ASK_ID, label: `Ask: ${query.trim()}`, group: "Ask", keys: [], icon: <MessageCircle /> });
    return { commands: out, hrefs: to };
  }, [query, pages, recents, remoteGroups, onAsk, tab, web]);

  // The highlighted row follows the first command whenever the list changes under it, so Enter opens the top hit. The
  // Ask row is a last resort and never keeps the highlight once a real result exists.
  useEffect(() => {
    setActiveId((current) => {
      const first = commands[0]?.id ?? "";
      if (!commands.some((command) => command.id === current)) return first;
      return current === ASK_ID && first !== ASK_ID ? first : current;
    });
  }, [commands]);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setRemoteGroups([]);
      setActiveId("");
      setTab("all");
      webRequestRef.current += 1;
      setWeb({ status: "idle" });
    }
  }

  function submitWeb(text: string) {
    if (!webSearch) return;
    const id = ++webRequestRef.current;
    setWeb({ status: "loading", query: text, results: [] });
    Promise.resolve()
      .then(() => webSearch(text))
      .then((response) => {
        if (webRequestRef.current === id) setWeb({ status: "done", query: text, results: response.results, note: response.note });
      })
      .catch(() => {
        if (webRequestRef.current === id) setWeb({ status: "done", query: text, results: [], note: WEB_FAILED });
      });
  }

  function run(id: string) {
    const typed = query.trim();
    onOpenChange(false);
    if (id === ASK_ID) {
      onAsk?.(typed);
      return;
    }
    const href = hrefs.get(id);
    if (!href) return;
    // A web result is an outside address: opened in its own tab, with no opener and no referrer.
    if (id.startsWith("web:")) window.open(href, "_blank", "noopener,noreferrer");
    else navigate(href);
  }

  const onWebTab = tab === "web" && query.trim() !== "";
  const webMatches = web.status !== "idle" && web.query.toLowerCase() === query.trim().toLowerCase();
  const emptyMessage = !onWebTab
    ? "No results found."
    : !webMatches
      ? WEB_IDLE
      : web.status === "loading"
        ? "Searching the web..."
        : (web.status === "done" && web.note) || "No web results found.";

  return (
    <>
      <Button
        variant="ghost"
        aria-label="Search"
        // 40px artwork plus the shared kit's 48px hit area (owner ruling 2026-09-27, SHELL-09).
        className={cn("h-10 w-10 hover:bg-primary/5 rounded-full cursor-pointer", hitArea(1), triggerClassName)}
        onClick={() => setOpen(true)}
      >
        <SearchIcon className="size-5" />
      </Button>
      <CommandPaletteDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Search"
        placeholder="Search..."
        emptyMessage={emptyMessage}
        prefiltered
        size={size}
        commands={commands}
        query={query}
        activeId={activeId}
        onQueryChange={setQuery}
        onActiveChange={setActiveId}
        onRun={run}
        tabs={query.trim() === "" ? undefined : webSearch ? [...TABS, WEB_TAB] : TABS}
        activeTab={tab}
        onTabChange={setTab}
        onSubmitQuery={submitWeb}
        submittedQuery={webMatches ? web.query : undefined}
        footer={onWebTab ? `${WEB_HINT} · Esc to close` : "Search anywhere in Home · Esc to close"}
      />
    </>
  );
};

export default HeaderSearch;
