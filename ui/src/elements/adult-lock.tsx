"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LoaderCircleIcon, LockIcon } from "lucide-react";
import { cn, FOCUS_RING } from "@/kit/utils";
import { Button } from "@/kit/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/kit/ui/dialog";
import { PasscodeInput } from "@/kit/ui/passcode-input";

/*
 * ADULT-LOCK-01: the Adult lock kit pattern (home docs/design/video-loras-2026-11-02.md section 3.8).
 *
 * A locked thing is ONE identical tile per list: a lock icon and the words "Locked items". The redacted view carries no title,
 * description, thumbnail, tags, trigger words, count, id or any other metadata, and the kit never reads any: a locked row is
 * `{ locked: true, making?: boolean }` and every list part collapses all such rows into the one tile before it reads anything
 * else. The tile's accessible name is the same fixed sentence for every instance and nothing the kit announces holds a number or
 * a name. The check of the passcode is the host's (`unlock(passcode)`); the proof lives only in this page's memory (React
 * state in `AdultLockProvider`), never in localStorage, sessionStorage, a cookie or a URL. Relocking on page leave is the
 * host's: it calls `relock()` (or unmounts the provider) when the route changes, the tab hides or the session locks.
 */

/** The one accessible name of every lock tile. Fixed text: no item, count or name is ever part of it. */
export const LOCK_TILE_NAME = "Locked items. Press to enter your passcode.";
/** What the tile shows. */
export const LOCK_TILE_TEXT = "Locked items";
/** Polite announcement after a successful unlock. */
export const UNLOCKED_ANNOUNCEMENT = "Unlocked";
/** Polite announcement after a relock. */
export const RELOCKED_ANNOUNCEMENT = "Locked items hidden";

/** The redacted view of a locked thing: no field but these two. */
export interface LockedRow {
  locked: true;
  /** A job that makes a locked item is running: the tile adds one small spinner and nothing else. */
  making?: boolean;
}

/** True for a value whose `locked` flag is exactly `true`. */
export function isLockedRow(value: unknown, field = "locked"): boolean {
  return typeof value === "object" && value !== null && (value as Record<string, unknown>)[field] === true;
}

/** Splits a list into what may be drawn and whether one lock tile is needed, and whether it carries the spinner. The locked rows
 * are dropped without being read further (no count is returned: one tile stands for any number of locked items). */
export function collapseLocked<T>(items: readonly T[], isLocked: (item: T) => boolean, isMaking?: (item: T) => boolean): { open: T[]; hasLocked: boolean; making: boolean } {
  const open: T[] = [];
  let hasLocked = false;
  let making = false;
  for (const item of items) {
    if (isLocked(item)) {
      hasLocked = true;
      if (isMaking?.(item)) making = true;
    } else open.push(item);
  }
  return { open, hasLocked, making };
}

export type UnlockResult =
  | { status: "ok"; proof?: string }
  | { status: "failed"; attemptsLeft?: number }
  | { status: "locked_out"; retryAfterSeconds: number };

export interface AdultLockProviderProps {
  /** The host's check of the person's own passcode. Resolves ok, failed or locked_out; a rejection is shown as "could not check". */
  unlock: (passcode: string) => Promise<UnlockResult>;
  /** Number of digits of the passcode. Default 6. */
  digits?: number;
  /** The person's word for their credential ("passcode" by default; "PIN" for a PIN). */
  credentialWord?: string;
  /** False when the person has no passcode or passkey set: the dialog says where to set one and shows no field. Default true. */
  hasCredential?: boolean;
  /** Called after the page's proof is dropped (Lock now, or the provider unmounting while unlocked): the host revokes its side. */
  onRelock?: () => void;
  /** Called after a successful unlock, with the proof the host returned (if any). */
  onUnlocked?: (proof: string | null) => void;
  children: ReactNode;
}

export interface LockProof {
  /** True while this page holds a valid unlock. */
  unlocked: boolean;
  /** The opaque proof the host's `unlock` returned, held in memory only; null while locked or when the host returned none. */
  proof: string | null;
  /** Opens the passcode dialog. `origin` is the element that asked (focus returns to it when the dialog is cancelled). */
  requestUnlock: (origin?: HTMLElement | null) => void;
  /** Drops the proof, announces "Locked items hidden" and calls the host's `onRelock`. A no-op while locked. */
  relock: () => void;
}

const LockContext = createContext<LockProof | null>(null);

const LOCKED_DEFAULT: LockProof = { unlocked: false, proof: null, requestUnlock: () => {}, relock: () => {} };

/** The page-scoped lock proof. Outside an `AdultLockProvider` it reports locked and cannot unlock. */
export function useLockProof(): LockProof {
  return useContext(LockContext) ?? LOCKED_DEFAULT;
}

