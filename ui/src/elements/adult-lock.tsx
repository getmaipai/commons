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
import { EyeIcon, EyeOffIcon, LoaderCircleIcon, LockIcon } from "lucide-react";
import { cn, FOCUS_RING } from "@/kit/utils";
import { Button } from "@/kit/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/kit/ui/dialog";
import { Input } from "@/kit/ui/input";
import { PasscodeInput } from "@/kit/ui/passcode-input";
import { i18n } from "@/kit/i18n";

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

/** The kind of secret the person signs in with. `passcode` (default) draws the digit boxes; `password` draws a masked text field. */
export type CredentialKind = "passcode" | "password";

export interface AdultLockProviderProps {
  /** The host's check of the person's own passcode. Resolves ok, failed or locked_out; a rejection is shown as "could not check". */
  unlock: (passcode: string) => Promise<UnlockResult>;
  onPasskey?: () => Promise<UnlockResult>;
  /** Number of digits of the passcode. Default 6. */
  digits?: number;
  /** The person's word for their credential ("passcode" by default, "password" for a password; "PIN" for a PIN). */
  credentialWord?: string;
  /** ADULT-LOCK-07: the kind of secret the person has, from the host. `password` draws a masked field with show/hide instead of the digit boxes. Default `passcode`. */
  credentialKind?: CredentialKind;
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
export function AdultLockProvider({ unlock, onPasskey, digits = 6, credentialWord, credentialKind = "passcode", hasCredential = true, onRelock, onUnlocked, children }: AdultLockProviderProps) {
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
    setMessage(i18n._({ id: "ui.Locked items hidden", message: "Locked items hidden" }));
    onRelockRef.current?.();
  }, []);

  // The page ends: the proof dies with this component's state; the host is told so it revokes its side too.
  useEffect(() => () => { if (unlockedRef.current) onRelockRef.current?.(); }, []);

  const onSuccess = useCallback((value: string | undefined) => {
    succeeded.current = true;
    setProof({ value: value ?? null });
    setMessage(i18n._({ id: "ui.Unlocked", message: "Unlocked" }));
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
        onPasskey={onPasskey}
        onUnlocked={onSuccess}
        digits={digits}
        credentialWord={credentialWord}
        credentialKind={credentialKind}
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
  onPasskey?: () => Promise<UnlockResult>;
  /** Called with the proof (if any) after an ok result; the host closes the dialog (`AdultLockProvider` does). */
  onUnlocked: (proof: string | undefined) => void;
  digits?: number;
  credentialWord?: string;
  /** ADULT-LOCK-07: `password` asks for a password in a masked field; `passcode` (default) asks for digits in boxes. */
  credentialKind?: CredentialKind;
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
  if (seconds < 60) return i18n._({ id: "ui.{count, plural, one {# second} other {# seconds}}", message: "{count, plural, one {# second} other {# seconds}}", values: { count: seconds } });
  const minutes = Math.ceil(seconds / 60);
  return i18n._({ id: "ui.{count, plural, one {# minute} other {# minutes}}", message: "{count, plural, one {# minute} other {# minutes}}", values: { count: minutes } });
}

/**
 * The click-to-unlock dialog: asks for the person's own passcode (the kit `PasscodeInput`), hands it to the host's `unlock`,
 * and explains a failure in plain words. Modal with a focus trap (the kit `Dialog`), focus on the first box, Escape and Cancel
 * close it. The title, text and messages never name an item.
 */
export function AdultLockDialog({ open, onOpenChange, unlock, onPasskey, onUnlocked, digits = 6, credentialWord: word, credentialKind = "passcode", hasCredential = true, onCloseAutoFocus, title, description, actionLabel }: AdultLockDialogProps) {
  const isPassword = credentialKind === "password";
  const credentialWord = word ?? (isPassword ? i18n._({ id: "ui.password", message: "password" }) : i18n._({ id: "ui.passcode", message: "passcode" }));
  const [code, setCode] = useState("");
  const [shown, setShown] = useState(false);
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
    setShown(false);
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

  async function submit(value: string, usePasskey = false) {
    if (checking || lockedOut || (!usePasskey && (isPassword ? value.length === 0 : value.length !== digits))) return;
    setChecking(true);
    setError(null);
    let result: UnlockResult | null = null;
    try {
      result = usePasskey ? await onPasskey?.() ?? null : await unlock(value);
    } catch {
      result = null;
    }
    if (!alive.current) return;
    setChecking(false);
    setCode("");
    // The field is cleared, so it goes back to masked: the next try is never typed in plain sight.
    setShown(false);
    if (result?.status === "ok") {
      onUnlocked(result.proof);
      return;
    }
    if (result?.status === "locked_out") {
      const t = Date.now();
      setNow(t);
      setWaitUntil(t + Math.max(1, Math.ceil(result.retryAfterSeconds)) * 1000);
      setError(i18n._({ id: "ui.Too many wrong tries. Unlocking is paused: wait for the timer, then try again.", message: "Too many wrong tries. Unlocking is paused: wait for the timer, then try again." }));
      return;
    }
    if (result?.status === "failed") {
      const left = result.attemptsLeft;
      setError(`${i18n._({ id: "ui.That {word} was not right. Check it and try again.", message: "That {word} was not right. Check it and try again.", values: { word: credentialWord } })}${typeof left === "number" && left > 0 && left <= 3 ? ` ${i18n._({ id: "ui.{count, plural, one {# try left.} other {# tries left.}}", message: "{count, plural, one {# try left.} other {# tries left.}}", values: { count: left } })}` : ""}`);
    } else {
      setError(i18n._({ id: "ui.We could not check your {word}. Check your connection and try again.", message: "We could not check your {word}. Check your connection and try again.", values: { word: credentialWord } }));
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
          <DialogTitle>{hasCredential ? title ?? i18n._({ id: "ui.Enter your {word}", message: "Enter your {word}", values: { word: credentialWord } }) : i18n._({ id: "ui.Locked items", message: "Locked items" })}</DialogTitle>
          <DialogDescription>
            {hasCredential
              ? description ?? i18n._({ id: "ui.These items stay hidden until you do. Only your own code opens them.", message: "These items stay hidden until you do. Only your own code opens them." })
              : i18n._({ id: "ui.These items stay hidden until you set a code. Nothing opens without one.", message: "These items stay hidden until you set a code. Nothing opens without one." })}
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
            <div ref={field} className={isPassword ? "w-full" : undefined}>
              {isPassword ? (
                <div className="flex w-full items-center gap-2">
                  <Input
                    type={shown ? "text" : "password"}
                    data-slot="adult-lock-password"
                    value={code}
                    onChange={(event) => { setCode(event.target.value); if (error && !lockedOut) setError(null); }}
                    aria-label={i18n._({ id: "ui.Enter your {word}", message: "Enter your {word}", values: { word: credentialWord } })}
                    aria-invalid={Boolean(error) && !lockedOut ? true : undefined}
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    disabled={checking || lockedOut}
                    className="min-w-0 flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    data-slot="adult-lock-reveal"
                    aria-label={shown ? i18n._({ id: "ui.Hide {word}", message: "Hide {word}", values: { word: credentialWord } }) : i18n._({ id: "ui.Show {word}", message: "Show {word}", values: { word: credentialWord } })}
                    aria-pressed={shown}
                    disabled={checking || lockedOut}
                    onClick={() => { setShown((v) => !v); focusField(); }}
                  >
                    {shown ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
                  </Button>
                </div>
              ) : (
                <PasscodeInput
                  digits={digits}
                  value={code}
                  onChange={(next) => { setCode(next); if (error && !lockedOut) setError(null); }}
                  onComplete={(value) => void submit(value)}
                  invalid={Boolean(error) && !lockedOut}
                  disabled={checking || lockedOut}
                  label={i18n._({ id: "ui.Enter your {digits}-digit {word}", message: "Enter your {digits}-digit {word}", values: { digits, word: credentialWord } })}
                />
              )}
            </div>
            {error ? <p role="alert" data-slot="adult-lock-error" className="text-destructive text-center text-sm">{error}</p> : null}
            {lockedOut ? <p aria-hidden="true" data-slot="adult-lock-wait" className="text-muted-foreground text-sm tabular-nums">{i18n._({ id: "ui.Try again in {wait}.", message: "Try again in {wait}.", values: { wait: formatWait(remaining) } })}</p> : null}
            <DialogFooter className="w-full">
              {onPasskey ? <Button type="button" variant="outline" aria-label={i18n._({ id: "ui.Use a passkey", message: "Use a passkey" })} disabled={checking || lockedOut} onClick={() => void submit(code, true)}>{i18n._({ id: "ui.Use a passkey", message: "Use a passkey" })}</Button> : null}
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{i18n._({ id: "ui.Cancel", message: "Cancel" })}</Button>
              <Button type="submit" disabled={checking || lockedOut || (isPassword ? code.length === 0 : code.length !== digits)}>{checking ? i18n._({ id: "ui.Checking", message: "Checking" }) : actionLabel ?? i18n._({ id: "ui.Unlock", message: "Unlock" })}</Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <p role="status" data-slot="adult-lock-no-credential" className="text-foreground text-sm">{i18n._({ id: "ui.Set a {word} in Account to open these.", message: "Set a {word} in Account to open these.", values: { word: credentialWord } })}</p>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>{i18n._({ id: "ui.Close", message: "Close" })}</Button>
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
      aria-label={i18n._({ id: "ui.Locked items. Press to enter your passcode.", message: "Locked items. Press to enter your passcode." })}
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
      <span aria-hidden="true">{i18n._({ id: "ui.Locked items", message: "Locked items" })}</span>
      {making ? <LoaderCircleIcon aria-hidden className="size-4 shrink-0 motion-safe:animate-spin" /> : null}
    </button>
  );
}
