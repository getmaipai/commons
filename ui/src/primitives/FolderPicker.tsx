import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/kit/ui/button";
import { Input } from "@/kit/ui/input";
import { Label } from "@/kit/ui/label";
import { Skeleton } from "@/kit/ui/skeleton";
import { getIcon } from "@/kit/icons";
import { formatBytes } from "@/kit/format";
import { cn, FOCUS_RING } from "@/kit/utils";

export interface FolderPickerRow {
  name: string;
  path: string;
  writable: boolean;
  /** Why the row cannot be opened or chosen. Shown under the name. */
  disabledReason?: string;
}

export interface FolderPickerListing {
  path: string;
  /** The folder above, or null at the top. */
  parent: string | null;
  rows: readonly FolderPickerRow[];
  freeBytes?: number | null;
}

export interface FolderPickerCopy {
  title: string;
  upLabel: string;
  chooseLabel: string;
  newFolderLabel: string;
  /** Label of the inline name field. */
  newFolderNameLabel: string;
  /** Button that creates the folder from the typed name. */
  createLabel: string;
  cancelLabel: string;
  emptyText: string;
  /** Plain sentence: what went wrong and what to do. */
  errorText: string;
  retryLabel: string;
  loadingLabel: string;
  /** Receives the formatted free space, for example "120 GB". */
  freeSpaceLabel: (formatted: string) => string;
}

export interface FolderPickerProps {
  /** `undefined` while the first listing loads. */
  listing: FolderPickerListing | undefined;
  copy: FolderPickerCopy;
  onOpen: (path: string) => void;
  onUp: () => void;
  onChoose: (path: string) => void;
  onCreate: (name: string) => void;
  /** A listing is being fetched; the previous one stays on screen, dimmed. */
  loading?: boolean;
  /** The last listing or create call failed; shows `copy.errorText`. */
  error?: boolean;
  /** Called by the retry button in the error state. */
  onRetry?: () => void;
  /** Disables "Choose this folder" (a folder the app cannot use). */
  chooseDisabled?: boolean;
}

interface Crumb {
  label: string;
  path: string;
}

/** Splits a folder path into clickable crumbs, for POSIX ("/a/b") and
 * Windows ("C:\\a\\b") paths alike. */
export function pathCrumbs(path: string): Crumb[] {
  const sep = path.includes("\\") && !path.includes("/") ? "\\" : "/";
  const parts = path.split(sep).filter((p) => p.length > 0);
  const crumbs: Crumb[] = [];
  let acc = "";
  if (sep === "/") {
    crumbs.push({ label: "/", path: "/" });
    for (const part of parts) {
      acc += `/${part}`;
      crumbs.push({ label: part, path: acc });
    }
  } else {
    parts.forEach((part, i) => {
      acc = i === 0 ? `${part}${sep}` : `${acc.endsWith(sep) ? acc : acc + sep}${part}`;
      crumbs.push({ label: part, path: acc });
    });
  }
  return crumbs;
}

