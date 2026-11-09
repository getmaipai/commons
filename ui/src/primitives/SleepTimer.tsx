import { useEffect, useRef, useState } from "react";
import { getIcon } from "@/kit/icons";
import { i18n } from "@/kit/i18n";
import { Button } from "@/kit/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/kit/ui/dropdown-menu";
import { formatCountdown, sleepFromValue, sleepRemainingMs, sleepValue, SLEEP_MINUTES, type SleepState } from "@/kit/primitives/sleepLogic";

const FADE_MS = 3000;

function reducedMotion(): boolean {
  try { return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

/** Stops playback: a short fade, or at once under reduced motion. The volume is put back afterwards. */
export function stopWithFade(el: HTMLMediaElement | null | undefined, done?: () => void): void {
  if (!el) { done?.(); return; }
  if (reducedMotion() || el.paused) { el.pause(); done?.(); return; }
  const volume = el.volume;
  const startedAt = Date.now();
  const id = setInterval(() => {
    const p = Math.min(1, (Date.now() - startedAt) / FADE_MS);
    el.volume = volume * (1 - p);
    if (p >= 1) {
      clearInterval(id);
      el.pause();
      el.volume = volume;
      done?.();
    }
  }, 50);
}

/** PARITY-01: the sleep timer menu (Off, End of episode, 5 to 60 minutes) with a live countdown in the button.
 * Controlled: the Player holds `value`; "End of episode" is acted on by the Player when the item ends. */
export function SleepTimer({ value, onChange, getMedia, container, onFire, label }: {
  value: SleepState;
  onChange: (next: SleepState) => void;
  getMedia: () => HTMLMediaElement | null | undefined;
  container?: HTMLElement | null;
  /** Called after the countdown stops playback. */
  onFire?: () => void;
  /** The control's own name. */
  label?: string;
}) {
  const Glyph = getIcon("timer");
  const name = label ?? i18n._({ id: "ui.Sleep timer", message: "Sleep timer" });
  const [now, setNow] = useState(() => Date.now());
  const fired = useRef(false);
  const timed = value?.kind === "at";
  useEffect(() => {
    if (!timed) return;
    fired.current = false;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timed, value]);
  const left = sleepRemainingMs(value, now);
  useEffect(() => {
    if (!timed || left > 0 || fired.current) return;
    fired.current = true;
    onChange(null);
    stopWithFade(getMedia(), onFire);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timed, left]);
  const status = value === null ? null : value.kind === "end" ? i18n._({ id: "ui.End of episode", message: "End of episode" }) : formatCountdown(left);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={value ? "secondary" : "ghost"} size="icon" aria-label={status ? `${name}: ${status}` : name} data-slot="player-sleep" className={status && value?.kind === "at" ? "w-auto gap-1.5 px-3" : undefined}>
          <Glyph aria-hidden />
          {value?.kind === "at" ? <span className="text-sm font-semibold tabular-nums" data-slot="player-sleep-left">{status}</span> : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent container={container} align="end">
        <DropdownMenuLabel>{name}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={sleepValue(value)} onValueChange={(v) => onChange(v === "off" ? null : sleepFromValue(v, Date.now()))}>
          <DropdownMenuRadioItem value="off">{i18n._({ id: "ui.Off", message: "Off" })}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="end">{i18n._({ id: "ui.End of episode", message: "End of episode" })}</DropdownMenuRadioItem>
          {SLEEP_MINUTES.map((m) => (
            <DropdownMenuRadioItem key={m} value={String(m)}>{i18n._({ id: "ui.{minutes} minutes", message: "{minutes} minutes", values: { minutes: m } })}</DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
