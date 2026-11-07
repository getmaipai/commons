"use client";

// VIDEO-SETTINGS-07 (kit gap G1): a list of short free-text phrases. `PhraseListField` is the chips
// form (trigger words, "also add" phrases); `PhrasePairsField` is the paired form ("avoid" with
// "say instead"). Both share one set of limits and one set of plain error lines. The chips are the
// vendored `ComboboxChips` with no option list; the pairs form is two kit `Input`s and a row list.
// Controlled: the host owns `value`, this part owns only the text being typed. No colour of its own.
import { useId, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from "react";
import { icons } from "../icons";
import { Button } from "../dashboard/components/ui/button";
import { Input } from "../dashboard/components/ui/input";
import { Combobox, ComboboxChip, ComboboxChips, ComboboxChipsInput } from "../dashboard/components/ui/combobox";
import { Field, FieldDescription, FieldError, FieldLabel } from "../dashboard/components/ui/field";
import { i18n } from "@/kit/i18n";

export interface PhraseLimits {
  /** Most items the list holds. Absent: no cap on the count. */
  maxItems?: number;
  /** Most characters one phrase may have (after trimming). */
  maxItemChars: number;
  /** Most characters across the whole list. Absent: no total cap. */
  maxTotalChars?: number;
}

/** Trim and collapse inner whitespace so "a  b " and "a b" are one phrase. */
export function normalizePhrase(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

const same = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase();

/** Split pasted text on newlines and commas; empty pieces are dropped. */
export function splitPhrases(text: string): string[] {
  return text.split(/[\n\r,]+/).map(normalizePhrase).filter(Boolean);
}

/** The plain reason `phrase` cannot join `existing`, or null. `used` is the characters already in
 * the list (the caller's own count, so the pairs form can count both sides). `cost` is what the
 * phrase adds to that count. */
function refusal(phrase: string, existing: readonly string[], limits: PhraseLimits, used: number, cost: number): string | null {
  if (existing.some((e) => same(e, phrase))) return i18n._({ id: "ui.\"{phrase}\" is already in the list. Type a different one.", message: "\"{phrase}\" is already in the list. Type a different one.", values: { phrase } });
  if (phrase.length > limits.maxItemChars) return i18n._({ id: "ui.That is {length} characters and each phrase can have {max}. Shorten it.", message: "That is {length} characters and each phrase can have {max}. Shorten it.", values: { length: phrase.length, max: limits.maxItemChars } });
  if (limits.maxItems !== undefined && existing.length >= limits.maxItems) return i18n._({ id: "ui.The list holds {max} at most. Remove one to add another.", message: "The list holds {max} at most. Remove one to add another.", values: { max: limits.maxItems } });
  if (limits.maxTotalChars !== undefined && used + cost > limits.maxTotalChars) return i18n._({ id: "ui.The list can hold {max} characters in all and this would make {total}. Remove a phrase or shorten this one.", message: "The list can hold {max} characters in all and this would make {total}. Remove a phrase or shorten this one.", values: { max: limits.maxTotalChars, total: used + cost } });
  return null;
}

function countLine(limits: PhraseLimits, used: number): string {
  return limits.maxTotalChars === undefined
    ? i18n._({ id: "ui.{max} characters each", message: "{max} characters each", values: { max: limits.maxItemChars } })
    : i18n._({ id: "ui.{max} characters each, {total} in all ({used} used)", message: "{max} characters each, {total} in all ({used} used)", values: { max: limits.maxItemChars, total: limits.maxTotalChars, used } });
}

interface FrameProps {
  label: string;
  help?: string;
  limits: PhraseLimits;
  used: number;
  error: string | null;
  announcement: string;
  invalid?: boolean;
  disabled?: boolean;
  ids: { label: string; help: string; error: string };
  children: ReactNode;
}

function Frame({ label, help, limits, used, error, announcement, invalid, disabled, ids, children }: FrameProps) {
  const shown = error ?? null;
  return (
    <Field role="group" aria-labelledby={ids.label} data-disabled={disabled ? "true" : undefined} data-slot="phrase-list-field" className="gap-1.5">
      <FieldLabel id={ids.label}>{label}</FieldLabel>
      {help ? <FieldDescription id={ids.help}>{help}</FieldDescription> : null}
      {children}
      <p className="text-xs text-muted-foreground" data-slot="phrase-list-count">{countLine(limits, used)}</p>
      <FieldError id={ids.error} data-invalid={invalid || shown ? "true" : undefined}>{shown}</FieldError>
      <span role="status" aria-live="polite" className="sr-only" data-slot="phrase-list-announce">{announcement}</span>
    </Field>
  );
}

export interface PhraseListFieldProps extends PhraseLimits {
  label: string;
  help?: string;
  value: string[];
  onChange: (value: string[]) => void;
  /** The input's name and placeholder, such as "Add a word". */
  addLabel: string;
  disabled?: boolean;
  /** The host marks the list wrong for its own reason (such as a failed save). */
  invalid?: boolean;
}

/** Free-text chips. Enter or a comma adds; a paste splits on newlines and commas; Backspace on an
 * empty input removes the last chip; every chip has its own "Remove <phrase>" button. A duplicate
 * (any letter case) or a phrase over a limit is refused with one plain line; the text stays in the
 * input so the person can fix it. */
export function PhraseListField({ label, help, value, onChange, addLabel, disabled, invalid, maxItems, maxItemChars, maxTotalChars }: PhraseListFieldProps) {
  const limits: PhraseLimits = { maxItems, maxItemChars, maxTotalChars };
  const uid = useId();
  const ids = { label: `${uid}-label`, help: `${uid}-help`, error: `${uid}-error` };
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const used = value.reduce((n, p) => n + p.length, 0);

  /** Add each phrase in order; stop reporting after the first refusal but keep adding the rest. */
  function add(phrases: string[]): string[] {
    let next = [...value];
    let nextUsed = used;
    const skipped: string[] = [];
    let firstError: string | null = null;
    let added = 0;
    for (const phrase of phrases) {
      const why = refusal(phrase, next, limits, nextUsed, phrase.length);
      if (why) {
        skipped.push(phrase);
        firstError ??= why;
        continue;
      }
      next = [...next, phrase];
      nextUsed += phrase.length;
      added += 1;
    }
    if (added) onChange(next);
    setError(skipped.length > 1 ? i18n._({ id: "ui.{error} {count} more were skipped.", message: "{error} {count} more were skipped.", values: { error: firstError, count: skipped.length - 1 } }) : firstError);
    if (added) setAnnouncement(added === 1 ? i18n._({ id: "ui.Added \"{phrase}\". {count} in the list.", message: "Added \"{phrase}\". {count} in the list.", values: { phrase: phrases.find((p) => !skipped.includes(p)), count: next.length } }) : i18n._({ id: "ui.Added {added} phrases. {count} in the list.", message: "Added {added} phrases. {count} in the list.", values: { added, count: next.length } }));
    return skipped;
  }

  function commit(text: string) {
    const phrases = splitPhrases(text);
    if (!phrases.length) { setDraft(""); return; }
    const skipped = add(phrases);
    setDraft(skipped.join(", "));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      event.stopPropagation();
      commit(event.currentTarget.value);
    } else if (event.key === "Backspace" && draft === "" && value.length) {
      // The chips root removes the last chip itself; only the announcement is ours.
      setError(null);
      setAnnouncement(i18n._({ id: "ui.Removed \"{phrase}\". {count} in the list.", message: "Removed \"{phrase}\". {count} in the list.", values: { phrase: value[value.length - 1], count: value.length - 1 } }));
    } else if (error) {
      setError(null);
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (!/[\n\r,]/.test(text)) return;
    event.preventDefault();
    commit(`${draft},${text}`);
  }

  function remove(index: number) {
    const gone = value[index];
    onChange(value.filter((_, i) => i !== index));
    setError(null);
    setAnnouncement(i18n._({ id: "ui.Removed \"{phrase}\". {count} in the list.", message: "Removed \"{phrase}\". {count} in the list.", values: { phrase: gone, count: value.length - 1 } }));
    inputRef.current?.focus();
  }

  return (
    <Frame label={label} help={help} limits={limits} used={used} error={error} announcement={announcement} invalid={invalid} disabled={disabled} ids={ids}>
      <Combobox
        items={[]}
        multiple
        open={false}
        value={value}
        onValueChange={(next) => { if (next.length < value.length) { onChange(next as string[]); } }}
        inputValue={draft}
        onInputValueChange={(text) => setDraft(text)}
        disabled={disabled}
      >
        <ComboboxChips aria-label={label} aria-invalid={invalid || error ? true : undefined} onClick={() => inputRef.current?.focus()}>
          {value.map((phrase, index) => (
            <ComboboxChip key={phrase.toLocaleLowerCase()} showRemove={false} className="h-6 pr-0">
              <span>{phrase}</span>
              <Button type="button" variant="ghost" size="icon-xs" disabled={disabled} aria-label={i18n._({ id: "ui.Remove {phrase}", message: "Remove {phrase}", values: { phrase } })} className="-ml-0.5 opacity-60 hover:opacity-100 focus-visible:opacity-100" onClick={(e) => { e.stopPropagation(); remove(index); }}>
                <icons.x aria-hidden="true" className="pointer-events-none" />
              </Button>
            </ComboboxChip>
          ))}
          <ComboboxChipsInput
            ref={inputRef}
            aria-label={addLabel}
            aria-invalid={invalid || error ? true : undefined}
            aria-describedby={[help ? ids.help : null, error ? ids.error : null].filter(Boolean).join(" ") || undefined}
            placeholder={value.length ? "" : addLabel}
            disabled={disabled}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onBlur={() => { if (draft.trim()) commit(draft); }}
          />
        </ComboboxChips>
      </Combobox>
    </Frame>
  );
}

export interface PhrasePair {
  avoid: string;
  say: string;
}

export interface PhrasePairsFieldProps extends PhraseLimits {
  label: string;
  help?: string;
  value: PhrasePair[];
  onChange: (value: PhrasePair[]) => void;
  /** Heading and input name of the first column, such as "Avoid". */
  firstLabel: string;
  /** Heading and input name of the second column, such as "Say instead". */
  secondLabel: string;
  addLabel: string;
  disabled?: boolean;
  invalid?: boolean;
}

/** The paired form: two inputs and an Add button, then one row per pair with its own Remove button.
 * A pair is refused when its first side repeats one already listed (any letter case), when either
 * side is empty or over the per-item limit, or when both sides together pass the total. Enter in
 * either input adds. Characters count on both sides. */
export function PhrasePairsField({ label, help, value, onChange, firstLabel, secondLabel, addLabel, disabled, invalid, maxItems, maxItemChars, maxTotalChars }: PhrasePairsFieldProps) {
  const limits: PhraseLimits = { maxItems, maxItemChars, maxTotalChars };
  const uid = useId();
  const ids = { label: `${uid}-label`, help: `${uid}-help`, error: `${uid}-error` };
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const firstRef = useRef<HTMLInputElement>(null);
  const used = value.reduce((n, p) => n + p.avoid.length + p.say.length, 0);

  function submit() {
    const a = normalizePhrase(first);
    const b = normalizePhrase(second);
    if (!a && !b) return;
    if (!a || !b) {
      setError(i18n._({ id: "ui.Fill in both \"{first}\" and \"{second}\", then add the pair.", message: "Fill in both \"{first}\" and \"{second}\", then add the pair.", values: { first: firstLabel, second: secondLabel } }));
      return;
    }
    const secondTooLong = b.length > maxItemChars;
    const why = secondTooLong
      ? i18n._({ id: "ui.That is {length} characters and each phrase can have {max}. Shorten it.", message: "That is {length} characters and each phrase can have {max}. Shorten it.", values: { length: b.length, max: maxItemChars } })
      : refusal(a, value.map((p) => p.avoid), limits, used, a.length + b.length);
    if (why) { setError(why); return; }
    onChange([...value, { avoid: a, say: b }]);
    setFirst("");
    setSecond("");
    setError(null);
    setAnnouncement(i18n._({ id: "ui.Added \"{a}\" with \"{b}\". {count} in the list.", message: "Added \"{a}\" with \"{b}\". {count} in the list.", values: { a, b, count: value.length + 1 } }));
    firstRef.current?.focus();
  }

  function remove(index: number) {
    const gone = value[index];
    if (!gone) return;
    onChange(value.filter((_, i) => i !== index));
    setError(null);
    setAnnouncement(i18n._({ id: "ui.Removed \"{phrase}\". {count} in the list.", message: "Removed \"{phrase}\". {count} in the list.", values: { phrase: gone.avoid, count: value.length - 1 } }));
    firstRef.current?.focus();
  }

  const onKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") { event.preventDefault(); submit(); } else if (error) setError(null);
  };
  const describedBy = [help ? ids.help : null, error ? ids.error : null].filter(Boolean).join(" ") || undefined;

  return (
    <Frame label={label} help={help} limits={limits} used={used} error={error} announcement={announcement} invalid={invalid} disabled={disabled} ids={ids}>
      {value.length ? (
        <ul aria-label={i18n._({ id: "ui.{label}, {count} added", message: "{label}, {count} added", values: { label, count: value.length } })} className="flex flex-col gap-1" data-slot="phrase-pairs-list">
          {value.map((pair, index) => (
            <li key={pair.avoid.toLocaleLowerCase()} className="flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1 text-sm">
              <span className="min-w-0 flex-1 break-words"><span className="sr-only">{firstLabel}: </span>{pair.avoid}</span>
              <span aria-hidden="true" className="text-muted-foreground">{i18n._({ id: "ui.to", message: "to" })}</span>
              <span className="min-w-0 flex-1 break-words"><span className="sr-only">{secondLabel}: </span>{pair.say}</span>
              <Button type="button" variant="ghost" size="icon-xs" disabled={disabled} aria-label={i18n._({ id: "ui.Remove {phrase}", message: "Remove {phrase}", values: { phrase: pair.avoid } })} onClick={() => remove(index)}>
                <icons.x aria-hidden="true" className="pointer-events-none" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input ref={firstRef} aria-label={firstLabel} placeholder={firstLabel} value={first} disabled={disabled} aria-invalid={invalid || error ? true : undefined} aria-describedby={describedBy} onChange={(e) => setFirst(e.target.value)} onKeyDown={onKey} />
        <Input aria-label={secondLabel} placeholder={secondLabel} value={second} disabled={disabled} aria-invalid={invalid || error ? true : undefined} aria-describedby={describedBy} onChange={(e) => setSecond(e.target.value)} onKeyDown={onKey} />
        <Button type="button" variant="secondary" disabled={disabled} onClick={submit}>{addLabel}</Button>
      </div>
    </Frame>
  );
}
