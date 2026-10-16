import { useEffect, useRef, useState } from "react";
import { getIcon } from "@/kit/icons";
import { List } from "@/kit/primitives/List";
import { DestructiveConfirm } from "@/kit/primitives/DestructiveConfirm";
import { Button } from "../dashboard/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../dashboard/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dashboard/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../dashboard/components/ui/dropdown-menu";
import { Input } from "../dashboard/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../dashboard/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../dashboard/components/ui/select";

const PlusIcon = getIcon("plus");
const EllipsisIcon = getIcon("more-horizontal");

/** A place a search found. `id` is set when the hub already has it as a record. */
export interface PlaceHit {
  id?: string;
  name: string;
  area?: string | null;
  lat: number;
  lon: number;
}

/** What the host supplies so the kit field never fetches or stores a place
 * itself. Every method is the host's own call (Home's `/api/places/*` and
 * `/api/entities`). */
export interface PlaceAdapter {
  /** The display name for a stored place id. */
  labelFor: (id: string) => string;
  /** Search for a place to add. */
  search: (query: string) => Promise<PlaceHit[]>;
  /** Save a hit as a place and return its id, or null when it was refused. */
  add: (hit: PlaceHit) => Promise<string | null>;
  /** Rename a saved place; true when it landed. */
  rename: (id: string, name: string) => Promise<boolean>;
  /** Ask the browser for the current position. Called only from the
   * "Use current location" button, never on mount. True when granted. */
  useCurrent?: () => Promise<boolean>;
  /** The places a single-value field with `allow_current` may pick from
   * (the person's list). Absent: the field searches instead. */
  choices?: readonly string[];
}

interface LocationFieldProps {
  /** One id (or null) for a single field, an ordered array for `multiple`. */
  value: unknown;
  multiple: boolean;
  allowCurrent: boolean;
  adapter: PlaceAdapter;
  onValueChange: (next: string | string[] | null) => void;
  disabled?: boolean;
  ariaLabel: string;
}

