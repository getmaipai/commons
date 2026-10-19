"use client";

import { useEffect, useId, useRef, type FC, type ReactNode } from "react";
import { UsersIcon } from "lucide-react";
import { cn } from "@/kit/utils";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Switch } from "../ui/switch";
import { Avatar } from "../primitives/Avatar";
import { Select } from "../primitives/Select";

/**
 * LIBRARY-REVAMP-06 slice B. One Share dialog for the household, in the shape ChatGPT's project Share dialog set
 * (PROJECTS-KIT-01): a row for each person the host lists, each with a role. `ProjectShareDialog` is now a preset
 * over this part. The host decides who is listed and what each role means; the kit knows no record type.
 *
 * Two roles read as an on and off switch (the first is off, the second is on): "No access" and "Can view" for a
 * file. Three or more roles read as a menu, as the project dialog always has.
 */
export interface ShareRole {
  id: string;
  label: string;
}

/** A file is either shared or it is not. */
export const FILE_SHARE_ROLES: readonly ShareRole[] = [
  { id: "off", label: "No access" },
  { id: "view", label: "Can view" },
];

/** One person, or the whole household, in the dialog. */
export interface ShareRow {
  /** The host's id for this person. Passed back to `onRoleChange`. */
  id: string;
  name: string;
  /** The id of the role this row has now. Controlled: the dialog shows what the host says. */
  role: string;
  /** `Person.avatar_seed`, as the kit `Avatar` takes it. */
  avatarSeed?: string | null;
  /** A second line under the name. */
  description?: ReactNode;
  /** Given, this row cannot be changed and these words show under the name, as text (never only a tooltip). */
  disabledReason?: ReactNode;
  /** A change for this row is being saved. The row cannot be changed again until the host clears it. */
  busy?: boolean;
  /** This row's change failed: what went wrong and what to do about it. Shown under the row. */
  error?: ReactNode;
  /** Called with the new role instead of the dialog's `onRoleChange`. */
  onChange?: (role: string) => void | Promise<void>;
}

/** The step the host shows before sharing with the household or a child (a warning to read, then go on or go back). */
export interface ShareConfirmStep {
  title: ReactNode;
  body: ReactNode;
  /** Default "Share anyway". */
  confirmLabel?: string;
  /** Default "Go back". */
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  /** Also what Escape does while this step shows (the dialog stays open). */
  onCancel: () => void;
  busy?: boolean;
  /** What went wrong and what to do about it. */
  error?: ReactNode;
}

export interface ShareDialogLabels {
  title?: string;
  description?: string;
  /** Shown when there are no people to list and no household row. */
  empty?: string;
  /** The household row's name when its own `name` is absent. */
  household?: string;
  /** The household row's second line when its own `description` is absent. */
  householdDescription?: string;
  /** The Done button. */
  done?: string;
  /** Said beside a row that is being saved. */
  saving?: string;
  /** The accessible name of the list of people. */
  people?: string;
  /** The default confirm button words, when a step gives none. */
  confirm?: string;
  goBack?: string;
}

export interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The people the host lists. */
  members: readonly ShareRow[];
  /** The "Everyone in the home" row, drawn first. Its `name` and `description` default to the labels. Its id defaults to "household". */
  household?: (Omit<ShareRow, "id" | "name"> & { id?: string; name?: string }) | null | undefined;
  /** What a row can be. Default `FILE_SHARE_ROLES` (off and on). Two roles draw switches; more draw menus. */
  roles?: readonly ShareRole[] | undefined;
  /** A row was changed. A rejected promise is the host's to report (put the words in the row's `error`). */
  onRoleChange?: ((rowId: string, role: string) => void | Promise<void>) | undefined;
  /** Nothing can be changed. */
  disabled?: boolean | undefined;
  /** Something is being saved. Nothing can be changed until it is done. */
  busy?: boolean | undefined;
  /** What went wrong for the whole dialog, and what to do about it. */
  error?: ReactNode;
  /** Words or a banner above the list about what cannot be shared (an adult-only file, a child). */
  restrictions?: ReactNode;
  /** The warning step. While given, it replaces the list and Done. */
  confirm?: ShareConfirmStep | null | undefined;
  /** Draw the Done button. Default true. */
  showDone?: boolean | undefined;
  /** Draw a face for each person. Default true. */
  showAvatars?: boolean | undefined;
  labels?: ShareDialogLabels | undefined;
  /** The `data-slot` of the dialog. Default "share-dialog". */
  dataSlot?: string | undefined;
  className?: string | undefined;
}

const DEFAULT_LABELS = {
  title: "Share",
  description: "Choose who in your home can see this. Nothing is sent outside your home, and you can stop at any time.",
  empty: "There is no one to share with yet.",
  household: "Everyone in the home",
  householdDescription: "People who join later can see it too.",
  done: "Done",
  saving: "Saving...",
  people: "People",
  confirm: "Share anyway",
  goBack: "Go back",
};

function quiet(call: () => void | Promise<void>) {
  // A failed change is the host's to report; the row stays on the stored role.
  void Promise.resolve(call()).catch(() => {});
}

function Face({ row, household }: { row: ShareRow; household: boolean }) {
  if (household) {
    return (
      <span data-slot="share-dialog-household-mark" aria-hidden className="bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-full">
        <UsersIcon className="size-5" />
      </span>
    );
  }
  return <Avatar name={row.name} seed={row.avatarSeed} className="size-10 shrink-0 text-base" />;
}

