// STACK-MODELS-PAGE-01. The one "AI and models" page, built once and used by the Stack admin page and by Home (owner decision, 2026-11-21: the
// Stack holds every model choice; both apps are views over it). It takes a `StackClient` (typed calls, never `fetch`) and renders, from kit
// primitives and tokens only: a calm summary (one card per feature with its chosen model and a one-line status), a search box that finds a model
// by name, id, repo, family, version, precision, licence, engine or description, a sheet of details per feature, the recommended setup (preview
// first), free up space, add a chat model, and behind "More" the priority order. Host slots: `extraSections` (what only one host has),
// `lockedItems` (what a gate forbids, with the sentence to show) and `onNavigate`. The page never knows who is asking.
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { Button } from "@/kit/ui/button";
import { Card } from "@/kit/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/kit/ui/collapsible";
import { Input } from "@/kit/ui/input";
import { Skeleton } from "@/kit/ui/skeleton";
import { Switch } from "@/kit/ui/switch";
import { getIcon } from "@/kit/icons";
import { i18n } from "@/kit/i18n";
import { cn } from "@/kit/utils";
import type { StackChoiceCategory, StackChoicesView, StackClient } from "./StackClient";
import { StackAddModelDialog } from "./StackAddModel";
import { StackCategorySheet } from "./StackCategorySheet";
import { StackFreeSpaceDialog } from "./StackFreeSpace";
import { IconChip, NoticeLine, Pill } from "./StackParts";
import type { Notice } from "./StackParts";
import { StackRecommendedSheet } from "./StackRecommended";
import { byPriority, cardState, headlineModel, labelIndex, lockFor, toneOf } from "./stackLogic";
import { searchModels } from "./stackSearch";
import type { SearchHit } from "./stackSearch";
import { cardStateWord, gb, modelStateWord } from "./stackWords";
import { useStackChoices } from "./useStackChoices";
import type { StackChoicesState } from "./useStackChoices";

const SearchIcon = getIcon("search");
const ChevronIcon = getIcon("chevron-down");
const LockIcon = getIcon("lock");
const UpIcon = getIcon("arrow-up");
const DownIcon = getIcon("arrow-down");
const SparklesIcon = getIcon("sparkles");
const PlusIcon = getIcon("plus");
const DiskIcon = getIcon("hard-drive");

/** A section a host adds below the page's own: Home's disk and backup links, the admin page's tools. */
export interface StackExtraSection { id: string; title: string; description?: string; content: ReactNode }
/** Where `onNavigate` may be asked to go. The host maps each to its own screen. */
export type StackNavTarget = "resources" | "disk" | "updates" | "health";

export interface StackModelsPageProps {
  client: StackClient;
  /** Sections the host adds after the page's own, each with a title. */
  extraSections?: readonly StackExtraSection[];
  /**
   * What the host forbids, with the sentence to show. Keys: a feature id (`chat`, locks all of it), a feature and level (`chat:boost`, locks one level),
   * or a page action (`recommended`, `free-space`, `add-model`, `priority`). A locked control is disabled and its sentence shown beside it.
   */
  lockedItems?: Readonly<Record<string, string>>;
  /** Shown as quiet links under "More" when given. */
  onNavigate?: (target: StackNavTarget) => void;
  /** How often to ask again while a model downloads (default 2000; 0 turns it off). */
  pollMs?: number;
  /** A host's own query cache, when it wants one. Default: one per client. */
  queryClient?: QueryClient;
  className?: string;
}