/** The nearest container to put focus on when the tile that opened the dialog is gone after an unlock. */
function fallbackFor(origin: HTMLElement | null): HTMLElement | null {
  return origin?.closest<HTMLElement>("[data-slot=media-shelf-groups],[data-slot=media-shelf],[data-slot=result-feed],[data-slot=option-cards],[data-slot=item-group],section,ul,main") ?? null;
}

/**
 * Holds the page's unlock in memory, draws the one passcode dialog and the polite live region. Mount one per page (the host's
 * route decides what a page is). Every `LockTile` below it opens this dialog.
 */
export function AdultLockProvider({ unlock, digits = 6, credentialWord = "passcode", hasCredential = true, onRelock, onUnlocked, children }: AdultLockProviderProps) {
  const [proof, setProof] = useState<{ value: string | null } | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const origin = useRef<HTMLElement | null>(null);
  const succeeded = useRef(false);
  const unlockedRef = useRef(false);
  const onRelockRef = useRef(onRelock);
  onRelockRef.current = onRelock;
  const onUnlockedRef = useRef(onUnlocked);
  onUnlockedRef.current = onUnlocked;
  unlockedRef.current = proof !== null;

  const requestUnlock = useCallback((from?: HTMLElement | null) => {
    origin.current = from ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    succeeded.current = false;
    setOpen(true);
  }, []);

  const relock = useCallback(() => {
    if (!unlockedRef.current) return;
    unlockedRef.current = false;
    setProof(null);
    setMessage(RELOCKED_ANNOUNCEMENT);
    onRelockRef.current?.();
  }, []);

  // The page ends: the proof dies with this component's state; the host is told so it revokes its side too.
  useEffect(() => () => { if (unlockedRef.current) onRelockRef.current?.(); }, []);

  const onSuccess = useCallback((value: string | undefined) => {
    succeeded.current = true;
    setProof({ value: value ?? null });
    setMessage(UNLOCKED_ANNOUNCEMENT);
    onUnlockedRef.current?.(value ?? null);
    setOpen(false);
  }, []);

  const value = useMemo<LockProof>(() => ({ unlocked: proof !== null, proof: proof?.value ?? null, requestUnlock, relock }), [proof, requestUnlock, relock]);

  return (
    <LockContext.Provider value={value}>
      {children}
      <div role="status" aria-live="polite" aria-atomic="true" data-slot="adult-lock-status" className="sr-only">{message}</div>
      <AdultLockDialog
        open={open}
        onOpenChange={setOpen}
        unlock={unlock}
        onUnlocked={onSuccess}
        digits={digits}
        credentialWord={credentialWord}
        hasCredential={hasCredential}
        onCloseAutoFocus={(event) => {
          // After an unlock the tile that asked is about to leave the page: put focus on its list, not on a vanishing button.
          const from = origin.current;
          const target = succeeded.current || !from?.isConnected ? fallbackFor(from) : from;
          if (!target) return;
          event.preventDefault();
          if (target !== from && target.tabIndex < 0 && !target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
        }}
      />
    </LockContext.Provider>
  );
}

export interface AdultLockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The host's check. Resolves ok, failed or locked_out. */
  unlock: (passcode: string) => Promise<UnlockResult>;
  /** Called with the proof (if any) after an ok result; the host closes the dialog (`AdultLockProvider` does). */
  onUnlocked: (proof: string | undefined) => void;
  digits?: number;
  credentialWord?: string;
  hasCredential?: boolean;
  /** Passed to the dialog content: where focus goes when it closes. */
  onCloseAutoFocus?: (event: Event) => void;
  /** ADULT-LOCK-06: the same dialog asks for a fresh passcode to confirm one action (the creator removing the lock). `title` replaces "Enter your passcode",
   * `description` replaces the line under it, `actionLabel` replaces "Unlock" on the button. Each default is unchanged. */
  title?: string;
  description?: ReactNode;
  actionLabel?: string;
}

function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds} ${seconds === 1 ? "second" : "seconds"}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

/**
 * The click-to-unlock dialog: asks for the person's own passcode (the kit `PasscodeInput`), hands it to the host's `unlock`,
 * and explains a failure in plain words. Modal with a focus trap (the kit `Dialog`), focus on the first box, Escape and Cancel
 * close it. The title, text and messages never name an item.
 */