export const ShareDialog: FC<ShareDialogProps> = ({
  open,
  onOpenChange,
  members,
  household,
  roles = FILE_SHARE_ROLES,
  onRoleChange,
  disabled,
  busy,
  error,
  restrictions,
  confirm,
  showDone = true,
  showAvatars = true,
  labels,
  dataSlot = "share-dialog",
  className,
}) => {
  const copy = { ...DEFAULT_LABELS, ...labels };
  const ids = useId();
  const confirmRef = useRef<HTMLDivElement | null>(null);
  const before = useRef<HTMLElement | null>(null);
  const confirming = Boolean(confirm);

  // The warning is read first: focus goes to it, and comes back to the control that opened it.
  useEffect(() => {
    if (confirming) {
      before.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      confirmRef.current?.focus();
      return;
    }
    if (before.current && document.contains(before.current)) before.current.focus();
    before.current = null;
  }, [confirming]);

  const listed: { row: ShareRow; household: boolean }[] = [
    ...(household ? [{ row: { ...household, id: household.id ?? "household", name: household.name ?? copy.household, description: household.description ?? copy.householdDescription }, household: true }] : []),
    ...members.map((row) => ({ row, household: false })),
  ];
  const twoRoles = roles.length === 2;
  // Lines about a row sit under its name, past the face (40 px and a 12 px gap).
  const indent = showAvatars ? "pl-[3.25rem]" : undefined;

  function change(row: ShareRow, role: string) {
    quiet(() => (row.onChange ? row.onChange(role) : onRoleChange?.(row.id, role)));
  }

  function control(row: ShareRow, locked: boolean, describedBy: string | undefined) {
    if (twoRoles) {
      const on = roles[1]!;
      return (
        <span className="flex shrink-0 items-center gap-3">
          <span className="text-muted-foreground text-base">{roles.find((role) => role.id === row.role)?.label ?? ""}</span>
          <Switch
            aria-label={row.name}
            aria-describedby={describedBy}
            checked={row.role === on.id}
            disabled={locked}
            onCheckedChange={(checked) => change(row, checked ? on.id : roles[0]!.id)}
          />
        </span>
      );
    }
    return (
      <Select
        aria-label={row.name}
        value={row.role}
        disabled={locked}
        options={roles.map((role) => role.id)}
        getLabel={(role) => roles.find((candidate) => candidate.id === role)?.label ?? role}
        onValueChange={(role) => change(row, role)}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-slot={dataSlot}
        className={className ?? "sm:max-w-md"}
        onOpenAutoFocus={(event) => {
          // Opened straight onto the warning: read it first.
          if (!confirm) return;
          event.preventDefault();
          confirmRef.current?.focus();
        }}
        onEscapeKeyDown={(event) => {
          if (!confirm) return;
          event.preventDefault();
          confirm.onCancel();
        }}
      >
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        {confirm ? (
          <div ref={confirmRef} tabIndex={-1} role="group" aria-labelledby={`${ids}-confirm`} data-slot="share-dialog-confirm" className="grid gap-3 outline-none">
            <Alert variant="warning">
              <AlertDescription>
                <p id={`${ids}-confirm`} className="text-foreground text-base font-medium">
                  {confirm.title}
                </p>
                <div className="text-base">{confirm.body}</div>
              </AlertDescription>
            </Alert>
            {confirm.error ? (
              <p role="alert" data-slot="share-dialog-confirm-error" className="text-destructive text-base">
                {confirm.error}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={confirm.onCancel}>
                {confirm.cancelLabel ?? copy.goBack}
              </Button>
              <Button type="button" disabled={confirm.busy} onClick={() => quiet(confirm.onConfirm)}>
                {confirm.busy ? copy.saving : (confirm.confirmLabel ?? copy.confirm)}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            {restrictions ? (
              <div data-slot="share-dialog-restrictions" className="text-base">
                {restrictions}
              </div>
            ) : null}
            {error ? (
              <Alert variant="destructive" data-slot="share-dialog-error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {listed.length === 0 ? (
              <p className="text-muted-foreground text-sm">{copy.empty}</p>
            ) : (
              <ul aria-label={copy.people} className="grid gap-3">
                {listed.map(({ row, household: isHousehold }) => {
                  const locked = Boolean(disabled || busy || row.busy || row.disabledReason);
                  const reasonId = `${ids}-${row.id}-reason`;
                  const errorId = `${ids}-${row.id}-error`;
                  const describedBy = [row.disabledReason ? reasonId : null, row.error ? errorId : null].filter(Boolean).join(" ") || undefined;
                  return (
                    <li key={row.id} data-slot="share-dialog-row" data-household={isHousehold ? "true" : undefined} className="grid gap-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          {showAvatars ? <Face row={row} household={isHousehold} /> : null}
                          <div className="min-w-0">
                            <p className="truncate">{row.name}</p>
                            {row.description ? <p className="text-muted-foreground text-base">{row.description}</p> : null}
                          </div>
                        </div>
                        {control(row, locked, describedBy)}
                      </div>
                      {row.busy ? (
                        <p role="status" className={cn("text-muted-foreground text-base", indent)}>
                          {copy.saving}
                        </p>
                      ) : null}
                      {row.disabledReason ? (
                        <p id={reasonId} data-slot="share-dialog-reason" className={cn("text-foreground text-base", indent)}>
                          {row.disabledReason}
                        </p>
                      ) : null}
                      {row.error ? (
                        <p id={errorId} role="alert" data-slot="share-dialog-row-error" className={cn("text-destructive text-base", indent)}>
                          {row.error}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
            {showDone ? (
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    {copy.done}
                  </Button>
                </DialogClose>
              </DialogFooter>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