function FeatureCard({ category, state, lock, onOpen, onNotice }: { category: StackChoiceCategory; state: StackChoicesState; lock: string | null; onOpen: () => void; onNotice: (notice: Notice) => void }) {
  const head = headlineModel(category);
  const status = cardState(category);
  const switchable = category.role !== null && category.role_enabled !== null;
  const roleBusy = state.busy.has(`role:${category.role}`);
  return (
    <li>
      <Card className="h-full gap-0 py-0" data-testid={`feature-${category.id}`}>
        <div className="flex items-start gap-3 p-4">
          <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-start gap-3 rounded-xl text-start outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <IconChip icon={category.icon} tone={toneOf(status.state)} />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-semibold break-words">{category.label}</span>
              <span className="text-sm break-words">{head ? head.candidate.label : <span className="text-muted-foreground">{cardStateWord(status.state, status.percent)}</span>}</span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Pill tone={toneOf(status.state)}>{cardStateWord(status.state, status.percent)}</Pill>
                {head && <span className="text-xs text-muted-foreground">{gb(head.candidate.size_bytes)}</span>}
              </span>
            </span>
          </button>
          {switchable && (lock
            ? <LockIcon aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground" />
            : <Switch checked={category.role_enabled !== false} disabled={roleBusy} onCheckedChange={(on) => {
              void state.setRoleEnabled(category.role!, on).then((outcome) => onNotice(outcome.ok
                ? { kind: "ok", text: on ? i18n._({ id: "ui.{feature} is on.", message: "{feature} is on.", values: { feature: category.label } }) : i18n._({ id: "ui.{feature} is off. Anything it was running has stopped.", message: "{feature} is off. Anything it was running has stopped.", values: { feature: category.label } }) }
                : { kind: "error", text: outcome.message }));
            }} aria-label={i18n._({ id: "ui.{feature} on or off", message: "{feature} on or off", values: { feature: category.label } })} />)}
        </div>
        {lock && <p className="flex items-start gap-1.5 px-4 pb-3 text-sm text-muted-foreground"><LockIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{lock}</p>}
      </Card>
    </li>
  );
}