// A folder chooser that owns no data: the app fetches the listing and
// passes it in with handlers and copy (docs/UI.md, kit parts are
// presentation only).
export function FolderPicker({
  listing,
  copy,
  onOpen,
  onUp,
  onChoose,
  onCreate,
  loading = false,
  error = false,
  onRetry,
  chooseDisabled = false,
}: FolderPickerProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const nameId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  // Move focus to the name field when it opens, so a keyboard user can type
  // at once (the autoFocus attribute is avoided on purpose).
  useEffect(() => {
    if (creating) nameRef.current?.focus();
  }, [creating]);
  const FolderIcon = getIcon("folder");
  const UpIcon = getIcon("arrow-up");
  const trimmed = name.trim();

  function submitCreate() {
    if (!trimmed) return;
    onCreate(trimmed);
    setName("");
    setCreating(false);
  }

  return (
    <section aria-label={copy.title} aria-busy={loading || listing === undefined} className="flex min-w-0 flex-col gap-3">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">{copy.title}</h2>

      {error ? (
        <div role="alert" className="flex flex-col items-start gap-2 rounded-[var(--radius)] border border-[var(--destructive)] p-3">
          <p className="text-base text-[var(--foreground)]">{copy.errorText}</p>
          {onRetry ? (
            <Button variant="secondary" onClick={onRetry}>
              {copy.retryLabel}
            </Button>
          ) : null}
        </div>
      ) : null}

      {listing === undefined ? (
        <div role="status" aria-label={copy.loadingLabel} className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <>
          <nav aria-label={listing.path} className="min-w-0">
            <ol className="flex min-w-0 flex-wrap items-center gap-x-1 text-base text-[var(--muted-foreground)]">
              {pathCrumbs(listing.path).map((crumb, i, all) => {
                const last = i === all.length - 1;
                return (
                  <li key={crumb.path} className="flex min-w-0 items-center gap-1">
                    {last ? (
                      <span aria-current="page" className="break-all font-medium text-[var(--foreground)]">
                        {crumb.label}
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpen(crumb.path)}
                          className={cn(
                            "inline-flex min-h-12 items-center break-all rounded-[var(--radius)] px-1 hover:text-[var(--foreground)] hover:underline",
                            FOCUS_RING,
                          )}
                        >
                          {crumb.label}
                        </button>
                        {crumb.label === "/" ? null : <span aria-hidden>/</span>}
                      </>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          {listing.freeBytes != null ? (
            <p className="text-base text-[var(--muted-foreground)]">{copy.freeSpaceLabel(formatBytes(listing.freeBytes))}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onUp} disabled={listing.parent === null}>
              <UpIcon aria-hidden />
              {copy.upLabel}
            </Button>
            <Button variant="outline" onClick={() => setCreating((v) => !v)} aria-expanded={creating}>
              {copy.newFolderLabel}
            </Button>
          </div>

          {creating ? (
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                submitCreate();
              }}
            >
              <Label htmlFor={nameId}>{copy.newFolderNameLabel}</Label>
              <Input id={nameId} value={name} onChange={(e) => setName(e.target.value)} ref={nameRef} autoComplete="off" />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={!trimmed}>
                  {copy.createLabel}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setName("");
                    setCreating(false);
                  }}
                >
                  {copy.cancelLabel}
                </Button>
              </div>
            </form>
          ) : null}

          {listing.rows.length === 0 ? (
            <p className="rounded-[var(--radius)] border border-dashed border-[var(--border)] p-4 text-center text-base text-[var(--muted-foreground)]">
              {copy.emptyText}
            </p>
          ) : (
            <ul
              aria-label={listing.path}
              className={cn(
                "flex list-none flex-col divide-y divide-[var(--border)] rounded-[var(--radius)] border border-[var(--border)] p-0",
                loading && "opacity-60",
              )}
            >
              {listing.rows.map((row) => {
                const disabled = !row.writable || row.disabledReason !== undefined;
                const content = (
                  <>
                    <FolderIcon className="size-5 shrink-0 text-[var(--muted-foreground)]" aria-hidden />
                    <span className="flex min-w-0 flex-col">
                      <span className="break-all text-base text-[var(--foreground)]">{row.name}</span>
                      {row.disabledReason ? (
                        <span className="text-base text-[var(--muted-foreground)]">{row.disabledReason}</span>
                      ) : null}
                    </span>
                  </>
                );
                return (
                  <li key={row.path} className="min-w-0">
                    {disabled ? (
                      <div aria-disabled="true" className="flex min-h-12 items-center gap-3 px-3 py-2 opacity-70">
                        {content}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onOpen(row.path)}
                        className={cn(
                          "flex min-h-12 w-full items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-left hover:bg-[var(--muted)]",
                          FOCUS_RING,
                        )}
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <Button onClick={() => onChoose(listing.path)} disabled={chooseDisabled || loading}>
            {copy.chooseLabel}
          </Button>
        </>
      )}
    </section>
  );
}