function AddPlace({ adapter, disabled, label, onPick }: { adapter: PlaceAdapter; disabled?: boolean; label: string; onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  // The host may build its adapter inline; the search must not restart on
  // every parent render.
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;

  useEffect(() => {
    const q = query.trim();
    setHits([]);
    setFailed(false);
    if (q.length < 2) return;
    let live = true;
    const t = setTimeout(() => {
      adapterRef.current.search(q).then(
        (r) => live && setHits(r),
        () => live && setFailed(true),
      );
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query]);

  async function choose(hit: PlaceHit) {
    if (busy) return;
    setBusy(true);
    setAddError(null);
    try {
      const id = hit.id ?? (await adapter.add(hit));
      if (id) {
        onPick(id);
        setOpen(false);
        setQuery("");
      } else {
        setAddError("That place was not saved. Try again in a moment.");
      }
    } catch {
      setAddError("That place was not saved. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button type="button" size="row" variant="secondary" disabled={disabled}>
            <PlusIcon aria-hidden /> {label}
          </Button>
        }
      />
      <PopoverContent>
        <Command shouldFilter={false}>
          <CommandInput value={query} onValueChange={setQuery} placeholder="Search for a place" aria-label="Search for a place" />
          <CommandList>
            <CommandEmpty>
              {failed ? "Search is not available right now. Try again in a moment." : query.trim().length < 2 ? "Type at least two letters." : "No place found. Try a nearby town."}
            </CommandEmpty>
            {addError ? <p role="status" className="px-2 py-1 text-sm">{addError}</p> : null}
            <CommandGroup>
              {hits.map((h) => (
                <CommandItem key={`${h.id ?? ""}${h.lat},${h.lon}`} value={`${h.name}${h.lat}${h.lon}`} onSelect={() => void choose(h)}>
                  {h.name}
                  {h.area ? <span className="text-muted-foreground"> {h.area}</span> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function RenameDialog({ name, onClose, onSave }: { name: string; onClose: () => void; onSave: (next: string) => Promise<boolean> }) {
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename place</DialogTitle>
          <DialogDescription>The name is only for you. It does not change where the place is.</DialogDescription>
        </DialogHeader>
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Place name" maxLength={80} />
        {error ? <p role="status">{error}</p> : null}
        <DialogFooter>
          <Button
            type="button"
            disabled={!draft.trim()}
            onClick={() =>
              void onSave(draft.trim()).then((ok) => {
                if (ok) onClose();
                else setError("The name was not saved. Check your connection and try again.");
              })
            }
          >
            Save
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The settings renderer's `location` selector, composed from shipped
 * kit parts only (PLACE-ELEMENT-01a): Command-in-Popover search to add,
 * List for entries, a DropdownMenu per entry (rename, move up, move down,
 * remove), a Select for a single value with Current location first, and
 * a button that is the only thing that asks the browser for a position. */
export function LocationField({ value, multiple, allowCurrent, adapter, onValueChange, disabled, ariaLabel }: LocationFieldProps) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  const useCurrentButton =
    allowCurrent && adapter.useCurrent ? (
      <Button
        type="button"
        size="row"
        variant="secondary"
        disabled={disabled}
        onClick={() =>
          void adapter.useCurrent!().then(
            (ok) => {
              setDenied(!ok);
              if (ok && !multiple) onValueChange("current");
            },
            () => setDenied(true),
          )
        }
      >
        Use current location
      </Button>
    ) : null;
  const deniedNote = denied ? <p role="status">Location is blocked in this browser. Allow it in the site settings, or pick a place instead.</p> : null;

  if (!multiple) {
    const id = typeof value === "string" && value ? value : null;
    if (allowCurrent) {
      const ids = [...(adapter.choices ?? [])];
      if (id && !ids.includes(id)) ids.push(id);
      return (
        <>
          <Select value={id ?? "current"} onValueChange={(v) => onValueChange(v)} disabled={disabled}>
            <SelectTrigger aria-label={ariaLabel}>
              <SelectValue>{(v: string) => (v === "current" ? "Current location" : adapter.labelFor(v))}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current location</SelectItem>
              {ids.map((p) => (
                <SelectItem key={p} value={p}>
                  {adapter.labelFor(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {useCurrentButton}
          {deniedNote}
        </>
      );
    }
    return (
      <>
        <span className="min-w-0 max-w-full truncate text-sm" data-slot="location-label">
          {id ? adapter.labelFor(id) : "Not set"}
        </span>
        <AddPlace adapter={adapter} disabled={disabled} label={id ? "Change" : "Set place"} onPick={(p) => onValueChange(p)} />
        {id ? (
          <Button type="button" size="row" variant="secondary" disabled={disabled} onClick={() => onValueChange(null)}>
            Clear
          </Button>
        ) : null}
      </>
    );
  }

  const ids = Array.isArray(value) ? [...new Set(value as string[])] : [];
  const move = (i: number, d: -1 | 1) => {
    const next = [...ids];
    [next[i], next[i + d]] = [next[i + d]!, next[i]!];
    onValueChange(next);
  };
  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <List
        items={ids}
        label={ariaLabel}
        getKey={(p) => p}
        renderItem={(p) => <span className="min-w-0 truncate">{adapter.labelFor(p)}</span>}
        emptyState={{ icon: "pin", text: "No saved places yet." }}
        renderAction={(p) => {
          const i = ids.indexOf(p);
          return removing === p ? (
            <DestructiveConfirm
              message={`Remove ${adapter.labelFor(p)}?`}
              detail="It leaves your list. You can add it again by searching."
              confirmLabel="Remove"
              busyLabel="Removing"
              onConfirm={() => {
                onValueChange(ids.filter((x) => x !== p));
                setRemoving(null);
              }}
              onCancel={() => setRemoving(null)}
            />
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button type="button" size="icon" variant="ghost" disabled={disabled} aria-label={`Actions for ${adapter.labelFor(p)}`}>
                    <EllipsisIcon aria-hidden />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setRenaming(p)}>Rename</DropdownMenuItem>
                <DropdownMenuItem disabled={i <= 0} onClick={() => move(i, -1)}>
                  Move up
                </DropdownMenuItem>
                <DropdownMenuItem disabled={i >= ids.length - 1} onClick={() => move(i, 1)}>
                  Move down
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setRemoving(p)}>
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }}
      />
      <div className="flex flex-wrap gap-2">
        <AddPlace adapter={adapter} disabled={disabled} label="Add a place" onPick={(p) => !ids.includes(p) && onValueChange([...ids, p])} />
        {useCurrentButton}
      </div>
      {deniedNote}
      {renaming ? <RenameDialog name={adapter.labelFor(renaming)} onClose={() => setRenaming(null)} onSave={(n) => adapter.rename(renaming, n)} /> : null}
    </div>
  );
}