function SearchResults({ hits, query, onOpen }: { hits: SearchHit[]; query: string; onOpen: (hit: SearchHit) => void }) {
  if (hits.length === 0) {
    return <p role="status" className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">{i18n._({ id: "ui.No model matches \"{query}\". Try a name, a version such as 3.8, a licence or a feature.", message: "No model matches \"{query}\". Try a name, a version such as 3.8, a licence or a feature.", values: { query: query.trim() } })}</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      <p role="status" className="text-sm text-muted-foreground">{i18n._({ id: "ui.{count, plural, one {# model matches} other {# models match}}", message: "{count, plural, one {# model matches} other {# models match}}", values: { count: hits.length } })}</p>
      <ul className="flex flex-col gap-2" aria-label={i18n._({ id: "ui.Search results", message: "Search results" })}>
        {hits.map(({ category, candidate }) => (
          <li key={`${category.id}:${candidate.id}`}>
            <Card className="gap-0 py-0">
              <button type="button" onClick={() => onOpen({ category, candidate })} className="flex w-full items-start gap-3 rounded-2xl p-3 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <IconChip icon={category.icon} size="sm" />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-medium break-words">{candidate.label}</span>
                  <span className="text-sm text-muted-foreground">{candidate.summary}</span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5 text-xs text-muted-foreground">
                    <Pill tone="primary">{category.label}</Pill>
                    <Pill tone={candidate.state === "installed" ? "ok" : candidate.state === "failed" ? "bad" : "muted"}>{modelStateWord(candidate)}</Pill>
                    <span>{gb(candidate.size_bytes)}</span>
                    {candidate.version && <span>{i18n._({ id: "ui.Version {version}", message: "Version {version}", values: { version: candidate.version } })}</span>}
                    {candidate.quantization && <span>{candidate.quantization}</span>}
                    {candidate.license && <span>{candidate.license}</span>}
                  </span>
                </span>
              </button>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PriorityList({ view, state, lock, onNotice }: { view: StackChoicesView; state: StackChoicesState; lock: string | null; onNotice: (notice: Notice) => void }) {
  const rows = byPriority(view.categories.filter((c) => c.role !== null).map((c) => ({ id: c.id, role: c.role!, label: c.label, priority: c.role_priority, enabled: c.role_enabled !== false })));
  if (rows.length < 2) return null;
  const busy = [...state.busy].some((k) => k.startsWith("priority:"));
  const move = (role: string, label: string, dir: -1 | 1) => { void state.movePriority(role, dir).then((o) => onNotice(o.ok ? { kind: "ok", text: dir < 0 ? i18n._({ id: "ui.{feature} moved up.", message: "{feature} moved up.", values: { feature: label } }) : i18n._({ id: "ui.{feature} moved down.", message: "{feature} moved down.", values: { feature: label } }) } : { kind: "error", text: o.message })); };
  return (
    <section aria-labelledby="priority-heading" className="flex flex-col gap-2">
      <h3 id="priority-heading" className="text-base font-semibold">{i18n._({ id: "ui.Which feature goes first", message: "Which feature goes first" })}</h3>
      <p className="text-sm text-muted-foreground">{i18n._({ id: "ui.When memory is tight, features higher in this list are served first.", message: "When memory is tight, features higher in this list are served first." })}</p>
      {lock && <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><LockIcon aria-hidden="true" className="size-4" />{lock}</p>}
      <ol className="flex flex-col gap-1" aria-label={i18n._({ id: "ui.Priority order", message: "Priority order" })}>
        {rows.map((row, index) => (
          <li key={row.role} className="flex items-center gap-2 rounded-xl px-3 py-1.5 ring-1 ring-inset ring-border">
            <span className="w-5 text-sm text-muted-foreground tabular-nums">{index + 1}</span>
            <span className="min-w-0 flex-1 break-words text-sm">{row.label}</span>
            {!row.enabled && <Pill>{i18n._({ id: "ui.Off", message: "Off" })}</Pill>}
            <Button size="icon-sm" variant="ghost" disabled={Boolean(lock) || busy || index === 0} onClick={() => move(row.role, row.label, -1)} aria-label={i18n._({ id: "ui.Move {feature} up", message: "Move {feature} up", values: { feature: row.label } })}><UpIcon aria-hidden="true" /></Button>
            <Button size="icon-sm" variant="ghost" disabled={Boolean(lock) || busy || index === rows.length - 1} onClick={() => move(row.role, row.label, 1)} aria-label={i18n._({ id: "ui.Move {feature} down", message: "Move {feature} down", values: { feature: row.label } })}><DownIcon aria-hidden="true" /></Button>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function StackModelsPage({ client, extraSections, lockedItems, onNavigate, pollMs, queryClient, className }: StackModelsPageProps) {
  const state = useStackChoices(client, { pollMs, queryClient });
  const { view } = state;
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<StackChoiceCategory["id"] | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [recommendedOpen, setRecommendedOpen] = useState(false);
  const [freeOpen, setFreeOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const labels = useMemo(() => labelIndex(state.categories), [state.categories]);
  const labelOf = (id: string) => labels.get(id) ?? i18n._({ id: "ui.a model", message: "a model" });
  const hits = useMemo(() => searchModels(state.categories, query), [state.categories, query]);
  const open = state.categories.find((c) => c.id === openId) ?? null;
  const searching = query.trim().length > 0;
  const lockRecommended = lockFor(lockedItems, "recommended");
  const lockFree = lockFor(lockedItems, "free-space");
  const lockAdd = lockFor(lockedItems, "add-model");
  const lockPriority = lockFor(lockedItems, "priority");

  return (
    <div className={cn("flex min-w-0 flex-col gap-6", className)}>
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-2xl font-semibold tracking-tight">{i18n._({ id: "ui.AI and models", message: "AI and models" })}</h2>
            {view && (
              <p className="text-sm text-muted-foreground">
                {i18n._({ id: "ui.This computer has about {memory} GB of memory for AI and {disk} free on disk.", message: "This computer has about {memory} GB of memory for AI and {disk} free on disk.", values: { memory: Math.round(view.memory_gb), disk: gb(view.free_disk_bytes) } })}
              </p>
            )}
          </div>
          {view && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setRecommendedOpen(true)} disabled={Boolean(lockRecommended)}><SparklesIcon aria-hidden="true" />{i18n._({ id: "ui.Recommended setup", message: "Recommended setup" })}</Button>
              {view.unused.count > 0 && (
                <Button variant="outline" onClick={() => setFreeOpen(true)} disabled={Boolean(lockFree)}><DiskIcon aria-hidden="true" />{i18n._({ id: "ui.Free up {size}", message: "Free up {size}", values: { size: gb(view.unused.total_bytes) } })}</Button>
              )}
            </div>
          )}
        </div>
        {(lockRecommended || lockFree) && <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><LockIcon aria-hidden="true" className="size-4" />{lockRecommended ?? lockFree}</p>}
        {view && (
          <div role="search" className="w-full">
            <Input
              type="search"
              shape="pill"
              leading={<SearchIcon />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={i18n._({ id: "ui.Name, version or licence", message: "Name, version or licence" })}
              aria-label={i18n._({ id: "ui.Search models", message: "Search models" })}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )}
        <NoticeLine notice={notice} onDismiss={() => setNotice(null)} />
      </header>

      {state.loading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label={i18n._({ id: "ui.Loading", message: "Loading" })}>
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      )}

      {!view && !state.loading && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/40 p-4">
          <p className="font-medium">{i18n._({ id: "ui.The models could not be shown", message: "The models could not be shown" })}</p>
          <p className="text-sm text-muted-foreground">{state.error}</p>
          <Button variant="outline" onClick={() => { void state.reload(); }}>{i18n._({ id: "ui.Try again", message: "Try again" })}</Button>
        </div>
      )}

      {view && searching && <SearchResults hits={hits} query={query} onOpen={(hit) => { setOpenId(hit.category.id); setHighlightId(hit.candidate.id); }} />}

      {view && !searching && (
        <>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label={i18n._({ id: "ui.Features", message: "Features" })}>
            {state.categories.map((category) => (
              <FeatureCard key={category.id} category={category} state={state} lock={lockFor(lockedItems, category.id)} onOpen={() => { setHighlightId(null); setOpenId(category.id); }} onNotice={setNotice} />
            ))}
          </ul>
          <Collapsible open={more} onOpenChange={setMore}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="-ms-2 w-fit"><span>{i18n._({ id: "ui.More", message: "More" })}</span><ChevronIcon aria-hidden="true" className={cn("transition-transform", more && "rotate-180")} /></Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-6 pt-3">
              <PriorityList view={view} state={state} lock={lockPriority} onNotice={setNotice} />
              <section aria-labelledby="add-heading" className="flex flex-col gap-2">
                <h3 id="add-heading" className="text-base font-semibold">{i18n._({ id: "ui.Add a chat model", message: "Add a chat model" })}</h3>
                <p className="text-sm text-muted-foreground">{i18n._({ id: "ui.Bring your own from Hugging Face. The Stack checks its size and licence first.", message: "Bring your own from Hugging Face. The Stack checks its size and licence first." })}</p>
                {lockAdd && <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><LockIcon aria-hidden="true" className="size-4" />{lockAdd}</p>}
                <Button variant="outline" className="w-fit" disabled={Boolean(lockAdd)} onClick={() => setAddOpen(true)}><PlusIcon aria-hidden="true" />{i18n._({ id: "ui.Add a chat model", message: "Add a chat model" })}</Button>
              </section>
              {onNavigate && (
                <section aria-labelledby="links-heading" className="flex flex-col gap-2">
                  <h3 id="links-heading" className="text-base font-semibold">{i18n._({ id: "ui.Related", message: "Related" })}</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => onNavigate("resources")}>{i18n._({ id: "ui.Memory and speed", message: "Memory and speed" })}</Button>
                    <Button variant="outline" size="sm" onClick={() => onNavigate("disk")}>{i18n._({ id: "ui.Disk space", message: "Disk space" })}</Button>
                    <Button variant="outline" size="sm" onClick={() => onNavigate("updates")}>{i18n._({ id: "ui.Updates", message: "Updates" })}</Button>
                    <Button variant="outline" size="sm" onClick={() => onNavigate("health")}>{i18n._({ id: "ui.Health", message: "Health" })}</Button>
                  </div>
                </section>
              )}
            </CollapsibleContent>
          </Collapsible>
          {extraSections?.map((section) => (
            <section key={section.id} aria-labelledby={`extra-${section.id}`} className="flex flex-col gap-2" data-testid={`extra-${section.id}`}>
              <h3 id={`extra-${section.id}`} className="text-base font-semibold">{section.title}</h3>
              {section.description && <p className="text-sm text-muted-foreground">{section.description}</p>}
              {section.content}
            </section>
          ))}
        </>
      )}

      {view && (
        <>
          <StackCategorySheet category={open} state={state} labelOf={labelOf} locked={lockedItems} highlightId={highlightId} onClose={() => { setOpenId(null); setHighlightId(null); }} />
          <StackRecommendedSheet open={recommendedOpen} state={state} view={view} onClose={() => setRecommendedOpen(false)} />
          <StackFreeSpaceDialog open={freeOpen} state={state} view={view} onClose={() => setFreeOpen(false)} />
          <StackAddModelDialog open={addOpen} state={state} onClose={() => setAddOpen(false)} />
        </>
      )}
    </div>
  );
}