export function AdultLockDialog({ open, onOpenChange, unlock, onUnlocked, digits = 6, credentialWord = "passcode", hasCredential = true, onCloseAutoFocus, title, description, actionLabel }: AdultLockDialogProps) {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitUntil, setWaitUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const field = useRef<HTMLDivElement | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  // A new opening starts clean: no code left from before, no old message.
  useEffect(() => {
    if (open) return;
    setCode("");
    setError(null);
    setChecking(false);
  }, [open]);

  const remaining = waitUntil === null ? 0 : Math.max(0, Math.ceil((waitUntil - now) / 1000));
  useEffect(() => {
    if (waitUntil === null) return;
    setNow(Date.now());
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= waitUntil) {
        window.clearInterval(id);
        setWaitUntil(null);
        setError(null);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [waitUntil]);

  const lockedOut = remaining > 0;
  const focusField = () => window.setTimeout(() => field.current?.querySelector("input")?.focus(), 0);

  async function submit(value: string) {
    if (checking || lockedOut || value.length !== digits) return;
    setChecking(true);
    setError(null);
    let result: UnlockResult | null = null;
    try {
      result = await unlock(value);
    } catch {
      result = null;
    }
    if (!alive.current) return;
    setChecking(false);
    setCode("");
    if (result?.status === "ok") {
      onUnlocked(result.proof);
      return;
    }
    if (result?.status === "locked_out") {
      const t = Date.now();
      setNow(t);
      setWaitUntil(t + Math.max(1, Math.ceil(result.retryAfterSeconds)) * 1000);
      setError(`Too many wrong tries. Unlocking is paused: wait for the timer, then try again.`);
      return;
    }
    if (result?.status === "failed") {
      const left = result.attemptsLeft;
      setError(`That ${credentialWord} was not right. Check it and try again.${typeof left === "number" && left > 0 && left <= 3 ? ` ${left} ${left === 1 ? "try" : "tries"} left.` : ""}`);
    } else {
      setError(`We could not check your ${credentialWord}. Check your connection and try again.`);
    }
    focusField();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        data-slot="adult-lock-dialog"
        onCloseAutoFocus={onCloseAutoFocus}
        onOpenAutoFocus={(event) => {
          if (!hasCredential) return;
          event.preventDefault();
          field.current?.querySelector("input")?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{hasCredential ? title ?? `Enter your ${credentialWord}` : "Locked items"}</DialogTitle>
          <DialogDescription>
            {hasCredential
              ? description ?? "These items stay hidden until you do. Only your own code opens them."
              : "These items stay hidden until you set a code. Nothing opens without one."}
          </DialogDescription>
        </DialogHeader>
        {hasCredential ? (
          <form
            className="flex flex-col items-center gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submit(code);
            }}
          >
            <div ref={field}>
              <PasscodeInput
                digits={digits}
                value={code}
                onChange={(next) => { setCode(next); if (error && !lockedOut) setError(null); }}
                onComplete={(value) => void submit(value)}
                invalid={Boolean(error) && !lockedOut}
                disabled={checking || lockedOut}
                label={`Enter your ${digits}-digit ${credentialWord}`}
              />
            </div>
            {error ? <p role="alert" data-slot="adult-lock-error" className="text-destructive text-center text-sm">{error}</p> : null}
            {lockedOut ? <p aria-hidden="true" data-slot="adult-lock-wait" className="text-muted-foreground text-sm tabular-nums">Try again in {formatWait(remaining)}.</p> : null}
            <DialogFooter className="w-full">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={checking || lockedOut || code.length !== digits}>{checking ? "Checking" : actionLabel ?? "Unlock"}</Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <p role="status" data-slot="adult-lock-no-credential" className="text-foreground text-sm">Set a {credentialWord} in Account to open these.</p>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export type LockTileShape = "fill" | "card" | "row";

const SHAPE: Record<LockTileShape, string> = {
  // Fills the media box a shelf already drew at its declared aspect.
  fill: "absolute inset-0 flex-col gap-2 rounded-[inherit]",
  // A feed entry or a player: the clip's own wide box.
  card: "aspect-video w-full flex-col gap-2 rounded-xl",
  // A settings row or a vertical list row.
  row: "min-h-14 w-full flex-row gap-3 rounded-lg px-4 py-3",
};

/**
 * The one lock tile. A button named "Locked items. Press to enter your passcode." with a lock icon and the words "Locked items",
 * and, while a locked item is being made, one small spinner (decorative: nothing says it). It carries no other content. Pressing
 * it calls `onUnlock`, or, without one, opens the page's passcode dialog (`AdultLockProvider`). Every colour is a theme token.
 * `shape` only chooses the box (`fill` a shelf's media box, `card` a feed entry or player, `row` a settings or list row).
 */
export function LockTile({ making = false, onUnlock, shape = "card" }: { making?: boolean; onUnlock?: () => void; shape?: LockTileShape }) {
  const { requestUnlock } = useLockProof();
  return (
    <button
      type="button"
      aria-label={LOCK_TILE_NAME}
      data-slot="lock-tile"
      onClick={(event) => (onUnlock ? onUnlock() : requestUnlock(event.currentTarget))}
      className={cn(
        "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground flex min-w-0 items-center justify-center border border-dashed border-border text-sm font-medium transition-colors",
        "min-h-12 cursor-pointer",
        FOCUS_RING,
        SHAPE[shape],
      )}
    >
      <LockIcon aria-hidden className="size-6 shrink-0" />
      <span aria-hidden="true">{LOCK_TILE_TEXT}</span>
      {making ? <LoaderCircleIcon aria-hidden className="size-4 shrink-0 motion-safe:animate-spin" /> : null}
    </button>
  );
}
